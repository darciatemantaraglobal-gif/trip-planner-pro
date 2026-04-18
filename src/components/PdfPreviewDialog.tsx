import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Plane } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPdf, type LandArrangementOfferData } from "@/lib/generatePdf";

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
  };
}

function usd(n: number) {
  return `$ ${Math.round(n).toLocaleString("en-US")}`;
}

export function PdfPreviewDialog({ open, onOpenChange, data }: Props) {
  const fmt = (n: number) =>
    data.currency === "IDR"
      ? `Rp ${Math.round(n).toLocaleString("id-ID")}`
      : `${symbols[data.currency] ?? data.currency} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  const offer = data.offer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>PDF Preview</DialogTitle>
        </DialogHeader>

        {offer ? (
          <div className="bg-white border rounded-lg p-4 md:p-6 shadow-inner max-h-[65vh] overflow-y-auto text-[hsl(var(--foreground))]">
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
          <div className="bg-white border rounded-lg p-8 shadow-inner max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-6 border-b-2 border-primary">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
                  <Plane className="h-6 w-6 text-primary-foreground" />
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

        <div className="flex justify-end gap-2">
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
      </DialogContent>
    </Dialog>
  );
}
