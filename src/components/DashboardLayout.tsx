import { AppSidebar } from "./AppSidebar";
import { CurrencyTicker } from "./CurrencyTicker";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex w-full" style={{ background: "hsl(var(--background))" }}>
      <AppSidebar />

      {/* Main area — offset for sidebar */}
      <div className="flex-1 flex flex-col min-w-0 ml-[72px] p-4 md:p-6">
        {/* White content card */}
        <div
          className="content-light flex-1 flex flex-col rounded-3xl overflow-hidden shadow-card min-h-[calc(100vh-48px)]"
          style={{ background: "#ffffff" }}
        >
          {/* Top bar inside white card */}
          <header className="flex items-center gap-3 px-6 py-4 border-b border-[hsl(var(--border))]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Search packages, clients…"
                className="pl-9 bg-[hsl(var(--secondary))] border-0 rounded-xl text-sm focus-visible:ring-[hsl(var(--primary))]"
              />
            </div>

            <div className="flex-1" />

            <CurrencyTicker />

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl hover:bg-[hsl(var(--accent))]"
            >
              <Bell className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
            </Button>

            <Avatar className="h-9 w-9 ring-2 ring-[hsl(var(--primary))]/20 cursor-pointer">
              <AvatarFallback className="gradient-primary text-white text-sm font-bold">
                TA
              </AvatarFallback>
            </Avatar>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
