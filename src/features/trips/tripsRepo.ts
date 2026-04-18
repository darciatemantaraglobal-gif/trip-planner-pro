export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  emoji: string;
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

const TRIPS_KEY = "travelhub.trips.v1";
const JAMAAH_KEY = "travelhub.jamaah.v1";
const DOCS_KEY = "travelhub.docs.v1";

const tick = <T,>(v: T, ms = 60): Promise<T> =>
  new Promise((r) => setTimeout(() => r(v), ms));

function load<T>(key: string, def: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : def;
  } catch {
    return def;
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

const seedTrips: Trip[] = [
  { id: "t1", name: "Umrah Ramadhan 2025", destination: "Mecca, Saudi Arabia", startDate: "2025-03-01", endDate: "2025-03-14", emoji: "🕌", createdAt: new Date().toISOString() },
  { id: "t2", name: "Bali Family Trip", destination: "Bali, Indonesia", startDate: "2025-06-10", endDate: "2025-06-15", emoji: "🌴", createdAt: new Date().toISOString() },
];

// ── TRIPS ─────────────────────────────────────────────────────────────────────

export async function listTrips(): Promise<Trip[]> {
  const stored = localStorage.getItem(TRIPS_KEY);
  if (!stored) {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(seedTrips));
    return tick([...seedTrips]);
  }
  return tick(JSON.parse(stored) as Trip[]);
}

export async function createTrip(draft: Omit<Trip, "id" | "createdAt">): Promise<Trip> {
  const trips = load<Trip>(TRIPS_KEY, seedTrips);
  const t: Trip = { ...draft, id: `t-${Date.now()}`, createdAt: new Date().toISOString() };
  save(TRIPS_KEY, [t, ...trips]);
  return tick(t);
}

export async function deleteTrip(id: string): Promise<void> {
  save(TRIPS_KEY, load<Trip>(TRIPS_KEY, []).filter((t) => t.id !== id));
  save(JAMAAH_KEY, load<Jamaah>(JAMAAH_KEY, []).filter((j) => j.tripId !== id));
  return tick(undefined);
}

// ── JAMAAH ────────────────────────────────────────────────────────────────────

export async function listJamaah(tripId: string): Promise<Jamaah[]> {
  return tick(load<Jamaah>(JAMAAH_KEY, []).filter((j) => j.tripId === tripId));
}

export async function createJamaah(draft: Omit<Jamaah, "id" | "createdAt">): Promise<Jamaah> {
  const all = load<Jamaah>(JAMAAH_KEY, []);
  const j: Jamaah = { ...draft, id: `j-${Date.now()}`, createdAt: new Date().toISOString() };
  save(JAMAAH_KEY, [...all, j]);
  return tick(j);
}

export async function updateJamaah(id: string, patch: Partial<Jamaah>): Promise<Jamaah> {
  const all = load<Jamaah>(JAMAAH_KEY, []);
  const idx = all.findIndex((j) => j.id === id);
  if (idx === -1) throw new Error("Jamaah not found");
  all[idx] = { ...all[idx], ...patch };
  save(JAMAAH_KEY, all);
  return tick(all[idx]);
}

export async function deleteJamaah(id: string): Promise<void> {
  save(JAMAAH_KEY, load<Jamaah>(JAMAAH_KEY, []).filter((j) => j.id !== id));
  save(DOCS_KEY, load<JamaahDoc>(DOCS_KEY, []).filter((d) => d.jamaahId !== id));
  return tick(undefined);
}

export async function getJamaah(id: string): Promise<Jamaah | null> {
  return tick(load<Jamaah>(JAMAAH_KEY, []).find((j) => j.id === id) ?? null);
}

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────

export async function listDocs(jamaahId: string): Promise<JamaahDoc[]> {
  return tick(load<JamaahDoc>(DOCS_KEY, []).filter((d) => d.jamaahId === jamaahId));
}

export async function addDoc(draft: Omit<JamaahDoc, "id" | "createdAt">): Promise<JamaahDoc> {
  const all = load<JamaahDoc>(DOCS_KEY, []);
  const d: JamaahDoc = { ...draft, id: `d-${Date.now()}`, createdAt: new Date().toISOString() };
  save(DOCS_KEY, [...all, d]);
  return tick(d);
}

export async function deleteDoc(id: string): Promise<void> {
  save(DOCS_KEY, load<JamaahDoc>(DOCS_KEY, []).filter((d) => d.id !== id));
  return tick(undefined);
}
