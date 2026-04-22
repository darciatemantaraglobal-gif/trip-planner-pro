/**
 * Cloud sync helpers for data yang masih simpen di localStorage langsung
 * (notes + per-package calculations + pdf templates).
 *
 * Pola: localStorage tetep jadi cache instant-read, tapi setiap mutasi juga
 * di-push ke Supabase. Saat app start, `pullAll()` narik ulang dari cloud.
 */
import { supabase, isSupabaseConfigured } from "./supabase";
import { requireAgencyId } from "@/store/authStore";

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
  const agencyId = requireAgencyId();
  await supabase!.from("package_calculations").upsert({
    package_id: packageId, agency_id: agencyId, payload, updated_at: new Date().toISOString(),
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
const noteToRow = (n: NoteCloud, agencyId?: string) => ({
  id: n.id, title: n.title, content: n.content, color: n.color,
  pinned: !!n.pinned, tags: n.tags ?? [],
  created_at: n.createdAt, updated_at: n.updatedAt,
  ...(agencyId ? { agency_id: agencyId } : {}),
});

export async function pullNotes(): Promise<NoteCloud[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase!.from("notes").select("*");
  if (error) return null;
  return (data ?? []).map(noteFromRow);
}

export async function pushNotes(notes: NoteCloud[]): Promise<void> {
  if (!isSupabaseConfigured() || notes.length === 0) return;
  const agencyId = requireAgencyId();
  await supabase!.from("notes").upsert(notes.map((n) => noteToRow(n, agencyId)));
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

// ── PDF TEMPLATES ───────────────────────────────────────────────────────────
// Tabel `pdf_templates` schema: id text, agency_id uuid, name text,
// payload jsonb, created_at timestamptz. Seluruh field PdfTemplate kecuali
// id/name/createdAt disimpan di kolom `payload`.

export interface PdfTemplateCloud {
  id: string;
  name: string;
  createdAt: number;
  // Sisanya (orientation, backgroundImage, fields, dst.) disimpan di payload.
  // Pakai unknown supaya helper ini netral terhadap shape PdfTemplate.
  payload: Record<string, unknown>;
}

const tmplFromRow = (r: Record<string, unknown>): PdfTemplateCloud => {
  const payload = (r.payload as Record<string, unknown>) ?? {};
  // created_at dari Postgres = ISO timestamptz; konversi ke ms epoch.
  const createdRaw = r.created_at;
  const createdAt =
    typeof createdRaw === "string"
      ? new Date(createdRaw).getTime()
      : Number(createdRaw ?? Date.now());
  return {
    id: String(r.id),
    name: String(r.name ?? payload.name ?? ""),
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    payload,
  };
};

const tmplToRow = (t: PdfTemplateCloud, agencyId?: string) => ({
  id: t.id,
  name: t.name,
  payload: t.payload,
  created_at: new Date(t.createdAt).toISOString(),
  ...(agencyId ? { agency_id: agencyId } : {}),
});

export async function pullPdfTemplates(): Promise<PdfTemplateCloud[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase!
    .from("pdf_templates")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return null;
  return (data ?? []).map(tmplFromRow);
}

export async function pushPdfTemplate(t: PdfTemplateCloud): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const agencyId = requireAgencyId();
  const { error } = await supabase!
    .from("pdf_templates")
    .upsert(tmplToRow(t, agencyId));
  if (error) throw error;
}

export async function deletePdfTemplateCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase!.from("pdf_templates").delete().eq("id", id);
}

/** Full reconcile: hapus yg di cloud tapi gak ada lokal, upsert sisanya. */
export async function syncPdfTemplatesFull(templates: PdfTemplateCloud[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const cloud = await pullPdfTemplates();
  if (!cloud) return;
  const localIds = new Set(templates.map((t) => t.id));
  const toDelete = cloud.filter((c) => !localIds.has(c.id)).map((c) => c.id);
  if (toDelete.length > 0) {
    await supabase!.from("pdf_templates").delete().in("id", toDelete);
  }
  if (templates.length > 0) {
    const agencyId = requireAgencyId();
    await supabase!
      .from("pdf_templates")
      .upsert(templates.map((t) => tmplToRow(t, agencyId)));
  }
}
