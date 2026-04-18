import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { useRatesStore } from "@/store/ratesStore";
import type { LandArrangementOfferData, OfferPriceRow } from "@/lib/generatePdf";
import { motion } from "framer-motion";

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">{children}</div>;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[12px] font-semibold text-[hsl(var(--foreground))] leading-tight">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const defaultOfferRows: OfferPriceRow[] = Array.from({ length: 5 }, () => ({
  paxRange: "",
  quad: 0,
  triple: 0,
  double: 0,
}));

const defaultOffer: LandArrangementOfferData = {
  quoteNumber: "",
  tier: "",
  title: "",
  subtitle: "",
  dateRange: "",
  customerName: "",
  hotelMakkah: "",
  hotelMadinah: "",
  makkahNights: 0,
  madinahNights: 0,
  makkahStars: 5,
  madinahStars: 5,
  usdToSar: 3.75,
  updateDate: "",
  rows: defaultOfferRows,
  included: [],
  excluded: [],
  website: "",
  contactPhone: "",
  contactName: "",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] },
  }),
};

export default function PdfGenerator() {
  const rates = useRatesStore((s) => s.rates);
  const [offer, setOffer] = useState<LandArrangementOfferData>(defaultOffer);
  const [offerCurrency, setOfferCurrency] = useState<"SAR" | "USD" | "IDR">("SAR");
  const [pdfOpen, setPdfOpen] = useState(false);

  const setOfferField = <K extends keyof LandArrangementOfferData>(key: K, value: LandArrangementOfferData[K]) =>
    setOffer((cur) => ({ ...cur, [key]: value }));

  const setOfferRow = (index: number, field: keyof OfferPriceRow, value: string | number) =>
    setOffer((cur) => ({
      ...cur,
      rows: cur.rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));

  const setOfferList = (key: "included" | "excluded", value: string) =>
    setOffer((cur) => ({
      ...cur,
      [key]: value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    }));

  const offerAutoRate = offerCurrency !== "IDR" ? (rates[offerCurrency as "SAR" | "USD"] ?? 0) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <h1 className="text-xl md:text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <FileText strokeWidth={1.5} className="h-5 w-5 text-[hsl(var(--primary))]" />
          Generator PDF Penawaran
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Buat dokumen penawaran Land Arrangement Umrah & Haji secara profesional.
        </p>
      </motion.div>

      {/* Main form card */}
      <motion.div
        className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden shadow-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="px-6 py-4 text-center font-bold text-base md:text-lg text-white tracking-wide"
          style={{ background: "linear-gradient(135deg, #7a5a1a, #b5862b)" }}
        >
          Form Penawaran
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Row 1: No, Tipe, Customer */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">No. Penawaran</Label>
              <Input value={offer.quoteNumber} onChange={(e) => setOfferField("quoteNumber", e.target.value)} className="h-9 text-sm" placeholder="cth: 001" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Tipe</Label>
              <Input value={offer.tier} onChange={(e) => setOfferField("tier", e.target.value)} className="h-9 text-sm" placeholder="cth: Premium" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-[12px] font-semibold">Nama Customer</Label>
              <Input value={offer.customerName} onChange={(e) => setOfferField("customerName", e.target.value)} className="h-9 text-sm" placeholder="cth: IGH Tour" />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            <FormField label="Judul Penawaran">
              <Input value={offer.title} onChange={(e) => setOfferField("title", e.target.value)} className="h-9 text-sm" placeholder="cth: Penawaran Umrah Ramadhan 1447H" />
            </FormField>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <FieldRow>
              <FormField label="Program">
                <Input value={offer.subtitle} onChange={(e) => setOfferField("subtitle", e.target.value)} className="h-9 text-sm" placeholder="cth: Program Umrah Regular" />
              </FormField>
              <FormField label="Periode">
                <Input value={offer.dateRange} onChange={(e) => setOfferField("dateRange", e.target.value)} className="h-9 text-sm" placeholder="cth: 10 – 25 Maret 2025" />
              </FormField>
            </FieldRow>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <FieldRow>
              <FormField label="Penginapan 1 (Makkah)">
                <Input value={offer.hotelMakkah} onChange={(e) => setOfferField("hotelMakkah", e.target.value)} className="h-9 text-sm" placeholder="Nama hotel Makkah" />
              </FormField>
              <FormField label="Penginapan 2 (Madinah)">
                <Input value={offer.hotelMadinah} onChange={(e) => setOfferField("hotelMadinah", e.target.value)} className="h-9 text-sm" placeholder="Nama hotel Madinah (opsional)" />
              </FormField>
            </FieldRow>
          </motion.div>

          <motion.div
            className={`grid gap-3 grid-cols-2 ${offerCurrency !== "IDR" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
          >
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Malam Penginapan 1</Label>
              <Input type="number" min={0} value={offer.makkahNights} onChange={(e) => setOfferField("makkahNights", Number(e.target.value))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Malam Penginapan 2</Label>
              <Input type="number" min={0} value={offer.madinahNights} onChange={(e) => setOfferField("madinahNights", Number(e.target.value))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <Label className="text-[12px] font-semibold">
                  {offerCurrency !== "IDR" ? `Kurs ${offerCurrency} → IDR` : "Mata Uang"}
                </Label>
                <div className="flex gap-1">
                  {(["SAR", "USD", "IDR"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setOfferCurrency(c); setOfferField("usdToSar", 0); }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${offerCurrency === c ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {offerCurrency !== "IDR" ? (
                <Input
                  type="number"
                  min={0}
                  placeholder={offerAutoRate > 0 ? offerAutoRate.toLocaleString("id-ID") : "cth: 4350"}
                  value={offer.usdToSar || ""}
                  onChange={(e) => setOfferField("usdToSar", Number(e.target.value))}
                  className="h-9 text-sm"
                />
              ) : (
                <div className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] flex items-center px-3 text-sm text-[hsl(var(--muted-foreground))]">
                  Tidak ada konversi
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Tgl. Update</Label>
              <Input value={offer.updateDate} onChange={(e) => setOfferField("updateDate", e.target.value)} className="h-9 text-sm" placeholder="cth: 1 Jan 2025" />
            </div>
          </motion.div>

          {/* Pricing table */}
          <motion.div
            className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
          >
            <table className="w-full min-w-[580px] text-sm">
              <thead className="bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">Total Pax</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Quad</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Triple</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Double</th>
                </tr>
              </thead>
              <tbody>
                {offer.rows.map((row, i) => (
                  <tr key={i} className="border-t border-[hsl(var(--border))]">
                    <td className="px-2 py-1.5">
                      <Input value={row.paxRange} onChange={(e) => setOfferRow(i, "paxRange", e.target.value)} className="h-8 text-xs" placeholder={`${i * 5 + 1}–${i * 5 + 5} pax`} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={row.quad || ""} onChange={(e) => setOfferRow(i, "quad", Number(e.target.value))} className="h-8 text-xs" placeholder="0" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={row.triple || ""} onChange={(e) => setOfferRow(i, "triple", Number(e.target.value))} className="h-8 text-xs" placeholder="0" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" value={row.double || ""} onChange={(e) => setOfferRow(i, "double", Number(e.target.value))} className="h-8 text-xs" placeholder="0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Included / Excluded */}
          <motion.div
            className="grid md:grid-cols-2 gap-3"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={6}
          >
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Harga Sudah Termasuk</Label>
              <textarea
                value={offer.included.join("\n")}
                onChange={(e) => setOfferList("included", e.target.value)}
                placeholder={"Tulis satu item per baris\ncth: Akomodasi hotel sesuai program.\ncth: Makan fullboard."}
                className="min-h-32 w-full rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-xs outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] resize-vertical"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Harga Tidak Termasuk</Label>
              <textarea
                value={offer.excluded.join("\n")}
                onChange={(e) => setOfferList("excluded", e.target.value)}
                placeholder={"Tulis satu item per baris\ncth: Tiket pesawat.\ncth: Asuransi perjalanan."}
                className="min-h-32 w-full rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-xs outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] resize-vertical"
              />
            </div>
          </motion.div>

          {/* Contact info */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={7}
          >
            <Input value={offer.website} onChange={(e) => setOfferField("website", e.target.value)} className="h-9 text-sm" placeholder="Website (cth: www.ightour.id)" />
            <Input value={offer.contactPhone} onChange={(e) => setOfferField("contactPhone", e.target.value)} className="h-9 text-sm" placeholder="Nomor kontak" />
            <Input value={offer.contactName} onChange={(e) => setOfferField("contactName", e.target.value)} className="h-9 text-sm" placeholder="Nama kontak" />
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-2 pt-1"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={8}
          >
            <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full gradient-primary text-white shadow-glow hover:opacity-90 h-11 rounded-xl font-semibold"
                onClick={() => setPdfOpen(true)}
              >
                <FileText strokeWidth={1.5} className="h-4 w-4 mr-2" />
                Preview & Unduh PDF Penawaran
              </Button>
            </motion.div>
            <Button
              variant="outline"
              className="sm:w-36 h-11 rounded-xl"
              onClick={() => setOffer(defaultOffer)}
            >
              Reset Form
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <PdfPreviewDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        data={{
          packageName: offer.title || "Penawaran IGH Tour",
          destination: [offer.hotelMakkah, offer.hotelMadinah].filter(Boolean).join(" — ") || "Destinasi",
          people: 1,
          currency: "IDR",
          costs: [],
          total: 0,
          perPerson: 0,
          offer,
        }}
      />
    </div>
  );
}
