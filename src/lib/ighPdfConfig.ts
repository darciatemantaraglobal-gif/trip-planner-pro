/**
 * Konfigurasi koordinat untuk generator PDF IGH.
 * Dipakai oleh `generateIghPdf.ts` dan komponen `PdfLayoutTuner` untuk
 * tuning visual real-time tanpa edit kode.
 *
 * Semua koordinat dalam "template space" 740-px wide (top-left origin).
 */

export type IghFontFamily = "Montserrat" | "Poppins" | "Sk-Modernist";
export type IghSection = "projectName" | "metaInfo" | "pricing" | "checklist" | "hotel";

/** URL dari tiap weight per family. Semua di-load via fontkit pdf-lib. */
export const FONT_FAMILY_URLS: Record<IghFontFamily, { regular: string; semiBold: string; bold: string }> = {
  Montserrat: {
    regular: "/fonts/Montserrat-Regular.ttf",
    semiBold: "/fonts/Montserrat-SemiBold.ttf",
    bold: "/fonts/Montserrat-Bold.ttf",
  },
  Poppins: {
    regular: "/fonts/Poppins-Regular.ttf",
    semiBold: "/fonts/Poppins-SemiBold.ttf",
    bold: "/fonts/Poppins-Bold.ttf",
  },
  "Sk-Modernist": {
    regular: "/fonts/Sk-Modernist-Regular.otf",
    // Sk-Modernist tidak punya SemiBold — fallback ke Bold.
    semiBold: "/fonts/Sk-Modernist-Bold.otf",
    bold: "/fonts/Sk-Modernist-Bold.otf",
  },
};

export interface IghLayoutConfig {
  projectName: {
    /** X (top-left, template px) */
    xPx: number;
    /** Y (top-left, template px) baris pertama */
    topPx: number;
    /** Font size awal (auto-shrink kalau kepanjangan) */
    size: number;
    /** Jarak vertikal absolut (px) antar baris bila project name multi-line */
    lineGapPx: number;
    /** Override teks. Kosong = pakai data dari kalkulator. */
    text?: string;
  };
  metaInfo: {
    /** X invoice/customer */
    customerXPx: number;
    /** X tanggal */
    dateXPx: number;
    /** Y untuk kedua field (sejajar) */
    topPx: number;
    /** Font size */
    size: number;
    /** Override teks */
    customerText?: string;
    dateText?: string;
  };
  hotel: {
    /** X kolom Makkah */
    makkahXPx: number;
    /** X kolom Madinah */
    madinahXPx: number;
    /** Y nama hotel */
    topPx: number;
    /** Font size nama hotel */
    size: number;
    /** Override teks */
    makkahText?: string;
    madinahText?: string;
  };
  pricing: {
    /** X kotak Pax */
    paxXPx: number;
    /** X kotak Harga */
    priceXPx: number;
    /** Y top kotak (kedua kotak sejajar) */
    topPx: number;
    /** Font size harga (pax akan +4) */
    size: number;
    /** Vertical center offset (pdf-units). Negatif = naik, positif = turun. */
    yOffsetPdf: number;
    /** Override teks */
    paxText?: string;
    priceText?: string;
  };
  checklist: {
    /** X column kiri (Sudah) — tengah kolom */
    leftXPx: number;
    /** X column kanan (Belum) — tengah kolom */
    rightXPx: number;
    /** Baseline (top-px) row pertama (digit "01") */
    firstBaselinePx: number;
    /** Jarak antar baris (px) */
    rowSpacingPx: number;
    /** Y offset untuk geser teks ke atas/bawah supaya pas di tengah dua garis */
    yOffsetPx: number;
    /** Font size item teks */
    size: number;
    /** Override teks (newline-separated, max 5 baris) */
    includedText?: string;
    excludedText?: string;
  };
  fonts: {
    /** Default family untuk semua section (kecuali yg di-override) */
    family: IghFontFamily;
    /** Override per section. Kalau null/undefined → pakai `family`. */
    overrides?: Partial<Record<IghSection, IghFontFamily>>;
  };
}

