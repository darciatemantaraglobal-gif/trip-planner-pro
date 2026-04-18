import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, MapPin, Calendar, Users, Trash2, Plane } from "lucide-react";
import { useTripsStore, type Trip } from "@/store/tripsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMOJIS = ["🕌", "🌴", "🗼", "🏝️", "🏔️", "🌸", "🌍", "✈️", "🛕", "🏖️", "🌺", "🎑"];

const GRADIENTS = [
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-fuchsia-400 to-pink-500",
  "from-cyan-400 to-sky-500",
  "from-lime-400 to-green-500",
];

function cardGradient(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return GRADIENTS[hash % GRADIENTS.length];
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function nightCount(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const days = Math.round(diff / 86400000);
  return days > 0 ? `${days} hari` : "—";
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
      <DialogContent className="content-light max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--card-foreground))]">Tambah Paket Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Emoji picker */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[hsl(var(--muted-foreground))]">Ikon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                  className={cn(
                    "h-9 w-9 rounded-xl text-xl flex items-center justify-center border-2 transition-all",
                    form.emoji === e
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]"
                      : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))/50]"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-name" className="text-xs text-[hsl(var(--muted-foreground))]">Nama Paket</Label>
            <Input id="t-name" placeholder="cth: Umrah Ramadhan 2025" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-dest" className="text-xs text-[hsl(var(--muted-foreground))]">Destinasi</Label>
            <Input id="t-dest" placeholder="cth: Mecca, Saudi Arabia" value={form.destination}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-start" className="text-xs text-[hsl(var(--muted-foreground))]">Tanggal Berangkat</Label>
              <Input id="t-start" type="date" value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-end" className="text-xs text-[hsl(var(--muted-foreground))]">Tanggal Pulang</Label>
              <Input id="t-end" type="date" value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
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
  const grad = cardGradient(trip.id);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden border border-[hsl(var(--border))] bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/trips/${trip.id}`)}
      data-testid={`card-trip-${trip.id}`}
    >
      {/* Header gradient */}
      <div className={`relative h-36 bg-gradient-to-br ${grad} flex items-center justify-center`}>
        <span className="text-6xl drop-shadow-md select-none">{trip.emoji}</span>
        {/* Delete button */}
        <button
          className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/20 backdrop-blur hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
          onClick={(e) => { e.stopPropagation(); onDelete(trip); }}
          data-testid={`btn-delete-trip-${trip.id}`}
        >
          <Trash2 className="h-3.5 w-3.5 text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm text-[hsl(var(--card-foreground))] line-clamp-1">{trip.name}</h3>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{trip.destination}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border))]">
          <span className="text-xs font-medium text-[hsl(var(--primary))]">
            {nightCount(trip.startDate, trip.endDate)}
          </span>
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
            <Plane className="h-3 w-3" />
            <span>Lihat Detail →</span>
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

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeTrip(deleteTarget.id);
    toast.success(`Paket "${deleteTarget.name}" dihapus.`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--card-foreground))]">
            Paket Trip
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Kelola paket perjalanan dan data jamaah.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl h-10 px-5 text-sm font-semibold"
          data-testid="btn-add-trip"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Paket Trip
        </Button>
      </div>

      {/* Grid */}
      {loadingTrips ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden animate-pulse">
              <div className="h-36 bg-[hsl(var(--secondary))]" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-[hsl(var(--secondary))] rounded w-3/4" />
                <div className="h-3 bg-[hsl(var(--secondary))] rounded w-1/2" />
                <div className="h-3 bg-[hsl(var(--secondary))] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-3xl gradient-primary shadow-glow flex items-center justify-center mb-5">
            <Plane className="h-9 w-9 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-[hsl(var(--card-foreground))]">Belum ada paket trip</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-xs">
            Klik "Tambah Paket Trip" untuk mulai membuat paket perjalanan pertama.
          </p>
          <Button
            onClick={() => setAddOpen(true)}
            className="mt-6 gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" /> Buat Paket Pertama
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDelete={setDeleteTarget} />
          ))}
          {/* Add card */}
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-3 py-14 hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-all group"
            data-testid="btn-add-trip-card"
          >
            <div className="h-10 w-10 rounded-xl border-2 border-dashed border-[hsl(var(--border))] group-hover:border-[hsl(var(--primary))] flex items-center justify-center transition-colors">
              <Plus className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]" />
            </div>
            <span className="text-sm text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] font-medium">
              Tambah Paket
            </span>
          </button>
        </div>
      )}

      <AddTripDialog open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Confirm delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="content-light">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Paket Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Paket <strong>"{deleteTarget?.name}"</strong> dan seluruh data jamaah di dalamnya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
