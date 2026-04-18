import { useCallback, useEffect, useState } from "react";
import {
  createPackage,
  deletePackage,
  listPackages,
  updatePackage,
  type Package,
  type PackageDraft,
} from "./packagesRepo";

/**
 * Thin React hook over the packages repository.
 * Mirrors the shape you'd use with a real backend (TanStack Query etc.).
 */
export function usePackages() {
  const [items, setItems] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPackages();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (draft: PackageDraft) => {
    const created = await createPackage(draft);
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<PackageDraft>) => {
    const updated = await updatePackage(id, patch);
    setItems((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deletePackage(id);
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { items, loading, error, refresh, create, update, remove };
}
