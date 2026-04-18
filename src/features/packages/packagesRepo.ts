/**
 * Package repository — mock implementation.
 *
 * This module is structured as if it were talking to a real database:
 * every function is async, returns plain data, and uses a stable shape
 * (`Package`). Swap the in-memory store for a real DB call later
 * (e.g. supabase.from("packages")) without touching the UI.
 */

export type PackageStatus = "Draft" | "Calculated" | "Confirmed" | "Paid" | "Completed";

export interface Package {
  id: string;
  name: string;
  destination: string;
  people: number;
  days: number;
  totalIDR: number;
  status: PackageStatus;
  emoji: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type PackageDraft = Omit<Package, "id" | "createdAt" | "updatedAt">;

const STORAGE_KEY = "travelhub.packages.v1";

const seed: Package[] = [
  { id: "p1", name: "Bali Paradise 5D", destination: "Bali, Indonesia", people: 4, days: 5, totalIDR: 48_500_000, status: "Confirmed", emoji: "🌴", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "p2", name: "Umrah Premium 12D", destination: "Mecca, Saudi Arabia", people: 2, days: 12, totalIDR: 92_000_000, status: "Paid", emoji: "🕌", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "p3", name: "Tokyo Discovery 7D", destination: "Tokyo, Japan", people: 3, days: 7, totalIDR: 64_200_000, status: "Calculated", emoji: "🗼", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "p4", name: "European Tour 10D", destination: "Paris, France", people: 6, days: 10, totalIDR: 156_000_000, status: "Draft", emoji: "🗼", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "p5", name: "Maldives Honeymoon", destination: "Malé, Maldives", people: 2, days: 6, totalIDR: 38_750_000, status: "Completed", emoji: "🏝️", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function loadStore(): Package[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return [...seed];
    }
    return JSON.parse(raw) as Package[];
  } catch {
    return [...seed];
  }
}

function saveStore(items: Package[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Simulate small network latency so the UI behaves realistically.
const tick = <T,>(value: T, ms = 150): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export async function listPackages(): Promise<Package[]> {
  return tick(loadStore());
}

export async function getPackage(id: string): Promise<Package | null> {
  return tick(loadStore().find((p) => p.id === id) ?? null);
}

export async function createPackage(draft: PackageDraft): Promise<Package> {
  const now = new Date().toISOString();
  const pkg: Package = {
    ...draft,
    id: `p-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  const next = [pkg, ...loadStore()];
  saveStore(next);
  return tick(pkg);
}

export async function updatePackage(id: string, patch: Partial<PackageDraft>): Promise<Package> {
  const items = loadStore();
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Package ${id} not found`);
  const updated: Package = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  saveStore(items);
  return tick(updated);
}

export async function deletePackage(id: string): Promise<void> {
  const next = loadStore().filter((p) => p.id !== id);
  saveStore(next);
  return tick(undefined);
}
