import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, Plane, LayoutTemplate, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPdf, type LandArrangementOfferData, type SimplePackagePdfData } from "@/lib/generatePdf";
import { useRatesStore } from "@/store/ratesStore";
import type { PdfTemplate, TemplateFieldConfig } from "@/features/pdfTemplate/types";

const symbols: Record<string, string> = { USD: "$", SAR: "﷼", IDR: "Rp" };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: {
    packageName: string;
    destination: string;
    people: number;
    currency: string;
    costs: { id: string; label: string; amount: number }[];
    total: number;
    perPerson: number;
    offer?: LandArrangementOfferData;
    template?: PdfTemplate;
    simple?: SimplePackagePdfData;
  };
}

function usd(n: number) {
  return `$ ${Math.round(n).toLocaleString("en-US")}`;
}

function getFieldValue(field: TemplateFieldConfig, offer: LandArrangementOfferData): string {
  switch (field.key) {
    case "quoteNumber": return offer.quoteNumber || "#—";
    case "tier": return offer.tier || "";
    case "title": return offer.title || "";
    case "subtitle": return offer.subtitle || "";
    case "dateRange": return offer.dateRange || "";
    case "customerName": return offer.customerName || "";
    case "hotelMakkah": return offer.hotelMakkah || "";
    case "hotelMadinah": return offer.hotelMadinah || "";
    case "makkahNights": return offer.makkahNights ? `${offer.makkahNights} Malam` : "";
    case "madinahNights": return offer.madinahNights ? `${offer.madinahNights} Malam` : "";
    case "updateDate": return offer.updateDate || "";
    case "website": return offer.website || "";
    case "contactPhone": return offer.contactPhone || "";
    case "contactName": return offer.contactName || "";
    case "priceTable": return "[Tabel Harga]";
    default: return "";
  }
}

