import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Camera, Trash2 } from "lucide-react";
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

const COVER_GRADIENTS = [
  "linear-gradient(135deg,#f97316,#fb923c)",
  "linear-gradient(135deg,#0ea5e9,#38bdf8)",
  "linear-gradient(135deg,#8b5cf6,#a78bfa)",
  "linear-gradient(135deg,#10b981,#34d399)",
  "linear-gradient(135deg,#f59e0b,#fbbf24)",
];

const empty: PackageDraft = {
  name: "",
  destination: "",
  people: 1,
  days: 7,
  totalIDR: 0,
  status: "Draft",
  emoji: "✈️",
  coverImage: undefined,
};

export function PackageFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [draft, setDraft] = useState<PackageDraft>(empty);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const gradientIndex = draft.name.length % COVER_GRADIENTS.length;

  useEffect(() => {
    if (open) setDraft(initial ? { ...initial } : empty);
  }, [open, initial]);

  const set = <K extends keyof PackageDraft>(key: K, value: PackageDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("coverImage", ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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

          {/* Sheet */}
          <motion.div
            className="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:pointer-events-none"
          >
            <motion.div
              className="relative w-full md:w-[420px] md:pointer-events-auto bg-white md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "94dvh" }}
              initial={{ y: "100%", opacity: 0.85 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* ── Cover photo banner ── */}
              <div className="relative shrink-0 h-[108px] overflow-hidden">
                {/* Background */}
                {draft.coverImage ? (
                  <img
                    src={draft.coverImage}
                    alt="cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-5xl"
                    style={{ background: COVER_GRADIENTS[gradientIndex] }}
                  >
                    {draft.emoji}
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Top bar: drag handle + close */}
                <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 pt-2.5">
                  <div className="md:hidden w-8 h-1 rounded-full bg-white/50 mx-auto" />
                  <button
                    onClick={() => onOpenChange(false)}
                    className="ml-auto h-7 w-7 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                  >
                    <X strokeWidth={2} className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Title overlay */}
                <div className="absolute bottom-0 inset-x-0 px-4 pb-2.5 flex items-end justify-between">
                  <h2 className="text-[15px] font-semibold text-white drop-shadow">
                    {initial ? "Edit Paket Trip" : "Tambah Paket Trip"}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {draft.coverImage && (
                      <button
                        onClick={() => set("coverImage", undefined)}
                        className="h-7 w-7 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-red-500/80 transition-colors"
                      >
                        <Trash2 strokeWidth={2} className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="h-7 px-2.5 flex items-center gap-1.5 rounded-full bg-black/30 text-white text-[12px] font-medium hover:bg-black/50 transition-colors"
                    >
                      <Camera strokeWidth={2} className="h-3.5 w-3.5" />
                      {draft.coverImage ? "Ganti" : "Tambah Foto"}
                    </button>
                  </div>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </div>

              {/* ── Body ── */}
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2.5">

                {/* Emoji + Name inline */}
                <div className="flex gap-2 items-end">
                  <div className="shrink-0 space-y-1">
                    <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Ikon</Label>
                    <div className="flex gap-1 flex-wrap w-[136px]">
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => set("emoji", e)}
                          className={`h-7 w-7 rounded-md text-[15px] flex items-center justify-center transition-[border-color,background-color] duration-100 border-2 ${
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
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Nama Paket</Label>
                    <Input
                      placeholder="cth: Umrah Ramadhan"
                      value={draft.name}
                      onChange={(e) => set("name", e.target.value)}
                      className="h-9 text-sm"
                      autoFocus
                    />
                    <Input
                      placeholder="Destinasi: Makkah, Madinah"
                      value={draft.destination}
                      onChange={(e) => set("destination", e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Pax + Hari + Status in one row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Pax</Label>
                    <Input
                      type="number" min={1}
                      value={draft.people}
                      onChange={(e) => set("people", Math.max(1, Number(e.target.value)))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Hari</Label>
                    <Input
                      type="number" min={1}
                      value={draft.days}
                      onChange={(e) => set("days", Math.max(1, Number(e.target.value)))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Status</Label>
                    <Select value={draft.status} onValueChange={(v) => set("status", v as PackageStatus)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Total */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Total (IDR)</Label>
                  <Input
                    type="number" min={0}
                    value={draft.totalIDR}
                    onChange={(e) => set("totalIDR", Math.max(0, Number(e.target.value)))}
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="px-4 py-3 border-t border-[hsl(var(--border))] flex gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="btn-ghost flex-1 h-10 text-sm disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  className="btn-primary flex-1 h-10 rounded-xl text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
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
