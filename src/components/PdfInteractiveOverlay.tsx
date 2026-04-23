import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IghLayoutConfig, IghLayoutMode } from "@/lib/ighPdfConfig";

/**
 * Overlay drag-and-resize ala Canva di atas preview PDF.
 *
 * Koordinat di config = "template space" 740-px wide, top-left origin.
 * Image preview di-render dengan width tertentu di CSS — kita hitung
 * scale = displayedImgWidth / 740 untuk konversi bolak-balik.
 *
 * Selama drag/resize, perubahan ditahan di state lokal (ghost) dan baru
 * di-commit ke onChange saat pointer dilepas → cuma 1x re-render PDF.
 */

const TEMPLATE_WIDTH_PX = 740;
const TEMPLATE_HEIGHT_PX = 1024;
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 64;

// ── Geometri PDF (sinkron sama generateIghPdf.ts) ──────────────────────────
// PAGE_W=413.9506pt, TPL_W_PX=740 → SCALE = 0.5594.
// Konversi font-size (PDF point) → template-px: 1/SCALE ≈ 1.788.
const PDF_SCALE = 413.9506 / TEMPLATE_WIDTH_PX;
const PT_TO_TPL_PX = 1 / PDF_SCALE;

/**
 * `drawText` di generateIghPdf naruh BASELINE di:
 *   y_baseline_from_top_pt = topPx*SCALE + size*0.78
 * Jadi di template-px:
 *   baseline_tpl = topPx + size * 0.78 / SCALE ≈ topPx + size*1.394
 *   cap_top_tpl  = baseline_tpl - 0.7*size/SCALE ≈ topPx + size*0.143
 *   descender_tpl ≈ baseline_tpl + 0.2*size/SCALE ≈ topPx + size*1.752
 * Total tinggi visual text ≈ size * 1.61 template-px, mulai sedikit di bawah topPx.
 */
const TEXT_TOP_OFFSET_RATIO = 0.143; // cap-top relatif terhadap topPx, dlm satuan size
const TEXT_HEIGHT_RATIO = 1.61;       // tinggi cap-to-descender, dlm satuan size

function textBoxY(topPx: number, size: number): number {
  return topPx + size * TEXT_TOP_OFFSET_RATIO;
}
function textBoxH(size: number): number {
  return size * TEXT_HEIGHT_RATIO;
}

type ElementKey =
  | "projectName"
  | "metaInfo"
  | "hotel"
  | "pricing"
  | "groupPricing"
  | "checklist";

interface OverlayElement {
  key: ElementKey;
  label: string;
  /** Bounding box di template-px (top-left origin). */
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  /** Font size yang dikontrol oleh resize handle. */
  size: number;
}

