import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileImage, Loader2, ScanLine, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { scanPassport } from "@/lib/ocrPassport";
import { useJamaahStore } from "@/store/tripsStore";

interface ScanRow {
  id: string;
  file: File;
  previewUrl: string;
  status: "queued" | "scanning" | "done" | "error";
  progress: number;
  errorMsg?: string;
  data: {
    name: string;
    passportNumber: string;
    birthDate: string;
    gender: "L" | "P" | "";
    phone: string;
  };
}

function isRowValid(row: ScanRow): boolean {
  return row.data.name.trim().length > 0 && row.data.passportNumber.trim().length > 0;
}

interface Props {
  open: boolean;
  tripId: string;
  onClose: () => void;
}

const STEPS = [
  { key: "upload", label: "Upload" },
  { key: "scanning", label: "Scanning" },
  { key: "review", label: "Review" },
];

export default function BulkOcrDialog({ open, tripId, onClose }: Props) {
  const addJamaah = useJamaahStore((s) => s.addJamaah);
  const [phase, setPhase] = useState<"upload" | "scanning" | "review">("upload");
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeScans = useRef(0);
  const queueRef = useRef<string[]>([]);

  const reset = () => {
    rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setRows([]);
    setPhase("upload");
    setSaving(false);
    activeScans.current = 0;
    queueRef.current = [];
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) { toast.error("Pilih file gambar (JPG/PNG/WEBP)."); return; }
    const newRows: ScanRow[] = arr.map((file) => ({
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
      progress: 0,
      data: { name: "", passportNumber: "", birthDate: "", gender: "", phone: "" },
    }));
    setRows((prev) => [...prev, ...newRows]);
  }, []);

  const removeRow = (id: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((r) => r.id !== id);
    });
  };

  const updateRowData = (id: string, field: keyof ScanRow["data"], value: string) => {
    setRows((prev) =>
      prev.map((r) => r.id === id ? { ...r, data: { ...r.data, [field]: value } } : r)
    );
  };

  const processQueue = useCallback((allRows: ScanRow[]) => {
    const MAX_CONCURRENT = 2;
    const runNext = () => {
      while (activeScans.current < MAX_CONCURRENT && queueRef.current.length > 0) {
        const nextId = queueRef.current.shift()!;
        activeScans.current++;
        setRows((prev) =>
          prev.map((r) => r.id === nextId ? { ...r, status: "scanning", progress: 0 } : r)
        );
        const row = allRows.find((r) => r.id === nextId);
        if (!row) { activeScans.current--; runNext(); return; }
        scanPassport(row.file, (pct) => {
          setRows((prev) => prev.map((r) => r.id === nextId ? { ...r, progress: pct } : r));
        })
          .then((result) => {
            setRows((prev) =>
              prev.map((r) =>
                r.id === nextId
                  ? { ...r, status: "done", progress: 100, data: { name: result.name || "", passportNumber: result.passportNumber || "", birthDate: result.birthDate || "", gender: result.gender || "", phone: "" } }
                  : r
              )
            );
          })
          .catch(() => {
            setRows((prev) =>
              prev.map((r) => r.id === nextId ? { ...r, status: "error", progress: 0, errorMsg: "Gagal scan" } : r)
            );
          })
          .finally(() => {
            activeScans.current--;
            setRows((cur) => {
              const allDone = cur.every((r) => r.status === "done" || r.status === "error");
              if (allDone) setPhase("review");
              return cur;
            });
            runNext();
          });
      }
    };
    runNext();
  }, []);

  const startScanning = () => {
    if (rows.length === 0) { toast.error("Pilih minimal 1 foto paspor."); return; }
    setPhase("scanning");
    queueRef.current = rows.map((r) => r.id);
    activeScans.current = 0;
    processQueue(rows);
  };

  const handleSaveAll = async () => {
    const validRows = rows.filter((r) => r.data.name.trim());
    if (validRows.length === 0) { toast.error("Minimal satu jamaah harus memiliki nama."); return; }
    setSaving(true);
    try {
      for (const row of validRows) {
        await addJamaah({
          tripId,
          name: row.data.name.trim(),
          phone: row.data.phone.trim(),
          birthDate: row.data.birthDate,
          passportNumber: row.data.passportNumber.trim(),
          gender: row.data.gender,
          photoDataUrl: row.previewUrl.startsWith("blob:") ? undefined : row.previewUrl,
        });
      }
      toast.success(`${validRows.length} jamaah berhasil disimpan.`);
      handleClose();
    } catch {
      toast.error("Gagal menyimpan beberapa jamaah.");
    } finally {
      setSaving(false);
    }
  };

  const doneCount = rows.filter((r) => r.status === "done" || r.status === "error").length;
  const validCount = rows.filter(isRowValid).length;
  const phaseIdx = STEPS.findIndex((s) => s.key === phase);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden rounded-2xl border border-[hsl(var(--border))] shadow-2xl bg-white flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <ScanLine className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-[13.5px] font-bold">Bulk OCR Scan Paspor</DialogTitle>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">Upload banyak foto paspor — data otomatis terbaca & bisa dikoreksi</p>
            </div>
          </div>

          {/* Phase stepper */}
          <div className="flex items-center gap-1.5 mt-3">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center gap-1.5">
                {i > 0 && <div className="h-px w-5 bg-[hsl(var(--border))]" />}
                <div className={cn(
                  "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border transition-all",
                  phase === step.key
                    ? "bg-orange-100 text-orange-700 border-orange-200"
                    : phaseIdx > i
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-[hsl(var(--secondary))] text-muted-foreground border-[hsl(var(--border))]"
                )}>
                  {phaseIdx > i
                    ? <CheckCircle2 className="h-2.5 w-2.5" />
                    : <span className="text-[9px] font-bold">{i + 1}</span>
                  }
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Upload phase */}
          {phase === "upload" && (
            <div className="space-y-3">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2 py-8 px-5 text-center transition-all",
                  dragOver ? "border-orange-400 bg-orange-50" : "border-[hsl(var(--border))] hover:border-orange-300 hover:bg-orange-50/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Upload className="h-4.5 w-4.5 text-orange-600" style={{ height: 18, width: 18 }} />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-[hsl(var(--foreground))]">Drag & drop foto paspor, atau klik untuk pilih</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">Bisa multi-file · JPG, PNG, WEBP · MRZ harus terlihat jelas</p>
                </div>
                <button type="button"
                  className="h-7 px-3 rounded-xl text-[11px] font-semibold border border-orange-200 text-orange-700 bg-white hover:bg-orange-50 transition-colors pointer-events-none flex items-center gap-1.5">
                  <FileImage className="h-3.5 w-3.5" /> Pilih File
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)} />

              {rows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11.5px] font-semibold">{rows.length} file dipilih</p>
                    <button type="button" onClick={() => { rows.forEach((r) => URL.revokeObjectURL(r.previewUrl)); setRows([]); }}
                      className="text-[10.5px] text-red-500 hover:text-red-700">Hapus semua</button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {rows.map((row) => (
                      <div key={row.id} className="relative group rounded-xl overflow-hidden border border-[hsl(var(--border))] aspect-[3/4] bg-gray-50">
                        <img src={row.previewUrl} alt="passport" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                          <p className="text-white text-[9px] font-medium truncate w-full">{row.file.name}</p>
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeRow(row.id); }}
                          className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scanning phase */}
          {phase === "scanning" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-semibold">
                  Memproses… <span className="text-orange-600">{doneCount}/{rows.length}</span>
                </p>
                <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                  Maks. 2 scan sekaligus
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                <div className="h-full rounded-full bg-orange-400 transition-all duration-300"
                  style={{ width: `${rows.length ? (doneCount / rows.length) * 100 : 0}%` }} />
              </div>
              <div className="space-y-1.5">
                {rows.map((row, idx) => (
                  <div key={row.id} className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2 transition-all",
                    row.status === "scanning" && "border-orange-200 bg-orange-50",
                    row.status === "done" && "border-green-200 bg-green-50",
                    row.status === "error" && "border-red-200 bg-red-50",
                    row.status === "queued" && "border-[hsl(var(--border))] bg-white opacity-50",
                  )}>
                    <img src={row.previewUrl} alt="" className="h-9 w-7 object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold truncate">File {idx + 1}: {row.file.name}</p>
                        <span className={cn(
                          "text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                          row.status === "queued" && "bg-gray-100 text-gray-500",
                          row.status === "scanning" && "bg-orange-100 text-orange-700",
                          row.status === "done" && "bg-green-100 text-green-700",
                          row.status === "error" && "bg-red-100 text-red-600",
                        )}>
                          {row.status === "queued" && "Antri"}
                          {row.status === "scanning" && (row.progress < 35 ? "AI…" : `${row.progress}%`)}
                          {row.status === "done" && "✓ Selesai"}
                          {row.status === "error" && "✗ Gagal"}
                        </span>
                      </div>
                      {row.status === "scanning" && (
                        <div className="mt-1 h-1 rounded-full bg-orange-100 overflow-hidden">
                          <div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${row.progress}%` }} />
                        </div>
                      )}
                      {row.status === "done" && row.data.name && (
                        <p className="text-[9.5px] text-green-700 mt-0.5 truncate">{row.data.name} · {row.data.passportNumber || "No. paspor belum terbaca"}</p>
                      )}
                      {row.status === "error" && (
                        <p className="text-[9.5px] text-red-600 mt-0.5">Gagal baca MRZ — bisa diisi manual di review</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review phase */}
          {phase === "review" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12.5px] font-semibold">Review & Koreksi Data</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">
                    {validCount}/{rows.length} baris valid. Klik sel untuk edit.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-[10.5px] text-green-700 font-semibold">{validCount} siap simpan</span>
                </div>
              </div>

              <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px]">
                    <thead>
                      <tr className="bg-[hsl(var(--secondary))] border-b border-[hsl(var(--border))]">
                        <th className="text-left px-2.5 py-2 text-[10px] font-semibold text-muted-foreground w-12">Foto</th>
                        <th className="text-left px-2.5 py-2 text-[10px] font-semibold text-muted-foreground">Nama *</th>
                        <th className="text-left px-2.5 py-2 text-[10px] font-semibold text-muted-foreground w-32">No. Paspor *</th>
                        <th className="text-left px-2.5 py-2 text-[10px] font-semibold text-muted-foreground w-32">Tgl. Lahir</th>
                        <th className="text-left px-2.5 py-2 text-[10px] font-semibold text-muted-foreground w-24">Gender</th>
                        <th className="text-left px-2.5 py-2 text-[10px] font-semibold text-muted-foreground w-28">No. HP</th>
                        <th className="px-2.5 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                      {rows.map((row) => {
                        const valid = isRowValid(row);
                        return (
                          <tr key={row.id} className={cn(
                            "group transition-colors",
                            valid ? "bg-white hover:bg-green-50/20" : "bg-red-50/20 hover:bg-red-50/40"
                          )}>
                            <td className="px-2.5 py-1.5">
                              <div className="relative">
                                <img src={row.previewUrl} alt="" className="h-10 w-8 object-cover rounded-lg border border-[hsl(var(--border))]" />
                                {valid && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 bg-white rounded-full absolute -top-1 -right-1 shadow-sm" />}
                              </div>
                            </td>
                            <td className="px-1.5 py-1.5">
                              <Input value={row.data.name} onChange={(e) => updateRowData(row.id, "name", e.target.value)}
                                placeholder="Nama sesuai paspor"
                                className={cn("h-7 text-[11.5px] rounded-lg", !row.data.name.trim() && "border-red-300 bg-red-50/40")} />
                            </td>
                            <td className="px-1.5 py-1.5">
                              <Input value={row.data.passportNumber} onChange={(e) => updateRowData(row.id, "passportNumber", e.target.value)}
                                placeholder="A1234567"
                                className={cn("h-7 text-[11.5px] rounded-lg font-mono", !row.data.passportNumber.trim() && "border-orange-300 bg-orange-50/30")} />
                            </td>
                            <td className="px-1.5 py-1.5">
                              <Input type="date" value={row.data.birthDate} onChange={(e) => updateRowData(row.id, "birthDate", e.target.value)}
                                className="h-7 text-[11.5px] rounded-lg" />
                            </td>
                            <td className="px-1.5 py-1.5">
                              <Select value={row.data.gender || ""} onValueChange={(v) => updateRowData(row.id, "gender", v)}>
                                <SelectTrigger className="h-7 text-[11.5px] rounded-lg"><SelectValue placeholder="Pilih" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="L">Laki-laki</SelectItem>
                                  <SelectItem value="P">Perempuan</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-1.5 py-1.5">
                              <Input value={row.data.phone} onChange={(e) => updateRowData(row.id, "phone", e.target.value)}
                                placeholder="08xx" className="h-7 text-[11.5px] rounded-lg" />
                            </td>
                            <td className="px-1.5 py-1.5">
                              <button type="button" onClick={() => removeRow(row.id)}
                                className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[hsl(var(--border))] flex items-center justify-between gap-3 shrink-0 bg-white/80 backdrop-blur-sm">
          <button type="button" onClick={handleClose}
            className="h-8 px-4 rounded-xl text-[12px] font-semibold bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors">
            Tutup
          </button>

          <div className="flex gap-2">
            {phase === "upload" && (
              <button type="button" onClick={startScanning} disabled={rows.length === 0}
                className="h-8 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
                <ScanLine className="h-3.5 w-3.5" />
                Mulai Scan ({rows.length} foto)
              </button>
            )}
            {phase === "review" && (
              <button type="button" onClick={handleSaveAll} disabled={saving || validCount === 0}
                className="h-8 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {saving ? "Menyimpan…" : `Simpan ${validCount} Jamaah`}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
