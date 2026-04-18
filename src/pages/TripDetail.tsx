import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, User, Phone, CalendarDays, CreditCard, Trash2, Users } from "lucide-react";
import { useTripsStore, useJamaahStore, type Jamaah } from "@/store/tripsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ── ADD JAMAAH DIALOG ──────────────────────────────────────────────────────────
function AddJamaahDialog({ open, tripId, onClose }: { open: boolean; tripId: string; onClose: () => void }) {
  const addJamaah = useJamaahStore((s) => s.addJamaah);
  const [form, setForm] = useState({ name: "", phone: "", birthDate: "", passportNumber: "", gender: "" as "L" | "P" | "" });
  const [loading, setLoading] = useState(false);

  const reset = () => setForm({ name: "", phone: "", birthDate: "", passportNumber: "", gender: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Nama jamaah wajib diisi."); return; }
    setLoading(true);
    await addJamaah({ ...form, tripId, photoDataUrl: undefined });
    toast.success(`Jamaah "${form.name}" ditambahkan.`);
    setLoading(false);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md" style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--card-foreground))]">Tambah Jamaah</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-[hsl(var(--muted-foreground))]">Nama Lengkap *</Label>
            <Input placeholder="Nama sesuai paspor" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">Jenis Kelamin</Label>
              <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v as "L" | "P" }))}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">No. HP</Label>
              <Input placeholder="08xx-xxxx-xxxx" value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">Tanggal Lahir</Label>
              <Input type="date" value={form.birthDate}
                onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-foreground))]">No. Paspor</Label>
              <Input placeholder="A1234567" value={form.passportNumber}
                onChange={(e) => setForm((f) => ({ ...f, passportNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Batal</Button>
            <Button type="submit" disabled={loading} className="gradient-primary text-white shadow-glow hover:opacity-90">
              {loading ? "Menyimpan…" : "Tambah Jamaah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── JAMAAH CARD ────────────────────────────────────────────────────────────────
function JamaahCard({ jamaah, tripId, onDelete }: { jamaah: Jamaah; tripId: string; onDelete: (j: Jamaah) => void }) {
  const navigate = useNavigate();

  return (
    <div
      className="group relative rounded-2xl border border-[hsl(var(--border))] bg-white p-4 flex gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/trips/${tripId}/jamaah/${jamaah.id}`)}
      data-testid={`card-jamaah-${jamaah.id}`}
    >
      {/* Avatar */}
      <div className={cn(
        "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 text-white font-bold text-xl",
        jamaah.gender === "P" ? "bg-gradient-to-br from-pink-400 to-rose-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"
      )}>
        {jamaah.photoDataUrl ? (
          <img src={jamaah.photoDataUrl} alt={jamaah.name} className="h-full w-full rounded-2xl object-cover" />
        ) : (
          <span>{jamaah.name.charAt(0).toUpperCase()}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-[hsl(var(--card-foreground))] truncate">{jamaah.name}</h4>
        {jamaah.passportNumber && (
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            <CreditCard className="h-3 w-3" />
            <span>{jamaah.passportNumber}</span>
          </div>
        )}
        {jamaah.phone && (
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            <Phone className="h-3 w-3" />
            <span>{jamaah.phone}</span>
          </div>
        )}
        {jamaah.birthDate && (
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            <CalendarDays className="h-3 w-3" />
            <span>{formatDate(jamaah.birthDate)}</span>
          </div>
        )}
      </div>

      {/* Gender badge */}
      {jamaah.gender && (
        <span className={cn(
          "absolute top-3 right-10 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
          jamaah.gender === "P" ? "bg-pink-50 text-pink-500" : "bg-blue-50 text-blue-500"
        )}>
          {jamaah.gender === "P" ? "Perempuan" : "Laki-laki"}
        </span>
      )}

      {/* Delete */}
      <button
        className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[hsl(var(--muted-foreground))] transition-all"
        onClick={(e) => { e.stopPropagation(); onDelete(jamaah); }}
        data-testid={`btn-delete-jamaah-${jamaah.id}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── TRIP DETAIL PAGE ───────────────────────────────────────────────────────────
export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trips = useTripsStore((s) => s.trips);
  const { jamaah, loadingJamaah, fetchJamaah, removeJamaah } = useJamaahStore();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Jamaah | null>(null);

  const trip = trips.find((t) => t.id === id);

  useEffect(() => {
    if (id) fetchJamaah(id);
  }, [id, fetchJamaah]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeJamaah(deleteTarget.id);
    toast.success(`Jamaah "${deleteTarget.name}" dihapus.`);
    setDeleteTarget(null);
  };

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">Paket tidak ditemukan.</p>
        <Button variant="outline" onClick={() => navigate("/")} className="mt-4">← Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}
          className="rounded-xl h-9 w-9 shrink-0 hover:bg-[hsl(var(--secondary))]">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{trip.emoji}</span>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--card-foreground))] truncate">{trip.name}</h1>
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
            <span>📍 {trip.destination}</span>
            <span>📅 {formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
            <span>👥 {jamaah.length} jamaah</span>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}
          className="gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl h-9 px-4 text-sm shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Jamaah
        </Button>
      </div>

      {/* Jamaah grid */}
      {loadingJamaah ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-[hsl(var(--border))] p-4 flex gap-3 animate-pulse">
              <div className="h-14 w-14 rounded-2xl bg-[hsl(var(--secondary))] shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-[hsl(var(--secondary))] rounded w-2/3" />
                <div className="h-3 bg-[hsl(var(--secondary))] rounded w-1/2" />
                <div className="h-3 bg-[hsl(var(--secondary))] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : jamaah.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-3xl bg-[hsl(var(--secondary))] flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
          </div>
          <h2 className="text-base font-semibold text-[hsl(var(--card-foreground))]">Belum ada jamaah</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Tambahkan jamaah untuk mulai mengelola pemberkasan.
          </p>
          <Button onClick={() => setAddOpen(true)}
            className="mt-5 gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Tambah Jamaah Pertama
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jamaah.map((j) => (
            <JamaahCard key={j.id} jamaah={j} tripId={id!} onDelete={setDeleteTarget} />
          ))}
          <button onClick={() => setAddOpen(true)}
            className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-2 py-10 hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-all group">
            <div className="h-9 w-9 rounded-xl border-2 border-dashed border-[hsl(var(--border))] group-hover:border-[hsl(var(--primary))] flex items-center justify-center transition-colors">
              <Plus className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]" />
            </div>
            <span className="text-sm text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] font-medium">Tambah Jamaah</span>
          </button>
        </div>
      )}

      {id && <AddJamaahDialog open={addOpen} tripId={id} onClose={() => setAddOpen(false)} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jamaah?</AlertDialogTitle>
            <AlertDialogDescription>
              Data jamaah <strong>"{deleteTarget?.name}"</strong> dan seluruh dokumennya akan dihapus permanen.
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
