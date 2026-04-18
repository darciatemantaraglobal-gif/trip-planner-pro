import { create } from "zustand";
import { getExchangeRates, type Rates } from "@/lib/exchangeRates";

/**
 * Global exchange-rate store.
 * Shape mirrors what a real API/edge-function call would return,
 * so swapping `getExchangeRates` for a fetch later requires no UI changes.
 */
interface RatesState {
  rates: Rates;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useRatesStore = create<RatesState>((set) => ({
  rates: { USD: 15500, SAR: 4100, IDR: 1 },
  lastUpdated: null,
  loading: false,
  error: null,
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const r = await getExchangeRates();
      set({ rates: r, lastUpdated: new Date(), loading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to load rates",
        loading: false,
      });
    }
  },
}));