function TemplatePreview({ template, offer }: { template: PdfTemplate; offer: LandArrangementOfferData }) {
  const isLandscape = template.orientation === "landscape";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5">
        <LayoutTemplate className="h-3 w-3 shrink-0" />
        <span>Preview template: <strong>{template.name}</strong></span>
      </div>
      {!template.backgroundImage && (
        <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Template belum memiliki gambar latar. PDF akan pakai layout default IGH Tour.</span>
        </div>
      )}
      <div
        className="relative w-full overflow-hidden rounded-xl border border-gray-200 shadow-inner bg-gray-100"
        style={{ aspectRatio: isLandscape ? "297/210" : "210/297" }}
      >
        {template.backgroundImage ? (
          <img src={template.backgroundImage} alt="Template background" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <LayoutTemplate className="h-8 w-8 mx-auto mb-1.5 opacity-30" />
              <p className="text-[10px]">Belum ada gambar template</p>
            </div>
          </div>
        )}
        {template.fields.map((field) => {
          const value = getFieldValue(field, offer);
          if (!value || field.key === "priceTable") return null;
          return (
            <div key={field.key} className="absolute leading-none"
              style={{ left: `${field.x}%`, top: `${field.y}%`, fontSize: `${Math.max(6, field.fontSize * 0.55)}px`, fontWeight: field.bold ? "700" : "400", color: field.color, whiteSpace: "nowrap", fontFamily: "Helvetica, Arial, sans-serif", textShadow: "0 0 3px rgba(255,255,255,0.5)", transform: "translateY(-50%)" }}>
              {value}
            </div>
          );
        })}
        {template.fields.find((f) => f.key === "priceTable") && (() => {
          const f = template.fields.find((f) => f.key === "priceTable")!;
          const rows = offer.rows.filter((r) => r.paxRange);
          if (!rows.length) return null;
          return (
            <div className="absolute" style={{ left: `${f.x}%`, top: `${f.y}%` }}>
              <table style={{ fontSize: `${Math.max(5, f.fontSize * 0.5)}px`, borderCollapse: "collapse", color: f.color, fontFamily: "Helvetica, Arial, sans-serif" }}>
                <thead>
                  <tr>{["TOTAL PAX", "QUAD", "TRIPLE", "DOUBLE"].map((h) => (
                    <th key={h} style={{ padding: "1px 4px", fontWeight: 700, borderBottom: "1px solid rgba(0,0,0,0.2)", textAlign: "left" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 4).map((r) => (
                    <tr key={r.paxRange}>
                      <td style={{ padding: "1px 4px", fontWeight: 700 }}>{r.paxRange}</td>
                      <td style={{ padding: "1px 4px" }}>{usd(r.quad)}</td>
                      <td style={{ padding: "1px 4px" }}>{usd(r.triple)}</td>
                      <td style={{ padding: "1px 4px" }}>{usd(r.double)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
      <p className="text-[9.5px] text-gray-400 text-center">Preview perkiraan — posisi & ukuran font final di PDF dapat sedikit berbeda.</p>
    </div>
  );
}

export function PdfPreviewDialog({ open, onOpenChange, data }: Props) {
  const fmt = (n: number) =>
    data.currency === "IDR"
      ? `Rp ${Math.round(n).toLocaleString("id-ID")}`
      : `${symbols[data.currency] ?? data.currency} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  const offer = data.offer;
  const template = data.template;
  const simple = data.simple;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl border border-[hsl(var(--border))] shadow-2xl bg-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <Plane className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-[13.5px] font-bold">
                {template ? `Preview Template — ${template.name}` : "Preview PDF"}
              </DialogTitle>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">
                {template
                  ? template.backgroundImage
                    ? `PDF akan menggunakan layout template "${template.name}"`
                    : `Template tanpa gambar — PDF pakai layout default IGH Tour`
                  : "PDF akan menggunakan layout default IGH Tour"}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {template && offer ? (
            <TemplatePreview template={template} offer={offer} />
          ) : simple ? (
            <div className="relative bg-white border border-[hsl(var(--border))] rounded-xl p-5 text-[hsl(var(--foreground))] overflow-hidden">
              {simple.customBgImage && (
                <img src={simple.customBgImage} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-90" />
              )}
              <div className="relative">
              <div className="flex items-start justify-between gap-4 pb-3 border-b">
                <div>
                  <div className="text-[10.5px] text-muted-foreground font-bold">#{simple.quoteNumber}</div>
                  <h2 className="text-lg font-bold mt-1 leading-tight">{simple.title}</h2>
                  {simple.dateRange && <p className="text-[12px] mt-1 text-muted-foreground">{simple.dateRange}</p>}
                </div>
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <Plane className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-b">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Hotel Makkah</p>
                  <p className="font-bold text-[12.5px] mt-0.5">{simple.hotelMakkah || "—"}</p>
                  {simple.makkahNights > 0 && (
                    <p className="text-[11px] text-primary font-semibold mt-0.5">{simple.makkahNights} Malam</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Hotel Madinah</p>
                  <p className="font-bold text-[12.5px] mt-0.5">{simple.hotelMadinah || "—"}</p>
                  {simple.madinahNights > 0 && (
                    <p className="text-[11px] text-primary font-semibold mt-0.5">{simple.madinahNights} Malam</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <p className="text-[11px] text-muted-foreground">Harga per Pax ({simple.pax} jamaah)</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-primary">Rp {Math.round(simple.pricePerPaxIDR).toLocaleString("id-ID")}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-4 text-[11.5px]">
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3">
                  <p className="font-bold mb-1.5 text-emerald-800">Sudah Termasuk</p>
                  <ul className="space-y-1 list-disc pl-4 text-emerald-900">
                    {simple.included.length === 0
                      ? <li className="italic text-emerald-600 list-none">—</li>
                      : simple.included.slice(0, 12).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div className="border border-rose-200 bg-rose-50 rounded-xl p-3">
                  <p className="font-bold mb-1.5 text-rose-800">Tidak Termasuk</p>
                  <ul className="space-y-1 list-disc pl-4 text-rose-900">
                    {simple.excluded.length === 0
                      ? <li className="italic text-rose-600 list-none">—</li>
                      : simple.excluded.slice(0, 12).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>
              </div>
            </div>
          ) : offer ? (
            <div
              className="relative mx-auto rounded-xl border border-[hsl(var(--border))] shadow-md overflow-hidden text-[hsl(var(--foreground))]"
              style={{ width: "100%", maxWidth: 560, aspectRatio: "210/297", background: "linear-gradient(180deg,#ffffff 0%,#ffffff 60%,#faf5eb 100%)" }}
            >
              {offer.customBgImage && (
                <img src={offer.customBgImage} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              )}
              {/* Top bar */}
              <div className="px-5 pt-4 pb-1 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold text-[#666]">#{offer.quoteNumber}</span>
                    {offer.tier && (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "#f3e2af", color: "#c99841" }}>
                        {offer.tier}
                      </span>
                    )}
                  </div>
                  <h2 className="font-extrabold leading-[1.05] mt-2" style={{ color: "#102463", fontSize: 22, maxWidth: 280 }}>
                    {offer.title}
                  </h2>
                  {offer.subtitle && (
                    <span className="inline-block mt-2 text-[10px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: "#f3e2af", color: "#c99841" }}>
                      {offer.subtitle}
                    </span>
                  )}
                  <p className="text-[10.5px] font-medium mt-2" style={{ color: "#3a2f22" }}>{offer.dateRange}</p>
                </div>
                <div className="shrink-0 text-right">
                  <img src="/logo-igh-tour.png" alt="IGH" className="h-8 ml-auto object-contain" />
                  <p className="text-[8.5px] text-[#888] mt-3">Customer:</p>
                  <p className="text-[11px] font-extrabold" style={{ color: "#102463" }}>{offer.customerName}</p>
                  <div className="h-[1px] bg-[#dcd5c8] w-24 ml-auto mt-1" />
                </div>
              </div>

              {/* Hotel cards */}
              <div className="px-5 mt-2 grid grid-cols-2 gap-3">
                {[
                  { label: "Hotel Makkah", name: offer.hotelMakkah, n: offer.makkahNights, s: offer.makkahStars },
                  { label: "Hotel Madinah", name: offer.hotelMadinah, n: offer.madinahNights, s: offer.madinahStars },
                ].map((h) => (
                  <div key={h.label}>
                    <p className="text-[8.5px] text-[#888]">{h.label}</p>
                    <p className="text-[12px] font-extrabold leading-tight mt-0.5" style={{ color: "#102463" }}>{h.name || "—"}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[8.5px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "#f3e2af", color: "#c99841" }}>
                        {h.n} MALAM
                      </span>
                      <span className="text-[10px]" style={{ color: "#c99841" }}>{"★".repeat(h.s || 5)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price matrix */}
              <div className="px-5 mt-3">
                <table className="w-full text-[9.5px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#dcd5c8]">
                      <th className="text-left py-1.5 font-extrabold text-[#3a2f22]">TOTAL PAX</th>
                      <th className="text-left py-1.5 font-extrabold text-[#3a2f22]">QUAD</th>
                      <th className="text-left py-1.5 font-extrabold text-[#3a2f22]">TRIPLE</th>
                      <th className="text-left py-1.5 font-extrabold text-[#3a2f22]">DOUBLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.rows.map((row) => (
                      <tr key={row.paxRange} className="border-b border-[#eae3d5]">
                        <td className="py-1 font-bold text-[#3a2f22]">{row.paxRange}</td>
                        <td className="py-1 font-extrabold text-[#102463]">{usd(row.quad)}</td>
                        <td className="py-1 font-extrabold text-[#102463]">{usd(row.triple)}</td>
                        <td className="py-1 font-extrabold text-[#102463]">{usd(row.double)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between text-[8px] mt-1.5">
                  <span className="font-bold text-[#3a2f22]">KURS 1 USD = {offer.usdToSar} SAR</span>
                  <span className="text-[#888]">* harga sewaktu-waktu dapat berubah · Update: <strong className="text-[#3a2f22]">{offer.updateDate}</strong></span>
                </div>
              </div>

              {/* Included / Excluded */}
              <div className="px-5 mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="rounded text-center text-white text-[9px] font-extrabold py-1" style={{ background: "#4caf50" }}>
                    Harga Sudah Termasuk
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[7.5px] text-[#3a2f22] list-disc pl-3">
                    {offer.included.slice(0, 16).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="rounded text-center text-white text-[9px] font-extrabold py-1" style={{ background: "#e84950" }}>
                    Harga Tidak Termasuk
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[7.5px] text-[#3a2f22] list-disc pl-3">
                    {offer.excluded.slice(0, 12).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="absolute left-0 right-0 bottom-0" style={{ background: "#102463", height: 60 }}>
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#c99841" }} />
                <div className="px-5 pt-2.5 flex items-center justify-between gap-2 h-full">
                  <div className="text-[8.5px] leading-tight">
                    <p className="font-extrabold text-white">Pelopor Layanan</p>
                    <p className="font-extrabold" style={{ color: "#c99841" }}>Land Arrangement</p>
                    <p className="font-extrabold text-white">Umrah & Haji</p>
                  </div>
                  <p className="text-[9px] text-white">{offer.website}</p>
                  <div className="rounded-md bg-white px-2.5 py-1.5 text-right">
                    <p className="text-[6.5px] text-[#888]">Informasi & Pemesanan</p>
                    <p className="text-[10px] font-extrabold" style={{ color: "#102463" }}>{offer.contactPhone}</p>
                    <p className="text-[6.5px] text-[#888]">{offer.contactName}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-5">
              <div className="flex items-center justify-between pb-4 border-b-2 border-primary">
                <div className="flex items-center gap-2.5">
                  <Plane className="h-5 w-5" />
                  <div>
                    <h2 className="text-base font-bold">IGH Tour</h2>
                    <p className="text-[10.5px] text-muted-foreground">Penawaran Paket Umrah</p>
                  </div>
                </div>
                <div className="text-right text-[10.5px] text-muted-foreground">
                  <div>Tanggal: {new Date().toLocaleDateString("id-ID")}</div>
                  <div>No: IGH-{Date.now().toString().slice(-6)}</div>
                </div>
              </div>

              <div className="py-4">
                <h1 className="text-xl font-bold">{data.packageName || "Paket Umrah IGH"}</h1>
                <p className="text-muted-foreground text-[12px] mt-0.5">📍 {data.destination || "—"} · {data.people} jamaah</p>
              </div>

              <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-[hsl(var(--secondary))]">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Komponen Biaya</th>
                      <th className="text-right px-3 py-2 font-semibold">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.costs.filter((c) => c.amount > 0).map((c) => (
                      <tr key={c.id} className="border-t border-[hsl(var(--border))]">
                        <td className="px-3 py-2">{c.label}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-accent">
                    <tr className="border-t-2 border-primary">
                      <td className="px-3 py-2 font-bold">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-base text-primary">{fmt(data.total)}</td>
                    </tr>
                    <tr className="border-t border-[hsl(var(--border))]">
                      <td className="px-3 py-1.5 text-muted-foreground text-[11.5px]">Per jamaah</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-[11.5px]">{fmt(data.perPerson)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-[10.5px] text-muted-foreground mt-4 pt-4 border-t border-[hsl(var(--border))]">
                Penawaran berlaku 14 hari. Harga dapat berubah sesuai ketersediaan dan kurs.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2 shrink-0 bg-white/80 backdrop-blur-sm">
          <button onClick={() => onOpenChange(false)}
            className="h-8 px-4 rounded-xl text-[12px] font-semibold bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors">
            Tutup
          </button>
          <button
            className="h-8 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 transition-all"
            style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
            onClick={() => {
              try {
                const { mode, rates } = useRatesStore.getState();
                generateQuotationPdf({
                  ...data,
                  rateMeta: {
                    mode,
                    ratesUSD: rates.USD,
                    ratesSAR: rates.SAR,
                    asOf: new Date().toISOString(),
                  },
                });
                toast.success("PDF berhasil diunduh");
              } catch (err) {
                console.error(err);
                toast.error("Gagal membuat PDF");
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Unduh PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
