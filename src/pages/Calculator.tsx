import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Hotel, FileCheck, Bus, UserCheck, Plus, Trash2, FileText, Calculator as CalcIcon } from "lucide-react";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";

type CostItem = { id: string; label: string; icon: any; amount: number };

const initialCosts: CostItem[] = [
  { id: "flight", label: "Flight", icon: Plane, amount: 0 },
  { id: "hotel", label: "Hotel", icon: Hotel, amount: 0 },
  { id: "visa", label: "Visa", icon: FileCheck, amount: 0 },
  { id: "transport", label: "Transport", icon: Bus, amount: 0 },
  { id: "guide", label: "Guide", icon: UserCheck, amount: 0 },
];

const currencySymbols: Record<string, string> = { USD: "$", SAR: "﷼", IDR: "Rp" };

export default function Calculator() {
  const [destination, setDestination] = useState("");
  const [packageName, setPackageName] = useState("");
  const [people, setPeople] = useState(1);
  const [currency, setCurrency] = useState("USD");
  const [costs, setCosts] = useState<CostItem[]>(initialCosts);
  const [pdfOpen, setPdfOpen] = useState(false);

  const total = useMemo(() => costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0), [costs]);
  const perPerson = people > 0 ? total / people : 0;

  const updateCost = (id: string, amount: number) => {
    setCosts((prev) => prev.map((c) => (c.id === id ? { ...c, amount } : c)));
  };

  const addCustomCost = () => {
    setCosts((prev) => [...prev, { id: `c-${Date.now()}`, label: "Custom", icon: Plus, amount: 0 }]);
  };

  const removeCost = (id: string) => setCosts((prev) => prev.filter((c) => c.id !== id));

  const fmt = (n: number) =>
    `${currencySymbols[currency]} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trip Package Calculator</h1>
        <p className="text-muted-foreground mt-1">Build a custom trip package with auto-calculated pricing.</p>
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
                <Input id="pkg" placeholder="e.g. Bali Paradise 5D" value={packageName} onChange={(e) => setPackageName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest">Destination</Label>
                <Input id="dest" placeholder="e.g. Bali, Indonesia" value={destination} onChange={(e) => setDestination(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="people">Number of People</Label>
                <Input id="people" type="number" min={1} value={people} onChange={(e) => setPeople(Math.max(1, Number(e.target.value)))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                    <SelectItem value="IDR">IDR — Indonesian Rupiah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Cost Breakdown</h3>
                <Button variant="outline" size="sm" onClick={addCustomCost}>
                  <Plus className="h-4 w-4 mr-1" /> Add item
                </Button>
              </div>

              {costs.map((c) => (
                <div key={c.id} className="flex items-center gap-3 group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
                    <c.icon className="h-4 w-4" />
                  </div>
                  <Input
                    value={c.label}
                    onChange={(e) => setCosts((p) => p.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))}
                    className="max-w-[180px]"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={c.amount || ""}
                    onChange={(e) => updateCost(c.id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCost(c.id)}
                    className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md gradient-card h-fit sticky top-20">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Package</div>
              <div className="font-semibold">{packageName || "Untitled package"}</div>
              <div className="text-sm text-muted-foreground">{destination || "No destination"}</div>
            </div>

            <div className="rounded-xl gradient-primary p-5 text-primary-foreground shadow-md">
              <div className="text-xs opacity-80">Total Cost</div>
              <div className="text-3xl font-bold mt-1">{fmt(total)}</div>
              <div className="mt-3 pt-3 border-t border-primary-foreground/20">
                <div className="text-xs opacity-80">Per person ({people})</div>
                <div className="text-xl font-semibold mt-1">{fmt(perPerson)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-accent/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Final Price</div>
                  <div className="text-[10px] text-muted-foreground/70">incl. 15% margin (mock)</div>
                </div>
                <div className="text-xl font-bold text-primary">{fmt(perPerson)}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {costs.filter((c) => c.amount > 0).map((c) => (
                <div key={c.id} className="flex justify-between text-muted-foreground">
                  <span>{c.label}</span>
                  <span className="font-medium text-foreground">{fmt(c.amount)}</span>
                </div>
              ))}
              {costs.every((c) => !c.amount) && (
                <p className="text-xs text-muted-foreground text-center py-4">Enter cost amounts to see breakdown</p>
              )}
            </div>

            <Button
              className="w-full gradient-primary text-primary-foreground shadow-md hover:opacity-90 transition-smooth"
              onClick={() => setPdfOpen(true)}
              disabled={total === 0}
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
        data={{ packageName, destination, people, currency, costs, total, perPerson }}
      />
    </div>
  );
}
