import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface QuotationData {
  packageName: string;
  destination: string;
  people: number;
  currency: string;
  costs: { id: string; label: string; amount: number }[];
  total: number;
  perPerson: number;
}

const symbols: Record<string, string> = { USD: "$", SAR: "SAR", IDR: "Rp" };

function formatAmount(n: number, currency: string) {
  const symbol = symbols[currency] ?? "";
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  return `${symbol} ${n.toLocaleString(locale, { maximumFractionDigits: currency === "IDR" ? 0 : 2 })}`;
}

/**
 * Generates a clean trip-quotation PDF and triggers a browser download.
 * Uses dynamic data passed from the calculator state.
 */
export function generateQuotationPdf(data: QuotationData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  // ---- Header band ----
  doc.setFillColor(37, 99, 235); // primary blue
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

  // ---- Package title block ----
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
  doc.text(
    `For ${data.people} ${data.people === 1 ? "person" : "people"}`,
    margin,
    y,
  );

  // ---- Cost breakdown table ----
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
      fillColor: [239, 246, 255],
      textColor: [37, 99, 235],
      fontStyle: "bold",
      fontSize: 12,
    },
  });

  // ---- Footer note ----
  const finalY = (doc as any).lastAutoTable?.finalY ?? y;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(
    "This quotation is valid for 14 days. Prices subject to availability and currency fluctuations.",
    margin,
    finalY + 32,
    { maxWidth: pageWidth - margin * 2 },
  );

  doc.setFont("helvetica", "normal");
  doc.text(
    `© ${today.getFullYear()} TravelHub · Generated ${today.toLocaleString()}`,
    margin,
    doc.internal.pageSize.getHeight() - 24,
  );

  const safeName = (data.packageName || "quotation").replace(/[^a-z0-9-_]+/gi, "_");
  doc.save(`${safeName}_${quoteId}.pdf`);
}
