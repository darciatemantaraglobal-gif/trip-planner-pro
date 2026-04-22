import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasTemplate } from "./types";
import { makeDefaultStarterTemplate } from "./types";
import {
  pullPdfTemplates,
  pushPdfTemplate,
  deletePdfTemplateCloud,
  type PdfTemplateCloud,
} from "@/lib/cloudSync";
import { isSupabaseConfigured } from "@/lib/supabase";

interface TemplateStore {
  templates: CanvasTemplate[];
  activeTemplateId: string | null;
  hydrated: boolean;
  addTemplate: (t: Omit<CanvasTemplate, "id" | "createdAt" | "updatedAt">) => string;
  updateTemplate: (id: string, updates: Partial<Omit<CanvasTemplate, "id" | "createdAt">>) => void;
  duplicateTemplate: (id: string) => string | null;
  deleteTemplate: (id: string) => void;
  setActiveTemplateId: (id: string | null) => void;
  hydrateFromCloud: () => Promise<void>;
  ensureDefaultTemplate: () => void;
}

function toCloud(t: CanvasTemplate): PdfTemplateCloud {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, name, createdAt, ...rest } = t;
  return { id, name, createdAt, payload: rest as unknown as Record<string, unknown> };
}

function fromCloud(c: PdfTemplateCloud): CanvasTemplate | null {
  const payload = c.payload as Partial<CanvasTemplate>;
  // Skip records that look like the old field-based schema (no `elements` array).
  if (!payload || !Array.isArray(payload.elements)) return null;
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    updatedAt: payload.updatedAt ?? c.createdAt,
    pageSize: payload.pageSize ?? "a4",
    orientation: payload.orientation ?? "portrait",
    backgroundColor: payload.backgroundColor ?? "#ffffff",
    backgroundImage: payload.backgroundImage,
    elements: payload.elements,
  };
}

function bgPush(t: CanvasTemplate) {
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
      activeTemplateId: null,
      hydrated: false,

      addTemplate: (t) => {
        const id = `tmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const now = Date.now();
        const created: CanvasTemplate = { ...t, id, createdAt: now, updatedAt: now };
        set((s) => ({
          templates: [...s.templates, created],
          activeTemplateId: s.activeTemplateId ?? id,
        }));
        bgPush(created);
        return id;
      },

      updateTemplate: (id, updates) => {
        let updated: CanvasTemplate | null = null;
        set((s) => ({
          templates: s.templates.map((t) => {
            if (t.id !== id) return t;
            updated = { ...t, ...updates, updatedAt: Date.now() };
            return updated;
          }),
        }));
        if (updated) bgPush(updated);
      },

      duplicateTemplate: (id) => {
        const src = get().templates.find((t) => t.id === id);
        if (!src) return null;
        const newId = `tmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const now = Date.now();
        const dup: CanvasTemplate = {
          ...src,
          id: newId,
          name: `${src.name} (copy)`,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ templates: [...s.templates, dup] }));
        bgPush(dup);
        return newId;
      },

      deleteTemplate: (id) => {
        set((s) => ({
          templates: s.templates.filter((t) => t.id !== id),
          activeTemplateId: s.activeTemplateId === id ? null : s.activeTemplateId,
        }));
        bgDelete(id);
      },

      setActiveTemplateId: (id) => set({ activeTemplateId: id }),

      ensureDefaultTemplate: () => {
        const { templates, addTemplate } = get();
        if (templates.length === 0) {
          addTemplate(makeDefaultStarterTemplate());
        }
      },

      hydrateFromCloud: async () => {
        if (!isSupabaseConfigured()) {
          set({ hydrated: true });
          get().ensureDefaultTemplate();
          return;
        }
        try {
          const cloud = await pullPdfTemplates();
          if (!cloud) {
            set({ hydrated: true });
            get().ensureDefaultTemplate();
            return;
          }
          const local = get().templates;
          const cloudMap = new Map<string, CanvasTemplate>();
          for (const c of cloud) {
            const t = fromCloud(c);
            if (t) cloudMap.set(t.id, t);
          }
          const localOnly = local.filter((l) => !cloudMap.has(l.id));
          const merged = [...cloudMap.values(), ...localOnly];
          set({
            templates: merged,
            hydrated: true,
            activeTemplateId:
              get().activeTemplateId && merged.find((m) => m.id === get().activeTemplateId)
                ? get().activeTemplateId
                : merged[0]?.id ?? null,
          });
          for (const t of localOnly) bgPush(t);
          get().ensureDefaultTemplate();
        } catch (err) {
          console.error("[pdfTemplates] hydrate failed:", err);
          set({ hydrated: true });
          get().ensureDefaultTemplate();
        }
      },
    }),
    {
      // New persist key — drops the old field-based templates entirely.
      name: "pdf-canvas-templates-v1",
      partialize: (s) => ({
        templates: s.templates,
        activeTemplateId: s.activeTemplateId,
      }),
    }
  )
);
