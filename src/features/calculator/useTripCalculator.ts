import { useEffect, useMemo, useState } from "react";
import { getExchangeRates, type Currency, type Rates } from "@/lib/exchangeRates";
import { computeQuote, type CostInput } from "./pricing";

export interface UseTripCalculatorState {
  packageName: string;
  destination: string;
  people: number;
  currency: Currency;
  costs: CostInput[];
  marginPercent: number;
}

const defaultState: UseTripCalculatorState = {
  packageName: "",
  destination: "",
  people: 1,
  currency: "USD",
  costs: [],
  marginPercent: 15,
};

/**
 * Trip calculator hook. Owns state + derives the quote in real time.
 * Today rates come from a mock module; later swap `getExchangeRates`
 * for a real fetch — no changes needed here.
 */
export function useTripCalculator(initial?: Partial<UseTripCalculatorState>) {
  const [state, setState] = useState<UseTripCalculatorState>({ ...defaultState, ...initial });
  const [rates, setRates] = useState<Rates>({ USD: 15500, SAR: 4100, IDR: 1 });

  useEffect(() => {
    let cancelled = false;
    getExchangeRates().then((r) => {
      if (!cancelled) setRates(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const quote = useMemo(
    () =>
      computeQuote({
        costs: state.costs,
        people: state.people,
        currency: state.currency,
        marginPercent: state.marginPercent,
        rates,
      }),
    [state, rates],
  );

  const setField = <K extends keyof UseTripCalculatorState>(key: K, value: UseTripCalculatorState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const setCosts = (updater: (prev: CostInput[]) => CostInput[]) =>
    setState((prev) => ({ ...prev, costs: updater(prev.costs) }));

  const updateCostAmount = (id: string, amount: number) =>
    setCosts((prev) => prev.map((c) => (c.id === id ? { ...c, amount } : c)));

  const updateCostLabel = (id: string, label: string) =>
    setCosts((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));

  const addCost = (cost: CostInput) => setCosts((prev) => [...prev, cost]);

  const removeCost = (id: string) => setCosts((prev) => prev.filter((c) => c.id !== id));

  return {
    ...state,
    rates,
    quote,
    setField,
    updateCostAmount,
    updateCostLabel,
    addCost,
    removeCost,
  };
}
