import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCopy, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_IGH_LAYOUT,
  saveIghLayoutConfig,
  type IghFontFamily,
  type IghLayoutConfig,
  type IghSection,
} from "@/lib/ighPdfConfig";

const FONT_OPTIONS: { value: IghFontFamily; label: string; hint: string }[] = [
  { value: "Poppins", label: "Poppins", hint: "Modern · Geometric" },
  { value: "Montserrat", label: "Montserrat", hint: "Classic · Elegant" },
  { value: "Sk-Modernist", label: "Sk-Modernist", hint: "Minimal · Clean" },
];

const SECTION_LABELS: { key: IghSection; label: string }[] = [
  { key: "projectName", label: "Project Name" },
  { key: "metaInfo", label: "Meta Info" },
  { key: "hotel", label: "Hotel" },
  { key: "pricing", label: "Pricing" },
  { key: "checklist", label: "Checklist" },
];

interface Props {
  config: IghLayoutConfig;
  onChange: (next: IghLayoutConfig) => void;
  onClose: () => void;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, unit, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit ?? ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}

export function PdfLayoutTuner({ config, onChange, onClose }: Props) {
  const [local, setLocal] = useState<IghLayoutConfig>(config);

  // Debounce upstream notify by 200ms biar slider drag ga lag.
  useEffect(() => {
    const t = window.setTimeout(() => {
      onChange(local);
      saveIghLayoutConfig(local);
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  function patch<K extends keyof IghLayoutConfig>(
    section: K,
    patch: Partial<IghLayoutConfig[K]>,
  ) {
    setLocal((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }

  async function handleCopy() {
    try {
      const json = JSON.stringify(local, null, 2);
      await navigator.clipboard.writeText(json);
      toast.success("Config tersalin ke clipboard");
    } catch {
      toast.error("Gagal copy ke clipboard");
    }
  }

  function handleReset() {
    setLocal(DEFAULT_IGH_LAYOUT);
    toast.message("Reset ke default");
  }

  return (
    <div className="w-72 shrink-0 border-l border-[hsl(var(--border))] bg-slate-50/80 backdrop-blur-sm flex flex-col">
      <div className="px-3 py-2 border-b border-[hsl(var(--border))] flex items-center justify-between bg-white">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-700">Layout Tuner</span>
          <span className="text-[9px] text-slate-400">Auto-save · live preview</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          title="Tutup tuner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* FONT FAMILY (global) */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Font Family (Global)
          </h4>
          <Select
            value={local.fonts.family}
            onValueChange={(v) =>
              setLocal((prev) => ({ ...prev, fonts: { ...prev.fonts, family: v as IghFontFamily } }))
            }
          >
            <SelectTrigger className="h-8 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-[11px]">
                  <span className="font-semibold">{opt.label}</span>
                  <span className="ml-1.5 text-[9px] text-slate-400">{opt.hint}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-slate-400 leading-snug">
            Default untuk semua section. Bisa override per-section di bawah.
          </p>
        </section>

        {/* PER-SECTION FONT OVERRIDES */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Override per Section
          </h4>
          <div className="space-y-1.5">
            {SECTION_LABELS.map(({ key, label }) => {
              const overridden = local.fonts.overrides?.[key];
              const value = overridden ?? "__default__";
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-20 shrink-0">{label}</span>
                  <Select
                    value={value}
                    onValueChange={(v) => {
                      setLocal((prev) => {
                        const ov = { ...(prev.fonts.overrides ?? {}) };
                        if (v === "__default__") delete ov[key];
                        else ov[key] = v as IghFontFamily;
                        return { ...prev, fonts: { ...prev.fonts, overrides: ov } };
                      });
                    }}
                  >
                    <SelectTrigger className="h-7 text-[10px] flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__" className="text-[10px] italic text-slate-500">
                        Pakai default
                      </SelectItem>
                      {FONT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </section>

        {/* PROJECT NAME */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Project Name
          </h4>
          <SliderRow
            label="Y Position"
            value={local.projectName.topPx}
            min={220}
            max={300}
            step={1}
            unit="px"
            onChange={(v) => patch("projectName", { topPx: v })}
          />
          <SliderRow
            label="Font Size"
            value={local.projectName.size}
            min={14}
            max={28}
            step={1}
            unit="pt"
            onChange={(v) => patch("projectName", { size: v })}
          />
          <SliderRow
            label="Line Height"
            value={local.projectName.lineHeightMul}
            min={1.0}
            max={2.0}
            step={0.05}
            unit="×"
            onChange={(v) => patch("projectName", { lineHeightMul: v })}
          />
        </section>

        {/* PRICING BOXES */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Pricing Boxes (Pax / Price)
          </h4>
          <SliderRow
            label="Y Offset (vertical center)"
            value={local.pricing.yOffsetPdf}
            min={-20}
            max={20}
            step={0.5}
            unit="pt"
            onChange={(v) => patch("pricing", { yOffsetPdf: v })}
          />
          <p className="text-[9px] text-slate-400 leading-snug">
            Negatif = naik, positif = turun. Geser untuk center vertical di kotak orange.
          </p>
        </section>

        {/* CHECKLIST */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Checklist (Sudah / Belum)
          </h4>
          <SliderRow
            label="Y baris pertama"
            value={local.checklist.firstBaselinePx}
            min={690}
            max={740}
            step={1}
            unit="px"
            onChange={(v) => patch("checklist", { firstBaselinePx: v })}
          />
          <SliderRow
            label="Row Spacing"
            value={local.checklist.rowSpacingPx}
            min={20}
            max={40}
            step={0.5}
            unit="px"
            onChange={(v) => patch("checklist", { rowSpacingPx: v })}
          />
          <SliderRow
            label="Font Size"
            value={local.checklist.size}
            min={7}
            max={14}
            step={0.5}
            unit="pt"
            onChange={(v) => patch("checklist", { size: v })}
          />
        </section>

        {/* META INFO */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Meta Info (Invoice / Date)
          </h4>
          <SliderRow
            label="Y Position"
            value={local.metaInfo.topPx}
            min={235}
            max={290}
            step={1}
            unit="px"
            onChange={(v) => patch("metaInfo", { topPx: v })}
          />
        </section>
      </div>

      <div className="p-2 border-t border-[hsl(var(--border))] bg-white flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 h-7 inline-flex items-center justify-center gap-1 rounded-md text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 h-7 inline-flex items-center justify-center gap-1 rounded-md text-[10px] font-bold text-white transition-colors"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
        >
          <ClipboardCopy className="h-3 w-3" />
          Copy Config
        </button>
      </div>
    </div>
  );
}
