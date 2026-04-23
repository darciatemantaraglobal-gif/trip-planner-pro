import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Generator PDF berbasis template `igh-blank-template.pdf`.
 *
 * Koordinat dikalibrasi langsung dari raster render template @ 740×1024 px.
 * Label "Invoice to :", "Date :", "Hotel Makkah/Madinah", "Jumlah Pax :",
 * "Harga per Pax :", "Sudah/Belum Termasuk", dan kotak orange semuanya
 * sudah baked di template — kita tinggal overlay value-nya pakai Sk-Modernist.
 *
 * Posisi terukur (top-origin, 740×1024 px space):
 *   - "Invoice to :"  baseline yTop=235.3, x=335.4, size=11.6
 *   - "Date :"        baseline yTop=235.5, x=538.0, size=11.6
 *   - "Hotel Makkah"  baseline yTop=385.1, x=50.9,  size=15.4
 *   - "Hotel Madinah" baseline yTop=385.1, x=407.3, size=15.4
 *   - "Jumlah Pax :"  baseline yTop=507.7, x=50.9,  size=15.4
 *   - "Harga per Pax" baseline yTop=507.7, x=419.4, size=15.4
 *   - PAX BOX   x≈47..161  (w114), y≈518..579 (h61)
 *   - PRICE BOX x≈272..678 (w406), y≈518..579 (h61)
 *   - Sudah/Belum pill baseline yTop=687.1
 *   - Numbered list digit-baselines y ≈ 725, 753, 781, 806, 834
 *   - Underlines  ≈ 735, 764, 791, 818, (845)
 *   - Underline x: left 45..330, right 409..694
 */

const TEMPLATE_URL = "/igh-blank-template.pdf";
const FONT_REGULAR_URL = "/fonts/Sk-Modernist-Regular.otf";
const FONT_BOLD_URL = "/fonts/Sk-Modernist-Bold.otf";

// Template canonical pixel size (matches the 150-DPI render of igh-template.pdf)
const TPL_W_PX = 740;
const PAGE_W = 413.9506;
const PAGE_H = 572.532;
const SCALE = PAGE_W / TPL_W_PX; // ≈ 0.5594

// Brand colors — Orange #F28E34 untuk semua data isian
const ORANGE: RGB = rgb(0xF2 / 255, 0x8E / 255, 0x34 / 255); // #F28E34
const GREY_LABEL: RGB = rgb(0.36, 0.36, 0.36);  // small grey labels (Project :)
const GREY_MUTED: RGB = rgb(0.45, 0.45, 0.45);  // sub-info (jumlah malam, kurs)
const DARK: RGB = rgb(0.13, 0.13, 0.13);        // list item text
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

/** Draw text using top-left pixel coords; size is in PDF points.
 *  Optionally auto-shrinks to fit maxWidthPx (with ellipsis fallback). */
function drawText(
  page: PDFPage,
  text: string,
  opts: {
    leftPx: number;
    topPx: number;
    size: number;
    minSize?: number;
    font: PDFFont;
    color: RGB;
    maxWidthPx?: number;
  },
) {
  let size = opts.size;
  const minSize = opts.minSize ?? Math.max(8, opts.size - 6);
  const maxW = opts.maxWidthPx ? opts.maxWidthPx * SCALE : Infinity;
  while (size > minSize && opts.font.widthOfTextAtSize(text, size) > maxW) size -= 0.5;
  const value =
    opts.font.widthOfTextAtSize(text, size) > maxW
      ? truncateToWidth(text, opts.font, size, maxW)
      : text;
  const x = opts.leftPx * SCALE;
  // Place top of text at topPx — pdf-lib draws at baseline, cap-height ≈ size*0.78
  const y = PAGE_H - opts.topPx * SCALE - size * 0.78;
  page.drawText(value, { x, y, size, font: opts.font, color: opts.color });
}

/** Draw text horizontally + vertically centered inside a pixel rectangle.
 *  Uses cap-height (~0.70 × size) for true visual centering. */
