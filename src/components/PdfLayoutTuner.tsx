import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bookmark, ClipboardCopy, Pencil, RotateCcw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  BUILTIN_PRESET,
  DEFAULT_IGH_LAYOUT,
  loadPresetsCache,
  saveIghLayoutConfig,
  withBuiltins,
  type IghFontFamily,
  type IghLayoutConfig,
  type IghLayoutPreset,
  type IghSection,
} from "@/lib/ighPdfConfig";
import {
  deletePdfLayoutPreset,
  pullPdfLayoutPresets,
  upsertPdfLayoutPreset,
} from "@/lib/cloudSync";
import { onPdfPresetsChanged } from "@/lib/supabaseRealtime";

const FONT_OPTIONS: { value: IghFontFamily; label: string; hint: string }[] = [
  { value: "Poppins", label: "Poppins", hint: "Modern · Geometric" },
  { value: "Montserrat", label: "Montserrat", hint: "Classic · Elegant" },
  { value: "Sk-Modernist", label: "Sk-Modernist", hint: "Minimal · Clean" },
];

const SECTION_LABELS: { key: IghSection; label: string }[] = [
  { key: "projectName", label: "Project Name" },
  { key: "metaInfo", label: "Meta Info" },
  { key: "hotel", label: "Hotel" },
  { key: "pricing", label: "Pricing (Private)" },
  { key: "groupPricing", label: "Pricing (Group)" },
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

interface TextRowProps {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (v: string) => void;
}

function TextRow({ label, value, placeholder, multiline, onChange }: TextRowProps) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium text-slate-700">{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full text-[10px] font-mono rounded-md border border-slate-200 bg-white px-2 py-1.5 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-300 resize-y"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-7 text-[10px] font-mono"
        />
      )}
    </div>
  );
}

