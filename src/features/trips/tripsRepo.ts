import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { uploadJamaahPhoto, uploadJamaahDoc, isDataUrl } from "@/lib/supabaseStorage";
import { requireAgencyId } from "@/store/authStore";

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  emoji: string;
  coverImage?: string;
  createdAt: string;
}

export interface Jamaah {
  id: string;
  tripId: string;
  name: string;
  phone: string;
  birthDate: string;
  passportNumber: string;
  gender: "L" | "P" | "";
  photoDataUrl?: string;
  needsReview?: boolean;
  createdAt: string;
}

export type DocCategory = "passport" | "visa" | "ticket" | "medical" | "other";

export interface JamaahDoc {
  id: string;
  jamaahId: string;
  category: DocCategory;
  label: string;
  fileName: string;
  fileType: "image" | "pdf";
  dataUrl: string;
  createdAt: string;
}

export const TRIPS_KEY = "travelhub.trips.v2";
export const JAMAAH_KEY = "travelhub.jamaah.v2";
export const DOCS_KEY = "travelhub.docs.v2";

function load<T>(key: string, def: T[]): T[] {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : def; }
  catch { return def; }
}
function save<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

// ── Mappers (snake_case ↔ camelCase) ────────────────────────────────────────

const tripFromRow = (r: Record<string, unknown>): Trip => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  destination: String(r.destination ?? ""),
  startDate: String(r.start_date ?? ""),
  endDate: String(r.end_date ?? ""),
  emoji: String(r.emoji ?? "✈️"),
  coverImage: (r.cover_image as string) ?? undefined,
  createdAt: String(r.created_at ?? new Date().toISOString()),
});
const tripToRow = (t: Trip, agencyId?: string) => ({
  id: t.id, name: t.name, destination: t.destination,
  start_date: t.startDate, end_date: t.endDate, emoji: t.emoji,
  cover_image: t.coverImage ?? null, created_at: t.createdAt,
  ...(agencyId ? { agency_id: agencyId } : {}),
});

const jamaahFromRow = (r: Record<string, unknown>): Jamaah => ({
  id: String(r.id),
  tripId: String(r.trip_id),
  name: String(r.name ?? ""),
  phone: String(r.phone ?? ""),
  birthDate: String(r.birth_date ?? ""),
  passportNumber: String(r.passport_number ?? ""),
  gender: ((r.gender as string) ?? "") as "L" | "P" | "",
  photoDataUrl: (r.photo_data_url as string) ?? undefined,
  needsReview: Boolean(r.needs_review),
  createdAt: String(r.created_at ?? new Date().toISOString()),
});
const jamaahToRow = (j: Jamaah, agencyId?: string) => ({
  id: j.id, trip_id: j.tripId, name: j.name, phone: j.phone,
  birth_date: j.birthDate, passport_number: j.passportNumber, gender: j.gender,
  photo_data_url: j.photoDataUrl ?? null,
  needs_review: !!j.needsReview,
  created_at: j.createdAt,
  ...(agencyId ? { agency_id: agencyId } : {}),
});

const docFromRow = (r: Record<string, unknown>): JamaahDoc => ({
  id: String(r.id),
  jamaahId: String(r.jamaah_id),
  category: (r.category as DocCategory) ?? "other",
  label: String(r.label ?? ""),
  fileName: String(r.file_name ?? ""),
  fileType: (r.file_type as "image" | "pdf") ?? "image",
  dataUrl: String(r.data_url ?? ""),
  createdAt: String(r.created_at ?? new Date().toISOString()),
});
const docToRow = (d: JamaahDoc, agencyId?: string) => ({
  id: d.id, jamaah_id: d.jamaahId, category: d.category, label: d.label,
  file_name: d.fileName, file_type: d.fileType, data_url: d.dataUrl,
  created_at: d.createdAt,
  ...(agencyId ? { agency_id: agencyId } : {}),
});

// ── TRIPS ───────────────────────────────────────────────────────────────────

