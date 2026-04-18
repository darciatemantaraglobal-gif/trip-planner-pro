import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Users, Calendar, MoreHorizontal, Plus, Search } from "lucide-react";

const packages = [
  { name: "Bali Paradise 5D", destination: "Bali, Indonesia", people: 4, days: 5, price: "Rp 48,500,000", status: "Confirmed", img: "🌴" },
  { name: "Umrah Premium 12D", destination: "Mecca, Saudi Arabia", people: 2, days: 12, price: "Rp 92,000,000", status: "Paid", img: "🕌" },
  { name: "Tokyo Discovery 7D", destination: "Tokyo, Japan", people: 3, days: 7, price: "Rp 64,200,000", status: "Calculated", img: "🗼" },
  { name: "European Tour 10D", destination: "Paris, France", people: 6, days: 10, price: "Rp 156,000,000", status: "Draft", img: "🗼" },
  { name: "Maldives Honeymoon", destination: "Malé, Maldives", people: 2, days: 6, price: "Rp 38,750,000", status: "Completed", img: "🏝️" },
  { name: "Singapore Family", destination: "Singapore", people: 5, days: 4, price: "Rp 42,000,000", status: "Confirmed", img: "🌃" },
];

const statusVariant: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Calculated: "bg-primary/10 text-primary",
  Confirmed: "bg-warning/10 text-warning",
  Paid: "bg-success/10 text-success",
  Completed: "bg-emerald-500/10 text-emerald-600",
};

export default function Packages() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packages</h1>
          <p className="text-muted-foreground mt-1">Manage and review all your travel packages.</p>
        </div>
        <Button className="gradient-primary text-primary-foreground shadow-md hover:opacity-90 transition-smooth">
          <Plus className="h-4 w-4 mr-2" />
          Create Package
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search packages..." className="pl-9" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.name} className="border-0 shadow-md hover:shadow-lg transition-smooth overflow-hidden group">
            <div className="h-32 gradient-hero relative flex items-center justify-center text-6xl">
              {pkg.img}
              <Badge className={`${statusVariant[pkg.status]} border-0 absolute top-3 right-3 font-medium`}>
                {pkg.status}
              </Badge>
            </div>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{pkg.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {pkg.destination}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {pkg.people}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {pkg.days} days</span>
              </div>

              <div className="pt-3 border-t flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-bold text-primary">{pkg.price}</div>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
