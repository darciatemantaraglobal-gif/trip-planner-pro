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

// PDF Underlay: blank template (cuma label & frame, tanpa placeholder text).
// Data dari calculator di-"ketik" di atasnya pakai pdf-lib + Montserrat Bold.
const TEMPLATE_URL = "/igh-blank-template.pdf";
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
const ORANGE_TEXT: RGB = rgb(0.945, 0.471, 0.118); // #F1781E — headings & values
const DARK: RGB = rgb(0.13, 0.13, 0.13);          // body text
const DARK_BROWN: RGB = rgb(0.20, 0.14, 0.10);    // project name — kontras hangat vs label grey
const GREY_MUTED: RGB = rgb(0.42, 0.42, 0.42);    // sub-info (jumlah malam, dll)
const WHITE: RGB = rgb(1, 1, 1);

// ── LAYOUT GRID (kolom & anchor — semua dalam template px space 740×1024) ──
// Halaman dibagi 2 kolom utama (kiri & kanan) dengan margin konsisten.
const COL_LEFT_X = 55;        // start kolom kiri (Project, Hotel Makkah, list kiri)
const COL_RIGHT_X = 410;      // start kolom kanan (Hotel Madinah, list kanan)
const PAGE_RIGHT_X = 700;     // batas kanan untuk teks rata-kanan
const COL_WIDTH = 305;        // lebar konten per kolom

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

/** Draw text and shrink size if needed to fit max width.
 *  Final fallback: truncate with ellipsis if still over-width at minSize
 *  (prevents silent overflow into adjacent columns). */
