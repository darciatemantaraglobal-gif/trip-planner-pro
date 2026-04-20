import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Plus, MapPin, Calendar as CalendarIcon, Trash2, Plane, Camera, Calculator, Users, CheckCircle, TrendingUp, ArrowRight, FileBarChart, Bus, Ship, Train } from "lucide-react";
import { useTripsStore, type Trip } from "@/store/tripsStore";
import { useRatesStore } from "@/store/ratesStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, type Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] },
  }),
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

function getTotalJamaah(): number {
  try {
    const raw = localStorage.getItem("travelhub.jamaah.v1");
    return raw ? (JSON.parse(raw) as unknown[]).length : 0;
  } catch {
    return 0;
  }
}

const EMOJIS = ["🕌", "🌴", "🗼", "🏝️", "🏔️", "🌸", "🌍", "✈️", "🛕", "🏖️", "🌺", "🎑"];

const GRADIENTS: [string, string][] = [
  ["#7C5FF5", "#9B84F7"],
  ["#3B82F6", "#60A5FA"],
  ["#10B981", "#34D399"],
  ["#F59E0B", "#FBBF24"],
  ["#EF4444", "#F87171"],
  ["#8B5CF6", "#A78BFA"],
  ["#06B6D4", "#22D3EE"],
  ["#EC4899", "#F472B6"],
];

