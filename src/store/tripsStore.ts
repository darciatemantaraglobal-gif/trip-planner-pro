import { create } from "zustand";
import {
  listTrips, createTrip, deleteTrip,
  listJamaah, createJamaah, updateJamaah, deleteJamaah, getJamaah,
  listDocs, addDoc, deleteDoc,
  type Trip, type Jamaah, type JamaahDoc, type DocCategory,
} from "@/features/trips/tripsRepo";

interface TripsState {
  trips: Trip[];
  loadingTrips: boolean;
  fetchTrips: () => Promise<void>;
  addTrip: (draft: Omit<Trip, "id" | "createdAt">) => Promise<Trip>;
  removeTrip: (id: string) => Promise<void>;
}

export const useTripsStore = create<TripsState>((set, get) => ({
  trips: [],
  loadingTrips: false,

  fetchTrips: async () => {
    set({ loadingTrips: true });
    const data = await listTrips();
    set({ trips: data, loadingTrips: false });
  },

  addTrip: async (draft) => {
    const t = await createTrip(draft);
    set((s) => ({ trips: [t, ...s.trips] }));
    return t;
  },

  removeTrip: async (id) => {
    await deleteTrip(id);
    set((s) => ({ trips: s.trips.filter((t) => t.id !== id) }));
  },
}));

interface JamaahState {
  jamaah: Jamaah[];
  loadingJamaah: boolean;
  fetchJamaah: (tripId: string) => Promise<void>;
  addJamaah: (draft: Omit<Jamaah, "id" | "createdAt">) => Promise<Jamaah>;
  patchJamaah: (id: string, patch: Partial<Jamaah>) => Promise<void>;
  removeJamaah: (id: string) => Promise<void>;
  getOne: (id: string) => Promise<Jamaah | null>;
}

export const useJamaahStore = create<JamaahState>((set) => ({
  jamaah: [],
  loadingJamaah: false,

  fetchJamaah: async (tripId) => {
    set({ loadingJamaah: true });
    const data = await listJamaah(tripId);
    set({ jamaah: data, loadingJamaah: false });
  },

  addJamaah: async (draft) => {
    const j = await createJamaah(draft);
    set((s) => ({ jamaah: [...s.jamaah, j] }));
    return j;
  },

  patchJamaah: async (id, patch) => {
    const updated = await updateJamaah(id, patch);
    set((s) => ({ jamaah: s.jamaah.map((j) => (j.id === id ? updated : j)) }));
  },

  removeJamaah: async (id) => {
    await deleteJamaah(id);
    set((s) => ({ jamaah: s.jamaah.filter((j) => j.id !== id) }));
  },

  getOne: getJamaah,
}));

interface DocsState {
  docs: JamaahDoc[];
  loadingDocs: boolean;
  fetchDocs: (jamaahId: string) => Promise<void>;
  addDocument: (draft: Omit<JamaahDoc, "id" | "createdAt">) => Promise<JamaahDoc>;
  removeDoc: (id: string) => Promise<void>;
}

export const useDocsStore = create<DocsState>((set) => ({
  docs: [],
  loadingDocs: false,

  fetchDocs: async (jamaahId) => {
    set({ loadingDocs: true });
    const data = await listDocs(jamaahId);
    set({ docs: data, loadingDocs: false });
  },

  addDocument: async (draft) => {
    const d = await addDoc(draft);
    set((s) => ({ docs: [...s.docs, d] }));
    return d;
  },

  removeDoc: async (id) => {
    await deleteDoc(id);
    set((s) => ({ docs: s.docs.filter((d) => d.id !== id) }));
  },
}));

export type { Trip, Jamaah, JamaahDoc, DocCategory };
