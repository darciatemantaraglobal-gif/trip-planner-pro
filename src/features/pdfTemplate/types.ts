export interface TemplateFieldConfig {
  key: string;
  label: string;
  x: number;
  y: number;
  fontSize: number;
  bold: boolean;
  color: string;
}

export interface PdfTemplate {
  id: string;
  name: string;
  backgroundImage: string;
  orientation: "portrait" | "landscape";
  fields: TemplateFieldConfig[];
  createdAt: number;
}

export const TEMPLATE_FIELD_DEFS: {
  key: string;
  label: string;
  defaultFontSize: number;
  defaultBold: boolean;
}[] = [
  { key: "quoteNumber", label: "No. Penawaran", defaultFontSize: 10, defaultBold: true },
  { key: "tier", label: "Tipe", defaultFontSize: 10, defaultBold: false },
  { key: "title", label: "Judul Penawaran", defaultFontSize: 18, defaultBold: true },
  { key: "subtitle", label: "Program", defaultFontSize: 11, defaultBold: false },
  { key: "dateRange", label: "Periode", defaultFontSize: 10, defaultBold: false },
  { key: "customerName", label: "Nama Customer", defaultFontSize: 12, defaultBold: true },
  { key: "hotelMakkah", label: "Hotel Makkah", defaultFontSize: 12, defaultBold: false },
  { key: "hotelMadinah", label: "Hotel Madinah", defaultFontSize: 12, defaultBold: false },
  { key: "makkahNights", label: "Malam Makkah", defaultFontSize: 10, defaultBold: false },
  { key: "madinahNights", label: "Malam Madinah", defaultFontSize: 10, defaultBold: false },
  { key: "updateDate", label: "Tgl Update", defaultFontSize: 9, defaultBold: false },
  { key: "website", label: "Website", defaultFontSize: 9, defaultBold: false },
  { key: "contactPhone", label: "Telepon", defaultFontSize: 10, defaultBold: true },
  { key: "contactName", label: "Nama Kontak", defaultFontSize: 10, defaultBold: false },
  { key: "priceTable", label: "Tabel Harga", defaultFontSize: 11, defaultBold: false },
];

export const FIELD_COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b",
  "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#14b8a6", "#f43f5e",
  "#a855f7", "#22c55e", "#0ea5e9",
];