function drawTextCentered(
  page: PDFPage,
  text: string,
  opts: {
    leftPx: number;
    topPx: number;
    widthPx: number;
    heightPx: number;
    size: number;
    minSize?: number;
    font: PDFFont;
    color: RGB;
  },
) {
  const r = pxRect(opts.leftPx, opts.topPx, opts.widthPx, opts.heightPx);
  const maxW = r.width - 16;
  const minSize = opts.minSize ?? 10;
  let size = opts.size;
  let textW = opts.font.widthOfTextAtSize(text, size);
  while (textW > maxW && size > minSize) {
    size -= 0.5;
    textW = opts.font.widthOfTextAtSize(text, size);
  }
  let value = text;
  if (textW > maxW) {
    value = truncateToWidth(text, opts.font, size, maxW);
    textW = opts.font.widthOfTextAtSize(value, size);
  }
  const cap = size * 0.70; // visual cap height
  const x = r.x + (r.width - textW) / 2;
  const y = r.y + (r.height - cap) / 2;
  page.drawText(value, { x, y, size, font: opts.font, color: opts.color });
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
  const [tplBytes, regBytes, boldBytes] = await Promise.all([
    fetchBytes(TEMPLATE_URL),
    fetchBytes(FONT_REGULAR_URL),
    fetchBytes(FONT_BOLD_URL),
  ]);

  const pdf = await PDFDocument.load(tplBytes);
  pdf.registerFontkit(fontkit);

  const fontReg = await pdf.embedFont(regBytes, { subset: true });
  const fontBold = await pdf.embedFont(boldBytes, { subset: true });

  // Defensive Helvetica fallback (not actually drawn)
  void (await pdf.embedFont(StandardFonts.Helvetica));

  const page = pdf.getPage(0);

  // ── 1. PROJECT name + timeline (kiri atas) ──
  // Label "Project :" sudah baked di template, jadi tidak perlu digambar lagi.
  // Project Name — Orange Bold, multi-line dengan wrap di width kolom.
  const projectName = (data.projectName || "—").trim();
  let projSize = 22;
  let projLines: string[] = [projectName];
  const projMaxW = 285 * SCALE; // kolom kiri sebelum dipotong kolom Invoice
  while (projSize > 14) {
    projLines = wrapAtSize(projectName, fontBold, projSize, projMaxW);
    if (projLines.length <= 2) break;
    projSize -= 1;
  }
  if (projLines.length > 2) projLines = projLines.slice(0, 2);
  const projLH = projSize * 1.05;
  let py = 247; // top of first line, sedikit di bawah label "Project :"
  for (const line of projLines) {
    drawText(page, line, {
      leftPx: 55, topPx: py, size: projSize, font: fontBold, color: ORANGE,
    });
    py += projLH;
  }

  // Timeline (Periode) — grey muted, persis di bawah project name
  drawText(page, data.timeline || "—", {
    leftPx: 55, topPx: py + 6, size: 11, font: fontReg, color: GREY_MUTED, maxWidthPx: 285,
  });

  // ── 2. HEADER META (Invoice to & Date) ──
  // Label baseline yTop=235 → value mulai topPx=247 (8px di bawah label),
  // LEFT-aligned ke posisi label-nya (x=335 dan x=538).
  drawText(page, data.customerName || "—", {
    leftPx: 335, topPx: 247, size: 13, font: fontReg, color: ORANGE, maxWidthPx: 175,
  });
  drawText(page, data.date || "—", {
    leftPx: 538, topPx: 247, size: 13, font: fontReg, color: ORANGE, maxWidthPx: 175,
  });

  // ── 3. HOTEL SECTION ──
  // Label baseline yTop=385 → nama hotel topPx=395 (10px di bawah label), Orange Bold besar.
  drawText(page, data.hotelMakkah || "—", {
    leftPx: 51, topPx: 395, size: 22, minSize: 12, font: fontBold, color: ORANGE, maxWidthPx: 285,
  });
  drawText(page, `${Math.max(0, data.makkahNights || 0)} Malam`, {
    leftPx: 51, topPx: 433, size: 9, font: fontReg, color: DARK,
  });
  drawText(page, data.hotelMadinah || "—", {
    leftPx: 407, topPx: 395, size: 22, minSize: 12, font: fontBold, color: ORANGE, maxWidthPx: 285,
  });
  drawText(page, `${Math.max(0, data.madinahNights || 0)} Malam`, {
    leftPx: 407, topPx: 433, size: 9, font: fontReg, color: DARK,
  });

  // ── 4. PRICING BOXES (Pax & Harga per Pax) ──
  // Box terukur dari raster: pax x47..161 w114 / price x272..678 w406, y518..579 h61.
  const PAX_BOX = { leftPx: 47, topPx: 518, widthPx: 114, heightPx: 61 };
  const PRICE_BOX = { leftPx: 272, topPx: 518, widthPx: 406, heightPx: 61 };
  drawTextCentered(page, String(Math.max(0, data.pax || 0)), {
    ...PAX_BOX, size: 26, minSize: 14, font: fontBold, color: WHITE,
  });
  drawTextCentered(page, fmtIdr(data.pricePerPaxIDR || 0), {
    ...PRICE_BOX, size: 22, minSize: 12, font: fontBold, color: WHITE,
  });

  // ── 5. CHECKLIST (Sudah / Belum Termasuk) ──
  // Digit baseline rows: 725, 753, 781, 806, 834 (spacing ~28). Item text
  // di-CENTER horizontal di area setelah angka (left: x95..330, right: x459..694).
  const ROW_BASELINES = [725, 753, 781, 806, 834];
  const LEFT_AREA = { left: 95, width: 235 };
  const RIGHT_AREA = { left: 459, width: 235 };
  drawList(page, data.included, ROW_BASELINES, LEFT_AREA, fontBold);
  drawList(page, data.excluded, ROW_BASELINES, RIGHT_AREA, fontBold);

  return pdf.save();
}

/** Draw checklist column dengan item teks center-horizontal di tiap row,
 *  baseline tepat pada digit "01..05" yang sudah baked di template. */
function drawList(
  page: PDFPage,
  items: string[],
  rowBaselines: number[],
  area: { left: number; width: number },
  font: PDFFont,
) {
  const cleaned = items.map((s) => s.trim()).filter(Boolean).slice(0, rowBaselines.length);
  for (let i = 0; i < cleaned.length; i++) {
    const baselinePx = rowBaselines[i];
    // Convert digit-baseline to "topPx" so drawText (top-origin) lands aligned.
    // size*0.78 is cap-height offset used inside drawText.
    let size = 11;
    const maxW = (area.width - 8) * SCALE;
    while (size > 8 && font.widthOfTextAtSize(cleaned[i], size) > maxW) size -= 0.5;
    const value = font.widthOfTextAtSize(cleaned[i], size) > maxW
      ? truncateToWidth(cleaned[i], font, size, maxW)
      : cleaned[i];
    const textW = font.widthOfTextAtSize(value, size);
    const x = (area.left + area.width / 2) * SCALE - textW / 2;
    const y = PAGE_H - baselinePx * SCALE; // place baseline directly
    page.drawText(value, { x, y, size, font, color: DARK });
  }
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
  const pdfjs = await import("pdfjs-dist");
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