function cardGradient(id: string): [string, string] {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return GRADIENTS[hash % GRADIENTS.length];
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatShortDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function nightCount(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const d = Math.round(diff / 86400000);
  return d > 0 ? `${d} hari` : "—";
}

function daysUntil(iso: string) {
  const diff = new Date(iso + "T00:00:00").getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  if (d < 0) return "Selesai";
  if (d === 0) return "Hari ini";
  return `${d} hari lagi`;
}

// ── ADD TRIP DIALOG ────────────────────────────────────────────────────────────
function AddTripDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addTrip = useTripsStore((s) => s.addTrip);
  const [form, setForm] = useState({ name: "", destination: "", startDate: "", endDate: "", emoji: "🕌" });
  const [loading, setLoading] = useState(false);

  const reset = () => setForm({ name: "", destination: "", startDate: "", endDate: "", emoji: "🕌" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.destination || !form.startDate || !form.endDate) {
      toast.error("Harap lengkapi semua field.");
      return;
    }
    setLoading(true);
    await addTrip(form);
    toast.success(`Paket "${form.name}" berhasil ditambahkan.`);
    setLoading(false);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md" style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
        <DialogHeader>
          <DialogTitle>Tambah Paket Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-[hsl(var(--muted-foreground))]">Ikon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                  className={cn(
                    "h-9 w-9 rounded-xl text-xl flex items-center justify-center border-2 transition-all",
                    form.emoji === e ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]" : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))/50]"
                  )}>{e}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[hsl(var(--muted-foreground))]">Nama Paket</Label>
            <Input placeholder="cth: Umrah Ramadhan 2025" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[hsl(var(--muted-foreground))]">Destinasi</Label>
            <Input placeholder="cth: Mecca, Saudi Arabia" value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">Tanggal Berangkat</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">Tanggal Pulang</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Batal</Button>
            <Button type="submit" disabled={loading} className="gradient-primary text-white shadow-glow hover:opacity-90">
              {loading ? "Menyimpan…" : "Simpan Paket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── TRIP CARD ──────────────────────────────────────────────────────────────────
function TripCard({ trip, onDelete }: { trip: Trip; onDelete: (t: Trip) => void }) {
  const navigate = useNavigate();
  const patchTrip = useTripsStore((s) => s.patchTrip);
  const [from, to] = cardGradient(trip.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await patchTrip(trip.id, { coverImage: reader.result as string });
      toast.success("Foto cover berhasil diperbarui.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <motion.div
      className="group relative rounded-xl md:rounded-2xl overflow-hidden cursor-pointer border border-[hsl(var(--border))] bg-white"
      onClick={() => navigate(`/trips/${trip.id}`)}
      variants={fadeUp}
      whileHover={{ y: -3, boxShadow: "0 10px 28px -6px hsl(27 91% 54% / 0.14)" }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Cover area */}
      <div
        className="relative h-28 sm:h-36 md:h-40 flex items-center justify-center overflow-hidden"
        style={trip.coverImage ? {} : { background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {trip.coverImage ? (
          <img
            src={trip.coverImage}
            alt={trip.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl md:text-7xl drop-shadow-lg select-none">{trip.emoji}</span>
        )}

        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

        {/* Duration badge */}
        <span className="absolute bottom-2 left-2 md:bottom-3 md:left-3 text-[10px] md:text-[11px] font-semibold bg-white/20 backdrop-blur-sm text-white px-2 md:px-2.5 py-0.5 md:py-1 rounded-full z-10">
          {nightCount(trip.startDate, trip.endDate)}
        </span>

        {/* Change photo button */}
        <button
          className="absolute bottom-2 right-2 md:bottom-3 md:right-3 h-6 w-6 md:h-7 md:w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/50 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          title="Ganti foto"
        >
          <Camera strokeWidth={1.5} className="h-3.5 w-3.5 text-white" />
        </button>

        {/* Delete */}
        <button
          className="absolute top-2 right-2 md:top-3 md:right-3 h-6 w-6 md:h-7 md:w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-red-500 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10"
          onClick={(e) => { e.stopPropagation(); onDelete(trip); }}
          title="Hapus paket"
        >
          <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5 text-white" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* Info */}
      <div className="p-2.5 md:p-3.5">
        <h3 className="font-semibold text-[13px] md:text-[13.5px] text-[hsl(var(--foreground))] line-clamp-1">{trip.name}</h3>
        <div className="flex items-center gap-1 mt-0.5 md:mt-1 text-[11px] md:text-xs text-[hsl(var(--muted-foreground))]">
          <MapPin strokeWidth={1.5} className="h-3 w-3 shrink-0 text-[hsl(var(--primary))]" />
          <span className="line-clamp-1">{trip.destination}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[11px] md:text-xs text-[hsl(var(--muted-foreground))]">
          <CalendarIcon strokeWidth={1.5} className="h-3 w-3 shrink-0" />
          <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── RIGHT PANEL ────────────────────────────────────────────────────────────────
function RightPanel({ trips }: { trips: Trip[] }) {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const rates = useRatesStore((s) => s.rates);

  const upcoming = [...trips]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

  const active = trips.filter((t) => new Date(t.endDate).getTime() >= Date.now()).length;
  const done = trips.length - active;
  const totalJamaah = getTotalJamaah();

  return (
    <div className="w-72 xl:w-80 shrink-0 border-l border-[hsl(var(--border))] flex flex-col overflow-auto">
      <div className="p-5 space-y-5">
        {/* Mini calendar */}
        <div>
          <h3 className="text-[13px] font-semibold text-[hsl(var(--foreground))] mb-3">Kalender</h3>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-2 overflow-hidden">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="w-full"
              classNames={{
                months: "w-full",
                month: "w-full space-y-2",
                caption: "flex justify-center items-center gap-2 px-1 pt-1",
                caption_label: "text-[13px] font-semibold text-[hsl(var(--foreground))]",
                nav: "flex items-center gap-1",
                nav_button: cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center",
                  "bg-white border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
                  "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--primary))] transition-smooth"
                ),
                nav_button_previous: "",
                nav_button_next: "",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell: "text-[hsl(var(--muted-foreground))] text-[11px] font-medium flex-1 text-center py-1",
                row: "flex w-full mt-1",
                cell: "flex-1 text-center text-[12px] relative p-0",
                day: cn(
                  "h-7 w-7 mx-auto rounded-lg font-medium text-[12px]",
                  "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--primary))]",
                  "transition-smooth"
                ),
                day_selected: "!bg-[hsl(var(--primary))] !text-white !rounded-lg hover:!bg-[hsl(var(--primary))]",
                day_today: "font-bold text-[hsl(var(--primary))] underline decoration-[hsl(var(--primary))]",
                day_outside: "text-[hsl(var(--muted-foreground))] opacity-40",
                day_disabled: "text-[hsl(var(--muted-foreground))] opacity-30",
              }}
            />
          </div>
        </div>

        {/* Upcoming trips */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--foreground))]">Jadwal Terdekat</h3>
            <button className="text-[11px] text-[hsl(var(--primary))] font-medium hover:underline">Lihat semua</button>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-xs text-[hsl(var(--muted-foreground))]">
              Belum ada jadwal trip.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((trip) => {
                const [from] = cardGradient(trip.id);
                const countDown = daysUntil(trip.startDate);
                const isPast = countDown === "Selesai";
                return (
                  <div key={trip.id} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-2.5">
                    <div className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center text-2xl overflow-hidden"
                      style={{ background: `${from}22` }}>
                      {trip.coverImage ? (
                        <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span className="text-xl">{trip.emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-[hsl(var(--foreground))] truncate">{trip.name}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                        <CalendarIcon strokeWidth={1.5} className="h-3 w-3 shrink-0" />
                        <span>{formatShortDate(trip.startDate)} – {formatShortDate(trip.endDate)}</span>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 whitespace-nowrap",
                      isPast ? "bg-gray-100 text-gray-500" : "bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"
                    )}>
                      {countDown}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transportation quick access */}
        <div>
          <h3 className="text-[13px] font-semibold text-[hsl(var(--foreground))] mb-3">Transportasi</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Plane, label: "Pesawat" },
              { icon: Bus, label: "Bus" },
              { icon: Ship, label: "Kapal" },
              { icon: Train, label: "Kereta" },
            ].map((t) => (
              <button key={t.label}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-smooth group">
                <t.icon strokeWidth={1.5} className="h-5 w-5" />
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Laporan ringkasan */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--foreground))]">Laporan</h3>
            <button
              onClick={() => navigate("/progress")}
              className="text-[11px] text-[hsl(var(--primary))] font-medium hover:underline"
            >
              Lihat detail
            </button>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3.5 space-y-3">
            {[
              { icon: Plane, label: "Total Paket Trip", value: trips.length },
              { icon: CheckCircle, label: "Trip Selesai", value: done },
              { icon: TrendingUp, label: "Trip Aktif", value: active },
              { icon: Users, label: "Total Jamaah", value: totalJamaah },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="h-8 w-8 flex items-center justify-center shrink-0">
                  <item.icon strokeWidth={1.5} className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">{item.label}</p>
                </div>
                <span className="text-[14px] font-bold text-[hsl(var(--foreground))]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Kalkulator cepat */}
        <div>
          <h3 className="text-[13px] font-semibold text-[hsl(var(--foreground))] mb-3">Kalkulator</h3>
          <div
            onClick={() => navigate("/calculator")}
            className="rounded-2xl border border-[hsl(var(--border))] bg-white p-3.5 cursor-pointer hover:border-[hsl(var(--primary))] hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 flex items-center justify-center shrink-0">
                <Calculator strokeWidth={1.5} className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">Kalkulator Paket</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Hitung biaya trip + PDF</p>
              </div>
              <ArrowRight strokeWidth={1.5} className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" />
            </div>
            {/* Rate preview */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { currency: "USD", rate: rates.USD },
                { currency: "SAR", rate: rates.SAR },
              ].map((r) => (
                <div key={r.currency} className="rounded-xl bg-[hsl(var(--secondary))] px-2.5 py-2 text-center">
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{r.currency} → IDR</p>
                  <p className="text-[12px] font-bold text-[hsl(var(--foreground))]">
                    {r.rate.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Laporan lengkap cta */}
        <button
          onClick={() => navigate("/progress")}
          className="w-full flex items-center gap-2.5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3 hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-all group"
        >
          <FileBarChart strokeWidth={1.5} className="h-4.5 w-4.5 text-[hsl(var(--primary))]" />
          <span className="text-[13px] font-medium text-[hsl(var(--foreground))] flex-1 text-left">Lihat Laporan Lengkap</span>
          <ArrowRight strokeWidth={1.5} className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" />
        </button>
      </div>
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { trips, loadingTrips, fetchTrips, removeTrip } = useTripsStore();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null);
  const [tab, setTab] = useState<"all" | "upcoming" | "done">("all");

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const filtered = trips.filter((t) => {
    if (tab === "all") return true;
    const past = new Date(t.endDate).getTime() < Date.now();
    return tab === "done" ? past : !past;
  });

  const activeTrips = trips.filter((t) => new Date(t.endDate).getTime() >= Date.now()).length;
  const doneTrips = trips.length - activeTrips;
  const totalJamaah = getTotalJamaah();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeTrip(deleteTarget.id);
    toast.success(`Paket "${deleteTarget.name}" dihapus.`);
    setDeleteTarget(null);
  };

  return (
    <div className="flex h-full min-h-0">
      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto min-w-0 p-3 md:p-6 lg:p-8">

        {/* ── Stat cards ── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3.5 md:gap-2.5 md:mb-5"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {[
            { icon: Plane, label: "Total Paket", value: trips.length, onClick: () => {} },
            { icon: TrendingUp, label: "Trip Aktif", value: activeTrips, onClick: () => setTab("upcoming") },
            { icon: CheckCircle, label: "Selesai", value: doneTrips, onClick: () => setTab("done") },
            { icon: Users, label: "Total Jamaah", value: totalJamaah, onClick: () => {} },
          ].map((stat) => (
            <motion.button
              key={stat.label}
              onClick={stat.onClick}
              className="flex items-center gap-2 md:gap-3 rounded-xl md:rounded-2xl border border-[hsl(var(--border))] bg-white p-2.5 md:p-3.5 hover:shadow-sm hover:border-[hsl(var(--primary))]/40 transition-[border-color,box-shadow] duration-200 text-left active:scale-[0.98]"
              variants={fadeUp}
            >
              <div className="h-7 w-7 md:h-9 md:w-9 flex items-center justify-center shrink-0">
                <stat.icon strokeWidth={1.5} className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[16px] md:text-[20px] font-bold text-[hsl(var(--foreground))] leading-none">{stat.value}</p>
                <p className="text-[10px] md:text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">{stat.label}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Kalkulator & Laporan shortcut bar ── */}
        <motion.div
          className="grid grid-cols-2 gap-2 mb-3.5 md:gap-2.5 md:mb-5"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
        >
          <button
            onClick={() => navigate("/calculator")}
            className="flex items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl border border-[hsl(var(--border))] bg-white px-2.5 md:px-3 py-2 md:py-2.5 hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-[border-color,background-color] duration-200 group active:scale-[0.98]"
          >
            <Calculator strokeWidth={1.5} className="h-4 w-4 text-[hsl(var(--primary))] shrink-0" />
            <span className="text-[12px] md:text-[13px] font-medium text-[hsl(var(--foreground))] truncate">Buka Kalkulator</span>
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors ml-auto shrink-0" />
          </button>
          <button
            onClick={() => navigate("/progress")}
            className="flex items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl border border-[hsl(var(--border))] bg-white px-2.5 md:px-3 py-2 md:py-2.5 hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-[border-color,background-color] duration-200 group active:scale-[0.98]"
          >
            <FileBarChart strokeWidth={1.5} className="h-4 w-4 text-[hsl(var(--primary))] shrink-0" />
            <span className="text-[12px] md:text-[13px] font-medium text-[hsl(var(--foreground))] truncate">Laporan Progress</span>
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors ml-auto shrink-0" />
          </button>
        </motion.div>

        {/* Section header */}
        <div className="flex items-center justify-between gap-2.5 mb-3 md:gap-3 md:mb-4">
          <div>
            <h1 className="text-base md:text-xl font-bold text-[hsl(var(--foreground))]">Paket Trip</h1>
              <div className="flex gap-2.5 md:gap-3 mt-1">
              {[["all", "Semua"], ["upcoming", "Aktif"], ["done", "Selesai"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key as typeof tab)}
                  className={cn(
                    "text-[12px] md:text-[13px] font-medium pb-1 border-b-2 transition-smooth",
                    tab === key
                      ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                      : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards grid */}
        {loadingTrips ? (
          <div className="grid gap-2.5 md:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden animate-pulse">
                <div className="h-36 bg-[hsl(var(--secondary))]" />
                <div className="p-3.5 space-y-2">
                  <div className="h-3.5 bg-[hsl(var(--secondary))] rounded w-3/4" />
                  <div className="h-3 bg-[hsl(var(--secondary))] rounded w-1/2" />
                  <div className="h-3 bg-[hsl(var(--secondary))] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 flex items-center justify-center mb-5">
              <Plane strokeWidth={1.5} className="h-9 w-9" />
            </div>
            <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Belum ada paket trip</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-xs">
              Buat paket perjalanan pertama kamu di halaman Paket Trip.
            </p>
            <Button onClick={() => navigate("/packages")}
              className="btn-glow mt-6 rounded-xl px-6 h-10">
              <Plus strokeWidth={1.5} className="h-4 w-4 mr-2" /> Buat Paket Pertama
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((trip) => (
              <TripCard key={trip.id} trip={trip} onDelete={setDeleteTarget} />
            ))}
            {/* Add card */}
            <button onClick={() => setAddOpen(true)}
              className="rounded-xl md:rounded-2xl border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-2 md:gap-3 min-h-[120px] sm:min-h-[220px] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-all group">
              <div className="h-9 w-9 md:h-11 md:w-11 flex items-center justify-center transition-colors">
                <Plus strokeWidth={1.5} className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]" />
              </div>
              <span className="text-xs md:text-sm text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] font-medium">Tambah Paket</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Right panel (desktop only) ── */}
      <div className="hidden xl:block">
        <RightPanel trips={trips} />
      </div>

      <AddTripDialog open={addOpen} onClose={() => setAddOpen(false)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Paket Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Paket <strong>"{deleteTarget?.name}"</strong> dan semua data jamaah di dalamnya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
