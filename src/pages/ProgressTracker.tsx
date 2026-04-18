import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, FileEdit, Calculator, CheckCircle2, CreditCard, Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { key: "Draft", icon: FileEdit, desc: "Initial package creation" },
  { key: "Calculated", icon: Calculator, desc: "Pricing computed" },
  { key: "Confirmed", icon: CheckCircle2, desc: "Client approved" },
  { key: "Paid", icon: CreditCard, desc: "Payment received" },
  { key: "Completed", icon: Trophy, desc: "Trip finalized" },
];

const trips = [
  { name: "Bali Paradise 5D", client: "Andi Wijaya", currentStep: 2, updatedAt: "2 hours ago" },
  { name: "Umrah Premium 12D", client: "Fatima Al-Rashid", currentStep: 3, updatedAt: "Yesterday" },
  { name: "Tokyo Discovery 7D", client: "Sarah Putri", currentStep: 1, updatedAt: "3 days ago" },
  { name: "European Tour 10D", client: "Budi Santoso", currentStep: 0, updatedAt: "Just now" },
  { name: "Maldives Honeymoon", client: "Lisa & Mark", currentStep: 4, updatedAt: "1 week ago" },
];

export default function ProgressTracker() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracker</h1>
        <p className="text-muted-foreground mt-1">Track every package from draft to completion.</p>
      </div>

      <div className="space-y-4">
        {trips.map((trip) => (
          <Card key={trip.name} className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{trip.name}</CardTitle>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span>Client: {trip.client}</span>
                    <span className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      Updated {trip.updatedAt}
                    </span>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-0 w-fit">
                  Step {trip.currentStep + 1} / {steps.length} — {steps[trip.currentStep].key}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Connector line */}
                <div className="absolute left-0 right-0 top-5 h-0.5 bg-border" />
                <div
                  className="absolute left-0 top-5 h-0.5 gradient-primary transition-all duration-500"
                  style={{ width: `${(trip.currentStep / (steps.length - 1)) * 100}%` }}
                />

                <div className="relative grid grid-cols-5 gap-2">
                  {steps.map((step, idx) => {
                    const isComplete = idx < trip.currentStep;
                    const isCurrent = idx === trip.currentStep;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center text-center">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border-2 bg-background transition-smooth z-10",
                            isComplete && "gradient-primary border-transparent shadow-md",
                            isCurrent && "border-primary text-primary shadow-glow scale-110",
                            !isComplete && !isCurrent && "border-border text-muted-foreground"
                          )}
                        >
                          {isComplete ? (
                            <Check className="h-5 w-5 text-primary-foreground" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="mt-2">
                          <div className={cn("text-xs font-semibold", isCurrent ? "text-primary" : isComplete ? "text-foreground" : "text-muted-foreground")}>
                            {step.key}
                          </div>
                          <div className="text-[10px] text-muted-foreground hidden md:block mt-0.5">{step.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
