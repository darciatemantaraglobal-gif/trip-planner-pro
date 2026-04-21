import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  FileText, Calculator as CalcIcon, Plane, Bus, Train, Car,
  BedDouble, Users, Wallet, TrendingUp, Moon, Globe,
} from "lucide-react";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { useRatesStore } from "@/store/ratesStore";
import { useRegional } from "@/lib/regional";
import type { Currency } from "@/lib/exchangeRates";

type TripMode = "umroh" | "umum";
type RoomType = "double" | "triple" | "quad";

const ROOM_TYPES: { value: RoomType; label: string; pax: number }[] = [
  { value: "double", label: "Double", pax: 2 },
  { value: "triple", label: "Triple", pax: 3 },
  { value: "quad", label: "Quad", pax: 4 },
];

const CURRENCIES: Currency[] = ["IDR", "SAR", "USD"];

const CURRENCY_COLORS: Record<Currency, string> = {
  IDR: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  SAR: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  USD: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
};

function CurrencyToggle({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (v: Currency) => void;
}) {
  const next = () => {
    const idx = CURRENCIES.indexOf(value);
    onChange(CURRENCIES[(idx + 1) % CURRENCIES.length]);
  };
  return (
    <button
      type="button"
      onClick={next}
      title="Klik untuk ganti mata uang"
      className={`shrink-0 h-8 md:h-9 px-2 md:px-2.5 rounded-lg border text-[10px] md:text-[11px] font-bold transition-colors ${CURRENCY_COLORS[value]}`}
    >
      {value}
    </button>
  );
}

const TRANSPORT_OPTIONS = [
  { value: "saudia", label: "Saudia Airlines", icon: Plane },
  { value: "emirates", label: "Emirates", icon: Plane },
  { value: "etihad", label: "Etihad Airways", icon: Plane },
  { value: "qatar", label: "Qatar Airways", icon: Plane },
  { value: "garuda", label: "Garuda Indonesia", icon: Plane },
  { value: "lionair", label: "Lion Air", icon: Plane },
  { value: "batik", label: "Batik Air", icon: Plane },
  { value: "citilink", label: "Citilink", icon: Plane },
  { value: "airasia", label: "AirAsia", icon: Plane },
  { value: "bus", label: "Bus", icon: Bus },
  { value: "kereta", label: "Kereta", icon: Train },
  { value: "van", label: "Van / Hiace", icon: Car },
  { value: "custom", label: "Lainnya (ketik sendiri)", icon: Car },
];

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const d = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  return Math.max(0, Math.round(d));
}

interface Transport {
  jenis: string;
  customJenis: string;
  harga: number;
  currency: Currency;
}

interface FormState {
  namaPaket: string;
  pax: number;
  hotelMakkah: string;
  hargaMakkah: number;
  hargaMakkahCurrency: Currency;
  tipeKamarMakkah: RoomType;
  fbMakkah: boolean;
  startMakkah: string;
  endMakkah: string;
  hotelMadinah: string;
  hargaMadinah: number;
  hargaMadinahCurrency: Currency;
  tipeKamarMadinah: RoomType;
  fbMadinah: boolean;
  startMadinah: string;
  endMadinah: string;
  visaUmroh: number;
  visaUmrohCurrency: Currency;
  komisiFee: number;
  komisiFeeurrency: Currency;
  muthowif: number;
  muthowifCurrency: Currency;
  siskopatuh: number;
  siskopatuhCurrency: Currency;
  zamZam: number;
  zamZamCurrency: Currency;
  handlingBandara: number;
  handlingBandaraCurrency: Currency;
  transports: Transport[];
  margin: number;
  localRateSAR: number;
  localRateUSD: number;
}

const initForm: FormState = {
  namaPaket: "",
  pax: 1,
  hotelMakkah: "",
  hargaMakkah: 0,
  hargaMakkahCurrency: "SAR",
  tipeKamarMakkah: "double",
  fbMakkah: false,
  startMakkah: "",
  endMakkah: "",
  hotelMadinah: "",
  hargaMadinah: 0,
  hargaMadinahCurrency: "SAR",
  tipeKamarMadinah: "double",
  fbMadinah: false,
  startMadinah: "",
  endMadinah: "",
  visaUmroh: 0,
  visaUmrohCurrency: "IDR",
  komisiFee: 0,
  komisiFeeurrency: "IDR",
  muthowif: 0,
  muthowifCurrency: "IDR",
  siskopatuh: 0,
  siskopatuhCurrency: "IDR",
  zamZam: 0,
  zamZamCurrency: "IDR",
  handlingBandara: 0,
  handlingBandaraCurrency: "IDR",
  transports: Array.from({ length: 6 }, () => ({ jenis: "", customJenis: "", harga: 0, currency: "IDR" as Currency })),
  margin: 10,
  localRateSAR: 0,
  localRateUSD: 0,
};

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">{children}</div>;
}

