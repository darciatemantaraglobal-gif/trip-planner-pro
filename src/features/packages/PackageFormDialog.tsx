import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Camera, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Package, PackageDraft, PackageStatus, HotelLevel } from "@/features/packages/packagesRepo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Package | null;
  onSubmit: (draft: PackageDraft) => Promise<void> | void;
}

const STATUSES: PackageStatus[] = ["Draft", "Calculated", "Confirmed", "Paid", "Completed"];
const HOTEL_LEVELS: HotelLevel[] = ["Bintang 3", "Bintang 4", "Bintang 5"];
const AIRLINES = ["Saudi Airlines", "Garuda Indonesia", "Lion Air", "Batik Air", "Emirates", "Qatar Airways", "Oman Air", "Flynas"];
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
  hpp: 0,
  totalIDR: 0,
  status: "Draft",
  emoji: "✈️",
  coverImage: undefined,
  departureDate: "",
  airline: "",
  hotelLevel: undefined,
};

function formatRupiah(num: number): string {
  if (!num || isNaN(num)) return "Rp 0";
  return "Rp " + num.toLocaleString("id-ID");
}

const lbl = "text-[10px] font-bold text-orange-500 uppercase tracking-widest";
const inp = "h-8 text-[12.5px] rounded-xl border border-[hsl(var(--border))] bg-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-orange-400/20 transition-all";
const sel = "h-8 text-[12.5px] rounded-xl border border-[hsl(var(--border))] bg-white focus:border-orange-400 transition-all";

