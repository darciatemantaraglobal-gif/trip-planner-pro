import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calculator, Calendar, CreditCard, FileKey, MapPin, Plus, Save, ScanLine, Trash2, Users } from "lucide-react";
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
import { computeQuote, type CostInput } from "@/features/calculator/pricing";
import { usePackages } from "@/features/packages/usePackages";
import { scanPassport } from "@/lib/ocrPassport";
import type { Currency } from "@/lib/exchangeRates";
import { cn } from "@/lib/utils";
import { useRatesStore } from "@/store/ratesStore";
import { useJamaahStore, type Jamaah } from "@/store/tripsStore";

interface PackageCalculatorState {
  packageName: string;
  destination: string;
  people: number;
  currency: Currency;
  marginPercent: number;
  costs: CostInput[];
}

const CALC_STORAGE_KEY = "travelhub.package.calculations.v1";

const defaultCosts: CostInput[] = [
  { id: "hotel", label: "Hotel / Penginapan", amount: 0 },
  { id: "ticket", label: "Tiket Pesawat / Transport", amount: 0 },
  { id: "visa", label: "Visa / Izin Masuk", amount: 0 },
  { id: "muthowif", label: "Muthowif / Tour Leader", amount: 0 },
  { id: "handling", label: "Handling Bandara", amount: 0 },
  { id: "other", label: "Biaya Lainnya", amount: 0 },
];

const statusVariant: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Calculated: "bg-primary/10 text-primary",
  Confirmed: "bg-warning/10 text-warning",
  Paid: "bg-success/10 text-success",
  Completed: "bg-emerald-500/10 text-emerald-600",
};

