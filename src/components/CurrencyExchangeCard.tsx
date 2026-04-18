import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

type Rate = {
  from: string;
  to: string;
  rate: string;
  change: number;
  up: boolean;
};

// Mock data only — no real API calls.
const mockRates: Rate[] = [
  { from: "USD", to: "IDR", rate: "16,245", change: 0.42, up: true },
  { from: "SAR", to: "IDR", rate: "4,331", change: -0.18, up: false },
];

export function CurrencyExchangeCard() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // UI-only auto-refresh indicator (no real fetch happens)
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => {
        setLastUpdated(new Date());
        setRefreshing(false);
      }, 800);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = lastUpdated.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Live Exchange Rates</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Mock data · display only</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw
            className={`h-3 w-3 ${refreshing ? "animate-spin text-primary" : ""}`}
          />
          <span>{refreshing ? "Updating..." : `Updated ${timeAgo}`}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockRates.map((r) => (
          <div
            key={`${r.from}-${r.to}`}
            className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent/40 transition-smooth"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span>{r.from}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{r.to}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold tabular-nums">{r.rate}</span>
              <span
                className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                  r.up
                    ? "text-success bg-success/10"
                    : "text-destructive bg-destructive/10"
                }`}
              >
                {r.up ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(r.change)}%
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs text-muted-foreground">
            Auto-refresh every 30s
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
