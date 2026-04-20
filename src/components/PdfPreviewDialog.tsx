import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Plane, LayoutTemplate, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPdf, type LandArrangementOfferData } from "@/lib/generatePdf";
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

/** Canvas-style preview of the template with live offer data overlaid */
function TemplatePreview({ template, offer }: { template: PdfTemplate; offer: LandArrangementOfferData }) {
  const isLandscape = template.orientation === "landscape";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
        <LayoutTemplate className="h-3.5 w-3.5 shrink-0" />
        <span>Preview menggunakan template: <strong>{template.name}</strong></span>
      </div>

      {!template.backgroundImage && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Template ini belum memiliki gambar latar. PDF akan digenerate dengan layout default IGH Tour.</span>
        </div>
      )}

      <div
        className="relative w-full overflow-hidden rounded-xl border border-gray-200 shadow-inner bg-gray-100"
        style={{ aspectRatio: isLandscape ? "297/210" : "210/297" }}
      >
        {/* Background image */}
        {template.backgroundImage ? (
          <img
            src={template.backgroundImage}
            alt="Template background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <LayoutTemplate className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Belum ada gambar template</p>
            </div>
          </div>
        )}

        {/* Overlay: field text at their configured positions */}
        {template.fields.map((field) => {
          const value = getFieldValue(field, offer);
          if (!value || field.key === "priceTable") return null;
          return (
            <div
              key={field.key}
              className="absolute leading-none"
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                fontSize: `${Math.max(6, field.fontSize * 0.55)}px`,
                fontWeight: field.bold ? "700" : "400",
                color: field.color,
                whiteSpace: "nowrap",
                fontFamily: "Helvetica, Arial, sans-serif",
                textShadow: "0 0 3px rgba(255,255,255,0.5)",
                transform: "translateY(-50%)",
              }}
            >
              {value}
            </div>
          );
        })}

        {/* Price table placeholder */}
        {template.fields.find((f) => f.key === "priceTable") && (() => {
          const f = template.fields.find((f) => f.key === "priceTable")!;
          const rows = offer.rows.filter((r) => r.paxRange);
          if (!rows.length) return null;
          return (
            <div
              className="absolute"
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            >
              <table
                style={{
                  fontSize: `${Math.max(5, f.fontSize * 0.5)}px`,
                  borderCollapse: "collapse",
                  color: f.color,
                  fontFamily: "Helvetica, Arial, sans-serif",
                }}
              >
                <thead>
                  <tr>
                    {["TOTAL PAX","QUAD","TRIPLE","DOUBLE"].map((h) => (
                      <th key={h} style={{ padding: "1px 4px", fontWeight: 700, borderBottom: "1px solid rgba(0,0,0,0.2)", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
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

      <p className="text-[10px] text-gray-400 text-center">
        Preview ini adalah perkiraan — posisi dan ukuran font final dapat sedikit berbeda di PDF.
      </p>
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {template ? `Preview Template — ${template.name}` : "PDF Preview"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pratinjau penawaran sebelum diunduh sebagai PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto space-y-3 pr-1">
          {/* ── Template preview (when template selected) ── */}
          {template && offer ? (
            <TemplatePreview template={template} offer={offer} />
          ) : offer ? (
            /* ── Default offer HTML preview ── */
            <div className="bg-white border rounded-lg p-4 md:p-6 shadow-inner text-[hsl(var(--foreground))]">
              <div className="flex items-start justify-between gap-4 pb-4 border-b">
                <div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">#{offer.quoteNumber}</span>
                    <span>{offer.tier}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mt-4 max-w-md leading-tight">{offer.title}</h2>
                  <p className="text-sm mt-2">{offer.subtitle}</p>
                  <p className="text-sm font-medium mt-1">{offer.dateRange}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">Customer:</p>
                  <p className="font-bold">{offer.customerName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 py-4 border-b">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Hotel Makkah</p>
                  <p className="font-bold mt-1">{offer.hotelMakkah}</p>
                  <p className="text-xs text-primary font-semibold mt-1">{offer.makkahNights} MALAM · {"★".repeat(offer.makkahStars)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Hotel Madinah</p>
                  <p className="font-bold mt-1">{offer.hotelMadinah}</p>
                  <p className="text-xs text-primary font-semibold mt-1">{offer.madinahNights} MALAM · {"★".repeat(offer.madinahStars)}</p>
                </div>
              </div>

              <div className="overflow-x-auto mt-4 border rounded-lg">
                <table className="w-full text-sm min-w-[620px]">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">TOTAL PAX</th>
                      <th className="px-4 py-3 text-center">QUAD</th>
                      <th className="px-4 py-3 text-center">TRIPLE</th>
                      <th className="px-4 py-3 text-center">DOUBLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.rows.map((row) => (
                      <tr key={row.paxRange} className="border-t">
                        <td className="px-4 py-2.5 font-semibold">{row.paxRange}</td>
                        <td className="px-4 py-2.5 text-center font-bold">{usd(row.quad)}</td>
                        <td className="px-4 py-2.5 text-center font-bold">{usd(row.triple)}</td>
                        <td className="px-4 py-2.5 text-center font-bold">{usd(row.double)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                <strong className="text-foreground">KURS 1 USD = {offer.usdToSar} SAR</strong> · Harga sewaktu-waktu dapat berubah. Update: {offer.updateDate}
              </p>

              <div className="grid md:grid-cols-2 gap-4 mt-5 text-xs">
                <div className="border rounded-lg p-3">
                  <p className="font-bold mb-2 text-center">Harga Sudah Termasuk</p>
                  <ul className="space-y-1 list-disc pl-4">
                    {offer.included.slice(0, 8).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="font-bold mb-2 text-center">Harga Tidak Termasuk</p>
                  <ul className="space-y-1 list-disc pl-4">
                    {offer.excluded.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* ── Generic package preview (no offer) ── */
            <div className="bg-white border rounded-lg p-8 shadow-inner">
              <div className="flex items-center justify-between pb-6 border-b-2 border-primary">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 flex items-center justify-center">
                    <Plane className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">IGH Tour</h2>
                    <p className="text-xs text-muted-foreground">Penawaran Paket Umrah</p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>Tanggal: {new Date().toLocaleDateString("id-ID")}</div>
                  <div>No. Penawaran: IGH-{Date.now().toString().slice(-6)}</div>
                </div>
              </div>

              <div className="py-6">
                <h1 className="text-2xl font-bold text-foreground">{data.packageName || "Paket Umrah IGH"}</h1>
                <p className="text-muted-foreground mt-1">📍 {data.destination || "—"}</p>
                <p className="text-sm text-muted-foreground mt-1">{data.people} jamaah</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Komponen Biaya</th>
                      <th className="text-right px-4 py-3 font-semibold">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.costs.filter((c) => c.amount > 0).map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3">{c.label}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-accent">
                    <tr className="border-t-2 border-primary">
                      <td className="px-4 py-3 font-bold">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-lg text-primary">{fmt(data.total)}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-muted-foreground">Per jamaah</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(data.perPerson)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-xs text-muted-foreground mt-6 pt-6 border-t">
                Penawaran ini berlaku 14 hari. Harga dapat berubah sesuai ketersediaan dan kurs mata uang.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="text-xs text-muted-foreground">
            {template
              ? template.backgroundImage
                ? `📄 PDF akan menggunakan layout template "${template.name}"`
                : `⚠️ Template tanpa gambar — PDF akan pakai layout default IGH Tour`
              : "📄 PDF akan menggunakan layout default IGH Tour"}
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => {
                try {
                  generateQuotationPdf(data);
                  toast.success("PDF berhasil diunduh");
                } catch (err) {
                  console.error(err);
                  toast.error("Gagal membuat PDF");
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Unduh PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