export async function listTrips(): Promise<Trip[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from("trips").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const trips = (data ?? []).map(tripFromRow);
    save(TRIPS_KEY, trips);
    return trips;
  }
  return load<Trip>(TRIPS_KEY, []);
}

export async function createTrip(draft: Omit<Trip, "id" | "createdAt">): Promise<Trip> {
  const t: Trip = { ...draft, id: `t-${Date.now()}`, createdAt: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const agencyId = requireAgencyId();
    const { error } = await supabase!.from("trips").insert(tripToRow(t, agencyId));
    if (error) throw error;
  }
  save(TRIPS_KEY, [t, ...load<Trip>(TRIPS_KEY, [])]);
  return t;
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<Trip> {
  const trips = load<Trip>(TRIPS_KEY, []);
  const idx = trips.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Trip not found");
  const updated = { ...trips[idx], ...patch };
  trips[idx] = updated;
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from("trips").update(tripToRow(updated)).eq("id", id);
    if (error) throw error;
  }
  save(TRIPS_KEY, trips);
  return updated;
}

export async function deleteTrip(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from("trips").delete().eq("id", id);
    if (error) throw error;
  }
  save(TRIPS_KEY, load<Trip>(TRIPS_KEY, []).filter((t) => t.id !== id));
  save(JAMAAH_KEY, load<Jamaah>(JAMAAH_KEY, []).filter((j) => j.tripId !== id));
}

// ── JAMAAH ──────────────────────────────────────────────────────────────────

export async function listJamaah(tripId: string): Promise<Jamaah[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from("jamaah").select("*").eq("trip_id", tripId);
    if (error) throw error;
    const list = (data ?? []).map(jamaahFromRow);
    // Merge into local cache (keep other trips' jamaah)
    const others = load<Jamaah>(JAMAAH_KEY, []).filter((j) => j.tripId !== tripId);
    save(JAMAAH_KEY, [...others, ...list]);
    return list;
  }
  return load<Jamaah>(JAMAAH_KEY, []).filter((j) => j.tripId === tripId);
}

export async function createJamaah(draft: Omit<Jamaah, "id" | "createdAt">): Promise<Jamaah> {
  const id = `j-${Date.now()}`;
  let photoUrl = draft.photoDataUrl;
  if (isSupabaseConfigured() && isDataUrl(photoUrl)) {
    photoUrl = await uploadJamaahPhoto(id, draft.passportNumber, photoUrl as string);
  }
  const j: Jamaah = { ...draft, photoDataUrl: photoUrl, id, createdAt: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const agencyId = requireAgencyId();
    const { error } = await supabase!.from("jamaah").insert(jamaahToRow(j, agencyId));
    if (error) throw error;
  }
  save(JAMAAH_KEY, [...load<Jamaah>(JAMAAH_KEY, []), j]);
  return j;
}

export async function updateJamaah(id: string, patch: Partial<Jamaah>): Promise<Jamaah> {
  const all = load<Jamaah>(JAMAAH_KEY, []);
  const idx = all.findIndex((j) => j.id === id);
  if (idx === -1) throw new Error("Jamaah not found");
  const merged = { ...all[idx], ...patch };
  if (isSupabaseConfigured() && isDataUrl(merged.photoDataUrl)) {
    merged.photoDataUrl = await uploadJamaahPhoto(id, merged.passportNumber, merged.photoDataUrl!);
  }
  all[idx] = merged;
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from("jamaah").update(jamaahToRow(merged)).eq("id", id);
    if (error) throw error;
  }
  save(JAMAAH_KEY, all);
  return merged;
}

export async function deleteJamaah(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from("jamaah").delete().eq("id", id);
    if (error) throw error;
  }
  save(JAMAAH_KEY, load<Jamaah>(JAMAAH_KEY, []).filter((j) => j.id !== id));
  save(DOCS_KEY, load<JamaahDoc>(DOCS_KEY, []).filter((d) => d.jamaahId !== id));
}