export function PdfLayoutTuner({ config, onChange, onClose }: Props) {
  const [local, setLocal] = useState<IghLayoutConfig>(config);
  const [cloudPresets, setCloudPresets] = useState<IghLayoutPreset[]>(() => loadPresetsCache());
  const [activePresetId, setActivePresetId] = useState<string | "">("");
  const [presetName, setPresetName] = useState("");
  const [presetBusy, setPresetBusy] = useState(false);

  // List yang ditampilkan: built-in selalu di atas, lalu cloud.
  const visiblePresets = withBuiltins(cloudPresets);
  const activePreset = visiblePresets.find((p) => p.id === activePresetId);
  const isBuiltinActive = !!activePreset?.builtin;

  // Debounce upstream notify by 350ms biar slider drag/typing ga lag.
  useEffect(() => {
    const t = window.setTimeout(() => {
      onChange(local);
      saveIghLayoutConfig(local);
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  // Initial pull dari cloud + subscribe realtime → kalau device lain mutasi,
  // list di sini auto refresh.
  useEffect(() => {
    let cancelled = false;
    void pullPdfLayoutPresets().then((list) => {
      if (!cancelled) setCloudPresets(list);
    });
    const off = onPdfPresetsChanged(() => {
      void pullPdfLayoutPresets().then((list) => {
        if (!cancelled) setCloudPresets(list);
      });
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  function handleApplyPreset(id: string) {
    setActivePresetId(id);
    if (!id) return;
    const p = visiblePresets.find((x) => x.id === id);
    if (!p) return;
    setLocal(p.config);
    setPresetName(p.builtin ? "" : p.name);
    toast.success(`Preset "${p.name}" diterapkan`);
  }

  async function handleSaveAsNew() {
    const name = presetName.trim();
    if (!name) {
      toast.error("Kasih nama preset dulu");
      return;
    }
    setPresetBusy(true);
    try {
      const now = Date.now();
      const created = await upsertPdfLayoutPreset({
        id: `preset_${now}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        config: local,
        createdAt: now,
        updatedAt: now,
      });
      const list = await pullPdfLayoutPresets();
      setCloudPresets(list);
      setActivePresetId(created.id);
      toast.success(`Preset "${created.name}" disimpan ke cloud`);
    } catch (e) {
      toast.error(`Gagal simpan preset: ${(e as Error).message}`);
    } finally {
      setPresetBusy(false);
    }
  }

  async function handleUpdateActive() {
    if (!activePresetId) {
      toast.error("Pilih preset dulu, atau pakai Save as New");
      return;
    }
    if (isBuiltinActive) {
      toast.error("Preset bawaan tidak bisa diubah");
      return;
    }
    const existing = cloudPresets.find((p) => p.id === activePresetId);
    if (!existing) {
      toast.error("Preset tidak ditemukan");
      return;
    }
    setPresetBusy(true);
    try {
      const updated = await upsertPdfLayoutPreset({
        ...existing,
        name: presetName.trim() || existing.name,
        config: local,
        updatedAt: Date.now(),
      });
      const list = await pullPdfLayoutPresets();
      setCloudPresets(list);
      toast.success(`Preset "${updated.name}" diperbarui`);
    } catch (e) {
      toast.error(`Gagal update preset: ${(e as Error).message}`);
    } finally {
      setPresetBusy(false);
    }
  }

  async function handleDeleteActive() {
    if (!activePresetId) return;
    if (isBuiltinActive) {
      toast.error("Preset bawaan tidak bisa dihapus");
      return;
    }
    const p = cloudPresets.find((x) => x.id === activePresetId);
    setPresetBusy(true);
    try {
      await deletePdfLayoutPreset(activePresetId);
      const list = await pullPdfLayoutPresets();
      setCloudPresets(list);
      setActivePresetId("");
      setPresetName("");
      toast.success(`Preset "${p?.name ?? ""}" dihapus`);
    } catch (e) {
      toast.error(`Gagal hapus preset: ${(e as Error).message}`);
    } finally {
      setPresetBusy(false);
    }
  }

  function patch<K extends keyof IghLayoutConfig>(
    section: K,
    p: Partial<IghLayoutConfig[K]>,
  ) {
    setLocal((prev) => ({ ...prev, [section]: { ...prev[section], ...p } }));
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
        {/* PRESETS */}
        <section className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/50 p-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-orange-700 flex items-center gap-1">
            <Bookmark className="h-3 w-3" />
            Presets
          </h4>
          <Select
            value={activePresetId || "__none__"}
            onValueChange={(v) => handleApplyPreset(v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Pilih preset…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-[10px] italic text-slate-500">
                — tidak ada —
              </SelectItem>
              {visiblePresets.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-[10px]">
                  {p.builtin ? `★ ${p.name}` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Nama preset baru…"
            className="h-7 text-[10px]"
          />
          <div className="flex gap-1">
            <button
              onClick={handleSaveAsNew}
              disabled={presetBusy}
              title="Save as new preset (cloud-synced)"
              className="flex-1 h-7 inline-flex items-center justify-center gap-1 rounded-md text-[10px] font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-3 w-3" />
              Save as New
            </button>
            <button
              onClick={handleUpdateActive}
              disabled={!activePresetId || isBuiltinActive || presetBusy}
              title={isBuiltinActive ? "Preset bawaan tidak bisa diubah" : "Update preset aktif"}
              className="flex-1 h-7 inline-flex items-center justify-center gap-1 rounded-md text-[10px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Update
            </button>
            <button
              onClick={handleDeleteActive}
              disabled={!activePresetId || isBuiltinActive || presetBusy}
              title={isBuiltinActive ? "Preset bawaan tidak bisa dihapus" : "Hapus preset aktif"}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-500 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <p className="text-[9px] text-slate-500 leading-snug">
            ★ <span className="font-semibold">{BUILTIN_PRESET.name}</span> selalu ada sebagai
            safety-net. Preset lain tersimpan di cloud per-agency dan auto-sync antar device.
          </p>
        </section>

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
          <TextRow
            label="Edit Teks (override)"
            value={local.projectName.text ?? ""}
            placeholder="Kosong = pakai data kalkulator"
            onChange={(v) => patch("projectName", { text: v })}
          />
          <SliderRow
            label="X Position"
            value={local.projectName.xPx}
            min={20} max={300} step={1} unit="px"
            onChange={(v) => patch("projectName", { xPx: v })}
          />
          <SliderRow
            label="Y Position"
            value={local.projectName.topPx}
            min={220} max={300} step={1} unit="px"
            onChange={(v) => patch("projectName", { topPx: v })}
          />
          <SliderRow
            label="Font Size"
            value={local.projectName.size}
            min={14} max={28} step={1} unit="pt"
            onChange={(v) => patch("projectName", { size: v })}
          />
          <SliderRow
            label="Line Gap (jarak antar baris)"
            value={local.projectName.lineGapPx}
            min={-4} max={20} step={0.5} unit="px"
            onChange={(v) => patch("projectName", { lineGapPx: v })}
          />
        </section>

        {/* META INFO */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Meta Info (Invoice / Date)
          </h4>
          <TextRow
            label="Invoice to (override)"
            value={local.metaInfo.customerText ?? ""}
            placeholder="Kosong = pakai nama customer"
            onChange={(v) => patch("metaInfo", { customerText: v })}
          />
          <TextRow
            label="Date (override)"
            value={local.metaInfo.dateText ?? ""}
            placeholder="Kosong = pakai tanggal"
            onChange={(v) => patch("metaInfo", { dateText: v })}
          />
          <SliderRow
            label="X Invoice"
            value={local.metaInfo.customerXPx}
            min={280} max={520} step={1} unit="px"
            onChange={(v) => patch("metaInfo", { customerXPx: v })}
          />
          <SliderRow
            label="X Date"
            value={local.metaInfo.dateXPx}
            min={460} max={700} step={1} unit="px"
            onChange={(v) => patch("metaInfo", { dateXPx: v })}
          />
          <SliderRow
            label="Y Position"
            value={local.metaInfo.topPx}
            min={235} max={290} step={1} unit="px"
            onChange={(v) => patch("metaInfo", { topPx: v })}
          />
          <SliderRow
            label="Font Size"
            value={local.metaInfo.size}
            min={9} max={18} step={0.5} unit="pt"
            onChange={(v) => patch("metaInfo", { size: v })}
          />
        </section>

        {/* HOTEL */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Hotel (Makkah / Madinah)
          </h4>
          <TextRow
            label="Hotel Makkah (override)"
            value={local.hotel.makkahText ?? ""}
            placeholder="Kosong = pakai data"
            onChange={(v) => patch("hotel", { makkahText: v })}
          />
          <TextRow
            label="Hotel Madinah (override)"
            value={local.hotel.madinahText ?? ""}
            placeholder="Kosong = pakai data"
            onChange={(v) => patch("hotel", { madinahText: v })}
          />
          <SliderRow
            label="X Makkah"
            value={local.hotel.makkahXPx}
            min={20} max={200} step={1} unit="px"
            onChange={(v) => patch("hotel", { makkahXPx: v })}
          />
          <SliderRow
            label="X Madinah"
            value={local.hotel.madinahXPx}
            min={350} max={560} step={1} unit="px"
            onChange={(v) => patch("hotel", { madinahXPx: v })}
          />
          <SliderRow
            label="Y Position"
            value={local.hotel.topPx}
            min={360} max={440} step={1} unit="px"
            onChange={(v) => patch("hotel", { topPx: v })}
          />
          <SliderRow
            label="Font Size"
            value={local.hotel.size}
            min={14} max={28} step={0.5} unit="pt"
            onChange={(v) => patch("hotel", { size: v })}
          />
        </section>

        {/* PRICING */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Pricing Boxes (Pax / Price)
          </h4>
          <TextRow
            label="Pax (override)"
            value={local.pricing.paxText ?? ""}
            placeholder="Kosong = pakai jumlah pax"
            onChange={(v) => patch("pricing", { paxText: v })}
          />
          <TextRow
            label="Harga (override)"
            value={local.pricing.priceText ?? ""}
            placeholder='Kosong = pakai "Rp. 0"'
            onChange={(v) => patch("pricing", { priceText: v })}
          />
          <SliderRow
            label="X Pax Box"
            value={local.pricing.paxXPx}
            min={20} max={200} step={1} unit="px"
            onChange={(v) => patch("pricing", { paxXPx: v })}
          />
          <SliderRow
            label="X Price Box"
            value={local.pricing.priceXPx}
            min={200} max={400} step={1} unit="px"
            onChange={(v) => patch("pricing", { priceXPx: v })}
          />
          <SliderRow
            label="Y Position"
            value={local.pricing.topPx}
            min={480} max={560} step={1} unit="px"
            onChange={(v) => patch("pricing", { topPx: v })}
          />
          <SliderRow
            label="Font Size (Harga)"
            value={local.pricing.size}
            min={14} max={32} step={0.5} unit="pt"
            onChange={(v) => patch("pricing", { size: v })}
          />
          <SliderRow
            label="Vertical Center Offset"
            value={local.pricing.yOffsetPdf}
            min={-20} max={20} step={0.5} unit="pt"
            onChange={(v) => patch("pricing", { yOffsetPdf: v })}
          />
          <p className="text-[9px] text-slate-400 leading-snug">
            Negatif = naik, positif = turun. Tuning visual center kotak orange.
          </p>
        </section>

        {/* GROUP PRICING TABLE */}
        <section className="space-y-2 rounded-lg border border-orange-100 bg-orange-50/30 p-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
            Pricing Table — Group
          </h4>
          <p className="text-[9px] text-slate-500 leading-snug">
            Khusus template <span className="font-semibold">IGH Blank Template Group</span> —
            tabel 4 kolom (Pax · Quad · Triple · Double). Aktif kalau PDF di-generate
            dari Kalkulator Grup.
          </p>
          <SliderRow
            label="Y Position (baris pertama)"
            value={local.groupPricing.topPx}
            min={420} max={620} step={1} unit="px"
            onChange={(v) => patch("groupPricing", { topPx: v })}
          />
          <SliderRow
            label="Row Spacing (antar baris)"
            value={local.groupPricing.rowSpacingPx}
            min={14} max={48} step={1} unit="px"
            onChange={(v) => patch("groupPricing", { rowSpacingPx: v })}
          />
          <SliderRow
            label="X Center · Total Pax"
            value={local.groupPricing.paxCenterXPx}
            min={20} max={250} step={1} unit="px"
            onChange={(v) => patch("groupPricing", { paxCenterXPx: v })}
          />
          <SliderRow
            label="X Center · Quad"
            value={local.groupPricing.quadCenterXPx}
            min={150} max={400} step={1} unit="px"
            onChange={(v) => patch("groupPricing", { quadCenterXPx: v })}
          />
          <SliderRow
            label="X Center · Triple"
            value={local.groupPricing.tripleCenterXPx}
            min={300} max={560} step={1} unit="px"
            onChange={(v) => patch("groupPricing", { tripleCenterXPx: v })}
          />
          <SliderRow
            label="X Center · Double"
            value={local.groupPricing.doubleCenterXPx}
            min={460} max={720} step={1} unit="px"
            onChange={(v) => patch("groupPricing", { doubleCenterXPx: v })}
          />
          <div className="pt-1 border-t border-orange-100/80" />
          <p className="text-[9px] font-semibold text-slate-600">
            X-Offset per kolom (geser independen):
          </p>
          <SliderRow
            label="↔ Quad X-Offset"
            value={local.groupPricing.quadXOffsetPx}
            min={-40} max={40} step={0.5} unit="px"
            onChange={(v) => patch("groupPricing", { quadXOffsetPx: v })}
          />
          <SliderRow
            label="↔ Triple X-Offset"
            value={local.groupPricing.tripleXOffsetPx}
            min={-40} max={40} step={0.5} unit="px"
            onChange={(v) => patch("groupPricing", { tripleXOffsetPx: v })}
          />
          <SliderRow
            label="↔ Double X-Offset"
            value={local.groupPricing.doubleXOffsetPx}
            min={-40} max={40} step={0.5} unit="px"
            onChange={(v) => patch("groupPricing", { doubleXOffsetPx: v })}
          />
          <SliderRow
            label="Cell Height (vertical center)"
            value={local.groupPricing.cellHeightPx}
            min={14} max={48} step={1} unit="px"
            onChange={(v) => patch("groupPricing", { cellHeightPx: v })}
          />
          <SliderRow
            label="Font Size"
            value={local.groupPricing.size}
            min={9} max={22} step={0.5} unit="pt"
            onChange={(v) => patch("groupPricing", { size: v })}
          />
          <TextRow
            label="Currency Symbol"
            value={local.groupPricing.currencySymbol}
            placeholder="$ / Rp / SAR"
            onChange={(v) => patch("groupPricing", { currencySymbol: v })}
          />
        </section>

        {/* CHECKLIST */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Checklist (Sudah / Belum)
          </h4>
          <TextRow
            label="Sudah Termasuk (override)"
            value={local.checklist.includedText ?? ""}
            placeholder="1 baris per item, kosong = pakai data"
            multiline
            onChange={(v) => patch("checklist", { includedText: v })}
          />
          <TextRow
            label="Belum Termasuk (override)"
            value={local.checklist.excludedText ?? ""}
            placeholder="1 baris per item, kosong = pakai data"
            multiline
            onChange={(v) => patch("checklist", { excludedText: v })}
          />
          <SliderRow
            label="X Kolom Kiri (center)"
            value={local.checklist.leftXPx}
            min={120} max={320} step={1} unit="px"
            onChange={(v) => patch("checklist", { leftXPx: v })}
          />
          <SliderRow
            label="X Kolom Kanan (center)"
            value={local.checklist.rightXPx}
            min={460} max={680} step={1} unit="px"
            onChange={(v) => patch("checklist", { rightXPx: v })}
          />
          <SliderRow
            label="Y Baris Pertama"
            value={local.checklist.firstBaselinePx}
            min={690} max={740} step={1} unit="px"
            onChange={(v) => patch("checklist", { firstBaselinePx: v })}
          />
          <SliderRow
            label="Checklist Y Offset"
            value={local.checklist.yOffsetPx}
            min={-15} max={15} step={0.5} unit="px"
            onChange={(v) => patch("checklist", { yOffsetPx: v })}
          />
          <SliderRow
            label="Font Size"
            value={local.checklist.size}
            min={7} max={14} step={0.5} unit="pt"
            onChange={(v) => patch("checklist", { size: v })}
          />
          <p className="text-[9px] text-slate-400 leading-snug">
            Y Offset menggeser semua teks naik/turun supaya pas di tengah dua garis.
          </p>
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
