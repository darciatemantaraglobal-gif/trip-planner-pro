import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Camera, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const fieldClass =
  "h-9 text-sm rounded-xl border border-white/30 bg-white/60 backdrop-blur-sm placeholder:text-gray-400 focus:border-orange-400 focus:ring-orange-400/20 focus:bg-white/80 transition-all duration-200 shadow-sm";

const selectTriggerClass =
  "h-9 text-sm rounded-xl border border-white/30 bg-white/60 backdrop-blur-sm focus:border-orange-400 focus:ring-orange-400/20 focus:bg-white/80 transition-all duration-200 shadow-sm";

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
    if (!draft.name.trim()) errs.name = "Nama paket wajib diisi";
    if (!draft.destination.trim()) errs.destination = "Destinasi wajib diisi";
    if (!draft.airline) errs.airline = "Maskapai wajib dipilih";
    if (!draft.hotelLevel) errs.hotelLevel = "Level hotel wajib dipilih";
    if (!draft.departureDate) errs.departureDate = "Tanggal keberangkatan wajib diisi";
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
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              className="relative w-full max-w-2xl pointer-events-auto rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{
                maxHeight: "92dvh",
                background: "linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(255,247,237,0.97) 100%)",
                backdropFilter: "blur(20px)",
                fontFamily: "'Montserrat', sans-serif",
              }}
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* ── Cover photo banner ── */}
              <div className="relative shrink-0 h-[100px] overflow-hidden">
                {draft.coverImage ? (
                  <img src={draft.coverImage} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-5xl"
                    style={{ background: COVER_GRADIENTS[gradientIndex] }}
                  >
                    {draft.emoji}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Top bar */}
                <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-3">
                  <h2 style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[15px] font-bold text-white drop-shadow tracking-wide">
                    {initial ? "✏️ Edit Paket Trip" : "✈️ Tambah Paket Trip"}
                  </h2>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="h-7 w-7 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/60 transition-colors"
                  >
                    <X strokeWidth={2} className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Camera buttons */}
                <div className="absolute bottom-0 inset-x-0 px-4 pb-2.5 flex items-end justify-end gap-1.5">
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
                    className="h-7 px-2.5 flex items-center gap-1.5 rounded-full bg-black/30 text-white text-[11px] font-semibold hover:bg-black/50 transition-colors"
                  >
                    <Camera strokeWidth={2} className="h-3 w-3" />
                    {draft.coverImage ? "Ganti Foto" : "Tambah Foto"}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>

              {/* ── Body ── */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* ── ICON SELECTOR ── */}
                <div className="space-y-1.5">
                  <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                    Pilih Ikon
                  </Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => set("emoji", e)}
                        className={`h-9 w-9 rounded-xl text-[18px] flex items-center justify-center transition-all duration-150 border-2 ${
                          draft.emoji === e
                            ? "border-orange-500 bg-orange-50 shadow-md shadow-orange-200 scale-110"
                            : "border-gray-200/60 bg-white/60 hover:border-orange-300 hover:bg-orange-50/50 hover:scale-105"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── TWO-COLUMN GRID ── */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">

                  {/* LEFT: Nama Paket */}
                  <div className="space-y-1">
                    <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Nama Paket <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="cth: Umrah Ramadhan"
                      value={draft.name}
                      onChange={(e) => { set("name", e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
                      className={fieldClass + (errors.name ? " border-red-400" : "")}
                      autoFocus
                    />
                    {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name}</p>}
                  </div>

                  {/* RIGHT: Tanggal Keberangkatan */}
                  <div className="space-y-1">
                    <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Tgl. Keberangkatan <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={draft.departureDate ?? ""}
                      onChange={(e) => { set("departureDate", e.target.value); setErrors(p => ({ ...p, departureDate: undefined })); }}
                      className={fieldClass + (errors.departureDate ? " border-red-400" : "")}
                    />
                    {errors.departureDate && <p className="text-[10px] text-red-500 mt-0.5">{errors.departureDate}</p>}
                  </div>

                  {/* LEFT: Destinasi */}
                  <div className="space-y-1">
                    <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Destinasi <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="cth: Makkah, Madinah"
                      value={draft.destination}
                      onChange={(e) => { set("destination", e.target.value); setErrors(p => ({ ...p, destination: undefined })); }}
                      className={fieldClass + (errors.destination ? " border-red-400" : "")}
                    />
                    {errors.destination && <p className="text-[10px] text-red-500 mt-0.5">{errors.destination}</p>}
                  </div>

                  {/* RIGHT: Durasi */}
                  <div className="space-y-1">
                    <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Durasi (Hari) <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="number" min={1}
                      value={draft.days}
                      onChange={(e) => { set("days", Math.max(1, Number(e.target.value))); setErrors(p => ({ ...p, days: undefined })); }}
                      className={fieldClass + (errors.days ? " border-red-400" : "")}
                    />
                    {errors.days && <p className="text-[10px] text-red-500 mt-0.5">{errors.days}</p>}
                  </div>

                  {/* LEFT: Status */}
                  <div className="space-y-1">
                    <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Status
                    </Label>
                    <Select value={draft.status} onValueChange={(v) => set("status", v as PackageStatus)}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* RIGHT: Kuota (Pax) */}
                  <div className="space-y-1">
                    <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Kuota (Pax) <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="number" min={1}
                      value={draft.people}
                      onChange={(e) => { set("people", Math.max(1, Number(e.target.value))); setErrors(p => ({ ...p, people: undefined })); }}
                      className={fieldClass + (errors.people ? " border-red-400" : "")}
                    />
                    {errors.people && <p className="text-[10px] text-red-500 mt-0.5">{errors.people}</p>}
                  </div>

                  {/* LEFT: Level Hotel */}
                  <div className="space-y-1">
                    <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Level Hotel <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={draft.hotelLevel ?? ""}
                      onValueChange={(v) => { set("hotelLevel", v as HotelLevel); setErrors(p => ({ ...p, hotelLevel: undefined })); }}
                    >
                      <SelectTrigger className={selectTriggerClass + (errors.hotelLevel ? " border-red-400" : "")}>
                        <SelectValue placeholder="Pilih level hotel" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOTEL_LEVELS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.hotelLevel && <p className="text-[10px] text-red-500 mt-0.5">{errors.hotelLevel}</p>}
                  </div>

                  {/* RIGHT: Maskapai */}
                  <div className="space-y-1">
                    <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Maskapai <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={draft.airline ?? ""}
                      onValueChange={(v) => { set("airline", v); setErrors(p => ({ ...p, airline: undefined })); }}
                    >
                      <SelectTrigger className={selectTriggerClass + (errors.airline ? " border-red-400" : "")}>
                        <SelectValue placeholder="Pilih maskapai" />
                      </SelectTrigger>
                      <SelectContent>
                        {AIRLINES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.airline && <p className="text-[10px] text-red-500 mt-0.5">{errors.airline}</p>}
                  </div>
                </div>

                {/* ── FINANCIAL SECTION ── */}
                <div
                  className="rounded-2xl p-4 space-y-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(251,146,60,0.04) 100%)",
                    border: "1px solid rgba(249,115,22,0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                      <TrendingUp className="h-3 w-3 text-white" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">
                      Finansial & Margin
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* HPP */}
                    <div className="space-y-1">
                      <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        HPP / Modal (IDR)
                      </Label>
                      <Input
                        type="number" min={0}
                        value={draft.hpp}
                        onChange={(e) => set("hpp", Math.max(0, Number(e.target.value)))}
                        className={fieldClass + " border-orange-200/60"}
                        placeholder="0"
                      />
                    </div>

                    {/* Harga Jual */}
                    <div className="space-y-1">
                      <Label style={{ fontFamily: "'Montserrat', sans-serif" }} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Harga Jual (IDR)
                      </Label>
                      <Input
                        type="number" min={0}
                        value={draft.totalIDR}
                        onChange={(e) => set("totalIDR", Math.max(0, Number(e.target.value)))}
                        className={fieldClass + " border-orange-200/60"}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Estimasi Profit */}
                  <div
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                      profit > 0
                        ? "bg-emerald-50 border border-emerald-200"
                        : profit < 0
                        ? "bg-red-50 border border-red-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {profit >= 0 ? (
                      <TrendingUp className={`h-3.5 w-3.5 shrink-0 ${profit > 0 ? "text-emerald-500" : "text-gray-400"}`} strokeWidth={2.5} />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-500" strokeWidth={2.5} />
                    )}
                    <span
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                      className={`text-[11px] font-semibold ${
                        profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      Estimasi Profit:{" "}
                      <span className="font-bold">{formatRupiah(profit)}</span>
                      {profit < 0 && " ⚠️ Harga jual di bawah modal!"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="px-5 py-3.5 border-t border-orange-100 flex gap-2.5 shrink-0 pb-[max(14px,env(safe-area-inset-bottom))]"
                style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)" }}
              >
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    background: canSave && !saving
                      ? "linear-gradient(135deg, #f97316, #ea580c)"
                      : undefined,
                  }}
                  className="flex-1 h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-all duration-200 disabled:opacity-40 disabled:bg-gray-300 disabled:text-gray-500 shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Menyimpan...
                    </span>
                  ) : (
                    <>
                      <Check strokeWidth={2.5} className="h-3.5 w-3.5" />
                      {initial ? "Simpan Perubahan" : "Tambah Paket"}
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
