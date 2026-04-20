import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Camera, Trash2, NotebookPen, ImagePlus, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Package as PackageType, PackageDraft, PackageStatus, HotelLevel } from "@/features/packages/packagesRepo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: PackageType | null;
  onSubmit: (draft: PackageDraft) => Promise<void> | void;
}

const STATUSES: PackageStatus[] = ["Draft", "Calculated", "Confirmed", "Paid", "Completed"];
const HOTEL_LEVELS: HotelLevel[] = ["Bintang 3", "Bintang 4", "Bintang 5"];
const AIRLINES = ["Saudi Airlines", "Garuda Indonesia", "Lion Air", "Batik Air", "Emirates", "Qatar Airways", "Oman Air", "Flynas"];

const FACILITIES_LIST = [
  "Makan 3x/Hari",
  "Hotel Makkah",
  "Hotel Madinah",
  "Transport Lokal",
  "Pesawat PP",
  "Visa Umrah",
  "Manasik",
  "Perlengkapan",
  "Asuransi",
  "Tour Guide",
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
  notes: "",
  facilities: [],
};

const lbl = "text-[10.5px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide";
const inp = "h-9 text-[13px] rounded-xl border border-[hsl(var(--border))] bg-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-orange-400/20 transition-all";
const sel = "h-9 text-[13px] rounded-xl border border-[hsl(var(--border))] bg-white focus:border-orange-400 transition-all";

