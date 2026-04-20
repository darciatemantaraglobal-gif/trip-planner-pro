/**
 * Professional pricing engine for IGH Tour package calculator.
 * Mirrors the structure of a professional travel agency spreadsheet.
 */

import { type Rates } from "@/lib/exchangeRates";

// ── Input Structures ──────────────────────────────────────────────────────────

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

export interface ProfessionalCalcInput {
  pax: number;
  hotels: HotelRow[];
  transports: TransportRow[];
  visas: VisaRow[];
  destinations: DestinationRow[];
  staffs: StaffRow[];
  commissionFee: number; // fixed IDR added to HPP
  marginPercent: number; // % applied to HPP
  discount: number; // IDR subtracted from selling price
  rates: Rates;
}

// ── Output Structures ─────────────────────────────────────────────────────────

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
  // Category subtotals in IDR
  hotelIDR: number;
  transportIDR: number;
  visaIDR: number;
  destinationIDR: number;
  staffIDR: number;
  // Core financials
  hpp: number;           // Total Budget (sum of all category IDR)
  commissionFee: number;
  marginIDR: number;     // hpp * marginPercent / 100
  sellingPrice: number;  // hpp + commission + margin
  discount: number;
  finalPrice: number;    // sellingPrice - discount
  perPaxFinal: number;
  netProfit: number;     // finalPrice - hpp - commissionFee
  // Foreign currency reference totals
  totalSAR: number;
  totalUSD: number;
}

// ── Core Computation ──────────────────────────────────────────────────────────

export function computeProfessionalQuote(input: ProfessionalCalcInput): ProfessionalQuote {
  const { pax, hotels, transports, visas, destinations, staffs, commissionFee, marginPercent, discount, rates } = input;
  const safePax = Math.max(1, pax);
  const sarRate = rates.SAR ?? 1;
  const usdRate = rates.USD ?? 1;

  const breakdown: BreakdownRow[] = [];
  let totalSAR = 0;
  let totalUSD = 0;

  // ── Hotels ─────────────────────────────────────────────────────────────────
  let hotelIDR = 0;
  for (const h of hotels) {
    const sarAmount = h.days * h.pricePerNight * h.rooms;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    hotelIDR += idr;
    breakdown.push({
      id: h.id,
      category: "Hotel",
      label: h.label || "Hotel",
      notesSAR: sarAmount,
      notesUSD: 0,
      groupIDR: idr,
      perPaxIDR: idr / safePax,
    });
  }

  // ── Transportation ─────────────────────────────────────────────────────────
  let transportIDR = 0;
  for (const t of transports) {
    const sarAmount = t.fleet * t.pricePerFleet;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    transportIDR += idr;
    breakdown.push({
      id: t.id,
      category: "Transport",
      label: t.label || "Transportasi",
      notesSAR: sarAmount,
      notesUSD: 0,
      groupIDR: idr,
      perPaxIDR: idr / safePax,
    });
  }

  // ── Visa ───────────────────────────────────────────────────────────────────
  let visaIDR = 0;
  for (const v of visas) {
    const usdAmount = v.pricePerPax * safePax;
    const idr = usdAmount * usdRate;
    totalUSD += usdAmount;
    visaIDR += idr;
    breakdown.push({
      id: v.id,
      category: "Visa",
      label: v.label || "Visa",
      notesSAR: 0,
      notesUSD: usdAmount,
      groupIDR: idr,
      perPaxIDR: idr / safePax,
    });
  }

  // ── Destination & F&B ──────────────────────────────────────────────────────
  let destinationIDR = 0;
  for (const d of destinations) {
    const sarAmount = d.pricePerPax * safePax;
    const idr = sarAmount * sarRate;
    totalSAR += sarAmount;
    destinationIDR += idr;
    breakdown.push({
      id: d.id,
      category: "Destinasi & F&B",
      label: d.label || "Destinasi",
      notesSAR: sarAmount,
      notesUSD: 0,
      groupIDR: idr,
      perPaxIDR: idr / safePax,
    });
  }

  // ── Staff / Guide ──────────────────────────────────────────────────────────
  let staffIDR = 0;
  for (const s of staffs) {
    const idr = s.totalCost * sarRate;
    totalSAR += s.totalCost;
    staffIDR += idr;
    breakdown.push({
      id: s.id,
      category: "Staff",
      label: s.label || "Guide",
      notesSAR: s.totalCost,
      notesUSD: 0,
      groupIDR: idr,
      perPaxIDR: idr / safePax,
    });
  }

  // ── Financial Rollup ───────────────────────────────────────────────────────
  const hpp = hotelIDR + transportIDR + visaIDR + destinationIDR + staffIDR;
  const marginIDR = hpp * (marginPercent / 100);
  const sellingPrice = hpp + commissionFee + marginIDR;
  const finalPrice = Math.max(0, sellingPrice - discount);
  const perPaxFinal = finalPrice / safePax;
  const netProfit = finalPrice - hpp - commissionFee;

  return {
    breakdown,
    hotelIDR,
    transportIDR,
    visaIDR,
    destinationIDR,
    staffIDR,
    hpp,
    commissionFee,
    marginIDR,
    sellingPrice,
    discount,
    finalPrice,
    perPaxFinal,
    netProfit,
    totalSAR,
    totalUSD,
  };
}

// ── Legacy compat (still used by old Calculator page references) ──────────────

export interface CostInput {
  id: string;
  label: string;
  amount: number;
}
