import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadIghPdf, renderIghPdfPreview, type IghPdfData } from "@/lib/generateIghPdf";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: IghPdfData;
}

export function PdfPreviewDialog({ open, onOpenChange, data }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setPreviewUrl(null);
    renderIghPdfPreview(data, 1.4)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch((err) => {
        console.error("preview render failed", err);
        if (!cancelled) toast.error("Gagal menampilkan preview PDF");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(data)]);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadIghPdf(data);
      toast.success("PDF berhasil diunduh");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl border border-[hsl(var(--border))] shadow-2xl bg-white flex flex-col max-h-[90vh]">
        <div className="px-5 pt-3 pb-2 shrink-0" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <DialogTitle asChild>
            <p className="text-[10px] font-normal text-slate-400/70 leading-none">
              <span className="font-medium">Preview PDF Penawaran</span>
              <span className="mx-1.5 text-slate-300">·</span>
              Template IGH Tour, data dari kalkulator dipetakan otomatis
            </p>
          </DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyiapkan preview…
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview PDF"
              className="mx-auto rounded-lg shadow-lg border border-slate-200 bg-white"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">Preview tidak tersedia.</div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2 shrink-0 bg-white/80 backdrop-blur-sm">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 rounded-xl text-[12px] font-semibold bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
          >
            Tutup
          </button>
          <button
            disabled={downloading}
            className="h-8 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
            onClick={handleDownload}
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Unduh PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
