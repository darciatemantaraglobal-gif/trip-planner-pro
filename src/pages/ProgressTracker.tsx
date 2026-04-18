import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check, FileEdit, Calculator, CheckCircle2, CreditCard, Trophy, Clock, ArrowRight, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePackages } from "@/features/packages/usePackages";
import type { Package, PackageStatus } from "@/features/packages/packagesRepo";

const steps: { key: PackageStatus; icon: any; desc: string }[] = [
  { key: "Draft", icon: FileEdit, desc: "Initial package creation" },
  { key: "Calculated", icon: Calculator, desc: "Pricing computed" },
  { key: "Confirmed", icon: CheckCircle2, desc: "Client approved" },
  { key: "Paid", icon: CreditCard, desc: "Payment received" },
  { key: "Completed", icon: Trophy, desc: "Trip finalized" },
];

const statusBadge: Record<PackageStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Calculated: "bg-primary/10 text-primary",
  Confirmed: "bg-warning/10 text-warning",
  Paid: "bg-success/10 text-success",
  Completed: "bg-emerald-500/10 text-emerald-600",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export default function ProgressTracker() {
  const { items, loading, update } = usePackages();

  const sorted = useMemo(
    () => [...items].sort((a, b) => steps.findIndex((s) => s.key === a.status) - steps.findIndex((s) => s.key === b.status)),
    [items],
  );

  const setStatus = async (pkg: Package, status: PackageStatus) => {
    if (pkg.status === status) return;
    await update(pkg.id, { status });
    toast.success(`${pkg.name}${status}`);
  };

  const advance = async (pkg: Package) => {
    const idx = steps.findIndex((s) => s.key === pkg.status);
    if (idx < steps.length - 1) await setStatus(pkg, steps[idx + 1].key);
  };

  const rollback = async (pkg: Package) => {
    const idx = steps.findIndex((s) => s.key === pkg.status);
    if (idx > 0) await setStatus(pkg, steps[idx - 1].key);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Click any stage to update a package — changes persist immediately.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading packages…</p>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No packages yet — create one from the Packages page.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((pkg) => {
            const currentIdx = steps.findIndex((s) => s.key === pkg.status);
            const progressPct = (currentIdx / (steps.length - 1)) * 100;
            const canAdvance = currentIdx < steps.length - 1;
            const canRollback = currentIdx > 0;

            return (
              <Card key={pkg.id} className="border-0 shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span>{pkg.destination}</span>
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          Updated {timeAgo(pkg.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(statusBadge[pkg.status], "border-0 font-medium")}>
                        {pkg.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rollback(pkg)}
                        disabled={!canRollback}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => advance(pkg)}
                        disabled={!canAdvance}
                        className="gradient-primary text-primary-foreground"
                      >
                        Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-0 right-0 top-5 h-0.5 bg-border" />
                    <div
                      className="absolute left-0 top-5 h-0.5 gradient-primary transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />

                    <div className="relative grid grid-cols-5 gap-2">
                      {steps.map((step, idx) => {
                        const isComplete = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        const Icon = step.icon;
                        return (
                          <button
                            key={step.key}
                            type="button"
                            onClick={() => setStatus(pkg, step.key)}
                            className="flex flex-col items-center text-center group/step focus:outline-none"
                            title={`Set status to ${step.key}`}
                          >
                            <div
                              className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center border-2 bg-background transition-smooth z-10 cursor-pointer",
                                "group-hover/step:scale-110 group-focus-visible/step:ring-2 group-focus-visible/step:ring-primary group-focus-visible/step:ring-offset-2",
                                isComplete && "gradient-primary border-transparent shadow-md",
                                isCurrent && "border-primary text-primary shadow-glow scale-110",
                                !isComplete && !isCurrent && "border-border text-muted-foreground",
                              )}
                            >
                              {isComplete ? (
                                <Check className="h-5 w-5 text-primary-foreground" />
                              ) : (
                                <Icon className="h-4 w-4" />
                              )}
                            </div>
                            <div className="mt-2">
                              <div
                                className={cn(
                                  "text-xs font-semibold",
                                  isCurrent ? "text-primary" : isComplete ? "text-foreground" : "text-muted-foreground",
                                )}
                              >
                                {step.key}
                              </div>
                              <div className="text-[10px] text-muted-foreground hidden md:block mt-0.5">
                                {step.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