function drawTextFit(
  page: PDFPage,
  text: string,
  opts: { leftPx: number; topPx: number; size: number; minSize?: number; font: PDFFont; color: RGB; maxWidthPx: number },
) {
  const max = opts.maxWidthPx * SCALE;
  let size = opts.size;
  const minSize = opts.minSize ?? 10;
  while (size > minSize && opts.font.widthOfTextAtSize(text, size) > max) size -= 0.5;
  const value =
    opts.font.widthOfTextAtSize(text, size) > max
      ? truncateToWidth(text, opts.font, size, max)
      : text;
  const x = opts.leftPx * SCALE;
  const y = PAGE_H - opts.topPx * SCALE - size * 0.82;
  page.drawText(value, { x, y, size, font: opts.font, color: opts.color });
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

/** Draw text right-aligned to a given right anchor (px). Auto-shrinks if maxWidth provided. */
function drawTextRight(
  page: PDFPage,
  text: string,
  opts: { rightPx: number; topPx: number; size: number; minSize?: number; font: PDFFont; color: RGB; maxWidthPx?: number },
) {
  let size = opts.size;
  const minSize = opts.minSize ?? 9;
  const maxW = opts.maxWidthPx ? opts.maxWidthPx * SCALE : Infinity;
  while (size > minSize && opts.font.widthOfTextAtSize(text, size) > maxW) size -= 0.5;
  const value = opts.font.widthOfTextAtSize(text, size) > maxW
    ? truncateToWidth(text, opts.font, size, maxW)
    : text;
  const w = opts.font.widthOfTextAtSize(value, size);
  const x = opts.rightPx * SCALE - w;
  const y = PAGE_H - opts.topPx * SCALE - size * 0.82;
  page.drawText(value, { x, y, size, font: opts.font, color: opts.color });
}

/** Draw text horizontally centered inside a given pixel rectangle.
 *  Auto-shrinks down to 8pt; final fallback is ellipsis truncation so very
 *  long inputs never bleed past the box boundary. */
function drawTextCentered(
  page: PDFPage,
  text: string,
  opts: { leftPx: number; topPx: number; widthPx: number; heightPx: number; size: number; font: PDFFont; color: RGB },
) {
  const r = pxRect(opts.leftPx, opts.topPx, opts.widthPx, opts.heightPx);
  const maxW = r.width - 8;
  let size = opts.size;
  let textW = opts.font.widthOfTextAtSize(text, size);
  while (textW > maxW && size > 8) {
    size -= 1;
    textW = opts.font.widthOfTextAtSize(text, size);
  }
  let value = text;
  if (textW > maxW) {
    value = truncateToWidth(text, opts.font, size, maxW);
    textW = opts.font.widthOfTextAtSize(value, size);
  }
  const x = r.x + (r.width - textW) / 2;
  const y = r.y + (r.height - size * 0.82) / 2;
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

  // ── PDF UNDERLAY MODE ──────────────────────────────────────────────────
  // Template `igh-blank-template.pdf` cuma punya label & frame (tanpa
  // placeholder text), jadi semua teks digambar TRANSPARAN — gak ada mask
  // box putih di belakangnya. Semua data utama pakai Montserrat Bold/ExtraBold.
  // Koordinat di bawah adalah TEBAKAN AWAL (px space 740×1024) — gampang
  // di-tweak per-field tanpa risiko ngebocorin warna mask.

  // ── 1. HEADER META (kanan atas) ──
  // Label "Invoice to :" & "Date :" baked in template (sejajar horizontal).
  // Value di-DRAW rata-kanan tepat di BAWAH masing-masing label, biar block-nya
  // kebaca sebagai: [LABEL]
  //                 [VALUE rata kanan]
  // Anchor kanan: kolom invoice berakhir di x=445, kolom date berakhir di x=PAGE_RIGHT_X.
  const META_VALUE_TOP = 273;   // tepat di bawah baris label (label baseline ~250)
  drawTextRight(page, data.customerName || "—", {
    rightPx: 445, topPx: META_VALUE_TOP, size: 12, font: fontBold, color: ORANGE_TEXT, maxWidthPx: 165,
  });
  drawTextRight(page, data.date || "—", {
    rightPx: PAGE_RIGHT_X, topPx: META_VALUE_TOP, size: 12, font: fontBold, color: ORANGE_TEXT, maxWidthPx: 175,
  });

  // ── 2. PROJECT SECTION (kiri atas) ──
  // Project name DI BAWAH label "Project :" (label berada di y≈250 di template),
  // line-height lega (1.30) biar dua baris nggak nempel, warna dark-brown buat
  // kontras hangat dengan label grey.
  const projectName = (data.projectName || "—").trim();
  let projSize = 20;
  let projLines: string[] = [projectName];
  while (projSize > 12) {
    projLines = wrapAtSize(projectName, fontExBold, projSize, COL_WIDTH * SCALE);
    if (projLines.length <= 2) break;
    projSize -= 1;
  }
  if (projLines.length > 2) projLines = projLines.slice(0, 2);
  const projLH = projSize * 1.30;
  const PROJECT_TOP = 278; // mulai dari sini, di bawah label "Project :"
  let py = PROJECT_TOP;
  for (const line of projLines) {
    drawText(page, line, { leftPx: COL_LEFT_X, topPx: py, size: projSize, font: fontExBold, color: DARK_BROWN });
    py += projLH;
  }

  // ── Timeline (Periode) — left-align persis di bawah Project Name ──
  const timelineTop = py + 6;
  drawText(page, data.timeline || "—", {
    leftPx: COL_LEFT_X, topPx: timelineTop, size: 11, font: fontBold, color: GREY_MUTED, maxWidthPx: COL_WIDTH,
  });

  // ── 3. HOTEL SECTION (dua kolom sejajar — LEFT ALIGN) ──
  // Label "Hotel Makkah" & "Hotel Madinah" baked in template di y≈370 (kiri & kanan).
  // Nama hotel (Bold Orange) di atas — Jumlah Malam (Regular Grey) tepat di bawahnya.
  const HOTEL_NAME_TOP = 410;
  const HOTEL_NIGHTS_TOP = 445;
  drawTextFit(page, data.hotelMakkah || "—", {
    leftPx: COL_LEFT_X, topPx: HOTEL_NAME_TOP, size: 18, minSize: 10,
    font: fontExBold, color: ORANGE_TEXT, maxWidthPx: COL_WIDTH,
  });
  drawText(page, `${Math.max(0, data.makkahNights || 0)} Malam`, {
    leftPx: COL_LEFT_X, topPx: HOTEL_NIGHTS_TOP, size: 11, font: fontReg, color: GREY_MUTED,
  });
  drawTextFit(page, data.hotelMadinah || "—", {
    leftPx: COL_RIGHT_X, topPx: HOTEL_NAME_TOP, size: 18, minSize: 10,
    font: fontExBold, color: ORANGE_TEXT, maxWidthPx: COL_WIDTH - 30,
  });
  drawText(page, `${Math.max(0, data.madinahNights || 0)} Malam`, {
    leftPx: COL_RIGHT_X, topPx: HOTEL_NIGHTS_TOP, size: 11, font: fontReg, color: GREY_MUTED,
  });

  // ── 4. PRICING BOXES (Pax & Harga per Pax) — center vertical+horizontal ──
  // Box oranye baked in template. Kita tinggal taruh teks tepat di tengahnya.
  // Tambah top-padding ~3px biar nggak mepet ke atas box.
  const PAX_BOX = { leftPx: 50, topPx: 545, widthPx: 105, heightPx: 60 };
  const PRICE_BOX = { leftPx: 230, topPx: 545, widthPx: 470, heightPx: 60 };
  drawTextCentered(page, String(Math.max(0, data.pax || 0)), {
    ...PAX_BOX, size: 26, font: fontExBold, color: WHITE,
  });
  drawTextCentered(page, fmtIdr(data.pricePerPaxIDR || 0), {
    ...PRICE_BOX, size: 24, font: fontExBold, color: WHITE,
  });

  // ── 5. KURS NOTE (rata kiri di bawah box harga) ──
  const kurs = data.kursIdrPerUsd && data.kursIdrPerUsd > 0
    ? Math.round(data.kursIdrPerUsd).toLocaleString("id-ID")
    : "17.100";
  drawText(page, `* Kurs IDR ${kurs}/USD`, {
    leftPx: COL_LEFT_X, topPx: 638, size: 10, font: fontReg, color: GREY_MUTED,
  });

  // ── 6. CHECKLIST (Sudah / Belum Termasuk) — LEFT ALIGN dengan line spacing konsisten ──
  // Header box hijau & merah baked di template di y≈700. Line "01..05" di y≈735+.
  // Item teks dimulai sedikit setelah nomor (offset 22px) supaya nggak nimpa nomor.
  const LIST_TOP = 738;     // baseline baris pertama (sedikit di atas underline)
  const LIST_ROW_H = 28;    // jarak antar baris konsisten
  const LIST_TEXT_OFFSET = 22; // geser kanan biar nggak nabrak nomor "01"
  drawList(page, data.included, {
    leftPx: COL_LEFT_X + LIST_TEXT_OFFSET, topPx: LIST_TOP, widthPx: 235 - LIST_TEXT_OFFSET,
    rowHeight: LIST_ROW_H, font: fontBold, color: DARK,
  });
  drawList(page, data.excluded, {
    leftPx: COL_RIGHT_X + LIST_TEXT_OFFSET, topPx: LIST_TOP, widthPx: 235 - LIST_TEXT_OFFSET,
    rowHeight: LIST_ROW_H, font: fontBold, color: DARK,
  });

  return pdf.save();
}

/** Draw checklist column dengan LEFT ALIGN dan line-spacing konsisten.
 *  Auto-shrink (drawTextFit) jaga supaya item panjang nggak ngelimpas kolom. */
function drawList(
  page: PDFPage,
  items: string[],
  opts: { leftPx: number; topPx: number; widthPx: number; rowHeight: number; font: PDFFont; color: RGB },
) {
  const cleaned = items.map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const FONT_SIZE = 11;
  for (let i = 0; i < cleaned.length; i++) {
    const top = opts.topPx + i * opts.rowHeight;
    drawTextFit(page, cleaned[i], {
      leftPx: opts.leftPx,
      topPx: top,
      size: FONT_SIZE,
      minSize: 8,
      font: opts.font,
      color: opts.color,
      maxWidthPx: opts.widthPx,
    });
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
