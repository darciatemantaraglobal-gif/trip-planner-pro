import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Package, DollarSign, Users, TrendingUp, ArrowUpRight, MapPin } from "lucide-react";
import { CurrencyExchangeCard } from "@/components/CurrencyExchangeCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const stats = [
  { label: "Active Packages", value: "24", change: "+12%", icon: Package, color: "from-primary to-primary-glow" },
  { label: "Revenue (IDR)", value: "Rp 482M", change: "+18%", icon: DollarSign, color: "from-success to-emerald-400" },
  { label: "Travelers", value: "1,284", change: "+7%", icon: Users, color: "from-warning to-orange-400" },
  { label: "Conversion", value: "68%", change: "+4%", icon: TrendingUp, color: "from-violet-500 to-fuchsia-400" },
];

const recentPackages = [
  { name: "Bali Paradise 5D", destination: "Bali, Indonesia", people: 4, total: "Rp 48,500,000", status: "Confirmed" },
  { name: "Umrah Premium 12D", destination: "Mecca, Saudi Arabia", people: 2, total: "Rp 92,000,000", status: "Paid" },
  { name: "Tokyo Discovery 7D", destination: "Tokyo, Japan", people: 3, total: "Rp 64,200,000", status: "Calculated" },
  { name: "European Tour 10D", destination: "Paris, France", people: 6, total: "Rp 156,000,000", status: "Draft" },
  { name: "Maldives Honeymoon", destination: "Malé, Maldives", people: 2, total: "Rp 38,750,000", status: "Completed" },
];

const statusVariant: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Calculated: "bg-primary/10 text-primary",
  Confirmed: "bg-warning/10 text-warning",
  Paid: "bg-success/10 text-success",
  Completed: "bg-emerald-500/10 text-emerald-600",
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back — here's your travel business overview.</p>
        </div>
        <Button className="gradient-primary text-primary-foreground shadow-md hover:opacity-90 transition-smooth">
          <Package className="h-4 w-4 mr-2" />
          New Package
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-smooth">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                  <p className="text-xs text-success font-medium mt-2 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.change} this month
                  </p>
                </div>
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Packages</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Latest trips you've configured</p>
            </div>
            <Button variant="ghost" size="sm">View all</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead className="hidden md:table-cell">People</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPackages.map((pkg) => (
                  <TableRow key={pkg.name}>
                    <TableCell>
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {pkg.destination}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{pkg.people}</TableCell>
                    <TableCell className="font-semibold">{pkg.total}</TableCell>
                    <TableCell>
                      <Badge className={`${statusVariant[pkg.status]} border-0 font-medium`}>{pkg.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <CurrencyExchangeCard />

          <Card className="border-0 shadow-md gradient-card">
            <CardHeader>
              <CardTitle>Monthly Goal</CardTitle>
              <p className="text-sm text-muted-foreground">Revenue target progress</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">Rp 482M</span>
                  <span className="text-sm text-muted-foreground">/ Rp 600M</span>
                </div>
                <Progress value={80} className="mt-3 h-2" />
                <p className="text-xs text-muted-foreground mt-2">80% achieved · 12 days left</p>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">New bookings</span>
                  <span className="font-semibold">+24</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg. package value</span>
                  <span className="font-semibold">Rp 20.1M</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Top destination</span>
                  <span className="font-semibold">Bali 🌴</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
