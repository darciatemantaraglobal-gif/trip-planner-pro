import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  CanvasTemplate,
  CanvasElement,
  TextElement,
  SmartElement,
  ImageElement,
  ShapeElement,
  BulletElement,
} from "./types";
import { getPageDimsPt, FONT_FAMILY_CSS } from "./types";
import {
  resolveSmartValue,
  resolveBulletItems,
  type BindingContext,
} from "./dataBinding";

interface Props {
  template: CanvasTemplate;
  ctx: BindingContext;
  /** When provided, the canvas fits inside this width (px) preserving aspect. */
  fitWidth?: number;
  /** When provided, the canvas fits inside this height (px) preserving aspect. */
  fitHeight?: number;
  /** Optional className applied to the outer canvas wrapper. */
  className?: string;
  /** Children rendered after the elements (used by editor for overlays). */
  overlay?: React.ReactNode;
  /** Forwarded ref to the inner page surface (used for measurement / capture). */
  pageRef?: React.RefObject<HTMLDivElement>;
  /** When true, disables `pointer-events: none` on the page so clicks reach overlay. */
  interactive?: boolean;
}

/**
 * Renders a canvas template as positioned HTML at the correct page aspect ratio.
 * The internal coordinate system mirrors PDF point space so that 1pt in the editor
 * corresponds to (page_px / page_pt) on screen — the PDF renderer then uses the
 * same percentages directly.
 */
export function CanvasTemplateView({
  template,
  ctx,
  fitWidth,
  fitHeight,
  className,
  overlay,
  pageRef,
  interactive = false,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(fitWidth ?? 0);

  const { wPt, hPt } = getPageDimsPt(template);
  const aspect = wPt / hPt;

  useEffect(() => {
    if (fitWidth) {
      setContainerW(fitWidth);
      return;
    }
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      let w = rect.width;
      if (fitHeight) {
        const wByH = fitHeight * aspect;
        w = Math.min(w, wByH);
      }
      setContainerW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitWidth, fitHeight, aspect]);

  const pageW = containerW;
  const pageH = pageW / aspect;
  const ptToPx = pageW / wPt;

  const sortedElements = [...template.elements].sort((a, b) => a.z - b.z);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        width: fitWidth ? fitWidth : "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        ref={pageRef}
        className="relative shadow-md overflow-hidden"
        style={{
          width: pageW || "100%",
          height: pageH || "auto",
          aspectRatio: `${wPt} / ${hPt}`,
          background: template.backgroundColor || "#ffffff",
          backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        {sortedElements.map((el) => (
          <ElementView key={el.id} el={el} ctx={ctx} ptToPx={ptToPx} />
        ))}
        {!interactive && <div className="absolute inset-0 pointer-events-none" />}
        {overlay}
      </div>
    </div>
  );
}

function elementBox(el: CanvasElement): CSSProperties {
  return {
    position: "absolute",
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    height: `${el.h}%`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    transformOrigin: "center",
    overflow: "hidden",
  };
}

function ElementView({
  el,
  ctx,
  ptToPx,
}: {
  el: CanvasElement;
  ctx: BindingContext;
  ptToPx: number;
}) {
  switch (el.type) {
    case "text":
      return <TextView el={el} ptToPx={ptToPx} />;
    case "smart":
      return <SmartView el={el} ctx={ctx} ptToPx={ptToPx} />;
    case "image":
      return <ImageView el={el} ctx={ctx} ptToPx={ptToPx} />;
    case "shape":
      return <ShapeView el={el} ptToPx={ptToPx} />;
    case "bullet":
      return <BulletView el={el} ctx={ctx} ptToPx={ptToPx} />;
  }
}

function textBaseStyle(
  fontSize: number,
  fontWeight: "normal" | "bold",
  fontStyle: "normal" | "italic",
  align: "left" | "center" | "right",
  color: string,
  bg: string | undefined,
  padX: number,
  padY: number,
  ptToPx: number,
  lineHeight = 1.2,
  fontFamily?: keyof typeof FONT_FAMILY_CSS
): CSSProperties {
  const fam = fontFamily
    ? FONT_FAMILY_CSS[fontFamily]
    : "Helvetica, Arial, sans-serif";
  return {
    fontFamily: fam,
    fontSize: `${fontSize * ptToPx}px`,
    fontWeight,
    fontStyle,
    textAlign: align,
    color,
    background: bg,
    padding: `${padY * ptToPx}px ${padX * ptToPx}px`,
    lineHeight,
    display: "flex",
    alignItems: "center",
    justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    width: "100%",
    height: "100%",
  };
}

function TextView({ el, ptToPx }: { el: TextElement; ptToPx: number }) {
  return (
    <div style={elementBox(el)}>
      <div
        style={textBaseStyle(
          el.fontSize,
          el.fontWeight,
          el.fontStyle,
          el.align,
          el.color,
          el.backgroundColor,
          el.paddingX ?? 4,
          el.paddingY ?? 2,
          ptToPx,
          el.lineHeight ?? 1.2,
          el.fontFamily
        )}
      >
        <span style={{ display: "inline-block", width: "100%" }}>{el.text}</span>
      </div>
    </div>
  );
}

function SmartView({
  el,
  ctx,
  ptToPx,
}: {
  el: SmartElement;
  ctx: BindingContext;
  ptToPx: number;
}) {
  if (el.smartKey === "agencyLogo") {
    if (!ctx.agencyLogo) {
      return (
        <div style={elementBox(el)}>
          <div
            className="border border-dashed border-slate-300 rounded text-[8px] text-slate-400 flex items-center justify-center"
            style={{ width: "100%", height: "100%" }}
          >
            Logo
          </div>
        </div>
      );
    }
    return (
      <div style={elementBox(el)}>
        <img src={ctx.agencyLogo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    );
  }
  const value = `${el.prefix ?? ""}${resolveSmartValue(el.smartKey, ctx, el.format)}${el.suffix ?? ""}`;
  return (
    <div style={elementBox(el)}>
      <div
        style={textBaseStyle(
          el.fontSize,
          el.fontWeight,
          el.fontStyle,
          el.align,
          el.color,
          el.backgroundColor,
          el.paddingX ?? 4,
          el.paddingY ?? 2,
          ptToPx,
          1.2,
          el.fontFamily
        )}
      >
        <span style={{ display: "inline-block", width: "100%" }}>{value}</span>
      </div>
    </div>
  );
}

function ImageView({
  el,
  ctx,
  ptToPx: _ptToPx,
}: {
  el: ImageElement;
  ctx: BindingContext;
  ptToPx: number;
}) {
  void _ptToPx;
  const src = el.src || ctx.agencyLogo;
  return (
    <div style={elementBox(el)}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: el.fit,
            borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
          }}
        />
      ) : (
        <div className="bg-slate-100 border border-dashed border-slate-300 rounded text-[8px] text-slate-400 flex items-center justify-center" style={{ width: "100%", height: "100%" }}>
          Image
        </div>
      )}
    </div>
  );
}

