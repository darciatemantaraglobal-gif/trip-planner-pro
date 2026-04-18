import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Hotel, FileCheck, Bus, UserCheck, Plus, Trash2, FileText, Calculator as CalcIcon, ArrowRight } from "lucide-react";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { useTripCalculator } from "@/features/calculator/useTripCalculator";
import type { Currency } from "@/lib/exchangeRates";

const initialCosts = [
  { id: "flight", label: "Flight", icon: Plane, amount: 0 },
  { id: "hotel", label: "Hotel", icon: Hotel, amount: 0 },
  { id: "visa", label: "Visa", icon: FileCheck, amount: 0 },
  { id: "transport", label: "Transport", icon: Bus, amount: 0 },
  { id: "guide", label: "Guide", icon: UserCheck, amount: 0 },
];

const currencySymbols: Record<string, string> = { USD: "$", SAR: "﷼", IDR: "Rp" };
const iconMap: Record<string, any> = {
  flight: Plane, hotel: Hotel, visa: FileCheck, transport: Bus, guide: UserCheck,
};

export default function Calculator() {
  const calc = useTripCalculator({
    costs: initialCosts.map(({ icon, ...rest }) => rest),
  });
  const [pdfOpen, setPdfOpen] = useState(false);

  const symbol = currencySymbols[calc.currency];
  const fmtInput = (n: number) =>
    `${symbol} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  const fmtIDR = (n: number) =>
    `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

  const addCustomCost = () =>
    calc.addCost({ id: `c-${Date.now()}`, label: "Custom", amount: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trip Package Calculator</h1>
        <p className="text-muted-foreground mt-1">
          Build a custom trip package — all costs converted to IDR in real time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalcIcon className="h-5 w-5 text-primary" />
              Package Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pkg">Package Name</Label>
                <Input id="pkg" placeholder="e.g. Bali Paradise 5D"
                  value={calc.packageName}
                  onChange={(e) => calc.setField("packageName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest">Destination</Label>
                <Input id="dest" placeholder="e.g. Bali, Indonesia"
                  value={calc.destination}
                  onChange={(e) => calc.setField("destination", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="people">Number of People</Label>
                <Input id="people" type="number" min={1}
                  value={calc.people}
                  onChange={(e) => calc.setField("people", Math.max(1, Number(e.target.value)))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Input Currency</Label>
                <Select value={calc.currency} onValueChange={(v) => calc.setField("currency", v as Currency)}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                    <SelectItem value="IDR">IDR — Indonesian Rupiah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {calc.currency !== "IDR" && (
              <div className="flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">1 {calc.currency}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-semibold text-foreground">
                  Rp {calc.rates[calc.currency].toLocaleString("id-ID")}
                </span>
                <span className="ml-auto">mock rate</span>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Cost Breakdown</h3>
                <Button variant="outline" size="sm" onClick={addCustomCost}>
                  <Plus className="h-4 w-4 mr-1" /> Add item
                </Button>
              </div>

              {calc.costs.map((c) => {
                const Icon = iconMap[c.id] ?? Plus;
                return (
                  <div key={c.id} className="flex items-center gap-3 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <Input
                      value={c.label}
                      onChange={(e) => calc.updateCostLabel(c.id, e.target.value)}
                      className="max-w-[180px]"
                    />
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={c.amount || ""}
                        onChange={(e) => calc.updateCostAmount(c.id, Number(e.target.value))}
                        className="pl-8"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => calc.removeCost(c.id)}
                      className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Margin</Label>
                <span className="text-sm font-semibold text-primary">{calc.marginPercent}%</span>
              </div>
              <Slider
                value={[calc.marginPercent]}
                min={0}
                max={50}
                step={1}
                onValueChange={(v) => calc.setField("marginPercent", v[0])}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md gradient-card h-fit sticky top-20">
          <CardHeader>
            <CardTitle>Summary (IDR)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Package</div>
              <div className="font-semibold">{calc.packageName || "Untitled package"}</div>
              <div className="text-sm text-muted-foreground">{calc.destination || "No destination"}</div>
            </div>

            <div className="rounded-xl gradient-primary p-5 text-primary-foreground shadow-md">
              <div className="text-xs opacity-80">Total Cost</div>
              <div className="text-2xl font-bold mt-1">{fmtIDR(calc.quote.totalIDR)}</div>
              <div className="mt-3 pt-3 border-t border-primary-foreground/20">
                <div className="text-xs opacity-80">Per person ({calc.people})</div>
                <div className="text-lg font-semibold mt-1">{fmtIDR(calc.quote.perPersonIDR)}</div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Margin ({calc.marginPercent}%)</span>
                <span className="font-medium text-foreground">{fmtIDR(calc.quote.marginIDR)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1.5 border-t">
                <span>Final Price</span>
                <span className="text-primary">{fmtIDR(calc.quote.finalPriceIDR)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Final / person</span>
                <span>{fmtIDR(calc.quote.finalPerPersonIDR)}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              {calc.quote.breakdown.filter((c) => c.amountIDR > 0).map((c) => (
                <div key={c.id} className="flex justify-between text-muted-foreground">
                  <span>{c.label}</span>
                  <span className="font-medium text-foreground">{fmtIDR(c.amountIDR)}</span>
                </div>
              ))}
              {calc.quote.totalIDR === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Enter cost amounts to see breakdown</p>
              )}
            </div>

            <Button
              className="w-full gradient-primary text-primary-foreground shadow-md hover:opacity-90 transition-smooth"
              onClick={() => setPdfOpen(true)}
              disabled={calc.quote.totalIDR === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      <PdfPreviewDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        data={{
          packageName: calc.packageName,
          destination: calc.destination,
          people: calc.people,
          currency: "IDR",
          costs: calc.quote.breakdown.map((b) => ({ id: b.id, label: b.label, amount: b.amountIDR })),
          total: calc.quote.finalPriceIDR,
          perPerson: calc.quote.finalPerPersonIDR,
        }}
      />
    </div>
  );
}