export function PackageFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [draft, setDraft] = useState<PackageDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PackageDraft, string>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const gradientIndex = useMemo(
    () => (initial?.name ?? "").length % COVER_GRADIENTS.length,
    [initial]
  );
  const profit = (draft.totalIDR || 0) - (draft.hpp || 0);

  useEffect(() => {
    if (open) {
      setDraft(initial ? { ...initial } : empty);
      setErrors({});
    }
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

  const validate = (): boolean => {
    const errs: Partial<Record<keyof PackageDraft, string>> = {};
    if (!draft.name.trim()) errs.name = "Wajib diisi";
    if (!draft.destination.trim()) errs.destination = "Wajib diisi";
    if (!draft.airline) errs.airline = "Pilih maskapai";
    if (!draft.hotelLevel) errs.hotelLevel = "Pilih level hotel";
    if (!draft.departureDate) errs.departureDate = "Wajib diisi";
    if ((draft.people ?? 0) < 1) errs.people = "Min 1";
    if ((draft.days ?? 0) < 1) errs.days = "Min 1";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const canSave = draft.name.trim() && draft.destination.trim() && draft.airline && draft.hotelLevel && draft.departureDate;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => onOpenChange(false)}
          />

          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="relative w-full max-w-lg pointer-events-auto rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white border border-[hsl(var(--border))]"
              style={{ maxHeight: "90dvh" }}
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* Cover banner */}
              <div className="relative shrink-0 h-[80px] overflow-hidden">
                {draft.coverImage ? (
                  <img src={draft.coverImage} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl"
                    style={{ background: COVER_GRADIENTS[gradientIndex] }}>
                    {draft.emoji}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-2.5">
                  <h2 className="text-[13px] font-bold text-white drop-shadow tracking-wide" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                    {initial ? "✏️ Edit Paket Trip" : "✈️ Tambah Paket Trip"}
                  </h2>
                  <button onClick={() => onOpenChange(false)}
                    className="h-6 w-6 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/60 transition-colors">
                    <X strokeWidth={2} className="h-3 w-3" />
                  </button>
                </div>

                <div className="absolute bottom-0 inset-x-0 px-4 pb-2 flex items-end justify-end gap-1.5">
                  {draft.coverImage && (
                    <button onClick={() => set("coverImage", undefined)}
                      className="h-6 w-6 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-red-500/80 transition-colors">
                      <Trash2 strokeWidth={2} className="h-3 w-3" />
                    </button>
                  )}
                  <button onClick={() => fileRef.current?.click()}
                    className="h-6 px-2 flex items-center gap-1 rounded-full bg-black/30 text-white text-[10px] font-semibold hover:bg-black/50 transition-colors">
                    <Camera strokeWidth={2} className="h-2.5 w-2.5" />
                    {draft.coverImage ? "Ganti" : "Foto"}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3.5">

                {/* Emoji picker */}
                <div className="space-y-1.5">
                  <p className={lbl}>Ikon</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {QUICK_EMOJIS.map((e) => (
                      <button key={e} type="button" onClick={() => set("emoji", e)}
                        className={`h-8 w-8 rounded-xl text-base flex items-center justify-center transition-all border-2 ${draft.emoji === e
                          ? "border-orange-500 bg-orange-50 shadow-sm scale-110"
                          : "border-gray-200/80 bg-white hover:border-orange-300 hover:scale-105"
                        }`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 1: Nama + Tanggal */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className={lbl}>Nama Paket <span className="text-red-400">*</span></p>
                    <Input placeholder="Umrah Ramadhan" value={draft.name}
                      onChange={(e) => { set("name", e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
                      className={inp + (errors.name ? " border-red-400" : "")} autoFocus />
                    {errors.name && <p className="text-[9px] text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className={lbl}>Tgl. Berangkat <span className="text-red-400">*</span></p>
                    <Input type="date" value={draft.departureDate ?? ""}
                      onChange={(e) => { set("departureDate", e.target.value); setErrors(p => ({ ...p, departureDate: undefined })); }}
                      className={inp + (errors.departureDate ? " border-red-400" : "")} />
                    {errors.departureDate && <p className="text-[9px] text-red-500">{errors.departureDate}</p>}
                  </div>
                </div>

                {/* Row 2: Destinasi + Durasi */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className={lbl}>Destinasi <span className="text-red-400">*</span></p>
                    <Input placeholder="Makkah, Madinah" value={draft.destination}
                      onChange={(e) => { set("destination", e.target.value); setErrors(p => ({ ...p, destination: undefined })); }}
                      className={inp + (errors.destination ? " border-red-400" : "")} />
                    {errors.destination && <p className="text-[9px] text-red-500">{errors.destination}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className={lbl}>Durasi (Hari) <span className="text-red-400">*</span></p>
                    <Input type="number" min={1} value={draft.days}
                      onChange={(e) => { set("days", Math.max(1, Number(e.target.value))); setErrors(p => ({ ...p, days: undefined })); }}
                      className={inp + (errors.days ? " border-red-400" : "")} />
                    {errors.days && <p className="text-[9px] text-red-500">{errors.days}</p>}
                  </div>
                </div>

                {/* Row 3: Status + Kuota */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className={lbl}>Status</p>
                    <Select value={draft.status} onValueChange={(v) => set("status", v as PackageStatus)}>
                      <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className={lbl}>Kuota (Pax) <span className="text-red-400">*</span></p>
                    <Input type="number" min={1} value={draft.people}
                      onChange={(e) => { set("people", Math.max(1, Number(e.target.value))); setErrors(p => ({ ...p, people: undefined })); }}
                      className={inp + (errors.people ? " border-red-400" : "")} />
                    {errors.people && <p className="text-[9px] text-red-500">{errors.people}</p>}
                  </div>
                </div>

                {/* Row 4: Hotel + Maskapai */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className={lbl}>Level Hotel <span className="text-red-400">*</span></p>
                    <Select value={draft.hotelLevel ?? ""}
                      onValueChange={(v) => { set("hotelLevel", v as HotelLevel); setErrors(p => ({ ...p, hotelLevel: undefined })); }}>
                      <SelectTrigger className={sel + (errors.hotelLevel ? " border-red-400" : "")}>
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOTEL_LEVELS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.hotelLevel && <p className="text-[9px] text-red-500">{errors.hotelLevel}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className={lbl}>Maskapai <span className="text-red-400">*</span></p>
                    <Select value={draft.airline ?? ""}
                      onValueChange={(v) => { set("airline", v); setErrors(p => ({ ...p, airline: undefined })); }}>
                      <SelectTrigger className={sel + (errors.airline ? " border-red-400" : "")}>
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        {AIRLINES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.airline && <p className="text-[9px] text-red-500">{errors.airline}</p>}
                  </div>
                </div>

                {/* Financial section */}
                <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center">
                      <TrendingUp className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Finansial & Margin</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">HPP / Modal (IDR)</p>
                      <Input type="number" min={0} value={draft.hpp}
                        onChange={(e) => set("hpp", Math.max(0, Number(e.target.value)))}
                        className={inp + " border-orange-200/60"} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Harga Jual (IDR)</p>
                      <Input type="number" min={0} value={draft.totalIDR}
                        onChange={(e) => set("totalIDR", Math.max(0, Number(e.target.value)))}
                        className={inp + " border-orange-200/60"} placeholder="0" />
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${profit > 0 ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : profit < 0 ? "bg-red-50 border border-red-200 text-red-600" : "bg-gray-50 border border-gray-200 text-gray-400"}`}>
                    {profit >= 0
                      ? <TrendingUp className={`h-3 w-3 shrink-0 ${profit > 0 ? "text-emerald-500" : "text-gray-400"}`} strokeWidth={2.5} />
                      : <TrendingDown className="h-3 w-3 shrink-0 text-red-500" strokeWidth={2.5} />
                    }
                    <span>Estimasi Profit: <strong>{formatRupiah(profit)}</strong>{profit < 0 && " ⚠️ Di bawah modal!"}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-[hsl(var(--border))] flex gap-2 shrink-0 bg-white/80 backdrop-blur-sm pb-[max(12px,env(safe-area-inset-bottom))]">
                <button onClick={() => onOpenChange(false)} disabled={saving}
                  className="flex-1 h-9 rounded-xl text-[12.5px] font-semibold bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors disabled:opacity-50">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving || !canSave}
                  className="flex-1 h-9 rounded-xl text-[12.5px] font-bold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:bg-gray-200 disabled:text-gray-400 shadow-sm"
                  style={canSave && !saving ? { background: "linear-gradient(135deg,#f97316,#ea580c)" } : undefined}>
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Menyimpan...
                    </span>
                  ) : (
                    <>
                      <Check strokeWidth={2.5} className="h-3.5 w-3.5" />
                      {initial ? "Simpan" : "Tambah Paket"}
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
