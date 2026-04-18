import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { FileText, Calculator as CalcIcon, Hotel, Plane, Bus, Ship, Train, Car } from "lucide-react";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { useRatesStore } from "@/store/ratesStore";
import type { LandArrangementOfferData, OfferPriceRow } from "@/lib/generatePdf";

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

const defaultIncluded = [
  "Akomodasi hotel Madinah & Makkah sesuai program.",
  "Makan fullboard.",
  "Mutawwifah raudah atau pembimbing masuk raudah untuk akhwat.",
  "Snack 4x trip.",
  "Handling kedatangan dan kepulangan di bandara.",
  "Meal box kedatangan dan kepulangan di bandara.",
  "Welcoming drink air zamzam dan kurma saat kedatangan.",
  "Handling check-in dan check-out hotel.",
  "Distribusi koper ke kamar jama'ah.",
  "Tips porter bandara dan bellboy hotel.",
  "Air mineral di setiap kamar jama'ah.",
  "Parcel buah atau snack di setiap kamar jama'ah.",
  "Greeting card di setiap kamar jama'ah.",
  "Free air zamzam 5lt.",
  "FOC 1 pax tour leader.",
];

const defaultExcluded = [
  "Tiket pesawat.",
  "Asuransi perjalanan.",
  "Biaya-biaya yang bersifat pribadi, dan atau yang bukan merupakan fasilitas program.",
  "Biaya tambahan apabila ada yang dikeluarkan oleh pemerintah Arab Saudi untuk penerbitan visa umrah.",
  "Visa umrah.",
  "Transportasi selama di Arab Saudi.",
];

const defaultOfferRows: OfferPriceRow[] = [
  { paxRange: "44 - 47 PAX", quad: 815, triple: 943, double: 1197 },
  { paxRange: "40 - 43 PAX", quad: 823, triple: 950, double: 1205 },
  { paxRange: "36 - 39 PAX", quad: 832, triple: 960, double: 1216 },
  { paxRange: "32 - 35 PAX", quad: 843, triple: 972, double: 1228 },
  { paxRange: "28 - 31 PAX", quad: 858, triple: 987, double: 1245 },
  { paxRange: "24 - 27 PAX", quad: 878, triple: 1008, double: 1267 },
  { paxRange: "20 - 23 PAX", quad: 907, triple: 1037, double: 1299 },
  { paxRange: "16 - 19 PAX", quad: 950, triple: 1082, double: 1346 },
  { paxRange: "12 - 15 PAX", quad: 1023, triple: 1158, double: 1428 },
];

