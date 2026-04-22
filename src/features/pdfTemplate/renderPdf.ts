import jsPDF from "jspdf";
import type {
  CanvasTemplate,
  CanvasElement,
  TextElement,
  SmartElement,
  ImageElement,
  ShapeElement,
  BulletElement,
} from "./types";
import { getPageDimsPt } from "./types";
import {
  resolveSmartValue,
  resolveBulletItems,
  type BindingContext,
} from "./dataBinding";

function getImgFormat(dataUrl: string): string {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

/** Returns {w, h} of an image data-URL by reading it synchronously from the browser cache. */
function getNaturalDims(src: string): { w: number; h: number } | null {
  try {
    const img = new Image();
    img.src = src;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      return { w: img.naturalWidth, h: img.naturalHeight };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Compute letterboxed (contain) rect so the image fills the box without distortion. */
function containRect(
  boxX: number, boxY: number, boxW: number, boxH: number,
  naturalW: number, naturalH: number
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  const w = naturalW * scale;
  const h = naturalH * scale;
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function applyFill(doc: jsPDF, color: string) {
  if (!color || color === "transparent") return false;
  const [r, g, b] = hexToRgb(color);
  doc.setFillColor(r, g, b);
  return true;
}

function applyStroke(doc: jsPDF, color: string) {
  if (!color || color === "transparent") return false;
  const [r, g, b] = hexToRgb(color);
  doc.setDrawColor(r, g, b);
  return true;
}

function applyText(doc: jsPDF, color: string) {
  const [r, g, b] = hexToRgb(color || "#000");
  doc.setTextColor(r, g, b);
}

interface BoxPt {
  x: number;
  y: number;
  w: number;
  h: number;
}

function elBoxPt(el: CanvasElement, pageW: number, pageH: number): BoxPt {
  return {
    x: (el.x / 100) * pageW,
    y: (el.y / 100) * pageH,
    w: (el.w / 100) * pageW,
    h: (el.h / 100) * pageH,
  };
}

function fontStyleString(weight: "normal" | "bold", style: "normal" | "italic"): "normal" | "bold" | "italic" | "bolditalic" {
  if (weight === "bold" && style === "italic") return "bolditalic";
  if (weight === "bold") return "bold";
  if (style === "italic") return "italic";
  return "normal";
}

function drawTextBox(
  doc: jsPDF,
  box: BoxPt,
  text: string,
  opts: {
    fontSize: number;
    fontWeight: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    align: "left" | "center" | "right";
    color: string;
    backgroundColor?: string;
    paddingX?: number;
    paddingY?: number;
    lineHeight?: number;
  }
) {
  const padX = opts.paddingX ?? 4;
  const padY = opts.paddingY ?? 2;

  if (opts.backgroundColor && opts.backgroundColor !== "transparent") {
    if (applyFill(doc, opts.backgroundColor)) {
      doc.rect(box.x, box.y, box.w, box.h, "F");
    }
  }

  if (!text) return;

  doc.setFontSize(opts.fontSize);
  doc.setFont("helvetica", fontStyleString(opts.fontWeight, opts.fontStyle ?? "normal"));
  applyText(doc, opts.color);

  const innerW = Math.max(1, box.w - padX * 2);
  const lines = doc.splitTextToSize(text, innerW) as string[];
  const lineHeight = opts.fontSize * (opts.lineHeight ?? 1.2);
  const totalH = lines.length * lineHeight;
  const startY = box.y + padY + Math.max(0, (box.h - padY * 2 - totalH) / 2) + opts.fontSize * 0.85;

  let textX = box.x + padX;
  let alignParam: "left" | "center" | "right" = "left";
  if (opts.align === "center") {
    textX = box.x + box.w / 2;
    alignParam = "center";
  } else if (opts.align === "right") {
    textX = box.x + box.w - padX;
    alignParam = "right";
  }
  doc.text(lines, textX, startY, { align: alignParam, baseline: "alphabetic" });
}

function drawTextEl(doc: jsPDF, el: TextElement, box: BoxPt) {
  drawTextBox(doc, box, el.text, {
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle,
    align: el.align,
    color: el.color,
    backgroundColor: el.backgroundColor,
    paddingX: el.paddingX,
    paddingY: el.paddingY,
    lineHeight: el.lineHeight,
  });
}

function drawSmartEl(doc: jsPDF, el: SmartElement, box: BoxPt, ctx: BindingContext) {
  if (el.smartKey === "agencyLogo") {
    if (ctx.agencyLogo) {
      try {
        const dims = getNaturalDims(ctx.agencyLogo);
        const rect = dims
          ? containRect(box.x, box.y, box.w, box.h, dims.w, dims.h)
          : { x: box.x, y: box.y, w: box.w, h: box.h };
        doc.addImage(ctx.agencyLogo, getImgFormat(ctx.agencyLogo), rect.x, rect.y, rect.w, rect.h);
      } catch (err) {
        console.warn("Failed to render logo:", err);
      }
    }
    return;
  }
  const value = `${el.prefix ?? ""}${resolveSmartValue(el.smartKey, ctx, el.format)}${el.suffix ?? ""}`;
  drawTextBox(doc, box, value, {
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle,
    align: el.align,
    color: el.color,
    backgroundColor: el.backgroundColor,
    paddingX: el.paddingX,
    paddingY: el.paddingY,
  });
}

function drawImageEl(doc: jsPDF, el: ImageElement, box: BoxPt, ctx: BindingContext) {
  const src = el.src || ctx.agencyLogo;
  if (!src) return;
  try {
    let rect = { x: box.x, y: box.y, w: box.w, h: box.h };
    if (el.fit === "contain") {
      const dims = getNaturalDims(src);
      if (dims) rect = containRect(box.x, box.y, box.w, box.h, dims.w, dims.h);
    }
    doc.addImage(src, getImgFormat(src), rect.x, rect.y, rect.w, rect.h);
  } catch (err) {
    console.warn("Failed to render image element:", err);
  }
}

function drawShapeEl(doc: jsPDF, el: ShapeElement, box: BoxPt) {
  const hasFill = el.fill && el.fill !== "transparent";
  const hasStroke = el.stroke && el.stroke !== "transparent" && el.strokeWidth > 0;

  if (el.shape === "line") {
    if (!hasStroke && !hasFill) return;
    const color = el.stroke || el.fill;
    if (applyStroke(doc, color)) {
      doc.setLineWidth(Math.max(0.5, el.strokeWidth));
      const midY = box.y + box.h / 2;
      doc.line(box.x, midY, box.x + box.w, midY);
    }
    return;
  }

  if (hasFill) applyFill(doc, el.fill);
  if (hasStroke) {
    applyStroke(doc, el.stroke);
    doc.setLineWidth(el.strokeWidth);
  }
  const style = hasFill && hasStroke ? "FD" : hasFill ? "F" : hasStroke ? "S" : null;
  if (!style) return;

  if (el.shape === "ellipse") {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    doc.ellipse(cx, cy, box.w / 2, box.h / 2, style);
  } else {
    const r = el.borderRadius ?? 0;
    if (r > 0) {
      doc.roundedRect(box.x, box.y, box.w, box.h, r, r, style);
    } else {
      doc.rect(box.x, box.y, box.w, box.h, style);
    }
  }
}

function drawBulletEl(doc: jsPDF, el: BulletElement, box: BoxPt, ctx: BindingContext) {
  const items = resolveBulletItems(el, ctx);
  let cursorY = box.y;

  // Title bar
  if (el.title) {
    const titleH = (el.fontSize + 1) * 1.6;
    if (el.titleBg && el.titleBg !== "transparent") {
      applyFill(doc, el.titleBg);
      doc.roundedRect(box.x, cursorY, box.w, titleH, 3, 3, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(el.fontSize + 1);
    applyText(doc, el.titleColor ?? "#333333");
    doc.text(el.title, box.x + box.w / 2, cursorY + titleH * 0.7, { align: "center", baseline: "alphabetic" });
    cursorY += titleH + 4;
  }

  doc.setFont("helvetica", el.fontWeight === "bold" ? "bold" : "normal");
  doc.setFontSize(el.fontSize);

  const lineHeight = el.fontSize * 1.35;
  const innerW = box.w - 12;
  const bottom = box.y + box.h;

  for (const item of items) {
    if (cursorY + lineHeight > bottom) break;
    const lines = doc.splitTextToSize(item, innerW) as string[];
    // Bullet marker
    applyText(doc, el.bulletColor ?? el.color);
    doc.text("•", box.x + 2, cursorY + el.fontSize * 0.85);
    // Item text
    applyText(doc, el.color);
    doc.text(lines, box.x + 10, cursorY + el.fontSize * 0.85);
    cursorY += Math.max(1, lines.length) * lineHeight + 2;
  }
}

export function generateCanvasTemplatePdf(
  template: CanvasTemplate,
  ctx: BindingContext,
  filename?: string
) {
  const { wPt, hPt } = getPageDimsPt(template);
  const doc = new jsPDF({
    unit: "pt",
    format: [wPt, hPt],
    orientation: template.orientation,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Background fill
  if (template.backgroundColor && template.backgroundColor !== "transparent") {
    applyFill(doc, template.backgroundColor);
    doc.rect(0, 0, pageW, pageH, "F");
  }

  // Background image
  if (template.backgroundImage) {
    try {
      doc.addImage(template.backgroundImage, getImgFormat(template.backgroundImage), 0, 0, pageW, pageH);
    } catch (err) {
      console.warn("Failed to render template background:", err);
    }
  }

  const sorted = [...template.elements].sort((a, b) => a.z - b.z);
  for (const el of sorted) {
    const box = elBoxPt(el, pageW, pageH);
    switch (el.type) {
      case "text": drawTextEl(doc, el, box); break;
      case "smart": drawSmartEl(doc, el, box, ctx); break;
      case "image": drawImageEl(doc, el, box, ctx); break;
      case "shape": drawShapeEl(doc, el, box); break;
      case "bullet": drawBulletEl(doc, el, box, ctx); break;
    }
  }

  const safe = (filename || template.name || "penawaran").replace(/[^a-z0-9-_]+/gi, "_");
  doc.save(`${safe}.pdf`);
}
