import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Type, Image as ImageIcon, Square, Circle, Minus, List,
  Sparkles, Trash2, Copy, ArrowUp, ArrowDown,
  Save, Upload, Eye, Undo2, Redo2,
  AlignStartVertical, AlignCenterHorizontal, AlignEndVertical,
  AlignStartHorizontal, AlignCenterVertical, AlignEndHorizontal,
  Maximize2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  type CanvasTemplate,
  type CanvasElement,
  type SmartKey,
  type ShapeKind,
  type FontFamily,
  SMART_KEY_LABELS,
  FONT_FAMILY_LABELS,
  FONT_FAMILY_CSS,
  getPageDimsPt,
} from "./types";
import { CanvasTemplateView } from "./renderHtml";
import { PLACEHOLDER_CTX, type BindingContext } from "./dataBinding";
import { pdfFirstPageToEditable, type PdfTextItem } from "@/lib/pdfToImage";
import { detectSmartKey } from "./placeholderDetect";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CanvasTemplate | null;
  ctx?: BindingContext;
  onSave: (t: Omit<CanvasTemplate, "id" | "createdAt" | "updatedAt">) => void;
}

type DragMode =
  | { kind: "move"; id: string; startMx: number; startMy: number; ox: number; oy: number }
  | { kind: "resize"; id: string; handle: "br" | "tr" | "bl" | "tl" | "r" | "b"; startMx: number; startMy: number; ox: number; oy: number; ow: number; oh: number };

type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom" | "fill-w" | "fill-h";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

const COLOR_SWATCHES = [
  "#000000", "#ffffff", "#f97316", "#ea580c", "#102463", "#c99841",
  "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#f59e0b", "#666666",
  "#888888", "#cccccc", "#fef3c7", "#fee2e2", "#dcfce7", "#dbeafe",
];

const SNAP_THRESHOLD = 1.8;

