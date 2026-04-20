import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, LayoutTemplate, Plus, Pencil, Trash2, Check, X, Eye, EyeOff } from "lucide-react";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { useRatesStore } from "@/store/ratesStore";
import type { LandArrangementOfferData, OfferPriceRow } from "@/lib/generatePdf";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { TemplateEditorDialog } from "@/features/pdfTemplate/TemplateEditorDialog";
import { useTemplateStore } from "@/features/pdfTemplate/templateStore";
import type { PdfTemplate } from "@/features/pdfTemplate/types";
import { toast } from "sonner";

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

const fadeUp: Variants = {
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
  const [previewOpen, setPreviewOpen] = useState(false);

  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplateStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PdfTemplate | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  const setOfferField = <K extends keyof LandArrangementOfferData>(
    key: K,
    value: LandArrangementOfferData[K]
  ) => setOffer((cur) => ({ ...cur, [key]: value }));

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

  const offerAutoRate =
    offerCurrency !== "IDR" ? (rates[offerCurrency as "SAR" | "USD"] ?? 0) : 0;

  // Live preview HTML
  const livePreviewHtml = useMemo(() => {
    const rows = offer.rows.filter((r) => r.paxRange);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Manrope', sans-serif; background: #fafaf9; color: #1a1412; padding: 28px 32px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 2px solid #f97316; padding-bottom: 12px; }
    .quote-num { font-size: 13px; font-weight: 800; color: #f97316; }
    .tier { display: inline-block; background: #f97316; color: #fff; border-radius: 4px; padding: 1px 7px; font-size: 9px; font-weight: 700; margin-left: 8px; }
    .title { font-size: 18px; font-weight: 800; margin: 4px 0 2px; line-height: 1.2; }
    .subtitle { font-size: 10px; color: #78716c; }
    .section { margin-top: 14px; }
    .label { font-size: 8.5px; font-weight: 700; color: #a8a29e; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 3px; }
    .val { font-size: 12px; font-weight: 700; }
    .hotels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10px; }
    th { background: #f97316; color: #fff; font-weight: 700; padding: 5px 8px; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #e7e5e4; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 9px; color: #78716c; }
    .stars { color: #f97316; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="quote-num">#${offer.quoteNumber || "—"}<span class="tier">${offer.tier || "Premium"}</span></div>
      <div class="title">${offer.title || "Penawaran Umrah / Haji"}</div>
      <div class="subtitle">${offer.subtitle || "Program Umrah"} &nbsp;·&nbsp; ${offer.dateRange || "—"}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Customer</div>
      <div class="val">${offer.customerName || "IGH Tour"}</div>
    </div>
  </div>

  <div class="hotels">
    <div>
      <div class="label">Hotel Makkah</div>
      <div class="val">${offer.hotelMakkah || "—"}</div>
      <div style="margin-top:3px"><span class="stars">${"★".repeat(offer.makkahStars || 5)}</span> &nbsp; ${offer.makkahNights || 0} malam</div>
    </div>
    <div>
      <div class="label">Hotel Madinah</div>
      <div class="val">${offer.hotelMadinah || "—"}</div>
      <div style="margin-top:3px"><span class="stars">${"★".repeat(offer.madinahStars || 5)}</span> &nbsp; ${offer.madinahNights || 0} malam</div>
    </div>
  </div>

  ${rows.length > 0 ? `
  <table>
    <thead><tr><th>Total PAX</th><th>Quad</th><th>Triple</th><th>Double</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td>${r.paxRange}</td><td>${r.quad.toLocaleString()}</td><td>${r.triple.toLocaleString()}</td><td>${r.double.toLocaleString()}</td></tr>`).join("")}
    </tbody>
  </table>` : ""}

  <div class="footer">
    <div>${offer.website || "www.igh-tour.id"}</div>
    <div>${offer.contactName ? `${offer.contactName} · ` : ""}${offer.contactPhone || ""}</div>
  </div>
</body>
</html>`;
  }, [offer]);

  const handleSaveTemplate = (draft: Omit<PdfTemplate, "id" | "createdAt">) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, draft);
      toast.success("Template berhasil diperbarui");
    } else {
      const id = addTemplate(draft);
      setSelectedTemplateId(id);
      toast.success("Template berhasil disimpan & dipilih");
    }
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    if (selectedTemplateId === id) setSelectedTemplateId(null);
    toast.success("Template dihapus");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <h1 className="text-lg md:text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <FileText strokeWidth={1.5} className="h-5 w-5 text-[hsl(var(--primary))]" />
          Generator PDF Penawaran
        </h1>
        <p className="text-xs md:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Buat dokumen penawaran Land Arrangement Umrah & Haji secara profesional.
        </p>
      </motion.div>

      {/* ─── Template Section ─── */}
      <motion.div
        className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden shadow-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <LayoutTemplate strokeWidth={1.5} className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span className="font-semibold text-sm text-[hsl(var(--foreground))]">
              Template PDF
            </span>
            {selectedTemplate && (
              <span className="flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded-full">
                <Check className="h-2.5 w-2.5" />
                Aktif
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {templates.length > 0 && (
              <button
                onClick={() => setTemplatePickerOpen((v) => !v)}
                className="h-7 px-3 rounded-lg text-xs font-medium border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--secondary))] transition-colors"
              >
                Pilih
              </button>
            )}
            <button
              onClick={() => {
                setEditingTemplate(null);
                setEditorOpen(true);
              }}
              className="h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-1 btn-primary"
            >
              <Plus className="h-3 w-3" />
              Buat Template
            </button>
          </div>
        </div>

        {/* Active template preview */}
        <AnimatePresence mode="wait">
          {selectedTemplate ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 py-3 flex items-center gap-3"
            >
              <div className="h-14 w-20 rounded-lg overflow-hidden border border-[hsl(var(--border))] shrink-0 bg-gray-50">
                {selectedTemplate.backgroundImage ? (
                  <img
                    src={selectedTemplate.backgroundImage}
                    alt={selectedTemplate.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutTemplate className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[hsl(var(--foreground))] truncate">
                  {selectedTemplate.name}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  {selectedTemplate.orientation} · {selectedTemplate.fields.length} field terpasang
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingTemplate(selectedTemplate);
                    setEditorOpen(true);
                  }}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setSelectedTemplateId(null)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-5 py-3"
            >
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Tanpa template — PDF akan digenerate dengan layout default IGH Tour.
                {templates.length > 0 && (
                  <button
                    onClick={() => setTemplatePickerOpen(true)}
                    className="ml-1.5 text-[hsl(var(--primary))] font-medium hover:underline"
                  >
                    Pilih dari {templates.length} template tersimpan →
                  </button>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template picker */}
        <AnimatePresence>
          {templatePickerOpen && templates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[hsl(var(--border))] overflow-hidden"
            >
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`relative rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-md group ${
                      selectedTemplateId === tmpl.id
                        ? "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]/30"
                        : "border-[hsl(var(--border))]"
                    }`}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setTemplatePickerOpen(false);
                    }}
                  >
                    <div className="aspect-video bg-gray-50 overflow-hidden">
                      {tmpl.backgroundImage ? (
                        <img
                          src={tmpl.backgroundImage}
                          alt={tmpl.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <LayoutTemplate className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-[11px] font-semibold truncate">{tmpl.name}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {tmpl.fields.length} field
                      </p>
                    </div>
                    {selectedTemplateId === tmpl.id && (
                      <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(tmpl.id);
                      }}
                      className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-3 flex justify-end">
                <button
                  onClick={() => setTemplatePickerOpen(false)}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Main form card ─── */}
      <motion.div
        className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden shadow-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="px-4 py-3 text-center font-bold text-sm md:text-base text-white tracking-wide"
          style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}
        >
          Form Penawaran
        </div>

        <div className="p-3 md:p-6 space-y-3 md:space-y-4">
          {/* Row 1: No, Tipe, Customer */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <div className="space-y-1">
              <Label className="text-[11px] md:text-[12px] font-semibold">No. Penawaran</Label>
              <Input value={offer.quoteNumber} onChange={(e) => setOfferField("quoteNumber", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="cth: 001" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] md:text-[12px] font-semibold">Tipe</Label>
              <Input value={offer.tier} onChange={(e) => setOfferField("tier", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="cth: Premium" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-[11px] md:text-[12px] font-semibold">Nama Customer</Label>
              <Input value={offer.customerName} onChange={(e) => setOfferField("customerName", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="cth: IGH Tour" />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            <FormField label="Judul Penawaran">
              <Input value={offer.title} onChange={(e) => setOfferField("title", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="cth: Penawaran Umrah Ramadhan 1447H" />
            </FormField>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <FieldRow>
              <FormField label="Program">
                <Input value={offer.subtitle} onChange={(e) => setOfferField("subtitle", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="cth: Program Umrah Regular" />
              </FormField>
              <FormField label="Periode">
                <Input value={offer.dateRange} onChange={(e) => setOfferField("dateRange", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="cth: 10 – 25 Maret 2025" />
              </FormField>
            </FieldRow>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <FieldRow>
              <FormField label="Penginapan 1 (Makkah)">
                <Input value={offer.hotelMakkah} onChange={(e) => setOfferField("hotelMakkah", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="Nama hotel Makkah" />
              </FormField>
              <FormField label="Penginapan 2 (Madinah)">
                <Input value={offer.hotelMadinah} onChange={(e) => setOfferField("hotelMadinah", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="Nama hotel Madinah (opsional)" />
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
              <Label className="text-[11px] md:text-[12px] font-semibold">Malam Penginapan 1</Label>
              <Input type="number" min={0} value={offer.makkahNights} onChange={(e) => setOfferField("makkahNights", Number(e.target.value))} className="h-8 md:h-9 text-[13px] md:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] md:text-[12px] font-semibold">Malam Penginapan 2</Label>
              <Input type="number" min={0} value={offer.madinahNights} onChange={(e) => setOfferField("madinahNights", Number(e.target.value))} className="h-8 md:h-9 text-[13px] md:text-sm" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <Label className="text-[11px] md:text-[12px] font-semibold">
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
                  className="h-8 md:h-9 text-[13px] md:text-sm"
                />
              ) : (
                <div className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] flex items-center px-3 text-sm text-[hsl(var(--muted-foreground))]">
                  Tidak ada konversi
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] md:text-[12px] font-semibold">Tgl. Update</Label>
              <Input value={offer.updateDate} onChange={(e) => setOfferField("updateDate", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="cth: 1 Jan 2025" />
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
              <thead className="bg-orange-50 text-orange-700">
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
              <Label className="text-[11px] md:text-[12px] font-semibold">Harga Sudah Termasuk</Label>
              <textarea
                value={offer.included.join("\n")}
                onChange={(e) => setOfferList("included", e.target.value)}
                placeholder={"Tulis satu item per baris\ncth: Akomodasi hotel sesuai program.\ncth: Makan fullboard."}
                className="min-h-24 md:min-h-32 w-full rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-xs outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] resize-vertical"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] md:text-[12px] font-semibold">Harga Tidak Termasuk</Label>
              <textarea
                value={offer.excluded.join("\n")}
                onChange={(e) => setOfferList("excluded", e.target.value)}
                placeholder={"Tulis satu item per baris\ncth: Tiket pesawat.\ncth: Asuransi perjalanan."}
                className="min-h-24 md:min-h-32 w-full rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-xs outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] resize-vertical"
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
            <Input value={offer.website} onChange={(e) => setOfferField("website", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="Website (cth: www.ightour.id)" />
            <Input value={offer.contactPhone} onChange={(e) => setOfferField("contactPhone", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="Nomor kontak" />
            <Input value={offer.contactName} onChange={(e) => setOfferField("contactName", e.target.value)} className="h-8 md:h-9 text-[13px] md:text-sm" placeholder="Nama kontak" />
          </motion.div>

          {/* Live preview toggle */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7.5} className="pt-1">
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:opacity-75 transition-opacity"
            >
              {previewOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {previewOpen ? "Tutup Live Preview" : "Tampilkan Live Preview Dokumen"}
            </button>
            <AnimatePresence>
              {previewOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 rounded-xl overflow-hidden border border-[hsl(var(--border))]"
                >
                  <iframe
                    srcDoc={livePreviewHtml}
                    className="w-full"
                    style={{ height: "280px", border: "none" }}
                    title="Live Preview PDF"
                    sandbox="allow-same-origin"
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
          destination:
            [offer.hotelMakkah, offer.hotelMadinah].filter(Boolean).join(" — ") || "Destinasi",
          people: 1,
          currency: "IDR",
          costs: [],
          total: 0,
          perPerson: 0,
          offer,
          template: selectedTemplate ?? undefined,
        }}
      />

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editingTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
