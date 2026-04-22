import type { SmartKey, SmartElement, BulletElement } from "./types";

export interface BindingContext {
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
  pax: number;
  pricePerPax: number;
  priceTotal: number;
  updateDate: string;
  website: string;
  contactPhone: string;
  contactName: string;
  included: string[];
  excluded: string[];
  /** data URL */
  agencyLogo?: string;
}

export const PLACEHOLDER_CTX: BindingContext = {
  quoteNumber: "001",
  tier: "PREMIUM",
  title: "Penawaran Paket Umrah",
  subtitle: "Program 9 Hari",
  dateRange: "10 — 18 Mar 2026",
  customerName: "PT Sahabat Tour",
  hotelMakkah: "Hilton Suites Makkah",
  hotelMadinah: "Pullman Madinah",
  makkahNights: 5,
  madinahNights: 3,
  pax: 10,
  pricePerPax: 22863610,
  priceTotal: 228636100,
  updateDate: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
  website: "www.umrahservice.co",
  contactPhone: "+62 812-8955-2018",
  contactName: "M. FARUQ AL ISLAM",
  included: [
    "Visa Umrah",
    "Mutawif",
    "Hotel Makkah",
    "Hotel Madinah",
    "Transport selama di Saudi",
  ],
  excluded: [
    "Tiket Pesawat",
    "Vaksinasi",
    "Pembuatan Paspor",
    "Personal Expenses",
  ],
  agencyLogo: undefined,
};

function fmtCurrencyIDR(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function resolveSmartValue(
  key: SmartKey,
  ctx: BindingContext,
  format?: SmartElement["format"]
): string {
  const raw = (() => {
    switch (key) {
      case "quoteNumber": return ctx.quoteNumber || "—";
      case "tier": return ctx.tier || "";
      case "title": return ctx.title || "";
      case "subtitle": return ctx.subtitle || "";
      case "dateRange": return ctx.dateRange || "";
      case "customerName": return ctx.customerName || "";
      case "hotelMakkah": return ctx.hotelMakkah || "—";
      case "hotelMadinah": return ctx.hotelMadinah || "—";
      case "makkahNights": return String(ctx.makkahNights || 0);
      case "madinahNights": return String(ctx.madinahNights || 0);
      case "pax": return String(ctx.pax || 0);
      case "pricePerPax":
        return format === "currency-idr" ? fmtCurrencyIDR(ctx.pricePerPax) : String(Math.round(ctx.pricePerPax));
      case "priceTotal":
        return format === "currency-idr" ? fmtCurrencyIDR(ctx.priceTotal) : String(Math.round(ctx.priceTotal));
      case "updateDate": return ctx.updateDate || "";
      case "website": return ctx.website || "";
      case "contactPhone": return ctx.contactPhone || "";
      case "contactName": return ctx.contactName || "";
      case "agencyLogo": return ""; // images handled separately
      default: return "";
    }
  })();

  if (format === "uppercase") return raw.toUpperCase();
  if (format === "currency-idr" && (key === "pricePerPax" || key === "priceTotal")) return raw;
  if (format === "currency-idr") {
    const n = Number(raw.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(n) && raw.trim() !== "") return fmtCurrencyIDR(n);
  }
  return raw;
}

export function resolveBulletItems(el: BulletElement, ctx: BindingContext): string[] {
  const src =
    el.source === "included"
      ? ctx.included
      : el.source === "excluded"
        ? ctx.excluded
        : el.items ?? [];
  const max = el.maxItems ?? 20;
  return src.slice(0, max);
}