const defaultOffer: LandArrangementOfferData = {
  quoteNumber: "3345",
  tier: "Premium",
  title: "Penawaran Paket LA Umrah Bintang 5 Awal Musim",
  subtitle: "Program 7 Malam",
  dateRange: "01 Jul - 31 Jul 2026",
  customerName: "IGH Tour",
  hotelMakkah: "Pullman Zamzam Makkah",
  hotelMadinah: "Frontel Al Harithia",
  makkahNights: 4,
  madinahNights: 3,
  makkahStars: 5,
  madinahStars: 5,
  usdToSar: 3.75,
  updateDate: "13 Apr 2026",
  rows: defaultOfferRows,
  included: defaultIncluded,
  excluded: defaultExcluded,
  website: "www.umrahservice.co",
  contactPhone: "+62 812-8955-2018",
  contactName: "M. FARUQ AL ISLAM",
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
          <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium shrink-0">{suffix}</span>
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

export default function Calculator() {
  const rates = useRatesStore((s) => s.rates);
  const [form, setForm] = useState<FormState>(initForm);
  const [offer, setOffer] = useState<LandArrangementOfferData>(defaultOffer);
  const [pdfMode, setPdfMode] = useState<"offer" | "cost">("offer");
  const [pdfOpen, setPdfOpen] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setTransport = (i: number, field: keyof Transport, value: string | number) =>
    setForm((f) => {
      const t = [...f.transports];
      t[i] = { ...t[i], [field]: value };
      return { ...f, transports: t };
    });

  const setOfferField = <K extends keyof LandArrangementOfferData>(key: K, value: LandArrangementOfferData[K]) =>
    setOffer((current) => ({ ...current, [key]: value }));

  const setOfferRow = (index: number, field: keyof OfferPriceRow, value: string | number) =>
    setOffer((current) => ({
      ...current,
      rows: current.rows.map((row, i) => i === index ? { ...row, [field]: value } : row),
    }));

  const setOfferList = (key: "included" | "excluded", value: string) =>
    setOffer((current) => ({
      ...current,
      [key]: value.split("\n").map((line) => line.trim()).filter(Boolean),
    }));

  const toIDR = (amount: number) => {
    if (form.currency === "IDR") return amount;
    return amount * (rates[form.currency as "SAR" | "USD"] ?? 1);
  };

  const nightsMakkah = daysBetween(form.startMakkah, form.endMakkah);
  const nightsMadinah = daysBetween(form.startMadinah, form.endMadinah);

  const summary = useMemo(() => {
    const hotelMakkahIDR = toIDR(form.hargaMakkah) * nightsMakkah;
    const hotelMadinahIDR = toIDR(form.hargaMadinah) * nightsMadinah;
    const perPaxIDR =
      toIDR(form.visaUmroh + form.muthowif + form.siskopatuh + form.zamZam + form.handlingBandara) *
      form.pax;
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
      ? [{ id: "hotel-makkah", label: `Hotel Makkah (${nightsMakkah} malam)`, amount: summary.hotelMakkahIDR }]
      : []),
    ...(summary.hotelMadinahIDR > 0
      ? [{ id: "hotel-madinah", label: `Hotel Madinah (${nightsMadinah} malam)`, amount: summary.hotelMadinahIDR }]
      : []),
    ...(toIDR(form.visaUmroh) * form.pax > 0
      ? [{ id: "visa", label: `Visa Umroh (${form.pax} pax)`, amount: toIDR(form.visaUmroh) * form.pax }]
      : []),
    ...(toIDR(form.muthowif) * form.pax > 0
      ? [{ id: "muthowif", label: `Muthowif (${form.pax} pax)`, amount: toIDR(form.muthowif) * form.pax }]
      : []),
    ...(toIDR(form.siskopatuh) * form.pax > 0
      ? [{ id: "sisko", label: `Siskopatuh (${form.pax} pax)`, amount: toIDR(form.siskopatuh) * form.pax }]
      : []),
    ...(toIDR(form.zamZam) * form.pax > 0
      ? [{ id: "zamzam", label: `Zam Zam (${form.pax} pax)`, amount: toIDR(form.zamZam) * form.pax }]
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

  const inputLabel = form.currency !== "IDR"
    ? `1 ${form.currency} = Rp ${(rates[form.currency as "SAR" | "USD"] ?? 0).toLocaleString("id-ID")}`
    : "";

  return (
    <div className="calculator-compact max-w-3xl mx-auto space-y-5">

      {/* Page title */}
      <div className="calculator-page-title">
        <h1 className="text-xl md:text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <CalcIcon strokeWidth={1.5} className="h-5 w-5 text-[hsl(var(--primary))]" />
          Kalkulator Paket Trip
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Hitung biaya paket Umrah secara otomatis, lalu ekspor ke PDF.
        </p>
      </div>

      <div className="calculator-card rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden shadow-card">
        <div
          className="calculator-card-header px-6 py-4 text-center font-bold text-base md:text-lg text-white tracking-wide"
          style={{ background: "linear-gradient(135deg, #7a5a1a, #b5862b)" }}
        >
          GENERATOR PENAWARAN SEPERTI CONTOH PDF
        </div>

        <div className="calculator-card-body p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">No.</Label>
              <Input value={offer.quoteNumber} onChange={(e) => setOfferField("quoteNumber", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Tipe</Label>
              <Input value={offer.tier} onChange={(e) => setOfferField("tier", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-[12px] font-semibold">Customer</Label>
              <Input value={offer.customerName} onChange={(e) => setOfferField("customerName", e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <FormField label="Judul Penawaran">
            <Input value={offer.title} onChange={(e) => setOfferField("title", e.target.value)} className="h-9 text-sm" />
          </FormField>

          <FieldRow>
            <FormField label="Program">
              <Input value={offer.subtitle} onChange={(e) => setOfferField("subtitle", e.target.value)} className="h-9 text-sm" />
            </FormField>
            <FormField label="Periode">
              <Input value={offer.dateRange} onChange={(e) => setOfferField("dateRange", e.target.value)} className="h-9 text-sm" />
            </FormField>
          </FieldRow>

          <FieldRow>
            <FormField label="Hotel Makkah">
              <Input value={offer.hotelMakkah} onChange={(e) => setOfferField("hotelMakkah", e.target.value)} className="h-9 text-sm" />
            </FormField>
            <FormField label="Hotel Madinah">
              <Input value={offer.hotelMadinah} onChange={(e) => setOfferField("hotelMadinah", e.target.value)} className="h-9 text-sm" />
            </FormField>
          </FieldRow>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Malam Makkah</Label>
              <Input type="number" min={0} value={offer.makkahNights} onChange={(e) => setOfferField("makkahNights", Number(e.target.value))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Malam Madinah</Label>
              <Input type="number" min={0} value={offer.madinahNights} onChange={(e) => setOfferField("madinahNights", Number(e.target.value))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Kurs USD/SAR</Label>
              <Input type="number" step="0.01" min={0} value={offer.usdToSar} onChange={(e) => setOfferField("usdToSar", Number(e.target.value))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Tgl. Update</Label>
              <Input value={offer.updateDate} onChange={(e) => setOfferField("updateDate", e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="calculator-price-table overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-3 py-2 text-left">Total Pax</th>
                  <th className="px-3 py-2 text-left">Quad</th>
                  <th className="px-3 py-2 text-left">Triple</th>
                  <th className="px-3 py-2 text-left">Double</th>
                </tr>
              </thead>
              <tbody>
                {offer.rows.map((row, i) => (
                  <tr key={i} className="border-t border-[hsl(var(--border))]">
                    <td className="px-2 py-1.5">
                      <Input value={row.paxRange} onChange={(e) => setOfferRow(i, "paxRange", e.target.value)} className="h-8 text-xs" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={row.quad || ""} onChange={(e) => setOfferRow(i, "quad", Number(e.target.value))} className="h-8 text-xs" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={row.triple || ""} onChange={(e) => setOfferRow(i, "triple", Number(e.target.value))} className="h-8 text-xs" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={row.double || ""} onChange={(e) => setOfferRow(i, "double", Number(e.target.value))} className="h-8 text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Harga Sudah Termasuk</Label>
              <textarea
                value={offer.included.join("\n")}
                onChange={(e) => setOfferList("included", e.target.value)}
                className="calculator-textarea min-h-32 w-full rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-xs outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Harga Tidak Termasuk</Label>
              <textarea
                value={offer.excluded.join("\n")}
                onChange={(e) => setOfferList("excluded", e.target.value)}
                className="calculator-textarea min-h-32 w-full rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-xs outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input value={offer.website} onChange={(e) => setOfferField("website", e.target.value)} className="h-9 text-sm" placeholder="Website" />
            <Input value={offer.contactPhone} onChange={(e) => setOfferField("contactPhone", e.target.value)} className="h-9 text-sm" placeholder="Nomor kontak" />
            <Input value={offer.contactName} onChange={(e) => setOfferField("contactName", e.target.value)} className="h-9 text-sm" placeholder="Nama kontak" />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="flex-1 gradient-primary text-white shadow-glow hover:opacity-90 h-11 rounded-xl font-semibold"
              onClick={() => { setPdfMode("offer"); setPdfOpen(true); }}
            >
              <FileText strokeWidth={1.5} className="h-4 w-4 mr-2" />
              Preview & Export PDF Penawaran
            </Button>
            <Button variant="outline" className="sm:w-36 h-11 rounded-xl" onClick={() => setOffer(defaultOffer)}>
              Reset Contoh
            </Button>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="calculator-card rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden shadow-card">

        {/* Form header */}
        <div
          className="calculator-card-header px-6 py-4 text-center font-bold text-base md:text-lg text-white tracking-wide"
          style={{ background: "linear-gradient(135deg, #7a5a1a, #b5862b)" }}
        >
          FORM PAKET UMRAH MANDIRI IGH
        </div>

        <div className="calculator-card-body p-4 md:p-6 space-y-4">

          {/* Nama Paket + Pax + Currency */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3 border-b border-[hsl(var(--border))]">
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Mata Uang</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v as FormState["currency"])}>
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
            {inputLabel && (
              <div className="col-span-2 sm:col-span-1 flex items-center">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] px-3 py-1.5 rounded-lg">
                  {inputLabel}
                </span>
              </div>
            )}
          </div>

          {/* Nama Paket */}
          <FormField label="Nama Paket">
            <Input
              placeholder="cth: Umrah Ramadhan 2026"
              value={form.namaPaket}
              onChange={(e) => set("namaPaket", e.target.value)}
              className="h-9 text-sm"
            />
          </FormField>

          {/* Divider */}
          <div className="h-px bg-[hsl(var(--border))] my-1" />

          {/* Hotel Makkah */}
          <FieldRow>
            <FormField label="Hotel Makkah">
              <Input
                placeholder="Nama hotel Makkah"
                value={form.hotelMakkah}
                onChange={(e) => set("hotelMakkah", e.target.value)}
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="Harga Makkah" suffix={`${currencyLabel}/mlm`}>
              <NumInput value={form.hargaMakkah} onChange={(v) => set("hargaMakkah", v)} />
            </FormField>
          </FieldRow>

          <FieldRow>
            <FormField label="Start Makkah">
              <Input
                type="date"
                value={form.startMakkah}
                onChange={(e) => set("startMakkah", e.target.value)}
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="End Makkah">
              <Input
                type="date"
                value={form.endMakkah}
                onChange={(e) => set("endMakkah", e.target.value)}
                className="h-9 text-sm"
              />
            </FormField>
          </FieldRow>

          {nightsMakkah > 0 && (
            <p className="text-[11px] text-[hsl(var(--primary))] -mt-1 pl-1">
              → {nightsMakkah} malam di Makkah
              {form.hargaMakkah > 0 && ` | ${fmtIDR(summary.hotelMakkahIDR)} total`}
            </p>
          )}

          {/* Divider */}
          <div className="h-px bg-[hsl(var(--border))] my-1" />

          {/* Hotel Madinah */}
          <FieldRow>
            <FormField label="Hotel Madinah">
              <Input
                placeholder="Nama hotel Madinah"
                value={form.hotelMadinah}
                onChange={(e) => set("hotelMadinah", e.target.value)}
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="Harga Madinah" suffix={`${currencyLabel}/mlm`}>
              <NumInput value={form.hargaMadinah} onChange={(v) => set("hargaMadinah", v)} />
            </FormField>
          </FieldRow>

          <FieldRow>
            <FormField label="Start Madinah">
              <Input
                type="date"
                value={form.startMadinah}
                onChange={(e) => set("startMadinah", e.target.value)}
                className="h-9 text-sm"
              />
            </FormField>
            <FormField label="End Madinah">
              <Input
                type="date"
                value={form.endMadinah}
                onChange={(e) => set("endMadinah", e.target.value)}
                className="h-9 text-sm"
              />
            </FormField>
          </FieldRow>

          {nightsMadinah > 0 && (
            <p className="text-[11px] text-[hsl(var(--primary))] -mt-1 pl-1">
              → {nightsMadinah} malam di Madinah
              {form.hargaMadinah > 0 && ` | ${fmtIDR(summary.hotelMadinahIDR)} total`}
            </p>
          )}

          {/* Divider */}
          <div className="h-px bg-[hsl(var(--border))] my-1" />

          {/* Per-pax costs */}
          <FieldRow>
            <FormField label="Visa Umroh" suffix="/ pax">
              <NumInput value={form.visaUmroh} onChange={(v) => set("visaUmroh", v)} placeholder={currencyLabel} />
            </FormField>
            <FormField label="Muthowif" suffix="/ pax">
              <NumInput value={form.muthowif} onChange={(v) => set("muthowif", v)} placeholder={currencyLabel} />
            </FormField>
          </FieldRow>

          <FieldRow>
            <FormField label="Siskopatuh" suffix="/ pax">
              <NumInput value={form.siskopatuh} onChange={(v) => set("siskopatuh", v)} placeholder={currencyLabel} />
            </FormField>
            <FormField label="Zam Zam" suffix="/ pax">
              <NumInput value={form.zamZam} onChange={(v) => set("zamZam", v)} placeholder={currencyLabel} />
            </FormField>
          </FieldRow>

          <FieldRow>
            <FormField label="Handling Bandara" suffix="/ pax">
              <NumInput value={form.handlingBandara} onChange={(v) => set("handlingBandara", v)} placeholder={currencyLabel} />
            </FormField>
          </FieldRow>

          {/* Divider */}
          <div className="h-px bg-[hsl(var(--border))] my-1" />

          {/* Transport */}
          <div>
            <p className="text-[12px] font-semibold text-[hsl(var(--muted-foreground))] mb-3 uppercase tracking-wide">
              Transportasi
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              {form.transports.map((t, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-[12px] font-semibold">
                    Transport {i + 1}
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={t.jenis}
                      onValueChange={(v) => setTransport(i, "jenis", v)}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1 min-w-0">
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
                      className="h-9 text-sm w-24 shrink-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[hsl(var(--border))] my-1" />

          {/* Margin */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[12px] font-semibold">Margin Keuntungan</Label>
              <span className="text-sm font-bold text-[hsl(var(--primary))]">{form.margin}%</span>
            </div>
            <Slider
              value={[form.margin]}
              min={0}
              max={50}
              step={1}
              onValueChange={(v) => set("margin", v[0])}
            />
          </div>
        </div>
      </div>

      {/* Summary card */}
      <div className="calculator-card rounded-2xl border border-[hsl(var(--border))] bg-white shadow-card overflow-hidden">
        <div className="calculator-card-header px-6 py-3 border-b border-[hsl(var(--border))] flex items-center gap-2">
          <Hotel strokeWidth={1.5} className="h-4 w-4 text-[hsl(var(--primary))]" />
          <span className="font-semibold text-[14px] text-[hsl(var(--foreground))]">Ringkasan Biaya</span>
        </div>

        <div className="calculator-card-body p-4 md:p-6 grid md:grid-cols-2 gap-6">
          {/* Breakdown list */}
          <div className="space-y-2">
            {[
              { label: `Hotel Makkah (${nightsMakkah} mlm)`, value: summary.hotelMakkahIDR, show: summary.hotelMakkahIDR > 0 },
              { label: `Hotel Madinah (${nightsMadinah} mlm)`, value: summary.hotelMadinahIDR, show: summary.hotelMadinahIDR > 0 },
              { label: `Biaya Per Pax (×${form.pax})`, value: summary.perPaxIDR, show: summary.perPaxIDR > 0 },
              { label: "Transportasi", value: summary.transportIDR, show: summary.transportIDR > 0 },
            ]
              .filter((r) => r.show)
              .map((r) => (
                <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-dashed border-[hsl(var(--border))]">
                  <span className="text-[12px] text-[hsl(var(--muted-foreground))]">{r.label}</span>
                  <span className="text-[12px] font-semibold text-[hsl(var(--foreground))]">{fmtIDR(r.value)}</span>
                </div>
              ))}

            {summary.subtotal === 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-4">
                Isi form di atas untuk melihat kalkulasi.
              </p>
            )}

            {summary.subtotal > 0 && (
              <>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[12px] text-[hsl(var(--muted-foreground))]">Subtotal</span>
                  <span className="text-[12px] font-semibold">{fmtIDR(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[hsl(var(--border))]">
                  <span className="text-[12px] text-[hsl(var(--muted-foreground))]">Margin ({form.margin}%)</span>
                  <span className="text-[12px] font-semibold text-[hsl(var(--primary))]">+ {fmtIDR(summary.marginAmt)}</span>
                </div>
              </>
            )}
          </div>

          {/* Total highlight + action */}
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl gradient-primary p-5 text-white shadow-glow">
              <p className="text-xs opacity-80">Total Paket</p>
              <p className="text-2xl font-bold mt-1">{fmtIDR(summary.total)}</p>
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs opacity-80">Per orang ({form.pax} pax)</p>
                <p className="text-lg font-semibold mt-0.5">{fmtIDR(summary.perPerson)}</p>
              </div>
            </div>

            <Button
              className="w-full gradient-primary text-white shadow-glow hover:opacity-90 h-11 rounded-xl font-semibold"
              onClick={() => { setPdfMode("cost"); setPdfOpen(true); }}
              disabled={summary.total === 0}
            >
              <FileText strokeWidth={1.5} className="h-4 w-4 mr-2" />
              Ekspor PDF
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 rounded-xl text-sm"
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
          packageName: form.namaPaket || "Paket Umrah IGH",
          destination: [form.hotelMakkah, form.hotelMadinah].filter(Boolean).join(" — ") || "Makkah & Madinah",
          people: form.pax,
          currency: "IDR",
          costs: pdfCosts,
          total: summary.total,
          perPerson: summary.perPerson,
          offer: pdfMode === "offer" ? offer : undefined,
        }}
      />
    </div>
  );
}
