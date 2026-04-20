import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PdfTemplate } from "./types";

interface TemplateStore {
  templates: PdfTemplate[];
  addTemplate: (t: Omit<PdfTemplate, "id" | "createdAt">) => string;
  updateTemplate: (id: string, updates: Partial<Omit<PdfTemplate, "id" | "createdAt">>) => void;
  deleteTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set) => ({
      templates: [],
      addTemplate: (t) => {
        const id = `tmpl_${Date.now()}`;
        set((s) => ({
          templates: [...s.templates, { ...t, id, createdAt: Date.now() }],
        }));
        return id;
      },
      updateTemplate: (id, updates) =>
        set((s) => ({
          templates: s.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
    }),
    { name: "pdf-templates-v1" }
  )
);
