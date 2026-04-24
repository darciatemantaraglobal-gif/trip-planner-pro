import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  DEFAULT_IGH_LAYOUT,
  FONT_FAMILY_URLS,
  mergeConfig,
  type IghFontFamily,
  type IghLayoutConfig,
  type IghSection,
} from "./ighPdfConfig";

export type { IghLayoutConfig } from "./ighPdfConfig";

/**
 * Generator PDF berbasis template `igh-blank-template.pdf`.
 *
 * Semua koordinat hidup di `ighPdfConfig.ts` dan bisa di-tune via PdfLayoutTuner.
 * Override teks per-section juga didukung (kalau diisi, menimpa data kalkulator).
 */

const TEMPLATE_URL = "/igh-blank-template.pdf";
const TEMPLATE_GROUP_URL = "/templates/IGH_Blank_Template_Group.pdf";

// Template canonical pixel size (matches the 150-DPI render of igh-template.pdf)
const TPL_W_PX = 740;
const PAGE_W = 413.9506;
const PAGE_H = 572.532;
const SCALE = PAGE_W / TPL_W_PX; // ≈ 0.5594

// Brand colors — Orange #F28E34 untuk semua data isian
const ORANGE: RGB = rgb(0xF2 / 255, 0x8E / 255, 0x34 / 255);
const GREY_MUTED: RGB = rgb(0.45, 0.45, 0.45);
const DARK: RGB = rgb(0.13, 0.13, 0.13);
const WHITE: RGB = rgb(1, 1, 1);

export interface IghGroupPricingRow {
  /** Label kolom Total Pax (mis. "10-15"). */
  paxLabel: string;
  /** Harga per-pax sudah dalam display currency (USD/SAR/IDR). 0/undefined = "—". */
  quad?: number;
  triple?: number;
  double?: number;
}

export interface IghPdfData {
  projectName: string;
  timeline: string;
  customerName: string;
  date: string;
  hotelMakkah: string;
  makkahNights: number;
  hotelMadinah: string;
  madinahNights: number;
  pax: number;
  pricePerPaxIDR: number;
  kursIdrPerUsd?: number;
  included: string[];
  excluded: string[];
  /** Mode template. Default 'private' (template lama). */
  mode?: "private" | "group";
  /** Data tabel grup — dipakai cuma kalau mode='group'. */
  groupPricing?: IghGroupPricingRow[];
}

// ── Coordinate helpers ─────────────────────────────────────────────────────

function pxRect(leftPx: number, topPx: number, widthPx: number, heightPx: number) {
  const x = leftPx * SCALE;
  const w = widthPx * SCALE;
  const h = heightPx * SCALE;
  const y = PAGE_H - topPx * SCALE - h;
  return { x, y, width: w, height: h };
}

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
  const y = PAGE_H - opts.topPx * SCALE - size * 0.78;
  page.drawText(value, { x, y, size, font: opts.font, color: opts.color });
}

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
    yOffsetPdf?: number;
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
  const cap = size * 0.70;
  const x = r.x + (r.width - textW) / 2;
  const yOff = opts.yOffsetPdf ?? 0;
  const y = r.y + (r.height - cap) / 2 + yOff;
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

/** Format harga dengan symbol prefix (mis. "$815"). 0/undefined → "—". */
function fmtMoney(n: number | undefined, symbol: string): string {
  if (!n || !Number.isFinite(n) || n <= 0) return "—";
  const rounded = Math.round(n);
  // USD/SAR pakai pemisah "," (en-US). Kalau Rp, biarin id-ID.
  const locale = symbol.trim().toLowerCase().startsWith("rp") ? "id-ID" : "en-US";
  return `${symbol}${rounded.toLocaleString(locale)}`;
}

/** Pilih nilai dari override teks vs data kalkulator. */
function pick(override: string | undefined, fallback: string): string {
  const v = (override ?? "").trim();
  return v.length > 0 ? override! : fallback;
}

