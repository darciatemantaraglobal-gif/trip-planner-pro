import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Calculator as CalcIcon, Hotel, Bus, Globe, UserCheck, TrendingUp, Plus, Trash2, ChevronDown, ChevronUp, FileText, RotateCcw, Moon, Compass, Users, Plane, ImagePlus, X as XIcon, Sparkles, Edit3, Plus as PlusIcon, Copy as CopyIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { useTemplateStore } from "@/features/pdfTemplate/templateStore";
import { CanvasTemplateEditor } from "@/features/pdfTemplate/CanvasTemplateEditor";
import { CanvasTemplateView } from "@/features/pdfTemplate/renderHtml";
import type { BindingContext } from "@/features/pdfTemplate/dataBinding";
import { makeDefaultStarterTemplate } from "@/features/pdfTemplate/types";
import { usePackagesStore } from "@/store/packagesStore";
import type { PackageDraft } from "@/features/packages/packagesRepo";
import {
  computeProfessionalQuote,
  computeGeneralQuote,
  computeGroupMatrix,
  defaultPaxTiers,
  ROOM_SHARING,
  type HotelRow,
  type TransportRow,
  type TicketRow,
  type VisaRow,
  type DestinationRow,
  type FnBRow,
  type StaffRow,
  type GeneralCostRow,
  type CalcCurrency,
  type CalcMode,
  type CostUnit,
} from "@/features/calculator/pricing";
import { GroupMatrixSection, DEFAULT_GROUP_SETTINGS, type GroupSettings } from "@/features/calculator/GroupMatrixSection";
import { QuotationMetaSection } from "@/features/calculator/QuotationMetaSection";
import { cn } from "@/lib/utils";
import { useRatesStore } from "@/store/ratesStore";
import { useRegional } from "@/lib/regional";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CalcState {
  mode: CalcMode;
  packageName: string;
  destination: string;
  pax: number;
  hotels: HotelRow[];
  transports: TransportRow[];
  tickets: TicketRow[];
  visas: VisaRow[];
  destinations: DestinationRow[];
  fnbs: FnBRow[];
  staffs: StaffRow[];
  generalCosts: GeneralCostRow[];
  commissionFee: number;
  marginPercent: number;
  discount: number;
  localRateSAR: number;
  localRateUSD: number;
  groupSettings: GroupSettings;
  // PDF / quotation meta
  quoteNumber: string;
  customerName: string;
  dateRange: string;
  hotelMakkahName: string;
  hotelMadinahName: string;
  includedItems: string[];
  excludedItems: string[];
  // Group offer extras
  tier: string;
  title: string;
  subtitle: string;
  makkahStars: number;
  madinahStars: number;
  usdToSar: number;
  website: string;
  contactPhone: string;
  contactName: string;
  customPdfImage: string; // data URL — PDF background image
  pdfPageSize: "a4" | "a5" | "letter";
  pdfOrientation: "portrait" | "landscape";
  pdfMarginScale: number; // 0.5–1.5
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "travelhub.standalone.calculator.v1";

function saveState(value: CalcState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
}

function loadState(fallback: CalcState): CalcState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Partial<CalcState>;
    return {
      ...fallback,
      ...stored,
      mode:
        stored.mode === "umum" || stored.mode === "umroh_private" || stored.mode === "umroh_group"
          ? stored.mode
          : (stored.mode as unknown) === "umroh"
            ? "umroh_private"
            : fallback.mode,
      hotels: stored.hotels ?? fallback.hotels,
      transports: stored.transports ?? fallback.transports,
      tickets: stored.tickets ?? fallback.tickets,
      visas: stored.visas ?? fallback.visas,
      destinations: stored.destinations ?? fallback.destinations,
      fnbs: stored.fnbs ?? fallback.fnbs,
      staffs: (stored.staffs ?? fallback.staffs).map((s: StaffRow) => ({ numStaff: 1, ...s })),
      generalCosts: stored.generalCosts ?? fallback.generalCosts,
      groupSettings: { ...fallback.groupSettings, ...(stored.groupSettings ?? {}) },
      quoteNumber: stored.quoteNumber ?? fallback.quoteNumber,
      customerName: stored.customerName ?? fallback.customerName,
      dateRange: stored.dateRange ?? fallback.dateRange,
      hotelMakkahName: stored.hotelMakkahName ?? fallback.hotelMakkahName,
      hotelMadinahName: stored.hotelMadinahName ?? fallback.hotelMadinahName,
      includedItems: stored.includedItems ?? fallback.includedItems,
      excludedItems: stored.excludedItems ?? fallback.excludedItems,
      tier: stored.tier ?? fallback.tier,
      title: stored.title ?? fallback.title,
      subtitle: stored.subtitle ?? fallback.subtitle,
      makkahStars: stored.makkahStars ?? fallback.makkahStars,
      madinahStars: stored.madinahStars ?? fallback.madinahStars,
      usdToSar: stored.usdToSar ?? fallback.usdToSar,
      website: stored.website ?? fallback.website,
      contactPhone: stored.contactPhone ?? fallback.contactPhone,
      contactName: stored.contactName ?? fallback.contactName,
      customPdfImage: stored.customPdfImage ?? fallback.customPdfImage,
      pdfPageSize: stored.pdfPageSize ?? fallback.pdfPageSize,
      pdfOrientation: stored.pdfOrientation ?? fallback.pdfOrientation,
      pdfMarginScale: stored.pdfMarginScale ?? fallback.pdfMarginScale,
    };
  } catch { return fallback; }
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_GENERAL_COSTS: GeneralCostRow[] = [
  { id: "g1", category: "akomodasi", label: "Hotel / Penginapan",   qty: 3, amount: 0, currency: "IDR", unit: "pax"   },
  { id: "g2", category: "tiket",     label: "Tiket Pesawat PP",     qty: 1, amount: 0, currency: "IDR", unit: "pax"   },
  { id: "g3", category: "transport", label: "Bus / Kendaraan",      qty: 1, amount: 0, currency: "IDR", unit: "group" },
  { id: "g4", category: "visa",      label: "Visa & Dokumen",       qty: 1, amount: 0, currency: "IDR", unit: "pax"   },
  { id: "g5", category: "makan",     label: "Makan & Minum",        qty: 7, amount: 0, currency: "IDR", unit: "pax"   },
  { id: "g6", category: "atraksi",   label: "Atraksi & Wisata",     qty: 1, amount: 0, currency: "IDR", unit: "pax"   },
  { id: "g7", category: "guide",     label: "Guide & Staff",        qty: 1, amount: 0, currency: "IDR", unit: "group" },
];

function makeDefault(): CalcState {
  return {
    mode: "umroh_private",
    packageName: "",
    destination: "",
    pax: 1,
    hotels: [
      { id: "h1", label: "Makkah", days: 4, pricePerNight: 0, rooms: 1 },
      { id: "h2", label: "Madinah", days: 3, pricePerNight: 0, rooms: 1 },
    ],
    transports: [{ id: "t1", label: "All Transport", fleet: 1, pricePerFleet: 0 }],
    tickets: [{ id: "tk1", label: "SUB - JED", flightType: "Return", pricePerPax: 0, currency: "IDR" }],
    visas: [{ id: "v1", label: "Visa Umroh", pricePerPax: 0 }],
    destinations: [{ id: "d1", label: "Tasreh", pricePerPax: 0 }],
    fnbs: [{ id: "f1", label: "Zam-zam", pricePerPax: 0 }],
    staffs: [
      { id: "s1", label: "Akomodasi Guide", numStaff: 1, totalCost: 0 },
      { id: "s2", label: "Muthowif", numStaff: 1, totalCost: 0 },
    ],
    generalCosts: DEFAULT_GENERAL_COSTS.map((c) => ({ ...c })),
    commissionFee: 0,
    marginPercent: 10,
    discount: 0,
    localRateSAR: 0,
    localRateUSD: 0,
    groupSettings: { ...DEFAULT_GROUP_SETTINGS },
    quoteNumber: "",
    customerName: "",
    dateRange: "",
    hotelMakkahName: "",
    hotelMadinahName: "",
    includedItems: [],
    excludedItems: [],
    tier: "",
    title: "",
    subtitle: "",
    makkahStars: 5,
    madinahStars: 5,
    usdToSar: 3.75,
    website: "",
    contactPhone: "",
    contactName: "",
    customPdfImage: "",
    pdfPageSize: "a4",
    pdfOrientation: "portrait",
    pdfMarginScale: 1,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const M = { fontFamily: "'Manrope', sans-serif" };

function fmtSAR(v: number) {
  if (!v) return "—";
  return "SAR " + v.toLocaleString("id-ID");
}
function fmtUSD(v: number) {
  if (!v) return "—";
  return "USD " + v.toLocaleString("id-ID");
}

// ── Spreadsheet cell helpers ──────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      style={M}
      className={cn(
        "px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-orange-700 border-b border-orange-200 bg-orange-50/80 whitespace-nowrap",
        right && "text-right"
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, right, muted, bold, mono }: {
  children: React.ReactNode; right?: boolean; muted?: boolean; bold?: boolean; mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-2.5 py-1.5 text-[12px] border-b border-orange-50",
        right && "text-right",
        muted && "text-[hsl(var(--muted-foreground))]",
        bold && "font-bold",
        mono && "font-mono"
      )}
    >
      {children}
    </td>
  );
}

function NumCell({ value, onChange, placeholder }: {
  value: number; onChange: (v: number) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value > 0 ? value.toLocaleString("id-ID") : ""}
      onChange={(e) => {
        const stripped = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
        onChange(stripped ? Number(stripped) : 0);
      }}
      placeholder={placeholder ?? "0"}
      style={M}
      className="w-full h-7 rounded-lg border border-orange-200 bg-white px-2 text-[12px] text-right focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
    />
  );
}

const TRANSPORT_TYPES = ["Camry", "GMC", "Staria", "Hiace", "Coaster", "Bus", "HHR Train"];
const ROUTE_OPTIONS = [
  "JED-MEK/MEK-JED",
  "JED-MED/MED-JED",
  "MED-MEK/MEK-MED",
  "MED-MED",
  "THAIF",
];
const ROOM_TYPES = ["Quad", "Triple", "Double"] as const;
const ROOM_CAPACITY: Record<typeof ROOM_TYPES[number], number> = { Quad: 4, Triple: 3, Double: 2 };
const AIRLINES = [
  "Saudia Airlines", "Ettihad Airways", "Emirates Airways", "Turkish Airways",
  "Egypt Air", "Lion Air", "Scoot", "Flynas", "Flyadeal",
];
const DESTINATION_PRESETS = [
  "Mekkah - Madinah - Thaif",
  "Mekkah - Madinah",
  "Madinah - Mekkah",
];

