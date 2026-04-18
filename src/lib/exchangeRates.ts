/**
 * Exchange rate service — mock implementation.
 *
 * Replace `getExchangeRates` with a real API call later (e.g. fetch from
 * exchangerate.host or an internal edge function). The shape of `Rates`
 * and the function signature should stay the same so the calculator
 * doesn't need to change.
 */

export type Currency = "USD" | "SAR" | "IDR";

export type Rates = Record<Currency, number>; // value = how many IDR per 1 unit of currency

const MOCK_RATES: Rates = {
  USD: 15500,
  SAR: 4100,
  IDR: 1,
};

/** Get current exchange rates (mock). Async to mirror a real API. */
export async function getExchangeRates(): Promise<Rates> {
  return MOCK_RATES;
}

/** Synchronous accessor for the current snapshot — used inside pure calculators. */
export function getMockRates(): Rates {
  return MOCK_RATES;
}

/** Convert an amount in `from` currency to IDR using the provided rates. */
export function convertToIDR(amount: number, from: Currency, rates: Rates): number {
  const rate = rates[from] ?? 1;
  return amount * rate;
}
