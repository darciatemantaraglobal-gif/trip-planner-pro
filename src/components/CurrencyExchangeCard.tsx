import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { getExchangeRates, type Rates } from "@/lib/exchangeRates";

interface DisplayRate {
  from: "USD" | "SAR";
  to: "IDR";
  rate: number;
  change: number;
  up: boolean;
}

/**
 * Builds the displayed pairs from a Rates snapshot.
 * Change values are mocked — replace with API-driven deltas later.
 */
function buildDisplayRates(rates: Rates): DisplayRate[] {
  return [
    { from: "USD", to: "IDR", rate: rates.USD, change: 0.42, up: true },
    { from: "SAR", to: "IDR", rate: rates.SAR, change: -0.18, up: false },
  ];
}

export function CurrencyExchangeCard() {
  const [rates, setRates] = useState<DisplayRate[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Async loader — same pattern works once getExchangeRates hits a real API.
  const load = async () => {
    setRefreshing(true);
    try {
      const r = await getExchangeRates();
      setRates(buildDisplayRates(r));
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load + auto-refresh every 30s.
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Live Exchange Rates</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Mock data · display only</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin text-primary" : ""}`} />
          <span>{refreshing ? "Updating..." : `Updated ${updatedLabel}`}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rates ? (
          <>
            <RateRowSkeleton />
            <RateRowSkeleton />
          </>
        ) : (
          rates.map((r) => (
            <div
              key={`${r.from}-${r.to}`}
              className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent/40 transition-smooth"
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span>{r.from}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{r.to}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold tabular-nums">
                  {r.rate.toLocaleString("id-ID")}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                    r.up ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                  }`}
                >
                  {r.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(r.change)}%
                </span>
              </div>
            </div>
          ))
        )}

        <div className="flex items-center gap-2 pt-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs text-muted-foreground">Auto-refresh every 30s</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RateRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-12 rounded" />
      </div>
    </div>
  );
}
