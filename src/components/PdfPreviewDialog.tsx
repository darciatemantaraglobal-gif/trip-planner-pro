import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, Hand, Loader2, MousePointer2, Sliders, X, Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";
import { downloadIghPdf, renderIghPdfPreview, type IghPdfData } from "@/lib/generateIghPdf";
import { loadIghLayoutConfig, saveIghLayoutConfig, type IghLayoutConfig, type IghLayoutMode } from "@/lib/ighPdfConfig";
import { PdfLayoutTuner } from "./PdfLayoutTuner";
import { PdfInteractiveOverlay } from "./PdfInteractiveOverlay";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: IghPdfData;
}

const LIVE_STORAGE_KEY = "igh:pdf-live-preview";
const TUNER_STORAGE_KEY = "igh:pdf-tuner-open";
const EDIT_MODE_STORAGE_KEY = "igh:pdf-edit-mode";

export function PdfPreviewDialog({ open, onOpenChange, data }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [live, setLive] = useState<boolean>(() => {
    try { return localStorage.getItem(LIVE_STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [tunerOpen, setTunerOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(TUNER_STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [editMode, setEditMode] = useState<boolean>(() => {
    try { return localStorage.getItem(EDIT_MODE_STORAGE_KEY) === "1"; } catch { return false; }
  });
  const mode: IghLayoutMode = data.mode === "group" ? "group" : "private";
  const [layout, setLayout] = useState<IghLayoutConfig>(() => loadIghLayoutConfig(mode));

  // Bbox image preview di koordinat container — buat overlay positioning.
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const [imgRect, setImgRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  function recalcImgRect() {
    const wrap = previewWrapperRef.current;
    const img = previewImgRef.current;
    if (!wrap || !img || !img.complete || img.naturalWidth === 0) {
      setImgRect(null);
      return;
    }
    const wr = wrap.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    setImgRect({
      left: ir.left - wr.left,
      top: ir.top - wr.top,
      width: ir.width,
      height: ir.height,
    });
  }

  useLayoutEffect(() => {
    if (!previewUrl) { setImgRect(null); return; }
    recalcImgRect();
    const onResize = () => recalcImgRect();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [previewUrl, tunerOpen]);

  // Drag-commit dari overlay → simpan ke per-mode storage juga supaya konsisten
  // sama tuner panel (yang juga auto-save).
  function handleLayoutChangeFromOverlay(next: IghLayoutConfig) {
    setLayout(next);
    saveIghLayoutConfig(next, mode);
  }

  // Kalau mode berubah (user pindah dari private → group calc), reload layout
  // dari storage mode yang sesuai.
  useEffect(() => {
    setLayout(loadIghLayoutConfig(mode));
  }, [mode]);

  useEffect(() => {
    try { localStorage.setItem(LIVE_STORAGE_KEY, live ? "1" : "0"); } catch {/* noop */}
  }, [live]);
  useEffect(() => {
    try { localStorage.setItem(TUNER_STORAGE_KEY, tunerOpen ? "1" : "0"); } catch {/* noop */}
  }, [tunerOpen]);
  useEffect(() => {
    try { localStorage.setItem(EDIT_MODE_STORAGE_KEY, editMode ? "1" : "0"); } catch {/* noop */}
  }, [editMode]);

  // Re-render preview when opened. In live mode atau tuner aktif, debounce on change.
  const dataKey = JSON.stringify(data);
  const layoutKey = JSON.stringify(layout);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!open) { isFirstRender.current = true; return; }

    let cancelled = false;
    const initial = isFirstRender.current;
    isFirstRender.current = false;

    // First render: immediate. Subsequent: debounce 350ms.
    const delay = initial ? 0 : 350;
    if (initial) { setLoading(true); setPreviewUrl(null); }

    const timer = window.setTimeout(() => {
      if (!initial) setLoading(true);
      renderIghPdfPreview(data, 1.4, layout)
        .then((url) => { if (!cancelled) setPreviewUrl(url); })
        .catch((err) => {
          console.error("preview render failed", err);
          if (!cancelled) toast.error("Gagal menampilkan preview PDF");
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, delay);

    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, live ? dataKey : "static", tunerOpen ? layoutKey : "static-layout"]);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadIghPdf(data, undefined, layout);
      toast.success("PDF berhasil diunduh");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat PDF");
    } finally {
      setDownloading(false);
    }
  }

  const header = (
    <div className="px-5 pt-3 pb-2 shrink-0 flex items-start justify-between gap-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <DialogTitle asChild>
        <p className="text-[10px] font-normal text-slate-400/70 leading-none mt-1">
          <span className="font-medium">Preview PDF Penawaran</span>
          <span className="mx-1.5 text-slate-300">·</span>
          Template IGH Tour, data dari kalkulator dipetakan otomatis
        </p>
      </DialogTitle>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          title={editMode ? "Edit Mode ON — geser & resize elemen langsung di preview. Klik buat matiin." : "Edit Mode OFF — klik buat aktifkan drag & resize."}
          className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold border transition-colors ${
            editMode
              ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {editMode ? <MousePointer2 className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
          Edit
        </button>
        <button
          type="button"
          onClick={() => setTunerOpen((v) => !v)}
          title={tunerOpen ? "Sembunyikan Layout Tuner" : "Tampilkan Layout Tuner"}
          className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold border transition-colors ${
            tunerOpen
              ? "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Sliders className="h-3 w-3" />
          Tuner
        </button>
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          title={live ? "Live preview ON — auto-refresh sambil ngedit. Klik buat matiin." : "Live preview OFF — klik buat nyalain auto-refresh."}
          className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold border transition-colors ${
            live
              ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {live ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
          Live
        </button>
      </div>
    </div>
  );

  const tunerPanel = tunerOpen ? (
    <PdfLayoutTuner
      config={layout}
      mode={mode}
      onChange={setLayout}
      onClose={() => setTunerOpen(false)}
    />
  ) : null;

  const previewBody = (
    <div ref={previewWrapperRef} className="flex-1 overflow-y-auto px-5 py-4 bg-slate-100 relative">
      {loading && (
        <div className="absolute top-2 right-2 z-30 inline-flex items-center gap-1 h-6 px-2 rounded-md bg-white/90 border border-slate-200 text-[10px] font-bold text-slate-600 shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          Render…
        </div>
      )}
      {editMode && previewUrl && (
        <div className="absolute top-2 left-2 z-30 inline-flex items-center gap-1 h-6 px-2 rounded-md bg-blue-600 text-white text-[10px] font-bold shadow-sm">
          <MousePointer2 className="h-3 w-3" />
          Edit Mode
        </div>
      )}
      {!previewUrl && loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Menyiapkan preview…
        </div>
      ) : previewUrl ? (
        <img
          ref={previewImgRef}
          src={previewUrl}
          alt="Preview PDF"
          className="mx-auto rounded-lg shadow-lg border border-slate-200 bg-white"
          style={{ maxWidth: "100%", height: "auto", opacity: loading ? 0.6 : 1, transition: "opacity 150ms" }}
          onLoad={recalcImgRect}
          draggable={false}
        />
      ) : (
        <div className="text-center py-20 text-slate-500 text-sm">Preview tidak tersedia.</div>
      )}
      <PdfInteractiveOverlay
        layout={layout}
        mode={mode}
        onChange={handleLayoutChangeFromOverlay}
        imgRect={imgRect}
        enabled={editMode && !!previewUrl}
        projectNameText={data.projectName}
      />
    </div>
  );

  const footer = (
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
  );

  // ── LIVE MODE: floating, non-modal panel pinned bottom-right.
  // User bisa interaksi sama Calculator di belakangnya, preview auto-refresh.
  if (live) {
    const liveWidth = tunerOpen ? "min(720px,calc(100vw-2rem))" : "min(420px,calc(100vw-2rem))";
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            style={{ width: liveWidth }}
            className="fixed bottom-4 right-4 z-50 h-[min(640px,calc(100vh-2rem))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl bg-white flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          >
            {header}
            <div className="flex-1 flex overflow-hidden">
              {previewBody}
              {tunerPanel}
            </div>
            {footer}
            <DialogPrimitive.Close className="absolute top-2 right-2 rounded-md w-6 h-6 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X className="h-3.5 w-3.5" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  // ── DEFAULT MODE: modal, full-size preview.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`p-0 overflow-hidden rounded-2xl border border-[hsl(var(--border))] shadow-2xl bg-white flex flex-col max-h-[90vh] ${
          tunerOpen ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        {header}
        <div className="flex-1 flex overflow-hidden">
          {previewBody}
          {tunerPanel}
        </div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}
