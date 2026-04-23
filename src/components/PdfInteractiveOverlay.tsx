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

/** Estimasi bounding-box visual buat tiap section dari config aktif. */
function buildElements(layout: IghLayoutConfig, mode: IghLayoutMode): OverlayElement[] {
  const els: OverlayElement[] = [];

  // ── Project Name ──
  els.push({
    key: "projectName",
    label: "Project Name",
    xPx: layout.projectName.xPx,
    yPx: layout.projectName.topPx - layout.projectName.size,
    widthPx: 280,
    heightPx: layout.projectName.size + 8,
    size: layout.projectName.size,
  });

  // ── Meta Info (customer + date) ──
  {
    const left = Math.min(layout.metaInfo.customerXPx, layout.metaInfo.dateXPx);
    const right = Math.max(layout.metaInfo.customerXPx, layout.metaInfo.dateXPx);
    els.push({
      key: "metaInfo",
      label: "Meta Info",
      xPx: left - 4,
      yPx: layout.metaInfo.topPx - layout.metaInfo.size,
      widthPx: right - left + 140,
      heightPx: layout.metaInfo.size + 6,
      size: layout.metaInfo.size,
    });
  }

  // ── Hotel (Makkah + Madinah) ──
  {
    const left = Math.min(layout.hotel.makkahXPx, layout.hotel.madinahXPx);
    const right = Math.max(layout.hotel.makkahXPx, layout.hotel.madinahXPx);
    els.push({
      key: "hotel",
      label: "Hotel",
      xPx: left - 4,
      yPx: layout.hotel.topPx - layout.hotel.size,
      widthPx: right - left + 200,
      heightPx: layout.hotel.size + 6,
      size: layout.hotel.size,
    });
  }

  if (mode === "group") {
    // ── Pricing Table (Group) ──
    const left = layout.groupPricing.paxCenterXPx - 80;
    const right = layout.groupPricing.doubleCenterXPx + 80;
    els.push({
      key: "groupPricing",
      label: "Pricing Table",
      xPx: left,
      yPx: layout.groupPricing.topPx - 8,
      widthPx: right - left,
      heightPx: layout.groupPricing.rowSpacingPx * 6,
      size: layout.groupPricing.size,
    });
  } else {
    // ── Pricing (Private) ──
    const left = Math.min(layout.pricing.paxXPx, layout.pricing.priceXPx);
    const right = Math.max(layout.pricing.paxXPx, layout.pricing.priceXPx);
    els.push({
      key: "pricing",
      label: "Pricing",
      xPx: left - 4,
      yPx: layout.pricing.topPx - layout.pricing.size,
      widthPx: right - left + 220,
      heightPx: layout.pricing.size + 12,
      size: layout.pricing.size,
    });
  }

  // ── Checklist ──
  {
    const left = Math.min(layout.checklist.leftXPx, layout.checklist.rightXPx);
    const right = Math.max(layout.checklist.leftXPx, layout.checklist.rightXPx);
    els.push({
      key: "checklist",
      label: "Checklist",
      xPx: left - 90,
      yPx: layout.checklist.firstBaselinePx - layout.checklist.size,
      widthPx: right - left + 200,
      heightPx: layout.checklist.rowSpacingPx * 5 + 8,
      size: layout.checklist.size,
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