export function CanvasTemplateEditor({
  open,
  onOpenChange,
  initial,
  ctx,
  onSave,
}: Props) {
  const [template, setTemplate] = useState<CanvasTemplate>(() => emptyTemplate());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [fileDragOver, setFileDragOver] = useState<null | "element" | "background">(null);
  const [snapGuides, setSnapGuides] = useState<{ h?: number; v?: number }>({});
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const previewCtx = ctx ?? PLACEHOLDER_CTX;

  const histStack = useRef<CanvasTemplate[]>([]);
  const histPos = useRef<number>(0);
  const clipboardRef = useRef<CanvasElement | null>(null);
  const latestTemplate = useRef<CanvasTemplate>(emptyTemplate());

  useEffect(() => { latestTemplate.current = template; }, [template]);

  const stateRef = useRef({ selectedId, editingTextId, template });
  useEffect(() => { stateRef.current = { selectedId, editingTextId, template }; });

  /* ─── History ─── */
  function updateHistFlags() {
    setCanUndo(histPos.current > 0);
    setCanRedo(histPos.current < histStack.current.length - 1);
  }

  function initHistory(t: CanvasTemplate) {
    histStack.current = [JSON.parse(JSON.stringify(t))];
    histPos.current = 0;
    updateHistFlags();
  }

  function commitToHistory(t: CanvasTemplate) {
    histStack.current = histStack.current.slice(0, histPos.current + 1);
    histStack.current.push(JSON.parse(JSON.stringify(t)));
    if (histStack.current.length > 50) histStack.current.shift();
    else histPos.current++;
    updateHistFlags();
  }

  function undo() {
    if (histPos.current <= 0) return;
    histPos.current--;
    const t = JSON.parse(JSON.stringify(histStack.current[histPos.current])) as CanvasTemplate;
    latestTemplate.current = t;
    setTemplate(t);
    setSelectedId(null);
    updateHistFlags();
  }

  function redo() {
    if (histPos.current >= histStack.current.length - 1) return;
    histPos.current++;
    const t = JSON.parse(JSON.stringify(histStack.current[histPos.current])) as CanvasTemplate;
    latestTemplate.current = t;
    setTemplate(t);
    setSelectedId(null);
    updateHistFlags();
  }

  /* ─── Reset on open ─── */
  useEffect(() => {
    if (open) {
      const t = initial ?? emptyTemplate();
      setTemplate(t);
      setSelectedId(null);
      setDrag(null);
      setEditingTextId(null);
      setSnapGuides({});
      initHistory(t);
    }
  }, [open, initial]);

  const selected = template.elements.find((e) => e.id === selectedId) ?? null;

  /* ─── Element CRUD ─── */
  function addElement(el: CanvasElement) {
    setTemplate((t) => {
      const newT = { ...t, elements: [...t.elements, { ...el, z: nextZ(t.elements) }] };
      commitToHistory(newT);
      return newT;
    });
    setSelectedId(el.id);
  }

  function patchSelected(updates: Partial<CanvasElement>) {
    if (!selectedId) return;
    setTemplate((t) => ({
      ...t,
      elements: t.elements.map((e) =>
        e.id === selectedId ? ({ ...e, ...updates } as CanvasElement) : e
      ),
    }));
  }

  function replaceSelected(newEl: CanvasElement) {
    if (!selectedId) return;
    setTemplate((t) => {
      const newT = {
        ...t,
        elements: t.elements.map((e) => (e.id === selectedId ? newEl : e)),
      };
      commitToHistory(newT);
      return newT;
    });
  }

  function patchSelectedAndCommit(updates: Partial<CanvasElement>) {
    if (!selectedId) return;
    setTemplate((t) => {
      const newT = {
        ...t,
        elements: t.elements.map((e) =>
          e.id === selectedId ? ({ ...e, ...updates } as CanvasElement) : e
        ),
      };
      commitToHistory(newT);
      return newT;
    });
  }

  function deleteSelected() {
    if (!stateRef.current.selectedId) return;
    const sid = stateRef.current.selectedId;
    setTemplate((t) => {
      const newT = { ...t, elements: t.elements.filter((e) => e.id !== sid) };
      commitToHistory(newT);
      return newT;
    });
    setSelectedId(null);
  }

  function duplicateSelected() {
    const sel = stateRef.current.template.elements.find(e => e.id === stateRef.current.selectedId) ?? null;
    if (!sel) return;
    const copy: CanvasElement = {
      ...sel,
      id: uid(sel.type),
      x: Math.min(95, sel.x + 3),
      y: Math.min(95, sel.y + 3),
      z: nextZ(stateRef.current.template.elements),
    } as CanvasElement;
    setTemplate((t) => {
      const newT = { ...t, elements: [...t.elements, copy] };
      commitToHistory(newT);
      return newT;
    });
    setSelectedId(copy.id);
  }

  function bringForward() {
    if (!selected) return;
    const sorted = [...template.elements].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((e) => e.id === selected.id);
    if (idx === -1 || idx === sorted.length - 1) return;
    const next = sorted[idx + 1];
    const newT = {
      ...template,
      elements: template.elements.map((e) =>
        e.id === next.id ? { ...e, z: selected.z } : e.id === selected.id ? { ...e, z: next.z } : e
      ),
    };
    commitToHistory(newT);
    setTemplate(newT);
  }

  function sendBackward() {
    if (!selected) return;
    const sorted = [...template.elements].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((e) => e.id === selected.id);
    if (idx <= 0) return;
    const prev = sorted[idx - 1];
    const newT = {
      ...template,
      elements: template.elements.map((e) =>
        e.id === prev.id ? { ...e, z: selected.z } : e.id === selected.id ? { ...e, z: prev.z } : e
      ),
    };
    commitToHistory(newT);
    setTemplate(newT);
  }

  /* ─── Alignment ─── */
  function alignEl(mode: AlignMode) {
    if (!selected) return;
    const { x, y, w, h } = selected;
    let nx = x, ny = y, nw = w, nh = h;
    if (mode === "left") nx = 0;
    else if (mode === "hcenter") nx = (100 - w) / 2;
    else if (mode === "right") nx = 100 - w;
    else if (mode === "top") ny = 0;
    else if (mode === "vcenter") ny = (100 - h) / 2;
    else if (mode === "bottom") ny = 100 - h;
    else if (mode === "fill-w") { nx = 0; nw = 100; }
    else if (mode === "fill-h") { ny = 0; nh = 100; }
    const newT = {
      ...template,
      elements: template.elements.map((e) =>
        e.id === selectedId ? { ...e, x: nx, y: ny, w: nw, h: nh } : e
      ),
    };
    commitToHistory(newT);
    setTemplate(newT);
  }

  /* ─── Drag / Resize ─── */
  function onPageMouseDown(e: React.MouseEvent) {
    if (e.target === e.currentTarget) setSelectedId(null);
  }

  function startMove(e: React.MouseEvent, el: CanvasElement) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el.id);
    setDrag({ kind: "move", id: el.id, startMx: e.clientX, startMy: e.clientY, ox: el.x, oy: el.y });
  }

  function startResize(e: React.MouseEvent, el: CanvasElement, handle: DragMode extends { kind: "resize" } ? DragMode["handle"] : never) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el.id);
    setDrag({
      kind: "resize",
      id: el.id,
      handle,
      startMx: e.clientX,
      startMy: e.clientY,
      ox: el.x,
      oy: el.y,
      ow: el.w,
      oh: el.h,
    });
  }

  useEffect(() => {
    if (!drag) return;
    function onMove(ev: MouseEvent) {
      const page = pageRef.current;
      if (!page) return;
      const rect = page.getBoundingClientRect();
      const dxPct = ((ev.clientX - drag!.startMx) / rect.width) * 100;
      const dyPct = ((ev.clientY - drag!.startMy) / rect.height) * 100;

      setTemplate((t) => ({
        ...t,
        elements: t.elements.map((e) => {
          if (e.id !== drag!.id) return e;
          if (drag!.kind === "move") {
            let nx = clamp(drag!.ox + dxPct, 0, 100 - e.w);
            let ny = clamp(drag!.oy + dyPct, 0, 100 - e.h);
            const cx = nx + e.w / 2;
            const cy = ny + e.h / 2;
            const newGuides: { h?: number; v?: number } = {};
            if (Math.abs(cx - 50) < SNAP_THRESHOLD) { nx = 50 - e.w / 2; newGuides.v = 50; }
            if (Math.abs(cy - 50) < SNAP_THRESHOLD) { ny = 50 - e.h / 2; newGuides.h = 50; }
            setSnapGuides(newGuides);
            return { ...e, x: nx, y: ny };
          }
          const d = drag!;
          let nx = d.ox, ny = d.oy, nw = d.ow, nh = d.oh;
          if (d.handle === "br" || d.handle === "tr" || d.handle === "r") nw = clamp(d.ow + dxPct, 1, 100 - d.ox);
          if (d.handle === "bl" || d.handle === "tl") {
            nx = clamp(d.ox + dxPct, 0, d.ox + d.ow - 1);
            nw = clamp(d.ow - dxPct, 1, d.ox + d.ow);
          }
          if (d.handle === "br" || d.handle === "bl" || d.handle === "b") nh = clamp(d.oh + dyPct, 1, 100 - d.oy);
          if (d.handle === "tr" || d.handle === "tl") {
            ny = clamp(d.oy + dyPct, 0, d.oy + d.oh - 1);
            nh = clamp(d.oh - dyPct, 1, d.oy + d.oh);
          }
          return { ...e, x: nx, y: ny, w: nw, h: nh };
        }),
      }));
    }
    function onUp() {
      setDrag(null);
      setSnapGuides({});
      commitToHistory(latestTemplate.current);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      const { selectedId, editingTextId, template } = stateRef.current;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if (e.key === "Escape") {
        if (editingTextId) {
          setEditingTextId(null);
          commitToHistory(latestTemplate.current);
        } else {
          setSelectedId(null);
        }
        e.preventDefault();
        return;
      }

      if (isInput) return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !editingTextId) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
          return;
        }
        if (e.key === "y" || e.key === "Y") {
          e.preventDefault();
          redo();
          return;
        }
        if ((e.key === "d" || e.key === "D") && !editingTextId) {
          e.preventDefault();
          duplicateSelected();
          return;
        }
        if ((e.key === "c" || e.key === "C") && !editingTextId) {
          const sel = template.elements.find(el => el.id === selectedId);
          if (sel) clipboardRef.current = JSON.parse(JSON.stringify(sel));
          return;
        }
        if ((e.key === "v" || e.key === "V") && !editingTextId) {
          e.preventDefault();
          if (clipboardRef.current) {
            const paste: CanvasElement = {
              ...clipboardRef.current,
              id: uid(clipboardRef.current.type),
              x: Math.min(95, clipboardRef.current.x + 3),
              y: Math.min(95, clipboardRef.current.y + 3),
            } as CanvasElement;
            setTemplate((t) => {
              const newT = { ...t, elements: [...t.elements, { ...paste, z: nextZ(t.elements) }] };
              commitToHistory(newT);
              return newT;
            });
            setSelectedId(paste.id);
          }
          return;
        }
      }

      if (selectedId && !editingTextId && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 2 : 0.5;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setTemplate((t) => ({
          ...t,
          elements: t.elements.map((el) =>
            el.id !== selectedId ? el :
            { ...el, x: clamp(el.x + dx, 0, 100 - el.w), y: clamp(el.y + dy, 0, 100 - el.h) }
          ),
        }));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* ─── Toolbar adders ─── */
  function addText() {
    addElement({
      id: uid("text"), type: "text", x: 10, y: 10, w: 30, h: 6, z: 0,
      text: "Teks baru", fontSize: 12, fontWeight: "normal", fontStyle: "normal",
      align: "left", color: "#102463",
    });
  }
  function addSmart(key: SmartKey) {
    addElement({
      id: uid("smart"), type: "smart", x: 10, y: 10, w: 35, h: 6, z: 0,
      smartKey: key, fontSize: 12, fontWeight: "bold", fontStyle: "normal",
      align: "left", color: "#102463",
      format: key === "pricePerPax" || key === "priceTotal" ? "currency-idr" : "plain",
    });
  }
  function addShape(shape: ShapeKind) {
    addElement({
      id: uid("shape"), type: "shape", x: 10, y: 10, w: 20, h: 8, z: 0,
      shape, fill: shape === "line" ? "transparent" : "#ea580c",
      stroke: shape === "line" ? "#000000" : "transparent",
      strokeWidth: shape === "line" ? 1 : 0,
    });
  }
  function addBullet(source: "included" | "excluded" | "custom") {
    addElement({
      id: uid("bullet"), type: "bullet", x: 5, y: 50, w: 40, h: 30, z: 0,
      source, items: source === "custom" ? ["Item 1", "Item 2"] : undefined,
      fontSize: 9, fontWeight: "normal", color: "#3a2f22",
      bulletColor: source === "included" ? "#10b981" : source === "excluded" ? "#ef4444" : "#666666",
      title: source === "included" ? "TERMASUK" : source === "excluded" ? "TIDAK TERMASUK" : "DAFTAR",
      titleBg: source === "included" ? "#ecfdf5" : source === "excluded" ? "#fef2f2" : "#f5f5f5",
      titleColor: source === "included" ? "#047857" : source === "excluded" ? "#b91c1c" : "#333333",
      maxItems: 12,
    });
  }
  function addImageFromFile(file: File, atX = 10, atY = 10) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const w = 25, h = 15;
      addElement({
        id: uid("img"), type: "image",
        x: Math.max(0, Math.min(100 - w, atX - w / 2)),
        y: Math.max(0, Math.min(100 - h, atY - h / 2)),
        w, h, z: 0,
        src: dataUrl, fit: "contain",
      });
    };
    reader.readAsDataURL(file);
  }

  /* ─── Background image / PDF ─── */
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [bgLoading, setBgLoading] = useState(false);

  function applyBgDataUrl(dataUrl: string, opts?: { orientation?: "portrait" | "landscape" }) {
    setTemplate((t) => {
      const newT = {
        ...t,
        backgroundImage: dataUrl,
        ...(opts?.orientation ? { orientation: opts.orientation } : {}),
      };
      commitToHistory(newT);
      return newT;
    });
  }

  function textItemsToElements(
    items: PdfTextItem[],
    widthPt: number,
    heightPt: number
  ): CanvasElement[] {
    return items.map((it, i) => {
      const xPct = (it.xPt / widthPt) * 100;
      const yPct = (it.yPt / heightPt) * 100;
      const wPct = Math.max(2, (it.widthPt / widthPt) * 100 + 1.5);
      const hPct = Math.max(1.5, (it.fontSizePt * 1.25 / heightPt) * 100);
      const baseGeom = {
        x: Math.max(0, Math.min(100, xPct)),
        y: Math.max(0, Math.min(100, yPct)),
        w: Math.min(100, wPct),
        h: hPct,
        z: 5,
      };
      const detectedKey = detectSmartKey(it.str);
      if (detectedKey) {
        return {
          id: uid(`pdfsmart-${i}`),
          type: "smart",
          smartKey: detectedKey,
          ...baseGeom,
          fontSize: it.fontSizePt,
          fontFamily: it.fontFamily,
          fontWeight: it.bold ? "bold" : "normal",
          fontStyle: it.italic ? "italic" : "normal",
          align: "left",
          color: it.color || "#000000",
          format: detectedKey === "pricePerPax" || detectedKey === "priceTotal" ? "currency-idr" : "plain",
        } as CanvasElement;
      }
      return {
        id: uid(`pdftxt-${i}`),
        type: "text",
        text: it.str,
        ...baseGeom,
        fontSize: it.fontSizePt,
        fontFamily: it.fontFamily,
        fontWeight: it.bold ? "bold" : "normal",
        fontStyle: it.italic ? "italic" : "normal",
        align: "left",
        color: it.color || "#000000",
        lineHeight: 1,
      } as CanvasElement;
    });
  }

  function autoTagPlaceholders() {
    let count = 0;
    setTemplate((t) => {
      const newElements = t.elements.map((el) => {
        if (el.type !== "text") return el;
        const key = detectSmartKey(el.text);
        if (!key) return el;
        count += 1;
        const smartEl: CanvasElement = {
          id: el.id,
          type: "smart",
          smartKey: key,
          x: el.x, y: el.y, w: el.w, h: el.h, z: el.z,
          fontSize: el.fontSize,
          fontFamily: el.fontFamily,
          fontWeight: el.fontWeight,
          fontStyle: el.fontStyle,
          align: el.align,
          color: el.color,
          backgroundColor: el.backgroundColor,
          paddingX: el.paddingX,
          paddingY: el.paddingY,
          format: key === "pricePerPax" || key === "priceTotal" ? "currency-idr" : "plain",
        };
        return smartEl;
      });
      const newT = { ...t, elements: newElements };
      commitToHistory(newT);
      return newT;
    });
    setTimeout(() => {
      alert(count > 0 ? `Beres! ${count} placeholder ke-tag jadi slot otomatis.` : "Gak ketemu placeholder yang bisa di-auto-tag.");
    }, 50);
  }

  async function setBgImageFromFile(file: File) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (isPdf) {
      try {
        setBgLoading(true);
        const buf = await file.arrayBuffer();
        const editable = await pdfFirstPageToEditable(buf, 2);
        const wantEditable =
          editable.textItems.length > 0 &&
          window.confirm(
            `Ditemuin ${editable.textItems.length} potongan teks di PDF ini.\n\n` +
              `Klik OK biar teks-teksnya jadi element yang bisa lo edit langsung (latar di-bersihin dari teks asli).\n` +
              `Klik Batal kalo lo cuma mau pake PDF sebagai gambar latar aja.`
          );
        if (wantEditable) {
          setTemplate((t) => {
            const newT = {
              ...t,
              backgroundImage: editable.cleanedDataUrl,
              orientation: editable.orientation,
              customWidthPt: editable.widthPt,
              customHeightPt: editable.heightPt,
              elements: [
                ...t.elements,
                ...textItemsToElements(editable.textItems, editable.widthPt, editable.heightPt),
              ],
            };
            commitToHistory(newT);
            return newT;
          });
        } else {
          setTemplate((t) => {
            const newT = {
              ...t,
              backgroundImage: editable.dataUrl,
              orientation: editable.orientation,
              customWidthPt: editable.widthPt,
              customHeightPt: editable.heightPt,
            };
            commitToHistory(newT);
            return newT;
          });
        }
      } catch (err) {
        console.error(err);
        alert("Gagal baca PDF. Coba file lain atau export halaman jadi gambar dulu ya.");
      } finally {
        setBgLoading(false);
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => applyBgDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  /* ─── Save ─── */
  function handleSave() {
    if (!template.name.trim()) return;
    onSave({
      name: template.name.trim(),
      pageSize: template.pageSize,
      orientation: template.orientation,
      backgroundColor: template.backgroundColor,
      backgroundImage: template.backgroundImage,
      elements: template.elements,
    });
    onOpenChange(false);
  }

  /* ─── Page dims for canvas sizing ─── */
  const { wPt, hPt } = useMemo(() => getPageDimsPt(template), [template.pageSize, template.orientation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-[98vw] h-[95vh] p-0 overflow-hidden flex flex-col rounded-2xl">
        {/* ── Top bar ── */}
        <div className="px-4 py-3 border-b bg-white flex items-center gap-3 shrink-0 flex-wrap">
          <Sparkles className="h-4 w-4 text-orange-500 shrink-0" />
          <Input
            value={template.name}
            onChange={(e) => setTemplate((t) => ({ ...t, name: e.target.value }))}
            placeholder="Nama template"
            className="h-9 max-w-xs text-sm font-bold"
          />

          <div className="flex items-center gap-1 ml-2">
            {(["a4", "a5", "letter"] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setTemplate((t) => ({ ...t, pageSize: sz, customWidthPt: undefined, customHeightPt: undefined }))}
                className={`h-7 px-2 rounded text-[11px] font-bold uppercase ${
                  template.pageSize === sz ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(["portrait", "landscape"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setTemplate((t) => ({ ...t, orientation: o }))}
                className={`h-7 px-2 rounded text-[11px] font-medium capitalize ${
                  template.orientation === o ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {o}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Label className="text-[10px] text-slate-500">BG</Label>
            <input
              type="color"
              value={template.backgroundColor}
              onChange={(e) => setTemplate((t) => ({ ...t, backgroundColor: e.target.value }))}
              className="h-7 w-7 rounded cursor-pointer border border-slate-200"
            />
            <button
              onClick={() => bgFileRef.current?.click()}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("Files")) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  e.currentTarget.classList.add("ring-2", "ring-orange-400", "bg-orange-100");
                }
              }}
              onDragLeave={(e) =>
                e.currentTarget.classList.remove("ring-2", "ring-orange-400", "bg-orange-100")
              }
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-2", "ring-orange-400", "bg-orange-100");
                const f = Array.from(e.dataTransfer.files).find(
                  (x) => x.type.startsWith("image/") || x.type === "application/pdf" || /\.pdf$/i.test(x.name)
                );
                if (f) setBgImageFromFile(f);
              }}
              disabled={bgLoading}
              className="h-7 px-2 rounded text-[11px] bg-slate-100 hover:bg-slate-200 flex items-center gap-1 disabled:opacity-50"
              title="Klik atau drop gambar / PDF buat dijadiin latar"
            >
              <Upload className="h-3 w-3" />
              {bgLoading ? "Memuat..." : template.backgroundImage ? "Ganti" : "Latar (PDF/IMG)"}
            </button>
            {template.backgroundImage && (
              <button
                onClick={() => setTemplate((t) => ({ ...t, backgroundImage: undefined }))}
                className="h-7 px-2 rounded text-[11px] bg-rose-50 text-rose-700 hover:bg-rose-100"
              >
                Hapus latar
              </button>
            )}
            <button
              onClick={autoTagPlaceholders}
              className="h-7 px-2 rounded text-[11px] bg-violet-100 hover:bg-violet-200 text-violet-800 font-semibold flex items-center gap-1"
              title="Scan semua teks, deteksi placeholder dalam kurung kayak (Nama Customer), (Tanggal), trus auto-tag jadi slot otomatis"
            >
              ✨ Auto-Tag Placeholder
            </button>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setBgImageFromFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="h-7 w-7 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="h-7 w-7 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">
              <X className="h-4 w-4 mr-1" /> Batal
            </Button>
            <Button onClick={handleSave} className="h-9 bg-orange-500 hover:bg-orange-600 text-white">
              <Save className="h-4 w-4 mr-1" /> Simpan
            </Button>
          </div>
        </div>

        {/* ── Workspace ── */}
        <div className="flex-1 grid grid-cols-[200px_minmax(0,1fr)_280px] overflow-hidden">
          {/* Left: tool palette */}
          <div className="border-r bg-slate-50 p-3 overflow-y-auto space-y-3">
            <ToolSection title="Elemen Dasar">
              <ToolButton icon={<Type className="h-3.5 w-3.5" />} label="Teks" onClick={addText} />
              <FileToolButton icon={<ImageIcon className="h-3.5 w-3.5" />} label="Gambar"
                onPick={addImageFromFile} accept="image/*" />
            </ToolSection>

            <ToolSection title="Bentuk">
              <ToolButton icon={<Square className="h-3.5 w-3.5" />} label="Kotak" onClick={() => addShape("rect")} />
              <ToolButton icon={<Circle className="h-3.5 w-3.5" />} label="Lingkaran" onClick={() => addShape("ellipse")} />
              <ToolButton icon={<Minus className="h-3.5 w-3.5" />} label="Garis" onClick={() => addShape("line")} />
            </ToolSection>

            <ToolSection title="Daftar Bullet">
              <ToolButton icon={<List className="h-3.5 w-3.5" />} label="Termasuk" onClick={() => addBullet("included")} />
              <ToolButton icon={<List className="h-3.5 w-3.5" />} label="Tidak Termasuk" onClick={() => addBullet("excluded")} />
              <ToolButton icon={<List className="h-3.5 w-3.5" />} label="Custom" onClick={() => addBullet("custom")} />
            </ToolSection>

            <ToolSection title="Smart Block (auto)">
              <div className="grid gap-1">
                {(Object.keys(SMART_KEY_LABELS) as SmartKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => addSmart(k)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-left bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <Sparkles className="h-3 w-3 text-orange-500 shrink-0" />
                    <span className="truncate">{SMART_KEY_LABELS[k]}</span>
                  </button>
                ))}
              </div>
            </ToolSection>

            {/* Shortcut cheatsheet */}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Shortcut</p>
              {[
                ["Del", "Hapus"],
                ["↑↓←→", "Geser 0.5%"],
                ["Shift+↑↓←→", "Geser 2%"],
                ["Ctrl+Z", "Undo"],
                ["Ctrl+Y", "Redo"],
                ["Ctrl+D", "Duplikat"],
                ["Ctrl+C / V", "Salin / Tempel"],
                ["Dbl-klik teks", "Edit langsung"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-1">
                  <kbd className="text-[9px] bg-white border border-slate-200 rounded px-1 py-0.5 font-mono shrink-0">{key}</kbd>
                  <span className="text-[9px] text-slate-500 text-right">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Center: canvas */}
          <div
            className={`bg-slate-200 overflow-auto flex items-center justify-center p-6 relative transition-colors ${
              fileDragOver ? "bg-orange-100" : ""
            }`}
            onClick={() => setSelectedId(null)}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes("Files")) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setFileDragOver(e.shiftKey ? "background" : "element");
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setFileDragOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const wasBg = fileDragOver === "background" || e.shiftKey;
              setFileDragOver(null);
              const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
              if (!f) return;
              if (wasBg) {
                setBgImageFromFile(f);
              } else {
                const rect = pageRef.current?.getBoundingClientRect();
                if (rect && rect.width > 0 && rect.height > 0) {
                  const xPct = ((e.clientX - rect.left) / rect.width) * 100;
                  const yPct = ((e.clientY - rect.top) / rect.height) * 100;
                  addImageFromFile(f, xPct, yPct);
                } else {
                  addImageFromFile(f);
                }
              }
            }}
          >
            {fileDragOver && (
              <div className="absolute inset-4 pointer-events-none rounded-2xl border-2 border-dashed border-orange-500 bg-orange-50/60 flex items-center justify-center z-10">
                <div className="bg-white px-4 py-2 rounded-xl shadow text-sm font-semibold text-orange-700 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {fileDragOver === "background"
                    ? "Lepas untuk jadi gambar latar"
                    : "Lepas untuk tambah gambar (tahan Shift = jadi latar)"}
                </div>
              </div>
            )}
            <div
              className="relative"
              style={{ width: "min(100%, 880px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <CanvasTemplateView
                template={template}
                ctx={previewCtx}
                fitWidth={Math.min(880, Math.round((wPt / hPt) * 700))}
                pageRef={pageRef}
                interactive
                overlay={
                  <div
                    className="absolute inset-0"
                    onMouseDown={onPageMouseDown}
                  >
                    {/* Snap guides */}
                    {snapGuides.h !== undefined && (
                      <div
                        className="absolute left-0 right-0 pointer-events-none z-20"
                        style={{
                          top: `${snapGuides.h}%`,
                          borderTop: "1.5px dashed #f97316",
                          opacity: 0.85,
                        }}
                      />
                    )}
                    {snapGuides.v !== undefined && (
                      <div
                        className="absolute top-0 bottom-0 pointer-events-none z-20"
                        style={{
                          left: `${snapGuides.v}%`,
                          borderLeft: "1.5px dashed #f97316",
                          opacity: 0.85,
                        }}
                      />
                    )}

                    {template.elements.map((el) => {
                      const isSel = el.id === selectedId;
                      const isEditingText = el.id === editingTextId;
                      return (
                        <div
                          key={el.id}
                          className={`absolute ${isSel ? "ring-2 ring-orange-500" : "ring-1 ring-transparent hover:ring-orange-300"}`}
                          style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            height: `${el.h}%`,
                            cursor: drag?.kind === "move" && drag.id === el.id ? "grabbing" : "grab",
                            background: "transparent",
                          }}
                          onMouseDown={(e) => startMove(e, el)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(el.id);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (el.type === "text") {
                              setSelectedId(el.id);
                              setEditingTextId(el.id);
                            }
                          }}
                        >
                          {isEditingText && el.type === "text" && (
                            <textarea
                              autoFocus
                              value={el.text}
                              onChange={(ev) => patchSelected({ text: ev.target.value })}
                              onBlur={() => {
                                setEditingTextId(null);
                                commitToHistory(latestTemplate.current);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setEditingTextId(null);
                                  commitToHistory(latestTemplate.current);
                                }
                                e.stopPropagation();
                              }}
                              className="absolute inset-0 w-full h-full resize-none bg-white/90 border-2 border-orange-500 rounded p-1 outline-none z-30"
                              style={{
                                fontWeight: el.fontWeight,
                                fontStyle: el.fontStyle,
                                textAlign: el.align,
                                color: el.color,
                                fontSize: `clamp(8px, ${el.fontSize * 0.9}px, 24px)`,
                              }}
                            />
                          )}
                          {isSel && (
                            <>
                              <ResizeHandle pos="tl" onDown={(e) => startResize(e, el, "tl")} />
                              <ResizeHandle pos="tr" onDown={(e) => startResize(e, el, "tr")} />
                              <ResizeHandle pos="bl" onDown={(e) => startResize(e, el, "bl")} />
                              <ResizeHandle pos="br" onDown={(e) => startResize(e, el, "br")} />
                              <ResizeHandle pos="r" onDown={(e) => startResize(e, el, "r")} />
                              <ResizeHandle pos="b" onDown={(e) => startResize(e, el, "b")} />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                }
              />
            </div>
          </div>

          {/* Right: properties */}
          <div className="border-l bg-white p-3 overflow-y-auto">
            {selected ? (
              <PropertyPanel
                el={selected}
                onChange={patchSelected}
                onReplace={replaceSelected}
                onCommit={() => commitToHistory(latestTemplate.current)}
                onDelete={deleteSelected}
                onDuplicate={duplicateSelected}
                onForward={bringForward}
                onBackward={sendBackward}
                onAlign={alignEl}
              />
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-[11px]">Pilih elemen untuk mengedit propertinya.</p>
                <p className="text-[10px] mt-2 text-slate-500">
                  Total elemen: <strong>{template.elements.length}</strong>
                </p>
                <p className="text-[9px] mt-3 text-slate-400">
                  Dbl-klik teks → edit langsung
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Subcomponents ─── */

function ToolSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{title}</p>
      <div className="grid grid-cols-2 gap-1">{children}</div>
    </div>
  );
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 py-2 rounded text-[10px] font-medium bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FileToolButton({
  icon,
  label,
  onPick,
  accept,
}: {
  icon: React.ReactNode;
  label: string;
  onPick: (f: File) => void;
  accept: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
          if (f) onPick(f);
        }}
        className={`flex flex-col items-center justify-center gap-1 py-2 rounded text-[10px] font-medium bg-white border transition-colors ${
          over
            ? "border-orange-500 bg-orange-100 ring-2 ring-orange-300"
            : "border-slate-200 hover:border-orange-300 hover:bg-orange-50"
        }`}
        title="Klik atau drop gambar di sini"
      >
        {icon}
        <span>{label}</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

function ResizeHandle({
  pos,
  onDown,
}: {
  pos: "tl" | "tr" | "bl" | "br" | "r" | "b";
  onDown: (e: React.MouseEvent) => void;
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    width: 10,
    height: 10,
    background: "#fff",
    border: "1.5px solid #ea580c",
    borderRadius: 2,
    zIndex: 10,
  };
  if (pos === "tl") Object.assign(style, { top: -5, left: -5, cursor: "nwse-resize" });
  if (pos === "tr") Object.assign(style, { top: -5, right: -5, cursor: "nesw-resize" });
  if (pos === "bl") Object.assign(style, { bottom: -5, left: -5, cursor: "nesw-resize" });
  if (pos === "br") Object.assign(style, { bottom: -5, right: -5, cursor: "nwse-resize" });
  if (pos === "r") Object.assign(style, { top: "calc(50% - 5px)", right: -5, cursor: "ew-resize" });
  if (pos === "b") Object.assign(style, { bottom: -5, left: "calc(50% - 5px)", cursor: "ns-resize" });
  return <div style={style} onMouseDown={onDown} />;
}

function AlignmentBar({ onAlign }: { onAlign: (m: AlignMode) => void }) {
  const btns: [AlignMode, React.ReactNode, string][] = [
    ["left",    <AlignStartVertical className="h-3.5 w-3.5" />,      "Rata kiri halaman"],
    ["hcenter", <AlignCenterHorizontal className="h-3.5 w-3.5" />,   "Tengah horizontal"],
    ["right",   <AlignEndVertical className="h-3.5 w-3.5" />,        "Rata kanan halaman"],
    ["top",     <AlignStartHorizontal className="h-3.5 w-3.5" />,    "Rata atas halaman"],
    ["vcenter", <AlignCenterVertical className="h-3.5 w-3.5" />,     "Tengah vertikal"],
    ["bottom",  <AlignEndHorizontal className="h-3.5 w-3.5" />,      "Rata bawah halaman"],
    ["fill-w",  <Maximize2 className="h-3.5 w-3.5 rotate-90" />,     "Penuh lebar"],
    ["fill-h",  <Maximize2 className="h-3.5 w-3.5" />,               "Penuh tinggi"],
  ];
  return (
    <div>
      <Label className="text-[10px] text-slate-500 mb-1 block">Rata halaman</Label>
      <div className="grid grid-cols-4 gap-1">
        {btns.map(([mode, icon, title]) => (
          <button
            key={mode}
            title={title}
            onClick={() => onAlign(mode)}
            className="h-7 rounded flex items-center justify-center bg-slate-100 hover:bg-orange-100 hover:text-orange-600 text-slate-600 transition-colors"
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function PropertyPanel({
  el,
  onChange,
  onReplace,
  onCommit,
  onDelete,
  onDuplicate,
  onForward,
  onBackward,
  onAlign,
}: {
  el: CanvasElement;
  onChange: (u: Partial<CanvasElement>) => void;
  onReplace: (newEl: CanvasElement) => void;
  onCommit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onForward: () => void;
  onBackward: () => void;
  onAlign: (m: AlignMode) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-slate-600">{el.type}</span>
        <div className="flex items-center gap-1">
          <IconBtn title="Maju (layer)" onClick={onForward}><ArrowUp className="h-3 w-3" /></IconBtn>
          <IconBtn title="Mundur (layer)" onClick={onBackward}><ArrowDown className="h-3 w-3" /></IconBtn>
          <IconBtn title="Duplikat (Ctrl+D)" onClick={onDuplicate}><Copy className="h-3 w-3" /></IconBtn>
          <IconBtn title="Hapus (Del)" onClick={onDelete} danger><Trash2 className="h-3 w-3" /></IconBtn>
        </div>
      </div>

      <AlignmentBar onAlign={onAlign} />

      <PositionFields el={el} onChange={onChange} onCommit={onCommit} />

      {el.type === "text" && <TextFields el={el} onChange={onChange} onReplace={onReplace} onCommit={onCommit} />}
      {el.type === "smart" && <SmartFields el={el} onChange={onChange} onReplace={onReplace} onCommit={onCommit} />}
      {el.type === "shape" && <ShapeFields el={el} onChange={onChange} onCommit={onCommit} />}
      {el.type === "image" && <ImageFields el={el} onChange={onChange} onCommit={onCommit} />}
      {el.type === "bullet" && <BulletFields el={el} onChange={onChange} onCommit={onCommit} />}
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
        danger ? "hover:bg-rose-50 text-rose-600" : "hover:bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function PositionFields({ el, onChange, onCommit }: { el: CanvasElement; onChange: (u: Partial<CanvasElement>) => void; onCommit: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumField label="X (%)" value={el.x} onChange={(v) => onChange({ x: v })} onCommit={onCommit} />
      <NumField label="Y (%)" value={el.y} onChange={(v) => onChange({ y: v })} onCommit={onCommit} />
      <NumField label="Lebar (%)" value={el.w} onChange={(v) => onChange({ w: v })} onCommit={onCommit} />
      <NumField label="Tinggi (%)" value={el.h} onChange={(v) => onChange({ h: v })} onCommit={onCommit} />
    </div>
  );
}

function TextFields({
  el,
  onChange,
  onReplace,
  onCommit,
}: {
  el: Extract<CanvasElement, { type: "text" }>;
  onChange: (u: Partial<CanvasElement>) => void;
  onReplace: (newEl: CanvasElement) => void;
  onCommit: () => void;
}) {
  function convertToSmart(key: SmartKey) {
    const newEl: Extract<CanvasElement, { type: "smart" }> = {
      id: el.id,
      type: "smart",
      smartKey: key,
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      z: el.z,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      align: el.align,
      color: el.color,
      backgroundColor: el.backgroundColor,
      paddingX: el.paddingX,
      paddingY: el.paddingY,
      format: "plain",
    };
    onReplace(newEl);
  }
  return (
    <>
      <FieldGroup label="Isi Teks">
        <textarea
          value={el.text}
          onChange={(e) => onChange({ text: e.target.value })}
          onBlur={onCommit}
          rows={3}
          className="w-full text-[12px] p-2 border border-slate-200 rounded resize-none"
        />
      </FieldGroup>
      <FieldGroup label="Auto-isi dari Data Customer">
        <select
          value=""
          onChange={(e) => { if (e.target.value) convertToSmart(e.target.value as SmartKey); }}
          className="w-full h-8 text-[11px] border border-orange-300 bg-orange-50 rounded px-2 text-orange-900 font-medium"
        >
          <option value="">— Jadiin slot otomatis... —</option>
          {(Object.keys(SMART_KEY_LABELS) as SmartKey[]).map((k) => (
            <option key={k} value={k}>{SMART_KEY_LABELS[k]}</option>
          ))}
        </select>
        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
          Pilih biar teks ini auto-isi dari data Calculator pas bikin penawaran. Contoh: tag "PT Sahabat Tour" jadi <em>Nama Customer</em>.
        </p>
      </FieldGroup>
      <FontFields
        size={el.fontSize}
        family={el.fontFamily}
        weight={el.fontWeight}
        style={el.fontStyle}
        align={el.align}
        color={el.color}
        bg={el.backgroundColor}
        onChange={(p) => onChange(p)}
        onCommit={onCommit}
      />
    </>
  );
}

function SmartFields({
  el,
  onChange,
  onCommit,
}: {
  el: Extract<CanvasElement, { type: "smart" }>;
  onChange: (u: Partial<CanvasElement>) => void;
  onReplace: (newEl: CanvasElement) => void;
  onCommit: () => void;
}) {
  function convertToText() {
    const newEl: Extract<CanvasElement, { type: "text" }> = {
      id: el.id,
      type: "text",
      text: SMART_KEY_LABELS[el.smartKey] ?? "Teks",
      x: el.x, y: el.y, w: el.w, h: el.h, z: el.z,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      align: el.align,
      color: el.color,
      backgroundColor: el.backgroundColor,
      paddingX: el.paddingX,
      paddingY: el.paddingY,
    };
    onReplace(newEl);
  }
  return (
    <>
      <div className="px-2 py-1.5 rounded bg-orange-50 border border-orange-200 text-[10px] text-orange-900 leading-snug">
        <strong>Slot Otomatis</strong> — isinya bakal auto-isi pas bikin penawaran. Sekarang lagi nampilin contoh dummy.
      </div>
      <FieldGroup label="Field Sumber">
        <select
          value={el.smartKey}
          onChange={(e) => { onChange({ smartKey: e.target.value as SmartKey }); onCommit(); }}
          className="w-full h-8 text-[11px] border border-slate-200 rounded px-2"
        >
          {(Object.keys(SMART_KEY_LABELS) as SmartKey[]).map((k) => (
            <option key={k} value={k}>{SMART_KEY_LABELS[k]}</option>
          ))}
        </select>
      </FieldGroup>
      <FieldGroup label="Format">
        <select
          value={el.format ?? "plain"}
          onChange={(e) => { onChange({ format: e.target.value as Extract<CanvasElement, { type: "smart" }>["format"] }); onCommit(); }}
          className="w-full h-8 text-[11px] border border-slate-200 rounded px-2"
        >
          <option value="plain">Apa adanya</option>
          <option value="currency-idr">Rp xx.xxx.xxx</option>
          <option value="uppercase">HURUF BESAR</option>
        </select>
      </FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <FieldGroup label="Awalan">
          <Input value={el.prefix ?? ""} onChange={(e) => onChange({ prefix: e.target.value })} onBlur={onCommit} className="h-7 text-[11px]" />
        </FieldGroup>
        <FieldGroup label="Akhiran">
          <Input value={el.suffix ?? ""} onChange={(e) => onChange({ suffix: e.target.value })} onBlur={onCommit} className="h-7 text-[11px]" />
        </FieldGroup>
      </div>
      <FontFields
        size={el.fontSize}
        family={el.fontFamily}
        weight={el.fontWeight}
        style={el.fontStyle}
        align={el.align}
        color={el.color}
        bg={el.backgroundColor}
        onChange={(p) => onChange(p)}
        onCommit={onCommit}
      />
      <button
        onClick={convertToText}
        className="w-full h-7 text-[11px] rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
      >
        ← Balikin jadi teks biasa
      </button>
    </>
  );
}

function ShapeFields({
  el,
  onChange,
  onCommit,
}: {
  el: Extract<CanvasElement, { type: "shape" }>;
  onChange: (u: Partial<CanvasElement>) => void;
  onCommit: () => void;
}) {
  return (
    <>
      <FieldGroup label="Warna Isi">
        <ColorPicker value={el.fill} onChange={(v) => { onChange({ fill: v }); onCommit(); }} />
      </FieldGroup>
      <FieldGroup label="Warna Garis">
        <ColorPicker value={el.stroke} onChange={(v) => { onChange({ stroke: v }); onCommit(); }} />
      </FieldGroup>
      <NumField label="Tebal Garis (pt)" value={el.strokeWidth} onChange={(v) => onChange({ strokeWidth: v })} onCommit={onCommit} />
      {el.shape === "rect" && (
        <NumField label="Sudut (pt)" value={el.borderRadius ?? 0} onChange={(v) => onChange({ borderRadius: v })} onCommit={onCommit} />
      )}
    </>
  );
}

function ImageFields({
  el,
  onChange,
  onCommit,
}: {
  el: Extract<CanvasElement, { type: "image" }>;
  onChange: (u: Partial<CanvasElement>) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  function handleFile(f: File) {
    const r = new FileReader();
    r.onload = (ev) => { onChange({ src: ev.target?.result as string }); onCommit(); };
    r.readAsDataURL(f);
  }
  return (
    <>
      <FieldGroup label="Mode">
        <div className="flex gap-1">
          {(["contain", "cover"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { onChange({ fit: f }); onCommit(); }}
              className={`flex-1 h-7 rounded text-[11px] capitalize ${el.fit === f ? "bg-orange-500 text-white" : "bg-slate-100"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </FieldGroup>
      <button
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
          if (f) handleFile(f);
        }}
        className={`w-full h-8 rounded text-[11px] flex items-center justify-center gap-1.5 border-2 border-dashed transition-colors ${
          over
            ? "border-orange-500 bg-orange-100 text-orange-700"
            : "border-transparent bg-slate-100 hover:bg-slate-200"
        }`}
        title="Klik atau drop gambar di sini"
      >
        <Upload className="h-3 w-3" /> {over ? "Lepas untuk ganti" : "Ganti / drop gambar"}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          handleFile(f);
          e.target.value = "";
        }}
      />
      <NumField label="Sudut (px)" value={el.borderRadius ?? 0} onChange={(v) => onChange({ borderRadius: v })} onCommit={onCommit} />
    </>
  );
}

function BulletFields({
  el,
  onChange,
  onCommit,
}: {
  el: Extract<CanvasElement, { type: "bullet" }>;
  onChange: (u: Partial<CanvasElement>) => void;
  onCommit: () => void;
}) {
  return (
    <>
      <FieldGroup label="Sumber Item">
        <select
          value={el.source}
          onChange={(e) => { onChange({ source: e.target.value as Extract<CanvasElement, { type: "bullet" }>["source"] }); onCommit(); }}
          className="w-full h-8 text-[11px] border border-slate-200 rounded px-2"
        >
          <option value="included">Termasuk (auto)</option>
          <option value="excluded">Tidak Termasuk (auto)</option>
          <option value="custom">Custom (manual)</option>
        </select>
      </FieldGroup>
      {el.source === "custom" && (
        <FieldGroup label="Item (1 baris = 1 bullet)">
          <textarea
            value={(el.items ?? []).join("\n")}
            onChange={(e) => onChange({ items: e.target.value.split("\n").filter((s) => s.trim()) })}
            onBlur={onCommit}
            rows={5}
            className="w-full text-[11px] p-2 border border-slate-200 rounded resize-none"
          />
        </FieldGroup>
      )}
      <FieldGroup label="Judul">
        <Input value={el.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} onBlur={onCommit} className="h-7 text-[11px]" />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <FieldGroup label="Warna Judul">
          <ColorPicker value={el.titleColor ?? "#333"} onChange={(v) => { onChange({ titleColor: v }); onCommit(); }} />
        </FieldGroup>
        <FieldGroup label="Latar Judul">
          <ColorPicker value={el.titleBg ?? "#f5f5f5"} onChange={(v) => { onChange({ titleBg: v }); onCommit(); }} />
        </FieldGroup>
      </div>
      <NumField label="Ukuran (pt)" value={el.fontSize} onChange={(v) => onChange({ fontSize: v })} onCommit={onCommit} />
      <FieldGroup label="Warna Teks">
        <ColorPicker value={el.color} onChange={(v) => { onChange({ color: v }); onCommit(); }} />
      </FieldGroup>
      <FieldGroup label="Warna Bullet">
        <ColorPicker value={el.bulletColor ?? el.color} onChange={(v) => { onChange({ bulletColor: v }); onCommit(); }} />
      </FieldGroup>
      <NumField label="Maks Item" value={el.maxItems ?? 10} onChange={(v) => onChange({ maxItems: Math.max(1, Math.round(v)) })} onCommit={onCommit} />
    </>
  );
}

function FontFields({
  size, family, weight, style, align, color, bg,
  onChange,
  onCommit,
}: {
  size: number;
  family: FontFamily | undefined;
  weight: "normal" | "bold";
  style: "normal" | "italic";
  align: "left" | "center" | "right";
  color: string;
  bg: string | undefined;
  onChange: (p: Partial<CanvasElement>) => void;
  onCommit: () => void;
}) {
  return (
    <>
      <FieldGroup label="Jenis Font">
        <select
          value={family ?? "sans"}
          onChange={(e) => { onChange({ fontFamily: e.target.value as FontFamily } as Partial<CanvasElement>); onCommit(); }}
          className="w-full h-8 text-[11px] border border-slate-200 rounded px-2"
          style={{ fontFamily: FONT_FAMILY_CSS[(family ?? "sans") as FontFamily] }}
        >
          {(Object.keys(FONT_FAMILY_LABELS) as FontFamily[]).map((k) => (
            <option key={k} value={k} style={{ fontFamily: FONT_FAMILY_CSS[k] }}>
              {FONT_FAMILY_LABELS[k]}
            </option>
          ))}
        </select>
      </FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Ukuran (pt)" value={size} onChange={(v) => onChange({ fontSize: v } as Partial<CanvasElement>)} onCommit={onCommit} />
        <FieldGroup label="Style">
          <div className="flex gap-1">
            <button
              onClick={() => { onChange({ fontWeight: weight === "bold" ? "normal" : "bold" } as Partial<CanvasElement>); onCommit(); }}
              className={`flex-1 h-7 rounded text-[11px] font-bold ${weight === "bold" ? "bg-orange-500 text-white" : "bg-slate-100"}`}
            >B</button>
            <button
              onClick={() => { onChange({ fontStyle: style === "italic" ? "normal" : "italic" } as Partial<CanvasElement>); onCommit(); }}
              className={`flex-1 h-7 rounded text-[11px] italic ${style === "italic" ? "bg-orange-500 text-white" : "bg-slate-100"}`}
            >I</button>
          </div>
        </FieldGroup>
      </div>
      <FieldGroup label="Rata">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              onClick={() => { onChange({ align: a } as Partial<CanvasElement>); onCommit(); }}
              className={`flex-1 h-7 rounded text-[11px] capitalize ${align === a ? "bg-orange-500 text-white" : "bg-slate-100"}`}
            >{a === "left" ? "Kiri" : a === "right" ? "Kanan" : "Tengah"}</button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Warna Teks">
        <ColorPicker value={color} onChange={(v) => { onChange({ color: v } as Partial<CanvasElement>); onCommit(); }} />
      </FieldGroup>
      <FieldGroup label="Latar Belakang">
        <ColorPicker value={bg ?? "transparent"} onChange={(v) => { onChange({ backgroundColor: v === "transparent" ? undefined : v } as Partial<CanvasElement>); onCommit(); }} allowTransparent />
      </FieldGroup>
    </>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] text-slate-500 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, onCommit }: { label: string; value: number; onChange: (v: number) => void; onCommit: () => void }) {
  return (
    <FieldGroup label={label}>
      <Input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 10) / 10 : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={onCommit}
        className="h-7 text-[11px]"
      />
    </FieldGroup>
  );
}

function ColorPicker({
  value,
  onChange,
  allowTransparent,
}: {
  value: string;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value === "transparent" ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 rounded cursor-pointer border border-slate-200"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-[11px] flex-1"
        />
        {allowTransparent && (
          <button
            onClick={() => onChange("transparent")}
            className="h-7 px-2 rounded text-[10px] bg-slate-100 hover:bg-slate-200"
            title="Transparan"
          >∅</button>
        )}
      </div>
      <div className="grid grid-cols-9 gap-0.5">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="h-4 w-full rounded border border-slate-200"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nextZ(els: CanvasElement[]): number {
  return (els.reduce((m, e) => Math.max(m, e.z), 0) || 0) + 1;
}

function emptyTemplate(): CanvasTemplate {
  const now = Date.now();
  return {
    id: "draft",
    name: "Template Baru",
    pageSize: "a4",
    orientation: "portrait",
    backgroundColor: "#ffffff",
    elements: [],
    createdAt: now,
    updatedAt: now,
  };
}