export async function buildIghPdf(data: IghPdfData, layout?: Partial<IghLayoutConfig>): Promise<Uint8Array> {
  const cfg = mergeConfig(DEFAULT_IGH_LAYOUT, layout);
  const isGroup = data.mode === "group";
  const tplBytes = await fetchBytes(isGroup ? TEMPLATE_GROUP_URL : TEMPLATE_URL);

  const pdf = await PDFDocument.load(tplBytes);
  pdf.registerFontkit(fontkit);

  const usedFamilies = new Set<IghFontFamily>([cfg.fonts.family]);
  for (const fam of Object.values(cfg.fonts.overrides ?? {})) {
    if (fam) usedFamilies.add(fam);
  }
  const familyFonts: Record<string, { regular: PDFFont; semiBold: PDFFont; bold: PDFFont }> = {};
  await Promise.all(
    Array.from(usedFamilies).map(async (fam) => {
      const urls = FONT_FAMILY_URLS[fam];
      const [regBytes, sbBytes, boldBytes] = await Promise.all([
        fetchBytes(urls.regular),
        fetchBytes(urls.semiBold),
        fetchBytes(urls.bold),
      ]);
      familyFonts[fam] = {
        regular: await pdf.embedFont(regBytes, { subset: true }),
        semiBold: await pdf.embedFont(sbBytes, { subset: true }),
        bold: await pdf.embedFont(boldBytes, { subset: true }),
      };
    }),
  );

  void (await pdf.embedFont(StandardFonts.Helvetica));

  const fontFor = (section: IghSection, weight: "regular" | "semiBold" | "bold"): PDFFont => {
    const fam = cfg.fonts.overrides?.[section] ?? cfg.fonts.family;
    const set = familyFonts[fam] ?? familyFonts[cfg.fonts.family];
    return set[weight];
  };

  const page = pdf.getPage(0);

  // ── 1. PROJECT name + timeline ──
  const projectName = pick(cfg.projectName.text, (data.projectName || "—").trim());
  let projSize = cfg.projectName.size;
  let projLines: string[] = [projectName];
  const projMaxW = 285 * SCALE;
  const projBold = fontFor("projectName", "bold");
  const projReg = fontFor("projectName", "regular");
  while (projSize > 14) {
    projLines = wrapAtSize(projectName, projBold, projSize, projMaxW);
    if (projLines.length <= 2) break;
    projSize -= 1;
  }
  if (projLines.length > 2) projLines = projLines.slice(0, 2);
  // Pakai lineGap absolut (px) supaya user bisa rapetin/longgarin tanpa tergantung font size.
  const projLH = projSize + cfg.projectName.lineGapPx;
  let py = cfg.projectName.topPx;
  for (const line of projLines) {
    drawText(page, line, {
      leftPx: cfg.projectName.xPx, topPx: py, size: projSize, font: projBold, color: ORANGE,
    });
    py += projLH;
  }

  // Timeline (Periode)
  drawText(page, data.timeline || "—", {
    leftPx: cfg.projectName.xPx, topPx: py + 6, size: 11, font: projReg, color: GREY_MUTED, maxWidthPx: 285,
  });

  // ── 2. HEADER META (Invoice to & Date) ──
  const metaReg = fontFor("metaInfo", "regular");
  drawText(page, pick(cfg.metaInfo.customerText, data.customerName || "—"), {
    leftPx: cfg.metaInfo.customerXPx, topPx: cfg.metaInfo.topPx, size: cfg.metaInfo.size,
    font: metaReg, color: ORANGE, maxWidthPx: 175,
  });
  drawText(page, pick(cfg.metaInfo.dateText, data.date || "—"), {
    leftPx: cfg.metaInfo.dateXPx, topPx: cfg.metaInfo.topPx, size: cfg.metaInfo.size,
    font: metaReg, color: ORANGE, maxWidthPx: 175,
  });

  // ── 3. HOTEL SECTION ──
  const hotelBold = fontFor("hotel", "bold");
  const hotelReg = fontFor("hotel", "regular");
  // Subtitle "X Malam" scaling proportional ke hotel.size dengan rasio 0.45,
  // clamp 7..14 agar tetap readable dan tidak overlap dengan elemen di bawahnya.
  const subtitleSize = Math.max(7, Math.min(14, cfg.hotel.size * 0.45));
  drawText(page, pick(cfg.hotel.makkahText, data.hotelMakkah || "—"), {
    leftPx: cfg.hotel.makkahXPx, topPx: cfg.hotel.topPx, size: cfg.hotel.size,
    minSize: 12, font: hotelBold, color: ORANGE, maxWidthPx: 285,
  });
  drawText(page, `${Math.max(0, data.makkahNights || 0)} Malam`, {
    leftPx: cfg.hotel.makkahXPx, topPx: cfg.hotel.topPx + cfg.hotel.subtitleOffsetPx, size: subtitleSize, font: hotelReg, color: DARK,
  });
  drawText(page, pick(cfg.hotel.madinahText, data.hotelMadinah || "—"), {
    leftPx: cfg.hotel.madinahXPx, topPx: cfg.hotel.topPx, size: cfg.hotel.size,
    minSize: 12, font: hotelBold, color: ORANGE, maxWidthPx: 285,
  });
  drawText(page, `${Math.max(0, data.madinahNights || 0)} Malam`, {
    leftPx: cfg.hotel.madinahXPx, topPx: cfg.hotel.topPx + cfg.hotel.subtitleOffsetPx, size: subtitleSize, font: hotelReg, color: DARK,
  });

  // ── 4. PRICING ──
  if (isGroup) {
    // Group template: tabel 4 kolom (Total Pax | Quad | Triple | Double),
    // multi-row stacked. Color ORANGE, true center horizontal & vertical.
    const gp = cfg.groupPricing;
    const groupBold = fontFor("groupPricing", "bold");
    const rows = data.groupPricing ?? [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const topPx = gp.topPx + i * gp.rowSpacingPx;
      // Lebar kolom virtual buat truncation budget; cukup besar.
      const COL_W = 110;
      // Helper: render satu sel di X-center tertentu, true-center vertikal.
      const cell = (centerXPx: number, text: string) => {
        drawTextCentered(page, text, {
          leftPx: centerXPx - COL_W / 2,
          topPx,
          widthPx: COL_W,
          heightPx: gp.cellHeightPx,
          size: gp.size,
          minSize: 9,
          font: groupBold,
          color: ORANGE,
        });
      };
      cell(gp.paxCenterXPx, row.paxLabel || "—");
      cell(gp.quadCenterXPx + gp.quadXOffsetPx, fmtMoney(row.quad, gp.currencySymbol));
      cell(gp.tripleCenterXPx + gp.tripleXOffsetPx, fmtMoney(row.triple, gp.currencySymbol));
      cell(gp.doubleCenterXPx + gp.doubleXOffsetPx, fmtMoney(row.double, gp.currencySymbol));
    }
  } else {
    // Private template: 2 kotak orange (Pax + Harga per Pax).
    const priceBold = fontFor("pricing", "bold");
    const PAX_BOX = { leftPx: cfg.pricing.paxXPx, topPx: cfg.pricing.topPx, widthPx: 114, heightPx: 61 };
    const PRICE_BOX = { leftPx: cfg.pricing.priceXPx, topPx: cfg.pricing.topPx, widthPx: 406, heightPx: 61 };
    const paxText = pick(cfg.pricing.paxText, String(Math.max(0, data.pax || 0)));
    const priceText = pick(cfg.pricing.priceText, fmtIdr(data.pricePerPaxIDR || 0));
    drawTextCentered(page, paxText, {
      ...PAX_BOX, size: cfg.pricing.size + 4, minSize: 14, font: priceBold, color: WHITE,
      yOffsetPdf: cfg.pricing.yOffsetPdf,
    });
    drawTextCentered(page, priceText, {
      ...PRICE_BOX, size: cfg.pricing.size, minSize: 12, font: priceBold, color: WHITE,
      yOffsetPdf: cfg.pricing.yOffsetPdf,
    });
  }

  // ── 5. CHECKLIST ──
  const listFont = fontFor("checklist", "semiBold");
  const ROW_BASELINES = Array.from({ length: 5 }, (_, i) =>
    cfg.checklist.firstBaselinePx + i * cfg.checklist.rowSpacingPx + cfg.checklist.yOffsetPx,
  );
  const includedItems = splitOverrideOrUse(cfg.checklist.includedText, data.included);
  const excludedItems = splitOverrideOrUse(cfg.checklist.excludedText, data.excluded);
  drawList(page, includedItems, ROW_BASELINES, cfg.checklist.leftXPx, listFont, cfg.checklist.size);
  drawList(page, excludedItems, ROW_BASELINES, cfg.checklist.rightXPx, listFont, cfg.checklist.size);

  return pdf.save();
}

