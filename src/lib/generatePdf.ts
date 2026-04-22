import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PdfTemplate } from "@/features/pdfTemplate/types";

export interface OfferPriceRow {
  paxRange: string;
  quad: number;
  triple: number;
  double: number;
}

export interface LandArrangementOfferData {
  quoteNumber: string;
  tier: string;
  title: string;
  subtitle: string;
  dateRange: string;
  customerName: string;
  hotelMakkah: string;
  hotelMadinah: string;
  makkahNights: number;
  madinahNights: number;
  makkahStars: number;
  madinahStars: number;
  usdToSar: number;
  updateDate: string;
  rows: OfferPriceRow[];
  included: string[];
  excluded: string[];
  website: string;
  contactPhone: string;
  contactName: string;
}

export interface RateMeta {
  mode: "live" | "manual";
  ratesUSD: number;
  ratesSAR: number;
  asOf: string; // ISO date
}

export interface SimplePackagePdfData {
  quoteNumber: string;       // "002"
  title: string;             // "Umroh Bu April"
  dateRange: string;         // "05-11 Jul 2026"
  hotelMakkah: string;       // "Movenpick"
  hotelMadinah: string;      // "Grand Plaza"
  makkahNights: number;
  madinahNights: number;
  pax: number;
  pricePerPaxIDR: number;
  included: string[];
  excluded: string[];
  ratesUSD?: number;
  ratesSAR?: number;
}

export interface QuotationData {
  packageName: string;
  destination: string;
  people: number;
  currency: string;
  costs: { id: string; label: string; amount: number }[];
  total: number;
  perPerson: number;
  offer?: LandArrangementOfferData;
  template?: PdfTemplate;
  simple?: SimplePackagePdfData;
  rateMeta?: RateMeta;
}

function formatRateNote(meta?: RateMeta): string {
  if (!meta) return "";
  const dateStr = (() => {
    try {
      return new Date(meta.asOf).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return meta.asOf;
    }
  })();
  const label = meta.mode === "manual" ? "Manual Lapangan" : "Live Otomatis";
  const usd = Math.round(meta.ratesUSD).toLocaleString("id-ID");
  const sar = Math.round(meta.ratesSAR).toLocaleString("id-ID");
  return `Estimasi berdasarkan Kurs ${label} (${dateStr}) — USD = Rp ${usd} · SAR = Rp ${sar}`;
}

const symbols: Record<string, string> = { USD: "$", SAR: "SAR", IDR: "Rp" };

function formatAmount(n: number, currency: string) {
  const symbol = symbols[currency] ?? "";
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  return `${symbol} ${n.toLocaleString(locale, { maximumFractionDigits: currency === "IDR" ? 0 : 2 })}`;
}

function formatUsd(n: number) {
  return `$ ${Math.round(n).toLocaleString("en-US")}`;
}

function stars(count: number) {
  return "★".repeat(Math.max(1, Math.min(5, count || 5)));
}

function bulletLines(
  doc: jsPDF,
  items: string[],
  x: number,
  y: number,
  width: number,
  lineHeight: number
) {
  let cursor = y;
  items.forEach((item) => {
    const lines = doc.splitTextToSize(item, width - 10);
    doc.text("•", x, cursor);
    doc.text(lines, x + 8, cursor);
    cursor += Math.max(lines.length, 1) * lineHeight + 2;
  });
  return cursor;
}

function getOfferFieldValue(offer: LandArrangementOfferData, key: string): string {
  switch (key) {
    case "quoteNumber": return offer.quoteNumber;
    case "tier": return offer.tier;
    case "title": return offer.title;
    case "subtitle": return offer.subtitle;
    case "dateRange": return offer.dateRange;
    case "customerName": return offer.customerName;
    case "hotelMakkah": return offer.hotelMakkah;
    case "hotelMadinah": return offer.hotelMadinah;
    case "makkahNights": return offer.makkahNights ? `${offer.makkahNights} Malam` : "";
    case "madinahNights": return offer.madinahNights ? `${offer.madinahNights} Malam` : "";
    case "updateDate": return offer.updateDate;
    case "website": return offer.website;
    case "contactPhone": return offer.contactPhone;
    case "contactName": return offer.contactName;
    default: return "";
  }
}

