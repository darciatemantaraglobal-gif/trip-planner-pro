/**
 * Cloud sync helpers for data yang masih simpen di localStorage langsung
 * (notes + per-package calculations + pdf templates).
 *
 * Pola: localStorage tetep jadi cache instant-read, tapi setiap mutasi juga
 * di-push ke Supabase. Saat app start, `pullAll()` narik ulang dari cloud.
 */
import { supabase, isSupabaseConfigured } from "./supabase";

// ── PACKAGE CALCULATIONS ────────────────────────────────────────────────────

export interface PackageCalcRow {
  package_id: string;
  payload: unknown;
  updated_at?: string;
}

export async function pullPackageCalc(packageId: string): Promise<unknown | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase!
    .from("package_calculations").select("payload").eq("package_id", packageId).maybeSingle();
  if (error) return null;
  return data?.payload ?? null;
}

export async function pushPackageCalc(packageId: string, payload: unknown): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase!.from("package_calculations").upsert({
    package_id: packageId, payload, updated_at: new Date().toISOString(),
  });
}

export async function pullAllPackageCalcs(): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured()) return {};
  const { data, error } = await supabase!.from("package_calculations").select("package_id,payload");
  if (error) return {};
  const out: Record<string, unknown> = {};
  for (const row of data ?? []) out[(row as PackageCalcRow).package_id] = (row as PackageCalcRow).payload;
  return out;
}

// ── NOTES ───────────────────────────────────────────────────────────────────

export interface NoteCloud {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned?: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

const noteFromRow = (r: Record<string, unknown>): NoteCloud => ({
  id: String(r.id),
  title: String(r.title ?? ""),
  content: String(r.content ?? ""),
  color: String(r.color ?? "bg-white border-slate-200"),
  pinned: Boolean(r.pinned),
  tags: (r.tags as string[]) ?? [],
  createdAt: Number(r.created_at ?? Date.now()),
  updatedAt: Number(r.updated_at ?? Date.now()),
});
const noteToRow = (n: NoteCloud) => ({
  id: n.id, title: n.title, content: n.content, color: n.color,
  pinned: !!n.pinned, tags: n.tags ?? [],
  created_at: n.createdAt, updated_at: n.updatedAt,
});

export async function pullNotes(): Promise<NoteCloud[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase!.from("notes").select("*");
  if (error) return null;
  return (data ?? []).map(noteFromRow);
}

export async function pushNotes(notes: NoteCloud[]): Promise<void> {
  if (!isSupabaseConfigured() || notes.length === 0) return;
  await supabase!.from("notes").upsert(notes.map(noteToRow));
}

export async function deleteNoteCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase!.from("notes").delete().eq("id", id);
}

/** Sync seluruh notes set: hapus yg di cloud tapi gak ada lokal, upsert sisanya. */
export async function syncNotesFull(notes: NoteCloud[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const cloud = await pullNotes();
  if (!cloud) return;
  const localIds = new Set(notes.map((n) => n.id));
  const toDelete = cloud.filter((c) => !localIds.has(c.id)).map((c) => c.id);
  if (toDelete.length > 0) await supabase!.from("notes").delete().in("id", toDelete);
  if (notes.length > 0) await pushNotes(notes);
}
