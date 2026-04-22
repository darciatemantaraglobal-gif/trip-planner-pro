import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PdfTemplate } from "./types";
import {
  pullPdfTemplates,
  pushPdfTemplate,
  deletePdfTemplateCloud,
  type PdfTemplateCloud,
} from "@/lib/cloudSync";
import { isSupabaseConfigured } from "@/lib/supabase";

interface TemplateStore {
  templates: PdfTemplate[];
  hydrated: boolean;
  addTemplate: (t: Omit<PdfTemplate, "id" | "createdAt">) => string;
  updateTemplate: (id: string, updates: Partial<Omit<PdfTemplate, "id" | "createdAt">>) => void;
  deleteTemplate: (id: string) => void;
  hydrateFromCloud: () => Promise<void>;
}

// Pisah field "envelope" (id, name, createdAt) dari sisanya supaya bisa
// disimpan ke kolom dedicated + jsonb payload di tabel pdf_templates.
function toCloud(t: PdfTemplate): PdfTemplateCloud {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, name, createdAt, ...rest } = t;
  return { id, name, createdAt, payload: rest as unknown as Record<string, unknown> };
}

function fromCloud(c: PdfTemplateCloud): PdfTemplate {
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    ...(c.payload as object),
  } as PdfTemplate;
}

// Helper: fire-and-forget push, log errors instead of throwing into setState.
function bgPush(t: PdfTemplate) {
  if (!isSupabaseConfigured()) return;
  void pushPdfTemplate(toCloud(t)).catch((err) => {
    console.error("[pdfTemplates] push failed:", err);
  });
}

function bgDelete(id: string) {
  if (!isSupabaseConfigured()) return;
  void deletePdfTemplateCloud(id).catch((err) => {
    console.error("[pdfTemplates] delete failed:", err);
  });
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],
      hydrated: false,

      addTemplate: (t) => {
        const id = `tmpl_${Date.now()}`;
        const created: PdfTemplate = { ...t, id, createdAt: Date.now() };
        set((s) => ({ templates: [...s.templates, created] }));
        bgPush(created);
        return id;
      },

      updateTemplate: (id, updates) => {
        let updated: PdfTemplate | null = null;
        set((s) => ({
          templates: s.templates.map((t) => {
            if (t.id !== id) return t;
            updated = { ...t, ...updates };
            return updated;
          }),
        }));
        if (updated) bgPush(updated);
      },

      deleteTemplate: (id) => {
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
        bgDelete(id);
      },

      hydrateFromCloud: async () => {
        if (!isSupabaseConfigured()) {
          set({ hydrated: true });
          return;
        }
        try {
          const cloud = await pullPdfTemplates();
          if (!cloud) {
            set({ hydrated: true });
            return;
          }
          const local = get().templates;
          // Merge by id: cloud is source of truth for existing IDs, then add
          // any local-only templates (e.g. dibikin offline) and push them up.
          const cloudMap = new Map(cloud.map((c) => [c.id, fromCloud(c)]));
          const localOnly = local.filter((l) => !cloudMap.has(l.id));
          const merged = [...cloudMap.values(), ...localOnly];
          set({ templates: merged, hydrated: true });
          // Push local-only ones to cloud (one-time backfill)
          for (const t of localOnly) bgPush(t);
        } catch (err) {
          console.error("[pdfTemplates] hydrate failed:", err);
          set({ hydrated: true });
        }
      },
    }),
    {
      name: "pdf-templates-v1",
      // Jangan persist `hydrated` flag — selalu mulai false tiap reload supaya
      // pull dari cloud jalan lagi.
      partialize: (s) => ({ templates: s.templates }),
    }
  )
);
