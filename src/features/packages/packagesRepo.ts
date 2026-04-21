import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { requireAgencyId } from "@/store/authStore";

export type PackageStatus = "Draft" | "Calculated" | "Confirmed" | "Paid" | "Completed";
export type HotelLevel = "Bintang 3" | "Bintang 4" | "Bintang 5";

export interface Package {
  id: string;
  name: string;
  destination: string;
  people: number;
  days: number;
  hpp: number;
  totalIDR: number;
  status: PackageStatus;
  emoji: string;
  coverImage?: string;
  departureDate?: string;
  airline?: string;
  hotelLevel?: HotelLevel;
  notes?: string;
  facilities?: string[];
  createdAt: string;
  updatedAt: string;
}

export type PackageDraft = Omit<Package, "id" | "createdAt" | "updatedAt">;

export const PACKAGES_KEY = "travelhub.packages.v2";

function loadStore(): Package[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PACKAGES_KEY);
    return raw ? (JSON.parse(raw) as Package[]) : [];
  } catch { return []; }
}
function saveStore(items: Package[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(items));
}

const fromRow = (r: Record<string, unknown>): Package => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  destination: String(r.destination ?? ""),
  people: Number(r.people ?? 1),
  days: Number(r.days ?? 1),
  hpp: Number(r.hpp ?? 0),
  totalIDR: Number(r.total_idr ?? 0),
  status: (r.status as PackageStatus) ?? "Draft",
  emoji: String(r.emoji ?? "📦"),
  coverImage: (r.cover_image as string) ?? undefined,
  departureDate: (r.departure_date as string) ?? undefined,
  airline: (r.airline as string) ?? undefined,
  hotelLevel: (r.hotel_level as HotelLevel) ?? undefined,
  notes: (r.notes as string) ?? undefined,
  facilities: (r.facilities as string[]) ?? undefined,
  createdAt: String(r.created_at ?? new Date().toISOString()),
  updatedAt: String(r.updated_at ?? new Date().toISOString()),
});
const toRow = (p: Package, agencyId?: string) => ({
  id: p.id, name: p.name, destination: p.destination,
  people: p.people, days: p.days, hpp: p.hpp, total_idr: p.totalIDR,
  status: p.status, emoji: p.emoji, cover_image: p.coverImage ?? null,
  departure_date: p.departureDate ?? null, airline: p.airline ?? null,
  hotel_level: p.hotelLevel ?? null, notes: p.notes ?? null,
  facilities: p.facilities ?? null,
  created_at: p.createdAt, updated_at: p.updatedAt,
  ...(agencyId ? { agency_id: agencyId } : {}),
});

export async function listPackages(): Promise<Package[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from("packages").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const items = (data ?? []).map(fromRow);
    saveStore(items);
    return items;
  }
  return loadStore();
}

export async function getPackage(id: string): Promise<Package | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from("packages").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data) : null;
  }
  return loadStore().find((p) => p.id === id) ?? null;
}

export async function createPackage(draft: PackageDraft): Promise<Package> {
  const now = new Date().toISOString();
  const pkg: Package = { ...draft, id: `p-${Date.now()}`, createdAt: now, updatedAt: now };
  if (isSupabaseConfigured()) {
    const agencyId = requireAgencyId();
    const { error } = await supabase!.from("packages").insert(toRow(pkg, agencyId));
    if (error) throw error;
  }
  saveStore([pkg, ...loadStore()]);
  return pkg;
}

export async function updatePackage(id: string, patch: Partial<PackageDraft>): Promise<Package> {
  const items = loadStore();
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Package ${id} not found`);
  const updated: Package = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from("packages").update(toRow(updated)).eq("id", id);
    if (error) throw error;
  }
  saveStore(items);
  return updated;
}

export async function deletePackage(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from("packages").delete().eq("id", id);
    if (error) throw error;
  }
  saveStore(loadStore().filter((p) => p.id !== id));
}

export async function bulkUpsertPackages(items: Package[]) {
  if (!isSupabaseConfigured() || items.length === 0) return;
  const agencyId = requireAgencyId();
  const { error } = await supabase!.from("packages").upsert(items.map((p) => toRow(p, agencyId)));
  if (error) throw error;
}
