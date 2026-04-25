/**
 * Shared storage helpers untuk per-package calculation rows (hotels,
 * transports, visas, dst). Pola write-through:
 *   - localStorage = cache instan (sync read, gak perlu round-trip ke cloud)
 *   - cloud (Supabase `package_calculations` table) = source of truth lintas-device
 *
 * Dipake bareng oleh:
 *   - `Calculator.tsx`        → write saat user "Create Paket Trip" (createPackage flow)
 *   - `PackageDetail.tsx`     → read saat halaman rincian paket di-load,
 *                               write saat user edit rows langsung di sana
 *
 * Tujuan: data baris kalkulator yg user input di Kalkulator otomatis kebawa
 * ke /packages/[id] tanpa input ulang, dan tetap muncul instan saat refresh
 * (dari localStorage) sambil background-sync dari cloud.
 */
import { pushPackageCalc } from "./cloudSync";

/** localStorage key — versioned biar kalau struktur breaking change bisa
 *  bump versi tanpa nge-corrupt cache lama. Dipertahankan dari implementasi
 *  awal di PackageDetail.tsx supaya cache user existing tetap kebaca. */
export const PACKAGE_CALC_STORAGE_KEY = "travelhub.package.calculations.v1";

/** Baca seluruh map `{ [packageId]: payload }` dari localStorage.
 *  Return {} kalau parse error atau format invalid (object check). */
export function readPackageCalcStore(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PACKAGE_CALC_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn(
        "[packageCalc] localStorage payload bukan object — di-reset:",
        parsed,
      );
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    console.warn("[packageCalc] gagal parse localStorage:", err);
    return {};
  }
}

/** Baca payload mentah utk satu packageId. Return `null` kalau belum ada
 *  entry — caller bertanggung jawab utk validasi shape & merge dgn default. */
export function loadPackageCalcRaw(packageId: string): unknown | null {
  const stored = readPackageCalcStore()[packageId];
  return stored === undefined ? null : stored;
}

/** Write hanya ke localStorage (no cloud push). Dipakai internal & utk
 *  bulk operations yg gak perlu langsung sync. */
export function savePackageCalcLocal(packageId: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const all = readPackageCalcStore();
    all[packageId] = value;
    localStorage.setItem(PACKAGE_CALC_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn("[packageCalc] gagal save ke localStorage:", err);
  }
}

/** Write-through: localStorage (instan) + cloud push (best-effort,
 *  fire-and-forget). Cloud failure di-log tapi gak nge-throw — UX tetap
 *  smooth, data udah aman di cache lokal. */
export function savePackageCalc(packageId: string, value: unknown): void {
  savePackageCalcLocal(packageId, value);
  void pushPackageCalc(packageId, value).catch((err) => {
    console.warn(
      `[packageCalc] cloud push gagal utk packageId=${packageId}:`,
      err,
    );
  });
}