/** Bounding-box visual yg presisi sesuai geometri PDF beneran. */
function buildElements(layout: IghLayoutConfig, mode: IghLayoutMode): OverlayElement[] {
  const els: OverlayElement[] = [];

  // ── Project Name ── (drawText, maxWidthPx=285)
  {
    const s = layout.projectName.size;
    els.push({
      key: "projectName",
      label: "Project Name",
      xPx: layout.projectName.xPx,
      yPx: textBoxY(layout.projectName.topPx, s),
      widthPx: 285,
      heightPx: textBoxH(s),
      size: s,
    });
  }

  // ── Meta Info (customer + date, sejajar) ──
  {
    const s = layout.metaInfo.size;
    const left = Math.min(layout.metaInfo.customerXPx, layout.metaInfo.dateXPx);
    const right = Math.max(layout.metaInfo.customerXPx, layout.metaInfo.dateXPx);
    // Tiap kolom ada budget maxWidthPx=175 di drawText.
    els.push({
      key: "metaInfo",
      label: "Meta Info",
      xPx: left,
      yPx: textBoxY(layout.metaInfo.topPx, s),
      widthPx: right - left + 175,
      heightPx: textBoxH(s),
      size: s,
    });
  }

  // ── Hotel (Makkah + Madinah, plus subtitle "X Malam" di topPx+38) ──
  {
    const s = layout.hotel.size;
    const left = Math.min(layout.hotel.makkahXPx, layout.hotel.madinahXPx);
    const right = Math.max(layout.hotel.makkahXPx, layout.hotel.madinahXPx);
    // maxWidthPx=285 per kolom, tapi visual hotel name biasanya pendek; pakai 220.
    const top = textBoxY(layout.hotel.topPx, s);
    // Subtitle "X Malam" pada topPx+38 size=9 → bottom ≈ topPx + 38 + 9*1.752
    const subtitleBottom = layout.hotel.topPx + 38 + 9 * (TEXT_TOP_OFFSET_RATIO + TEXT_HEIGHT_RATIO);
    els.push({
      key: "hotel",
      label: "Hotel",
      xPx: left,
      yPx: top,
      widthPx: right - left + 220,
      heightPx: subtitleBottom - top,
      size: s,
    });
  }

  if (mode === "group") {
    // ── Pricing Table (Group) — N rows, 4 kolom ──
    // Cell width fix di generator = 110px, height = cellHeightPx, top row baris pertama.
    // Baris sebenernya tergantung data; pakai estimasi 6 untuk visual handle.
    const gp = layout.groupPricing;
    const ROWS = 6;
    const left = gp.paxCenterXPx - 55; // 110/2
    const right = gp.doubleCenterXPx + gp.doubleXOffsetPx + 55;
    els.push({
      key: "groupPricing",
      label: "Pricing Table",
      xPx: left,
      yPx: gp.topPx,
      widthPx: right - left,
      heightPx: (ROWS - 1) * gp.rowSpacingPx + gp.cellHeightPx,
      size: gp.size,
    });
  } else {
    // ── Pricing (Private) — 2 kotak orange, lebar fix 114 + 406 ──
    // Generator: PAX_BOX widthPx=114, PRICE_BOX widthPx=406, both heightPx=61, topPx=topPx
    const p = layout.pricing;
    const left = Math.min(p.paxXPx, p.priceXPx);
    const paxRight = p.paxXPx + 114;
    const priceRight = p.priceXPx + 406;
    const right = Math.max(paxRight, priceRight);
    els.push({
      key: "pricing",
      label: "Pricing",
      xPx: left,
      yPx: p.topPx,
      widthPx: right - left,
      heightPx: 61,
      size: p.size,
    });
  }

  // ── Checklist — 5 baris, baselinePx = posisi BASELINE (bukan top!) ──
  {
    const c = layout.checklist;
    const s = c.size;
    // Cap-top untuk row pertama: baselinePx - 0.7*size/SCALE
    const capTop = c.firstBaselinePx - 0.7 * s * PT_TO_TPL_PX;
    // Descender row terakhir (row index 4): baseline + 0.2*size/SCALE
    const lastBaseline = c.firstBaselinePx + 4 * c.rowSpacingPx + c.yOffsetPx;
    const descBottom = lastBaseline + 0.2 * s * PT_TO_TPL_PX;
    // Lebar kolom asli template = 235px. Box = dari kiri kolom kiri sampai kanan kolom kanan.
    const left = Math.min(c.leftXPx, c.rightXPx) - 235 / 2;
    const right = Math.max(c.leftXPx, c.rightXPx) + 235 / 2;
    els.push({
      key: "checklist",
      label: "Checklist",
      xPx: left,
      yPx: capTop,
      widthPx: right - left,
      heightPx: descBottom - capTop,
      size: s,
    });
  }

  return els;
}

/** Apply translasi (dxPx, dyPx) di template-space pada section tertentu. */
function applyTranslate(
  layout: IghLayoutConfig,
  key: ElementKey,
  dxPx: number,
  dyPx: number,
): IghLayoutConfig {
  const next = { ...layout };
  switch (key) {
    case "projectName":
      next.projectName = {
        ...layout.projectName,
        xPx: layout.projectName.xPx + dxPx,
        topPx: layout.projectName.topPx + dyPx,
      };
      break;
    case "metaInfo":
      next.metaInfo = {
        ...layout.metaInfo,
        customerXPx: layout.metaInfo.customerXPx + dxPx,
        dateXPx: layout.metaInfo.dateXPx + dxPx,
        topPx: layout.metaInfo.topPx + dyPx,
      };
      break;
    case "hotel":
      next.hotel = {
        ...layout.hotel,
        makkahXPx: layout.hotel.makkahXPx + dxPx,
        madinahXPx: layout.hotel.madinahXPx + dxPx,
        topPx: layout.hotel.topPx + dyPx,
      };
      break;
    case "pricing":
      next.pricing = {
        ...layout.pricing,
        paxXPx: layout.pricing.paxXPx + dxPx,
        priceXPx: layout.pricing.priceXPx + dxPx,
        topPx: layout.pricing.topPx + dyPx,
      };
      break;
    case "groupPricing":
      next.groupPricing = {
        ...layout.groupPricing,
        paxCenterXPx: layout.groupPricing.paxCenterXPx + dxPx,
        quadCenterXPx: layout.groupPricing.quadCenterXPx + dxPx,
        tripleCenterXPx: layout.groupPricing.tripleCenterXPx + dxPx,
        doubleCenterXPx: layout.groupPricing.doubleCenterXPx + dxPx,
        topPx: layout.groupPricing.topPx + dyPx,
      };
      break;
    case "checklist":
      next.checklist = {
        ...layout.checklist,
        leftXPx: layout.checklist.leftXPx + dxPx,
        rightXPx: layout.checklist.rightXPx + dxPx,
        firstBaselinePx: layout.checklist.firstBaselinePx + dyPx,
      };
      break;
  }
  return next;
}

