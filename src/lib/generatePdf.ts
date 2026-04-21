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
    generateLandArrangementPdf(data);
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

function generateLandArrangementPdf(data: QuotationData) {
  const offer = data.offer;
  if (!offer) return;

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 34;
  const gold: [number, number, number] = [249, 115, 22];
  const dark: [number, number, number] = [38, 30, 22];
  const muted: [number, number, number] = [103, 94, 83];

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`#${offer.quoteNumber || Date.now().toString().slice(-4)}`, margin, 32);
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text(offer.tier || "Premium", margin + 82, 31);

  doc.setTextColor(...dark);
  doc.setFontSize(20);
  doc.text(offer.title || data.packageName || "Penawaran Paket Umrah", margin, 72, {
    maxWidth: 265,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(offer.subtitle || "Program Umrah", margin, 107);
  doc.text(offer.dateRange || "—", margin, 130);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Customer:", pageWidth - 180, 72);
  doc.setFontSize(12);
  doc.setTextColor(...dark);
  doc.text(offer.customerName || "IGH Tour", pageWidth - 180, 94);

  const hotelY = 166;
  const colW = (pageWidth - margin * 2 - 28) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text("Hotel Makkah", margin, hotelY);
  doc.text("Hotel Madinah", margin + colW + 28, hotelY);

  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text(offer.hotelMakkah || "—", margin, hotelY + 23, { maxWidth: colW });
  doc.text(offer.hotelMadinah || "—", margin + colW + 28, hotelY + 23, { maxWidth: colW });

  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text(`${offer.makkahNights || 0} MALAM`, margin, hotelY + 47);
  doc.text(stars(offer.makkahStars), margin + 78, hotelY + 47);
  doc.text(`${offer.madinahNights || 0} MALAM`, margin + colW + 28, hotelY + 47);
  doc.text(stars(offer.madinahStars), margin + colW + 116, hotelY + 47);

  autoTable(doc, {
    startY: 245,
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
      fontSize: 13,
      cellPadding: { top: 8, right: 12, bottom: 8, left: 12 },
      textColor: dark,
      lineColor: [235, 229, 220],
      lineWidth: 0.4,
    },
    headStyles: {
      fontSize: 11,
      fontStyle: "bold",
      textColor: muted,
      fillColor: [250, 247, 242],
    },
    columnStyles: {
      0: { cellWidth: 185, fontStyle: "bold", halign: "left" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index > 0) {
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });

  const tableEndY = (doc as any).lastAutoTable?.finalY ?? 430;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text(`KURS 1 USD = ${offer.usdToSar || 3.75} SAR`, margin, tableEndY + 22);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(
    `* Harga sewaktu-waktu dapat berubah tanpa pemberitahuan sebelumnya, harap konfirmasi kembali. Update: ${offer.updateDate || new Date().toLocaleDateString("id-ID")}`,
    margin + 175,
    tableEndY + 22
  );

  const rateNote = formatRateNote(data.rateMeta);
  if (rateNote) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(rateNote, margin, tableEndY + 36);
  }

  const sectionY = tableEndY + 58;
  const halfW = (pageWidth - margin * 2 - 24) / 2;
  doc.setDrawColor(235, 229, 220);
  doc.setFillColor(250, 247, 242);
  doc.roundedRect(margin, sectionY - 20, halfW, 22, 8, 8, "F");
  doc.roundedRect(margin + halfW + 24, sectionY - 20, halfW, 22, 8, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.setFontSize(10);
  doc.text("Harga Sudah Termasuk", margin + halfW / 2, sectionY - 5, { align: "center" });
  doc.text("Harga Tidak Termasuk", margin + halfW + 24 + halfW / 2, sectionY - 5, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  doc.setFontSize(8.2);
  bulletLines(doc, offer.included, margin + 4, sectionY + 16, halfW - 12, 10);
  bulletLines(doc, offer.excluded, margin + halfW + 28, sectionY + 16, halfW - 12, 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text("Pelopor Layanan", margin, pageHeight - 46);
  doc.setTextColor(...dark);
  doc.text("Land Arrangement", margin, pageHeight - 31);
  doc.text("Umrah & Haji", margin, pageHeight - 17);
  doc.setFont("helvetica", "normal");
  doc.text(offer.website || "www.umrahservice.co", margin + 152, pageHeight - 31);

  doc.setFont("helvetica", "bold");
  doc.text("Informasi & Pemesanan", pageWidth - margin, pageHeight - 46, { align: "right" });
  doc.setTextColor(...gold);
  doc.text(
    offer.contactPhone || "+62 812-8955-2018",
    pageWidth - margin,
    pageHeight - 31,
    { align: "right" }
  );
  doc.setTextColor(...dark);
  doc.text(
    offer.contactName || "M. FARUQ AL ISLAM",
    pageWidth - margin,
    pageHeight - 17,
    { align: "right" }
  );

  const safeName = (offer.title || data.packageName || "penawaran_igh").replace(
    /[^a-z0-9-_]+/gi,
    "_"
  );
  doc.save(`${safeName}_${offer.quoteNumber || Date.now().toString().slice(-6)}.pdf`);
}

export function generateQuotationPdf(data: QuotationData) {
  if (data.template && data.offer) {
    generateTemplateOverlayPdf(data, data.template);
    return;
  }

  if (data.offer) {
    generateLandArrangementPdf(data);
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
