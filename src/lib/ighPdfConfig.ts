/**
 * Konfigurasi koordinat untuk generator PDF IGH.
 * Dipakai oleh `generateIghPdf.ts` dan komponen `PdfLayoutTuner` untuk
 * tuning visual real-time tanpa edit kode.
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
    /** Top px (template space, 740-wide) baris pertama project name */
    topPx: number;
    /** Font size awal (auto-shrink kalau kepanjangan) */
    size: number;
    /** Multiplier line-height (1.0 = rapat, 1.5 = longgar) */
    lineHeightMul: number;
  };
  metaInfo: {
    /** Top px untuk teks "IGH Tour" (Invoice to) & tanggal */
    topPx: number;
  };
  pricing: {
    /** Y-offset (pdf-units) untuk teks dalam kotak orange.
     *  Negatif = naik (pdf-coord). Positif = turun. */
    yOffsetPdf: number;
  };
  checklist: {
    /** Baseline (top-px) row pertama */
    firstBaselinePx: number;
    /** Jarak antar baris (px) */
    rowSpacingPx: number;
    /** Font size item teks */
    size: number;
  };
  fonts: {
    /** Default family untuk semua section (kecuali yg di-override) */
    family: IghFontFamily;
    /** Override per section. Kalau null/undefined → pakai `family`. */
    overrides?: Partial<Record<IghSection, IghFontFamily>>;
  };
}

export const DEFAULT_IGH_LAYOUT: IghLayoutConfig = {
  projectName: { topPx: 257, size: 22, lineHeightMul: 1.45 },
  metaInfo: { topPx: 259 },
  pricing: { yOffsetPdf: -8 },
  checklist: { firstBaselinePx: 715, rowSpacingPx: 28, size: 10 },
  fonts: { family: "Poppins", overrides: {} },
};

const STORAGE_KEY = "igh:pdf-layout-config";

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