function SelectCell({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={M}
      className="w-full h-7 rounded-lg border border-orange-200 bg-white px-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
    >
      <option value="">{placeholder ?? "Pilih"}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextCell({ value, onChange, placeholder, suggestions, listId }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  suggestions?: string[]; listId?: string;
}) {
  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        list={suggestions && listId ? listId : undefined}
        style={M}
        className="w-full h-7 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
      />
      {suggestions && listId && (
        <datalist id={listId}>
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
    </>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  currency,
  onAdd,
  color,
}: {
  icon: React.ElementType;
  title: string;
  currency: string;
  onAdd: () => void;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0 border-orange-200" style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)" }}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-orange-500 shrink-0" strokeWidth={2} />
        <span style={M} className="text-[12px] font-bold text-orange-800">{title}</span>
        <span style={M} className="text-[10px] font-semibold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded">
          {currency}
        </span>
      </div>
      <button
        onClick={onAdd}
        style={M}
        className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 rounded-lg px-2 py-1 transition-colors"
      >
        <Plus className="h-3 w-3" /> Tambah Baris
      </button>
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

const CUR_STYLE: Record<"IDR" | "SAR" | "USD", string> = {
  IDR: "bg-emerald-500 text-white",
  SAR: "bg-blue-500 text-white",
  USD: "bg-violet-500 text-white",
};
function RowCurrencyToggle({ value, onChange }: { value: "IDR" | "SAR" | "USD"; onChange: (v: "IDR" | "SAR" | "USD") => void }) {
  return (
    <div className="flex rounded-md border border-orange-200 overflow-hidden shrink-0">
      {(["IDR", "SAR", "USD"] as const).map((cur, i) => (
        <button
          key={cur}
          type="button"
          onClick={() => onChange(cur)}
          style={M}
          className={`h-7 px-1.5 text-[9px] font-bold transition-colors ${value === cur ? CUR_STYLE[cur] : "bg-white text-slate-400 hover:bg-slate-50"} ${i > 0 ? "border-l border-orange-200" : ""}`}
        >{cur}</button>
      ))}
    </div>
  );
}

const CATS: Array<{ value: string; emoji: string; label: string }> = [
  { value: "",          emoji: "•",  label: "—"           },
  { value: "akomodasi", emoji: "🏨", label: "Akomodasi"   },
  { value: "transport", emoji: "🚌", label: "Transport"   },
  { value: "tiket",     emoji: "✈️", label: "Tiket"       },
  { value: "visa",      emoji: "🪪", label: "Visa"        },
  { value: "makan",     emoji: "🍽️", label: "Makan"       },
  { value: "atraksi",   emoji: "🎭", label: "Atraksi"     },
  { value: "guide",     emoji: "👨‍✈️", label: "Guide"      },
  { value: "lainnya",   emoji: "📦", label: "Lainnya"     },
];
function UnitToggle({ value, onChange }: { value: CostUnit; onChange: (v: CostUnit) => void }) {
  return (
    <div className="flex rounded-md border border-orange-200 overflow-hidden shrink-0">
      {(["pax", "group"] as const).map((u, i) => (
        <button key={u} type="button" onClick={() => onChange(u)} style={M}
          className={`h-7 px-1.5 text-[9px] font-bold transition-colors ${value === u ? "bg-orange-500 text-white" : "bg-white text-slate-400 hover:bg-slate-50"} ${i > 0 ? "border-l border-orange-200" : ""}`}
        >{u === "pax" ? "/pax" : "/grup"}</button>
      ))}
    </div>
  );
}

function SubtotalRow({ label, sarAmount, usdAmount, groupIDR, perPaxIDR, formatCurrency }: {
  label: string;
  sarAmount?: number;
  usdAmount?: number;
  groupIDR: number;
  perPaxIDR: number;
  formatCurrency: (v: number) => string;
}) {
  const hasSAR = sarAmount !== undefined && sarAmount > 0;
  const hasUSD = usdAmount !== undefined && usdAmount > 0;
  const foreignDisplay = hasSAR && hasUSD
    ? <><span className="text-blue-700">{fmtSAR(sarAmount!)}</span> <span className="text-orange-400">+</span> <span className="text-violet-700">{fmtUSD(usdAmount!)}</span></>
    : hasSAR ? <span className="text-blue-700">{fmtSAR(sarAmount!)}</span>
    : hasUSD ? <span className="text-violet-700">{fmtUSD(usdAmount!)}</span>
    : <span className="text-muted-foreground">—</span>;

  return (
    <tr className="bg-orange-50/50">
      <td colSpan={2} style={M} className="px-2.5 py-2 text-[11px] font-extrabold text-orange-700 uppercase tracking-wider border-t-2 border-orange-200">
        {label}
      </td>
      <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right border-t-2 border-orange-200 font-mono">
        {foreignDisplay}
      </td>
      <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right text-orange-700 border-t-2 border-orange-200 font-mono">
        {formatCurrency(groupIDR)}
      </td>
      <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right text-orange-600 border-t-2 border-orange-200 font-mono">
        {formatCurrency(perPaxIDR)}
      </td>
      <td className="border-t-2 border-orange-200" />
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Calculator() {
  const rates = useRatesStore((s) => s.rates);
  const { formatCurrency } = useRegional();

  const [calc, setCalc] = useState<CalcState>(() => loadState(makeDefault()));
  const [showSummary, setShowSummary] = useState(true);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const templates = useTemplateStore((s) => s.templates);
  const activeTemplateId = useTemplateStore((s) => s.activeTemplateId);
  const setActiveTemplateId = useTemplateStore((s) => s.setActiveTemplateId);
  const addTemplate = useTemplateStore((s) => s.addTemplate);
  const updateTemplate = useTemplateStore((s) => s.updateTemplate);
  const duplicateTemplate = useTemplateStore((s) => s.duplicateTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);
  const hydrateTemplates = useTemplateStore((s) => s.hydrateFromCloud);
  const ensureDefaultTemplate = useTemplateStore((s) => s.ensureDefaultTemplate);

  useEffect(() => {
    void hydrateTemplates();
    ensureDefaultTemplate();
  }, [hydrateTemplates, ensureDefaultTemplate]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) ?? null,
    [templates, activeTemplateId]
  );

  function openTemplateEditor(id: string | null) {
    setEditingTemplateId(id);
    setEditorOpen(true);
  }
  function handleTemplateSave(t: Parameters<typeof addTemplate>[0]) {
    if (editingTemplateId) {
      updateTemplate(editingTemplateId, t);
    } else {
      const newId = addTemplate(t);
      setActiveTemplateId(newId);
    }
  }
  function handleDuplicateActive() {
    if (!activeTemplateId) return;
    const newId = duplicateTemplate(activeTemplateId);
    if (newId) setActiveTemplateId(newId);
  }
  function handleDeleteActive() {
    if (!activeTemplateId) return;
    if (templates.length <= 1) {
      toast.error("Minimal harus ada 1 template.");
      return;
    }
    if (!confirm("Hapus template ini?")) return;
    deleteTemplate(activeTemplateId);
  }
  function handleResetToStarter() {
    const id = addTemplate(makeDefaultStarterTemplate());
    setActiveTemplateId(id);
    toast.success("Template default dibuat ulang.");
  }
  const navigate = useNavigate();
  const createPackage = usePackagesStore((s) => s.create);

  function update(value: CalcState) {
    setCalc(value);
    saveState(value);
  }

  const setField = <K extends keyof CalcState>(key: K, value: CalcState[K]) => {
    const next = { ...calc, [key]: value };
    update(next);
  };

  const sarRate = calc.localRateSAR > 0 ? calc.localRateSAR : (rates.SAR ?? 1);
  const usdRate = calc.localRateUSD > 0 ? calc.localRateUSD : (rates.USD ?? 1);
  const safePax = Math.max(1, calc.pax);

  const effectiveRates = useMemo(() => ({
    ...rates,
    SAR: calc.localRateSAR > 0 ? calc.localRateSAR : (rates.SAR ?? 1),
    USD: calc.localRateUSD > 0 ? calc.localRateUSD : (rates.USD ?? 1),
  }), [calc.localRateSAR, calc.localRateUSD, rates]);

  const quote = useMemo(() => {
    if (calc.mode === "umum") {
      return computeGeneralQuote({ pax: calc.pax, costs: calc.generalCosts, commissionFee: calc.commissionFee, marginPercent: calc.marginPercent, discount: calc.discount, rates: effectiveRates });
    }
    return computeProfessionalQuote({
      pax: calc.pax,
      hotels: calc.hotels,
      transports: calc.transports,
      tickets: calc.tickets ?? [],
      visas: calc.visas,
      destinations: calc.destinations,
      fnbs: calc.fnbs ?? [],
      staffs: calc.staffs,
      commissionFee: calc.commissionFee,
      marginPercent: calc.marginPercent,
      discount: calc.discount,
      rates: effectiveRates,
    });
  }, [calc, effectiveRates]);

  // ── Row updaters ─────────────────────────────────────────────────────────────

  function updateHotel(id: string, patch: Partial<HotelRow>) {
    update({ ...calc, hotels: calc.hotels.map((h) => h.id === id ? { ...h, ...patch } : h) });
  }
  function addHotel() {
    update({ ...calc, hotels: [...calc.hotels, { id: `h${Date.now()}`, label: "Hotel", days: 1, pricePerNight: 0, rooms: 1 }] });
  }
  function removeHotel(id: string) {
    update({ ...calc, hotels: calc.hotels.filter((h) => h.id !== id) });
  }

  function updateTransport(id: string, patch: Partial<TransportRow>) {
    update({ ...calc, transports: calc.transports.map((t) => t.id === id ? { ...t, ...patch } : t) });
  }
  function addTransport() {
    update({ ...calc, transports: [...calc.transports, { id: `t${Date.now()}`, label: "Transport", fleet: 1, pricePerFleet: 0 }] });
  }
  function removeTransport(id: string) {
    update({ ...calc, transports: calc.transports.filter((t) => t.id !== id) });
  }

  function updateTicket(id: string, patch: Partial<TicketRow>) {
    update({ ...calc, tickets: calc.tickets.map((t) => t.id === id ? { ...t, ...patch } : t) });
  }
  function addTicket() {
    update({ ...calc, tickets: [...calc.tickets, { id: `tk${Date.now()}`, label: "Rute Baru", flightType: "Return", pricePerPax: 0, currency: "IDR" as const }] });
  }
  function removeTicket(id: string) {
    update({ ...calc, tickets: calc.tickets.filter((t) => t.id !== id) });
  }

  function updateVisa(id: string, patch: Partial<VisaRow>) {
    update({ ...calc, visas: calc.visas.map((v) => v.id === id ? { ...v, ...patch } : v) });
  }
  function addVisa() {
    update({ ...calc, visas: [...calc.visas, { id: `v${Date.now()}`, label: "Visa", pricePerPax: 0 }] });
  }
  function removeVisa(id: string) {
    update({ ...calc, visas: calc.visas.filter((v) => v.id !== id) });
  }

  function updateDest(id: string, patch: Partial<DestinationRow>) {
    update({ ...calc, destinations: calc.destinations.map((d) => d.id === id ? { ...d, ...patch } : d) });
  }
  function addDest() {
    update({ ...calc, destinations: [...calc.destinations, { id: `d${Date.now()}`, label: "Destinasi", pricePerPax: 0 }] });
  }
  function removeDest(id: string) {
    update({ ...calc, destinations: calc.destinations.filter((d) => d.id !== id) });
  }

  function updateFnB(id: string, patch: Partial<FnBRow>) {
    update({ ...calc, fnbs: calc.fnbs.map((f) => f.id === id ? { ...f, ...patch } : f) });
  }
  function addFnB() {
    update({ ...calc, fnbs: [...calc.fnbs, { id: `f${Date.now()}`, label: "F&B", pricePerPax: 0 }] });
  }
  function removeFnB(id: string) {
    update({ ...calc, fnbs: calc.fnbs.filter((f) => f.id !== id) });
  }

  function updateStaff(id: string, patch: Partial<StaffRow>) {
    update({ ...calc, staffs: calc.staffs.map((s) => s.id === id ? { ...s, ...patch } : s) });
  }
  function addStaff() {
    update({ ...calc, staffs: [...calc.staffs, { id: `s${Date.now()}`, label: "Guide", numStaff: 1, totalCost: 0 }] });
  }
  function removeStaff(id: string) {
    update({ ...calc, staffs: calc.staffs.filter((s) => s.id !== id) });
  }

  function updateGeneralCost(id: string, patch: Partial<GeneralCostRow>) {
    update({ ...calc, generalCosts: calc.generalCosts.map((c) => c.id === id ? { ...c, ...patch } : c) });
  }
  function addGeneralCost() {
    update({ ...calc, generalCosts: [...calc.generalCosts, { id: `g${Date.now()}`, category: "lainnya", label: "Biaya Tambahan", qty: 1, amount: 0, currency: "IDR" as CalcCurrency, unit: "pax" as CostUnit }] });
  }
  function removeGeneralCost(id: string) {
    update({ ...calc, generalCosts: calc.generalCosts.filter((c) => c.id !== id) });
  }

  function handleReset() {
    const fresh = makeDefault();
    update(fresh);
  }

  const pdfCosts = quote.breakdown.map((b) => ({ id: b.id, label: b.label, amount: b.groupIDR }));

  // ── Group matrix (untuk PDF mode "umroh_group") ──
  const groupTiers = useMemo(
    () => defaultPaxTiers(calc.groupSettings.minPax, calc.groupSettings.maxPax, calc.groupSettings.step),
    [calc.groupSettings.minPax, calc.groupSettings.maxPax, calc.groupSettings.step],
  );
  const groupMatrix = useMemo(() => {
    if (calc.mode !== "umroh_group") return null;
    return computeGroupMatrix({
      hotels: calc.hotels,
      transports: calc.transports,
      tickets: calc.tickets,
      visas: calc.visas,
      destinations: calc.destinations,
      fnbs: calc.fnbs,
      staffs: calc.staffs,
      commissionFee: calc.commissionFee,
      marginPercent: calc.marginPercent,
      discount: calc.discount,
      rates: effectiveRates,
      tiers: groupTiers,
      roomTypes: calc.groupSettings.roomTypes.length > 0 ? calc.groupSettings.roomTypes : ["Quad", "Triple", "Double"],
      displayCurrency: "USD",
      roundTo: calc.groupSettings.roundTo,
    });
  }, [calc, effectiveRates, groupTiers]);

  const offerData = useMemo(() => {
    if (calc.mode !== "umroh_group" || !groupMatrix) return undefined;
    const rooms: Array<"Quad" | "Triple" | "Double"> = ["Quad", "Triple", "Double"];
    const rows = groupTiers.map((tier) => {
      const get = (room: typeof rooms[number]) =>
        groupMatrix.cells.find((c) => c.tier.min === tier.min && c.tier.max === tier.max && c.room === room)?.perPaxDisplay ?? 0;
      const label = tier.min === tier.max ? `${tier.min} PAX` : `${tier.min} - ${tier.max} PAX`;
      return { paxRange: label, quad: get("Quad"), triple: get("Triple"), double: get("Double") };
    });
    const makkahHotel = calc.hotels.find((h) => /makk?ah/i.test(h.label));
    const madinahHotel = calc.hotels.find((h) => /madin/i.test(h.label));
    return {
      quoteNumber: calc.quoteNumber || "001",
      tier: calc.tier,
      title: calc.title || calc.packageName || "Penawaran Paket Umrah",
      subtitle: calc.subtitle,
      dateRange: calc.dateRange,
      customerName: calc.customerName || "—",
      hotelMakkah: calc.hotelMakkahName || makkahHotel?.label || "",
      hotelMadinah: calc.hotelMadinahName || madinahHotel?.label || "",
      makkahNights: makkahHotel?.days || 0,
      madinahNights: madinahHotel?.days || 0,
      makkahStars: calc.makkahStars,
      madinahStars: calc.madinahStars,
      usdToSar: calc.usdToSar || 3.75,
      updateDate: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
      rows,
      included: calc.includedItems.filter((s) => s.trim()),
      excluded: calc.excludedItems.filter((s) => s.trim()),
      website: calc.website,
      contactPhone: calc.contactPhone,
      contactName: calc.contactName,
      customBgImage: calc.customPdfImage || undefined,
      pageSize: calc.pdfPageSize,
      orientation: calc.pdfOrientation,
      marginScale: calc.pdfMarginScale,
    };
  }, [calc, groupMatrix, groupTiers]);

  // ── Simple PDF data (untuk mode private/umum) ──
  const simplePdfData = useMemo(() => {
    if (calc.mode === "umroh_group" || !quote) return undefined;
    const makkahHotel = calc.hotels.find((h) => /makk?ah/i.test(h.label));
    const madinahHotel = calc.hotels.find((h) => /madin/i.test(h.label));
    return {
      quoteNumber: calc.quoteNumber || "001",
      title: calc.customerName
        ? `Umroh ${calc.customerName}`
        : (calc.packageName || "Paket Umroh IGH Tour"),
      dateRange: calc.dateRange || "",
      hotelMakkah: calc.hotelMakkahName || makkahHotel?.label || "",
      hotelMadinah: calc.hotelMadinahName || madinahHotel?.label || "",
      makkahNights: makkahHotel?.days || 0,
      madinahNights: madinahHotel?.days || 0,
      pax: calc.pax,
      pricePerPaxIDR: quote.perPaxFinal,
      included: calc.includedItems.filter((s) => s.trim()),
      excluded: calc.excludedItems.filter((s) => s.trim()),
      customBgImage: calc.customPdfImage || undefined,
      pageSize: calc.pdfPageSize,
      orientation: calc.pdfOrientation,
      marginScale: calc.pdfMarginScale,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc, quote]);

  // ── Binding context untuk template canvas (preview & PDF) ──
  const bindingCtx = useMemo<BindingContext>(() => {
    const makkahHotel = calc.hotels.find((h) => /makk?ah/i.test(h.label));
    const madinahHotel = calc.hotels.find((h) => /madin/i.test(h.label));
    const ppx = quote?.perPaxFinal ?? 0;
    const pax = calc.pax || 0;
    return {
      quoteNumber: calc.quoteNumber || "001",
      tier: calc.tier || "",
      title: calc.title || calc.packageName || (calc.customerName ? `Umroh ${calc.customerName}` : "Penawaran Paket"),
      subtitle: calc.subtitle || "",
      dateRange: calc.dateRange || "",
      customerName: calc.customerName || "—",
      hotelMakkah: calc.hotelMakkahName || makkahHotel?.label || "",
      hotelMadinah: calc.hotelMadinahName || madinahHotel?.label || "",
      makkahNights: makkahHotel?.days || 0,
      madinahNights: madinahHotel?.days || 0,
      pax,
      pricePerPax: ppx,
      priceTotal: ppx * pax,
      updateDate: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
      website: calc.website || "",
      contactPhone: calc.contactPhone || "",
      contactName: calc.contactName || "",
      included: calc.includedItems.filter((s) => s.trim()),
      excluded: calc.excludedItems.filter((s) => s.trim()),
      agencyLogo: calc.customPdfImage || undefined,
    };
  }, [calc, quote]);

  // ── Buat Trip otomatis dari hasil kalkulasi ──
  function parseDateRange(s: string): { start?: string; end?: string } {
    if (!s) return {};
    const parts = s.split(/\s*(?:-|–|s\/d|sd|sampai)\s*/i);
    const tryParse = (raw: string) => {
      if (!raw) return undefined;
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6,
        agu: 7, agt: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
      };
      const m = raw.trim().match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})/);
      if (m) {
        const day = Number(m[1]);
        const mon = months[m[2].slice(0, 3).toLowerCase()];
        let year = Number(m[3]);
        if (year < 100) year += 2000;
        if (Number.isFinite(day) && mon != null) {
          return new Date(Date.UTC(year, mon, day)).toISOString().slice(0, 10);
        }
      }
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
    };
    return { start: tryParse(parts[0]), end: tryParse(parts[1] ?? parts[0]) };
  }

  async function handleCreateTrip() {
    if (creatingTrip) return;
    setCreatingTrip(true);
    try {
      const parsed = parseDateRange(calc.dateRange);

      const name =
        calc.title?.trim() ||
        calc.packageName?.trim() ||
        (calc.customerName ? `Umroh ${calc.customerName}` : "Paket Baru IGH Tour");

      const destination =
        calc.destination?.trim() ||
        (calc.mode !== "umum"
          ? [calc.hotelMakkahName, calc.hotelMadinahName]
              .filter(Boolean)
              .join(" & ")
              .trim() || "Makkah & Madinah"
          : "Trip");

      const totalDays = calc.hotels.reduce((acc, h) => acc + (h.days || 0), 0) || 7;

      const isUmrah = /umroh|umrah|haji|hajj|makkah|madinah/i.test(name + " " + destination);
      const emoji = isUmrah ? "🕋" : "✈️";

      const stars = calc.makkahStars ?? calc.madinahStars ?? 0;
      const hotelLevel =
        stars >= 5 ? "Bintang 5" :
        stars >= 4 ? "Bintang 4" :
        stars >= 3 ? "Bintang 3" : undefined;

      const facilities = calc.includedItems?.filter((s) => s.trim()) ?? [];

      const draft: PackageDraft = {
        name,
        destination,
        people: Math.max(1, calc.pax || 1),
        days: totalDays,
        hpp: Math.round(quote.hpp || 0),
        totalIDR: Math.round(quote.finalPrice || 0),
        status: "Calculated",
        emoji,
        departureDate: parsed.start || undefined,
        hotelLevel: hotelLevel as PackageDraft["hotelLevel"],
        facilities: facilities.length ? facilities : undefined,
        notes: [calc.subtitle, calc.tier, calc.customerName ? `Customer: ${calc.customerName}` : ""]
          .filter(Boolean).join(" | ") || undefined,
        coverImage: calc.customPdfImage || undefined,
      };

      const newPkg = await createPackage(draft);
      toast.success(`Paket "${newPkg.name}" berhasil dibuat!`);
      navigate("/packages");
    } catch (err) {
      console.error("create package failed", err);
      toast.error("Gagal membuat Paket. Coba lagi.");
    } finally {
      setCreatingTrip(false);
    }
  }

  // ── PDF custom background image upload handler ──
  const handlePdfImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCalc((c) => ({ ...c, customPdfImage: dataUrl }));
      toast.success("Gambar template PDF berhasil di-upload.");
    };
    reader.onerror = () => toast.error("Gagal membaca file gambar.");
    reader.readAsDataURL(file);
  };

  // ── Reusable PDF layout settings card UI ──
  const renderPdfLayoutSettings = (key: string) => (
    <div className="rounded-xl bg-white border border-orange-200 p-3 space-y-2.5" key={key}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700" style={M}>
        Layout PDF
      </p>

      <div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1" style={M}>Ukuran</p>
        <div className="grid grid-cols-3 gap-1">
          {(["a4", "a5", "letter"] as const).map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => setCalc((c) => ({ ...c, pdfPageSize: sz }))}
              className={cn(
                "h-7 rounded-lg text-[10px] font-bold uppercase transition-colors",
                calc.pdfPageSize === sz
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              )}
              style={M}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1" style={M}>Orientasi</p>
        <div className="grid grid-cols-2 gap-1">
          {(["portrait", "landscape"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setCalc((c) => ({ ...c, pdfOrientation: o }))}
              className={cn(
                "h-7 rounded-lg text-[10px] font-bold capitalize transition-colors",
                calc.pdfOrientation === o
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              )}
              style={M}
            >
              {o === "portrait" ? "Portrait" : "Landscape"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1" style={M}>
          Margin · {Math.round(calc.pdfMarginScale * 100)}%
        </p>
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: "Compact", v: 0.6 },
            { label: "Normal", v: 1 },
            { label: "Lebar", v: 1.4 },
          ].map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setCalc((c) => ({ ...c, pdfMarginScale: m.v }))}
              className={cn(
                "h-7 rounded-lg text-[10px] font-bold transition-colors",
                Math.abs(calc.pdfMarginScale - m.v) < 0.05
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              )}
              style={M}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={calc.pdfMarginScale}
          onChange={(e) => setCalc((c) => ({ ...c, pdfMarginScale: Number(e.target.value) }))}
          className="w-full mt-1.5 accent-orange-500"
        />
      </div>
    </div>
  );

  // ── Reusable PDF image upload card UI ──
  const renderPdfImageUploader = (key: string) => (
    <div className="rounded-xl bg-white border border-orange-200 p-3" key={key}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700 mb-2" style={M}>
        Gambar Template PDF
      </p>
      {calc.customPdfImage ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-orange-200" style={{ aspectRatio: "210/297", maxWidth: 140 }}>
            <img src={calc.customPdfImage} alt="PDF template" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setCalc((c) => ({ ...c, customPdfImage: "" }))}
              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
              title="Hapus gambar"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
          <label className="flex items-center justify-center gap-1.5 h-7 px-2 rounded-lg border border-orange-300 text-[10px] font-bold text-orange-700 hover:bg-orange-50 cursor-pointer" style={M}>
            <ImagePlus className="h-3 w-3" />
            Ganti
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) handlePdfImageUpload(f); e.target.value = "";
            }} />
          </label>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1.5 h-20 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50/40 hover:bg-orange-50 cursor-pointer transition-colors" style={M}>
          <ImagePlus className="h-5 w-5 text-orange-500" />
          <span className="text-[10px] font-bold text-orange-700">Upload gambar</span>
          <span className="text-[9px] text-muted-foreground">A4 portrait, ≤ 4 MB</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (f) handlePdfImageUpload(f); e.target.value = "";
          }} />
        </label>
      )}
      <p className="text-[9px] text-muted-foreground mt-1.5 leading-tight" style={M}>
        Gambar akan dipakai sebagai latar belakang penuh halaman PDF.
      </p>
    </div>
  );

  return (
    <div className="pwa-compact-form space-y-2.5 md:space-y-5 max-w-5xl mx-auto" style={M}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <CalcIcon strokeWidth={2} className="h-4 w-4 md:h-5 md:w-5 text-orange-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[14px] md:text-lg font-bold text-[hsl(var(--foreground))] leading-tight truncate" style={M}>
              Kalkulator Profesional
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block" style={M}>
              Kalkulasi biaya paket Umroh, Haji &amp; Trip
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <button
            onClick={handleReset}
            style={M}
            className="flex items-center gap-1 h-7 md:h-8 px-2 md:px-3 rounded-lg md:rounded-xl border border-orange-200 text-orange-600 bg-white hover:bg-orange-50 text-[10.5px] md:text-[11px] font-semibold transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
          <Button
            onClick={() => setPdfOpen(true)}
            disabled={quote.finalPrice === 0}
            className="h-7 md:h-8 px-2 md:px-3 rounded-lg md:rounded-xl gradient-primary text-white text-[10.5px] md:text-[11px] font-semibold"
          >
            <FileText className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* ── Mode switcher ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-orange-200 bg-orange-50/50 self-start flex-wrap">
        {([
          { mode: "umroh_private" as CalcMode, label: "Umroh Private", icon: Moon },
          { mode: "umroh_group"   as CalcMode, label: "Umroh Group",   icon: Users },
          { mode: "umum"          as CalcMode, label: "Umum",          icon: Compass },
        ]).map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => setField("mode", mode)}
            style={M}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-[10.5px] md:text-[11.5px] font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap",
              calc.mode === mode
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-600 hover:bg-orange-100"
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Editable rates strip ── */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
        <p style={M} className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Override Kurs (khusus halaman ini)</p>
        <div className="flex flex-wrap gap-2">
          {(["SAR", "USD"] as const).map((cur) => {
            const storeVal = rates[cur] ?? 0;
            const localVal = cur === "SAR" ? calc.localRateSAR : calc.localRateUSD;
            const active = localVal > 0;
            return (
              <div
                key={cur}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors ${active ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200"}`}
              >
                <span style={M} className="text-[10px] font-bold text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 shrink-0">{cur}</span>
                <span style={M} className="text-[11px] text-muted-foreground">= Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={storeVal.toLocaleString("id-ID")}
                  value={localVal > 0 ? localVal.toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const stripped = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                    setField(cur === "SAR" ? "localRateSAR" : "localRateUSD", stripped ? Number(stripped) : 0);
                  }}
                  style={M}
                  className="h-6 w-28 text-[11px] font-bold border-0 bg-transparent shadow-none p-0 focus:outline-none"
                />
                {active ? (
                  <button
                    type="button"
                    onClick={() => setField(cur === "SAR" ? "localRateSAR" : "localRateUSD", 0)}
                    style={M}
                    className="text-[10px] text-orange-400 hover:text-orange-600 font-medium shrink-0"
                  >↩ Reset</button>
                ) : (
                  <span style={M} className="text-[10px] text-slate-400 italic shrink-0">(dari Pengaturan)</span>
                )}
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
            <span style={M} className="text-[10px] font-bold text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 shrink-0">IDR</span>
            <span style={M} className="text-[11px] text-muted-foreground">= Rp</span>
            <span style={M} className="text-[11px] font-bold text-slate-800 font-mono">1</span>
            <span style={M} className="text-[10px] text-slate-400 italic shrink-0">(basis)</span>
          </div>
        </div>
      </div>

      {/* ── Package Info ── */}
      <div className="rounded-xl border border-orange-200 bg-white p-3 md:p-4 space-y-2.5 md:space-y-3">
        <p style={M} className="text-[10px] font-extrabold uppercase tracking-wide text-orange-600">Info Paket</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          <div className="col-span-2 space-y-1">
            <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Nama Paket</label>
            <input
              type="text"
              value={calc.packageName}
              onChange={(e) => setField("packageName", e.target.value)}
              placeholder="cth: Umrah Ramadhan 2026"
              style={M}
              className="w-full h-8 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div className="space-y-1">
            <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Destinasi</label>
            <select
              value={calc.destination}
              onChange={(e) => setField("destination", e.target.value)}
              style={M}
              className="w-full h-8 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="">Pilih rute</option>
              {DESTINATION_PRESETS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Jumlah Pax</label>
            <input
              type="text"
              inputMode="numeric"
              value={calc.pax > 0 ? calc.pax.toLocaleString("id-ID") : ""}
              onChange={(e) => {
                const stripped = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                setField("pax", Math.max(1, stripped ? Number(stripped) : 1));
              }}
              style={M}
              className="w-full h-8 rounded-lg border border-orange-200 bg-white px-2 text-[12px] text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
        </div>
      </div>

      {/* ══ MODE-SPECIFIC SECTION ══ */}

      {calc.mode !== "umum" && (<>

        {/* ── HOTEL TABLE ── */}
        <div className="overflow-hidden rounded-xl border border-orange-200">
          <SectionHeader icon={Hotel} title="Hotel" currency="SAR / USD" color="bg-blue-500" onAdd={addHotel} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Nama Hotel</Th>
                  <Th>Tipe Kamar</Th>
                  <Th right>Hari</Th>
                  <Th right>Harga/Malam</Th>
                  <Th right>Kamar</Th>
                  <Th right>Total Asing</Th>
                  <Th right>Total IDR</Th>
                  <Th right>Per Pax IDR</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {calc.hotels.map((h) => {
                  const cur = h.currency ?? "SAR";
                  const rate = cur === "SAR" ? sarRate : cur === "USD" ? usdRate : 1;
                  const foreignAmount = h.days * h.pricePerNight * h.rooms;
                  const totalIDR = foreignAmount * rate;
                  const capacity = h.roomType ? ROOM_CAPACITY[h.roomType] : 0;
                  const perPaxIDR = capacity > 0
                    ? (h.days * h.pricePerNight * rate) / capacity
                    : totalIDR / safePax;
                  return (
                    <tr key={h.id} className="hover:bg-orange-50/30 transition-colors">
                      <Td><TextCell value={h.label} onChange={(v) => updateHotel(h.id, { label: v })} placeholder="Nama hotel" /></Td>
                      <Td>
                        <SelectCell
                          value={h.roomType ?? ""}
                          onChange={(v) => updateHotel(h.id, { roomType: (v || undefined) as HotelRow["roomType"] })}
                          options={ROOM_TYPES}
                          placeholder="Tipe"
                        />
                      </Td>
                      <Td right><NumCell value={h.days} onChange={(v) => updateHotel(h.id, { days: v })} /></Td>
                      <Td right>
                        <div className="flex items-center gap-1">
                          <NumCell value={h.pricePerNight} onChange={(v) => updateHotel(h.id, { pricePerNight: v })} />
                          <RowCurrencyToggle value={cur} onChange={(v) => updateHotel(h.id, { currency: v })} />
                        </div>
                      </Td>
                      <Td right><NumCell value={h.rooms} onChange={(v) => updateHotel(h.id, { rooms: v })} /></Td>
                      <Td right muted mono>{cur === "SAR" ? fmtSAR(foreignAmount) : fmtUSD(foreignAmount)}</Td>
                      <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                      <Td right muted mono>
                        {formatCurrency(perPaxIDR)}
                        {capacity > 0 && <div style={M} className="text-[9px] text-slate-400 font-normal">÷ {capacity} pax/kamar</div>}
                      </Td>
                      <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeHotel(h.id)} /></td>
                    </tr>
                  );
                })}
                {quote && (
                  <SubtotalRow
                    label="SUBTOTAL HOTEL"
                    sarAmount={quote.breakdown.filter(b => b.category === "Hotel").reduce((s, b) => s + b.notesSAR, 0)}
                    usdAmount={quote.breakdown.filter(b => b.category === "Hotel").reduce((s, b) => s + b.notesUSD, 0)}
                    groupIDR={quote.hotelIDR}
                    perPaxIDR={quote.hotelIDR / safePax}
                    formatCurrency={formatCurrency}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── TRANSPORT TABLE ── */}
        <div className="overflow-hidden rounded-xl border border-orange-200">
          <SectionHeader icon={Bus} title="Transportasi" currency="SAR / USD" color="bg-blue-600" onAdd={addTransport} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Jenis</Th>
                  <Th>Rute</Th>
                  <Th right>Jumlah</Th>
                  <Th right>Harga</Th>
                  <Th right>Total Asing</Th>
                  <Th right>Total IDR (Grup)</Th>
                  <Th right>Per Pax IDR</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {calc.transports.map((t) => {
                  const cur = t.currency ?? "SAR";
                  const rate = cur === "SAR" ? sarRate : cur === "USD" ? usdRate : 1;
                  const foreignAmount = t.fleet * t.pricePerFleet;
                  const totalIDR = foreignAmount * rate;
                  return (
                    <tr key={t.id} className="hover:bg-orange-50/30 transition-colors">
                      <Td><SelectCell value={t.label} onChange={(v) => updateTransport(t.id, { label: v })} options={TRANSPORT_TYPES} placeholder="Jenis" /></Td>
                      <Td><SelectCell value={t.route ?? ""} onChange={(v) => updateTransport(t.id, { route: v })} options={ROUTE_OPTIONS} placeholder="Rute" /></Td>
                      <Td right><NumCell value={t.fleet} onChange={(v) => updateTransport(t.id, { fleet: v })} /></Td>
                      <Td right>
                        <div className="flex items-center gap-1">
                          <NumCell value={t.pricePerFleet} onChange={(v) => updateTransport(t.id, { pricePerFleet: v })} />
                          <RowCurrencyToggle value={cur} onChange={(v) => updateTransport(t.id, { currency: v })} />
                        </div>
                      </Td>
                      <Td right muted mono>{cur === "SAR" ? fmtSAR(foreignAmount) : fmtUSD(foreignAmount)}</Td>
                      <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                      <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                      <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeTransport(t.id)} /></td>
                    </tr>
                  );
                })}
                {quote && (
                  <SubtotalRow
                    label="SUBTOTAL TRANSPORT"
                    sarAmount={quote.breakdown.filter(b => b.category === "Transport").reduce((s, b) => s + b.notesSAR, 0)}
                    usdAmount={quote.breakdown.filter(b => b.category === "Transport").reduce((s, b) => s + b.notesUSD, 0)}
                    groupIDR={quote.transportIDR}
                    perPaxIDR={quote.transportIDR / safePax}
                    formatCurrency={formatCurrency}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── AIRLINE TICKET TABLE ── */}
        <div className="overflow-hidden rounded-xl border border-orange-200">
          <SectionHeader icon={Globe} title="Tiket Pesawat" currency="IDR / USD" color="bg-sky-500" onAdd={addTicket} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Maskapai</Th>
                  <Th>Rute</Th>
                  <Th>Jenis</Th>
                  <Th right>Harga/Pax</Th>
                  <Th>Mata Uang</Th>
                  <Th right>Total Grup (IDR)</Th>
                  <Th right>Per Pax (IDR)</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {(calc.tickets ?? []).map((tk) => {
                  const totalIDR = tk.currency === "SAR"
                    ? tk.pricePerPax * safePax * sarRate
                    : tk.currency === "USD"
                    ? tk.pricePerPax * safePax * usdRate
                    : tk.pricePerPax * safePax;
                  return (
                    <tr key={tk.id} className="hover:bg-orange-50/30 transition-colors">
                      <Td><SelectCell value={tk.airline ?? ""} onChange={(v) => updateTicket(tk.id, { airline: v })} options={AIRLINES} placeholder="Maskapai" /></Td>
                      <Td><TextCell value={tk.label} onChange={(v) => updateTicket(tk.id, { label: v })} placeholder="cth: SUB - JED" /></Td>
                      <Td>
                        <select
                          value={tk.flightType}
                          onChange={(e) => updateTicket(tk.id, { flightType: e.target.value })}
                          style={M}
                          className="h-7 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400 w-full"
                        >
                          <option value="Return">Return</option>
                          <option value="One Way">One Way</option>
                          <option value="Open Jaw">Open Jaw</option>
                        </select>
                      </Td>
                      <Td right><NumCell value={tk.pricePerPax} onChange={(v) => updateTicket(tk.id, { pricePerPax: v })} /></Td>
                      <Td>
                        <RowCurrencyToggle value={tk.currency} onChange={(v) => updateTicket(tk.id, { currency: v })} />
                      </Td>
                      <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                      <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                      <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeTicket(tk.id)} /></td>
                    </tr>
                  );
                })}
                {quote && (
                  <SubtotalRow
                    label="SUBTOTAL TIKET"
                    usdAmount={quote.breakdown.filter(b => b.category === "Tiket").reduce((s, b) => s + b.notesUSD, 0)}
                    groupIDR={quote.ticketIDR}
                    perPaxIDR={quote.ticketIDR / safePax}
                    formatCurrency={formatCurrency}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── VISA TABLE ── */}
        <div className="overflow-hidden rounded-xl border border-orange-200">
          <SectionHeader icon={Globe} title="Visa" currency="SAR / USD" color="bg-indigo-500" onAdd={addVisa} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Jenis Visa</Th>
                  <Th right>Harga/Pax</Th>
                  <Th right>Pax</Th>
                  <Th right>Total Asing</Th>
                  <Th right>Total IDR (Grup)</Th>
                  <Th right>Per Pax IDR</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {calc.visas.map((v) => {
                  const cur = v.currency ?? "USD";
                  const rate = cur === "SAR" ? sarRate : cur === "USD" ? usdRate : 1;
                  const foreignAmount = v.pricePerPax * safePax;
                  const totalIDR = foreignAmount * rate;
                  return (
                    <tr key={v.id} className="hover:bg-orange-50/30 transition-colors">
                      <Td><TextCell value={v.label} onChange={(val) => updateVisa(v.id, { label: val })} placeholder="cth: Visa Umroh" /></Td>
                      <Td right>
                        <div className="flex items-center gap-1">
                          <NumCell value={v.pricePerPax} onChange={(val) => updateVisa(v.id, { pricePerPax: val })} />
                          <RowCurrencyToggle value={cur} onChange={(val) => updateVisa(v.id, { currency: val })} />
                        </div>
                      </Td>
                      <Td right muted>{safePax}</Td>
                      <Td right muted mono>{cur === "SAR" ? fmtSAR(foreignAmount) : fmtUSD(foreignAmount)}</Td>
                      <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                      <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                      <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeVisa(v.id)} /></td>
                    </tr>
                  );
                })}
                {quote && (
                  <SubtotalRow
                    label="SUBTOTAL VISA"
                    sarAmount={quote.breakdown.filter(b => b.category === "Visa").reduce((s, b) => s + b.notesSAR, 0)}
                    usdAmount={quote.breakdown.filter(b => b.category === "Visa").reduce((s, b) => s + b.notesUSD, 0)}
                    groupIDR={quote.visaIDR}
                    perPaxIDR={quote.visaIDR / safePax}
                    formatCurrency={formatCurrency}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── DESTINATION TABLE ── */}
        <div className="overflow-hidden rounded-xl border border-orange-200">
          <SectionHeader icon={Globe} title="Destinasi / Ziarah" currency="SAR / USD" color="bg-emerald-500" onAdd={addDest} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Nama Destinasi</Th>
                  <Th right>Harga/Pax</Th>
                  <Th right>Pax</Th>
                  <Th right>Total Asing</Th>
                  <Th right>Total IDR (Grup)</Th>
                  <Th right>Per Pax IDR</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {calc.destinations.map((d) => {
                  const cur = d.currency ?? "SAR";
                  const rate = cur === "SAR" ? sarRate : cur === "USD" ? usdRate : 1;
                  const foreignAmount = d.pricePerPax * safePax;
                  const totalIDR = foreignAmount * rate;
                  return (
                    <tr key={d.id} className="hover:bg-orange-50/30 transition-colors">
                      <Td><TextCell value={d.label} onChange={(v) => updateDest(d.id, { label: v })} placeholder="cth: Tasreh" /></Td>
                      <Td right>
                        <div className="flex items-center gap-1">
                          <NumCell value={d.pricePerPax} onChange={(v) => updateDest(d.id, { pricePerPax: v })} />
                          <RowCurrencyToggle value={cur} onChange={(v) => updateDest(d.id, { currency: v })} />
                        </div>
                      </Td>
                      <Td right muted>{safePax}</Td>
                      <Td right muted mono>{cur === "SAR" ? fmtSAR(foreignAmount) : fmtUSD(foreignAmount)}</Td>
                      <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                      <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                      <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeDest(d.id)} /></td>
                    </tr>
                  );
                })}
                {quote && (
                  <SubtotalRow
                    label="SUBTOTAL DESTINASI"
                    sarAmount={quote.breakdown.filter(b => b.category === "Destinasi").reduce((s, b) => s + b.notesSAR, 0)}
                    usdAmount={quote.breakdown.filter(b => b.category === "Destinasi").reduce((s, b) => s + b.notesUSD, 0)}
                    groupIDR={quote.destinationIDR}
                    perPaxIDR={quote.destinationIDR / safePax}
                    formatCurrency={formatCurrency}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── F&B TABLE ── */}
        <div className="overflow-hidden rounded-xl border border-orange-200">
          <SectionHeader icon={Globe} title="F&B / Konsumsi" currency="SAR / USD" color="bg-amber-500" onAdd={addFnB} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Jenis Konsumsi</Th>
                  <Th right>Harga/Pax</Th>
                  <Th right>Pax</Th>
                  <Th right>Total Asing</Th>
                  <Th right>Total IDR (Grup)</Th>
                  <Th right>Per Pax IDR</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {(calc.fnbs ?? []).map((f) => {
                  const cur = f.currency ?? "SAR";
                  const rate = cur === "SAR" ? sarRate : cur === "USD" ? usdRate : 1;
                  const foreignAmount = f.pricePerPax * safePax;
                  const totalIDR = foreignAmount * rate;
                  return (
                    <tr key={f.id} className="hover:bg-orange-50/30 transition-colors">
                      <Td><TextCell value={f.label} onChange={(v) => updateFnB(f.id, { label: v })} placeholder="cth: Zam-zam" /></Td>
                      <Td right>
                        <div className="flex items-center gap-1">
                          <NumCell value={f.pricePerPax} onChange={(v) => updateFnB(f.id, { pricePerPax: v })} />
                          <RowCurrencyToggle value={cur} onChange={(v) => updateFnB(f.id, { currency: v })} />
                        </div>
                      </Td>
                      <Td right muted>{safePax}</Td>
                      <Td right muted mono>{cur === "SAR" ? fmtSAR(foreignAmount) : fmtUSD(foreignAmount)}</Td>
                      <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                      <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                      <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeFnB(f.id)} /></td>
                    </tr>
                  );
                })}
                {quote && (
                  <SubtotalRow
                    label="SUBTOTAL F&B"
                    sarAmount={quote.breakdown.filter(b => b.category === "F&B").reduce((s, b) => s + b.notesSAR, 0)}
                    usdAmount={quote.breakdown.filter(b => b.category === "F&B").reduce((s, b) => s + b.notesUSD, 0)}
                    groupIDR={quote.fnbIDR}
                    perPaxIDR={quote.fnbIDR / safePax}
                    formatCurrency={formatCurrency}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── STAFF TABLE ── */}
        <div className="overflow-hidden rounded-xl border border-orange-200">
          <SectionHeader icon={UserCheck} title="Cost for Staff" currency="SAR / USD" color="bg-orange-500" onAdd={addStaff} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Jabatan / Nama</Th>
                  <Th right>Jml Staff</Th>
                  <Th right>Total Biaya</Th>
                  <Th right>Per Pax Asing</Th>
                  <Th right>Total IDR (Grup)</Th>
                  <Th right>Per Pax IDR</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {calc.staffs.map((s) => {
                  const cur = s.currency ?? "SAR";
                  const rate = cur === "SAR" ? sarRate : cur === "USD" ? usdRate : 1;
                  const totalIDR = s.totalCost * rate;
                  const perPaxForeign = s.totalCost / safePax;
                  return (
                    <tr key={s.id} className="hover:bg-orange-50/30 transition-colors">
                      <Td><TextCell value={s.label} onChange={(v) => updateStaff(s.id, { label: v })} placeholder="cth: Muthowif" /></Td>
                      <Td right><NumCell value={(s as StaffRow).numStaff ?? 1} onChange={(v) => updateStaff(s.id, { numStaff: v })} /></Td>
                      <Td right>
                        <div className="flex items-center gap-1">
                          <NumCell value={s.totalCost} onChange={(v) => updateStaff(s.id, { totalCost: v })} />
                          <RowCurrencyToggle value={cur} onChange={(v) => updateStaff(s.id, { currency: v })} />
                        </div>
                      </Td>
                      <Td right muted mono>{cur === "SAR" ? fmtSAR(perPaxForeign) : fmtUSD(perPaxForeign)}</Td>
                      <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                      <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                      <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeStaff(s.id)} /></td>
                    </tr>
                  );
                })}
                {quote && (
                  <SubtotalRow
                    label="SUBTOTAL STAFF"
                    sarAmount={quote.breakdown.filter(b => b.category === "Staff").reduce((s, b) => s + b.notesSAR, 0)}
                    usdAmount={quote.breakdown.filter(b => b.category === "Staff").reduce((s, b) => s + b.notesUSD, 0)}
                    groupIDR={quote.staffIDR}
                    perPaxIDR={quote.staffIDR / safePax}
                    formatCurrency={formatCurrency}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

      </>)}

      {/* ── INFO PENAWARAN + EXCLUDE LIST (untuk PDF) ── */}
      <QuotationMetaSection
        value={{
          quoteNumber: calc.quoteNumber,
          customerName: calc.customerName,
          dateRange: calc.dateRange,
          hotelMakkahName: calc.hotelMakkahName,
          hotelMadinahName: calc.hotelMadinahName,
          includedItems: calc.includedItems,
          excludedItems: calc.excludedItems,
          tier: calc.tier,
          title: calc.title,
          subtitle: calc.subtitle,
          makkahStars: calc.makkahStars,
          madinahStars: calc.madinahStars,
          usdToSar: calc.usdToSar,
          website: calc.website,
          contactPhone: calc.contactPhone,
          contactName: calc.contactName,
        }}
        onChange={(meta) => update({ ...calc, ...meta })}
      />

      {/* ── UMUM MODE TABLE ── */}
      {calc.mode === "umum" && (
        <div className="overflow-hidden rounded-xl border border-orange-200">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0 border-orange-200" style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)" }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" strokeWidth={2} />
              <span style={M} className="text-[12px] font-bold text-orange-800">Rincian Biaya</span>
              <span style={M} className="text-[10px] font-semibold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded">IDR / SAR / USD</span>
            </div>
            <button onClick={addGeneralCost} style={M} className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 rounded-lg px-2 py-1 transition-colors">
              <Plus className="h-3 w-3" /> Tambah Baris
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Kategori</Th>
                  <Th>Keterangan</Th>
                  <Th right>Harga Satuan</Th>
                  <Th right>Qty</Th>
                  <Th>Kurs</Th>
                  <Th>Basis</Th>
                  <Th right>Total Grup</Th>
                  <Th right>Per Pax</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {calc.generalCosts.map((c) => {
                  const rowQty = c.qty ?? 1;
                  const multiplier = (c.unit === "pax" ? safePax : 1) * rowQty;
                  const groupIDR = c.currency === "IDR" ? c.amount * multiplier : c.currency === "SAR" ? c.amount * multiplier * sarRate : c.amount * multiplier * usdRate;
                  return (
                    <tr key={c.id} className="hover:bg-orange-50/30 transition-colors">
                      <Td>
                        <select value={c.category ?? ""} onChange={(e) => updateGeneralCost(c.id, { category: e.target.value })} style={M}
                          className="h-7 w-28 rounded-md border border-orange-200 bg-white px-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-400">
                          {CATS.map((cat) => <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>)}
                        </select>
                      </Td>
                      <Td><TextCell value={c.label} onChange={(v) => updateGeneralCost(c.id, { label: v })} placeholder="cth: Hotel Makkah" /></Td>
                      <Td right><NumCell value={c.amount} onChange={(v) => updateGeneralCost(c.id, { amount: v })} /></Td>
                      <Td right><NumCell value={rowQty} onChange={(v) => updateGeneralCost(c.id, { qty: Math.max(1, v) })} /></Td>
                      <Td><RowCurrencyToggle value={c.currency} onChange={(v) => updateGeneralCost(c.id, { currency: v })} /></Td>
                      <Td><UnitToggle value={c.unit} onChange={(v) => updateGeneralCost(c.id, { unit: v })} /></Td>
                      <Td right bold mono>
                        <div>{formatCurrency(groupIDR)}</div>
                        {c.amount > 0 && <div style={M} className="text-[9px] text-slate-400 font-normal">{c.amount.toLocaleString("id-ID")}{c.currency !== "IDR" ? ` ${c.currency}` : ""} × {rowQty}{c.unit === "pax" ? ` × ${safePax}p` : " (fix)"}</div>}
                      </Td>
                      <Td right muted mono>{formatCurrency(groupIDR / safePax)}</Td>
                      <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeGeneralCost(c.id)} /></td>
                    </tr>
                  );
                })}
                {quote && calc.generalCosts.length > 0 && (
                  <tr className="bg-orange-50/50">
                    <td colSpan={6} style={M} className="px-2.5 py-2 text-[11px] font-extrabold text-orange-700 uppercase tracking-wider border-t-2 border-orange-200">TOTAL BIAYA</td>
                    <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right text-orange-700 border-t-2 border-orange-200 font-mono">{formatCurrency(quote.hpp)}</td>
                    <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right text-orange-600 border-t-2 border-orange-200 font-mono">{formatCurrency(quote.hpp / safePax)}</td>
                    <td className="border-t-2 border-orange-200" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FINANCIAL PARAMETERS ── */}
      <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
        <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-orange-100 bg-orange-50/60">
          <p style={M} className="text-[10px] font-extrabold uppercase tracking-wide text-orange-700 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Parameter Finansial
          </p>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="space-y-2">
            <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              Commission Fee Admin (IDR Tetap)
            </label>
            <NumCell value={calc.commissionFee} onChange={(v) => setField("commissionFee", v)} placeholder="0" />
            <p style={M} className="text-[10px] text-muted-foreground">Nominal IDR tambahan di atas HPP</p>
          </div>
          <div className="space-y-2">
            <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              Acceptable Profit / Margin ({calc.marginPercent}%)
            </label>
            <Slider
              value={[calc.marginPercent]}
              min={0} max={50} step={1}
              onValueChange={(v) => setField("marginPercent", v[0])}
            />
            <div className="flex justify-between text-[10px] text-orange-400 font-medium">
              <span>0%</span><span>25%</span><span>50%</span>
            </div>
          </div>
          <div className="space-y-2">
            <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              Discount (IDR dikurangkan)
            </label>
            <NumCell value={calc.discount} onChange={(v) => setField("discount", v)} placeholder="0" />
            <p style={M} className="text-[10px] text-muted-foreground">Mengurangi Selling Price akhir</p>
          </div>
        </div>
      </div>

      {/* ── GROUP MATRIX OUTPUT (only in umroh_group mode) ── */}
      {calc.mode === "umroh_group" && (
        <>
          <GroupMatrixSection
            settings={calc.groupSettings}
            onChange={(next) => setField("groupSettings", next)}
            inputs={{
              hotels: calc.hotels,
              transports: calc.transports,
              tickets: calc.tickets,
              visas: calc.visas,
              destinations: calc.destinations,
              fnbs: calc.fnbs,
              staffs: calc.staffs,
              commissionFee: calc.commissionFee,
              marginPercent: calc.marginPercent,
              discount: calc.discount,
            }}
            rates={effectiveRates}
          />

          {/* ── PDF EXPORT + PREVIEW (umroh_group) ── */}
          {offerData && (
            <div className="rounded-xl border-2 border-orange-300 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span style={M} className="font-extrabold text-[12px] md:text-[14px] uppercase tracking-wide">
                    PDF Penawaran Group
                  </span>
                </div>
                <span style={M} className="text-[10px] md:text-[11px] opacity-90 hidden sm:inline">
                  Quote #{offerData.quoteNumber} · {offerData.rows.length} tier
                </span>
              </div>

              <div className="p-3 md:p-4 grid md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
                {/* Canvas template editor */}
                <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/40 p-3 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700" style={M}>
                      {activeTemplate ? "Template Aktif" : "Preview"}
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={activeTemplateId ?? ""}
                        onChange={(e) => setActiveTemplateId(e.target.value || null)}
                        className="h-7 max-w-[180px] text-[11px] border border-orange-200 rounded px-2 bg-white"
                      >
                        {templates.length === 0 ? (
                          <option value="">— belum ada —</option>
                        ) : (
                          templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))
                        )}
                      </select>
                      <button
                        onClick={() => openTemplateEditor(activeTemplateId)}
                        disabled={!activeTemplate}
                        title="Edit template aktif"
                        className="h-7 w-7 rounded bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white flex items-center justify-center"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => openTemplateEditor(null)}
                        title="Buat template baru"
                        className="h-7 w-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={handleDuplicateActive}
                        disabled={!activeTemplate}
                        title="Duplikat"
                        className="h-7 w-7 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center"
                      >
                        <CopyIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {activeTemplate ? (
                    <>
                      <div className="mx-auto" style={{ maxWidth: 360 }}>
                        <CanvasTemplateView template={activeTemplate} ctx={bindingCtx} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-muted-foreground" style={M}>
                          <Sparkles className="h-2.5 w-2.5 inline mr-0.5 text-orange-500" />
                          1:1 dengan PDF
                        </p>
                        <button
                          onClick={handleDeleteActive}
                          className="text-[10px] text-rose-600 hover:underline"
                        >
                          Hapus template
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Fallback: static live-data thumbnail when no template active */
                    <>
                      <div className="relative mx-auto rounded-lg border border-orange-200 shadow-sm overflow-hidden bg-white"
                           style={{ width: "100%", maxWidth: 360, aspectRatio: "210/297" }}>
                        <div className="px-3 pt-2.5 pb-1 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[7px] font-bold text-[#666]">#{offerData.quoteNumber}</div>
                            <h3 className="font-extrabold leading-tight mt-1" style={{ color: "#102463", fontSize: 12 }}>
                              {offerData.title}
                            </h3>
                            <p className="text-[7px] font-medium mt-1" style={{ color: "#3a2f22" }}>{offerData.dateRange}</p>
                          </div>
                          <img src="/logo-igh-tour.png" alt="IGH" className="h-5 object-contain shrink-0" />
                        </div>
                        <div className="px-3 mt-1 grid grid-cols-2 gap-2">
                          {[
                            { label: "Makkah", name: offerData.hotelMakkah, n: offerData.makkahNights },
                            { label: "Madinah", name: offerData.hotelMadinah, n: offerData.madinahNights },
                          ].map((h) => (
                            <div key={h.label}>
                              <p className="text-[6px] text-[#888] uppercase">{h.label}</p>
                              <p className="text-[8px] font-extrabold leading-tight" style={{ color: "#102463" }}>{h.name || "—"}</p>
                              <span className="inline-block mt-0.5 text-[6px] font-extrabold px-1.5 py-0.5 rounded-full"
                                    style={{ background: "#f3e2af", color: "#c99841" }}>
                                {h.n} MALAM
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="px-3 mt-2">
                          <table className="w-full text-[6.5px] border-collapse">
                            <thead>
                              <tr className="border-b border-[#dcd5c8]">
                                <th className="text-left py-0.5 font-extrabold text-[#3a2f22]">PAX</th>
                                <th className="text-left py-0.5 font-extrabold text-[#3a2f22]">QUAD</th>
                                <th className="text-left py-0.5 font-extrabold text-[#3a2f22]">TRIPLE</th>
                                <th className="text-left py-0.5 font-extrabold text-[#3a2f22]">DOUBLE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {offerData.rows.slice(0, 8).map((r) => (
                                <tr key={r.paxRange} className="border-b border-[#eae3d5]">
                                  <td className="py-0.5 font-bold text-[#3a2f22]">{r.paxRange}</td>
                                  <td className="py-0.5 font-extrabold text-[#102463]">${Math.round(r.quad).toLocaleString("en-US")}</td>
                                  <td className="py-0.5 font-extrabold text-[#102463]">${Math.round(r.triple).toLocaleString("en-US")}</td>
                                  <td className="py-0.5 font-extrabold text-[#102463]">${Math.round(r.double).toLocaleString("en-US")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="absolute left-0 right-0 bottom-0 h-7" style={{ background: "#102463" }}>
                          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "#c99841" }} />
                          <div className="px-3 pt-1 flex items-center justify-between text-[6px] text-white">
                            <span className="font-extrabold">Land Arrangement Umrah & Haji</span>
                            <span>{offerData.contactPhone}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center mt-2" style={M}>
                        Buat template untuk kustomisasi penuh, atau klik <span className="font-bold">Lihat & Ekspor PDF</span> langsung.
                      </p>
                    </>
                  )}
                </div>

                {/* Action buttons + summary */}
                <div className="flex flex-col gap-3 md:w-64">
                  <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700" style={M}>Tier Range</p>
                    <p className="text-[13px] font-extrabold text-orange-800 mt-0.5" style={M}>
                      {calc.groupSettings.minPax}–{calc.groupSettings.maxPax} PAX
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5" style={M}>
                      Step {calc.groupSettings.step} · {offerData.rows.length} baris harga
                    </p>
                  </div>
                  {renderPdfLayoutSettings("group-pdf-layout")}
                  {renderPdfImageUploader("group-pdf-img")}
                  <Button
                    onClick={() => setPdfOpen(true)}
                    className="w-full h-10 md:h-11 rounded-xl gradient-primary text-white text-sm"
                    style={M}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Lihat & Ekspor PDF
                  </Button>
                  <Button
                    onClick={handleCreateTrip}
                    disabled={creatingTrip}
                    variant="outline"
                    className="w-full h-10 md:h-11 rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50 text-sm"
                    style={M}
                  >
                    <Plane className="h-3.5 w-3.5 mr-1.5" />
                    {creatingTrip ? "Membuat Trip…" : "Buat Trip"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PDF EXPORT + PREVIEW (private + umum) ── */}
      {calc.mode !== "umroh_group" && (
        <div className="rounded-xl border-2 border-orange-300 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span style={M} className="font-extrabold text-[12px] md:text-[14px] uppercase tracking-wide">
                PDF Penawaran {calc.mode === "umroh_private" ? "Private" : "Trip"}
              </span>
            </div>
            {simplePdfData && (
              <span style={M} className="text-[10px] md:text-[11px] opacity-90 hidden sm:inline">
                Quote #{simplePdfData.quoteNumber} · {simplePdfData.pax} pax
              </span>
            )}
          </div>

          <div className="p-3 md:p-4 grid md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
            {/* Inline preview thumbnail */}
            <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/40 p-3 overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700" style={M}>
                  {activeTemplate ? "Template Aktif" : "Preview"}
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={activeTemplateId ?? ""}
                    onChange={(e) => setActiveTemplateId(e.target.value || null)}
                    className="h-7 max-w-[180px] text-[11px] border border-orange-200 rounded px-2 bg-white"
                  >
                    {templates.length === 0 ? (
                      <option value="">— belum ada —</option>
                    ) : (
                      templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    )}
                  </select>
                  <button
                    onClick={() => openTemplateEditor(activeTemplateId)}
                    disabled={!activeTemplate}
                    title="Edit template aktif"
                    className="h-7 w-7 rounded bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white flex items-center justify-center"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => openTemplateEditor(null)}
                    title="Buat template baru"
                    className="h-7 w-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                  >
                    <PlusIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleDuplicateActive}
                    disabled={!activeTemplate}
                    title="Duplikat"
                    className="h-7 w-7 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center"
                  >
                    <CopyIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {activeTemplate ? (
                <>
                  <div className="mx-auto" style={{ maxWidth: 360 }}>
                    <CanvasTemplateView template={activeTemplate} ctx={bindingCtx} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-muted-foreground" style={M}>
                      <Sparkles className="h-2.5 w-2.5 inline mr-0.5 text-orange-500" />
                      1:1 dengan PDF
                    </p>
                    <button
                      onClick={handleDeleteActive}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Hapus template
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[11px] text-slate-500 mb-2">Belum ada template aktif.</p>
                  <button
                    onClick={handleResetToStarter}
                    className="h-7 px-3 rounded-lg text-[11px] bg-orange-500 text-white hover:bg-orange-600"
                  >
                    Buat Template Default
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons + uploader */}
            <div className="flex flex-col gap-3 md:w-64">
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700" style={M}>Harga Final</p>
                <p className="text-[13px] font-extrabold text-orange-800 mt-0.5 font-mono" style={M}>
                  {formatCurrency(quote.finalPrice)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5" style={M}>
                  {formatCurrency(quote.perPaxFinal)}/pax · {simplePdfData?.pax ?? calc.pax} pax
                </p>
              </div>
              {renderPdfLayoutSettings("private-pdf-layout")}
              {renderPdfImageUploader("private-pdf-img")}
              <Button
                onClick={() => setPdfOpen(true)}
                className="w-full h-10 md:h-11 rounded-xl gradient-primary text-white text-sm"
                style={M}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Lihat & Ekspor PDF
              </Button>
              <Button
                onClick={handleCreateTrip}
                disabled={creatingTrip}
                variant="outline"
                className="w-full h-10 md:h-11 rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50 text-sm"
                style={M}
              >
                <Plane className="h-3.5 w-3.5 mr-1.5" />
                {creatingTrip ? "Membuat Trip…" : "Buat Trip"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUMMARY OUTPUT (private + umum modes) ── */}
      {quote && calc.mode !== "umroh_group" && (
        <div className="rounded-xl border-2 border-orange-300 bg-white overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-3 md:px-5 py-3 md:py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white"
            onClick={() => setShowSummary((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span style={M} className="font-extrabold text-[12px] md:text-[14px] uppercase tracking-wide">Ringkasan Kalkulasi</span>
            </div>
            {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showSummary && (
            <div className="p-3 md:p-4 space-y-3 md:space-y-4">

              {/* Main summary table */}
              <div className="overflow-x-auto rounded-xl border border-orange-200">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)" }}>
                      <Th>Komponen</Th>
                      <Th right>Total Grup (IDR)</Th>
                      <Th right>Per Pax (IDR)</Th>
                      <Th right>Referensi (SAR)</Th>
                      <Th right>Referensi (USD)</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(calc.mode === "umum"
                      ? quote.breakdown.map((b) => ({ label: b.label, idr: b.groupIDR, sar: b.notesSAR, usd: b.notesUSD }))
                      : [
                          { label: "🏨 Hotel / Penginapan", idr: quote.hotelIDR, sar: quote.breakdown.filter(b => b.category === "Hotel").reduce((s, b) => s + b.notesSAR, 0), usd: 0 },
                          { label: "🚌 Transportasi", idr: quote.transportIDR, sar: quote.breakdown.filter(b => b.category === "Transport").reduce((s, b) => s + b.notesSAR, 0), usd: 0 },
                          { label: "✈️ Tiket Pesawat", idr: quote.ticketIDR, sar: 0, usd: quote.breakdown.filter(b => b.category === "Tiket").reduce((s, b) => s + b.notesUSD, 0) },
                          { label: "🛂 Visa", idr: quote.visaIDR, sar: quote.breakdown.filter(b => b.category === "Visa").reduce((s, b) => s + b.notesSAR, 0), usd: quote.breakdown.filter(b => b.category === "Visa").reduce((s, b) => s + b.notesUSD, 0) },
                          { label: "🗺️ Destinasi", idr: quote.destinationIDR, sar: quote.breakdown.filter(b => b.category === "Destinasi").reduce((s, b) => s + b.notesSAR, 0), usd: 0 },
                          { label: "🍽️ F&B / Konsumsi", idr: quote.fnbIDR, sar: quote.breakdown.filter(b => b.category === "F&B").reduce((s, b) => s + b.notesSAR, 0), usd: 0 },
                          { label: "👤 Staff / Guide", idr: quote.staffIDR, sar: quote.breakdown.filter(b => b.category === "Staff").reduce((s, b) => s + b.notesSAR, 0), usd: 0 },
                        ]
                    ).filter(r => r.idr > 0).map((r) => (
                      <tr key={r.label} className="hover:bg-orange-50/20">
                        <td style={M} className="px-3 py-2 text-[12px] border-b border-orange-50">{r.label}</td>
                        <td style={M} className="px-3 py-2 text-[12px] font-semibold text-right border-b border-orange-50 font-mono">{formatCurrency(r.idr)}</td>
                        <td style={M} className="px-3 py-2 text-[12px] text-right text-muted-foreground border-b border-orange-50 font-mono">{formatCurrency(r.idr / safePax)}</td>
                        <td style={M} className="px-3 py-2 text-[11px] text-right text-slate-600 border-b border-orange-50 font-mono">{r.sar > 0 ? fmtSAR(r.sar) : "—"}</td>
                        <td style={M} className="px-3 py-2 text-[11px] text-right text-slate-600 border-b border-orange-50 font-mono">{r.usd > 0 ? fmtUSD(r.usd) : "—"}</td>
                      </tr>
                    ))}

                    {/* HPP row */}
                    <tr style={{ background: "#fff7ed" }}>
                      <td style={M} className="px-3 py-2.5 text-[12px] font-extrabold text-orange-800 border-t-2 border-orange-300">
                        💰 TOTAL BUDGET (HPP)
                      </td>
                      <td style={M} className="px-3 py-2.5 text-[13px] font-extrabold text-orange-800 text-right border-t-2 border-orange-300 font-mono">{formatCurrency(quote.hpp)}</td>
                      <td style={M} className="px-3 py-2.5 text-[12px] font-bold text-orange-700 text-right border-t-2 border-orange-300 font-mono">{formatCurrency(quote.hpp / safePax)}</td>
                      <td style={M} className="px-3 py-2.5 text-[11px] text-slate-600 text-right border-t-2 border-orange-300 font-mono">{fmtSAR(quote.totalSAR)}</td>
                      <td style={M} className="px-3 py-2.5 text-[11px] text-slate-600 text-right border-t-2 border-orange-300 font-mono">{fmtUSD(quote.totalUSD)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Selling price breakdown */}
              <div className="grid sm:grid-cols-2 gap-4">

                {/* Left: price build-up */}
                <div className="rounded-xl border border-orange-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-orange-50 border-b border-orange-200">
                    <p style={M} className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700">Pembentukan Harga Jual</p>
                  </div>
                  <div className="p-3 space-y-2">
                    {[
                      { label: "Total Budget (HPP)", value: quote.hpp, sub: `${formatCurrency(quote.hpp / safePax)}/pax`, color: "" },
                      { label: `+ Commission Fee Admin`, value: quote.commissionFee, sub: `${formatCurrency(quote.commissionFee / safePax)}/pax`, color: "text-amber-600" },
                      { label: `+ Profit Margin (${calc.marginPercent}%)`, value: quote.marginIDR, sub: `${formatCurrency(quote.marginIDR / safePax)}/pax`, color: "text-emerald-600" },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-2">
                        <div>
                          <p style={M} className={`text-[11px] font-semibold ${r.color || "text-[hsl(var(--foreground))]"}`}>{r.label}</p>
                          <p style={M} className="text-[10px] text-muted-foreground">{r.sub}</p>
                        </div>
                        <p style={M} className={`text-[12px] font-bold font-mono text-right ${r.color}`}>{formatCurrency(r.value)}</p>
                      </div>
                    ))}
                    <div className="border-t border-orange-200 pt-2 flex items-center justify-between">
                      <div>
                        <p style={M} className="text-[11px] font-bold text-orange-800">= Selling Price</p>
                        <p style={M} className="text-[10px] text-muted-foreground">{formatCurrency(quote.sellingPrice / safePax)}/pax</p>
                      </div>
                      <p style={M} className="text-[13px] font-extrabold text-orange-700 font-mono">{formatCurrency(quote.sellingPrice)}</p>
                    </div>
                    {calc.discount > 0 && (
                      <div className="flex items-center justify-between">
                        <p style={M} className="text-[11px] font-semibold text-red-600">- Discount</p>
                        <p style={M} className="text-[12px] font-bold text-red-600 font-mono">- {formatCurrency(quote.discount)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: final price & net profit */}
                <div className="space-y-3">
                  <div
                    className="rounded-xl p-4 text-white relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg,#ea580c,#f97316 60%,#fb923c)" }}
                  >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 90% 10%,white 0%,transparent 55%)" }} />
                    <div className="relative">
                      <p style={M} className="text-[10px] font-bold uppercase tracking-wide opacity-75">Harga Jual Final</p>
                      <p style={M} className="text-xl md:text-2xl font-extrabold mt-1 font-mono">{formatCurrency(quote.finalPrice)}</p>
                      <div className="mt-2.5 pt-2.5 border-t border-white/20 grid grid-cols-2 gap-2">
                        <div>
                          <p style={M} className="text-[10px] opacity-70">Per Pax ({safePax} pax)</p>
                          <p style={M} className="text-sm md:text-base font-bold font-mono">{formatCurrency(quote.perPaxFinal)}</p>
                        </div>
                        <div>
                          <p style={M} className="text-[10px] opacity-70">HPP per Pax</p>
                          <p style={M} className="text-sm md:text-base font-bold font-mono">{formatCurrency(quote.hpp / safePax)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net profit card */}
                  <div className={cn(
                    "rounded-xl border p-3 md:p-4",
                    quote.netProfit >= 0
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-red-50 border-red-200"
                  )}>
                    <p style={M} className={`text-[10px] font-extrabold uppercase tracking-wider ${quote.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      Net Profit
                    </p>
                    <p style={M} className={`text-lg md:text-xl font-extrabold font-mono mt-0.5 ${quote.netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {quote.netProfit >= 0 ? "+" : ""}{formatCurrency(quote.netProfit)}
                    </p>
                    <p style={M} className="text-[10px] text-muted-foreground mt-0.5">
                      {formatCurrency(quote.netProfit / safePax)}/pax
                      {quote.netProfit < 0 && " ⚠️ di bawah modal!"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      onClick={() => setPdfOpen(true)}
                      disabled={quote.finalPrice === 0}
                      className="w-full h-9 md:h-11 rounded-xl gradient-primary text-white text-sm"
                      style={M}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> Lihat & Ekspor PDF
                    </Button>
                    <Button
                      onClick={handleCreateTrip}
                      disabled={creatingTrip || quote.finalPrice === 0}
                      variant="outline"
                      className="w-full h-9 md:h-11 rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50 text-sm"
                      style={M}
                    >
                      <Plane className="h-3.5 w-3.5 mr-1.5" />
                      {creatingTrip ? "Membuat Trip…" : "Buat Trip"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <PdfPreviewDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        data={{
          packageName: calc.packageName || "Paket Trip IGH Tour",
          destination: calc.destination || "Destinasi Trip",
          people: calc.pax,
          currency: "IDR",
          costs: pdfCosts,
          total: quote.finalPrice,
          perPerson: quote.perPaxFinal,
          offer: offerData,
          simple: simplePdfData,
          canvasTemplate: activeTemplate ?? undefined,
          bindingCtx,
        }}
      />

      <CanvasTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editingTemplateId ? templates.find((t) => t.id === editingTemplateId) ?? null : null}
        ctx={bindingCtx}
        onSave={handleTemplateSave}
      />
    </div>
  );
}