function ShapeView({ el, ptToPx }: { el: ShapeElement; ptToPx: number }) {
  const baseStyle: CSSProperties = {
    ...elementBox(el),
    background: el.shape === "line" ? "transparent" : el.fill,
    border:
      el.shape === "line"
        ? "none"
        : `${el.strokeWidth * ptToPx}px solid ${el.stroke || "transparent"}`,
    borderRadius:
      el.shape === "ellipse"
        ? "50%"
        : el.shape === "rect"
          ? `${(el.borderRadius ?? 0) * ptToPx}px`
          : 0,
    overflow: "visible",
  };
  if (el.shape === "line") {
    return (
      <div style={baseStyle}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            transform: "translateY(-50%)",
            height: `${Math.max(1, el.strokeWidth) * ptToPx}px`,
            background: el.stroke || el.fill || "#000",
          }}
        />
      </div>
    );
  }
  return <div style={baseStyle} />;
}

function BulletView({
  el,
  ctx,
  ptToPx,
}: {
  el: BulletElement;
  ctx: BindingContext;
  ptToPx: number;
}) {
  const items = resolveBulletItems(el, ctx);
  return (
    <div style={elementBox(el)}>
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        {el.title && (
          <div
            style={{
              background: el.titleBg ?? "#f5f5f5",
              color: el.titleColor ?? "#333",
              fontSize: `${(el.fontSize + 1) * ptToPx}px`,
              fontWeight: 700,
              padding: `${3 * ptToPx}px ${5 * ptToPx}px`,
              textAlign: "center",
              borderRadius: `${3 * ptToPx}px`,
              marginBottom: `${3 * ptToPx}px`,
              flexShrink: 0,
            }}
          >
            {el.title}
          </div>
        )}
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            color: el.color,
            fontWeight: el.fontWeight,
            fontSize: `${el.fontSize * ptToPx}px`,
            lineHeight: 1.35,
            flex: 1,
            overflow: "hidden",
          }}
        >
          {items.length === 0 ? (
            <li style={{ fontStyle: "italic", opacity: 0.5 }}>—</li>
          ) : (
            items.map((it, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: `${4 * ptToPx}px`,
                  marginBottom: `${1.5 * ptToPx}px`,
                }}
              >
                <span
                  style={{
                    color: el.bulletColor ?? el.color,
                    flexShrink: 0,
                    lineHeight: 1.35,
                  }}
                >
                  •
                </span>
                <span style={{ flex: 1 }}>{it}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
