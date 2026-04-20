import { useCallback, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, FileImage, Loader2, ScanLine, Trash2, Upload, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

const MONTSERRAT = { fontFamily: "'Montserrat', sans-serif" };

interface Props {
  open: boolean;
  tripId: string;
  onClose: () => void;
}

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
          setRows((prev) =>
            prev.map((r) => r.id === nextId ? { ...r, progress: pct } : r)
          );
        })
          .then((result) => {
            setRows((prev) =>
              prev.map((r) =>
                r.id === nextId
                  ? {
                      ...r,
                      status: "done",
                      progress: 100,
                      data: {
                        name: result.name || "",
                        passportNumber: result.passportNumber || "",
                        birthDate: result.birthDate || "",
                        gender: result.gender || "",
                        phone: "",
                      },
                    }
                  : r
              )
            );
          })
          .catch(() => {
            setRows((prev) =>
              prev.map((r) =>
                r.id === nextId ? { ...r, status: "error", progress: 0, errorMsg: "Gagal scan" } : r
              )
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col bg-white p-0"
        style={MONTSERRAT}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <ScanLine className="h-4.5 w-4.5 text-white" style={{ height: 18, width: 18 }} />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-bold" style={MONTSERRAT}>
                Bulk OCR Scan Paspor
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Upload banyak foto paspor sekaligus — data otomatis terbaca & bisa dikoreksi sebelum disimpan
              </p>
            </div>
          </div>

          {/* Phase stepper */}
          <div className="flex items-center gap-2 mt-3">
            {[
              { key: "upload", label: "Upload" },
              { key: "scanning", label: "Scanning" },
              { key: "review", label: "Review & Simpan" },
            ].map((step, i) => (
              <div key={step.key} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-[hsl(var(--border))]" />}
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all",
                  phase === step.key
                    ? "bg-orange-100 text-orange-700 border border-orange-200"
                    : ["upload", "scanning", "review"].indexOf(phase) > i
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-[hsl(var(--secondary))] text-muted-foreground border border-[hsl(var(--border))]"
                )}>
                  {["upload", "scanning", "review"].indexOf(phase) > i
                    ? <CheckCircle2 className="h-3 w-3" />
                    : <span className="text-[10px] font-bold">{i + 1}</span>
                  }
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Phase: UPLOAD ── */}
          {phase === "upload" && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-10 px-6 text-center",
                  dragOver
                    ? "border-orange-400 bg-orange-50"
                    : "border-[hsl(var(--border))] hover:border-orange-300 hover:bg-orange-50/40"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                    Drag & drop foto paspor, atau klik untuk pilih
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Bisa pilih banyak file sekaligus · JPG, PNG, WEBP · Pastikan MRZ paspor terlihat jelas
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-orange-200 text-orange-700 pointer-events-none"
                >
                  <FileImage className="h-4 w-4 mr-1.5" />
                  Pilih File
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />

              {/* File list */}
              {rows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-[hsl(var(--foreground))]">
                      {rows.length} file dipilih
                    </p>
                    <button
                      type="button"
                      onClick={() => { rows.forEach((r) => URL.revokeObjectURL(r.previewUrl)); setRows([]); }}
                      className="text-[11px] text-red-500 hover:text-red-700"
                    >
                      Hapus semua
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {rows.map((row) => (
                      <div key={row.id} className="relative group rounded-xl overflow-hidden border border-[hsl(var(--border))] aspect-[3/4] bg-gray-50">
                        <img src={row.previewUrl} alt="passport" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <p className="text-white text-[10px] font-medium truncate w-full">{row.file.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeRow(row.id); }}
                          className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Phase: SCANNING ── */}
          {phase === "scanning" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold">
                  Memproses antrian…{" "}
                  <span className="text-orange-600">{doneCount}/{rows.length}</span>
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                  Maks. 2 scan berjalan bersamaan
                </div>
              </div>

              {/* Overall progress bar */}
              <div className="h-2 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-400 transition-all duration-300"
                  style={{ width: `${rows.length ? (doneCount / rows.length) * 100 : 0}%` }}
                />
              </div>

              <div className="space-y-2">
                {rows.map((row, idx) => (
                  <div
                    key={row.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
                      row.status === "scanning" && "border-orange-200 bg-orange-50",
                      row.status === "done" && "border-green-200 bg-green-50",
                      row.status === "error" && "border-red-200 bg-red-50",
                      row.status === "queued" && "border-[hsl(var(--border))] bg-white opacity-60",
                    )}
                  >
                    <img src={row.previewUrl} alt="" className="h-10 w-8 object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold truncate text-[hsl(var(--foreground))]">
                          File {idx + 1}: {row.file.name}
                        </p>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                          row.status === "queued" && "bg-gray-100 text-gray-500",
                          row.status === "scanning" && "bg-orange-100 text-orange-700",
                          row.status === "done" && "bg-green-100 text-green-700",
                          row.status === "error" && "bg-red-100 text-red-600",
                        )}>
                          {row.status === "queued" && "Antri"}
                          {row.status === "scanning" && `Scanning ${row.progress}%`}
                          {row.status === "done" && "✓ Selesai"}
                          {row.status === "error" && "✗ Gagal"}
                        </span>
                      </div>
                      {row.status === "scanning" && (
                        <div className="mt-1.5 h-1.5 rounded-full bg-orange-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-orange-400 transition-all duration-200"
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                      )}
                      {row.status === "done" && row.data.name && (
                        <p className="text-[10px] text-green-700 mt-0.5 truncate">
                          {row.data.name} · {row.data.passportNumber || "No. paspor belum terbaca"}
                        </p>
                      )}
                      {row.status === "error" && (
                        <p className="text-[10px] text-red-600 mt-0.5">Gagal baca MRZ — bisa diisi manual di review</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Phase: REVIEW ── */}
          {phase === "review" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold">
                    Review & Koreksi Data
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {validCount} dari {rows.length} baris valid (nama & no. paspor terisi).
                    Klik sel untuk mengedit.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-[11px] text-green-700 font-semibold">{validCount} siap simpan</span>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]" style={MONTSERRAT}>
                    <thead>
                      <tr className="bg-[hsl(var(--secondary))] border-b border-[hsl(var(--border))]">
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground w-16">Foto</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">Nama Lengkap *</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground w-36">No. Paspor *</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground w-36">Tgl. Lahir</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground w-28">Gender</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground w-32">No. HP</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                      {rows.map((row) => {
                        const valid = isRowValid(row);
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              "group transition-colors",
                              valid ? "bg-white hover:bg-green-50/30" : "bg-red-50/20 hover:bg-red-50/40"
                            )}
                          >
                            {/* Thumbnail */}
                            <td className="px-3 py-2">
                              <div className="relative">
                                <img
                                  src={row.previewUrl}
                                  alt=""
                                  className="h-12 w-10 object-cover rounded-lg border border-[hsl(var(--border))]"
                                />
                                {valid && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 bg-white rounded-full absolute -top-1 -right-1 shadow-sm" />
                                )}
                              </div>
                            </td>
                            {/* Name */}
                            <td className="px-2 py-2">
                              <Input
                                value={row.data.name}
                                onChange={(e) => updateRowData(row.id, "name", e.target.value)}
                                placeholder="Nama sesuai paspor"
                                className={cn(
                                  "h-8 text-[12px] rounded-lg border-[hsl(var(--border))]",
                                  !row.data.name.trim() && "border-red-300 bg-red-50/40"
                                )}
                                style={MONTSERRAT}
                              />
                            </td>
                            {/* Passport Number */}
                            <td className="px-2 py-2">
                              <Input
                                value={row.data.passportNumber}
                                onChange={(e) => updateRowData(row.id, "passportNumber", e.target.value)}
                                placeholder="A1234567"
                                className={cn(
                                  "h-8 text-[12px] rounded-lg font-mono",
                                  !row.data.passportNumber.trim() && "border-orange-300 bg-orange-50/40"
                                )}
                                style={MONTSERRAT}
                              />
                            </td>
                            {/* Birth Date */}
                            <td className="px-2 py-2">
                              <Input
                                type="date"
                                value={row.data.birthDate}
                                onChange={(e) => updateRowData(row.id, "birthDate", e.target.value)}
                                className="h-8 text-[12px] rounded-lg"
                                style={MONTSERRAT}
                              />
                            </td>
                            {/* Gender */}
                            <td className="px-2 py-2">
                              <Select
                                value={row.data.gender || ""}
                                onValueChange={(v) => updateRowData(row.id, "gender", v)}
                              >
                                <SelectTrigger className="h-8 text-[12px] rounded-lg" style={MONTSERRAT}>
                                  <SelectValue placeholder="Pilih" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="L">Laki-laki</SelectItem>
                                  <SelectItem value="P">Perempuan</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            {/* Phone */}
                            <td className="px-2 py-2">
                              <Input
                                value={row.data.phone}
                                onChange={(e) => updateRowData(row.id, "phone", e.target.value)}
                                placeholder="08xx"
                                className="h-8 text-[12px] rounded-lg"
                                style={MONTSERRAT}
                              />
                            </td>
                            {/* Delete */}
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {rows.length === 0 && (
                <div className="py-8 text-center text-[12px] text-muted-foreground">
                  Semua baris dihapus. Kembali ke upload untuk memilih file baru.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[hsl(var(--border))] shrink-0 flex items-center justify-between gap-3 bg-white">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            Batal
          </Button>

          {phase === "upload" && (
            <Button
              onClick={startScanning}
              disabled={rows.length === 0}
              className="gradient-primary text-white rounded-xl gap-2"
              style={MONTSERRAT}
            >
              <ScanLine className="h-4 w-4" />
              Mulai Scan {rows.length > 0 && `(${rows.length} foto)`}
            </Button>
          )}

          {phase === "scanning" && (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              Scanning {doneCount}/{rows.length}… harap tunggu
            </div>
          )}

          {phase === "review" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setPhase("upload")}
              >
                + Tambah Foto Lagi
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={saving || validCount === 0}
                className="gradient-primary text-white rounded-xl gap-2"
                style={MONTSERRAT}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…</>
                ) : (
                  <><Users className="h-4 w-4" /> Simpan {validCount} Jamaah</>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
