import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Package, DollarSign, Users, TrendingUp, ArrowUpRight, MapPin, Plus } from "lucide-react";
import { CurrencyExchangeCard } from "@/components/CurrencyExchangeCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const stats = [
  { label: "Active Packages", value: "24", change: "+12%", icon: Package, gradient: "from-[hsl(344_70%_75%)] to-[hsl(320_70%_72%)]", glow: "shadow-[0_8px_24px_hsl(344_70%_75%/0.35)]" },
  { label: "Revenue (IDR)", value: "Rp 482M", change: "+18%", icon: DollarSign, gradient: "from-emerald-400 to-teal-500", glow: "shadow-[0_8px_24px_hsl(160_60%_45%/0.35)]" },
  { label: "Travelers", value: "1,284", change: "+7%", icon: Users, gradient: "from-amber-400 to-orange-500", glow: "shadow-[0_8px_24px_hsl(38_92%_50%/0.35)]" },
  { label: "Conversion", value: "68%", change: "+4%", icon: TrendingUp, gradient: "from-violet-500 to-fuchsia-400", glow: "shadow-[0_8px_24px_hsl(270_60%_60%/0.35)]" },
];

const recentPackages = [
  { name: "Bali Paradise 5D", destination: "Bali, Indonesia", people: 4, total: "Rp 48,500,000", status: "Confirmed" },
  { name: "Umrah Premium 12D", destination: "Mecca, Saudi Arabia", people: 2, total: "Rp 92,000,000", status: "Paid" },
  { name: "Tokyo Discovery 7D", destination: "Tokyo, Japan", people: 3, total: "Rp 64,200,000", status: "Calculated" },
  { name: "European Tour 10D", destination: "Paris, France", people: 6, total: "Rp 156,000,000", status: "Draft" },
  { name: "Maldives Honeymoon", destination: "Malé, Maldives", people: 2, total: "Rp 38,750,000", status: "Completed" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  Draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-0" },
  Calculated: { label: "Calculated", className: "bg-[hsl(344_70%_96%)] text-[hsl(344_60%_45%)] border-0" },
  Confirmed: { label: "Confirmed", className: "bg-amber-50 text-amber-600 border-0" },
  Paid: { label: "Paid", className: "bg-emerald-50 text-emerald-600 border-0" },
  Completed: { label: "Completed", className: "bg-teal-50 text-teal-600 border-0" },
};

export default function Dashboard() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--card-foreground))]">
            Good morning, Travel Agent 👋
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Here's your travel business overview for today.
          </p>
        </div>
        <Button className="gradient-primary text-white shadow-glow hover:opacity-90 transition-smooth rounded-xl h-10 px-5 text-sm font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          New Package
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-2xl bg-white border border-[hsl(var(--border))] p-5 hover:shadow-md transition-smooth group"
          >
            {/* Gradient icon */}
            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.glow} flex items-center justify-center mb-4`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-[hsl(var(--card-foreground))] mt-1">
              {stat.value}
            </p>
            <p className="text-xs text-emerald-500 font-medium mt-1.5 flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              {stat.change} this month
            </p>
            {/* Decorative gradient blob */}
            <div className={`absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 group-hover:opacity-20 transition-smooth`} />
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Packages table */}
        <div className="lg:col-span-2 rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
            <div>
              <h2 className="font-semibold text-[hsl(var(--card-foreground))]">Recent Packages</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Latest trips configured</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] rounded-lg text-xs">
              View all
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[hsl(var(--border))]">
                <TableHead className="text-xs text-[hsl(var(--muted-foreground))] font-medium">Package</TableHead>
                <TableHead className="hidden md:table-cell text-xs text-[hsl(var(--muted-foreground))] font-medium">People</TableHead>
                <TableHead className="text-xs text-[hsl(var(--muted-foreground))] font-medium">Total</TableHead>
                <TableHead className="text-xs text-[hsl(var(--muted-foreground))] font-medium">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPackages.map((pkg) => (
                <TableRow key={pkg.name} className="border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]">
                  <TableCell>
                    <div className="font-medium text-sm text-[hsl(var(--card-foreground))]">{pkg.name}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {pkg.destination}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-[hsl(var(--card-foreground))]">{pkg.people}</TableCell>
                  <TableCell className="font-semibold text-sm text-[hsl(var(--card-foreground))]">{pkg.total}</TableCell>
                  <TableCell>
                    <Badge className={`${statusConfig[pkg.status].className} text-xs font-medium px-2 py-0.5 rounded-lg`}>
                      {statusConfig[pkg.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <CurrencyExchangeCard />

          {/* Monthly Goal */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-[hsl(var(--card-foreground))]">Monthly Goal</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Revenue target progress</p>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-[hsl(var(--card-foreground))]">Rp 482M</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">/ Rp 600M</span>
            </div>
            <div className="relative h-2 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary transition-all duration-700"
                style={{ width: "80%" }}
              />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">80% achieved · 12 days left</p>

            <div className="mt-5 space-y-3 pt-4 border-t border-[hsl(var(--border))]">
              {[
                { label: "New bookings", value: "+24" },
                { label: "Avg. package value", value: "Rp 20.1M" },
                { label: "Top destination", value: "Bali 🌴" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">{item.label}</span>
                  <span className="font-semibold text-[hsl(var(--card-foreground))]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