function getImgFormat(dataUrl: string): string {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function generateTemplateOverlayPdf(data: QuotationData, template: PdfTemplate) {
  const offer = data.offer;
  if (!offer) return;
  const rateNote = formatRateNote(data.rateMeta);
  // If the template has no background image, fall back to the default IGH Tour layout
  if (!template.backgroundImage) {
    void generateLandArrangementPdf(data);
    return;
  }

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: template.orientation,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.addImage(
    template.backgroundImage,
    getImgFormat(template.backgroundImage),
    0,
    0,
    pageWidth,
    pageHeight
  );

  for (const field of template.fields) {
    const x = (field.x / 100) * pageWidth;
    const y = (field.y / 100) * pageHeight;

    if (field.key === "priceTable") {
      autoTable(doc, {
        startY: y,
        head: [["TOTAL PAX", "QUAD", "TRIPLE", "DOUBLE"]],
        body: offer.rows
          .filter((r) => r.paxRange)
          .map((row) => [
            row.paxRange,
            formatUsd(row.quad),
            formatUsd(row.triple),
            formatUsd(row.double),
          ]),
        margin: { left: x, right: 40 },
        theme: "plain",
        styles: {
          font: "helvetica",
          fontSize: field.fontSize,
          cellPadding: { top: 6, right: 10, bottom: 6, left: 10 },
          textColor: field.color as unknown as [number, number, number],
          lineColor: [220, 215, 210],
          lineWidth: 0.4,
        },
        headStyles: {
          fontStyle: "bold",
          fillColor: [250, 247, 244],
        },
        columnStyles: {
          0: { fontStyle: "bold", halign: "left" },
          1: { halign: "center", fontStyle: "bold" },
          2: { halign: "center", fontStyle: "bold" },
          3: { halign: "center", fontStyle: "bold" },
        },
      });
      continue;
    }

    const value = getOfferFieldValue(offer, field.key);
    if (!value) continue;

    doc.setFontSize(field.fontSize);
    doc.setFont("helvetica", field.bold ? "bold" : "normal");
    doc.setTextColor(field.color);
    doc.text(value, x, y);
  }

  if (rateNote) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 100, 90);
    doc.text(rateNote, 24, pageHeight - 14);
  }

  const safeName = (offer.title || data.packageName || "penawaran_template")
    .replace(/[^a-z0-9-_]+/gi, "_");
  doc.save(`${safeName}_${offer.quoteNumber || Date.now().toString().slice(-6)}.pdf`);
}

