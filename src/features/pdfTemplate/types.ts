export type ElementType = "text" | "image" | "shape" | "bullet" | "smart";

export type ShapeKind = "rect" | "ellipse" | "line";

export type SmartKey =
  | "quoteNumber"
  | "tier"
  | "title"
  | "subtitle"
  | "dateRange"
  | "customerName"
  | "hotelMakkah"
  | "hotelMadinah"
  | "makkahNights"
  | "madinahNights"
  | "pax"
  | "pricePerPax"
  | "priceTotal"
  | "updateDate"
  | "website"
  | "contactPhone"
  | "contactName"
  | "agencyLogo";

export interface BaseElement {
  id: string;
  /** Position & size as percentages of page (0–100). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stacking order. Higher = front. */
  z: number;
  rotation?: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number; // pt
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  align: "left" | "center" | "right";
  color: string;
  backgroundColor?: string;
  paddingX?: number; // pt
  paddingY?: number;
  lineHeight?: number; // multiplier
}

export interface ImageElement extends BaseElement {
  type: "image";
  /** data URL */
  src: string;
  fit: "cover" | "contain";
  borderRadius?: number; // pt
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius?: number; // for rect
}

export interface BulletElement extends BaseElement {
  type: "bullet";
  /** Where items come from. `custom` uses `items`, others bind to ctx arrays. */
  source: "included" | "excluded" | "custom";
  items?: string[];
  fontSize: number;
  fontWeight: "normal" | "bold";
  color: string;
  bulletColor?: string;
  /** Optional title bar above the list. */
  title?: string;
  titleBg?: string;
  titleColor?: string;
  maxItems?: number;
}

export interface SmartElement extends BaseElement {
  type: "smart";
  smartKey: SmartKey;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  backgroundColor?: string;
  align: "left" | "center" | "right";
  prefix?: string;
  suffix?: string;
  /** "currency-idr" prefixes Rp + thousands separator. "plain" leaves as-is. */
  format?: "plain" | "currency-idr" | "uppercase";
  paddingX?: number;
  paddingY?: number;
}

export type CanvasElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | BulletElement
  | SmartElement;

export interface CanvasTemplate {
  id: string;
  name: string;
  pageSize: "a4" | "a5" | "letter";
  orientation: "portrait" | "landscape";
  backgroundColor: string;
  backgroundImage?: string;
  elements: CanvasElement[];
  createdAt: number;
  updatedAt: number;
}

/* ─── Page geometry helpers (jsPDF points) ───────────────────────────── */

export const PAGE_SIZES_PT: Record<CanvasTemplate["pageSize"], { w: number; h: number }> = {
  a4: { w: 595, h: 842 },
  a5: { w: 420, h: 595 },
  letter: { w: 612, h: 792 },
};

export function getPageDimsPt(t: { pageSize: CanvasTemplate["pageSize"]; orientation: CanvasTemplate["orientation"] }) {
  const base = PAGE_SIZES_PT[t.pageSize];
  return t.orientation === "landscape"
    ? { wPt: base.h, hPt: base.w }
    : { wPt: base.w, hPt: base.h };
}

/* ─── Smart key catalogue (used by editor toolbar) ───────────────────── */

export const SMART_KEY_LABELS: Record<SmartKey, string> = {
  quoteNumber: "No. Penawaran",
  tier: "Tipe / Tier",
  title: "Judul",
  subtitle: "Subjudul",
  dateRange: "Periode Tanggal",
  customerName: "Nama Customer",
  hotelMakkah: "Hotel Makkah",
  hotelMadinah: "Hotel Madinah",
  makkahNights: "Malam Makkah",
  madinahNights: "Malam Madinah",
  pax: "Jumlah Pax",
  pricePerPax: "Harga / Pax",
  priceTotal: "Harga Total",
  updateDate: "Tanggal Update",
  website: "Website",
  contactPhone: "Telepon",
  contactName: "Nama Kontak",
  agencyLogo: "Logo Agency",
};

/* ─── Default starter template (used on first run) ───────────────────── */

