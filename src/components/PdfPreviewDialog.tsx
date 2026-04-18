import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Plane } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPdf } from "@/lib/generatePdf";

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
  };
}

export function PdfPreviewDialog({ open, onOpenChange, data }: Props) {
  const fmt = (n: number) =>
    `${symbols[data.currency]} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>PDF Preview</DialogTitle>
        </DialogHeader>

        <div className="bg-white border rounded-lg p-8 shadow-inner max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-6 border-b-2 border-primary">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
                <Plane className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">TravelHub</h2>
                <p className="text-xs text-muted-foreground">Trip Package Quotation</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Date: {new Date().toLocaleDateString()}</div>
              <div>Quote #: TH-{Date.now().toString().slice(-6)}</div>
            </div>
          </div>

          <div className="py-6">
            <h1 className="text-2xl font-bold text-foreground">{data.packageName || "Untitled Package"}</h1>
            <p className="text-muted-foreground mt-1">📍 {data.destination || "—"}</p>
            <p className="text-sm text-muted-foreground mt-1">For {data.people} {data.people === 1 ? "person" : "people"}</p>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Item</th>
                  <th className="text-right px-4 py-3 font-semibold">Amount</th>
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
                  <td className="px-4 py-2 text-muted-foreground">Per person</td>
                  <td className="px-4 py-2 text-right font-semibold">{fmt(data.perPerson)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-muted-foreground mt-6 pt-6 border-t">
            This quotation is valid for 14 days. Prices subject to availability and currency fluctuations.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            className="gradient-primary text-primary-foreground"
            onClick={() => {
              try {
                generateQuotationPdf(data);
                toast.success("PDF downloaded");
              } catch (err) {
                console.error(err);
                toast.error("Failed to generate PDF");
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