function RoomTypeSelector({ value, onChange }: { value: RoomType; onChange: (v: RoomType) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50/60 p-0.5 self-start">
      {ROOM_TYPES.map((rt) => (
        <button
          key={rt.value}
          type="button"
          onClick={() => onChange(rt.value)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
            value === rt.value
              ? "bg-orange-500 text-white shadow-sm"
              : "text-orange-600 hover:bg-orange-100"
          }`}
        >
          {rt.label}
        </button>
      ))}
    </div>
  );
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
        <Label className="text-[11px] md:text-[12px] font-semibold text-[hsl(var(--foreground))] leading-tight">
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

function NumInputWithCurrency({
  value,
  onChange,
  currency,
  onCurrencyChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-1.5">
      <Input
        type="number"
        min={0}
        placeholder={placeholder ?? "0"}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 md:h-9 text-[13px] md:text-sm flex-1 min-w-0 bg-white"
      />
      <CurrencyToggle value={currency} onChange={onCurrencyChange} />
    </div>
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
      <span className="text-[11px] font-extrabold text-orange-600 uppercase tracking-wide">
        {label}
      </span>
      <div className="h-px flex-1 bg-orange-100" />
    </div>
  );
}

export default function Calculator() {
  const rates = useRatesStore((s) => s.rates);
  const { formatCurrency } = useRegional();
  const [form, setForm] = useState<FormState>(initForm);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [tripMode, setTripMode] = useState<TripMode>("umroh");

  const isUmroh = tripMode === "umroh";
  const labels = {
    hotel1: isUmroh ? "Penginapan Makkah" : "Penginapan 1",
    hotel2: isUmroh ? "Penginapan Madinah" : "Penginapan 2",
    visa: isUmroh ? "Visa Umroh" : "Visa / Izin Masuk",
    muthowif: isUmroh ? "Muthowif" : "Tour Leader",
    siskopatuh: "Siskopatuh",
    zamzam: isUmroh ? "ZamZam" : "Oleh-oleh / Souvenir",
    headerTitle: isUmroh ? "Kalkulator Paket Umroh" : "Kalkulator Paket Trip",
    headerSub: isUmroh ? "Umrah & Haji" : "Perjalanan Wisata",
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setTransport = (i: number, field: keyof Transport, value: string | number | Currency) =>
    setForm((f) => {
      const t = [...f.transports];
      t[i] = { ...t[i], [field]: value };
      return { ...f, transports: t };
    });

  const effectiveRates = useMemo(() => ({
    SAR: form.localRateSAR > 0 ? form.localRateSAR : (rates["SAR"] ?? 1),
    USD: form.localRateUSD > 0 ? form.localRateUSD : (rates["USD"] ?? 1),
    IDR: 1,
  }), [form.localRateSAR, form.localRateUSD, rates]);

  const toIDR = (amount: number, currency: Currency): number => {
    if (currency === "IDR") return amount;
    return amount * (effectiveRates[currency as "SAR" | "USD"] ?? 1);
  };

  const nightsMakkah = daysBetween(form.startMakkah, form.endMakkah);
  const nightsMadinah = daysBetween(form.startMadinah, form.endMadinah);

  const roomPaxMakkah = ROOM_TYPES.find((r) => r.value === form.tipeKamarMakkah)?.pax ?? 2;
  const roomPaxMadinah = ROOM_TYPES.find((r) => r.value === form.tipeKamarMadinah)?.pax ?? 2;

  const summary = useMemo(() => {
    // Hotel: harga/kamar ÷ occupancy × total pax × malam
    const hotelMakkahIDR =
      (toIDR(form.hargaMakkah, form.hargaMakkahCurrency) / roomPaxMakkah) *
      form.pax *
      nightsMakkah;
    const hotelMadinahIDR =
      (toIDR(form.hargaMadinah, form.hargaMadinahCurrency) / roomPaxMadinah) *
      form.pax *
      nightsMadinah;

    // Per-pax costs (visa, siskopatuh, zamzam, komisi) → dikali jumlah pax
    const perPaxItemsIDR =
      (toIDR(form.visaUmroh, form.visaUmrohCurrency) +
        toIDR(form.siskopatuh, form.siskopatuhCurrency) +
        toIDR(form.zamZam, form.zamZamCurrency) +
        toIDR(form.komisiFee, form.komisiFeeurrency)) *
      form.pax;

    // Group costs (muthowif, handling bandara) → biaya total grup, TIDAK dikali pax
    const grupCostIDR =
      toIDR(form.muthowif, form.muthowifCurrency) +
      toIDR(form.handlingBandara, form.handlingBandaraCurrency);

    const transportIDR = form.transports.reduce(
      (s, t) => s + toIDR(t.harga, t.currency),
      0
    );
    const subtotal = hotelMakkahIDR + hotelMadinahIDR + perPaxItemsIDR + grupCostIDR + transportIDR;
    const marginAmt = (subtotal * form.margin) / 100;
    const total = subtotal + marginAmt;
    const perPerson = form.pax > 0 ? total / form.pax : 0;

    return {
      hotelMakkahIDR,
      hotelMadinahIDR,
      perPaxItemsIDR,
      grupCostIDR,
      transportIDR,
      subtotal,
      marginAmt,
      total,
      perPerson,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, rates, nightsMakkah, nightsMadinah, roomPaxMakkah, roomPaxMadinah]);

  const makkahRoomLabel = ROOM_TYPES.find((r) => r.value === form.tipeKamarMakkah)?.label ?? "";
  const madinahRoomLabel = ROOM_TYPES.find((r) => r.value === form.tipeKamarMadinah)?.label ?? "";

  const pdfCosts = [
    ...(summary.hotelMakkahIDR > 0
      ? [{ id: "hotel-makkah", label: `${labels.hotel1} — ${makkahRoomLabel} (${nightsMakkah} malam × ${form.pax} pax)${form.fbMakkah ? " · incl. F&B" : ""}`, amount: summary.hotelMakkahIDR }]
      : []),
    ...(summary.hotelMadinahIDR > 0
      ? [{ id: "hotel-madinah", label: `${labels.hotel2} — ${madinahRoomLabel} (${nightsMadinah} malam × ${form.pax} pax)${form.fbMadinah ? " · incl. F&B" : ""}`, amount: summary.hotelMadinahIDR }]
      : []),
    ...(toIDR(form.visaUmroh, form.visaUmrohCurrency) * form.pax > 0
      ? [{ id: "visa", label: `${labels.visa} (${form.pax} pax)`, amount: toIDR(form.visaUmroh, form.visaUmrohCurrency) * form.pax }]
      : []),
    ...(isUmroh && toIDR(form.siskopatuh, form.siskopatuhCurrency) * form.pax > 0
      ? [{ id: "sisko", label: `${labels.siskopatuh} (${form.pax} pax)`, amount: toIDR(form.siskopatuh, form.siskopatuhCurrency) * form.pax }]
      : []),
    ...(toIDR(form.zamZam, form.zamZamCurrency) * form.pax > 0
      ? [{ id: "zamzam", label: `${labels.zamzam} (${form.pax} pax)`, amount: toIDR(form.zamZam, form.zamZamCurrency) * form.pax }]
      : []),
    ...(toIDR(form.komisiFee, form.komisiFeeurrency) * form.pax > 0
      ? [{ id: "komisi", label: `Komisi Fee (${form.pax} pax)`, amount: toIDR(form.komisiFee, form.komisiFeeurrency) * form.pax }]
      : []),
    ...(toIDR(form.muthowif, form.muthowifCurrency) > 0
      ? [{ id: "muthowif", label: `${labels.muthowif} (biaya grup)`, amount: toIDR(form.muthowif, form.muthowifCurrency) }]
      : []),
    ...(toIDR(form.handlingBandara, form.handlingBandaraCurrency) > 0
      ? [{ id: "handling", label: `Handling Bandara (biaya grup)`, amount: toIDR(form.handlingBandara, form.handlingBandaraCurrency) }]
      : []),
    ...form.transports
      .map((t, i) => ({ ...t, i }))
      .filter((t) => t.harga > 0)
      .map((t) => ({
        id: `transport-${t.i}`,
        label: t.jenis
          ? `Transport ${t.i + 1} — ${t.jenis === "custom" && t.customJenis ? t.customJenis : (TRANSPORT_OPTIONS.find((o) => o.value === t.jenis)?.label ?? t.jenis)}`
          : `Transport ${t.i + 1}`,
        amount: toIDR(t.harga, t.currency),
      })),
  ];

  return (
    <div className="calculator-compact max-w-3xl mx-auto space-y-2.5 md:space-y-4">

      {/* ── Compact header row ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0 shadow-sm">
            <CalcIcon strokeWidth={2} className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-bold text-[hsl(var(--foreground))] leading-tight truncate">
              {labels.headerTitle}
            </h1>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight hidden sm:block">
              Klik badge <span className="font-semibold text-slate-500">IDR / SAR / USD</span> untuk ganti kurs per baris
            </p>
          </div>
        </div>
        {/* Mode Toggle */}
        <div className="flex items-center shrink-0 rounded-lg border border-orange-200 bg-orange-50/60 p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setTripMode("umroh")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              tripMode === "umroh" ? "bg-orange-500 text-white shadow-sm" : "text-orange-600 hover:bg-orange-100"
            }`}
          >
            <Moon className="h-3 w-3" />
            Umroh
          </button>
          <button
            type="button"
            onClick={() => setTripMode("umum")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              tripMode === "umum" ? "bg-orange-500 text-white shadow-sm" : "text-orange-600 hover:bg-orange-100"
            }`}
          >
            <Globe className="h-3 w-3" />
            Umum
          </button>
        </div>
      </div>

      {/* ─── Main form card ─── */}
      <div className="calculator-card rounded-xl border border-orange-200 bg-white overflow-hidden shadow-sm">

        {/* Thin top accent */}
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #ea580c, #f97316, #fb923c)" }} />

        <div className="calculator-card-body p-3 md:p-4 space-y-2.5 md:space-y-4">

          {/* ── Informasi Dasar ── */}
          <SectionLabel icon={Users} label="Informasi Dasar" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Nama Paket</Label>
              <Input
                placeholder="cth: Umrah Ramadhan 2026"
                value={form.namaPaket}
                onChange={(e) => set("namaPaket", e.target.value)}
                className="h-8 md:h-9 text-[13px] md:text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Jumlah Pax</Label>
              <Input
                type="number"
                min={1}
                value={form.pax || ""}
                onChange={(e) => set("pax", Math.max(1, Number(e.target.value)))}
                className="h-8 md:h-9 text-[13px] md:text-sm"
              />
            </div>
          </div>

          {/* Rates strip — editable inline */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Override Kurs (khusus form ini)</p>
            <div className="flex flex-wrap gap-2">
              {(["SAR", "USD"] as const).map((cur) => {
                const storeVal = rates[cur] ?? 0;
                const localVal = cur === "SAR" ? form.localRateSAR : form.localRateUSD;
                const active = localVal > 0;
                return (
                  <div key={cur} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors ${active ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200"}`}>
                    <span className="text-[10px] font-bold text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 shrink-0">{cur}</span>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">= Rp</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder={storeVal.toLocaleString("id-ID")}
                      value={localVal || ""}
                      onChange={(e) => set(cur === "SAR" ? "localRateSAR" : "localRateUSD", Number(e.target.value))}
                      className="h-6 w-24 text-[11px] font-bold border-0 bg-transparent shadow-none p-0 focus-visible:ring-0"
                    />
                    {active && (
                      <button type="button" onClick={() => set(cur === "SAR" ? "localRateSAR" : "localRateUSD", 0)}
                        className="text-[10px] text-orange-400 hover:text-orange-600 font-medium shrink-0">↩</button>
                    )}
                    {!active && <span className="text-[10px] text-slate-400 italic">(dari Pengaturan)</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Penginapan 1 ── */}
          <SectionLabel icon={BedDouble} label={labels.hotel1} />

          <div className="rounded-lg bg-orange-50/50 border border-orange-100 p-2.5 space-y-2">
            <FieldRow>
              <FormField label="Nama Penginapan">
                <Input
                  placeholder="Nama hotel / penginapan"
                  value={form.hotelMakkah}
                  onChange={(e) => set("hotelMakkah", e.target.value)}
                  className="h-8 md:h-9 text-[13px] md:text-sm bg-white"
                />
              </FormField>
              <FormField label="Harga / Kamar / Malam" suffix="/ kamar / mlm">
                <NumInputWithCurrency
                  value={form.hargaMakkah}
                  onChange={(v) => set("hargaMakkah", v)}
                  currency={form.hargaMakkahCurrency}
                  onCurrencyChange={(c) => set("hargaMakkahCurrency", c)}
                />
              </FormField>
            </FieldRow>

            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-[11px] md:text-[12px] font-semibold shrink-0">Tipe Kamar</Label>
              <RoomTypeSelector value={form.tipeKamarMakkah} onChange={(v) => set("tipeKamarMakkah", v)} />
              <span className="text-[10px] text-orange-500 font-medium">{roomPaxMakkah} orang/kamar</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => set("fbMakkah", !form.fbMakkah)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    form.fbMakkah
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-white text-slate-500 border-slate-200 hover:border-green-300"
                  }`}
                >
                  {form.fbMakkah ? "✓ Include F&B" : "Exclude F&B"}
                </button>
              </div>
            </div>

            <FieldRow>
              <FormField label="Tgl. Masuk">
                <Input
                  type="date"
                  value={form.startMakkah}
                  onChange={(e) => set("startMakkah", e.target.value)}
                  className="h-8 md:h-9 text-[13px] md:text-sm bg-white"
                />
              </FormField>
              <FormField label="Tgl. Keluar">
                <Input
                  type="date"
                  value={form.endMakkah}
                  onChange={(e) => set("endMakkah", e.target.value)}
                  className="h-8 md:h-9 text-[13px] md:text-sm bg-white"
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
                      · {form.hargaMakkah.toLocaleString("id-ID")} {form.hargaMakkahCurrency} ÷ {roomPaxMakkah} × {form.pax} pax × {nightsMakkah} mlm = {formatCurrency(summary.hotelMakkahIDR)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* ── Penginapan 2 ── */}
          <SectionLabel icon={BedDouble} label={labels.hotel2} />

          <div className="rounded-lg bg-orange-50/50 border border-orange-100 p-2.5 space-y-2">
            <FieldRow>
              <FormField label="Nama Penginapan">
                <Input
                  placeholder="Nama hotel / penginapan (opsional)"
                  value={form.hotelMadinah}
                  onChange={(e) => set("hotelMadinah", e.target.value)}
                  className="h-8 md:h-9 text-[13px] md:text-sm bg-white"
                />
              </FormField>
              <FormField label="Harga / Kamar / Malam" suffix="/ kamar / mlm">
                <NumInputWithCurrency
                  value={form.hargaMadinah}
                  onChange={(v) => set("hargaMadinah", v)}
                  currency={form.hargaMadinahCurrency}
                  onCurrencyChange={(c) => set("hargaMadinahCurrency", c)}
                />
              </FormField>
            </FieldRow>

            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-[11px] md:text-[12px] font-semibold shrink-0">Tipe Kamar</Label>
              <RoomTypeSelector value={form.tipeKamarMadinah} onChange={(v) => set("tipeKamarMadinah", v)} />
              <span className="text-[10px] text-orange-500 font-medium">{roomPaxMadinah} orang/kamar</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => set("fbMadinah", !form.fbMadinah)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    form.fbMadinah
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-white text-slate-500 border-slate-200 hover:border-green-300"
                  }`}
                >
                  {form.fbMadinah ? "✓ Include F&B" : "Exclude F&B"}
                </button>
              </div>
            </div>

            <FieldRow>
              <FormField label="Tgl. Masuk">
                <Input
                  type="date"
                  value={form.startMadinah}
                  onChange={(e) => set("startMadinah", e.target.value)}
                  className="h-8 md:h-9 text-[13px] md:text-sm bg-white"
                />
              </FormField>
              <FormField label="Tgl. Keluar">
                <Input
                  type="date"
                  value={form.endMadinah}
                  onChange={(e) => set("endMadinah", e.target.value)}
                  className="h-8 md:h-9 text-[13px] md:text-sm bg-white"
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
                      · {form.hargaMadinah.toLocaleString("id-ID")} {form.hargaMadinahCurrency} ÷ {roomPaxMadinah} × {form.pax} pax × {nightsMadinah} mlm = {formatCurrency(summary.hotelMadinahIDR)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* ── Biaya Per Pax ── */}
          <SectionLabel icon={Wallet} label="Biaya Per Pax" />

          <div className="rounded-lg bg-orange-50/50 border border-orange-100 p-2.5 space-y-2">
            <p className="text-[10px] text-orange-500 font-medium -mt-0.5">
              Biaya per orang — otomatis dikali jumlah pax.
            </p>
            <FieldRow>
              <FormField label={labels.visa} suffix="/ pax">
                <NumInputWithCurrency
                  value={form.visaUmroh}
                  onChange={(v) => set("visaUmroh", v)}
                  currency={form.visaUmrohCurrency}
                  onCurrencyChange={(c) => set("visaUmrohCurrency", c)}
                />
              </FormField>
              {isUmroh && (
                <FormField label={labels.siskopatuh} suffix="/ pax">
                  <NumInputWithCurrency
                    value={form.siskopatuh}
                    onChange={(v) => set("siskopatuh", v)}
                    currency={form.siskopatuhCurrency}
                    onCurrencyChange={(c) => set("siskopatuhCurrency", c)}
                  />
                </FormField>
              )}
            </FieldRow>
            <FieldRow>
              <FormField label={labels.zamzam} suffix="/ pax">
                <NumInputWithCurrency
                  value={form.zamZam}
                  onChange={(v) => set("zamZam", v)}
                  currency={form.zamZamCurrency}
                  onCurrencyChange={(c) => set("zamZamCurrency", c)}
                />
              </FormField>
              <FormField label="Komisi Fee" suffix="/ jamaah">
                <NumInputWithCurrency
                  value={form.komisiFee}
                  onChange={(v) => set("komisiFee", v)}
                  currency={form.komisiFeeurrency}
                  onCurrencyChange={(c) => set("komisiFeeurrency", c)}
                />
              </FormField>
            </FieldRow>
          </div>

          {/* ── Biaya Grup ── */}
          <SectionLabel icon={Users} label="Biaya Grup" />

          <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-2.5 space-y-2">
            <p className="text-[10px] text-blue-500 font-medium -mt-0.5">
              Biaya total grup — dibagi rata ke semua pax.
            </p>
            <FieldRow>
              <FormField label={labels.muthowif} suffix="total grup">
                <NumInputWithCurrency
                  value={form.muthowif}
                  onChange={(v) => set("muthowif", v)}
                  currency={form.muthowifCurrency}
                  onCurrencyChange={(c) => set("muthowifCurrency", c)}
                />
              </FormField>
              <FormField label="Handling Bandara" suffix="total grup">
                <NumInputWithCurrency
                  value={form.handlingBandara}
                  onChange={(v) => set("handlingBandara", v)}
                  currency={form.handlingBandaraCurrency}
                  onCurrencyChange={(c) => set("handlingBandaraCurrency", c)}
                />
              </FormField>
            </FieldRow>
            {summary.grupCostIDR > 0 && form.pax > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <p className="text-[11px] text-blue-700 font-semibold">
                  Total biaya grup: {formatCurrency(summary.grupCostIDR)}
                  <span className="ml-1.5 text-blue-500 font-normal">
                    · per pax = {formatCurrency(summary.grupCostIDR / form.pax)}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* ── Transportasi ── */}
          <SectionLabel icon={Plane} label="Transportasi" />

          <div className="rounded-lg bg-orange-50/50 border border-orange-100 p-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {form.transports.map((t, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-[11px] md:text-[12px] font-semibold">Transport {i + 1}</Label>
                  <div className="flex gap-1.5">
                    <Select
                      value={t.jenis}
                      onValueChange={(v) => setTransport(i, "jenis", v)}
                    >
                      <SelectTrigger className="h-8 md:h-9 text-[13px] md:text-sm flex-1 min-w-0 bg-white">
                        <SelectValue placeholder="Pilih maskapai / jenis" />
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
                      className="h-8 md:h-9 text-[13px] md:text-sm w-20 shrink-0 bg-white"
                    />
                    <CurrencyToggle
                      value={t.currency}
                      onChange={(c) => setTransport(i, "currency", c)}
                    />
                  </div>
                  {t.jenis === "custom" && (
                    <Input
                      placeholder="Ketik nama maskapai / kendaraan…"
                      value={t.customJenis}
                      onChange={(e) => setTransport(i, "customJenis", e.target.value)}
                      className="h-8 text-[12px] bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Margin ── */}
          <SectionLabel icon={TrendingUp} label="Margin Keuntungan" />

          <div className="rounded-lg bg-orange-50/50 border border-orange-100 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] md:text-[12px] font-semibold">Persentase Margin</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-base md:text-xl font-extrabold text-orange-600">{form.margin}</span>
                <span className="text-xs md:text-sm font-bold text-orange-400">%</span>
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
      <div className="calculator-card rounded-xl border border-orange-200 bg-white overflow-hidden shadow-sm">

        {/* Summary header */}
        <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-orange-100 bg-orange-50/60">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-orange-500 flex items-center justify-center">
              <TrendingUp strokeWidth={2} className="h-3 w-3 text-white" />
            </div>
            <span className="font-bold text-[12px] text-orange-800">Ringkasan Biaya</span>
          </div>
          {summary.total > 0 && (
            <span className="text-[11px] font-bold text-orange-600 font-mono">{formatCurrency(summary.perPerson)}<span className="text-orange-400 font-normal"> / pax</span></span>
          )}
        </div>

        <div className="calculator-card-body p-3 md:p-4 grid md:grid-cols-2 gap-3 md:gap-4">
          {/* Breakdown list */}
          <div className="space-y-1">
            {[
              { label: `${labels.hotel1} — ${makkahRoomLabel} (${nightsMakkah} mlm × ${form.pax} pax)`, value: summary.hotelMakkahIDR, show: summary.hotelMakkahIDR > 0 },
              { label: `${labels.hotel2} — ${madinahRoomLabel} (${nightsMadinah} mlm × ${form.pax} pax)`, value: summary.hotelMadinahIDR, show: summary.hotelMadinahIDR > 0 },
              { label: `Biaya Per Pax (×${form.pax})`, value: summary.perPaxItemsIDR, show: summary.perPaxItemsIDR > 0 },
              { label: `Biaya Grup`, value: summary.grupCostIDR, show: summary.grupCostIDR > 0 },
              { label: "Transportasi", value: summary.transportIDR, show: summary.transportIDR > 0 },
            ]
              .filter((r) => r.show)
              .map((r) => (
                <div key={r.label} className="flex justify-between items-center py-1 border-b border-dashed border-orange-100">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] truncate pr-2">{r.label}</span>
                  <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] shrink-0 font-mono">{formatCurrency(r.value)}</span>
                </div>
              ))}

            {summary.subtotal === 0 && (
              <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50/50 py-3 text-center">
                <p className="text-[11px] text-orange-400 font-medium">Isi form di atas untuk melihat kalkulasi.</p>
              </div>
            )}

            {summary.subtotal > 0 && (
              <>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Subtotal</span>
                  <span className="text-[11px] font-semibold font-mono">{formatCurrency(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b-2 border-orange-200">
                  <span className="text-[11px] text-orange-600 font-semibold">Margin ({form.margin}%)</span>
                  <span className="text-[11px] font-bold text-orange-600 font-mono">+ {formatCurrency(summary.marginAmt)}</span>
                </div>
              </>
            )}
          </div>

          {/* Total highlight + actions */}
          <div className="flex flex-col gap-2">
            <div
              className="rounded-xl p-3 text-white relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)" }}
            >
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wide opacity-75">Harga Grup ({form.pax} pax)</p>
                  <p className="text-lg font-extrabold mt-0.5 tracking-tight font-mono">{formatCurrency(summary.total)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] opacity-75 uppercase tracking-wide font-semibold">Per Pax</p>
                  <p className="text-base font-bold font-mono">{formatCurrency(summary.perPerson)}</p>
                </div>
              </div>
              {summary.marginAmt > 0 && (
                <p className="text-[9px] opacity-60 mt-1.5 pt-1.5 border-t border-white/20">Margin {form.margin}%: {formatCurrency(summary.marginAmt)}</p>
              )}
            </div>

            <Button
              className="btn-primary w-full h-9 rounded-lg text-[12px]"
              onClick={() => setPdfOpen(true)}
              disabled={summary.total === 0}
            >
              <FileText strokeWidth={1.5} className="h-3.5 w-3.5 mr-1.5" />
              Ekspor PDF
            </Button>

            <Button
              variant="outline"
              className="w-full h-8 rounded-lg text-[11px] border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
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