export async function getJamaah(id: string): Promise<Jamaah | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from("jamaah").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? jamaahFromRow(data) : null;
  }
  return load<Jamaah>(JAMAAH_KEY, []).find((j) => j.id === id) ?? null;
}

// ── DOCUMENTS ───────────────────────────────────────────────────────────────

export async function listDocs(jamaahId: string): Promise<JamaahDoc[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from("jamaah_docs").select("*").eq("jamaah_id", jamaahId);
    if (error) throw error;
    const list = (data ?? []).map(docFromRow);
    const others = load<JamaahDoc>(DOCS_KEY, []).filter((d) => d.jamaahId !== jamaahId);
    save(DOCS_KEY, [...others, ...list]);
    return list;
  }
  return load<JamaahDoc>(DOCS_KEY, []).filter((d) => d.jamaahId === jamaahId);
}

export async function addDoc(draft: Omit<JamaahDoc, "id" | "createdAt">): Promise<JamaahDoc> {
  const id = `d-${Date.now()}`;
  let url = draft.dataUrl;
  if (isSupabaseConfigured() && isDataUrl(url)) {
    url = await uploadJamaahDoc(draft.jamaahId, draft.category, draft.fileName, url);
  }
  const d: JamaahDoc = { ...draft, dataUrl: url, id, createdAt: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const agencyId = requireAgencyId();
    const { error } = await supabase!.from("jamaah_docs").insert(docToRow(d, agencyId));
    if (error) throw error;
  }
  save(DOCS_KEY, [...load<JamaahDoc>(DOCS_KEY, []), d]);
  return d;
}

export async function deleteDoc(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from("jamaah_docs").delete().eq("id", id);
    if (error) throw error;
  }
  save(DOCS_KEY, load<JamaahDoc>(DOCS_KEY, []).filter((d) => d.id !== id));
}

// ── Bulk push helpers (used by migration) ───────────────────────────────────

export async function bulkUpsertTrips(trips: Trip[]) {
  if (!isSupabaseConfigured() || trips.length === 0) return;
  const agencyId = requireAgencyId();
  const { error } = await supabase!.from("trips").upsert(trips.map((t) => tripToRow(t, agencyId)));
  if (error) throw error;
}
export async function bulkUpsertJamaah(jamaah: Jamaah[]) {
  if (!isSupabaseConfigured() || jamaah.length === 0) return;
  const agencyId = requireAgencyId();
  // Upload base64 photos ke bucket dulu, ganti URL-nya
  const migrated: Jamaah[] = [];
  for (const j of jamaah) {
    if (isDataUrl(j.photoDataUrl)) {
      const url = await uploadJamaahPhoto(j.id, j.passportNumber, j.photoDataUrl!);
      migrated.push({ ...j, photoDataUrl: url });
    } else {
      migrated.push(j);
    }
  }
  const { error } = await supabase!.from("jamaah").upsert(migrated.map((j) => jamaahToRow(j, agencyId)));
  if (error) throw error;
  // Update local cache dengan URL baru
  const all = load<Jamaah>(JAMAAH_KEY, []);
  const next = all.map((existing) => migrated.find((m) => m.id === existing.id) ?? existing);
  save(JAMAAH_KEY, next);
}
export async function bulkUpsertDocs(docs: JamaahDoc[]) {
  if (!isSupabaseConfigured() || docs.length === 0) return;
  const agencyId = requireAgencyId();
  const migrated: JamaahDoc[] = [];
  for (const d of docs) {
    if (isDataUrl(d.dataUrl)) {
      const url = await uploadJamaahDoc(d.jamaahId, d.category, d.fileName, d.dataUrl);
      migrated.push({ ...d, dataUrl: url });
    } else {
      migrated.push(d);
    }
  }
  const { error } = await supabase!.from("jamaah_docs").upsert(migrated.map((d) => docToRow(d, agencyId)));
  if (error) throw error;
  const all = load<JamaahDoc>(DOCS_KEY, []);
  const next = all.map((existing) => migrated.find((m) => m.id === existing.id) ?? existing);
  save(DOCS_KEY, next);
}
