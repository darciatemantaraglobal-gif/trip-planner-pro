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
    name: "IGH Tour — Premium",
    pageSize: "a4",
    orientation: "portrait",
    backgroundColor: "#ffffff",
    elements: [
      /* ── HEADER (minimal, biar background lo bisa keliatan) ─────────── */
      // Aksen oranye tipis kiri-atas
      { id: "accent-bar", type: "shape", shape: "rect", x: 5, y: 5.5, w: 6, h: 0.45, z: 1, fill: "#ea580c", stroke: "transparent", strokeWidth: 0, borderRadius: 0.3 },
      { id: "hdr-eyebrow", type: "text", text: "PENAWARAN PAKET", x: 5, y: 6.3, w: 50, h: 3, z: 2, fontSize: 9, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#6b7280", lineHeight: 1.1 },
      // Quote # pill kanan-atas
      { id: "hdr-quote-bg", type: "shape", shape: "rect", x: 70, y: 5.3, w: 25, h: 4.2, z: 1, fill: "#ffffff", stroke: "#e5d9c4", strokeWidth: 0.5, borderRadius: 2.1 },
      { id: "hdr-quote", type: "smart", smartKey: "quoteNumber", x: 70, y: 5.3, w: 25, h: 4.2, z: 2, fontSize: 9, fontWeight: "bold", fontStyle: "normal", align: "center", color: "#0b1f4d", prefix: "Quote #" },

      /* ── TITLE BLOCK ─────────────────────────────────────────────── */
      { id: "title", type: "smart", smartKey: "title", x: 5, y: 12, w: 64, h: 8.5, z: 2, fontSize: 22, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d", lineHeight: 1.15 },
      { id: "subtitle", type: "smart", smartKey: "dateRange", x: 5, y: 21, w: 64, h: 4, z: 2, fontSize: 10.5, fontWeight: "normal", fontStyle: "italic", align: "left", color: "#6b7280" },

      // Customer label kanan
      { id: "cust-lbl", type: "text", text: "DITUJUKAN UNTUK", x: 70, y: 12, w: 25, h: 3, z: 2, fontSize: 7.5, fontWeight: "bold", fontStyle: "normal", align: "right", color: "#c99841" },
      { id: "cust", type: "smart", smartKey: "customerName", x: 70, y: 15.5, w: 25, h: 5, z: 2, fontSize: 12, fontWeight: "bold", fontStyle: "normal", align: "right", color: "#0b1f4d" },

      // Divider tipis emas
      { id: "div-top", type: "shape", shape: "rect", x: 5, y: 27, w: 90, h: 0.18, z: 1, fill: "#c99841", stroke: "transparent", strokeWidth: 0 },

      /* ── HOTEL CARDS (Makkah & Madinah) ──────────────────────────── */
      // Makkah card
      { id: "mak-card", type: "shape", shape: "rect", x: 5, y: 30, w: 43, h: 16, z: 1, fill: "#ffffff", stroke: "#e5d9c4", strokeWidth: 0.6, borderRadius: 3 },
      { id: "mak-tab", type: "shape", shape: "rect", x: 5, y: 30, w: 1, h: 16, z: 2, fill: "#c99841", stroke: "transparent", strokeWidth: 0, borderRadius: 3 },
      { id: "mak-lbl", type: "text", text: "MAKKAH", x: 8, y: 32, w: 25, h: 3, z: 3, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#c99841" },
      { id: "mak", type: "smart", smartKey: "hotelMakkah", x: 8, y: 35.5, w: 38, h: 5.5, z: 3, fontSize: 13, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d", lineHeight: 1.1 },
      { id: "mak-n", type: "smart", smartKey: "makkahNights", x: 8, y: 41.5, w: 18, h: 3.6, z: 3, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "center", color: "#7c5a18", backgroundColor: "#f7e9bf", suffix: " MALAM", paddingY: 1, paddingX: 4 },

      // Madinah card
      { id: "mad-card", type: "shape", shape: "rect", x: 52, y: 30, w: 43, h: 16, z: 1, fill: "#ffffff", stroke: "#e5d9c4", strokeWidth: 0.6, borderRadius: 3 },
      { id: "mad-tab", type: "shape", shape: "rect", x: 52, y: 30, w: 1, h: 16, z: 2, fill: "#c99841", stroke: "transparent", strokeWidth: 0, borderRadius: 3 },
      { id: "mad-lbl", type: "text", text: "MADINAH", x: 55, y: 32, w: 25, h: 3, z: 3, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#c99841" },
      { id: "mad", type: "smart", smartKey: "hotelMadinah", x: 55, y: 35.5, w: 38, h: 5.5, z: 3, fontSize: 13, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d", lineHeight: 1.1 },
      { id: "mad-n", type: "smart", smartKey: "madinahNights", x: 55, y: 41.5, w: 18, h: 3.6, z: 3, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "center", color: "#7c5a18", backgroundColor: "#f7e9bf", suffix: " MALAM", paddingY: 1, paddingX: 4 },

      /* ── PRICE HIGHLIGHT (navy card premium) ─────────────────────── */
      { id: "price-card", type: "shape", shape: "rect", x: 5, y: 49.5, w: 90, h: 14, z: 1, fill: "#0b1f4d", stroke: "transparent", strokeWidth: 0, borderRadius: 3 },
      { id: "price-tab", type: "shape", shape: "rect", x: 5, y: 49.5, w: 1, h: 14, z: 2, fill: "#ea580c", stroke: "transparent", strokeWidth: 0, borderRadius: 3 },
      // Pax kiri
      { id: "pax-lbl", type: "text", text: "JUMLAH PAX", x: 8, y: 52, w: 30, h: 3, z: 3, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#c99841" },
      { id: "pax", type: "smart", smartKey: "pax", x: 8, y: 55.5, w: 30, h: 7, z: 3, fontSize: 22, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#ffffff", suffix: " pax" },
      // Garis pembatas vertikal tipis
      { id: "price-sep", type: "shape", shape: "rect", x: 47, y: 52, w: 0.15, h: 9, z: 3, fill: "#c99841", stroke: "transparent", strokeWidth: 0 },
      // Price kanan
      { id: "price-lbl", type: "text", text: "HARGA / PAX", x: 50, y: 52, w: 42, h: 3, z: 3, fontSize: 8, fontWeight: "bold", fontStyle: "normal", align: "right", color: "#c99841" },
      { id: "price", type: "smart", smartKey: "pricePerPax", x: 50, y: 55.5, w: 42, h: 7, z: 3, fontSize: 22, fontWeight: "bold", fontStyle: "normal", align: "right", color: "#ffffff", format: "currency-idr" },

      /* ── INCLUSIONS / EXCLUSIONS ─────────────────────────────────── */
      { id: "inc-card", type: "shape", shape: "rect", x: 5, y: 67, w: 43, h: 22, z: 1, fill: "#ffffff", stroke: "#d1fae5", strokeWidth: 0.6, borderRadius: 3 },
      { id: "inc", type: "bullet", source: "included", x: 6, y: 68, w: 41, h: 20, z: 2, fontSize: 9, fontWeight: "normal", color: "#1f2937", bulletColor: "#10b981", title: "TERMASUK", titleBg: "#ecfdf5", titleColor: "#047857", maxItems: 12 },

      { id: "exc-card", type: "shape", shape: "rect", x: 52, y: 67, w: 43, h: 22, z: 1, fill: "#ffffff", stroke: "#fee2e2", strokeWidth: 0.6, borderRadius: 3 },
      { id: "exc", type: "bullet", source: "excluded", x: 53, y: 68, w: 41, h: 20, z: 2, fontSize: 9, fontWeight: "normal", color: "#1f2937", bulletColor: "#ef4444", title: "TIDAK TERMASUK", titleBg: "#fef2f2", titleColor: "#b91c1c", maxItems: 12 },

      /* ── FOOTER (garis emas + kontak, no full bar) ───────────────── */
      { id: "ftr-line", type: "shape", shape: "rect", x: 5, y: 92.5, w: 90, h: 0.18, z: 1, fill: "#c99841", stroke: "transparent", strokeWidth: 0 },
      { id: "ftr-web", type: "smart", smartKey: "website", x: 5, y: 94, w: 50, h: 3.5, z: 2, fontSize: 9, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "ftr-phn", type: "smart", smartKey: "contactPhone", x: 55, y: 94, w: 40, h: 3.5, z: 2, fontSize: 9, fontWeight: "bold", fontStyle: "normal", align: "right", color: "#0b1f4d" },
    ],
  };
}
