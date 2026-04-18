import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Package, PackageDraft, PackageStatus } from "@/features/packages/packagesRepo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Package | null;
  onSubmit: (draft: PackageDraft) => Promise<void> | void;
}

const STATUSES: PackageStatus[] = ["Draft", "Calculated", "Confirmed", "Paid", "Completed"];

const QUICK_EMOJIS = ["✈️", "🕌", "🌙", "🕋", "🗺️", "🏨", "⛵", "🌍", "🎒", "🌅", "🏔️", "🌴"];

const empty: PackageDraft = {
  name: "",
  destination: "",
  people: 1,
  days: 7,
  totalIDR: 0,
  status: "Draft",
  emoji: "✈️",
};

export function PackageFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [draft, setDraft] = useState<PackageDraft>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(initial ? { ...initial } : empty);
  }, [open, initial]);

  const set = <K extends keyof PackageDraft>(key: K, value: PackageDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.destination.trim()) return;
    setSaving(true);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const canSave = draft.name.trim() && draft.destination.trim();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Sheet — bottom on mobile, centered on md+ */}
          <motion.div
            className="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:pointer-events-none"
          >
            <motion.div
              className="relative w-full md:w-[440px] md:pointer-events-auto bg-white md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "92dvh" }}
              initial={{ y: "100%", opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* Drag handle (mobile only) */}
              <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-[hsl(var(--border))]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] shrink-0">
                <h2 className="text-[15px] font-semibold text-[hsl(var(--foreground))]">
                  {initial ? "Edit Paket Trip" : "Tambah Paket Trip"}
                </h2>
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <X strokeWidth={2} className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">

                {/* Emoji row */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Ikon</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => set("emoji", e)}
                        className={`h-8 w-8 rounded-lg text-base flex items-center justify-center transition-[border-color,background-color] duration-150 border-2 ${
                          draft.emoji === e
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]"
                            : "border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nama */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Nama Paket</Label>
                  <Input
                    placeholder="cth: Umrah Ramadhan, Bali 5D4N"
                    value={draft.name}
                    onChange={(e) => set("name", e.target.value)}
                    className="h-9 text-sm"
                    autoFocus
                  />
                </div>

                {/* Destinasi */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Destinasi</Label>
                  <Input
                    placeholder="cth: Makkah, Madinah"
                    value={draft.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Pax + Hari inline */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Pax</Label>
                    <Input
                      type="number" min={1}
                      value={draft.people}
                      onChange={(e) => set("people", Math.max(1, Number(e.target.value)))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Hari</Label>
                    <Input
                      type="number" min={1}
                      value={draft.days}
                      onChange={(e) => set("days", Math.max(1, Number(e.target.value)))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Total + Status inline */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Total (IDR)</Label>
                    <Input
                      type="number" min={0}
                      value={draft.totalIDR}
                      onChange={(e) => set("totalIDR", Math.max(0, Number(e.target.value)))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Status</Label>
                    <Select value={draft.status} onValueChange={(v) => set("status", v as PackageStatus)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[hsl(var(--border))] flex gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl border border-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold text-white gradient-primary flex items-center justify-center gap-1.5 disabled:opacity-50 transition-opacity"
                >
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Menyimpan...
                    </span>
                  ) : (
                    <>
                      <Check strokeWidth={2.5} className="h-3.5 w-3.5" />
                      {initial ? "Simpan" : "Tambah"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