function splitOverrideOrUse(override: string | undefined, fallback: string[]): string[] {
  const v = (override ?? "").trim();
  if (!v) return fallback;
  return v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

/** Draw checklist column dengan teks center-horizontal. `centerXPx` = tengah kolom. */
function drawList(
  page: PDFPage,
  items: string[],
  rowBaselines: number[],
  centerXPx: number,
  font: PDFFont,
  baseSize = 10,
) {
  const cleaned = items.map((s) => s.trim()).filter(Boolean).slice(0, rowBaselines.length);
  // Width budget per row ~ 235px (kolom asli template).
  const COL_WIDTH = 235;
  const maxW = (COL_WIDTH - 8) * SCALE;
  for (let i = 0; i < cleaned.length; i++) {
    const baselinePx = rowBaselines[i];
    let size = baseSize;
    while (size > 7 && font.widthOfTextAtSize(cleaned[i], size) > maxW) size -= 0.5;
    const value = font.widthOfTextAtSize(cleaned[i], size) > maxW
      ? truncateToWidth(cleaned[i], font, size, maxW)
      : cleaned[i];
    const textW = font.widthOfTextAtSize(value, size);
    const x = centerXPx * SCALE - textW / 2;
    const y = PAGE_H - baselinePx * SCALE;
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

export async function downloadIghPdf(
  data: IghPdfData,
  fileName?: string,
  layout?: Partial<IghLayoutConfig>,
): Promise<void> {
  const bytes = await buildIghPdf(data, layout);
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

export async function renderIghPdfPreview(
  data: IghPdfData,
  scale = 1.5,
  layout?: Partial<IghLayoutConfig>,
): Promise<string> {
  const bytes = await buildIghPdf(data, layout);
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