function fmtIDR(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readCalcStore(): Record<string, PackageCalculatorState> {
  try {
    const raw = localStorage.getItem(CALC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadPackageCalc(packageId: string, fallback: PackageCalculatorState): PackageCalculatorState {
  return readCalcStore()[packageId] ?? fallback;
}

function savePackageCalc(packageId: string, value: PackageCalculatorState) {
  const all = readCalcStore();
  all[packageId] = value;
  localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(all));
}

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
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Foto maks. 2 MB.");
      return;
    }
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
    if (!form.name.trim()) {
      toast.error("Nama jamaah wajib diisi.");
      return;
    }
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
        <DialogHeader>
          <DialogTitle>Tambah Jamaah ke Paket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-orange-800">Scan paspor otomatis</p>
              <p className="text-xs text-orange-700/80">Upload foto halaman paspor yang ada MRZ-nya.</p>
            </div>
            <input ref={ocrRef} type="file" accept="image/*" className="hidden" onChange={handleOcr} />
            <Button type="button" variant="outline" onClick={() => ocrRef.current?.click()} disabled={ocrLoading} className="rounded-xl border-orange-200 text-orange-700">
              <ScanLine className="h-4 w-4 mr-1.5" />
              {ocrLoading ? `Scan ${ocrProgress}%` : "Scan OCR"}
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

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, loading, update } = usePackages();
  const rates = useRatesStore((s) => s.rates);
  const { jamaah, loadingJamaah, fetchJamaah, removeJamaah } = useJamaahStore();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Jamaah | null>(null);
  const pkg = items.find((item) => item.id === id);
  const [calc, setCalc] = useState<PackageCalculatorState | null>(null);

  useEffect(() => {
    if (id) fetchJamaah(id);
  }, [id, fetchJamaah]);

  useEffect(() => {
    if (!id || !pkg) return;
    setCalc(loadPackageCalc(id, {
      packageName: pkg.name,
      destination: pkg.destination,
      people: Math.max(1, pkg.people),
      currency: "IDR",
      marginPercent: 10,
      costs: defaultCosts,
    }));
  }, [id, pkg?.id]);

  useEffect(() => {
    if (!id || !calc) return;
    savePackageCalc(id, calc);
  }, [id, calc]);

  const quote = useMemo(() => {
    if (!calc) return null;
    return computeQuote({
      costs: calc.costs,
      people: calc.people,
      currency: calc.currency,
      marginPercent: calc.marginPercent,
      rates,
    });
  }, [calc, rates]);

  const setCalcField = <K extends keyof PackageCalculatorState>(key: K, value: PackageCalculatorState[K]) =>
    setCalc((prev) => prev ? { ...prev, [key]: value } : prev);

  const updateCost = (idCost: string, patch: Partial<CostInput>) =>
    setCalc((prev) => prev ? { ...prev, costs: prev.costs.map((cost) => cost.id === idCost ? { ...cost, ...patch } : cost) } : prev);

  const addCost = () =>
    setCalc((prev) => prev ? { ...prev, costs: [...prev.costs, { id: `custom-${Date.now()}`, label: "Biaya tambahan", amount: 0 }] } : prev);

  const removeCost = (idCost: string) =>
    setCalc((prev) => prev ? { ...prev, costs: prev.costs.filter((cost) => cost.id !== idCost) } : prev);

  const syncToPackage = async () => {
    if (!id || !pkg || !calc || !quote) return;
    await update(id, {
      name: calc.packageName || pkg.name,
      destination: calc.destination || pkg.destination,
      people: calc.people,
      totalIDR: quote.finalPriceIDR,
      status: "Calculated",
    });
    toast.success("Kalkulator disimpan ke paket.");
  };

  const handleDeleteJamaah = async () => {
    if (!deleteTarget) return;
    await removeJamaah(deleteTarget.id);
    toast.success(`Jamaah "${deleteTarget.name}" dihapus.`);
    setDeleteTarget(null);
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Memuat detail paket…</div>;
  }

  if (!pkg) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Paket tidak ditemukan.</p>
        <Button variant="outline" onClick={() => navigate("/packages")}>Kembali ke Paket</Button>
      </div>
    );
  }

  if (!calc) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Menyiapkan kalkulator paket…</div>;
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/packages")} className="rounded-xl shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-3xl">{pkg.emoji}</span>
            <h1 className="text-2xl font-bold truncate">{pkg.name}</h1>
            <Badge className={`${statusVariant[pkg.status]} border-0`}>{pkg.status}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{pkg.destination}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{jamaah.length} jamaah / {pkg.people} pax</span>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Update {formatDate(pkg.updatedAt)}</span>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gradient-primary text-white rounded-xl shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Jamaah
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total paket</p>
          <p className="mt-1 text-xl font-bold text-orange-600">{fmtIDR(pkg.totalIDR)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Harga per jamaah</p>
          <p className="mt-1 text-xl font-bold">{fmtIDR(pkg.people > 0 ? pkg.totalIDR / pkg.people : 0)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Kelengkapan jamaah</p>
          <p className="mt-1 text-xl font-bold">{jamaah.length} / {pkg.people} pax</p>
        </div>
      </div>

      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="calculator" className="rounded-xl"><Calculator className="h-4 w-4 mr-1.5" />Kalkulator</TabsTrigger>
          <TabsTrigger value="jamaah" className="rounded-xl"><Users className="h-4 w-4 mr-1.5" />Jamaah</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-4">
          <div className="rounded-2xl border border-orange-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-orange-100 bg-orange-50/70">
              <h2 className="font-bold text-orange-800">Kalkulator paket ini</h2>
              <p className="text-xs text-orange-700/80">Hitungan disimpan khusus untuk card paket ini, lalu bisa disimpan ke total paket.</p>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nama Paket</Label>
                  <Input value={calc.packageName} onChange={(e) => setCalcField("packageName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Destinasi</Label>
                  <Input value={calc.destination} onChange={(e) => setCalcField("destination", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Jumlah Pax</Label>
                  <div className="flex gap-2">
                    <Input type="number" min={1} value={calc.people} onChange={(e) => setCalcField("people", Math.max(1, Number(e.target.value)))} />
                    <Button type="button" variant="outline" className="shrink-0 rounded-xl" onClick={() => setCalcField("people", Math.max(1, jamaah.length))}>Pakai jamaah</Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Mata Uang Biaya</Label>
                  <Select value={calc.currency} onValueChange={(value) => setCalcField("currency", value as Currency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR">IDR — Rupiah</SelectItem>
                      <SelectItem value="SAR">SAR — Riyal</SelectItem>
                      <SelectItem value="USD">USD — Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Margin {calc.marginPercent}%</Label>
                  <Slider value={[calc.marginPercent]} min={0} max={50} step={1} onValueChange={(value) => setCalcField("marginPercent", value[0])} className="pt-4" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Komponen biaya</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCost} className="rounded-xl">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Tambah biaya
                  </Button>
                </div>
                <div className="space-y-2">
                  {calc.costs.map((cost) => (
                    <div key={cost.id} className="grid grid-cols-[1fr_140px_36px] gap-2">
                      <Input value={cost.label} onChange={(e) => updateCost(cost.id, { label: e.target.value })} />
                      <Input type="number" min={0} value={cost.amount || ""} placeholder="0" onChange={(e) => updateCost(cost.id, { amount: Number(e.target.value) })} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCost(cost.id)} className="hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {quote && (
            <div className="rounded-2xl border bg-white p-4 md:p-5 grid gap-5 md:grid-cols-[1fr_280px]">
              <div className="space-y-2">
                <h3 className="font-bold">Breakdown biaya</h3>
                {quote.breakdown.filter((item) => item.amountIDR > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada biaya yang diisi.</p>
                ) : quote.breakdown.filter((item) => item.amountIDR > 0).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2 text-sm">
                    <span className="truncate">{item.label}</span>
                    <span className="font-semibold">{fmtIDR(item.amountIDR)}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 space-y-3">
                <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{fmtIDR(quote.totalIDR)}</strong></div>
                <div className="flex justify-between text-sm"><span>Margin</span><strong>{fmtIDR(quote.marginIDR)}</strong></div>
                <div className="pt-3 border-t border-orange-200">
                  <p className="text-xs text-orange-700">Total final</p>
                  <p className="text-2xl font-extrabold text-orange-600">{fmtIDR(quote.finalPriceIDR)}</p>
                  <p className="text-xs text-orange-700 mt-1">Per jamaah: {fmtIDR(quote.finalPerPersonIDR)}</p>
                </div>
                <Button onClick={syncToPackage} className="w-full gradient-primary text-white rounded-xl">
                  <Save className="h-4 w-4 mr-1.5" /> Simpan ke Paket
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="jamaah" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Jamaah paket ini</h2>
              <p className="text-sm text-muted-foreground">Daftar ini terpisah untuk paket “{pkg.name}”.</p>
            </div>
            <Button onClick={() => setAddOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-1.5" /> Tambah OCR
            </Button>
          </div>
          {loadingJamaah ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Memuat jamaah…</p>
          ) : jamaah.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] py-12 text-center space-y-3">
              <Users className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada jamaah di paket ini.</p>
              <Button onClick={() => setAddOpen(true)} className="rounded-xl gradient-primary text-white">Tambah Jamaah dengan OCR</Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {jamaah.map((person) => <JamaahMiniCard key={person.id} jamaah={person} onDelete={setDeleteTarget} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {id && <AddJamaahWithOcrDialog open={addOpen} packageId={id} onClose={() => setAddOpen(false)} />}

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