async function generateLandArrangementPdf(data: QuotationData) {
  const offer = data.offer;
  if (!offer) return;

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();   // 595
  const pageH = doc.internal.pageSize.getHeight();  // 842
  const margin = 36;

  // Brand palette — IGH/Arrahmah inspired
  const navy: [number, number, number]   = [16, 36, 99];     // deep blue (title + footer)
  const gold: [number, number, number]   = [201, 152, 65];   // brass / pill
  const goldBg: [number, number, number] = [243, 226, 175];  // pill bg
  const dark: [number, number, number]   = [38, 30, 22];
  const muted: [number, number, number]  = [120, 110, 100];
  const greenBg: [number, number, number]= [76, 175, 80];
  const redBg: [number, number, number]  = [232, 73, 80];
  const lightLine: [number, number, number] = [225, 220, 210];
  const beigeBg: [number, number, number]   = [250, 245, 235];

  // ── Soft beige page background ──
  doc.setFillColor(...beigeBg);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH * 0.66, "F");

  // ── Top-right brand logo ──
  const logo = await loadImageAsDataUrl("/logo-igh-tour.png");
  if (logo) {
    const lw = 96, lh = 36;
    doc.addImage(logo, "PNG", pageW - margin - lw, margin - 2, lw, lh);
  }

  // ── Header: quote no + tier ──
  let y = margin + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(`#${offer.quoteNumber || Date.now().toString().slice(-4)}`, margin, y);

  if (offer.tier) {
    const tierText = offer.tier;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const tw = doc.getTextWidth(tierText) + 14;
    doc.setFillColor(...goldBg);
    doc.roundedRect(margin + 38, y - 9, tw, 13, 6.5, 6.5, "F");
    doc.setTextColor(...gold);
    doc.text(tierText, margin + 45, y);
  }

  // ── Title (multi-line) ──
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...navy);
  const titleLines = doc.splitTextToSize(offer.title || data.packageName || "Penawaran Paket Umrah", 320) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 26;

  // ── Subtitle pill ──
  if (offer.subtitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const pw = doc.getTextWidth(offer.subtitle) + 20;
    doc.setFillColor(...goldBg);
    doc.roundedRect(margin, y - 4, pw, 18, 9, 9, "F");
    doc.setTextColor(...gold);
    doc.text(offer.subtitle, margin + 10, y + 8);
    y += 26;
  }

  // ── Date range ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(offer.dateRange || "—", margin, y + 8);

  // ── Customer (right side under logo) ──
  const custY = margin + 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Customer:", pageW - margin, custY, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text(offer.customerName || "—", pageW - margin, custY + 18, { align: "right" });
  doc.setDrawColor(...lightLine);
  doc.setLineWidth(0.5);
  doc.line(pageW - margin - 130, custY + 26, pageW - margin, custY + 26);

  // ── Hotel cards ──
  y += 36;
  const colW = (pageW - margin * 2 - 24) / 2;
  function drawHotelCard(x: number, ty: number, title: string, name: string, nights: number, starCount: number) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(title, x, ty);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...navy);
    doc.text(name || "—", x, ty + 18, { maxWidth: colW });

    // Night pill
    const pillTxt = `${nights || 0} MALAM`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const pw = doc.getTextWidth(pillTxt) + 16;
    doc.setFillColor(...goldBg);
    doc.roundedRect(x, ty + 28, pw, 14, 7, 7, "F");
    doc.setTextColor(...gold);
    doc.text(pillTxt, x + 8, ty + 38);

    // Stars
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...gold);
    doc.text(stars(starCount), x + pw + 8, ty + 39);
  }
  drawHotelCard(margin, y, "Hotel Makkah", offer.hotelMakkah, offer.makkahNights, offer.makkahStars);
  drawHotelCard(margin + colW + 24, y, "Hotel Madinah", offer.hotelMadinah, offer.madinahNights, offer.madinahStars);
  y += 60;

  // ── Price matrix ──
  autoTable(doc, {
    startY: y,
    head: [["TOTAL PAX", "QUAD", "TRIPLE", "DOUBLE"]],
    body: offer.rows.map((row) => [
      row.paxRange,
      formatUsd(row.quad),
      formatUsd(row.triple),
      formatUsd(row.double),
    ]),
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 11,
      cellPadding: { top: 6, right: 10, bottom: 6, left: 12 },
      textColor: dark,
      lineColor: lightLine,
      lineWidth: 0.4,
    },
    headStyles: {
      fontSize: 9.5,
      fontStyle: "bold",
      textColor: dark,
      fillColor: [255, 255, 255],
      lineWidth: 0.6,
    },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: "bold", halign: "left" },
      1: { halign: "left", cellWidth: (pageW - margin * 2 - 130) / 3 },
      2: { halign: "left", cellWidth: (pageW - margin * 2 - 130) / 3 },
      3: { halign: "left", cellWidth: (pageW - margin * 2 - 130) / 3 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index > 0) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fontSize = 12;
      }
    },
  });

  const tableEndY = (doc as any).lastAutoTable?.finalY ?? y + 200;

  // ── Kurs + update line ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...dark);
  doc.text(`KURS 1 USD = ${offer.usdToSar || 3.75} SAR`, margin, tableEndY + 14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  const updateNote = `* Harga sewaktu-waktu dapat berubah tanpa pemberitahuan sebelumnya, harap konfirmasi kembali. `;
  doc.text(updateNote, margin + 130, tableEndY + 14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text(`Update: ${offer.updateDate || new Date().toLocaleDateString("id-ID")}`, pageW - margin, tableEndY + 14, { align: "right" });

  const rateNote = formatRateNote(data.rateMeta);
  if (rateNote) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(rateNote, margin, tableEndY + 26);
  }

  // ── Included / Excluded headers ──
  const sectionY = tableEndY + 38;
  const halfW = (pageW - margin * 2 - 12) / 2;

  doc.setFillColor(...greenBg);
  doc.roundedRect(margin, sectionY, halfW, 20, 4, 4, "F");
  doc.setFillColor(...redBg);
  doc.roundedRect(margin + halfW + 12, sectionY, halfW, 20, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Harga Sudah Termasuk", margin + halfW / 2, sectionY + 13.5, { align: "center" });
  doc.text("Harga Tidak Termasuk", margin + halfW + 12 + halfW / 2, sectionY + 13.5, { align: "center" });

  // ── Bullet lists ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...dark);
  bulletLines(doc, offer.included, margin + 4, sectionY + 36, halfW - 8, 9);
  bulletLines(doc, offer.excluded, margin + halfW + 16, sectionY + 36, halfW - 8, 9);

  // ── Footer band (navy) ──
  const footerH = 64;
  doc.setFillColor(...navy);
  doc.rect(0, pageH - footerH, pageW, footerH, "F");

  // gold accent strip
  doc.setFillColor(...gold);
  doc.rect(0, pageH - footerH, pageW, 4, "F");

  // Pelopor block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Pelopor Layanan", margin, pageH - 38);
  doc.setTextColor(...gold);
  doc.text("Land Arrangement", margin, pageH - 25);
  doc.setTextColor(255, 255, 255);
  doc.text("Umrah & Haji", margin, pageH - 12);

  // Website
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(offer.website || "www.umrahservice.co", pageW / 2, pageH - 25, { align: "center" });

  // Contact card
  const cardW = 188, cardH = 44, cardX = pageW - margin - cardW, cardY = pageH - footerH + 10;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  doc.text("Informasi & Pemesanan", cardX + 12, cardY + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text(offer.contactPhone || "+62 812-8955-2018", cardX + 12, cardY + 27);
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  doc.text(offer.contactName || "M. FARUQ AL ISLAM", cardX + 12, cardY + 38);

  const safeName = (offer.title || data.packageName || "penawaran_igh").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
  doc.save(`${safeName}_${offer.quoteNumber || Date.now().toString().slice(-6)}.pdf`);
}

// ── Simple Package PDF (gaya "Umroh Bu April") ────────────────────────────────
// Layout portrait minimal: nomor + judul + tgl, hotel makkah/madinah,
// jumlah pax & harga jual per pax (NO breakdown), kurs note,
// dua kolom Termasuk / Tidak Termasuk, footer kontak.

async function loadImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fmtIDR(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export async function generateSimplePackagePdf(data: SimplePackagePdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;

  const dark: [number, number, number] = [33, 27, 22];
  const muted: [number, number, number] = [120, 110, 102];
  const orange: [number, number, number] = [234, 88, 12];
  const dotted: [number, number, number] = [220, 200, 180];
  const greenBg: [number, number, number] = [220, 240, 220];
  const greenTxt: [number, number, number] = [40, 100, 50];
  const redBg: [number, number, number] = [248, 215, 215];
  const redTxt: [number, number, number] = [165, 50, 50];
  const tagBg: [number, number, number] = [255, 240, 220];
  const tagTxt: [number, number, number] = [200, 130, 40];

  // ── Logo (top right) ──
  const logo = await loadImageAsDataUrl("/logo-igh-tour.png");
  if (logo) {
    const logoW = 78, logoH = 78;
    doc.addImage(logo, "PNG", pageW - margin - logoW, margin - 12, logoW, logoH);
  }

  // ── Header (top left) ──
  let y = margin + 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...muted);
  doc.text(`#${data.quoteNumber || "—"}`, margin, y);

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...dark);
  doc.text(data.title || "—", margin, y, { maxWidth: pageW - margin * 2 - 90 });

  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(data.dateRange || "—", margin, y);

  // ── Dotted divider ──
  y += 22;
  doc.setLineDashPattern([2, 3], 0);
  doc.setDrawColor(...dotted);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  // ── Hotel section ──
  y += 28;
  const colW = (pageW - margin * 2) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text("Hotel Makkah", margin, y);
  doc.text("Hotel Madinah", margin + colW, y);

  y += 18;
  doc.setFontSize(15);
  doc.text(data.hotelMakkah || "—", margin, y, { maxWidth: colW - 12 });
  doc.text(data.hotelMadinah || "—", margin + colW, y, { maxWidth: colW - 12 });

  // night tags
  y += 16;
  function drawNightTag(text: string, x: number, ty: number) {
    const tw = doc.getTextWidth(text) + 16;
    doc.setFillColor(...tagBg);
    doc.roundedRect(x, ty, tw, 16, 3, 3, "F");
    doc.setFontSize(8.5);
    doc.setTextColor(...tagTxt);
    doc.setFont("helvetica", "bold");
    doc.text(text, x + 8, ty + 11);
  }
  drawNightTag(`${data.makkahNights}  MALAM`, margin, y);
  drawNightTag(`${data.madinahNights}  MALAM`, margin + colW, y);

  // ── Dotted divider ──
  y += 36;
  doc.setLineDashPattern([2, 3], 0);
  doc.setDrawColor(...dotted);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  // ── Pax & harga ──
  y += 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text("Jumlah Pax", margin, y);
  doc.text("Harga per Pax", margin + colW, y);

  y += 28;
  doc.setFontSize(22);
  doc.text(String(data.pax || 1), margin, y);
  doc.setFontSize(20);
  doc.text(fmtIDR(data.pricePerPaxIDR), margin + colW, y);

  // ── Notes ──
  y += 56;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...dark);
  doc.text("*  Harga sewaktu-waktu dapat berubah, harap konfirmasi kembali sebelum pembayaran.", margin, y);
  if (data.ratesUSD || data.ratesSAR) {
    y += 14;
    const usdNote = data.ratesUSD ? `1 USD = ${Math.round(data.ratesUSD).toLocaleString("id-ID")} IDR` : "";
    const sarNote = data.ratesSAR ? `1 SAR = ${Math.round(data.ratesSAR).toLocaleString("id-ID")} IDR` : "";
    doc.text(`*  KURS ${[usdNote, sarNote].filter(Boolean).join(", ")}`, margin, y);
  }

  // ── Termasuk / Tidak Termasuk badges ──
  y += 38;
  function drawBadge(label: string, x: number, ty: number, bg: [number, number, number], txt: [number, number, number]) {
    const w = colW - 12;
    doc.setFillColor(...bg);
    doc.roundedRect(x, ty, w, 22, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...txt);
    doc.text(label, x + w / 2, ty + 14, { align: "center" });
  }
  drawBadge("Harga Sudah Termasuk", margin, y, greenBg, greenTxt);
  drawBadge("Harga Tidak Termasuk", margin + colW, y, redBg, redTxt);

  // numbered lists
  y += 36;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  function drawNumberedList(items: string[], x: number, ty: number) {
    let cy = ty;
    items.forEach((item, i) => {
      const num = `${i + 1}`;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...muted);
      doc.text(num, x, cy);
      doc.setTextColor(...dark);
      const lines = doc.splitTextToSize(item, colW - 32);
      doc.text(lines, x + 18, cy);
      cy += Math.max(1, (lines as string[]).length) * 14 + 4;
    });
  }
  drawNumberedList(data.included, margin + 4, y);
  drawNumberedList(data.excluded, margin + colW + 4, y);

  // ── Footer ──
  doc.setLineDashPattern([2, 3], 0);
  doc.setDrawColor(...dotted);
  doc.line(margin, pageH - 86, pageW - margin, pageH - 86);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text("Pilihanmu untuk menjelajah", margin, pageH - 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...orange);
  doc.text("timur tengah :)", margin, pageH - 44);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  const igX = margin + 220;
  doc.text("Instagram", igX, pageH - 60);
  doc.setFont("helvetica", "normal");
  doc.text("@igh.tour", igX, pageH - 44);

  const emX = margin + 360;
  doc.setFont("helvetica", "bold");
  doc.text("Email", emX, pageH - 60);
  doc.setFont("helvetica", "normal");
  doc.text("igh.tours.travel@gmail.com", emX, pageH - 44);

  const safeName = (data.title || "umroh_quote").replace(/[^a-z0-9-_]+/gi, "_");
  doc.save(`${safeName}_${data.quoteNumber || Date.now().toString().slice(-4)}.pdf`);
}

