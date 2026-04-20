/**
 * Professional pricing engine for IGH Tour package calculator.
 * Supports two modes:
 *   - "umroh" : structured hotel/transport/ticket/visa/destination/fnb/staff tables
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
  pricePerNight: number; // SAR per room per night
  rooms: number;         // Quad = number of rooms
}

export interface TransportRow {
  id: string;
  label: string;
  fleet: number;
  pricePerFleet: number; // SAR total per fleet unit
}

export interface TicketRow {
  id: string;
  label: string;       // route e.g. "SUB - JED"
  flightType: string;  // e.g. "Return" / "One Way"
  pricePerPax: number; // price per person
  currency: "IDR" | "USD";
}

export interface VisaRow {
  id: string;
  label: string;
  pricePerPax: number; // USD per pax
}

export interface DestinationRow {
  id: string;
  label: string;
  pricePerPax: number; // SAR per pax
}

export interface FnBRow {
  id: string;
  label: string;
  pricePerPax: number; // SAR per pax
}

export interface StaffRow {
  id: string;
  label: string;
  numStaff?: number; // number of staff (optional, for display only)
  totalCost: number; // SAR total for whole group (all staff combined)
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
  hotelIDR: number;
  transportIDR: number;
  ticketIDR: number;
  visaIDR: number;
  destinationIDR: number;
  fnbIDR: number;
  staffIDR: number;
  hpp: number;
  commissionFee: number;
  marginIDR: number;
  sellingPrice: number;
  discount: number;
  finalPrice: number;
  perPaxFinal: number;
  netProfit: number;
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
  tickets?: TicketRow[];
  visas: VisaRow[];
  destinations: DestinationRow[];
  fnbs?: FnBRow[];
  staffs: StaffRow[];
  commissionFee: number;
  marginPercent: number;
  discount: number;
  rates: Rates;
}

export function computeProfessionalQuote(input: ProfessionalCalcInput): ProfessionalQuote {
  const { pax, hotels, transports, visas, destinations, staffs, commissionFee, marginPercent, discount, rates } = input;
  const tickets = input.tickets ?? [];
  const fnbs = input.fnbs ?? [];
  const safePax = Math.max(1, pax);
  const sarRate = rates.SAR ?? 1;
  const usdRate = rates.USD ?? 1;

  const breakdown: BreakdownRow[] = [];
  let totalSAR = 0;
  let totalUSD = 0;

  // ── 1. Hotel (SAR per room per night × rooms × days) ──────────────────────
  let hotelIDR = 0;
  for (const h of hotels) {
    const sarAmount = h.days * h.pricePerNight * h.rooms;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    hotelIDR += idr;
    breakdown.push({ id: h.id, category: "Hotel", label: h.label || "Hotel", notesSAR: sarAmount, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  // ── 2. Transport (SAR per fleet × fleet count) ─────────────────────────────
  let transportIDR = 0;
  for (const t of transports) {
    const sarAmount = t.fleet * t.pricePerFleet;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    transportIDR += idr;
    breakdown.push({ id: t.id, category: "Transport", label: t.label || "Transportasi", notesSAR: sarAmount, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  // ── 3. Airline Ticket (IDR or USD per pax) ─────────────────────────────────
  let ticketIDR = 0;
  for (const tk of tickets) {
    let idr = 0;
    let usdRef = 0;
    if (tk.currency === "USD") {
      usdRef = tk.pricePerPax * safePax;
      idr = usdRef * usdRate;
      totalUSD += usdRef;
    } else {
      idr = tk.pricePerPax * safePax;
    }
    ticketIDR += idr;
    breakdown.push({ id: tk.id, category: "Tiket", label: `${tk.label}${tk.flightType ? ` (${tk.flightType})` : ""}`, notesSAR: 0, notesUSD: usdRef, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  // ── 4. Visa (USD per pax) ──────────────────────────────────────────────────
  let visaIDR = 0;
  for (const v of visas) {
    const usdAmount = v.pricePerPax * safePax;
    const idr = usdAmount * usdRate;
    totalUSD += usdAmount;
    visaIDR += idr;
    breakdown.push({ id: v.id, category: "Visa", label: v.label || "Visa", notesSAR: 0, notesUSD: usdAmount, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  // ── 5. Destination (SAR per pax) ───────────────────────────────────────────
  let destinationIDR = 0;
  for (const d of destinations) {
    const sarAmount = d.pricePerPax * safePax;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    destinationIDR += idr;
    breakdown.push({ id: d.id, category: "Destinasi", label: d.label || "Destinasi", notesSAR: sarAmount, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  // ── 6. F&B (SAR per pax) ───────────────────────────────────────────────────
  let fnbIDR = 0;
  for (const f of fnbs) {
    const sarAmount = f.pricePerPax * safePax;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    fnbIDR += idr;
    breakdown.push({ id: f.id, category: "F&B", label: f.label || "F&B", notesSAR: sarAmount, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  // ── 7. Staff (SAR total group cost) ───────────────────────────────────────
  let staffIDR = 0;
  for (const s of staffs) {
    const idr = s.totalCost * sarRate;
    totalSAR += s.totalCost;
    staffIDR += idr;
    breakdown.push({ id: s.id, category: "Staff", label: s.label || "Guide", notesSAR: s.totalCost, notesUSD: 0, groupIDR: idr, perPaxIDR: idr / safePax });
  }

  const hpp = hotelIDR + transportIDR + ticketIDR + visaIDR + destinationIDR + fnbIDR + staffIDR;

  return {
    breakdown,
    hotelIDR, transportIDR, ticketIDR, visaIDR, destinationIDR, fnbIDR, staffIDR,
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
    hotelIDR: 0, transportIDR: 0, ticketIDR: 0, visaIDR: 0, destinationIDR: 0, fnbIDR: 0, staffIDR: 0,
    totalSAR, totalUSD,
    ...rollup(totalIDR, commissionFee, marginPercent, discount, safePax),
  };
}

// ── Legacy compat (used by Calculator page and calculatorStore) ───────────────

export interface CostInput {
  id: string;
  label: string;
  amount: number;
}

export interface Quote {
  totalCost: number;
  marginAmount: number;
  finalPrice: number;
  perPerson: number;
  breakdown: { id: string; label: string; amount: number; converted: number }[];
}

export function computeQuote(input: {
  costs: CostInput[];
  people: number;
  currency: string;
  marginPercent: number;
  rates: Rates;
}): Quote {
  const { costs, people, currency, marginPercent, rates } = input;
  const safePeople = Math.max(1, people);
  const rate = (rates as Record<string, number>)[currency] ?? 1;

  const breakdown = costs.map((c) => ({
    id: c.id,
    label: c.label,
    amount: c.amount,
    converted: c.amount * rate,
  }));

  const totalCost = breakdown.reduce((s, b) => s + b.converted, 0);
  const marginAmount = totalCost * (marginPercent / 100);
  const finalPrice = totalCost + marginAmount;
  const perPerson = finalPrice / safePeople;

  return { totalCost, marginAmount, finalPrice, perPerson, breakdown };
}
