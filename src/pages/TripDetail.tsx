import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Phone, CalendarDays, CreditCard, Trash2, Users, Camera, Upload, X, FileText, ImageIcon, MapPin, ScanLine } from "lucide-react";
import { useTripsStore, useJamaahStore, useDocsStore, type Jamaah, type DocCategory } from "@/store/tripsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { scanPassport } from "@/lib/ocrPassport";
import { useRegional } from "@/lib/regional";

const DOC_CATEGORIES: { value: DocCategory; label: string }[] = [
  { value: "passport", label: "Paspor / KTP" },
  { value: "visa", label: "Visa" },
  { value: "ticket", label: "Tiket Pesawat" },
  { value: "medical", label: "Dokumen Kesehatan" },
  { value: "other", label: "Lainnya" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

interface UploadedDoc {
  id: string;
  category: DocCategory;
  label: string;
  fileName: string;
  fileType: "image" | "pdf";
  dataUrl: string;
}


// ── ADD JAMAAH DIALOG ──────────────────────────────────────────────────────────
function AddJamaahDialog({ open, tripId, onClose }: { open: boolean; tripId: string; onClose: () => void }) {
  const addJamaah = useJamaahStore((s) => s.addJamaah);
  const addDocument = useDocsStore((s) => s.addDocument);

  const [form, setForm] = useState({ name: "", phone: "", birthDate: "", passportNumber: "", gender: "" as "L" | "P" | "" });
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<DocCategory>("passport");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const ocrRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setForm({ name: "", phone: "", birthDate: "", passportNumber: "", gender: "" });
    setPhotoDataUrl(undefined);
    setUploadedDocs([]);
    setPendingCategory("passport");
    setOcrLoading(false);
    setOcrProgress(0);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Foto maks. 2 MB."); return; }
    const dataUrl = await fileToBase64(file);
    setPhotoDataUrl(dataUrl);
    e.target.value = "";
  };

  const handleOcrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const result = await scanPassport(file, setOcrProgress);
      setForm((f) => ({
        ...f,
        name: result.name || f.name,
        birthDate: result.birthDate || f.birthDate,
        passportNumber: result.passportNumber || f.passportNumber,
        gender: result.gender || f.gender,
      }));
      const fieldsFound = Object.keys(result).length;
      if (fieldsFound > 0) toast.success(`OCR berhasil! ${fieldsFound} field terisi otomatis.`);
      else toast.warning("Teks MRZ tidak terbaca. Pastikan foto paspor jelas dan terbuka.");
    } catch {
      toast.error("Gagal memproses gambar paspor.");
    } finally {
      setOcrLoading(false);
      e.target.value = "";
    }
  };

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`File "${file.name}" maks. 5 MB.`); continue; }
      const dataUrl = await fileToBase64(file);
      const fileType: "image" | "pdf" = file.type === "application/pdf" ? "pdf" : "image";
      const label = file.name.replace(/\.[^.]+$/, "");
      setUploadedDocs((prev) => [...prev, {
        id: crypto.randomUUID(),
        category: pendingCategory,
        label,
        fileName: file.name,
        fileType,
        dataUrl,
      }]);
    }
    e.target.value = "";
  };

  const removeDoc = (id: string) => setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
  const changeDocCategory = (id: string, cat: DocCategory) =>
    setUploadedDocs((prev) => prev.map((d) => d.id === id ? { ...d, category: cat } : d));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Nama jamaah wajib diisi."); return; }
    setLoading(true);
    try {
      const j = await addJamaah({ ...form, tripId, photoDataUrl });
      for (const doc of uploadedDocs) {
        await addDocument({
          jamaahId: j.id,
          category: doc.category,
          label: doc.label,
          fileName: doc.fileName,
          fileType: doc.fileType,
          dataUrl: doc.dataUrl,
        });
      }
      toast.success(`Jamaah "${form.name}" ditambahkan${uploadedDocs.length ? ` dengan ${uploadedDocs.length} dokumen.` : "."}`);
      reset();
      onClose();
    } catch {
      toast.error("Gagal menyimpan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
        <DialogHeader>
          <DialogTitle>Tambah Jamaah</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* ── Photo upload ── */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group cursor-pointer" onClick={() => photoRef.current?.click()}>
              <div className={cn(
                "h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden text-white font-bold text-3xl",
                form.gender === "P" ? "bg-gradient-to-br from-pink-400 to-rose-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"
              )}>
                {photoDataUrl
                  ? <img src={photoDataUrl} className="h-full w-full object-cover" alt="foto" />
                  : <span>{form.name ? form.name.charAt(0).toUpperCase() : "?"}</span>
                }
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera strokeWidth={1.5} className="h-6 w-6 text-white" />
              </div>
              {photoDataUrl && (
                <button type="button"
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                  onClick={(e) => { e.stopPropagation(); setPhotoDataUrl(undefined); }}>
                  <X strokeWidth={1.5} className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Klik untuk upload foto (maks. 2 MB)</p>
            <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-orange-800">Scan paspor otomatis</p>
              <p className="text-xs text-orange-700/80">OCR akan isi nama, paspor, tanggal lahir, dan gender jika MRZ terbaca.</p>
            </div>
            <input ref={ocrRef} type="file" accept="image/*" className="hidden" onChange={handleOcrScan} />
            <Button type="button" variant="outline" className="shrink-0 gap-1.5 text-xs border-orange-200 text-orange-700" onClick={() => ocrRef.current?.click()} disabled={ocrLoading}>
              <ScanLine strokeWidth={1.5} className="h-3.5 w-3.5" />
              {ocrLoading ? (ocrProgress < 35 ? "Memuat AI…" : `OCR ${ocrProgress}%`) : "Scan OCR"}
            </Button>
          </div>

          {/* ── Basic info ── */}
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

          {/* ── Document upload ── */}
          <div className="space-y-3">
            <Label className="text-xs text-[hsl(var(--muted-foreground))]">Upload Dokumen (PNG / JPG)</Label>

            {/* Category picker + upload button */}
            <div className="flex gap-2">
              <Select value={pendingCategory} onValueChange={(v) => setPendingCategory(v as DocCategory)}>
                <SelectTrigger className="flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" className="shrink-0 gap-1.5 text-xs"
                onClick={() => docRef.current?.click()}>
                <Upload strokeWidth={1.5} className="h-3.5 w-3.5" /> Pilih File
              </Button>
              <input ref={docRef} type="file" accept="image/png,image/jpeg,image/jpg" multiple className="hidden"
                onChange={handleDocChange} />
            </div>

            {/* Uploaded docs list */}
            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-2">
                    {/* Thumbnail */}
                    <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-[hsl(var(--border))] bg-white flex items-center justify-center">
                      {doc.fileType === "image"
                        ? <img src={doc.dataUrl} className="h-full w-full object-cover" alt={doc.fileName} />
                        : <FileText strokeWidth={1.5} className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                      }
                    </div>
                    {/* Name + category changer */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-medium text-[hsl(var(--foreground))] truncate">{doc.fileName}</p>
                      <Select value={doc.category} onValueChange={(v) => changeDocCategory(doc.id, v as DocCategory)}>
                        <SelectTrigger className="h-6 text-[11px] border-0 bg-transparent p-0 shadow-none gap-1 w-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
                          {DOC_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Remove */}
                    <button type="button" onClick={() => removeDoc(doc.id)}
                      className="h-6 w-6 rounded-full hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-[hsl(var(--muted-foreground))] transition-colors shrink-0">
                      <X strokeWidth={1.5} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadedDocs.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-[hsl(var(--border))] p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                <ImageIcon strokeWidth={1.5} className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                Belum ada dokumen — pilih kategori lalu klik "Pilih File"
              </div>
            )}
          </div>

          <DialogFooter className="pt-1">
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
            <CreditCard strokeWidth={1.5} className="h-3 w-3" />
            <span>{jamaah.passportNumber}</span>
          </div>
        )}
        {jamaah.phone && (
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            <Phone strokeWidth={1.5} className="h-3 w-3" />
            <span>{jamaah.phone}</span>
          </div>
        )}
        {jamaah.birthDate && (
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            <CalendarDays strokeWidth={1.5} className="h-3 w-3" />
            <span>{jamaah.birthDate ? formatDate(jamaah.birthDate) : "—"}</span>
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
        <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── TRIP DETAIL PAGE ───────────────────────────────────────────────────────────
export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trips = useTripsStore((s) => s.trips);
  const { formatDate } = useRegional();
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
          <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{trip.emoji}</span>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--card-foreground))] truncate">{trip.name}</h1>
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1"><MapPin strokeWidth={1.5} className="h-3.5 w-3.5" /> {trip.destination}</span>
            <span className="flex items-center gap-1"><CalendarDays strokeWidth={1.5} className="h-3.5 w-3.5" /> {trip.startDate ? formatDate(trip.startDate) : "—"} – {trip.endDate ? formatDate(trip.endDate) : "—"}</span>
            <span className="flex items-center gap-1"><Users strokeWidth={1.5} className="h-3.5 w-3.5" /> {jamaah.length} jamaah</span>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}
          className="gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl h-9 px-4 text-sm shrink-0">
          <Plus strokeWidth={1.5} className="h-4 w-4 mr-1.5" /> Tambah Jamaah
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
          <div className="h-16 w-16 flex items-center justify-center mb-4">
            <Users strokeWidth={1.5} className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
          </div>
          <h2 className="text-base font-semibold text-[hsl(var(--card-foreground))]">Belum ada jamaah</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Tambahkan jamaah untuk mulai mengelola pemberkasan.
          </p>
          <Button onClick={() => setAddOpen(true)}
            className="mt-5 gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl">
            <Plus strokeWidth={1.5} className="h-4 w-4 mr-2" /> Tambah Jamaah Pertama
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jamaah.map((j) => (
            <JamaahCard key={j.id} jamaah={j} tripId={id!} onDelete={setDeleteTarget} />
          ))}
          <button onClick={() => setAddOpen(true)}
            className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-2 py-10 hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-all group">
            <div className="h-9 w-9 flex items-center justify-center transition-colors">
              <Plus strokeWidth={1.5} className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]" />
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
