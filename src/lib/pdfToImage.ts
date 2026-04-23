/**
 * Render the first page of a PDF and (optionally) extract its text items
 * with positions so the editor can recreate them as editable elements.
 */
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PdfPageInfo {
  dataUrl: string;
  widthPt: number;
  heightPt: number;
  orientation: "portrait" | "landscape";
  pageCount: number;
}

export interface PdfTextItem {
  /** Raw text string */
  str: string;
  /** Position in points, top-left origin, relative to page */
  xPt: number;
  yPt: number;
  /** Width in points (as reported by PDF.js) */
  widthPt: number;
  /** Approximate font height in points */
  fontSizePt: number;
  /** Heuristic font weight from fontName */
  bold: boolean;
  italic: boolean;
  /** Hex color, defaults to #000 (PDF.js doesn't expose color in textContent) */
  color: string;
}

export interface PdfEditableInfo extends PdfPageInfo {
  /** Background image with original text painted over in white (so overlays read clean) */
  cleanedDataUrl: string;
  textItems: PdfTextItem[];
}

async function renderToCanvas(page: PDFPageProxy, scale: number) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal bikin canvas 2D context.");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { canvas, ctx, viewport };
}

export async function pdfFirstPageToImage(
  buffer: ArrayBuffer,
  scale = 2
): Promise<PdfPageInfo> {
  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const { canvas } = await renderToCanvas(page, scale);
  const raw = page.getViewport({ scale: 1 });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthPt: raw.width,
    heightPt: raw.height,
    orientation: raw.width >= raw.height ? "landscape" : "portrait",
    pageCount: pdf.numPages,
  };
}

/**
 * Render page + extract all text items with positions, and produce a
 * "cleaned" background image with the original text masked out in white.
 */
export async function pdfFirstPageToEditable(
  buffer: ArrayBuffer,
  scale = 2
): Promise<PdfEditableInfo> {
  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);

  const { canvas, ctx } = await renderToCanvas(page, scale);
  const dataUrl = canvas.toDataURL("image/png");

  const raw = page.getViewport({ scale: 1 });
  const widthPt = raw.width;
  const heightPt = raw.height;

  // Detect page background color from corner samples (skip transparent)
  function sampleAt(x: number, y: number) {
    try {
      const d = ctx.getImageData(Math.max(0, Math.min(canvas.width - 1, x)), Math.max(0, Math.min(canvas.height - 1, y)), 1, 1).data;
      return [d[0], d[1], d[2], d[3]] as [number, number, number, number];
    } catch {
      return [255, 255, 255, 255] as [number, number, number, number];
    }
  }
  const corners = [
    sampleAt(3, 3),
    sampleAt(canvas.width - 4, 3),
    sampleAt(3, canvas.height - 4),
    sampleAt(canvas.width - 4, canvas.height - 4),
  ];
  const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / corners.length);
  const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / corners.length);
  const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / corners.length);

  function rgbToHex(r: number, g: number, b: number) {
    const h = (n: number) => n.toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  }

  /** Sample dominant text color in a region; return null if can't decide. */
  function sampleTextColor(xPx: number, yPx: number, wPx: number, hPx: number, localBg?: [number, number, number]): string | null {
    const x = Math.max(0, Math.floor(xPx));
    const y = Math.max(0, Math.floor(yPx));
    const w = Math.max(1, Math.min(canvas.width - x, Math.ceil(wPx)));
    const h = Math.max(1, Math.min(canvas.height - y, Math.ceil(hPx)));
    if (w < 2 || h < 2) return null;

    let img: ImageData;
    try {
      img = ctx.getImageData(x, y, w, h);
    } catch {
      return null;
    }
    const data = img.data;

    // Try to detect a *local* background by taking the mode of light pixels in the region.
    // Fall back to page bg.
    const refR = localBg?.[0] ?? bgR;
    const refG = localBg?.[1] ?? bgG;
    const refB = localBg?.[2] ?? bgB;

    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      const dr = r - refR, dg = g - refG, db = b - refB;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < 50) continue; // too close to bg → not text
      // Quantize to reduce anti-alias noise
      const qr = r & 0xf0, qg = g & 0xf0, qb = b & 0xf0;
      const key = `${qr},${qg},${qb}`;
      const cur = buckets.get(key);
      if (cur) {
        cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
      } else {
        buckets.set(key, { r, g, b, n: 1 });
      }
    }
    if (buckets.size === 0) return null;

    // Pick the bucket with highest count (mode of text pixels)
    let best: { r: number; g: number; b: number; n: number } | null = null;
    for (const v of buckets.values()) {
      if (!best || v.n > best.n) best = v;
    }
    if (!best || best.n < 3) return null;
    return rgbToHex(Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n));
  }

  const textContent = await page.getTextContent();
  const textItems: PdfTextItem[] = [];

  for (const rawItem of textContent.items as any[]) {
    if (!rawItem || typeof rawItem.str !== "string") continue;
    const str = rawItem.str;
    if (!str.trim()) continue;

    const transform: number[] = rawItem.transform || [1, 0, 0, 1, 0, 0];
    const a = transform[0];
    const b = transform[1];
    const c = transform[2];
    const d = transform[3];
    const e = transform[4];
    const f = transform[5];

    // Font size = vertical scale magnitude
    const fontSizePt = Math.hypot(c, d) || Math.hypot(a, b) || 10;
    const widthPtItem = typeof rawItem.width === "number" && rawItem.width > 0
      ? rawItem.width
      : (str.length * fontSizePt * 0.5);

    // Convert PDF baseline (origin bottom-left) → top-left bbox top
    const ascent = fontSizePt * 0.82;
    const xPt = e;
    const yPt = heightPt - f - ascent;

    // Heuristic style from fontName
    const fontName: string = rawItem.fontName || "";
    const lower = fontName.toLowerCase();
    const bold = /bold|black|heavy|semibold|demibold/.test(lower);
    const italic = /italic|oblique/.test(lower);

    // Sample dominant color from rendered canvas before we mask it
    const sampledColor = sampleTextColor(
      xPt * scale,
      yPt * scale,
      widthPtItem * scale,
      fontSizePt * 1.05 * scale
    );

    textItems.push({
      str,
      xPt,
      yPt,
      widthPt: widthPtItem,
      fontSizePt,
      bold,
      italic,
      color: sampledColor ?? "#000000",
    });
  }

  // Paint white masks over each text region so overlays don't double up
  ctx.save();
  ctx.fillStyle = "#ffffff";
  for (const it of textItems) {
    const padX = 1;
    const padY = 1;
    const x = (it.xPt - padX) * scale;
    const y = (it.yPt - padY) * scale;
    const w = (it.widthPt + padX * 2) * scale;
    const h = (it.fontSizePt * 1.15 + padY * 2) * scale;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  const cleanedDataUrl = canvas.toDataURL("image/png");

  return {
    dataUrl,
    cleanedDataUrl,
    widthPt,
    heightPt,
    orientation: widthPt >= heightPt ? "landscape" : "portrait",
    pageCount: pdf.numPages,
    textItems,
  };
}
