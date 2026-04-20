import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  FileText, Calculator as CalcIcon, Hotel, Plane, Bus, Ship, Train, Car,
  BedDouble, Users, Wallet, TrendingUp,
} from "lucide-react";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { useRatesStore } from "@/store/ratesStore";

const TRANSPORT_OPTIONS = [
  { value: "pesawat", label: "Pesawat", icon: Plane },
  { value: "bus", label: "Bus", icon: Bus },
  { value: "kereta", label: "Kereta", icon: Train },
  { value: "kapal", label: "Kapal", icon: Ship },
  { value: "van", label: "Van / Hiace", icon: Car },
  { value: "lainnya", label: "Lainnya", icon: Car },
];

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const d = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  return Math.max(0, Math.round(d));
}

function fmtIDR(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

interface Transport {
  jenis: string;
  harga: number;
}

interface FormState {
  namaPaket: string;
  pax: number;
  currency: "SAR" | "USD" | "IDR";
  manualRate: number;
  hotelMakkah: string;
  hargaMakkah: number;
  startMakkah: string;
  endMakkah: string;
  hotelMadinah: string;
  hargaMadinah: number;
  startMadinah: string;
  endMadinah: string;
  visaUmroh: number;
  muthowif: number;
  siskopatuh: number;
  zamZam: number;
  handlingBandara: number;
  transports: Transport[];
  margin: number;
}

const initForm: FormState = {
  namaPaket: "",
  pax: 1,
  currency: "SAR",
  manualRate: 0,
  hotelMakkah: "",
  hargaMakkah: 0,
  startMakkah: "",
  endMakkah: "",
  hotelMadinah: "",
  hargaMadinah: 0,
  startMadinah: "",
  endMadinah: "",
  visaUmroh: 0,
  muthowif: 0,
  siskopatuh: 0,
  zamZam: 0,
  handlingBandara: 0,
  transports: Array.from({ length: 6 }, () => ({ jenis: "", harga: 0 })),
  margin: 10,
};

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">{children}</div>;
}

