import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  customBgImage?: string; // data URL — full-page background image
  pageSize?: "a4" | "a5" | "letter";
  orientation?: "portrait" | "landscape";
  marginScale?: number; // 0.5–1.5 multiplier on default margins
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
  customBgImage?: string; // data URL — full-page background image
  pageSize?: "a4" | "a5" | "letter";
  orientation?: "portrait" | "landscape";
  marginScale?: number; // 0.5–1.5 multiplier on default margins
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

function getImgFormat(dataUrl: string): string {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function fmtIDR(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export async function generateSimplePackagePdf(data: SimplePackagePdfData) {
  const doc = new jsPDF({
    unit: "pt",
    format: data.pageSize ?? "a4",
    orientation: data.orientation ?? "portrait",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56 * (data.marginScale ?? 1);

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

  // ── Optional custom background image (full-page) ──
  if (data.customBgImage) {
    try {
      doc.addImage(data.customBgImage, getImgFormat(data.customBgImage), 0, 0, pageW, pageH);
    } catch (err) {
      console.warn("Failed to render custom bg image:", err);
    }
  }

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
