import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, Plus, Trash2, GripVertical, Check,
  ImageIcon, AlertCircle, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PdfTemplate, TemplateFieldConfig } from "./types";
import { TEMPLATE_FIELD_DEFS, FIELD_COLORS } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: PdfTemplate | null;
  onSave: (t: Omit<PdfTemplate, "id" | "createdAt">) => void;
}

/* ─── Image Analysis ─────────────────────────────────────────────── */

interface ImageZones {
  hasColoredHeader: boolean;
  hasColoredFooter: boolean;
  headerEndPct: number;   // Y% where header ends
  footerStartPct: number; // Y% where footer starts
}

async function analyzeImage(dataUrl: string): Promise<ImageZones> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const COLS = 20;
      const ROWS = 20;
      const canvas = document.createElement("canvas");
      canvas.width = COLS;
      canvas.height = ROWS;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, COLS, ROWS);

      // Build brightness grid (0-255)
      const grid: number[][] = [];
      for (let y = 0; y < ROWS; y++) {
        grid[y] = [];
        for (let x = 0; x < COLS; x++) {
          const d = ctx.getImageData(x, y, 1, 1).data;
          grid[y][x] = d[0] * 0.299 + d[1] * 0.587 + d[2] * 0.114;
        }
      }

      // Row average brightness
      const rowAvg = grid.map((row) => row.reduce((a, b) => a + b, 0) / COLS);

      // Detect header: dark rows at the top (< 160 brightness)
      let headerEndRow = 0;
      for (let y = 0; y < 8; y++) {
        if (rowAvg[y] < 160) headerEndRow = y + 1;
      }
      const hasColoredHeader = headerEndRow >= 2;
      if (!hasColoredHeader) headerEndRow = 0;

      // Detect footer: dark rows at the bottom (< 160 brightness)
      let footerStartRow = ROWS;
      for (let y = ROWS - 1; y >= ROWS - 6; y--) {
        if (rowAvg[y] < 160) footerStartRow = y;
      }
      const hasColoredFooter = footerStartRow <= ROWS - 2;
      if (!hasColoredFooter) footerStartRow = ROWS;

      resolve({
        hasColoredHeader,
        hasColoredFooter,
        headerEndPct: (headerEndRow / ROWS) * 100,
        footerStartPct: (footerStartRow / ROWS) * 100,
      });
    };
    img.onerror = () =>
      resolve({
        hasColoredHeader: false,
        hasColoredFooter: false,
        headerEndPct: 0,
        footerStartPct: 100,
      });
    img.src = dataUrl;
  });
}

