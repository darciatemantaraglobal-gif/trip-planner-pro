import type { SmartKey } from "./types";

/**
 * Detect if a text is a "label" (the static label preceding a value).
 * Returns the SmartKey that the value paired with this label should map to.
 * Example: "Hotel Makkah" label → its nearby value is `hotelMakkah`.
 */
export function detectLabelKey(raw: string): SmartKey | null {
  if (!raw) return null;
  const t = raw.trim().replace(/[:：]\s*$/, "").toLowerCase();
  if (!t) return null;
  for (const rule of LABEL_RULES) {
    if (rule.match.test(t)) return rule.key;
  }
  return null;
}

interface LabelRule { key: SmartKey; match: RegExp }

const LABEL_RULES: LabelRule[] = [
  { key: "customerName", match: /^(invoice\s*to|nama\s*customer|customer|klien|kepada|to|bill\s*to)$/ },
  { key: "updateDate", match: /^(date|tanggal|tgl)$/ },
  { key: "dateRange", match: /^(periode|tanggal\s*berangkat|jadwal|periode\s*berangkat)$/ },
  { key: "quoteNumber", match: /^(no\.?\s*penawaran|nomor\s*penawaran|invoice\s*no\.?|no\.?\s*invoice|quote\s*no)$/ },
  { key: "title", match: /^(judul|judul\s*penawaran|nama\s*penawaran|title)$/ },
  { key: "subtitle", match: /^(nama\s*paket|paket|sub\s*judul)$/ },
  { key: "hotelMakkah", match: /^(hotel\s*makkah|hotel\s*mekkah)$/ },
  { key: "hotelMadinah", match: /^(hotel\s*madinah)$/ },
  { key: "pax", match: /^(jumlah\s*pax|pax|jumlah\s*jamaah|jamaah|peserta)$/ },
  { key: "pricePerPax", match: /^(harga\s*per\s*pax|harga\/pax|price\s*per\s*pax|harga|price)$/ },
  { key: "priceTotal", match: /^(total|grand\s*total|total\s*harga|harga\s*total|total\s*bayar)$/ },
  { key: "tier", match: /^(tier|tipe|kategori|kelas|grade)$/ },
  { key: "website", match: /^(website|situs|web)$/ },
  { key: "contactPhone", match: /^(telepon|telp|phone|no\.?\s*hp|whatsapp|wa)$/ },
  { key: "contactName", match: /^(pic|narahubung|nama\s*kontak|kontak)$/ },
];

/** Detect "X Malam" / "X Night(s)" pattern → returns night count as smart-slot candidate. */
export function isNightsPattern(raw: string): boolean {
  return /^\s*\d+\s*(malam|night|nights|hari)\s*$/i.test(raw);
}

/**
 * Try to map a piece of placeholder text (e.g. "(Nama Customer)", "(Tanggal)")
 * to a known SmartKey. Returns null if no confident match.
 */
export function detectSmartKey(raw: string): SmartKey | null {
  if (!raw) return null;

  const inner = raw
    .trim()
    .replace(/^[\(\[\{<«]+/, "")
    .replace(/[\)\]\}>»]+$/, "")
    .trim()
    .toLowerCase();
  if (!inner) return null;

  const wasParenthesized = /^\s*[\(\[\{<«]/.test(raw.trim());

  for (const rule of RULES) {
    if (rule.match.test(inner)) {
      if (rule.requireParens && !wasParenthesized) continue;
      return rule.key;
    }
  }
  return null;
}

interface Rule {
  key: SmartKey;
  match: RegExp;
  requireParens?: boolean;
}

const RULES: Rule[] = [
  { key: "customerName", match: /^(nama\s*customer|nama\s*klien|customer|klien|nama\s*pemesan|pemesan)$/ },
  { key: "title", match: /^(nama\s*penawaran|judul\s*penawaran|judul|penawaran|title)$/ },
  { key: "subtitle", match: /^(nama\s*paket|paket|sub\s*judul|subtitle|tagline)$/ },
  { key: "quoteNumber", match: /^(no\.?\s*penawaran|nomor\s*penawaran|no\.?\s*invoice|nomor\s*invoice|invoice\s*no|quote\s*no)$/ },
  { key: "tier", match: /^(tier|tipe|kategori|kelas|grade)$/ },
  { key: "dateRange", match: /^(tanggal\s*berangkat|periode|periode\s*berangkat|tanggal\s*keberangkatan|jadwal|jadwal\s*berangkat)$/ },
  // Plain "tanggal" / "date" → quote-issuance date
  { key: "updateDate", match: /^(tanggal|date|tgl|tanggal\s*invoice|tanggal\s*penawaran|tanggal\s*dibuat)$/ },
  { key: "hotelMakkah", match: /^(hotel\s*makkah|hotel\s*mekkah|makkah|mekkah|nama\s*hotel\s*makkah|nama\s*hotel\s*mekkah)$/ },
  { key: "hotelMadinah", match: /^(hotel\s*madinah|hotel\s*madinah|madinah|madina|nama\s*hotel\s*madinah)$/ },
  { key: "makkahNights", match: /^(malam\s*makkah|night(s)?\s*makkah|durasi\s*makkah|lama\s*makkah)$/ },
  { key: "madinahNights", match: /^(malam\s*madinah|night(s)?\s*madinah|durasi\s*madinah|lama\s*madinah)$/ },
  { key: "pax", match: /^(pax|jumlah\s*pax|jumlah\s*jamaah|jamaah|peserta|jumlah\s*peserta)$/ },
  { key: "pricePerPax", match: /^(harga|harga\s*per\s*pax|price|harga\/pax|price\s*per\s*pax|harga\s*paket)$/ },
  { key: "priceTotal", match: /^(total|total\s*harga|grand\s*total|harga\s*total|total\s*bayar)$/ },
  { key: "website", match: /^(website|situs|web|alamat\s*web)$/ },
  { key: "contactPhone", match: /^(telepon|telp|telpon|phone|no\.?\s*hp|nomor\s*hp|whatsapp|wa|kontak\s*hp)$/ },
  { key: "contactName", match: /^(nama\s*kontak|kontak|pic|narahubung|nama\s*pic)$/ },
];
