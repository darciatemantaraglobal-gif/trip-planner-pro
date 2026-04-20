import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check, FileEdit, Calculator, CheckCircle2, CreditCard, Trophy, Clock, ArrowRight, Undo2, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePackages } from "@/features/packages/usePackages";
import type { Package, PackageStatus } from "@/features/packages/packagesRepo";

const steps: { key: PackageStatus; icon: any; label: string; desc: string }[] = [
  { key: "Draft",      icon: FileEdit,     label: "Draft",      desc: "Dibuat" },
  { key: "Calculated", icon: Calculator,   label: "Kalkulasi",  desc: "Harga dihitung" },
  { key: "Confirmed",  icon: CheckCircle2, label: "Konfirmasi", desc: "Klien setuju" },
  { key: "Paid",       icon: CreditCard,   label: "Dibayar",    desc: "Pembayaran lunas" },
  { key: "Completed",  icon: Trophy,       label: "Selesai",    desc: "Trip rampung" },
];

const statusBadge: Record<PackageStatus, string> = {
  Draft:      "bg-muted text-muted-foreground",
  Calculated: "bg-primary/10 text-primary",
  Confirmed:  "bg-warning/10 text-warning",
  Paid:       "bg-success/10 text-success",
  Completed:  "bg-emerald-500/10 text-emerald-600",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export default function ProgressTracker() {
  const { items, loading, update } = usePackages();

  const sorted = useMemo(
    () => [...items].sort((a, b) =>
      steps.findIndex((s) => s.key === a.status) - steps.findIndex((s) => s.key === b.status)
    ),
    [items],
  );

  const setStatus = async (pkg: Package, status: PackageStatus) => {
    if (pkg.status === status) return;
    await update(pkg.id, { status });
    toast.success(`${pkg.name} → ${status}`);
  };

  const advance  = async (pkg: Package) => {
    const idx = steps.findIndex((s) => s.key === pkg.status);
    if (idx < steps.length - 1) await setStatus(pkg, steps[idx + 1].key);
  };

  const rollback = async (pkg: Package) => {
    const idx = steps.findIndex((s) => s.key === pkg.status);
    if (idx > 0) await setStatus(pkg, steps[idx - 1].key);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold leading-tight">Progress Tracker</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Ketuk tahap untuk update status paket.
          </p>
        </div>
        <Activity strokeWidth={1.5} className="h-5 w-5 text-[hsl(var(--muted-foreground))] mt-1 shrink-0" />
      </div>

      {loading ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] py-4 text-center">Memuat data…</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] py-10 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Belum ada paket — buat dulu dari halaman Paket.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((pkg) => {
            const currentIdx = steps.findIndex((s) => s.key === pkg.status);
            const progressPct = (currentIdx / (steps.length - 1)) * 100;
            const canAdvance  = currentIdx < steps.length - 1;
            const canRollback = currentIdx > 0;

            return (
              <div key={pkg.id} className="rounded-2xl border border-[hsl(var(--border))] bg-white shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[13px] font-bold truncate">{pkg.name}</span>
                      <Badge className={cn(statusBadge[pkg.status], "border-0 text-[10px] px-1.5 h-4 shrink-0 font-medium")}>
                        {pkg.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                      <span className="truncate">{pkg.destination}</span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(pkg.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => rollback(pkg)}
                      disabled={!canRollback}
                      title="Mundur satu tahap"
                    >
                      <Undo2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gradient-primary text-white"
                      onClick={() => advance(pkg)}
                      disabled={!canAdvance}
                    >
                      Lanjut <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Progress steps */}
                <div className="px-3 pb-3">
                  <div className="relative">
                    {/* Background line */}
                    <div className="absolute left-0 right-0 top-4 h-0.5 bg-[hsl(var(--border))]" />
                    {/* Filled line */}
                    <div
                      className="absolute left-0 top-4 h-0.5 gradient-primary transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />

                    <div className="relative grid grid-cols-5">
                      {steps.map((step, idx) => {
                        const isComplete = idx < currentIdx;
                        const isCurrent  = idx === currentIdx;
                        const Icon = step.icon;

                        return (
                          <button
                            key={step.key}
                            type="button"
                            onClick={() => setStatus(pkg, step.key)}
                            className="flex flex-col items-center text-center focus:outline-none group/step"
                            title={`Set ke ${step.key}`}
                          >
                            <div
                              className={cn(
                                "h-8 w-8 flex items-center justify-center border-0 bg-white transition-smooth z-10 cursor-pointer",
                                "group-hover/step:scale-110",
                                isComplete && "shadow-none",
                                isCurrent  && "text-[hsl(var(--primary))] scale-110",
                                !isComplete && !isCurrent && "text-[hsl(var(--muted-foreground))]",
                              )}
                            >
                              {isComplete ? (
                                <Check className="h-3.5 w-3.5 text-white" />
                              ) : (
                                <Icon className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="mt-1.5">
                              <div className={cn(
                                "text-[10px] font-semibold leading-tight",
                                isCurrent  ? "text-[hsl(var(--primary))]"
                                : isComplete ? "text-[hsl(var(--foreground))]"
                                : "text-[hsl(var(--muted-foreground))]",
                              )}>
                                {step.label}
                              </div>
                              <div className="text-[9px] text-[hsl(var(--muted-foreground))] hidden sm:block mt-0.5 leading-tight">
                                {step.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