/** Update font size pada section tertentu (dipakai oleh resize handle). */
function applyResize(
  layout: IghLayoutConfig,
  key: ElementKey,
  newSize: number,
): IghLayoutConfig {
  const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(newSize)));
  const next = { ...layout };
  switch (key) {
    case "projectName":
      next.projectName = { ...layout.projectName, size: clamped };
      break;
    case "metaInfo":
      next.metaInfo = { ...layout.metaInfo, size: clamped };
      break;
    case "hotel":
      next.hotel = { ...layout.hotel, size: clamped };
      break;
    case "pricing":
      next.pricing = { ...layout.pricing, size: clamped };
      break;
    case "groupPricing":
      next.groupPricing = { ...layout.groupPricing, size: clamped };
      break;
    case "checklist":
      next.checklist = { ...layout.checklist, size: clamped };
      break;
  }
  return next;
}

interface Props {
  /** Config aktif (committed). */
  layout: IghLayoutConfig;
  mode: IghLayoutMode;
  /** Dipanggil cuma di akhir drag/resize → 1x re-render PDF. */
  onChange: (next: IghLayoutConfig) => void;
  /** Bounding box image preview di koordinat container overlay (px). */
  imgRect: { left: number; top: number; width: number; height: number } | null;
  /** Aktifkan / matikan layer interaktif. */
  enabled: boolean;
}

type DragState =
  | { kind: "move"; key: ElementKey; startX: number; startY: number; startSize: number }
  | { kind: "resize"; key: ElementKey; corner: 0 | 1 | 2 | 3; startX: number; startY: number; startSize: number; startDiag: number };