function FormField({
  label,
  children,
  suffix,
}: {
  label: string;
  children: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <Label className="text-[12px] font-semibold text-[hsl(var(--foreground))] leading-tight">
          {label}
        </Label>
        {suffix && (
          <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded shrink-0">
            {suffix}
          </span>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      min={0}
      placeholder={placeholder ?? "0"}
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 text-sm"
    />
  );
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon?: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      {Icon && (
        <div className="h-5 w-5 rounded-md bg-orange-100 flex items-center justify-center shrink-0">
          <Icon className="h-3 w-3 text-orange-600" strokeWidth={2.5} />
        </div>
      )}
      <span className="text-[11px] font-extrabold text-orange-600 uppercase tracking-widest">
        {label}
      </span>
      <div className="h-px flex-1 bg-orange-100" />
    </div>
  );
}

export default function Calculator() {
  const rates = useRatesStore((s) => s.rates);
  const [form, setForm] = useState<FormState>(initForm);
  const [pdfOpen, setPdfOpen] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setTransport = (i: number, field: keyof Transport, value: string | number) =>
    setForm((f) => {
      const t = [...f.transports];
      t[i] = { ...t[i], [field]: value };
      return { ...f, transports: t };
    });

  const effectiveRate =
    form.currency === "IDR"
      ? 1
      : form.manualRate > 0
      ? form.manualRate
      : (rates[form.currency as "SAR" | "USD"] ?? 1);

  const toIDR = (amount: number) => {
    if (form.currency === "IDR") return amount;
    return amount * effectiveRate;
  };

  const nightsMakkah = daysBetween(form.startMakkah, form.endMakkah);
  const nightsMadinah = daysBetween(form.startMadinah, form.endMadinah);

  const summary = useMemo(() => {
    const hotelMakkahIDR = toIDR(form.hargaMakkah) * nightsMakkah;
    const hotelMadinahIDR = toIDR(form.hargaMadinah) * nightsMadinah;
    const perPaxIDR =
      toIDR(
        form.visaUmroh +
          form.muthowif +
          form.siskopatuh +
          form.zamZam +
          form.handlingBandara
      ) * form.pax;
    const transportIDR = form.transports.reduce((s, t) => s + toIDR(t.harga), 0);
    const subtotal = hotelMakkahIDR + hotelMadinahIDR + perPaxIDR + transportIDR;
    const marginAmt = (subtotal * form.margin) / 100;
    const total = subtotal + marginAmt;
    const perPerson = form.pax > 0 ? total / form.pax : 0;

    return {
      hotelMakkahIDR,
      hotelMadinahIDR,
      perPaxIDR,
      transportIDR,
      subtotal,
      marginAmt,
      total,
      perPerson,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, rates, nightsMakkah, nightsMadinah]);

  const currencyLabel = form.currency === "IDR" ? "IDR" : form.currency;

  const pdfCosts = [
    ...(summary.hotelMakkahIDR > 0
      ? [{ id: "hotel-makkah", label: `Penginapan 1 (${nightsMakkah} malam)`, amount: summary.hotelMakkahIDR }]
      : []),
    ...(summary.hotelMadinahIDR > 0
      ? [{ id: "hotel-madinah", label: `Penginapan 2 (${nightsMadinah} malam)`, amount: summary.hotelMadinahIDR }]
      : []),
    ...(toIDR(form.visaUmroh) * form.pax > 0
      ? [{ id: "visa", label: `Visa / Izin Masuk (${form.pax} pax)`, amount: toIDR(form.visaUmroh) * form.pax }]
      : []),
    ...(toIDR(form.muthowif) * form.pax > 0
      ? [{ id: "muthowif", label: `Tour Leader (${form.pax} pax)`, amount: toIDR(form.muthowif) * form.pax }]
      : []),
    ...(toIDR(form.siskopatuh) * form.pax > 0
      ? [{ id: "sisko", label: `Biaya Admin (${form.pax} pax)`, amount: toIDR(form.siskopatuh) * form.pax }]
      : []),
    ...(toIDR(form.zamZam) * form.pax > 0
      ? [{ id: "zamzam", label: `Oleh-oleh (${form.pax} pax)`, amount: toIDR(form.zamZam) * form.pax }]
      : []),
    ...(toIDR(form.handlingBandara) * form.pax > 0
      ? [{ id: "handling", label: `Handling Bandara (${form.pax} pax)`, amount: toIDR(form.handlingBandara) * form.pax }]
      : []),
    ...form.transports
      .map((t, i) => ({ ...t, i }))
      .filter((t) => t.harga > 0)
      .map((t) => ({
        id: `transport-${t.i}`,
        label: t.jenis
          ? `Transport ${t.i + 1} — ${TRANSPORT_OPTIONS.find((o) => o.value === t.jenis)?.label ?? t.jenis}`
          : `Transport ${t.i + 1}`,
        amount: toIDR(t.harga),
      })),
  ];

  const autoRate = form.currency !== "IDR" ? (rates[form.currency as "SAR" | "USD"] ?? 0) : 0;

  return (
    <div className="calculator-compact max-w-3xl mx-auto space-y-5">

      {/* Page title */}
      <div className="calculator-page-title">
        <h1 className="text-xl md:text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <CalcIcon strokeWidth={1.5} className="h-5 w-5 text-[hsl(var(--primary))]" />
          Kalkulator Paket Trip
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Hitung biaya paket trip secara otomatis, lalu ekspor ke PDF.
        </p>
      </div>

      {/* ─── Main form card ─── */}
      <div className="calculator-card rounded-2xl border border-orange-200 bg-white overflow-hidden shadow-card">

        {/* Branded header */}
        <div
          className="calculator-card-header px-6 py-5 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)" }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)",
            }}
          />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-igh-tour.png"
                  alt="IGH Tour"
                  className="h-8 w-auto object-contain brightness-0 invert"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
                    IGH Tour — Formulir Paket
                  </p>
                  <p className="text-lg font-extrabold leading-tight tracking-tight">
                    Kalkulator Paket Trip
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] opacity-70 uppercase tracking-wider">Pelopor Layanan</p>
              <p className="text-[11px] font-bold opacity-90">Land Arrangement</p>
              <p className="text-[11px] font-bold opacity-90">Umrah & Haji</p>
            </div>
          </div>
        </div>

        {/* Thin orange accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #f97316, #fdba74, #f97316)" }} />

        <div className="calculator-card-body p-4 md:p-6 space-y-5">

          {/* ── Informasi Dasar ── */}
          <SectionLabel icon={Users} label="Informasi Dasar" />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Mata Uang</Label>
              <Select
                value={form.currency}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, currency: v as FormState["currency"], manualRate: 0 }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR — Riyal</SelectItem>
                  <SelectItem value="USD">USD — Dollar</SelectItem>
                  <SelectItem value="IDR">IDR — Rupiah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Jumlah Pax</Label>
              <Input
                type="number"
                min={1}
                value={form.pax || ""}
                onChange={(e) => set("pax", Math.max(1, Number(e.target.value)))}
                className="h-9 text-sm"
              />
            </div>
            {form.currency !== "IDR" && (
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-semibold">1 {form.currency} = Rp</Label>
                  {form.manualRate > 0 && (
                    <button
                      type="button"
                      onClick={() => set("manualRate", 0)}
                      className="text-[10px] text-orange-500 hover:underline font-semibold"
                    >
                      Pakai otomatis
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  min={0}
                  placeholder={autoRate > 0 ? autoRate.toLocaleString("id-ID") : "cth: 4350"}
                  value={form.manualRate || ""}
                  onChange={(e) => set("manualRate", Number(e.target.value))}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {form.manualRate > 0
                    ? `Kurs manual: Rp ${form.manualRate.toLocaleString("id-ID")}`
                    : `Kurs otomatis: Rp ${autoRate.toLocaleString("id-ID")}`}
                </p>
              </div>
            )}
          </div>

          <FormField label="Nama Paket">
            <Input
              placeholder="cth: Umrah Ramadhan 2026, Bali Trip, dll"
              value={form.namaPaket}
              onChange={(e) => set("namaPaket", e.target.value)}
              className="h-9 text-sm"
            />
          </FormField>

          {/* ── Penginapan 1 ── */}
          <SectionLabel icon={BedDouble} label="Penginapan 1" />

          <div className="rounded-xl bg-orange-50/50 border border-orange-100 p-3.5 space-y-3">
            <FieldRow>
              <FormField label="Nama Penginapan">
                <Input
                  placeholder="Nama hotel / penginapan"
                  value={form.hotelMakkah}
                  onChange={(e) => set("hotelMakkah", e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </FormField>
              <FormField label="Harga / Malam" suffix={currencyLabel}>
                <NumInput value={form.hargaMakkah} onChange={(v) => set("hargaMakkah", v)} />
              </FormField>
            </FieldRow>

            <FieldRow>
              <FormField label="Tgl. Masuk">
                <Input
                  type="date"
                  value={form.startMakkah}
                  onChange={(e) => set("startMakkah", e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </FormField>
              <FormField label="Tgl. Keluar">
                <Input
                  type="date"
                  value={form.endMakkah}
                  onChange={(e) => set("endMakkah", e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </FormField>
            </FieldRow>

            {nightsMakkah > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                <p className="text-[11px] text-orange-700 font-semibold">
                  {nightsMakkah} malam
                  {form.hargaMakkah > 0 && (
                    <span className="ml-1.5 text-orange-500 font-normal">
                      · Total {fmtIDR(summary.hotelMakkahIDR)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* ── Penginapan 2 ── */}
          <SectionLabel icon={BedDouble} label="Penginapan 2" />

          <div className="rounded-xl bg-orange-50/50 border border-orange-100 p-3.5 space-y-3">
            <FieldRow>
              <FormField label="Nama Penginapan">
                <Input
                  placeholder="Nama hotel / penginapan (opsional)"
                  value={form.hotelMadinah}
                  onChange={(e) => set("hotelMadinah", e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </FormField>
              <FormField label="Harga / Malam" suffix={currencyLabel}>
                <NumInput value={form.hargaMadinah} onChange={(v) => set("hargaMadinah", v)} />
              </FormField>
            </FieldRow>

            <FieldRow>
              <FormField label="Tgl. Masuk">
                <Input
                  type="date"
                  value={form.startMadinah}
                  onChange={(e) => set("startMadinah", e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </FormField>
              <FormField label="Tgl. Keluar">
                <Input
                  type="date"
                  value={form.endMadinah}
                  onChange={(e) => set("endMadinah", e.target.value)}
                  className="h-9 text-sm bg-white"
                />
              </FormField>
            </FieldRow>

            {nightsMadinah > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                <p className="text-[11px] text-orange-700 font-semibold">
                  {nightsMadinah} malam
                  {form.hargaMadinah > 0 && (
                    <span className="ml-1.5 text-orange-500 font-normal">
                      · Total {fmtIDR(summary.hotelMadinahIDR)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* ── Biaya Per Pax ── */}
          <SectionLabel icon={Wallet} label="Biaya Per Pax" />

          <div className="rounded-xl bg-orange-50/50 border border-orange-100 p-3.5 space-y-3">
            <FieldRow>
              <FormField label="Visa / Izin Masuk" suffix="/ pax">
                <NumInput value={form.visaUmroh} onChange={(v) => set("visaUmroh", v)} placeholder={currencyLabel} />
              </FormField>
              <FormField label="Tour Leader" suffix="/ pax">
                <NumInput value={form.muthowif} onChange={(v) => set("muthowif", v)} placeholder={currencyLabel} />
              </FormField>
            </FieldRow>

            <FieldRow>
              <FormField label="Biaya Admin" suffix="/ pax">
                <NumInput value={form.siskopatuh} onChange={(v) => set("siskopatuh", v)} placeholder={currencyLabel} />
              </FormField>
              <FormField label="Oleh-oleh" suffix="/ pax">
                <NumInput value={form.zamZam} onChange={(v) => set("zamZam", v)} placeholder={currencyLabel} />
              </FormField>
            </FieldRow>

            <FieldRow>
              <FormField label="Handling Bandara" suffix="/ pax">
                <NumInput value={form.handlingBandara} onChange={(v) => set("handlingBandara", v)} placeholder={currencyLabel} />
              </FormField>
            </FieldRow>
          </div>

          {/* ── Transportasi ── */}
          <SectionLabel icon={Plane} label="Transportasi" />

          <div className="rounded-xl bg-orange-50/50 border border-orange-100 p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              {form.transports.map((t, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-[12px] font-semibold">Transport {i + 1}</Label>
                  <div className="flex gap-2">
                    <Select
                      value={t.jenis}
                      onValueChange={(v) => setTransport(i, "jenis", v)}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1 min-w-0 bg-white">
                        <SelectValue placeholder="Jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSPORT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Harga"
                      value={t.harga || ""}
                      onChange={(e) => setTransport(i, "harga", Number(e.target.value))}
                      className="h-9 text-sm w-24 shrink-0 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Margin ── */}
          <SectionLabel icon={TrendingUp} label="Margin Keuntungan" />

          <div className="rounded-xl bg-orange-50/50 border border-orange-100 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[12px] font-semibold">Persentase Margin</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-orange-600">{form.margin}</span>
                <span className="text-sm font-bold text-orange-400">%</span>
              </div>
            </div>
            <Slider
              value={[form.margin]}
              min={0}
              max={50}
              step={1}
              onValueChange={(v) => set("margin", v[0])}
            />
            <div className="flex justify-between text-[10px] text-orange-400 font-medium">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Summary card ─── */}
      <div className="calculator-card rounded-2xl border border-orange-200 bg-white shadow-card overflow-hidden">

        {/* Summary header */}
        <div className="calculator-card-header px-5 py-3 flex items-center gap-2 border-b border-orange-100"
          style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)" }}
        >
          <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
            <Hotel strokeWidth={1.5} className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-[14px] text-orange-800">Ringkasan Biaya</span>
        </div>

        <div className="calculator-card-body p-4 md:p-6 grid md:grid-cols-2 gap-6">
          {/* Breakdown list */}
          <div className="space-y-1.5">
            {[
              { label: `Penginapan 1 (${nightsMakkah} mlm)`, value: summary.hotelMakkahIDR, show: summary.hotelMakkahIDR > 0 },
              { label: `Penginapan 2 (${nightsMadinah} mlm)`, value: summary.hotelMadinahIDR, show: summary.hotelMadinahIDR > 0 },
              { label: `Biaya Per Pax (×${form.pax})`, value: summary.perPaxIDR, show: summary.perPaxIDR > 0 },
              { label: "Transportasi", value: summary.transportIDR, show: summary.transportIDR > 0 },
            ]
              .filter((r) => r.show)
              .map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between items-center py-1.5 border-b border-dashed border-orange-100"
                >
                  <span className="text-[12px] text-[hsl(var(--muted-foreground))]">{r.label}</span>
                  <span className="text-[12px] font-semibold text-[hsl(var(--foreground))]">{fmtIDR(r.value)}</span>
                </div>
              ))}

            {summary.subtotal === 0 && (
              <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 p-4 text-center">
                <p className="text-xs text-orange-400 font-medium">
                  Isi form di atas untuk melihat kalkulasi.
                </p>
              </div>
            )}

            {summary.subtotal > 0 && (
              <>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[12px] text-[hsl(var(--muted-foreground))]">Subtotal</span>
                  <span className="text-[12px] font-semibold">{fmtIDR(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b-2 border-orange-200">
                  <span className="text-[12px] text-orange-600 font-semibold">
                    Margin ({form.margin}%)
                  </span>
                  <span className="text-[12px] font-bold text-orange-600">
                    + {fmtIDR(summary.marginAmt)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Total highlight + actions */}
          <div className="flex flex-col gap-3">
            <div
              className="rounded-2xl p-5 text-white shadow-glow relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)" }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle at 90% 10%, white 0%, transparent 55%)",
                }}
              />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-75">
                  Total Paket
                </p>
                <p className="text-2xl font-extrabold mt-1 tracking-tight">
                  {fmtIDR(summary.total)}
                </p>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-[11px] opacity-75">Per orang ({form.pax} pax)</p>
                  <p className="text-lg font-bold mt-0.5">{fmtIDR(summary.perPerson)}</p>
                </div>
              </div>
            </div>

            <Button
              className="btn-primary w-full h-11 rounded-xl"
              onClick={() => setPdfOpen(true)}
              disabled={summary.total === 0}
            >
              <FileText strokeWidth={1.5} className="h-4 w-4 mr-2" />
              Ekspor PDF
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 rounded-xl text-sm border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
              onClick={() => setForm(initForm)}
            >
              Reset Form
            </Button>
          </div>
        </div>
      </div>

      <PdfPreviewDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        data={{
          packageName: form.namaPaket || "Paket Trip IGH Tour",
          destination:
            [form.hotelMakkah, form.hotelMadinah].filter(Boolean).join(" — ") || "Destinasi Trip",
          people: form.pax,
          currency: "IDR",
          costs: pdfCosts,
          total: summary.total,
          perPerson: summary.perPerson,
        }}
      />
    </div>
  );
}
