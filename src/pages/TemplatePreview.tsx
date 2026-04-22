import { useEffect, useState } from "react";
import { CanvasTemplateView } from "@/features/pdfTemplate/renderHtml";
import { PLACEHOLDER_CTX } from "@/features/pdfTemplate/dataBinding";
import { makeDefaultStarterTemplate } from "@/features/pdfTemplate/types";
import type { CanvasTemplate } from "@/features/pdfTemplate/types";

export default function TemplatePreview() {
  const [height, setHeight] = useState(680);

  useEffect(() => {
    function update() {
      setHeight(Math.max(520, window.innerHeight - 140));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const template: CanvasTemplate = {
    ...makeDefaultStarterTemplate(),
    id: "preview",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Preview Template PDF — {template.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Preview tanpa background. Pas lo upload latar di editor, semua card
            putih bakal nge-layer di atasnya biar teks tetep kebaca.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="rounded-lg bg-white shadow-2xl ring-1 ring-slate-200">
            <CanvasTemplateView
              template={template}
              ctx={PLACEHOLDER_CTX}
              fitWidth={Math.round(height * (595 / 842))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