function buildPositions(
  zones: ImageZones,
  orientation: "portrait" | "landscape"
): TemplateFieldConfig[] {
  const { hasColoredHeader, hasColoredFooter, headerEndPct, footerStartPct } = zones;

  // Content area boundaries
  const cTop = hasColoredHeader ? headerEndPct + 2 : 6;
  const cBottom = hasColoredFooter ? footerStartPct - 2 : 94;
  const cH = Math.max(cBottom - cTop, 20);

  const clamp = (v: number) => Math.max(1, Math.min(98, +v.toFixed(1)));

  const mk = (
    key: string,
    xPct: number,
    yPct: number,
    fontSize?: number,
    bold?: boolean,
    color?: string
  ): TemplateFieldConfig => {
    const def = TEMPLATE_FIELD_DEFS.find((d) => d.key === key)!;
    return {
      key,
      label: def.label,
      x: clamp(xPct),
      y: clamp(yPct),
      fontSize: fontSize ?? def.defaultFontSize,
      bold: bold ?? def.defaultBold,
      color: color ?? "#1a1a1a",
    };
  };

  // Colors for dark zones
  const footerColor = hasColoredFooter ? "#ffffff" : "#444444";
  const footerY = (offset: number) =>
    hasColoredFooter
      ? clamp(footerStartPct + (100 - footerStartPct) * offset)
      : clamp(cBottom - 8 + 5 * offset);

  if (orientation === "landscape") {
    return [
      mk("quoteNumber",    5,  clamp(cTop + cH * 0.01), 10,  true,  "#555555"),
      mk("tier",          82,  clamp(cTop + cH * 0.01),  9,  false, "#888888"),
      mk("title",          5,  clamp(cTop + cH * 0.10), 17,  true),
      mk("subtitle",       5,  clamp(cTop + cH * 0.22), 11,  false),
      mk("dateRange",      5,  clamp(cTop + cH * 0.31), 10,  false, "#555555"),
      mk("customerName",  70,  clamp(cTop + cH * 0.10), 12,  true),
      mk("updateDate",    70,  clamp(cTop + cH * 0.31),  9,  false, "#888888"),
      mk("hotelMakkah",    5,  clamp(cTop + cH * 0.50), 12,  true),
      mk("makkahNights",   5,  clamp(cTop + cH * 0.60), 10,  false, "#555555"),
      mk("hotelMadinah",  55,  clamp(cTop + cH * 0.50), 12,  true),
      mk("madinahNights", 55,  clamp(cTop + cH * 0.60), 10,  false, "#555555"),
      mk("priceTable",     5,  clamp(cTop + cH * 0.70), 11,  false),
      mk("website",        5,  footerY(0.35),             9,  false, footerColor),
      mk("contactPhone",  68,  footerY(0.25),            10,  true,  footerColor),
      mk("contactName",   68,  footerY(0.65),            10,  false, footerColor),
    ];
  } else {
    // portrait
    return [
      mk("quoteNumber",    5,  clamp(cTop + cH * 0.01), 10,  true,  "#555555"),
      mk("tier",          80,  clamp(cTop + cH * 0.01),  9,  false, "#888888"),
      mk("title",          5,  clamp(cTop + cH * 0.10), 17,  true),
      mk("subtitle",       5,  clamp(cTop + cH * 0.22), 11,  false),
      mk("dateRange",      5,  clamp(cTop + cH * 0.31), 10,  false, "#555555"),
      mk("customerName",  65,  clamp(cTop + cH * 0.10), 12,  true),
      mk("updateDate",    65,  clamp(cTop + cH * 0.31),  9,  false, "#888888"),
      mk("hotelMakkah",    5,  clamp(cTop + cH * 0.52), 12,  true),
      mk("makkahNights",   5,  clamp(cTop + cH * 0.61), 10,  false, "#555555"),
      mk("hotelMadinah",  55,  clamp(cTop + cH * 0.52), 12,  true),
      mk("madinahNights", 55,  clamp(cTop + cH * 0.61), 10,  false, "#555555"),
      mk("priceTable",     5,  clamp(cTop + cH * 0.70), 11,  false),
      mk("website",        5,  footerY(0.35),             9,  false, footerColor),
      mk("contactPhone",  60,  footerY(0.25),            10,  true,  footerColor),
      mk("contactName",   60,  footerY(0.65),            10,  false, footerColor),
    ];
  }
}

/* ─── Component ──────────────────────────────────────────────────── */

