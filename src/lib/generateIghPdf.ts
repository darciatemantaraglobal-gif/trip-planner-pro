import { PDFDocument, PDFName, PDFString, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  DEFAULT_IGH_LAYOUT,
  FONT_FAMILY_URLS,
  mergeConfig,
  type IghFontFamily,
  type IghLayoutConfig,
  type IghSection,
} from "./ighPdfConfig";
import {
  loadIghAdminSettings,
  formatWhatsappDisplay,
  whatsappDigits,
  whatsappUrl,
} from "./ighSettings";

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
// WhatsApp brand green #25D366
const WA_GREEN: RGB = rgb(0x25 / 255, 0xD3 / 255, 0x66 / 255);

export interface IghGroupPricingRow {
  /** Label kolom Total Pax (mis. "10-15"). */
  paxLabel: string;
  /** Harga per-pax sudah dalam display currency (USD/SAR/IDR). 0/undefined = "—". */
  quad?: number;
  triple?: number;
  double?: number;
  /** Canonical IDR values per kamar — dipake kalau pdfCurrency != displayCurrency
   *  supaya konversi akurat ke target apapun. Optional utk back-compat. */
  quadIDR?: number;
  tripleIDR?: number;
  doubleIDR?: number;
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
  /** IDR per 1 SAR — dipake utk konversi ke/dari SAR di PDF. */
  kursIdrPerSar?: number;
  included: string[];
  excluded: string[];
  /** Mode template. Default 'private' (template lama). */
  mode?: "private" | "group";
  /** Data tabel grup — dipakai cuma kalau mode='group'. */
  groupPricing?: IghGroupPricingRow[];
  /** Source currency dari nilai numeric `quad/triple/double` di groupPricing.
   *  Default "USD" (back-compat). Kalau `cfg.pdfCurrency` beda dari ini,
   *  generator otomatis konversi via IDR canonical / kurs. */
  displayCurrency?: "USD" | "IDR" | "SAR";
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

// ── Cache template & font bytes di module scope ─────────────────────────────
// Asset ini static (di-serve dari /public) jadi aman di-cache selama umur tab.
// Tanpa cache, tiap regenerate PDF nge-fetch ulang ~150KB template + ~1MB font
// (3 weights × 1+ family). Worst case di Bulk OCR sesi panjang bisa puluhan MB
// transfer + parse cost yang sebenarnya redundant.
//
// Pakai promise-cache (bukan bytes-cache) supaya request paralel pertama kali
// gak ngirim 2 fetch buat URL yang sama (request coalescing).
const bytesCache = new Map<string, Promise<Uint8Array>>();
function fetchBytesCached(url: string): Promise<Uint8Array> {
  let p = bytesCache.get(url);
  if (!p) {
    p = fetchBytes(url).catch((e) => {
      // Hapus dari cache supaya retry berikutnya bisa fetch ulang.
      bytesCache.delete(url);
      throw e;
    });
    bytesCache.set(url, p);
  }
  return p;
}

/** Format IDR ringkas utk hemat ruang di tabel:
 *   - >= 1 miliar → "1,2 M"   (1 desimal koma, satuan Miliar)
 *   - >= 1 juta   → "30,5 jt" (1 desimal koma, satuan juta)
 *   - < 1 juta    → "Rp 500.000" (full format id-ID)
 *  Decimal ".0" di-trim supaya 30 jt (bukan "30,0 jt"). */
function fmtCompactIdr(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const trim = (s: string) => s.replace(/,0$/, "");
  if (n >= 1_000_000_000) {
    return `${trim((n / 1_000_000_000).toFixed(1).replace(".", ","))} M`;
  }
  if (n >= 1_000_000) {
    return `${trim((n / 1_000_000).toFixed(1).replace(".", ","))} jt`;
  }
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

/** Format harga sesuai mata uang target. Style:
 *   - IDR → "30,5 jt" / "1,2 M" / "Rp 500.000" (compact format, hemat kolom)
 *   - SAR → "SAR 3,500"          (en-US, no decimals)
 *   - USD → "$1,776"             (en-US, no decimals)
 *  0/undefined/NaN → "—". */
function fmtCurrency(n: number | undefined, currency: "USD" | "IDR" | "SAR"): string {
  if (!n || !Number.isFinite(n) || n <= 0) return "—";
  if (currency === "IDR") return fmtCompactIdr(n);
  const rounded = Math.round(n);
  if (currency === "SAR") return `SAR ${rounded.toLocaleString("en-US")}`;
  return `$${rounded.toLocaleString("en-US")}`;
}

/** Convert antar currency lewat IDR canonical. `valueIDR` (kalau ada) dipakai
 *  duluan supaya akurat. Fallback: konversi dari `valueDisplay` di
 *  `sourceCur` → IDR → target.
 *  - kursUSD = IDR per 1 USD (mis. 16500)
 *  - kursSAR = IDR per 1 SAR (mis. 4400)
 *  Return value dalam target currency. */
function convertViaIdr(
  valueDisplay: number | undefined,
  valueIDR: number | undefined,
  sourceCur: "USD" | "IDR" | "SAR",
  targetCur: "USD" | "IDR" | "SAR",
  kursUSD = 1,
  kursSAR = 1,
): number | undefined {
  if (sourceCur === targetCur) return valueDisplay;
  // Resolve canonical IDR — prefer explicit IDR field kalau ada.
  let idr: number | undefined;
  if (typeof valueIDR === "number" && Number.isFinite(valueIDR) && valueIDR > 0) {
    idr = valueIDR;
  } else if (typeof valueDisplay === "number" && Number.isFinite(valueDisplay) && valueDisplay > 0) {
    if (sourceCur === "IDR") idr = valueDisplay;
    else if (sourceCur === "USD") idr = valueDisplay * (kursUSD || 1);
    else                         idr = valueDisplay * (kursSAR || 1);
  } else {
    return undefined;
  }
  if (targetCur === "IDR") return idr;
  if (targetCur === "USD") return idr / (kursUSD || 1);
  return idr / (kursSAR || 1);
}

/** Pilih nilai dari override teks vs data kalkulator. */
function pick(override: string | undefined, fallback: string): string {
  const v = (override ?? "").trim();
  return v.length > 0 ? override! : fallback;
}

export async function buildIghPdf(data: IghPdfData, layout?: Partial<IghLayoutConfig>): Promise<Uint8Array> {
  const cfg = mergeConfig(DEFAULT_IGH_LAYOUT, layout);
  const isGroup = data.mode === "group";
  const defaultTplUrl = isGroup ? TEMPLATE_GROUP_URL : TEMPLATE_URL;

  // Custom background template logic:
  //   - PDF custom → load file itu sebagai base PDF (sama treatment kayak default)
  //   - Image custom → bikin PDF baru ukuran A5 (PAGE_W × PAGE_H), embed image
  //     full-bleed sebagai background, lalu generator naro teks di atasnya
  //   - null/undefined → pakai template default IGH (`/igh-blank-template*.pdf`)
  // Failure di custom URL (404, network, parse error) → auto-fallback ke default
  // supaya generator gak crash kalo file di Storage hilang/corrupt.
  const customTpl = cfg.customTemplate;
  let pdf: PDFDocument;
  if (customTpl?.type === "pdf") {
    try {
      const bytes = await fetchBytes(customTpl.url);
      pdf = await PDFDocument.load(bytes);
    } catch (e) {
      console.warn("[pdf] custom template PDF gagal di-load, fallback ke default", e);
      pdf = await PDFDocument.load(await fetchBytesCached(defaultTplUrl));
    }
  } else if (customTpl?.type === "image") {
    pdf = await PDFDocument.create();
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    try {
      const bytes = await fetchBytes(customTpl.url);
      const isPng = /\.png(\?|$)/i.test(customTpl.url) || /image\/png/i.test(customTpl.name);
      const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      // Cover-fit: scale image biar nutup full page (mungkin crop sedikit) — sama
      // kayak background-size: cover di CSS. Jaga aspect ratio.
      const ir = img.width / img.height;
      const pr = PAGE_W / PAGE_H;
      let drawW: number, drawH: number;
      if (ir > pr) {
        drawH = PAGE_H;
        drawW = drawH * ir;
      } else {
        drawW = PAGE_W;
        drawH = drawW / ir;
      }
      page.drawImage(img, {
        x: (PAGE_W - drawW) / 2,
        y: (PAGE_H - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    } catch (e) {
      console.warn("[pdf] custom template gambar gagal di-load, page kosong sebagai background", e);
    }
  } else {
    pdf = await PDFDocument.load(await fetchBytesCached(defaultTplUrl));
  }
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
        fetchBytesCached(urls.regular),
        fetchBytesCached(urls.semiBold),
        fetchBytesCached(urls.bold),
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
  // Date dan Invoice punya Y independen (customerYPx / dateYPx). Kalau belum
  // di-set di preset (legacy), fallback ke `topPx` supaya tampilan lama gak
  // berubah.
  const metaReg = fontFor("metaInfo", "regular");
  const customerY = cfg.metaInfo.customerYPx ?? cfg.metaInfo.topPx;
  const dateY = cfg.metaInfo.dateYPx ?? cfg.metaInfo.topPx;
  drawText(page, pick(cfg.metaInfo.customerText, data.customerName || "—"), {
    leftPx: cfg.metaInfo.customerXPx, topPx: customerY, size: cfg.metaInfo.size,
    font: metaReg, color: ORANGE, maxWidthPx: 175,
  });
  drawText(page, pick(cfg.metaInfo.dateText, data.date || "—"), {
    leftPx: cfg.metaInfo.dateXPx, topPx: dateY, size: cfg.metaInfo.size,
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
    // Resolve target currency: pdfCurrency (Tuner dropdown) menang.
    // Fallback: parse dari legacy currencySymbol field ("Rp"/"SAR"/"$").
    const targetCur: "USD" | "IDR" | "SAR" =
      cfg.pdfCurrency ??
      (gp.currencySymbol.trim().toLowerCase().startsWith("rp") ? "IDR"
        : gp.currencySymbol.trim().toUpperCase().startsWith("SAR") ? "SAR"
        : "USD");
    const sourceCur: "USD" | "IDR" | "SAR" = data.displayCurrency ?? "USD";
    const kursUSD = data.kursIdrPerUsd ?? 1;
    const kursSAR = data.kursIdrPerSar ?? 1;
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
      const q = convertViaIdr(row.quad,   row.quadIDR,   sourceCur, targetCur, kursUSD, kursSAR);
      const t = convertViaIdr(row.triple, row.tripleIDR, sourceCur, targetCur, kursUSD, kursSAR);
      const d = convertViaIdr(row.double, row.doubleIDR, sourceCur, targetCur, kursUSD, kursSAR);
      cell(gp.paxCenterXPx, row.paxLabel || "—");
      cell(gp.quadCenterXPx + gp.quadXOffsetPx,   fmtCurrency(q, targetCur));
      cell(gp.tripleCenterXPx + gp.tripleXOffsetPx, fmtCurrency(t, targetCur));
      cell(gp.doubleCenterXPx + gp.doubleXOffsetPx, fmtCurrency(d, targetCur));
    }
  } else {
    // Private template: 2 kotak orange (Pax + Harga per Pax).
    const priceBold = fontFor("pricing", "bold");
    const PAX_BOX = { leftPx: cfg.pricing.paxXPx, topPx: cfg.pricing.topPx, widthPx: 114, heightPx: 61 };
    const PRICE_BOX = { leftPx: cfg.pricing.priceXPx, topPx: cfg.pricing.topPx, widthPx: 406, heightPx: 61 };
    const paxText = pick(cfg.pricing.paxText, String(Math.max(0, data.pax || 0)));
    // Convert IDR price-per-pax → target PDF currency (USD/IDR/SAR).
    const targetCur = cfg.pdfCurrency ?? "IDR"; // legacy default for private = IDR
    const priceInTarget = convertViaIdr(
      undefined,
      data.pricePerPaxIDR || 0,
      "IDR",
      targetCur,
      data.kursIdrPerUsd ?? 1,
      data.kursIdrPerSar ?? 1,
    );
    const priceText = pick(
      cfg.pricing.priceText,
      fmtCurrency(targetCur === "IDR" ? (data.pricePerPaxIDR || 0) : priceInTarget, targetCur),
    );
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
  // ── 6. FOOTER (WhatsApp icon + clickable nomor admin) ──
  if (cfg.footer.showWhatsapp) {
    const admin = loadIghAdminSettings();
    const digits = whatsappDigits(admin.adminWhatsapp);
    if (digits.length >= 8) {
      drawWhatsappFooter(page, pdf, {
        topPx: cfg.footer.topPx,
        leftXPx: cfg.footer.waXPx,
        iconSizePt: cfg.footer.waIconSizePt,
        textSizePt: cfg.footer.size,
        font: fontFor("footer", "semiBold"),
        displayNumber: formatWhatsappDisplay(admin.adminWhatsapp),
        url: whatsappUrl(admin.adminWhatsapp),
      });
    }
  }

  const listFont = fontFor("checklist", "semiBold");
  const ROW_BASELINES = Array.from({ length: 5 }, (_, i) =>
    cfg.checklist.firstBaselinePx + i * cfg.checklist.rowSpacingPx + cfg.checklist.yOffsetPx,
  );
  const includedItems = splitOverrideOrUse(cfg.checklist.includedText, data.included);
  const excludedItems = splitOverrideOrUse(cfg.checklist.excludedText, data.excluded);
  // Mask garis pembatas horizontal yang ter-print di template (under tiap row).
  // Lines ada ~5px di bawah baseline, span full column width. Mask pakai white
  // rect supaya teks Include/Exclude tampil bersih tanpa sekat garis.
  maskChecklistDividers(page, cfg.checklist.leftXPx, ROW_BASELINES);
  maskChecklistDividers(page, cfg.checklist.rightXPx, ROW_BASELINES);
  const bulletSymbol = (cfg.checklist.listBullet ?? "•").trim();
  drawList(page, includedItems, ROW_BASELINES, cfg.checklist.leftXPx, listFont, cfg.checklist.size, cfg.checklist.sudahTermasukAlign ?? "center", bulletSymbol);
  drawList(page, excludedItems, ROW_BASELINES, cfg.checklist.rightXPx, listFont, cfg.checklist.size, cfg.checklist.belumTermasukAlign ?? "center", bulletSymbol);

  return pdf.save();
}

/** Tutup garis horizontal yang sudah pre-printed di template untuk satu kolom
 *  checklist. Mask cuma sebatas LINE — tidak menutupi digit "01..05" di kiri,
 *  jadi penomoran tetap terlihat. */
function maskChecklistDividers(page: PDFPage, centerXPx: number, baselinesPx: number[]) {
  const COL_WIDTH_PX = 235;
  const DIGIT_RESERVE_PX = 26;          // ruang aman untuk "01..05"
  const LINE_OFFSET_PX = 4;             // line ~4px di bawah baseline teks
  const MASK_HEIGHT_PX = 6;
  const leftEdgePx = centerXPx - COL_WIDTH_PX / 2 + DIGIT_RESERVE_PX;
  const widthPx = COL_WIDTH_PX - DIGIT_RESERVE_PX - 2;
  for (const baselinePx of baselinesPx) {
    const r = pxRect(leftEdgePx, baselinePx + LINE_OFFSET_PX, widthPx, MASK_HEIGHT_PX);
    page.drawRectangle({ x: r.x, y: r.y, width: r.width, height: r.height, color: WHITE, borderWidth: 0 });
  }
}

/**
 * Render WhatsApp icon + nomor admin di footer, dengan link annotation
 * yang membuka https://wa.me/{digits} saat di-klik di PDF reader.
 *
 * Layout: [green WA bubble icon] [4pt gap] [nomor +62 ...]
 * Position dihitung dari template-px coords (sejajar dengan IG handle yg
 * sudah pre-printed pada template).
 */
function drawWhatsappFooter(
  page: PDFPage,
  pdf: PDFDocument,
  opts: {
    topPx: number;
    leftXPx: number;
    iconSizePt: number;
    textSizePt: number;
    font: PDFFont;
    displayNumber: string;
    url: string;
  },
) {
  const baseX = opts.leftXPx * SCALE;
  // Konversi top-px → PDF baseline. IG di template baseline ~yMin=498pt
  // (pdftotext, top-down). Pakai konversi standar pxRect agar konsisten
  // dengan elemen lain.
  const baseY = PAGE_H - opts.topPx * SCALE;
  const r = opts.iconSizePt / 2;
  const cx = baseX + r;
  const cy = baseY + r * 0.4; // sedikit naik supaya optical-center sejajar teks

  // 1) Bubble hijau WhatsApp (lingkaran filled).
  page.drawCircle({ x: cx, y: cy, size: r, color: WA_GREEN, borderWidth: 0 });

  // 2) Phone receiver (white SVG path) — minimalis, terbaca jelas pada r=4.5.
  // Path origin pada (0,0); di-translate via x/y dan di-scale ke r.
  // Bentuk: gagang telepon klasik (atas-kiri ke bawah-kanan).
  const phonePath =
    "M 1.05 1.95 c 0.30 0.40 0.78 0.92 1.45 1.55 c 0.67 0.63 1.20 1.05 1.55 1.30 " +
    "c 0.20 0.14 0.40 0.10 0.58 -0.05 l 0.50 -0.50 c 0.20 -0.20 0.45 -0.22 0.70 -0.10 " +
    "l 1.45 0.75 c 0.25 0.13 0.30 0.40 0.15 0.65 c -0.40 0.65 -1.00 1.10 -1.85 1.20 " +
    "c -0.85 0.10 -1.95 -0.20 -3.05 -0.95 c -1.10 -0.75 -2.10 -1.85 -2.85 -3.05 " +
    "c -0.75 -1.10 -1.05 -2.20 -0.95 -3.05 c 0.10 -0.85 0.55 -1.45 1.20 -1.85 " +
    "c 0.25 -0.15 0.52 -0.10 0.65 0.15 l 0.75 1.45 c 0.12 0.25 0.10 0.50 -0.10 0.70 " +
    "l -0.50 0.50 c -0.15 0.18 -0.19 0.38 -0.05 0.58 z";
  // Skala: path digambar di kotak ~7x7 unit. Mau ngepas dalam diameter 2r,
  // tapi visually ~70% diameter biar ada padding hijau di sekitar gagang.
  const pathScale = (2 * r * 0.55) / 7;
  // Center the 7x7 glyph in the bubble (origin top-left in SVG; pdf-lib
  // drawSvgPath flips Y for us — the path coords above use SVG convention).
  const svgX = cx - 3.5 * pathScale;
  const svgY = cy + 3.5 * pathScale;
  page.drawSvgPath(phonePath, {
    x: svgX,
    y: svgY,
    scale: pathScale,
    color: WHITE,
    borderWidth: 0,
  });

  // 3) Nomor WA di kanan icon.
  const gap = 4;
  const textX = cx + r + gap;
  // Vertical center text relative to icon — gunakan cap-height approx 0.7 size.
  const textY = cy - opts.textSizePt * 0.32;
  page.drawText(opts.displayNumber, {
    x: textX,
    y: textY,
    size: opts.textSizePt,
    font: opts.font,
    color: DARK,
  });

  // 4) Clickable link annotation menutupi seluruh icon + teks.
  const textWidth = opts.font.widthOfTextAtSize(opts.displayNumber, opts.textSizePt);
  const annotX1 = baseX;
  const annotY1 = cy - r - 1;
  const annotX2 = textX + textWidth + 1;
  const annotY2 = cy + r + 1;
  const linkAnnot = pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [annotX1, annotY1, annotX2, annotY2],
    Border: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: PDFString.of(opts.url),
    },
  });
  const linkRef = pdf.context.register(linkAnnot);
  // Append ke Annots array existing (atau bikin baru).
  const existing = page.node.lookup(PDFName.of("Annots"));
  if (existing && "push" in (existing as object)) {
    // PDFArray — pdf-lib exposes .push for arrays.
    (existing as { push: (x: unknown) => void }).push(linkRef);
  } else {
    page.node.set(PDFName.of("Annots"), pdf.context.obj([linkRef]));
  }
}

function splitOverrideOrUse(override: string | undefined, fallback: string[]): string[] {
  const v = (override ?? "").trim();
  if (!v) return fallback;
  return v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

/** Draw checklist column dengan teks horizontal. `anchorXPx` = titik X di
 *  template-px; arti titik tergantung `align`:
 *    - "center" → titik tengah teks (lebar dihitung lalu dibagi 2)
 *    - "left"   → koordinat awal teks (left edge)
 *    - "right"  → batas akhir teks (right edge)
 *
 *  `bullet` (optional, default "•") di-prepend di depan tiap baris dgn 1 space
 *  separator. String kosong = no bullet (back-compat). Untuk align="center"
 *  bullet+text di-treat sbg satu unit yang di-center → bullet stays in front.
 *  Truncation budget mempertimbangkan lebar bullet+space supaya teks utama
 *  yang di-truncate, bukan ke-cut di tengah simbol.
 */
function drawList(
  page: PDFPage,
  items: string[],
  rowBaselines: number[],
  anchorXPx: number,
  font: PDFFont,
  baseSize = 10,
  align: "left" | "center" | "right" = "center",
  bullet = "•",
) {
  const cleaned = items.map((s) => s.trim()).filter(Boolean).slice(0, rowBaselines.length);
  // Width budget per row ~ 235px (kolom asli template).
  const COL_WIDTH = 235;
  const maxW = (COL_WIDTH - 8) * SCALE;
  const anchorXPt = anchorXPx * SCALE;
  const prefix = bullet ? `${bullet} ` : "";
  for (let i = 0; i < cleaned.length; i++) {
    const baselinePx = rowBaselines[i];
    let size = baseSize;
    // Auto-shrink berdasar full string (prefix + body) supaya prefix gak
    // ngedorong teks keluar kolom.
    while (size > 7 && font.widthOfTextAtSize(prefix + cleaned[i], size) > maxW) size -= 0.5;
    let body = cleaned[i];
    if (font.widthOfTextAtSize(prefix + body, size) > maxW) {
      // Truncate body saja; prefix dijaga supaya bullet selalu utuh.
      const prefixW = font.widthOfTextAtSize(prefix, size);
      body = truncateToWidth(body, font, size, Math.max(0, maxW - prefixW));
    }
    const value = prefix + body;
    const textW = font.widthOfTextAtSize(value, size);
    let x: number;
    if (align === "left")       x = anchorXPt;
    else if (align === "right") x = anchorXPt - textW;
    else                        x = anchorXPt - textW / 2; // center
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
