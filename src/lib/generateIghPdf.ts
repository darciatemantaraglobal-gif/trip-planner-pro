import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Generator PDF berbasis template `IGH Template.pdf`.
 *
 * Strategy:
 *   1. Load template PDF (yang sudah punya design lengkap + placeholder text).
 *   2. Tutup (mask) area placeholder dengan rectangle berwarna sama persis.
 *   3. Overlay teks hasil mapping data dari calculator pakai font Montserrat.
 *
 * Koordinat dihitung dari rendering 740 × 1024 px → PDF 413.95 × 572.53 pt.
 * Skala ≈ 0.5594 (sama untuk x dan y).
 */

const TEMPLATE_URL = "/igh-template.pdf";
const FONT_REGULAR_URL = "/fonts/Montserrat-Regular.ttf";
const FONT_BOLD_URL = "/fonts/Montserrat-Bold.ttf";
const FONT_EXTRABOLD_URL = "/fonts/Montserrat-ExtraBold.ttf";

// Template canonical pixel size (matches the 150-DPI render of igh-template.pdf)
const TPL_W_PX = 740;
const TPL_H_PX = 1024;
const PAGE_W = 413.9506;
const PAGE_H = 572.532;
const SCALE = PAGE_W / TPL_W_PX; // ≈ 0.5594

// Brand colors sampled from the template artwork
const ORANGE: RGB = rgb(0.964, 0.518, 0.149); // #F58426 — pax / price boxes
const ORANGE_TEXT: RGB = rgb(0.945, 0.471, 0.118); // #F1781E — headings & values
const DARK: RGB = rgb(0.13, 0.13, 0.13);
const WHITE: RGB = rgb(1, 1, 1);

export interface IghPdfData {
  /** Project Name → "(Nama Penawaran)" */
  projectName: string;
  /** Timeline → tanggal keberangkatan */
  timeline: string;
  /** Invoice to → nama customer */
  customerName: string;
  /** Tanggal cetak / penawaran */
  date: string;
  /** Hotel Makkah */
  hotelMakkah: string;
  makkahNights: number;
  /** Hotel Madinah */
  hotelMadinah: string;
  madinahNights: number;
  /** Jumlah Pax */
  pax: number;
  /** Harga per Pax (IDR) */
  pricePerPaxIDR: number;
  /** Kurs IDR per USD (untuk catatan kaki). 0/undefined = pakai default 17.100 */
  kursIdrPerUsd?: number;
  /** Bullet list — Sudah Termasuk (max 5 ditampilkan) */
  included: string[];
  /** Bullet list — Belum Termasuk (max 5 ditampilkan) */
  excluded: string[];
}

// ── Coordinate helpers ─────────────────────────────────────────────────────

/** Convert top-left pixel coords (in 740×1024 template space) to PDF rectangle. */
function pxRect(leftPx: number, topPx: number, widthPx: number, heightPx: number) {
  const x = leftPx * SCALE;
  const w = widthPx * SCALE;
  const h = heightPx * SCALE;
  const y = PAGE_H - topPx * SCALE - h;
  return { x, y, width: w, height: h };
}

/** Mask a region with a solid color (covers placeholder text in the template). */
function mask(page: PDFPage, color: RGB, leftPx: number, topPx: number, widthPx: number, heightPx: number) {
  const r = pxRect(leftPx, topPx, widthPx, heightPx);
  page.drawRectangle({ ...r, color });
}

/** Draw text using top-left pixel coords; size is in PDF points. */
function drawText(
  page: PDFPage,
  text: string,
  opts: { leftPx: number; topPx: number; size: number; font: PDFFont; color: RGB; maxWidthPx?: number },
) {
  const x = opts.leftPx * SCALE;
  // Approximate baseline: top + cap-height (~0.78 of size for Montserrat)
  const y = PAGE_H - opts.topPx * SCALE - opts.size * 0.82;
  const value = opts.maxWidthPx
    ? truncateToWidth(text, opts.font, opts.size, opts.maxWidthPx * SCALE)
    : text;
  page.drawText(value, { x, y, size: opts.size, font: opts.font, color: opts.color });
}