export function makeDefaultStarterTemplate(): Omit<CanvasTemplate, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "Default IGH Tour",
    pageSize: "a4",
    orientation: "portrait",
    backgroundColor: "#ffffff",
    elements: [
      // Header band
      { id: "hdr", type: "shape", shape: "rect", x: 0, y: 0, w: 100, h: 8, z: 1, fill: "#ea580c", stroke: "transparent", strokeWidth: 0 },
      { id: "hdr-title", type: "text", text: "PENAWARAN PAKET", x: 4, y: 1.5, w: 60, h: 5, z: 2, fontSize: 14, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#ffffff" },
      { id: "hdr-quote", type: "smart", smartKey: "quoteNumber", x: 70, y: 1.5, w: 26, h: 5, z: 2, fontSize: 11, fontWeight: "bold", fontStyle: "normal", align: "right", color: "#ffffff", prefix: "Quote #" },

      // Title block
      { id: "title", type: "smart", smartKey: "title", x: 4, y: 11, w: 70, h: 7, z: 2, fontSize: 20, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#102463" },
      { id: "subtitle", type: "smart", smartKey: "dateRange", x: 4, y: 18, w: 70, h: 4, z: 2, fontSize: 11, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#666666" },

      // Customer
      { id: "cust-lbl", type: "text", text: "Customer:", x: 76, y: 11, w: 20, h: 3, z: 2, fontSize: 8, fontWeight: "normal", fontStyle: "normal", align: "right", color: "#888888" },
      { id: "cust", type: "smart", smartKey: "customerName", x: 76, y: 14, w: 20, h: 5, z: 2, fontSize: 11, fontWeight: "bold", fontStyle: "normal", align: "right", color: "#102463" },

      // Hotels row
      { id: "h-mak-lbl", type: "text", text: "MAKKAH", x: 4, y: 26, w: 30, h: 3, z: 2, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#888888" },
      { id: "h-mak", type: "smart", smartKey: "hotelMakkah", x: 4, y: 29, w: 44, h: 5, z: 2, fontSize: 13, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#102463" },
      { id: "h-mak-n", type: "smart", smartKey: "makkahNights", x: 4, y: 34.5, w: 22, h: 4, z: 2, fontSize: 9, fontWeight: "bold", fontStyle: "normal", align: "center", color: "#c99841", backgroundColor: "#f3e2af", suffix: " MALAM" },

      { id: "h-mad-lbl", type: "text", text: "MADINAH", x: 52, y: 26, w: 30, h: 3, z: 2, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#888888" },
      { id: "h-mad", type: "smart", smartKey: "hotelMadinah", x: 52, y: 29, w: 44, h: 5, z: 2, fontSize: 13, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#102463" },
      { id: "h-mad-n", type: "smart", smartKey: "madinahNights", x: 52, y: 34.5, w: 22, h: 4, z: 2, fontSize: 9, fontWeight: "bold", fontStyle: "normal", align: "center", color: "#c99841", backgroundColor: "#f3e2af", suffix: " MALAM" },

      // Pax + price
      { id: "pax-lbl", type: "text", text: "JUMLAH PAX", x: 4, y: 41, w: 30, h: 3, z: 2, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#888888" },
      { id: "pax", type: "smart", smartKey: "pax", x: 4, y: 44, w: 30, h: 7, z: 2, fontSize: 22, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#102463" },

      { id: "price-lbl", type: "text", text: "HARGA / PAX", x: 52, y: 41, w: 44, h: 3, z: 2, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#888888" },
      { id: "price", type: "smart", smartKey: "pricePerPax", x: 52, y: 44, w: 44, h: 7, z: 2, fontSize: 18, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#ea580c", format: "currency-idr" },

      // Bullets
      { id: "inc", type: "bullet", source: "included", x: 4, y: 54, w: 44, h: 36, z: 2, fontSize: 9, fontWeight: "normal", color: "#3a2f22", bulletColor: "#10b981", title: "TERMASUK", titleBg: "#ecfdf5", titleColor: "#047857", maxItems: 14 },
      { id: "exc", type: "bullet", source: "excluded", x: 52, y: 54, w: 44, h: 36, z: 2, fontSize: 9, fontWeight: "normal", color: "#3a2f22", bulletColor: "#ef4444", title: "TIDAK TERMASUK", titleBg: "#fef2f2", titleColor: "#b91c1c", maxItems: 14 },

      // Footer
      { id: "ftr", type: "shape", shape: "rect", x: 0, y: 93, w: 100, h: 7, z: 1, fill: "#102463", stroke: "transparent", strokeWidth: 0 },
      { id: "ftr-web", type: "smart", smartKey: "website", x: 4, y: 95, w: 50, h: 4, z: 2, fontSize: 10, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#ffffff" },
      { id: "ftr-phn", type: "smart", smartKey: "contactPhone", x: 56, y: 95, w: 40, h: 4, z: 2, fontSize: 10, fontWeight: "bold", fontStyle: "normal", align: "right", color: "#ffffff" },
    ],
  };
}
