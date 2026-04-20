/**
 * Professional pricing engine for IGH Tour package calculator.
 * Supports two modes:
 *   - "umroh" : structured hotel/transport/visa/destination/staff tables
 *   - "umum"  : flexible row-based calculator for any trip type
 */

import { type Rates } from "@/lib/exchangeRates";

export type CalcCurrency = "IDR" | "SAR" | "USD";
export type CalcMode = "umroh" | "umum";

// ── Umroh Mode Input Structures ───────────────────────────────────────────────

export interface HotelRow {
  id: string;
  label: string;
  days: number;
  pricePerNight: number; // SAR
  rooms: number;
}

export interface TransportRow {
  id: string;
  label: string;
  fleet: number;
  pricePerFleet: number; // SAR
}

export interface VisaRow {
  id: string;
  label: string;
  pricePerPax: number; // USD
}

export interface DestinationRow {
  id: string;
  label: string;
  pricePerPax: number; // SAR
}

export interface StaffRow {
  id: string;
  label: string;
  totalCost: number; // SAR (shared, divided by pax)
}

// ── Umum Mode Input Structure ─────────────────────────────────────────────────

export type CostUnit = "group" | "pax";

export interface GeneralCostRow {
  id: string;
  label: string;
  amount: number;
  currency: CalcCurrency;
  unit: CostUnit; // "group" = fixed total; "pax" = amount × pax count
}

// ── Shared Output ─────────────────────────────────────────────────────────────

export interface BreakdownRow {
  id: string;
  category: string;
  label: string;
  notesSAR: number;
  notesUSD: number;
  groupIDR: number;
  perPaxIDR: number;
}

export interface ProfessionalQuote {
  breakdown: BreakdownRow[];
  // Category subtotals in IDR (umum mode uses hpp directly)
  hotelIDR: number;
  transportIDR: number;
  visaIDR: number;
  destinationIDR: number;
  staffIDR: number;
  // Core financials
  hpp: number;           // Total Budget (sum of all IDR)
  commissionFee: number;
  marginIDR: number;     // hpp × marginPercent / 100
  sellingPrice: number;  // hpp + commission + margin
  discount: number;
  finalPrice: number;    // sellingPrice − discount
  perPaxFinal: number;
  netProfit: number;     // finalPrice − hpp − commissionFee
  // Foreign currency reference totals
  totalSAR: number;
  totalUSD: number;
}

// ── Shared Financial Rollup ───────────────────────────────────────────────────

function rollup(
  hpp: number,
  commissionFee: number,
  marginPercent: number,
  discount: number,
  safePax: number,
): Pick<ProfessionalQuote, "hpp" | "commissionFee" | "marginIDR" | "sellingPrice" | "discount" | "finalPrice" | "perPaxFinal" | "netProfit"> {
  const marginIDR = hpp * (marginPercent / 100);
  const sellingPrice = hpp + commissionFee + marginIDR;
  const finalPrice = Math.max(0, sellingPrice - discount);
  const perPaxFinal = finalPrice / safePax;
  const netProfit = finalPrice - hpp - commissionFee;
  return { hpp, commissionFee, marginIDR, sellingPrice, discount, finalPrice, perPaxFinal, netProfit };
}

// ── Umroh / Haji Mode ─────────────────────────────────────────────────────────

export interface ProfessionalCalcInput {
  pax: number;
  hotels: HotelRow[];
  transports: TransportRow[];
  visas: VisaRow[];
  destinations: DestinationRow[];
  staffs: StaffRow[];
  commissionFee: number;
  marginPercent: number;
  discount: number;
  rates: Rates;
}