export function generateQuotationPdf(data: QuotationData) {
  if (data.template && data.offer) {
    generateTemplateOverlayPdf(data, data.template);
    return;
  }

  if (data.offer) {
    void generateLandArrangementPdf(data);
    return;
  }

  if (data.simple) {
    void generateSimplePackagePdf(data.simple);
    return;
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageWidth, 90, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("TravelHub", margin, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Trip Package Quotation", margin, 64);

  const today = new Date();
  const quoteId = `TH-${Date.now().toString().slice(-6)}`;
  doc.setFontSize(9);
  doc.text(`Date: ${today.toLocaleDateString()}`, pageWidth - margin, 45, { align: "right" });
  doc.text(`Quote #: ${quoteId}`, pageWidth - margin, 60, { align: "right" });

  let y = 130;
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.packageName || "Untitled Package", margin, y);

  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(75, 85, 99);
  doc.text(`Destination: ${data.destination || "—"}`, margin, y);
  y += 16;
  doc.text(`For ${data.people} ${data.people === 1 ? "person" : "people"}`, margin, y);

  y += 24;
  const rows = data.costs
    .filter((c) => c.amount > 0)
    .map((c) => [c.label, formatAmount(c.amount, data.currency)]);

  autoTable(doc, {
    startY: y,
    head: [["Item", "Amount"]],
    body: rows.length > 0 ? rows : [["No items", "—"]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 11, cellPadding: 8 },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: "bold",
    },
    columnStyles: {
      1: { halign: "right" },
    },
    foot: [
      ["Total", formatAmount(data.total, data.currency)],
      ["Per person", formatAmount(data.perPerson, data.currency)],
    ],
    footStyles: {
      fillColor: [255, 247, 237],
      textColor: [249, 115, 22],
      fontStyle: "bold",
      fontSize: 12,
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? y;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(
    "This quotation is valid for 14 days. Prices subject to availability and currency fluctuations.",
    margin,
    finalY + 32,
    { maxWidth: pageWidth - margin * 2 }
  );

  doc.setFont("helvetica", "normal");
  doc.text(
    `© ${today.getFullYear()} TravelHub · Generated ${today.toLocaleString()}`,
    margin,
    doc.internal.pageSize.getHeight() - 24
  );

  const rateNote = formatRateNote(data.rateMeta);
  if (rateNote) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(rateNote, margin, doc.internal.pageSize.getHeight() - 12, { maxWidth: pageWidth - margin * 2 });
  }

  const safeName = (data.packageName || "quotation").replace(/[^a-z0-9-_]+/gi, "_");
  doc.save(`${safeName}_${quoteId}.pdf`);
}