export function TemplateEditorDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [name, setName] = useState("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [fields, setFields] = useState<TemplateFieldConfig[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sizeWarning, setSizeWarning] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        setName(initial.name);
        setOrientation(initial.orientation);
        setBackgroundImage(initial.backgroundImage);
        setFields(initial.fields);
      } else {
        setName("");
        setOrientation("landscape");
        setBackgroundImage("");
        setFields([]);
      }
      setSelected(null);
      setSizeWarning(false);
      setAiSuccess(false);
    }
  }, [open, initial]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setSizeWarning(true);
    } else {
      setSizeWarning(false);
    }
    const reader = new FileReader();
    reader.onload = (ev) => setBackgroundImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addField = (key: string) => {
    if (fields.find((f) => f.key === key)) return;
    const def = TEMPLATE_FIELD_DEFS.find((d) => d.key === key)!;
    setFields((prev) => [
      ...prev,
      {
        key,
        label: def.label,
        x: 10 + Math.random() * 40,
        y: 10 + Math.random() * 40,
        fontSize: def.defaultFontSize,
        bold: def.defaultBold,
        color: "#1a1a1a",
      },
    ]);
  };

  const removeField = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key));
    if (selected === key) setSelected(null);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(key);
    setSelected(key);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setFields((prev) => prev.map((f) => (f.key === dragging ? { ...f, x, y } : f)));
    },
    [dragging]
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const updateField = (key: string, updates: Partial<TemplateFieldConfig>) =>
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...updates } : f)));

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name, orientation, backgroundImage, fields });
    onOpenChange(false);
  };

  /* ── AI auto-arrange ── */
  const handleAiAnalyze = async () => {
    if (!backgroundImage || aiLoading) return;
    setAiLoading(true);
    setAiSuccess(false);
    setSelected(null);

    try {
      // Minimum display time so the animation is visible
      const [zones] = await Promise.all([
        analyzeImage(backgroundImage),
        new Promise<void>((r) => setTimeout(r, 1800)),
      ]);

      const suggested = buildPositions(zones, orientation);

      // Stagger-animate the fields appearing one by one
      setFields([]);
      suggested.forEach((f, i) => {
        setTimeout(() => {
          setFields((prev) => {
            if (prev.find((p) => p.key === f.key)) return prev;
            return [...prev, f];
          });
        }, i * 60);
      });

      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 3000);
    } finally {
      setAiLoading(false);
    }
  };

  const usedKeys = new Set(fields.map((f) => f.key));
  const selectedField = fields.find((f) => f.key === selected);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            className="fixed inset-3 md:inset-5 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--border))] shrink-0">
              <div>
                <h2 className="font-bold text-[15px] text-[hsl(var(--foreground))]">
                  {initial ? "Edit Template" : "Buat Template Baru"}
                </h2>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Upload gambar template → pakai AI untuk susun otomatis, atau drag field secara manual
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[hsl(var(--secondary))] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Left panel */}
              <div className="w-[220px] shrink-0 border-r border-[hsl(var(--border))] flex flex-col overflow-y-auto">
                <div className="p-3.5 space-y-3.5">
                  {/* Name */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Nama Template
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="cth: Kop Surat IGH"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Orientation */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Orientasi
                    </Label>
                    <div className="flex gap-1">
                      {(["landscape", "portrait"] as const).map((o) => (
                        <button
                          key={o}
                          onClick={() => setOrientation(o)}
                          className={`flex-1 h-7 rounded-lg text-[11px] font-medium border transition-colors ${
                            orientation === o
                              ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]"
                              : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] bg-white hover:bg-[hsl(var(--secondary))]"
                          }`}
                        >
                          {o === "landscape" ? "Landscape" : "Portrait"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Gambar Template
                    </Label>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-9 rounded-lg border-2 border-dashed border-[hsl(var(--border))] flex items-center justify-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors bg-white"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {backgroundImage ? "Ganti Gambar" : "Upload JPG/PNG"}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    {sizeWarning && (
                      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertCircle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 leading-tight">
                          Gambar besar (&gt;3MB) mungkin lambat. Kompres dulu untuk performa terbaik.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── AI Assist ── */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Bantuan AI
                    </Label>

                    <button
                      onClick={handleAiAnalyze}
                      disabled={!backgroundImage || aiLoading}
                      className={`w-full h-10 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all ${
                        !backgroundImage
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : aiLoading
                          ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white opacity-80 cursor-wait"
                          : aiSuccess
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                          : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 shadow-md hover:shadow-lg"
                      }`}
                    >
                      {aiLoading ? (
                        <>
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Menganalisis...
                        </>
                      ) : aiSuccess ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Field Tersusun!
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Susun Otomatis (AI)
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-snug">
                      {!backgroundImage
                        ? "Upload gambar template dulu untuk menggunakan fitur ini."
                        : "AI akan menganalisis zona header, konten, dan footer dari gambar kamu, lalu menyusun semua field secara otomatis."}
                    </p>
                  </div>

                  {/* Field list */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Field Data
                    </Label>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">
                      Atau tambah manual lalu drag ke posisi
                    </p>
                    <div className="space-y-0.5">
                      {TEMPLATE_FIELD_DEFS.map((def, i) => {
                        const isAdded = usedKeys.has(def.key);
                        const color = FIELD_COLORS[i % FIELD_COLORS.length];
                        return (
                          <div
                            key={def.key}
                            className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-colors ${
                              isAdded
                                ? "bg-orange-50 text-orange-700"
                                : "hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: color }}
                              />
                              <span className="truncate">{def.label}</span>
                            </div>
                            {isAdded ? (
                              <button
                                onClick={() => removeField(def.key)}
                                className="ml-1 shrink-0 text-orange-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            ) : (
                              <button
                                onClick={() => addField(def.key)}
                                className="ml-1 shrink-0 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Canvas area */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Selected field toolbar */}
                {selectedField && (
                  <div className="px-4 py-2 border-b border-[hsl(var(--border))] flex items-center gap-4 shrink-0 bg-orange-50/70 flex-wrap">
                    <span className="text-xs font-semibold text-orange-700">{selectedField.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Ukuran:</span>
                      <Input
                        type="number"
                        min={6}
                        max={48}
                        value={selectedField.fontSize}
                        onChange={(e) =>
                          updateField(selected!, { fontSize: Number(e.target.value) })
                        }
                        className="h-6 w-14 text-xs px-2"
                      />
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">pt</span>
                    </div>
                    <button
                      onClick={() => updateField(selected!, { bold: !selectedField.bold })}
                      className={`h-6 px-2.5 rounded text-xs font-bold border transition-colors ${
                        selectedField.bold
                          ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]"
                          : "border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                      }`}
                    >
                      B
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Warna:</span>
                      <input
                        type="color"
                        value={selectedField.color}
                        onChange={(e) => updateField(selected!, { color: e.target.value })}
                        className="h-6 w-8 rounded cursor-pointer border border-[hsl(var(--border))]"
                      />
                    </div>
                    <button
                      onClick={() => removeField(selected!)}
                      className="ml-auto flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                )}

                {/* Template canvas */}
                <div
                  className="flex-1 overflow-auto p-4 flex items-center justify-center"
                  style={{
                    background:
                      "repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%) 0 0 / 20px 20px",
                    cursor: dragging ? "grabbing" : "default",
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {backgroundImage ? (
                    <div
                      ref={containerRef}
                      className="relative shadow-2xl select-none rounded-sm overflow-hidden"
                      style={{
                        aspectRatio:
                          orientation === "landscape" ? "841 / 595" : "595 / 841",
                        height:
                          orientation === "landscape"
                            ? "min(62vh, 480px)"
                            : "min(70vh, 560px)",
                        maxWidth: "100%",
                      }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setSelected(null);
                      }}
                    >
                      <img
                        src={backgroundImage}
                        alt="template"
                        className="w-full h-full object-fill"
                        draggable={false}
                      />

                      {/* AI scanning overlay */}
                      <AnimatePresence>
                        {aiLoading && (
                          <motion.div
                            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3"
                            style={{ background: "rgba(109,40,217,0.12)", backdropFilter: "blur(2px)" }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            {/* Scanning line */}
                            <motion.div
                              className="absolute left-0 right-0 h-0.5 z-40"
                              style={{ background: "linear-gradient(90deg, transparent, #7c3aed, #a78bfa, #7c3aed, transparent)" }}
                              animate={{ top: ["0%", "100%", "0%"] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                            {/* Scan grid lines */}
                            {[20, 40, 60, 80].map((pct) => (
                              <div
                                key={pct}
                                className="absolute left-0 right-0 h-px"
                                style={{ top: `${pct}%`, background: "rgba(124,58,237,0.15)" }}
                              />
                            ))}
                            {[25, 50, 75].map((pct) => (
                              <div
                                key={pct}
                                className="absolute top-0 bottom-0 w-px"
                                style={{ left: `${pct}%`, background: "rgba(124,58,237,0.15)" }}
                              />
                            ))}

                            {/* Message pill */}
                            <motion.div
                              className="relative z-50 px-4 py-2 rounded-full text-white text-[12px] font-bold flex items-center gap-2 shadow-lg"
                              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                              animate={{ scale: [1, 1.04, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              AI sedang menganalisis zona template...
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Success flash */}
                      <AnimatePresence>
                        {aiSuccess && (
                          <motion.div
                            className="absolute inset-0 z-30 flex items-start justify-center pt-4 pointer-events-none"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                          >
                            <div className="px-4 py-2 rounded-full bg-green-500 text-white text-[12px] font-bold flex items-center gap-2 shadow-lg">
                              <Check className="h-3.5 w-3.5" />
                              {fields.length} field berhasil disusun otomatis!
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Field badges */}
                      {fields.map((field) => {
                        const defIndex = TEMPLATE_FIELD_DEFS.findIndex(
                          (d) => d.key === field.key
                        );
                        const color = FIELD_COLORS[defIndex % FIELD_COLORS.length];
                        const isSelected = selected === field.key;
                        return (
                          <motion.div
                            key={field.key}
                            className="absolute select-none"
                            style={{
                              left: `${field.x}%`,
                              top: `${field.y}%`,
                              transform: "translate(-50%, -50%)",
                              zIndex: isSelected ? 20 : 10,
                            }}
                            initial={{ opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            onMouseDown={(e) => handleMouseDown(e, field.key)}
                          >
                            <div
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[9px] font-medium shadow-md cursor-grab active:cursor-grabbing transition-transform ${
                                isSelected ? "scale-110 ring-2 ring-white ring-offset-1" : ""
                              }`}
                              style={{ background: color, opacity: 0.9 }}
                            >
                              <GripVertical className="h-2.5 w-2.5 opacity-70 shrink-0" />
                              {field.label}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center max-w-xs px-4">
                      <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-[hsl(var(--border))]">
                        <ImageIcon
                          className="h-10 w-10 text-[hsl(var(--muted-foreground))]"
                          strokeWidth={1}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          Upload template terlebih dahulu
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                          Upload gambar (JPG/PNG) kop surat atau desain penawaran kamu, lalu gunakan AI untuk menyusun field secara otomatis.
                        </p>
                      </div>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="btn-primary h-9 px-5 rounded-xl text-sm flex items-center gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Gambar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[hsl(var(--border))] flex items-center justify-between shrink-0">
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {fields.length} field terpasang
                {selectedField && (
                  <span className="ml-2 text-orange-600 font-medium">
                    · Klik badge untuk edit, drag untuk pindah posisi
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenChange(false)}
                  className="btn-ghost h-9 px-4 text-sm rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="btn-primary h-9 px-5 text-sm rounded-xl flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  Simpan Template
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
