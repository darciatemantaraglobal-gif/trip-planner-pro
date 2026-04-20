import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Calculator, Calendar, CreditCard, FileKey, Layers,
  MapPin, Plus, Save, ScanLine, Trash2, Users, TrendingUp,
  Hotel, Bus, Globe, UserCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import BulkOcrDialog from "@/components/BulkOcrDialog";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  computeProfessionalQuote, computeGeneralQuote,
  type HotelRow, type TransportRow, type VisaRow,
  type DestinationRow, type StaffRow,
  type GeneralCostRow, type CalcCurrency, type CalcMode, type CostUnit,
} from "@/features/calculator/pricing";
import { usePackages } from "@/features/packages/usePackages";
import { scanPassport } from "@/lib/ocrPassport";
import { cn } from "@/lib/utils";
import { useRatesStore } from "@/store/ratesStore";
import { useJamaahStore, type Jamaah } from "@/store/tripsStore";
import { useRegional } from "@/lib/regional";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfessionalCalcState {
  mode: CalcMode;
  packageName: string;
  destination: string;
  pax: number;
  // Umroh mode fields
  hotels: HotelRow[];
  transports: TransportRow[];
  visas: VisaRow[];
  destinations: DestinationRow[];
  staffs: StaffRow[];
  // Umum mode fields
  generalCosts: GeneralCostRow[];
  // Shared financial params
  commissionFee: number;
  marginPercent: number;
  discount: number;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const CALC_STORAGE_KEY = "travelhub.package.calculations.v1";

function readCalcStore(): Record<string, ProfessionalCalcState> {
  try {
    const raw = localStorage.getItem(CALC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function loadPackageCalc(packageId: string, fallback: ProfessionalCalcState): ProfessionalCalcState {
  const stored = readCalcStore()[packageId];
  if (!stored) return fallback;
  return {
    ...fallback,
    ...stored,
    mode: (stored.mode === "umum" || stored.mode === "umroh") ? stored.mode : fallback.mode,
    hotels: stored.hotels ?? fallback.hotels,
    transports: stored.transports ?? fallback.transports,
    visas: stored.visas ?? fallback.visas,
    destinations: stored.destinations ?? fallback.destinations,
    staffs: stored.staffs ?? fallback.staffs,
    generalCosts: stored.generalCosts ?? fallback.generalCosts,
  };
}

function savePackageCalc(packageId: string, value: ProfessionalCalcState) {
  const all = readCalcStore();
  all[packageId] = value;
  localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(all));
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_GENERAL_COSTS: GeneralCostRow[] = [
  { id: "g1", label: "Penginapan", amount: 0, currency: "IDR", unit: "pax" },
  { id: "g2", label: "Transportasi", amount: 0, currency: "IDR", unit: "group" },
  { id: "g3", label: "Tiket & Aktivitas", amount: 0, currency: "IDR", unit: "pax" },
  { id: "g4", label: "Makanan & Minuman", amount: 0, currency: "IDR", unit: "pax" },
  { id: "g5", label: "Guide / Pemandu", amount: 0, currency: "IDR", unit: "group" },
];

function makeDefault(pax: number, name: string, dest: string): ProfessionalCalcState {
  return {
    mode: "umroh",
    packageName: name,
    destination: dest,
    pax,
    hotels: [
      { id: "h1", label: "Hotel Makkah", days: 4, pricePerNight: 0, rooms: 1 },
      { id: "h2", label: "Hotel Madinah", days: 3, pricePerNight: 0, rooms: 1 },
    ],
    transports: [{ id: "t1", label: "Bus Lokal", fleet: 1, pricePerFleet: 0 }],
    visas: [{ id: "v1", label: "Visa Umroh", pricePerPax: 0 }],
    destinations: [{ id: "d1", label: "Destinasi & F&B", pricePerPax: 0 }],
    staffs: [{ id: "s1", label: "Guide / Muthowif", totalCost: 0 }],
    generalCosts: DEFAULT_GENERAL_COSTS.map((c) => ({ ...c })),
    commissionFee: 0,
    marginPercent: 10,
    discount: 0,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const M = { fontFamily: "'Montserrat', sans-serif" };

function fmtSAR(v: number) {
  if (!v) return "—";
  return "SAR " + v.toLocaleString("id-ID");
}
function fmtUSD(v: number) {
  if (!v) return "—";
  return "USD " + v.toLocaleString("id-ID");
}

const statusVariant: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Calculated: "bg-primary/10 text-primary",
  Confirmed: "bg-warning/10 text-warning",
  Paid: "bg-success/10 text-success",
  Completed: "bg-emerald-500/10 text-emerald-600",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
      type="number"
      min={0}
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder={placeholder ?? "0"}
      style={M}
      className="w-full h-7 rounded-lg border border-orange-200 bg-white px-2 text-[12px] text-right focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
    />
  );
}

function TextCell({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? ""}
      style={M}
      className="w-full h-7 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
    />
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
        <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
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

function SubtotalRow({ label, sarAmount, usdAmount, groupIDR, perPaxIDR, formatCurrency }: {
  label: string;
  sarAmount?: number;
  usdAmount?: number;
  groupIDR: number;
  perPaxIDR: number;
  formatCurrency: (v: number) => string;
}) {
  return (
    <tr className="bg-orange-50/50">
      <td colSpan={2} style={M} className="px-2.5 py-2 text-[11px] font-extrabold text-orange-700 uppercase tracking-wider border-t-2 border-orange-200">
        {label}
      </td>
      {sarAmount !== undefined && (
        <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right text-blue-700 border-t-2 border-orange-200 font-mono">
          {fmtSAR(sarAmount)}
        </td>
      )}
      {usdAmount !== undefined && (
        <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right text-violet-700 border-t-2 border-orange-200 font-mono">
          {fmtUSD(usdAmount)}
        </td>
      )}
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

// ── AddJamaahDialog ───────────────────────────────────────────────────────────

function AddJamaahWithOcrDialog({ open, packageId, onClose }: { open: boolean; packageId: string; onClose: () => void }) {
  const addJamaah = useJamaahStore((s) => s.addJamaah);
  const photoRef = useRef<HTMLInputElement>(null);
  const ocrRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", birthDate: "", passportNumber: "", gender: "" as "L" | "P" | "" });
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const reset = () => {
    setForm({ name: "", phone: "", birthDate: "", passportNumber: "", gender: "" });
    setPhotoDataUrl(undefined);
    setOcrLoading(false);
    setOcrProgress(0);
  };

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Foto maks. 2 MB."); return; }
    setPhotoDataUrl(await fileToBase64(file));
    event.target.value = "";
  };

  const handleOcr = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const result = await scanPassport(file, setOcrProgress);
      setForm((prev) => ({
        ...prev,
        name: result.name || prev.name,
        birthDate: result.birthDate || prev.birthDate,
        passportNumber: result.passportNumber || prev.passportNumber,
        gender: result.gender || prev.gender,
      }));
      const found = Object.keys(result).length;
      if (found > 0) toast.success(`OCR berhasil, ${found} field terisi.`);
      else toast.warning("MRZ paspor belum kebaca. Coba foto yang lebih jelas.");
    } catch {
      toast.error("Gagal scan paspor.");
    } finally {
      setOcrLoading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) { toast.error("Nama jamaah wajib diisi."); return; }
    setSaving(true);
    try {
      await addJamaah({ ...form, tripId: packageId, photoDataUrl });
      toast.success(`Jamaah "${form.name}" ditambahkan.`);
      reset();
      onClose();
    } catch {
      toast.error("Gagal menyimpan jamaah.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader><DialogTitle>Tambah Jamaah ke Paket</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-orange-800">Scan paspor otomatis</p>
              <p className="text-xs text-orange-700/80">Upload foto halaman paspor yang ada MRZ-nya.</p>
            </div>
            <input ref={ocrRef} type="file" accept="image/*" className="hidden" onChange={handleOcr} />
            <Button type="button" variant="outline" onClick={() => ocrRef.current?.click()} disabled={ocrLoading} className="rounded-xl border-orange-200 text-orange-700">
              <ScanLine className="h-4 w-4 mr-1.5" />
              {ocrLoading ? (ocrProgress < 35 ? "Memuat AI…" : `OCR ${ocrProgress}%`) : "Scan OCR"}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => photoRef.current?.click()} className={cn("h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-xl shrink-0", form.gender === "P" ? "bg-pink-500" : "bg-blue-500")}>
              {photoDataUrl ? <img src={photoDataUrl} alt="Foto jamaah" className="h-full w-full object-cover" /> : (form.name.charAt(0).toUpperCase() || "?")}
            </button>
            <div className="flex-1">
              <Button type="button" variant="outline" onClick={() => photoRef.current?.click()} className="h-8 rounded-xl text-xs">Upload Foto</Button>
              <p className="text-[11px] text-muted-foreground mt-1">Opsional, maksimal 2 MB.</p>
              <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handlePhoto} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nama Lengkap *</Label>
            <Input value={form.name} placeholder="Nama sesuai paspor" onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jenis Kelamin</Label>
              <Select value={form.gender} onValueChange={(value) => setForm((prev) => ({ ...prev, gender: value as "L" | "P" }))}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>No. HP</Label>
              <Input value={form.phone} placeholder="08xx" onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tanggal Lahir</Label>
              <Input type="date" value={form.birthDate} onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>No. Paspor</Label>
              <Input value={form.passportNumber} placeholder="A1234567" onChange={(e) => setForm((prev) => ({ ...prev, passportNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Batal</Button>
            <Button type="submit" disabled={saving} className="gradient-primary text-white">
              {saving ? "Menyimpan…" : "Tambah Jamaah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JamaahMiniCard({ jamaah, onDelete }: { jamaah: Jamaah; onDelete: (jamaah: Jamaah) => void }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-3 flex items-center gap-3">
      <div className={cn("h-12 w-12 rounded-xl overflow-hidden flex items-center justify-center text-white font-bold shrink-0", jamaah.gender === "P" ? "bg-pink-500" : "bg-blue-500")}>
        {jamaah.photoDataUrl ? <img src={jamaah.photoDataUrl} alt={jamaah.name} className="h-full w-full object-cover" /> : jamaah.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{jamaah.name}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {jamaah.passportNumber && <span className="inline-flex items-center gap-1"><FileKey className="h-3 w-3" />{jamaah.passportNumber}</span>}
          {jamaah.phone && <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" />{jamaah.phone}</span>}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-500" onClick={() => onDelete(jamaah)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, loading, update } = usePackages();
  const rates = useRatesStore((s) => s.rates);
  const { formatCurrency, formatDate } = useRegional();
  const { jamaah, loadingJamaah, fetchJamaah, removeJamaah } = useJamaahStore();
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "jamaah" ? "jamaah" : "calculator");
  const [deleteTarget, setDeleteTarget] = useState<Jamaah | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const pkg = items.find((item) => item.id === id);
  const [calc, setCalc] = useState<ProfessionalCalcState | null>(null);

  useEffect(() => {
    if (id) fetchJamaah(id);
  }, [id, fetchJamaah]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    setActiveTab(tab === "jamaah" ? "jamaah" : "calculator");
    if (searchParams.get("ocr") === "1") {
      setAddOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("ocr");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!id || !pkg) return;
    setCalc(loadPackageCalc(id, makeDefault(Math.max(1, pkg.people), pkg.name, pkg.destination)));
  }, [id, pkg?.id]);

  useEffect(() => {
    if (!id || !calc) return;
    savePackageCalc(id, calc);
  }, [id, calc]);

  const quote = useMemo(() => {
    if (!calc) return null;
    if (calc.mode === "umum") {
      return computeGeneralQuote({ pax: calc.pax, costs: calc.generalCosts, commissionFee: calc.commissionFee, marginPercent: calc.marginPercent, discount: calc.discount, rates });
    }
    return computeProfessionalQuote({ ...calc, rates });
  }, [calc, rates]);

  // ── State updaters ──────────────────────────────────────────────────────────

  const setField = <K extends keyof ProfessionalCalcState>(key: K, value: ProfessionalCalcState[K]) =>
    setCalc((prev) => prev ? { ...prev, [key]: value } : prev);

  function updateHotel(rowId: string, patch: Partial<HotelRow>) {
    setCalc((prev) => prev ? { ...prev, hotels: prev.hotels.map((h) => h.id === rowId ? { ...h, ...patch } : h) } : prev);
  }
  function addHotel() {
    setCalc((prev) => prev ? { ...prev, hotels: [...prev.hotels, { id: `h${Date.now()}`, label: "Hotel", days: 1, pricePerNight: 0, rooms: 1 }] } : prev);
  }
  function removeHotel(rowId: string) {
    setCalc((prev) => prev ? { ...prev, hotels: prev.hotels.filter((h) => h.id !== rowId) } : prev);
  }

  function updateTransport(rowId: string, patch: Partial<TransportRow>) {
    setCalc((prev) => prev ? { ...prev, transports: prev.transports.map((t) => t.id === rowId ? { ...t, ...patch } : t) } : prev);
  }
  function addTransport() {
    setCalc((prev) => prev ? { ...prev, transports: [...prev.transports, { id: `t${Date.now()}`, label: "Transport", fleet: 1, pricePerFleet: 0 }] } : prev);
  }
  function removeTransport(rowId: string) {
    setCalc((prev) => prev ? { ...prev, transports: prev.transports.filter((t) => t.id !== rowId) } : prev);
  }

  function updateVisa(rowId: string, patch: Partial<VisaRow>) {
    setCalc((prev) => prev ? { ...prev, visas: prev.visas.map((v) => v.id === rowId ? { ...v, ...patch } : v) } : prev);
  }
  function addVisa() {
    setCalc((prev) => prev ? { ...prev, visas: [...prev.visas, { id: `v${Date.now()}`, label: "Visa", pricePerPax: 0 }] } : prev);
  }
  function removeVisa(rowId: string) {
    setCalc((prev) => prev ? { ...prev, visas: prev.visas.filter((v) => v.id !== rowId) } : prev);
  }

  function updateDest(rowId: string, patch: Partial<DestinationRow>) {
    setCalc((prev) => prev ? { ...prev, destinations: prev.destinations.map((d) => d.id === rowId ? { ...d, ...patch } : d) } : prev);
  }
  function addDest() {
    setCalc((prev) => prev ? { ...prev, destinations: [...prev.destinations, { id: `d${Date.now()}`, label: "Destinasi", pricePerPax: 0 }] } : prev);
  }
  function removeDest(rowId: string) {
    setCalc((prev) => prev ? { ...prev, destinations: prev.destinations.filter((d) => d.id !== rowId) } : prev);
  }

  function updateStaff(rowId: string, patch: Partial<StaffRow>) {
    setCalc((prev) => prev ? { ...prev, staffs: prev.staffs.map((s) => s.id === rowId ? { ...s, ...patch } : s) } : prev);
  }
  function addStaff() {
    setCalc((prev) => prev ? { ...prev, staffs: [...prev.staffs, { id: `s${Date.now()}`, label: "Guide", totalCost: 0 }] } : prev);
  }
  function removeStaff(rowId: string) {
    setCalc((prev) => prev ? { ...prev, staffs: prev.staffs.filter((s) => s.id !== rowId) } : prev);
  }

  function updateGeneralCost(rowId: string, patch: Partial<GeneralCostRow>) {
    setCalc((prev) => prev ? { ...prev, generalCosts: prev.generalCosts.map((c) => c.id === rowId ? { ...c, ...patch } : c) } : prev);
  }
  function addGeneralCost() {
    setCalc((prev) => prev ? { ...prev, generalCosts: [...prev.generalCosts, { id: `g${Date.now()}`, label: "Biaya Tambahan", amount: 0, currency: "IDR" as CalcCurrency, unit: "pax" as CostUnit }] } : prev);
  }
  function removeGeneralCost(rowId: string) {
    setCalc((prev) => prev ? { ...prev, generalCosts: prev.generalCosts.filter((c) => c.id !== rowId) } : prev);
  }

  const syncToPackage = async () => {
    if (!id || !pkg || !calc || !quote) return;
    await update(id, {
      name: calc.packageName || pkg.name,
      destination: calc.destination || pkg.destination,
      people: calc.pax,
      totalIDR: quote.finalPrice,
      status: "Calculated",
    });
    toast.success("Kalkulasi berhasil disimpan ke paket.");
  };

  const handleDeleteJamaah = async () => {
    if (!deleteTarget) return;
    await removeJamaah(deleteTarget.id);
    toast.success(`Jamaah "${deleteTarget.name}" dihapus.`);
    setDeleteTarget(null);
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Memuat detail paket…</div>;
  if (!pkg) return (
    <div className="py-20 text-center space-y-3">
      <p className="text-sm text-muted-foreground">Paket tidak ditemukan.</p>
      <Button variant="outline" onClick={() => navigate("/packages")}>Kembali ke Paket</Button>
    </div>
  );
  if (!calc) return <div className="py-12 text-center text-sm text-muted-foreground">Menyiapkan kalkulator paket…</div>;

  const sarRate = rates.SAR ?? 1;
  const usdRate = rates.USD ?? 1;
  const safePax = Math.max(1, calc.pax);

  return (
    <div className="space-y-3 md:space-y-5 max-w-5xl mx-auto" style={M}>

      {/* ── Header ── */}
      <div className="flex items-start gap-2 md:gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/packages")} className="rounded-xl shrink-0 h-8 w-8 md:h-10 md:w-10">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <span className="text-xl md:text-3xl">{pkg.emoji}</span>
            <h1 className="text-base md:text-2xl font-bold truncate" style={M}>{pkg.name}</h1>
            <Badge className={`${statusVariant[pkg.status]} border-0 text-[10px] px-1.5 py-0.5`}>{pkg.status}</Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 md:h-3.5 md:w-3.5" />{pkg.destination}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3 md:h-3.5 md:w-3.5" />{jamaah.length}/{pkg.people} pax</span>
            <span className="hidden sm:inline-flex items-center gap-1"><Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />{formatDate(pkg.updatedAt ?? "")}</span>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="gradient-primary text-white rounded-xl shrink-0 h-8 px-3 text-xs md:h-10 md:px-4 md:text-sm">
          <Plus className="h-3.5 w-3.5 mr-1" /> Jamaah
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="rounded-xl md:rounded-2xl border bg-white p-2.5 md:p-4">
          <p className="text-[10px] md:text-xs text-muted-foreground leading-tight" style={M}>Total paket</p>
          <p className="mt-0.5 text-sm md:text-xl font-bold text-orange-600 leading-tight truncate" style={M}>{formatCurrency(pkg.totalIDR)}</p>
        </div>
        <div className="rounded-xl md:rounded-2xl border bg-white p-2.5 md:p-4">
          <p className="text-[10px] md:text-xs text-muted-foreground leading-tight" style={M}>Per jamaah</p>
          <p className="mt-0.5 text-sm md:text-xl font-bold leading-tight truncate" style={M}>{formatCurrency(pkg.people > 0 ? pkg.totalIDR / pkg.people : 0)}</p>
        </div>
        <div className="rounded-xl md:rounded-2xl border bg-white p-2.5 md:p-4">
          <p className="text-[10px] md:text-xs text-muted-foreground leading-tight" style={M}>Jamaah</p>
          <p className="mt-0.5 text-sm md:text-xl font-bold leading-tight" style={M}>{jamaah.length} / {pkg.people}</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchParams({ tab: v }, { replace: true }); }} className="space-y-3 md:space-y-4">
        <TabsList className="grid w-full grid-cols-2 rounded-xl h-9 md:h-10 md:rounded-2xl">
          <TabsTrigger value="calculator" className="rounded-lg md:rounded-xl text-xs md:text-sm" style={M}>
            <Calculator className="h-3.5 w-3.5 mr-1 md:mr-1.5" />Kalkulator
          </TabsTrigger>
          <TabsTrigger value="jamaah" className="rounded-lg md:rounded-xl text-xs md:text-sm" style={M}>
            <Users className="h-3.5 w-3.5 mr-1 md:mr-1.5" />Jamaah
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════
            KALKULATOR TAB
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="calculator" className="space-y-3 md:space-y-4">

          {/* ── Mode switcher + kurs strip (combined row on mobile) ── */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-orange-200 bg-orange-50/50">
              {(["umroh", "umum"] as CalcMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setField("mode", m)}
                  style={M}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] md:text-[12px] font-bold transition-all",
                    calc.mode === m
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-orange-600 hover:bg-orange-100"
                  )}
                >
                  {m === "umroh" ? "🕌 Umroh" : "🗺️ Umum"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">SAR</span>
                <span className="text-[10px] text-muted-foreground">=</span>
                <span className="text-[10px] font-bold text-slate-800 font-mono">{sarRate.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase">USD</span>
                <span className="text-[10px] text-muted-foreground">=</span>
                <span className="text-[10px] font-bold text-slate-800 font-mono">{usdRate.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>

          {/* ── Package Info ── */}
          <div className="rounded-xl border border-orange-200 bg-white p-3 md:p-4 space-y-2.5 md:space-y-3">
            <p style={M} className="text-[10px] font-extrabold uppercase tracking-widest text-orange-600">Info Paket</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
              <div className="col-span-2 space-y-1">
                <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Nama Paket</label>
                <input
                  type="text"
                  value={calc.packageName}
                  onChange={(e) => setField("packageName", e.target.value)}
                  style={M}
                  className="w-full h-8 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div className="space-y-1">
                <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Destinasi</label>
                <input
                  type="text"
                  value={calc.destination}
                  onChange={(e) => setField("destination", e.target.value)}
                  style={M}
                  className="w-full h-8 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div className="space-y-1">
                <label style={M} className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Jumlah Pax</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={calc.pax || ""}
                    onChange={(e) => setField("pax", Math.max(1, Number(e.target.value)))}
                    style={M}
                    className="w-full h-8 rounded-lg border border-orange-200 bg-white px-2 text-[12px] text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                  <button
                    onClick={() => setField("pax", Math.max(1, jamaah.length))}
                    title="Pakai jumlah jamaah terdaftar"
                    style={M}
                    className="shrink-0 h-8 px-2 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-bold transition-colors"
                  >
                    ={jamaah.length}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ══ MODE-SPECIFIC INPUT SECTION ══ */}
          {calc.mode === "umroh" && (<>

          {/* ── HOTEL TABLE ── */}
          <div className="overflow-hidden rounded-xl border border-orange-200">
            <SectionHeader icon={Hotel} title="Apartment / Hotel" currency="SAR" color="bg-blue-500" onAdd={addHotel} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Nama Hotel</Th>
                    <Th right>Hari</Th>
                    <Th right>Harga/Malam (SAR)</Th>
                    <Th right>Kamar</Th>
                    <Th right>Total SAR</Th>
                    <Th right>Total IDR</Th>
                    <Th right>Per Pax IDR</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {calc.hotels.map((h) => {
                    const totalSAR = h.days * h.pricePerNight * h.rooms;
                    const totalIDR = totalSAR * sarRate;
                    return (
                      <tr key={h.id} className="hover:bg-orange-50/30 transition-colors">
                        <Td><TextCell value={h.label} onChange={(v) => updateHotel(h.id, { label: v })} placeholder="Nama hotel" /></Td>
                        <Td right><NumCell value={h.days} onChange={(v) => updateHotel(h.id, { days: v })} /></Td>
                        <Td right><NumCell value={h.pricePerNight} onChange={(v) => updateHotel(h.id, { pricePerNight: v })} /></Td>
                        <Td right><NumCell value={h.rooms} onChange={(v) => updateHotel(h.id, { rooms: v })} /></Td>
                        <Td right muted mono>{fmtSAR(totalSAR)}</Td>
                        <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                        <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                        <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeHotel(h.id)} /></td>
                      </tr>
                    );
                  })}
                  {quote && (
                    <SubtotalRow
                      label="SUBTOTAL HOTEL"
                      sarAmount={quote.breakdown.filter(b => b.category === "Hotel").reduce((s, b) => s + b.notesSAR, 0)}
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
            <SectionHeader icon={Bus} title="Transportasi" currency="SAR" color="bg-blue-600" onAdd={addTransport} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Nama Armada</Th>
                    <Th right>Jumlah Armada</Th>
                    <Th right>Harga/Armada (SAR)</Th>
                    <Th right>Total SAR</Th>
                    <Th right>Total IDR (Grup)</Th>
                    <Th right>Per Pax IDR</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {calc.transports.map((t) => {
                    const totalSAR = t.fleet * t.pricePerFleet;
                    const totalIDR = totalSAR * sarRate;
                    return (
                      <tr key={t.id} className="hover:bg-orange-50/30 transition-colors">
                        <Td><TextCell value={t.label} onChange={(v) => updateTransport(t.id, { label: v })} placeholder="cth: Bus Lokal" /></Td>
                        <Td right><NumCell value={t.fleet} onChange={(v) => updateTransport(t.id, { fleet: v })} /></Td>
                        <Td right><NumCell value={t.pricePerFleet} onChange={(v) => updateTransport(t.id, { pricePerFleet: v })} /></Td>
                        <Td right muted mono>{fmtSAR(totalSAR)}</Td>
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
                      groupIDR={quote.transportIDR}
                      perPaxIDR={quote.transportIDR / safePax}
                      formatCurrency={formatCurrency}
                    />
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── VISA TABLE ── */}
          <div className="overflow-hidden rounded-xl border border-orange-200">
            <SectionHeader icon={Globe} title="Visa" currency="USD" color="bg-violet-500" onAdd={addVisa} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Jenis Visa</Th>
                    <Th right>Harga/Pax (USD)</Th>
                    <Th right>Pax</Th>
                    <Th right>Total USD</Th>
                    <Th right>Total IDR (Grup)</Th>
                    <Th right>Per Pax IDR</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {calc.visas.map((v) => {
                    const totalUSD = v.pricePerPax * safePax;
                    const totalIDR = totalUSD * usdRate;
                    return (
                      <tr key={v.id} className="hover:bg-orange-50/30 transition-colors">
                        <Td><TextCell value={v.label} onChange={(val) => updateVisa(v.id, { label: val })} placeholder="cth: Visa Umroh" /></Td>
                        <Td right><NumCell value={v.pricePerPax} onChange={(val) => updateVisa(v.id, { pricePerPax: val })} /></Td>
                        <Td right muted>{safePax}</Td>
                        <Td right muted mono>{fmtUSD(totalUSD)}</Td>
                        <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                        <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                        <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeVisa(v.id)} /></td>
                      </tr>
                    );
                  })}
                  {quote && (
                    <SubtotalRow
                      label="SUBTOTAL VISA"
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

          {/* ── DESTINATION & F&B TABLE ── */}
          <div className="overflow-hidden rounded-xl border border-orange-200">
            <SectionHeader icon={Globe} title="Destinasi & F&B" currency="SAR / Pax" color="bg-emerald-500" onAdd={addDest} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Keterangan</Th>
                    <Th right>Harga/Pax (SAR)</Th>
                    <Th right>Pax</Th>
                    <Th right>Total SAR</Th>
                    <Th right>Total IDR (Grup)</Th>
                    <Th right>Per Pax IDR</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {calc.destinations.map((d) => {
                    const totalSAR = d.pricePerPax * safePax;
                    const totalIDR = totalSAR * sarRate;
                    return (
                      <tr key={d.id} className="hover:bg-orange-50/30 transition-colors">
                        <Td><TextCell value={d.label} onChange={(v) => updateDest(d.id, { label: v })} placeholder="cth: City Tour" /></Td>
                        <Td right><NumCell value={d.pricePerPax} onChange={(v) => updateDest(d.id, { pricePerPax: v })} /></Td>
                        <Td right muted>{safePax}</Td>
                        <Td right muted mono>{fmtSAR(totalSAR)}</Td>
                        <Td right bold mono>{formatCurrency(totalIDR)}</Td>
                        <Td right muted mono>{formatCurrency(totalIDR / safePax)}</Td>
                        <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeDest(d.id)} /></td>
                      </tr>
                    );
                  })}
                  {quote && (
                    <SubtotalRow
                      label="SUBTOTAL DESTINASI & F&B"
                      sarAmount={quote.breakdown.filter(b => b.category === "Destinasi & F&B").reduce((s, b) => s + b.notesSAR, 0)}
                      groupIDR={quote.destinationIDR}
                      perPaxIDR={quote.destinationIDR / safePax}
                      formatCurrency={formatCurrency}
                    />
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── STAFF TABLE ── */}
          <div className="overflow-hidden rounded-xl border border-orange-200">
            <SectionHeader icon={UserCheck} title="Staff Cost (Guide / Muthowif)" currency="SAR Total" color="bg-orange-500" onAdd={addStaff} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Jabatan / Nama</Th>
                    <Th right>Total Biaya (SAR)</Th>
                    <Th right>Total IDR (Grup)</Th>
                    <Th right>Per Pax IDR</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {calc.staffs.map((s) => {
                    const totalIDR = s.totalCost * sarRate;
                    return (
                      <tr key={s.id} className="hover:bg-orange-50/30 transition-colors">
                        <Td><TextCell value={s.label} onChange={(v) => updateStaff(s.id, { label: v })} placeholder="cth: Guide / Muthowif" /></Td>
                        <Td right><NumCell value={s.totalCost} onChange={(v) => updateStaff(s.id, { totalCost: v })} /></Td>
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

          {/* ── UMUM MODE TABLE ── */}
          {calc.mode === "umum" && (
            <div className="overflow-hidden rounded-xl border border-orange-200">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0 border-orange-200" style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)" }}>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center bg-orange-500">
                    <TrendingUp className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                  </div>
                  <span style={M} className="text-[12px] font-bold text-orange-800">Komponen Biaya</span>
                  <span style={M} className="text-[10px] font-semibold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded">IDR / SAR / USD</span>
                </div>
                <button
                  onClick={addGeneralCost}
                  style={M}
                  className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 rounded-lg px-2 py-1 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Tambah Baris
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>Nama Biaya</Th>
                      <Th right>Jumlah</Th>
                      <Th>Mata Uang</Th>
                      <Th>Basis</Th>
                      <Th right>Total IDR (Grup)</Th>
                      <Th right>Per Pax IDR</Th>
                      <Th> </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.generalCosts.map((c) => {
                      const qty = c.unit === "pax" ? safePax : 1;
                      const sarRate2 = rates.SAR ?? 1;
                      const usdRate2 = rates.USD ?? 1;
                      const groupIDR = c.currency === "IDR" ? c.amount * qty : c.currency === "SAR" ? c.amount * qty * sarRate2 : c.amount * qty * usdRate2;
                      return (
                        <tr key={c.id} className="hover:bg-orange-50/30 transition-colors">
                          <Td><TextCell value={c.label} onChange={(v) => updateGeneralCost(c.id, { label: v })} placeholder="cth: Penginapan" /></Td>
                          <Td right><NumCell value={c.amount} onChange={(v) => updateGeneralCost(c.id, { amount: v })} /></Td>
                          <Td>
                            <select
                              value={c.currency}
                              onChange={(e) => updateGeneralCost(c.id, { currency: e.target.value as CalcCurrency })}
                              style={M}
                              className="h-7 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400 w-full"
                            >
                              <option value="IDR">IDR</option>
                              <option value="SAR">SAR</option>
                              <option value="USD">USD</option>
                            </select>
                          </Td>
                          <Td>
                            <select
                              value={c.unit}
                              onChange={(e) => updateGeneralCost(c.id, { unit: e.target.value as CostUnit })}
                              style={M}
                              className="h-7 rounded-lg border border-orange-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400 w-full"
                            >
                              <option value="pax">Per Pax</option>
                              <option value="group">Per Grup</option>
                            </select>
                          </Td>
                          <Td right bold mono>{formatCurrency(groupIDR)}</Td>
                          <Td right muted mono>{formatCurrency(groupIDR / safePax)}</Td>
                          <td className="px-1 py-1.5 border-b border-orange-50"><DeleteBtn onClick={() => removeGeneralCost(c.id)} /></td>
                        </tr>
                      );
                    })}
                    {quote && calc.generalCosts.length > 0 && (
                      <tr className="bg-orange-50/50">
                        <td colSpan={4} style={M} className="px-2.5 py-2 text-[11px] font-extrabold text-orange-700 uppercase tracking-wider border-t-2 border-orange-200">
                          TOTAL BIAYA
                        </td>
                        <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right text-orange-700 border-t-2 border-orange-200 font-mono">
                          {formatCurrency(quote.hpp)}
                        </td>
                        <td style={M} className="px-2.5 py-2 text-[11px] font-bold text-right text-orange-600 border-t-2 border-orange-200 font-mono">
                          {formatCurrency(quote.hpp / safePax)}
                        </td>
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
              <p style={M} className="text-[10px] font-extrabold uppercase tracking-widest text-orange-700 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Parameter Finansial
              </p>
            </div>
            <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
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

          {/* ── SUMMARY OUTPUT TABLE ── */}
          {quote && (
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
                              { label: "🛂 Visa", idr: quote.visaIDR, sar: 0, usd: quote.breakdown.filter(b => b.category === "Visa").reduce((s, b) => s + b.notesUSD, 0) },
                              { label: "🗺️ Destinasi & F&B", idr: quote.destinationIDR, sar: quote.breakdown.filter(b => b.category === "Destinasi & F&B").reduce((s, b) => s + b.notesSAR, 0), usd: 0 },
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
                          <p style={M} className="text-[10px] font-bold uppercase tracking-widest opacity-75">Harga Jual Final</p>
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

                      <Button onClick={syncToPackage} className="w-full h-9 md:h-11 rounded-xl gradient-primary text-white text-sm" style={M}>
                        <Save className="h-3.5 w-3.5 mr-1.5" /> Simpan ke Paket
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            JAMAAH TAB
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="jamaah" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold" style={M}>Jamaah paket ini</h2>
              <p className="text-sm text-muted-foreground">Daftar ini terpisah untuk paket "{pkg.name}".</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setAddOpen(true)} className="rounded-xl">
                <Plus className="h-4 w-4 mr-1.5" /> Satu
              </Button>
              <Button onClick={() => setBulkOpen(true)} className="rounded-xl gradient-primary text-white">
                <Layers className="h-4 w-4 mr-1.5" /> Bulk Scan
              </Button>
            </div>
          </div>
          {loadingJamaah ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Memuat jamaah…</p>
          ) : jamaah.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] py-12 text-center space-y-4">
              <Users className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada jamaah di paket ini.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button variant="outline" onClick={() => setAddOpen(true)} className="rounded-xl">
                  <Plus className="h-4 w-4 mr-1.5" /> Tambah Satu Jamaah
                </Button>
                <Button onClick={() => setBulkOpen(true)} className="rounded-xl gradient-primary text-white">
                  <Layers className="h-4 w-4 mr-1.5" /> Bulk Scan Paspor
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {jamaah.map((person) => <JamaahMiniCard key={person.id} jamaah={person} onDelete={setDeleteTarget} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      {id && <AddJamaahWithOcrDialog open={addOpen} packageId={id} onClose={() => setAddOpen(false)} />}
      {id && (
        <BulkOcrDialog
          open={bulkOpen}
          tripId={id}
          onClose={() => { setBulkOpen(false); fetchJamaah(id); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(value) => !value && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jamaah?</AlertDialogTitle>
            <AlertDialogDescription>Data "{deleteTarget?.name}" akan dihapus dari paket ini.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJamaah} className="bg-red-500 hover:bg-red-600 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