/** Draw text horizontally centered inside a given pixel rectangle. */
function drawTextCentered(
  page: PDFPage,
  text: string,
  opts: { leftPx: number; topPx: number; widthPx: number; heightPx: number; size: number; font: PDFFont; color: RGB },
) {
  const r = pxRect(opts.leftPx, opts.topPx, opts.widthPx, opts.heightPx);
  let size = opts.size;
  let textW = opts.font.widthOfTextAtSize(text, size);
  // Auto-shrink if too wide
  while (textW > r.width - 8 && size > 8) {
    size -= 1;
    textW = opts.font.widthOfTextAtSize(text, size);
  }
  const x = r.x + (r.width - textW) / 2;
  const y = r.y + (r.height - size * 0.82) / 2;
  page.drawText(text, { x, y, size, font: opts.font, color: opts.color });
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (font.widthOfTextAtSize(text.slice(0, mid) + ellipsis, size) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ellipsis;
}

// ── Public API ─────────────────────────────────────────────────────────────

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal ambil ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function fmtIdr(n: number): string {
  return "Rp. " + Math.round(n).toLocaleString("id-ID");
}

/** Build the filled PDF (returns bytes). */
export async function buildIghPdf(data: IghPdfData): Promise<Uint8Array> {
  const [tplBytes, regBytes, boldBytes, exBoldBytes] = await Promise.all([
    fetchBytes(TEMPLATE_URL),
    fetchBytes(FONT_REGULAR_URL),
    fetchBytes(FONT_BOLD_URL),
    fetchBytes(FONT_EXTRABOLD_URL),
  ]);

  const pdf = await PDFDocument.load(tplBytes);
  pdf.registerFontkit(fontkit);

  const fontReg = await pdf.embedFont(regBytes, { subset: true });
  const fontBold = await pdf.embedFont(boldBytes, { subset: true });
  const fontExBold = await pdf.embedFont(exBoldBytes, { subset: true }).catch(() => fontBold);

  // Fallback for any glyphs not in Latin subset (defensive — shouldn't trigger for our inputs)
  void (await pdf.embedFont(StandardFonts.Helvetica));

  const page = pdf.getPage(0);

  // ── 1. Project Name (large orange) — replaces "(Nama Penawaran)" ──
  // Mask the placeholder area first.
  mask(page, WHITE, 50, 248, 220, 88);
  const projectName = (data.projectName || "—").trim();
  // Wrap to max 2 lines, auto-shrink to fit width
  const projLines = wrapText(projectName, fontExBold, 30, 220 * SCALE, 2);
  let py = 268;
  for (const line of projLines) {
    drawText(page, line, { leftPx: 60, topPx: py, size: 30, font: fontExBold, color: ORANGE_TEXT });
    py += 36;
  }

  // ── 2. Timeline — replaces "5 Juli - 11 Juli 2026" ──
  mask(page, WHITE, 50, 340, 230, 22);
  drawText(page, data.timeline || "—", {
    leftPx: 60, topPx: 343, size: 13, font: fontReg, color: DARK, maxWidthPx: 220,
  });

  // ── 3. Invoice to (Nama Customer) ──
  mask(page, WHITE, 340, 244, 175, 24);
  drawText(page, data.customerName || "—", {
    leftPx: 343, topPx: 247, size: 13, font: fontBold, color: ORANGE_TEXT, maxWidthPx: 170,
  });

  // ── 4. Date ──
  mask(page, WHITE, 535, 244, 175, 24);
  drawText(page, data.date || "—", {
    leftPx: 540, topPx: 247, size: 13, font: fontBold, color: ORANGE_TEXT, maxWidthPx: 170,
  });

  // ── 5. Hotel Makkah ──
  mask(page, WHITE, 50, 388, 280, 38); // hotel name slot
  drawText(page, data.hotelMakkah || "—", {
    leftPx: 60, topPx: 392, size: 22, font: fontExBold, color: ORANGE_TEXT, maxWidthPx: 270,
  });
  mask(page, WHITE, 50, 432, 200, 22); // nights slot
  drawText(page, `${Math.max(0, data.makkahNights || 0)} Malam`, {
    leftPx: 60, topPx: 434, size: 12, font: fontReg, color: DARK,
  });

  // ── 6. Hotel Madinah ──
  mask(page, WHITE, 410, 388, 290, 38);
  drawText(page, data.hotelMadinah || "—", {
    leftPx: 420, topPx: 392, size: 22, font: fontExBold, color: ORANGE_TEXT, maxWidthPx: 280,
  });
  mask(page, WHITE, 410, 432, 200, 22);
  drawText(page, `${Math.max(0, data.madinahNights || 0)} Malam`, {
    leftPx: 420, topPx: 434, size: 12, font: fontReg, color: DARK,
  });

  // ── 7. Pax box (orange) — mask with orange & redraw ──
  // Box covers approx x:62-145, y:520-585 (image px)
  mask(page, ORANGE, 62, 520, 84, 66);
  drawTextCentered(page, String(Math.max(0, data.pax || 0)), {
    leftPx: 62, topPx: 520, widthPx: 84, heightPx: 66, size: 30, font: fontExBold, color: WHITE,
  });

  // ── 8. Harga per Pax box (orange) ──
  mask(page, ORANGE, 283, 520, 385, 66);
  drawTextCentered(page, fmtIdr(data.pricePerPaxIDR || 0), {
    leftPx: 283, topPx: 520, widthPx: 385, heightPx: 66, size: 28, font: fontExBold, color: WHITE,
  });

  // ── 9. Kurs note (line 2 of asterisk notes) ──
  mask(page, WHITE, 50, 622, 320, 18);
  const kurs = data.kursIdrPerUsd && data.kursIdrPerUsd > 0
    ? Math.round(data.kursIdrPerUsd).toLocaleString("id-ID")
    : "17.100";
  drawText(page, `* Kurs IDR ${kurs}/USD`, {
    leftPx: 60, topPx: 623, size: 11, font: fontReg, color: DARK,
  });

  // ── 10. Bullet list — Sudah Termasuk ──
  // 5 rows. Row centers (image y-px): 722, 750, 778, 806, 834. Width ~290 px each.
  drawList(page, data.included, {
    leftPx: 70, topPx: 712, widthPx: 270, rowHeight: 28, font: fontBold, color: DARK, maskColor: WHITE,
  });

  // ── 11. Bullet list — Belum Termasuk ──
  drawList(page, data.excluded, {
    leftPx: 432, topPx: 712, widthPx: 270, rowHeight: 28, font: fontBold, color: DARK, maskColor: WHITE,
  });

  return pdf.save();
}

function drawList(
  page: PDFPage,
  items: string[],
  opts: { leftPx: number; topPx: number; widthPx: number; rowHeight: number; font: PDFFont; color: RGB; maskColor: RGB },
) {
  const cleaned = items.map((s) => s.trim()).filter(Boolean).slice(0, 5);
  for (let i = 0; i < 5; i++) {
    const top = opts.topPx + i * opts.rowHeight;
    // Mask placeholder text in the row (leave the row separator lines + numbers visible)
    mask(page, opts.maskColor, opts.leftPx, top + 4, opts.widthPx, opts.rowHeight - 8);
    const text = cleaned[i];
    if (text) {
      drawTextCentered(page, text, {
        leftPx: opts.leftPx,
        topPx: top + 4,
        widthPx: opts.widthPx,
        heightPx: opts.rowHeight - 8,
        size: 12,
        font: opts.font,
        color: opts.color,
      });
    }
  }
}

/** Word-wrap with auto-shrink. */
function wrapText(text: string, font: PDFFont, startSize: number, maxWidth: number, maxLines: number): string[] {
  let size = startSize;
  while (size > 12) {
    const lines = wrapAtSize(text, font, size, maxWidth);
    if (lines.length <= maxLines) return lines;
    size -= 1;
  }
  return wrapAtSize(text, font, size, maxWidth).slice(0, maxLines);
}

function wrapAtSize(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      line = trial;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

/** Build & trigger browser download. */
export async function downloadIghPdf(data: IghPdfData, fileName?: string): Promise<void> {
  const bytes = await buildIghPdf(data);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = (data.projectName || "IGH-Penawaran").replace(/[^a-z0-9-_]+/gi, "_");
  a.download = fileName || `${safe}_${(data.customerName || "Customer").replace(/[^a-z0-9-_]+/gi, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Render preview image (PNG data URL) of the filled PDF — uses pdfjs-dist. */
export async function renderIghPdfPreview(data: IghPdfData, scale = 1.5): Promise<string> {
  const bytes = await buildIghPdf(data);
  // Lazy import to avoid bundling pdfjs in the main chunk
  const pdfjs = await import("pdfjs-dist");
  // Use the worker bundled by Vite
  // @ts-expect-error - worker import handled by vite
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/png");
}
