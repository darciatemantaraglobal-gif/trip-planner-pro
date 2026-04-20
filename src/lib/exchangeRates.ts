export type Currency = "USD" | "SAR" | "IDR";
export type Rates = Record<Currency, number>;

const CACHE_KEY = "igh.rates.cache.v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface RatesCache {
  rates: Rates;
  fetchedAt: number;
}

function loadCache(): RatesCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: RatesCache = JSON.parse(raw);
    if (Date.now() - c.fetchedAt > CACHE_TTL_MS) return null;
    return c;
  } catch {
    return null;
  }
}

function saveCache(rates: Rates) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }));
}

async function fetchFromFrankfurter(): Promise<Rates> {
  const url = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "/api/frankfurter/latest?from=IDR&to=USD,SAR"
    : "https://api.frankfurter.app/latest?from=IDR&to=USD,SAR";
  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error("Frankfurter API error");
  const data = await res.json();
  const usdPerIdr = data.rates?.USD ?? 0;
  const sarPerIdr = data.rates?.SAR ?? 0;
  if (!usdPerIdr || !sarPerIdr) throw new Error("Invalid rate data");
  return {
    IDR: 1,
    USD: Math.round(1 / usdPerIdr),
    SAR: Math.round(1 / sarPerIdr),
  };
}

const FALLBACK_RATES: Rates = { USD: 16000, SAR: 4250, IDR: 1 };

export async function getExchangeRates(): Promise<Rates> {
  const cached = loadCache();
  if (cached) return cached.rates;

  try {
    const rates = await fetchFromFrankfurter();
    saveCache(rates);
    return rates;
  } catch {
    return FALLBACK_RATES;
  }
}

export function getMockRates(): Rates {
  const cached = loadCache();
  return cached?.rates ?? FALLBACK_RATES;
}

export function convertToIDR(amount: number, from: Currency, rates: Rates): number {
  return amount * (rates[from] ?? 1);
}

export function applyMarkup(rates: Rates, markupPct: number): Rates {
  const factor = 1 + markupPct / 100;
  return {
    IDR: 1,
    USD: Math.round(rates.USD * factor),
    SAR: Math.round(rates.SAR * factor),
  };
}