export function PdfInteractiveOverlay({ layout, mode, onChange, imgRect, enabled }: Props) {
  // Ghost layout dipakai cuma selama drag aktif. Null = pakai `layout`.
  const [ghost, setGhost] = useState<IghLayoutConfig | null>(null);
  const [selected, setSelected] = useState<ElementKey | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Reset ghost & selection kalo overlay dimatiin.
  useEffect(() => {
    if (!enabled) {
      setGhost(null);
      setSelected(null);
      dragRef.current = null;
    }
  }, [enabled]);

  const effective = ghost ?? layout;
  const elements = useMemo(() => buildElements(effective, mode), [effective, mode]);

  const scale = imgRect ? imgRect.width / TEMPLATE_WIDTH_PX : 0;

  /** Konversi delta CSS-px → template-px. */
  const toTemplatePx = useCallback(
    (cssPx: number) => (scale > 0 ? cssPx / scale : 0),
    [scale],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const st = dragRef.current;
      if (!st) return;
      e.preventDefault();
      if (st.kind === "move") {
        const dx = toTemplatePx(e.clientX - st.startX);
        const dy = toTemplatePx(e.clientY - st.startY);
        setGhost(applyTranslate(layout, st.key, dx, dy));
      } else {
        // Resize: ukur jarak diagonal dari titik sudut yang berlawanan.
        const curDx = e.clientX - st.startX;
        const curDy = e.clientY - st.startY;
        // Tentukan arah berdasarkan corner (0=TL,1=TR,2=BR,3=BL).
        const signX = st.corner === 1 || st.corner === 2 ? 1 : -1;
        const signY = st.corner === 2 || st.corner === 3 ? 1 : -1;
        const projected = signX * curDx + signY * curDy; // px sepanjang diagonal
        const cssDelta = projected; // > 0 = membesar
        const newDiagCss = Math.max(8, st.startDiag + cssDelta);
        const ratio = newDiagCss / st.startDiag;
        setGhost(applyResize(layout, st.key, st.startSize * ratio));
      }
    },
    [layout, toTemplatePx],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const st = dragRef.current;
      if (!st) return;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      dragRef.current = null;
      // Commit ghost → trigger 1x re-render PDF lewat parent.
      setGhost((g) => {
        if (g) onChange(g);
        return null;
      });
      e.preventDefault();
    },
    [onChange, onPointerMove],
  );

  function startMove(e: React.PointerEvent, key: ElementKey, currentSize: number) {
    if (!enabled) return;
    e.stopPropagation();
    e.preventDefault();
    setSelected(key);
    dragRef.current = {
      kind: "move",
      key,
      startX: e.clientX,
      startY: e.clientY,
      startSize: currentSize,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function startResize(
    e: React.PointerEvent,
    key: ElementKey,
    corner: 0 | 1 | 2 | 3,
    currentSize: number,
    cssWidth: number,
    cssHeight: number,
  ) {
    if (!enabled) return;
    e.stopPropagation();
    e.preventDefault();
    setSelected(key);
    const diag = Math.max(8, Math.hypot(cssWidth, cssHeight));
    dragRef.current = {
      kind: "resize",
      key,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startSize: currentSize,
      startDiag: diag,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  // Cleanup global listeners on unmount.
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  if (!enabled || !imgRect || scale <= 0) return null;

  return (
    <div
      className="absolute z-20"
      style={{
        left: imgRect.left,
        top: imgRect.top,
        width: imgRect.width,
        height: imgRect.height,
        pointerEvents: "none",
      }}
      onPointerDown={() => setSelected(null)}
    >
      {/* Background catcher — klik di luar elemen → deselect */}
      <div
        className="absolute inset-0"
        style={{ pointerEvents: "auto" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          setSelected(null);
        }}
      />

      {elements.map((el) => {
        const left = el.xPx * scale;
        const top = el.yPx * scale;
        // Clamp height ke area image biar handle bawah tetep ke-klik
        const maxH = imgRect.height - top - 1;
        const cssW = Math.max(24, el.widthPx * scale);
        const cssH = Math.max(18, Math.min(el.heightPx * scale, maxH));
        const isSelected = selected === el.key;
        const isDragging = dragRef.current?.key === el.key && ghost !== null;
        return (
          <div
            key={el.key}
            className={`absolute group ${
              isSelected
                ? "ring-2 ring-blue-500"
                : "ring-1 ring-blue-300/0 hover:ring-blue-400/70"
            }`}
            style={{
              left,
              top,
              width: cssW,
              height: cssH,
              pointerEvents: "auto",
              cursor: isSelected ? "move" : "pointer",
              background: isSelected
                ? "rgba(59,130,246,0.08)"
                : "rgba(59,130,246,0.0)",
              borderRadius: 2,
              transition: "background 120ms",
              boxShadow: isDragging ? "0 8px 18px rgba(15,23,42,0.18)" : undefined,
              opacity: isDragging ? 0.85 : 1,
            }}
            onPointerDown={(e) => startMove(e, el.key, el.size)}
          >
            {/* Label tag pojok kiri-atas */}
            <span
              className={`absolute -top-5 left-0 inline-flex items-center h-4 px-1.5 rounded-sm text-[9px] font-bold whitespace-nowrap select-none ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-white/95 border border-blue-200 text-blue-700 opacity-0 group-hover:opacity-100"
              }`}
              style={{ pointerEvents: "none", transition: "opacity 120ms" }}
            >
              {el.label}
              {isSelected && (
                <span className="ml-1 font-normal opacity-80">· {Math.round(el.size)}pt</span>
              )}
            </span>

            {/* Resize handles 4 sudut — cuma muncul saat selected */}
            {isSelected &&
              ([0, 1, 2, 3] as const).map((corner) => {
                const positions = [
                  { left: -4, top: -4, cursor: "nwse-resize" },
                  { right: -4, top: -4, cursor: "nesw-resize" },
                  { right: -4, bottom: -4, cursor: "nwse-resize" },
                  { left: -4, bottom: -4, cursor: "nesw-resize" },
                ] as const;
                const p = positions[corner];
                return (
                  <span
                    key={corner}
                    onPointerDown={(e) => startResize(e, el.key, corner, el.size, cssW, cssH)}
                    style={{
                      position: "absolute",
                      width: 10,
                      height: 10,
                      background: "white",
                      border: "1.5px solid #2563eb",
                      borderRadius: 2,
                      cursor: p.cursor,
                      pointerEvents: "auto",
                      ...p,
                    }}
                  />
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

export { TEMPLATE_WIDTH_PX, TEMPLATE_HEIGHT_PX };