export const DEFAULT_IGH_LAYOUT: IghLayoutConfig = {
  projectName: { xPx: 55, topPx: 257, size: 22, lineGapPx: 4 },
  metaInfo: { customerXPx: 335, dateXPx: 538, topPx: 259, size: 13 },
  hotel: { makkahXPx: 51, madinahXPx: 407, topPx: 395, size: 22 },
  pricing: { paxXPx: 47, priceXPx: 272, topPx: 518, size: 22, yOffsetPdf: -8 },
  checklist: {
    leftXPx: 212,   // tengah kolom kiri (95 + 235/2)
    rightXPx: 576,  // tengah kolom kanan (459 + 235/2)
    firstBaselinePx: 715,
    rowSpacingPx: 28,
    yOffsetPx: 0,
    size: 10,
  },
  fonts: { family: "Poppins", overrides: {} },
};

const STORAGE_KEY = "igh:pdf-layout-config";
const PRESETS_CACHE_KEY = "igh:pdf-layout-presets-cache";

export interface IghLayoutPreset {
  id: string;
  name: string;
  config: IghLayoutConfig;
  createdAt: number;
  updatedAt: number;
  /** Built-in preset (read-only safety net). Tidak disimpan di cloud. */
  builtin?: boolean;
}

/** Built-in preset yang selalu tersedia — safety net kalau cloud kosong. */
export const BUILTIN_PRESET: IghLayoutPreset = {
  id: "builtin:igh-official-default",
  name: "IGH Official Default",
  config: DEFAULT_IGH_LAYOUT,
  createdAt: 0,
  updatedAt: 0,
  builtin: true,
};

/** Cache lokal (cepat, sinkron) — diisi ulang dari cloud setiap kali pull. */
export function loadPresetsCache(): IghLayoutPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IghLayoutPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.id === "string" && typeof p.name === "string" && p.config)
      .map((p) => ({ ...p, config: mergeConfig(DEFAULT_IGH_LAYOUT, p.config) }));
  } catch {
    return [];
  }
}

export function savePresetsCache(presets: IghLayoutPreset[]) {
  try {
    localStorage.setItem(PRESETS_CACHE_KEY, JSON.stringify(presets.filter((p) => !p.builtin)));
  } catch {
    /* noop */
  }
}

/** Susun list yang ditampilkan di UI: built-in di atas, lalu cloud presets. */
export function withBuiltins(presets: IghLayoutPreset[]): IghLayoutPreset[] {
  return [BUILTIN_PRESET, ...presets.filter((p) => !p.builtin)];
}

export function loadIghLayoutConfig(): IghLayoutConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_IGH_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<IghLayoutConfig>;
    return mergeConfig(DEFAULT_IGH_LAYOUT, parsed);
  } catch {
    return DEFAULT_IGH_LAYOUT;
  }
}

export function saveIghLayoutConfig(cfg: IghLayoutConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* noop */
  }
}

export function mergeConfig(
  base: IghLayoutConfig,
  override?: Partial<IghLayoutConfig>,
): IghLayoutConfig {
  if (!override) return base;
  return {
    projectName: { ...base.projectName, ...(override.projectName ?? {}) },
    metaInfo: { ...base.metaInfo, ...(override.metaInfo ?? {}) },
    hotel: { ...base.hotel, ...(override.hotel ?? {}) },
    pricing: { ...base.pricing, ...(override.pricing ?? {}) },
    checklist: { ...base.checklist, ...(override.checklist ?? {}) },
    fonts: {
      ...base.fonts,
      ...(override.fonts ?? {}),
      overrides: {
        ...(base.fonts.overrides ?? {}),
        ...(override.fonts?.overrides ?? {}),
      },
    },
  };
}