export function PackageFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [draft, setDraft] = useState<PackageDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PackageDraft, string>>>({});
  const [coverHover, setCoverHover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleFacility = (fac: string) => {
    const current = draft.facilities ?? [];
    const updated = current.includes(fac) ? current.filter((f) => f !== fac) : [...current, fac];
    set("facilities", updated);
  };

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
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
            <motion.div
              className="relative w-full md:max-w-lg pointer-events-auto rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col bg-white border border-[hsl(var(--border))]"
              style={{ maxHeight: "92dvh" }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[hsl(var(--border))] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
                    <Package strokeWidth={1.8} className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[14.5px] font-bold text-[hsl(var(--foreground))] leading-tight">
                      {initial ? "Edit Paket Trip" : "Tambah Paket Trip"}
                    </h2>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      Isi informasi lengkap paket perjalanan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0 ml-3"
                >
                  <X strokeWidth={2} className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>

              {/* ── Body ── */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* Cover Photo */}
                <div className="space-y-1.5">
                  <p className={lbl}>Foto Cover <span className="normal-case font-normal text-gray-400">· opsional</span></p>
                  {draft.coverImage ? (
                    <div
                      className="relative h-32 rounded-2xl overflow-hidden border border-[hsl(var(--border))] cursor-pointer"
                      onMouseEnter={() => setCoverHover(true)}
                      onMouseLeave={() => setCoverHover(false)}
                    >
                      <img src={draft.coverImage} alt="cover" className="w-full h-full object-cover" />
                      <AnimatePresence>
                        {coverHover && (
                          <motion.div
                            className="absolute inset-0 bg-black/45 flex items-center justify-center gap-2.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              className="h-8 px-3.5 rounded-xl bg-white text-[11.5px] font-semibold flex items-center gap-1.5 hover:bg-orange-50 transition-colors"
                            >
                              <Camera strokeWidth={2} className="h-3.5 w-3.5" />
                              Ganti Foto
                            </button>
                            <button
                              type="button"
                              onClick={() => set("coverImage", undefined)}
                              className="h-8 px-3.5 rounded-xl bg-red-500 text-white text-[11.5px] font-semibold flex items-center gap-1.5 hover:bg-red-600 transition-colors"
                            >
                              <Trash2 strokeWidth={2} className="h-3.5 w-3.5" />
                              Hapus
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-24 rounded-2xl border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-2 hover:border-orange-400 hover:bg-orange-50/40 transition-all group"
                    >
                      <ImagePlus strokeWidth={1.5} className="h-5 w-5 text-gray-300 group-hover:text-orange-400 transition-colors" />
                      <span className="text-[11.5px] text-gray-400 group-hover:text-orange-500 transition-colors">Klik untuk unggah foto cover</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>

                {/* Divider label */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                  <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-1">Informasi Paket</span>
                  <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                </div>

                {/* Row 1: Nama + Tanggal Berangkat */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className={lbl}>Nama Paket <span className="text-red-400 normal-case font-bold">*</span></p>
                    <Input
                      placeholder="Umrah Ramadhan"
                      value={draft.name}
                      onChange={(e) => { set("name", e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
                      className={inp + (errors.name ? " border-red-400" : "")}
                      autoFocus
                    />
                    {errors.name && <p className="text-[10px] text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <p className={lbl}>Tgl. Berangkat <span className="text-red-400 normal-case font-bold">*</span></p>
                    <Input
                      type="date"
                      value={draft.departureDate ?? ""}
                      onChange={(e) => { set("departureDate", e.target.value); setErrors(p => ({ ...p, departureDate: undefined })); }}
                      className={inp + (errors.departureDate ? " border-red-400" : "")}
                    />
                    {errors.departureDate && <p className="text-[10px] text-red-500">{errors.departureDate}</p>}
                  </div>
                </div>

                {/* Row 2: Destinasi + Durasi */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className={lbl}>Destinasi <span className="text-red-400 normal-case font-bold">*</span></p>
                    <Input
                      placeholder="Makkah, Madinah"
                      value={draft.destination}
                      onChange={(e) => { set("destination", e.target.value); setErrors(p => ({ ...p, destination: undefined })); }}
                      className={inp + (errors.destination ? " border-red-400" : "")}
                    />
                    {errors.destination && <p className="text-[10px] text-red-500">{errors.destination}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <p className={lbl}>Durasi (Hari) <span className="text-red-400 normal-case font-bold">*</span></p>
                    <Input
                      type="number"
                      min={1}
                      value={draft.days}
                      onChange={(e) => { set("days", Math.max(1, Number(e.target.value))); setErrors(p => ({ ...p, days: undefined })); }}
                      className={inp + (errors.days ? " border-red-400" : "")}
                    />
                    {errors.days && <p className="text-[10px] text-red-500">{errors.days}</p>}
                  </div>
                </div>

                {/* Row 3: Status + Kuota */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className={lbl}>Status</p>
                    <Select value={draft.status} onValueChange={(v) => set("status", v as PackageStatus)}>
                      <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className={lbl}>Kuota (Pax) <span className="text-red-400 normal-case font-bold">*</span></p>
                    <Input
                      type="number"
                      min={1}
                      value={draft.people}
                      onChange={(e) => { set("people", Math.max(1, Number(e.target.value))); setErrors(p => ({ ...p, people: undefined })); }}
                      className={inp + (errors.people ? " border-red-400" : "")}
                    />
                    {errors.people && <p className="text-[10px] text-red-500">{errors.people}</p>}
                  </div>
                </div>

                {/* Row 4: Hotel + Maskapai */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className={lbl}>Level Hotel <span className="text-red-400 normal-case font-bold">*</span></p>
                    <Select
                      value={draft.hotelLevel ?? ""}
                      onValueChange={(v) => { set("hotelLevel", v as HotelLevel); setErrors(p => ({ ...p, hotelLevel: undefined })); }}
                    >
                      <SelectTrigger className={sel + (errors.hotelLevel ? " border-red-400" : "")}>
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOTEL_LEVELS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.hotelLevel && <p className="text-[10px] text-red-500">{errors.hotelLevel}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <p className={lbl}>Maskapai <span className="text-red-400 normal-case font-bold">*</span></p>
                    <Select
                      value={draft.airline ?? ""}
                      onValueChange={(v) => { set("airline", v); setErrors(p => ({ ...p, airline: undefined })); }}
                    >
                      <SelectTrigger className={sel + (errors.airline ? " border-red-400" : "")}>
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent>
                        {AIRLINES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.airline && <p className="text-[10px] text-red-500">{errors.airline}</p>}
                  </div>
                </div>

                {/* Divider label */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                  <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-1">Fasilitas & Catatan</span>
                  <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                </div>

                {/* Fasilitas */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <NotebookPen strokeWidth={1.8} className="h-3.5 w-3.5 text-orange-500" />
                    <p className={lbl}>Fasilitas yang Tersedia</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FACILITIES_LIST.map((fac) => {
                      const active = (draft.facilities ?? []).includes(fac);
                      return (
                        <button
                          key={fac}
                          type="button"
                          onClick={() => toggleFacility(fac)}
                          className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all ${
                            active
                              ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                              : "bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600"
                          }`}
                        >
                          {fac}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Catatan */}
                <div className="space-y-1.5">
                  <p className={lbl}>Catatan Tambahan</p>
                  <textarea
                    value={draft.notes ?? ""}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={2}
                    placeholder="Catatan khusus untuk paket ini..."
                    className="w-full text-[13px] rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 py-2.5 placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all resize-none"
                  />
                </div>

              </div>

              {/* ── Footer ── */}
              <div className="px-5 py-3.5 border-t border-[hsl(var(--border))] flex gap-2.5 shrink-0 bg-white pb-[max(14px,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl text-[13px] font-semibold bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:bg-gray-200 disabled:text-gray-400 shadow-sm"
                  style={canSave && !saving ? { background: "linear-gradient(135deg,#f97316,#ea580c)" } : undefined}
                >
                  {saving ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check strokeWidth={2.5} className="h-4 w-4" />
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
