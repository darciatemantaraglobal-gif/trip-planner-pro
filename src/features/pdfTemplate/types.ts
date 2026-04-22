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
    name: "IGH Tour — Umroh Private",
    pageSize: "a4",
    orientation: "portrait",
    backgroundColor: "#ffffff",
    elements: [
      /* ── HEADER: Invoice to + Date (kanan atas) ─────────────────────── */
      { id: "inv-lbl", type: "text", text: "Invoice to :", x: 50, y: 9, w: 24, h: 3, z: 2, fontSize: 10, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "inv-val", type: "smart", smartKey: "customerName", x: 50, y: 12.2, w: 24, h: 4, z: 2, fontSize: 11, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "date-lbl", type: "text", text: "Date :", x: 76, y: 9, w: 20, h: 3, z: 2, fontSize: 10, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "date-val", type: "smart", smartKey: "updateDate", x: 76, y: 12.2, w: 20, h: 4, z: 2, fontSize: 11, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d" },

      /* ── TITLE: Nama Penawaran + Tanggal Range ──────────────────────── */
      { id: "title", type: "smart", smartKey: "title", x: 6, y: 22, w: 56, h: 10, z: 2, fontSize: 26, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d", lineHeight: 1.1 },
      { id: "subtitle", type: "smart", smartKey: "dateRange", x: 6, y: 33.5, w: 56, h: 4, z: 2, fontSize: 13, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d" },

      /* ── HOTEL: Makkah & Madinah (2 kolom, no card) ─────────────────── */
      { id: "mak-lbl", type: "text", text: "Hotel Makkah", x: 6, y: 44, w: 40, h: 4, z: 2, fontSize: 12, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "mak", type: "smart", smartKey: "hotelMakkah", x: 6, y: 49, w: 40, h: 5, z: 2, fontSize: 14, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "mak-n", type: "smart", smartKey: "makkahNights", x: 6, y: 54.5, w: 24, h: 4, z: 2, fontSize: 11, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d", suffix: " Malam" },

      { id: "mad-lbl", type: "text", text: "Hotel Madinah", x: 52, y: 44, w: 40, h: 4, z: 2, fontSize: 12, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "mad", type: "smart", smartKey: "hotelMadinah", x: 52, y: 49, w: 40, h: 5, z: 2, fontSize: 14, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "mad-n", type: "smart", smartKey: "madinahNights", x: 52, y: 54.5, w: 24, h: 4, z: 2, fontSize: 11, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d", suffix: " Malam" },

      /* ── PAX & HARGA ────────────────────────────────────────────────── */
      { id: "pax-lbl", type: "text", text: "Jumlah Pax :", x: 6, y: 62, w: 40, h: 3.5, z: 2, fontSize: 11, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "pax", type: "smart", smartKey: "pax", x: 6, y: 66.5, w: 24, h: 8, z: 2, fontSize: 28, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d" },

      { id: "price-lbl", type: "text", text: "Harga per Pax :", x: 52, y: 62, w: 40, h: 3.5, z: 2, fontSize: 11, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "price", type: "smart", smartKey: "pricePerPax", x: 52, y: 66.5, w: 44, h: 8, z: 2, fontSize: 22, fontWeight: "bold", fontStyle: "normal", align: "left", color: "#0b1f4d", format: "currency-idr" },

      /* ── CATATAN KECIL ─────────────────────────────────────────────── */
      { id: "note-1", type: "text", text: "* Harga sewaktu-waktu dapat berubah, harap konfirmasi kembali sebelum pembayaran.", x: 6, y: 76, w: 88, h: 3, z: 2, fontSize: 8, fontWeight: "normal", fontStyle: "italic", align: "left", color: "#0b1f4d", lineHeight: 1.2 },
      { id: "note-2", type: "text", text: "* Kurs IDR 17.100/USD", x: 6, y: 79, w: 88, h: 3, z: 2, fontSize: 8, fontWeight: "normal", fontStyle: "italic", align: "left", color: "#0b1f4d" },

      /* ── SUDAH / BELUM TERMASUK (2 kolom, no card) ──────────────────── */
      { id: "inc-title", type: "text", text: "Sudah Termasuk", x: 6, y: 84, w: 40, h: 4, z: 2, fontSize: 12, fontWeight: "bold", fontStyle: "normal", align: "center", color: "#0b1f4d" },
      { id: "inc", type: "bullet", source: "included", x: 6, y: 88, w: 40, h: 7, z: 2, fontSize: 9, fontWeight: "normal", color: "#0b1f4d", bulletColor: "#0b1f4d", maxItems: 6 },

      { id: "exc-title", type: "text", text: "Belum Termasuk", x: 52, y: 84, w: 40, h: 4, z: 2, fontSize: 12, fontWeight: "bold", fontStyle: "normal", align: "center", color: "#0b1f4d" },
      { id: "exc", type: "bullet", source: "excluded", x: 52, y: 88, w: 40, h: 7, z: 2, fontSize: 9, fontWeight: "normal", color: "#0b1f4d", bulletColor: "#0b1f4d", maxItems: 6 },

      /* ── FOOTER: kontak (tagline & logo dari background) ────────────── */
      { id: "ftr-ig", type: "text", text: "instagram.com/igh.tour", x: 6, y: 96.5, w: 44, h: 3, z: 2, fontSize: 9, fontWeight: "normal", fontStyle: "normal", align: "left", color: "#0b1f4d" },
      { id: "ftr-mail", type: "text", text: "igh.tours.travel@gmail.com", x: 50, y: 96.5, w: 46, h: 3, z: 2, fontSize: 9, fontWeight: "normal", fontStyle: "normal", align: "right", color: "#0b1f4d" },
    ],
  };
}

