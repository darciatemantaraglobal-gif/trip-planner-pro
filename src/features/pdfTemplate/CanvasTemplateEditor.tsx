import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Type, Image as ImageIcon, Square, Circle, Minus, List,
  Sparkles, Trash2, Copy, ArrowUp, ArrowDown,
  Save, Upload, Eye,
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
  SMART_KEY_LABELS,
  getPageDimsPt,
} from "./types";
import { CanvasTemplateView } from "./renderHtml";
import { PLACEHOLDER_CTX, type BindingContext } from "./dataBinding";

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

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

const COLOR_SWATCHES = [
  "#000000", "#ffffff", "#f97316", "#ea580c", "#102463", "#c99841",
  "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#f59e0b", "#666666",
  "#888888", "#cccccc", "#fef3c7", "#fee2e2", "#dcfce7", "#dbeafe",
];

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
  const pageRef = useRef<HTMLDivElement>(null);
  const previewCtx = ctx ?? PLACEHOLDER_CTX;

  // Reset on open
  useEffect(() => {
    if (open) {
      setTemplate(initial ?? emptyTemplate());
      setSelectedId(null);
      setDrag(null);
    }
  }, [open, initial]);

  const selected = template.elements.find((e) => e.id === selectedId) ?? null;

  /* ─── Element CRUD ─── */
  function addElement(el: CanvasElement) {
    setTemplate((t) => ({
      ...t,
      elements: [...t.elements, { ...el, z: nextZ(t.elements) }],
    }));
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

  function deleteSelected() {
    if (!selectedId) return;
    setTemplate((t) => ({ ...t, elements: t.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy: CanvasElement = {
      ...selected,
      id: uid(selected.type),
      x: Math.min(95, selected.x + 3),
      y: Math.min(95, selected.y + 3),
      z: nextZ(template.elements),
    } as CanvasElement;
    setTemplate((t) => ({ ...t, elements: [...t.elements, copy] }));
    setSelectedId(copy.id);
  }

  function bringForward() {
    if (!selected) return;
    const sorted = [...template.elements].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((e) => e.id === selected.id);
    if (idx === -1 || idx === sorted.length - 1) return;
    const next = sorted[idx + 1];
    patchSelected({ z: next.z });
    setTemplate((t) => ({
      ...t,
      elements: t.elements.map((e) =>
        e.id === next.id ? { ...e, z: selected.z } : e.id === selected.id ? { ...e, z: next.z } : e
      ),
    }));
  }

  function sendBackward() {
    if (!selected) return;
    const sorted = [...template.elements].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((e) => e.id === selected.id);
    if (idx <= 0) return;
    const prev = sorted[idx - 1];
    setTemplate((t) => ({
      ...t,
      elements: t.elements.map((e) =>
        e.id === prev.id ? { ...e, z: selected.z } : e.id === selected.id ? { ...e, z: prev.z } : e
      ),
    }));
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
            return {
              ...e,
              x: clamp(drag!.ox + dxPct, 0, 100 - e.w),
              y: clamp(drag!.oy + dyPct, 0, 100 - e.h),
            };
          }
          // resize
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
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag]);

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

  /* ─── Background image ─── */
  const bgFileRef = useRef<HTMLInputElement>(null);
  function setBgImageFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTemplate((t) => ({ ...t, backgroundImage: ev.target?.result as string }));
    };
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
        <div className="px-4 py-3 border-b bg-white flex items-center gap-3 shrink-0">
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
                onClick={() => setTemplate((t) => ({ ...t, pageSize: sz }))}
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
                const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
                if (f) setBgImageFromFile(f);
              }}
              className="h-7 px-2 rounded text-[11px] bg-slate-100 hover:bg-slate-200 flex items-center gap-1"
              title="Klik atau drop gambar latar di sini"
            >
              <Upload className="h-3 w-3" />
              {template.backgroundImage ? "Ganti" : "Latar"}
            </button>
            {template.backgroundImage && (
              <button
                onClick={() => setTemplate((t) => ({ ...t, backgroundImage: undefined }))}
                className="h-7 px-2 rounded text-[11px] bg-rose-50 text-rose-700 hover:bg-rose-100"
              >
                Hapus latar
              </button>
            )}
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setBgImageFromFile(f);
                e.target.value = "";
              }}
            />
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
                    {template.elements.map((el) => {
                      const isSel = el.id === selectedId;
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
                        >
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
                onDelete={deleteSelected}
                onDuplicate={duplicateSelected}
                onForward={bringForward}
                onBackward={sendBackward}
              />
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-[11px]">Pilih elemen untuk mengedit propertinya.</p>
                <p className="text-[10px] mt-2 text-slate-500">
                  Total elemen: <strong>{template.elements.length}</strong>
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

function PropertyPanel({
  el,
  onChange,
  onDelete,
  onDuplicate,
  onForward,
  onBackward,
}: {
  el: CanvasElement;
  onChange: (u: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onForward: () => void;
  onBackward: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-slate-600">{el.type}</span>
        <div className="flex items-center gap-1">
          <IconBtn title="Maju" onClick={onForward}><ArrowUp className="h-3 w-3" /></IconBtn>
          <IconBtn title="Mundur" onClick={onBackward}><ArrowDown className="h-3 w-3" /></IconBtn>
          <IconBtn title="Duplikat" onClick={onDuplicate}><Copy className="h-3 w-3" /></IconBtn>
          <IconBtn title="Hapus" onClick={onDelete} danger><Trash2 className="h-3 w-3" /></IconBtn>
        </div>
      </div>

      <PositionFields el={el} onChange={onChange} />

      {el.type === "text" && <TextFields el={el} onChange={onChange} />}
      {el.type === "smart" && <SmartFields el={el} onChange={onChange} />}
      {el.type === "shape" && <ShapeFields el={el} onChange={onChange} />}
      {el.type === "image" && <ImageFields el={el} onChange={onChange} />}
      {el.type === "bullet" && <BulletFields el={el} onChange={onChange} />}
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

function PositionFields({ el, onChange }: { el: CanvasElement; onChange: (u: Partial<CanvasElement>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumField label="X (%)" value={el.x} onChange={(v) => onChange({ x: v })} />
      <NumField label="Y (%)" value={el.y} onChange={(v) => onChange({ y: v })} />
      <NumField label="Lebar (%)" value={el.w} onChange={(v) => onChange({ w: v })} />
      <NumField label="Tinggi (%)" value={el.h} onChange={(v) => onChange({ h: v })} />
    </div>
  );
}

function TextFields({
  el,
  onChange,
}: {
  el: Extract<CanvasElement, { type: "text" }>;
  onChange: (u: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <FieldGroup label="Isi Teks">
        <textarea
          value={el.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={3}
          className="w-full text-[12px] p-2 border border-slate-200 rounded resize-none"
        />
      </FieldGroup>
      <FontFields
        size={el.fontSize}
        weight={el.fontWeight}
        style={el.fontStyle}
        align={el.align}
        color={el.color}
        bg={el.backgroundColor}
        onChange={(p) => onChange(p)}
      />
    </>
  );
}

function SmartFields({
  el,
  onChange,
}: {
  el: Extract<CanvasElement, { type: "smart" }>;
  onChange: (u: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <FieldGroup label="Field Sumber">
        <select
          value={el.smartKey}
          onChange={(e) => onChange({ smartKey: e.target.value as SmartKey })}
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
          onChange={(e) => onChange({ format: e.target.value as Extract<CanvasElement, { type: "smart" }>["format"] })}
          className="w-full h-8 text-[11px] border border-slate-200 rounded px-2"
        >
          <option value="plain">Apa adanya</option>
          <option value="currency-idr">Rp xx.xxx.xxx</option>
          <option value="uppercase">HURUF BESAR</option>
        </select>
      </FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <FieldGroup label="Awalan">
          <Input value={el.prefix ?? ""} onChange={(e) => onChange({ prefix: e.target.value })} className="h-7 text-[11px]" />
        </FieldGroup>
        <FieldGroup label="Akhiran">
          <Input value={el.suffix ?? ""} onChange={(e) => onChange({ suffix: e.target.value })} className="h-7 text-[11px]" />
        </FieldGroup>
      </div>
      <FontFields
        size={el.fontSize}
        weight={el.fontWeight}
        style={el.fontStyle}
        align={el.align}
        color={el.color}
        bg={el.backgroundColor}
        onChange={(p) => onChange(p)}
      />
    </>
  );
}

function ShapeFields({
  el,
  onChange,
}: {
  el: Extract<CanvasElement, { type: "shape" }>;
  onChange: (u: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <FieldGroup label="Warna Isi">
        <ColorPicker value={el.fill} onChange={(v) => onChange({ fill: v })} />
      </FieldGroup>
      <FieldGroup label="Warna Garis">
        <ColorPicker value={el.stroke} onChange={(v) => onChange({ stroke: v })} />
      </FieldGroup>
      <NumField label="Tebal Garis (pt)" value={el.strokeWidth} onChange={(v) => onChange({ strokeWidth: v })} />
      {el.shape === "rect" && (
        <NumField label="Sudut (pt)" value={el.borderRadius ?? 0} onChange={(v) => onChange({ borderRadius: v })} />
      )}
    </>
  );
}

function ImageFields({
  el,
  onChange,
}: {
  el: Extract<CanvasElement, { type: "image" }>;
  onChange: (u: Partial<CanvasElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  function handleFile(f: File) {
    const r = new FileReader();
    r.onload = (ev) => onChange({ src: ev.target?.result as string });
    r.readAsDataURL(f);
  }
  return (
    <>
      <FieldGroup label="Mode">
        <div className="flex gap-1">
          {(["contain", "cover"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onChange({ fit: f })}
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
          const r = new FileReader();
          r.onload = (ev) => onChange({ src: ev.target?.result as string });
          r.readAsDataURL(f);
          e.target.value = "";
        }}
      />
      <NumField label="Sudut (px)" value={el.borderRadius ?? 0} onChange={(v) => onChange({ borderRadius: v })} />
    </>
  );
}

function BulletFields({
  el,
  onChange,
}: {
  el: Extract<CanvasElement, { type: "bullet" }>;
  onChange: (u: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <FieldGroup label="Sumber Item">
        <select
          value={el.source}
          onChange={(e) => onChange({ source: e.target.value as Extract<CanvasElement, { type: "bullet" }>["source"] })}
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
            rows={5}
            className="w-full text-[11px] p-2 border border-slate-200 rounded resize-none"
          />
        </FieldGroup>
      )}
      <FieldGroup label="Judul">
        <Input value={el.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-7 text-[11px]" />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-2">
        <FieldGroup label="Warna Judul">
          <ColorPicker value={el.titleColor ?? "#333"} onChange={(v) => onChange({ titleColor: v })} />
        </FieldGroup>
        <FieldGroup label="Latar Judul">
          <ColorPicker value={el.titleBg ?? "#f5f5f5"} onChange={(v) => onChange({ titleBg: v })} />
        </FieldGroup>
      </div>
      <NumField label="Ukuran (pt)" value={el.fontSize} onChange={(v) => onChange({ fontSize: v })} />
      <FieldGroup label="Warna Teks">
        <ColorPicker value={el.color} onChange={(v) => onChange({ color: v })} />
      </FieldGroup>
      <FieldGroup label="Warna Bullet">
        <ColorPicker value={el.bulletColor ?? el.color} onChange={(v) => onChange({ bulletColor: v })} />
      </FieldGroup>
      <NumField label="Maks Item" value={el.maxItems ?? 10} onChange={(v) => onChange({ maxItems: Math.max(1, Math.round(v)) })} />
    </>
  );
}

function FontFields({
  size, weight, style, align, color, bg,
  onChange,
}: {
  size: number;
  weight: "normal" | "bold";
  style: "normal" | "italic";
  align: "left" | "center" | "right";
  color: string;
  bg: string | undefined;
  onChange: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Ukuran (pt)" value={size} onChange={(v) => onChange({ fontSize: v } as Partial<CanvasElement>)} />
        <FieldGroup label="Style">
          <div className="flex gap-1">
            <button
              onClick={() => onChange({ fontWeight: weight === "bold" ? "normal" : "bold" } as Partial<CanvasElement>)}
              className={`flex-1 h-7 rounded text-[11px] font-bold ${weight === "bold" ? "bg-orange-500 text-white" : "bg-slate-100"}`}
            >B</button>
            <button
              onClick={() => onChange({ fontStyle: style === "italic" ? "normal" : "italic" } as Partial<CanvasElement>)}
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
              onClick={() => onChange({ align: a } as Partial<CanvasElement>)}
              className={`flex-1 h-7 rounded text-[11px] capitalize ${align === a ? "bg-orange-500 text-white" : "bg-slate-100"}`}
            >{a === "left" ? "Kiri" : a === "right" ? "Kanan" : "Tengah"}</button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Warna Teks">
        <ColorPicker value={color} onChange={(v) => onChange({ color: v } as Partial<CanvasElement>)} />
      </FieldGroup>
      <FieldGroup label="Latar Belakang">
        <ColorPicker value={bg ?? "transparent"} onChange={(v) => onChange({ backgroundColor: v === "transparent" ? undefined : v } as Partial<CanvasElement>)} allowTransparent />
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

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <FieldGroup label={label}>
      <Input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 10) / 10 : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
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
