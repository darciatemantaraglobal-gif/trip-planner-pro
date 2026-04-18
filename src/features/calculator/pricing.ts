/**
 * Pure pricing functions for the trip calculator.
 * No React, no I/O — easy to unit-test and easy to swap with a backend
 * endpoint later (e.g. POST /api/calculator/quote).
 */

import { convertToIDR, type Currency, type Rates } from "@/lib/exchangeRates";

export interface CostInput {
  id: string;
  label: string;
  amount: number;
}

export interface QuoteInput {
  costs: CostInput[];
  people: number;
  currency: Currency;
  marginPercent: number;
  rates: Rates;
}

export interface Quote {
  totalIDR: number;
  perPersonIDR: number;
  marginIDR: number;
  finalPriceIDR: number;
  finalPerPersonIDR: number;
  breakdown: Array<{ id: string; label: string; amountIDR: number }>;
}

export function computeQuote(input: QuoteInput): Quote {
  const { costs, people, currency, marginPercent, rates } = input;

  const breakdown = costs.map((c) => ({
    id: c.id,
    label: c.label,
    amountIDR: convertToIDR(Number(c.amount) || 0, currency, rates),
  }));

  const totalIDR = breakdown.reduce((sum, c) => sum + c.amountIDR, 0);
  const safePeople = Math.max(1, people);
  const perPersonIDR = totalIDR / safePeople;
  const marginIDR = totalIDR * (marginPercent / 100);
  const finalPriceIDR = totalIDR + marginIDR;
  const finalPerPersonIDR = finalPriceIDR / safePeople;

  return {
    totalIDR,
    perPersonIDR,
    marginIDR,
    finalPriceIDR,
    finalPerPersonIDR,
    breakdown,
  };
}
