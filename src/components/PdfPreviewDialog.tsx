import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, Plane, LayoutTemplate, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPdf, type LandArrangementOfferData } from "@/lib/generatePdf";
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
          ) : offer ? (
            <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 text-[hsl(var(--foreground))]">
              <div className="flex items-start justify-between gap-4 pb-3 border-b">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">#{offer.quoteNumber}</span>
                    <span>{offer.tier}</span>
                  </div>
                  <h2 className="text-lg font-bold mt-2 max-w-xs leading-tight">{offer.title}</h2>
                  <p className="text-[12px] mt-1">{offer.subtitle}</p>
                  <p className="text-[12px] font-medium mt-0.5">{offer.dateRange}</p>
                </div>
                <div className="text-right text-[11px] shrink-0">
                  <p className="text-muted-foreground">Customer:</p>
                  <p className="font-bold">{offer.customerName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-b">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Hotel Makkah</p>
                  <p className="font-bold text-[12.5px] mt-0.5">{offer.hotelMakkah}</p>
                  <p className="text-[11px] text-primary font-semibold mt-0.5">{offer.makkahNights} Malam · {"★".repeat(offer.makkahStars)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Hotel Madinah</p>
                  <p className="font-bold text-[12.5px] mt-0.5">{offer.hotelMadinah}</p>
                  <p className="text-[11px] text-primary font-semibold mt-0.5">{offer.madinahNights} Malam · {"★".repeat(offer.madinahStars)}</p>
                </div>
              </div>

              <div className="overflow-x-auto mt-3 border border-[hsl(var(--border))] rounded-xl">
                <table className="w-full text-[12px] min-w-[500px]">
                  <thead className="bg-[hsl(var(--secondary))] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">TOTAL PAX</th>
                      <th className="px-3 py-2 text-center">QUAD</th>
                      <th className="px-3 py-2 text-center">TRIPLE</th>
                      <th className="px-3 py-2 text-center">DOUBLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.rows.map((row) => (
                      <tr key={row.paxRange} className="border-t border-[hsl(var(--border))]">
                        <td className="px-3 py-2 font-semibold">{row.paxRange}</td>
                        <td className="px-3 py-2 text-center font-bold">{usd(row.quad)}</td>
                        <td className="px-3 py-2 text-center font-bold">{usd(row.triple)}</td>
                        <td className="px-3 py-2 text-center font-bold">{usd(row.double)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10.5px] text-muted-foreground mt-3">
                <strong className="text-foreground">1 USD = {offer.usdToSar} SAR</strong> · Update: {offer.updateDate}
              </p>

              <div className="grid md:grid-cols-2 gap-3 mt-4 text-[11.5px]">
                <div className="border border-[hsl(var(--border))] rounded-xl p-3">
                  <p className="font-bold mb-1.5 text-center">Sudah Termasuk</p>
                  <ul className="space-y-1 list-disc pl-4">
                    {offer.included.slice(0, 8).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="border border-[hsl(var(--border))] rounded-xl p-3">
                  <p className="font-bold mb-1.5 text-center">Tidak Termasuk</p>
                  <ul className="space-y-1 list-disc pl-4">
                    {offer.excluded.map((item) => <li key={item}>{item}</li>)}
                  </ul>
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
