import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Camera, Upload, Trash2, FileText, Plane, HeartPulse, ShieldCheck, FolderOpen, ExternalLink, Pencil, Save, X,
} from "lucide-react";
import { useTripsStore, useJamaahStore, useDocsStore, type Jamaah, type JamaahDoc, type DocCategory } from "@/store/tripsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// ── Doc category config ────────────────────────────────────────────────────────
const DOC_CATEGORIES: { key: DocCategory; label: string; icon: React.ElementType; color: string }[] = [
  { key: "passport", label: "Paspor / KTP", icon: ShieldCheck, color: "text-violet-500 bg-violet-50" },
  { key: "visa",     label: "Visa",          icon: FileText,    color: "text-sky-500 bg-sky-50" },
  { key: "ticket",   label: "Tiket Pesawat", icon: Plane,       color: "text-rose-500 bg-rose-50" },
  { key: "medical",  label: "Kesehatan",     icon: HeartPulse,  color: "text-emerald-500 bg-emerald-50" },
  { key: "other",    label: "Lainnya",       icon: FolderOpen,  color: "text-amber-500 bg-amber-50" },
];

// ── Doc item ──────────────────────────────────────────────────────────────────
function DocItem({ doc, onDelete }: { doc: JamaahDoc; onDelete: () => void }) {
  const isImage = doc.fileType === "image";

  const open = () => {
    const w = window.open();
    if (!w) return;
    if (isImage) {
      w.document.write(`<img src="${doc.dataUrl}" style="max-width:100%;"/>`);
    } else {
      w.document.write(`<iframe src="${doc.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`);
    }
  };

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-white p-3 hover:shadow-sm transition-all">
      {isImage ? (
        <img src={doc.dataUrl} alt={doc.label} className="h-12 w-12 rounded-lg object-cover shrink-0 border border-[hsl(var(--border))]" />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
          <FileText className="h-6 w-6 text-red-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[hsl(var(--card-foreground))] truncate">{doc.label}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{doc.fileName}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[hsl(var(--secondary))]" onClick={open}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-red-50 hover:text-red-500" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Doc upload section ────────────────────────────────────────────────────────
function DocSection({
  category, label, icon: Icon, color, docs, jamaahId,
}: {
  category: DocCategory; label: string; icon: React.ElementType; color: string;
  docs: JamaahDoc[]; jamaahId: string;
}) {
  const addDocument = useDocsStore((s) => s.addDocument);
  const removeDoc = useDocsStore((s) => s.removeDoc);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JamaahDoc | null>(null);

  const catDocs = docs.filter((d) => d.category === category);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File terlalu besar (maks 5 MB)."); return; }
    setUploading(true);
    try {
      const dataUrl = await fileToBase64(file);
      const fileType = file.type.startsWith("image/") ? "image" : "pdf";
      await addDocument({ jamaahId, category, label: file.name.replace(/\.[^.]+$/, ""), fileName: file.name, fileType, dataUrl });
      toast.success("Dokumen berhasil diunggah.");
    } catch {
      toast.error("Gagal mengunggah dokumen.");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeDoc(deleteTarget.id);
    toast.success("Dokumen dihapus.");
    setDeleteTarget(null);
  };

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", color)}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-[hsl(var(--card-foreground))]">{label}</span>
          {catDocs.length > 0 && (
            <span className="text-xs bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded-full">{catDocs.length}</span>
          )}
        </div>
        <div>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={handleUpload} />
          <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg border-[hsl(var(--border))]"
            onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="h-3 w-3 mr-1.5" />
            {uploading ? "Mengunggah…" : "Unggah"}
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {catDocs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-6 rounded-xl border-2 border-dashed border-[hsl(var(--border))] gap-2 cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-all"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Klik untuk unggah PNG / PDF</p>
          </div>
        ) : (
          catDocs.map((doc) => (
            <DocItem key={doc.id} doc={doc} onDelete={() => setDeleteTarget(doc)} />
          ))
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen?</AlertDialogTitle>
            <AlertDialogDescription>Dokumen ini akan dihapus permanen.</AlertDialogDescription>
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

// ── JAMAAH PROFILE PAGE ────────────────────────────────────────────────────────
export default function JamaahProfile() {
  const { id: tripId, jamaahId } = useParams<{ id: string; jamaahId: string }>();
  const navigate = useNavigate();
  const trips = useTripsStore((s) => s.trips);
  const { jamaah, fetchJamaah, patchJamaah } = useJamaahStore();
  const { docs, fetchDocs } = useDocsStore();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Jamaah>>({});

  const trip = trips.find((t) => t.id === tripId);
  const person = jamaah.find((j) => j.id === jamaahId);

  useEffect(() => {
    if (tripId) fetchJamaah(tripId);
    if (jamaahId) fetchDocs(jamaahId);
  }, [tripId, jamaahId, fetchJamaah, fetchDocs]);

  useEffect(() => {
    if (person) setForm({ name: person.name, phone: person.phone, birthDate: person.birthDate, passportNumber: person.passportNumber, gender: person.gender });
  }, [person?.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !jamaahId) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Foto terlalu besar (maks 2 MB)."); return; }
    const dataUrl = await fileToBase64(file);
    await patchJamaah(jamaahId, { photoDataUrl: dataUrl });
    toast.success("Foto profil diperbarui.");
  };

  const handleSave = async () => {
    if (!jamaahId || !form.name) { toast.error("Nama wajib diisi."); return; }
    setSaving(true);
    await patchJamaah(jamaahId, form);
    toast.success("Data jamaah diperbarui.");
    setSaving(false);
    setEditing(false);
  };

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">Jamaah tidak ditemukan.</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">← Kembali</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/trips/${tripId}`)}
          className="rounded-xl h-9 w-9 hover:bg-[hsl(var(--secondary))]">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm text-[hsl(var(--muted-foreground))]">
          <span className="cursor-pointer hover:text-[hsl(var(--primary))]" onClick={() => navigate("/")}>Paket Trip</span>
          <span className="mx-1.5">›</span>
          <span className="cursor-pointer hover:text-[hsl(var(--primary))]" onClick={() => navigate(`/trips/${tripId}`)}>{trip?.name}</span>
          <span className="mx-1.5">›</span>
          <span className="font-medium text-[hsl(var(--card-foreground))]">{person.name}</span>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden">
        {/* Gradient banner */}
        <div className={cn(
          "h-28 bg-gradient-to-r",
          person.gender === "P" ? "from-pink-400 to-rose-500" : "from-blue-400 to-indigo-500"
        )} />

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <div className={cn(
                "h-24 w-24 rounded-2xl border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-white text-3xl font-bold",
                person.gender === "P" ? "bg-gradient-to-br from-pink-400 to-rose-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"
              )}>
                {person.photoDataUrl
                  ? <img src={person.photoDataUrl} alt={person.name} className="h-full w-full object-cover" />
                  : person.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[hsl(var(--primary))] shadow-md flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Camera className="h-3.5 w-3.5 text-white" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>

            <div className="flex items-center gap-2 mb-1">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl" onClick={() => setEditing(false)}>
                    <X className="h-3 w-3 mr-1" /> Batal
                  </Button>
                  <Button size="sm" className="h-8 text-xs rounded-xl gradient-primary text-white hover:opacity-90"
                    onClick={handleSave} disabled={saving}>
                    <Save className="h-3 w-3 mr-1" /> {saving ? "Menyimpan…" : "Simpan"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl" onClick={() => setEditing(true)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit Data
                </Button>
              )}
            </div>
          </div>

          {/* Info form / display */}
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">Nama Lengkap *</Label>
                <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">Jenis Kelamin</Label>
                <Select value={form.gender ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, gender: v as "L" | "P" }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">No. HP</Label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">Tanggal Lahir</Label>
                <Input type="date" value={form.birthDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">No. Paspor</Label>
                <Input value={form.passportNumber ?? ""} onChange={(e) => setForm((f) => ({ ...f, passportNumber: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--card-foreground))]">{person.name}</h2>
              {person.gender && (
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block",
                  person.gender === "P" ? "bg-pink-50 text-pink-500" : "bg-blue-50 text-blue-500")}>
                  {person.gender === "P" ? "Perempuan" : "Laki-laki"}
                </span>
              )}
              <div className="mt-3 grid gap-y-2 gap-x-6 sm:grid-cols-2 text-sm">
                {[
                  { label: "No. HP", value: person.phone },
                  { label: "Tanggal Lahir", value: person.birthDate ? formatDate(person.birthDate) : "" },
                  { label: "No. Paspor", value: person.passportNumber },
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] block">{label}</span>
                    <span className="font-medium text-[hsl(var(--card-foreground))]">{value}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document sections */}
      <div>
        <h3 className="text-sm font-semibold text-[hsl(var(--card-foreground))] mb-3">Pemberkasan & Dokumen</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {DOC_CATEGORIES.map((cat) => (
            <DocSection
              key={cat.key}
              category={cat.key}
              label={cat.label}
              icon={cat.icon}
              color={cat.color}
              docs={docs}
              jamaahId={jamaahId!}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
