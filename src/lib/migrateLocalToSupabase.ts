/**
 * One-shot migrasi data localStorage → Supabase.
 * Dijalankan otomatis setelah login pertama kali ketika Supabase aktif.
 * Pakai flag di localStorage biar gak repeat.
 */
import { isSupabaseConfigured } from "./supabase";
import {
  TRIPS_KEY, JAMAAH_KEY, DOCS_KEY,
  bulkUpsertTrips, bulkUpsertJamaah, bulkUpsertDocs,
  type Trip, type Jamaah, type JamaahDoc,
} from "@/features/trips/tripsRepo";
import { PACKAGES_KEY, bulkUpsertPackages, type Package } from "@/features/packages/packagesRepo";
import { pushPackageCalc, syncNotesFull, type NoteCloud } from "./cloudSync";

const MIGRATED_FLAG = "travelhub.supabase.migrated.v1";
const NOTES_KEY = "travelhub.notes.v2";
const PKG_CALC_KEY = "travelhub.package.calculations.v1";

function readJSON<T>(key: string, def: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : def; }
  catch { return def; }
}

export interface MigrationResult {
  ok: boolean;
  skipped?: string;
  counts?: Record<string, number>;
  error?: string;
}

export async function migrateLocalToSupabase(force = false): Promise<MigrationResult> {
  if (!isSupabaseConfigured()) return { ok: false, skipped: "supabase-not-configured" };
  if (!force && localStorage.getItem(MIGRATED_FLAG)) return { ok: true, skipped: "already-migrated" };

  const trips    = readJSON<Trip[]>(TRIPS_KEY, []);
  const jamaah   = readJSON<Jamaah[]>(JAMAAH_KEY, []);
  const docs     = readJSON<JamaahDoc[]>(DOCS_KEY, []);
  const packages = readJSON<Package[]>(PACKAGES_KEY, []);
  const notes    = readJSON<NoteCloud[]>(NOTES_KEY, []);
  const calcs    = readJSON<Record<string, unknown>>(PKG_CALC_KEY, {});

  try {
    // Order matters: parents before children.
    await bulkUpsertTrips(trips);
    await bulkUpsertPackages(packages);
    await bulkUpsertJamaah(jamaah);
    await bulkUpsertDocs(docs);

    // Notes: full sync (push only, gak hapus cloud existing)
    if (notes.length > 0) await syncNotesFull(notes);

    // Package calculations
    for (const [pkgId, payload] of Object.entries(calcs)) {
      await pushPackageCalc(pkgId, payload);
    }

    localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
    return {
      ok: true,
      counts: {
        trips: trips.length, jamaah: jamaah.length, docs: docs.length,
        packages: packages.length, notes: notes.length, calcs: Object.keys(calcs).length,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function clearMigrationFlag() {
  localStorage.removeItem(MIGRATED_FLAG);
}