export function computeProfessionalQuote(input: ProfessionalCalcInput): ProfessionalQuote {
  const { pax, hotels, transports, visas, destinations, staffs, commissionFee, marginPercent, discount, rates } = input;
  const safePax = Math.max(1, pax);
  const sarRate = rates.SAR ?? 1;
  const usdRate = rates.USD ?? 1;

  const breakdown: BreakdownRow[] = [];
  let totalSAR = 0;
  let totalUSD = 0;

  let hotelIDR = 0;
  for (const h of hotels) {
    const sarAmount = h.days * h.pricePerNight * h.rooms;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    hotelIDR += idr;
    breakdown.push({ id: h.id, category: "Hotel", label: h.label || "Hotel", notesSAR: sarAmount, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  let transportIDR = 0;
  for (const t of transports) {
    const sarAmount = t.fleet * t.pricePerFleet;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    transportIDR += idr;
    breakdown.push({ id: t.id, category: "Transport", label: t.label || "Transportasi", notesSAR: sarAmount, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  let visaIDR = 0;
  for (const v of visas) {
    const usdAmount = v.pricePerPax * safePax;
    const idr = usdAmount * usdRate;
    totalUSD += usdAmount;
    visaIDR += idr;
    breakdown.push({ id: v.id, category: "Visa", label: v.label || "Visa", notesSAR: 0, notesUSD: usdAmount, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  let destinationIDR = 0;
  for (const d of destinations) {
    const sarAmount = d.pricePerPax * safePax;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    destinationIDR += idr;
    breakdown.push({ id: d.id, category: "Destinasi & F&B", label: d.label || "Destinasi", notesSAR: sarAmount, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  let staffIDR = 0;
  for (const s of staffs) {
    const idr = s.totalCost * sarRate;
    totalSAR += s.totalCost;
    staffIDR += idr;
    breakdown.push({ id: s.id, category: "Staff", label: s.label || "Guide", notesSAR: s.totalCost, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  const hpp = hotelIDR + transportIDR + visaIDR + destinationIDR + staffIDR;

  return {
    breakdown,
    hotelIDR, transportIDR, visaIDR, destinationIDR, staffIDR,
    totalSAR, totalUSD,
    ...rollup(hpp, commissionFee, marginPercent, discount, safePax),
  };
}

// ── Umum (General) Mode ───────────────────────────────────────────────────────

export interface GeneralCalcInput {
  pax: number;
  costs: GeneralCostRow[];
  commissionFee: number;
  marginPercent: number;
  discount: number;
  rates: Rates;
}

export function computeGeneralQuote(input: GeneralCalcInput): ProfessionalQuote {
  const { pax, costs, commissionFee, marginPercent, discount, rates } = input;
  const safePax = Math.max(1, pax);
  const sarRate = rates.SAR ?? 1;
  const usdRate = rates.USD ?? 1;

  const breakdown: BreakdownRow[] = [];
  let totalSAR = 0;
  let totalUSD = 0;
  let totalIDR = 0;

  for (const c of costs) {
    const qty = c.unit === "pax" ? safePax : 1;
    let sarRef = 0;
    let usdRef = 0;
    let groupIDR = 0;

    if (c.currency === "IDR") {
      groupIDR = c.amount * qty;
    } else if (c.currency === "SAR") {
      sarRef = c.amount * qty;
      groupIDR = sarRef * sarRate;
      totalSAR += sarRef;
    } else {
      usdRef = c.amount * qty;
      groupIDR = usdRef * usdRate;
      totalUSD += usdRef;
    }

    totalIDR += groupIDR;
    breakdown.push({
      id: c.id,
      category: "Biaya",
      label: c.label || "Item",
      notesSAR: sarRef,
      notesUSD: usdRef,
      groupIDR,
      perPaxIDR: groupIDR / safePax,
    });
  }

  return {
    breakdown,
    hotelIDR: 0, transportIDR: 0, visaIDR: 0, destinationIDR: 0, staffIDR: 0,
    totalSAR, totalUSD,
    ...rollup(totalIDR, commissionFee, marginPercent, discount, safePax),
  };
}

// ── Legacy compat ─────────────────────────────────────────────────────────────

export interface CostInput {
  id: string;
  label: string;
  amount: number;
}
