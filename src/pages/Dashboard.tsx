import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Plus, MapPin, Calendar as CalendarIcon, Trash2, Plane, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useTripsStore, type Trip } from "@/store/tripsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMOJIS = ["🕌", "🌴", "🗼", "🏝️", "🏔️", "🌸", "🌍", "✈️", "🛕", "🏖️", "🌺", "🎑"];

const GRADIENTS = [
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
  const [from, to] = cardGradient(trip.id);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 border border-[hsl(var(--border))] bg-white"
      onClick={() => navigate(`/trips/${trip.id}`)}
    >
      {/* Gradient image area */}
      <div
        className="relative h-40 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <span className="text-7xl drop-shadow-lg select-none">{trip.emoji}</span>
        {/* Duration badge */}
        <span className="absolute bottom-3 left-3 text-[11px] font-semibold bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full">
          {nightCount(trip.startDate, trip.endDate)}
        </span>
        {/* Delete */}
        <button
          className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          onClick={(e) => { e.stopPropagation(); onDelete(trip); }}
        >
          <Trash2 className="h-3.5 w-3.5 text-white" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="font-semibold text-[13.5px] text-[hsl(var(--foreground))] line-clamp-1">{trip.name}</h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          <MapPin className="h-3 w-3 shrink-0 text-[hsl(var(--primary))]" />
          <span className="line-clamp-1">{trip.destination}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
          <CalendarIcon className="h-3 w-3 shrink-0" />
          <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
        </div>
      </div>
    </div>
  );
}

// ── RIGHT PANEL ────────────────────────────────────────────────────────────────
function RightPanel({ trips }: { trips: Trip[] }) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Sort upcoming trips by start date
  const upcoming = [...trips]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

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
                    {/* Color dot */}
                    <div className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center text-2xl overflow-hidden"
                      style={{ background: `${from}22` }}>
                      <span className="text-xl">{trip.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-[hsl(var(--foreground))] truncate">{trip.name}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                        <CalendarIcon className="h-3 w-3 shrink-0" />
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
              { icon: "✈️", label: "Pesawat" },
              { icon: "🚌", label: "Bus" },
              { icon: "🚢", label: "Kapal" },
              { icon: "🚆", label: "Kereta" },
            ].map((t) => (
              <button key={t.label}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-smooth group">
                <span className="text-xl">{t.icon}</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeTrip(deleteTarget.id);
    toast.success(`Paket "${deleteTarget.name}" dihapus.`);
    setDeleteTarget(null);
  };

  return (
    <div className="flex h-full min-h-0">
      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto p-6 lg:p-8 min-w-0">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">Temukan Paket Trip</h1>
            <div className="flex gap-4 mt-2">
              {[["all", "Semua"], ["upcoming", "Aktif"], ["done", "Selesai"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key as typeof tab)}
                  className={cn(
                    "text-[13px] font-medium pb-1 border-b-2 transition-smooth",
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
          <Button
            onClick={() => setAddOpen(true)}
            className="gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl h-10 px-5 text-sm font-semibold shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" /> Tambah Paket Trip
          </Button>
        </div>

        {/* Cards grid */}
        {loadingTrips ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden animate-pulse">
                <div className="h-40 bg-[hsl(var(--secondary))]" />
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
            <div className="h-20 w-20 rounded-3xl gradient-primary shadow-glow flex items-center justify-center mb-5">
              <Plane className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Belum ada paket trip</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-xs">
              Klik "Tambah Paket Trip" untuk membuat paket perjalanan pertama.
            </p>
            <Button onClick={() => setAddOpen(true)}
              className="mt-6 gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Buat Paket Pertama
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((trip) => (
              <TripCard key={trip.id} trip={trip} onDelete={setDeleteTarget} />
            ))}
            {/* Add card */}
            <button onClick={() => setAddOpen(true)}
              className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-3 min-h-[220px] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-all group">
              <div className="h-11 w-11 rounded-xl border-2 border-dashed border-[hsl(var(--border))] group-hover:border-[hsl(var(--primary))] flex items-center justify-center transition-colors">
                <Plus className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]" />
              </div>
              <span className="text-sm text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] font-medium">Tambah Paket</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <RightPanel trips={trips} />

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
