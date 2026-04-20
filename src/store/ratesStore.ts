import { create } from "zustand";
import { getExchangeRates, applyMarkup, type Rates } from "@/lib/exchangeRates";

const MARKUP_KEY = "igh.rates.markup.v1";

function loadMarkup(): number {
  try {
    const v = localStorage.getItem(MARKUP_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

interface RatesState {
  rates: Rates;
  rawRates: Rates;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  markupPct: number;
  setMarkup: (pct: number) => void;
  refresh: () => Promise<void>;
}

export const useRatesStore = create<RatesState>((set, get) => ({
  rates: { USD: 16000, SAR: 4250, IDR: 1 },
  rawRates: { USD: 16000, SAR: 4250, IDR: 1 },
  lastUpdated: null,
  loading: false,
  error: null,
  markupPct: loadMarkup(),

  setMarkup: (pct: number) => {
    localStorage.setItem(MARKUP_KEY, String(pct));
    const raw = get().rawRates;
    set({ markupPct: pct, rates: applyMarkup(raw, pct) });
  },

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const raw = await getExchangeRates();
      const markup = get().markupPct;
      set({
        rawRates: raw,
        rates: applyMarkup(raw, markup),
        lastUpdated: new Date(),
        loading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Gagal memuat kurs",
        loading: false,
      });
    }
  },
}));
