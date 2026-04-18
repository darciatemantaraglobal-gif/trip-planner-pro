import { AppSidebar } from "./AppSidebar";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function DashboardLayout({ children, noPadding = false }: DashboardLayoutProps) {
  return (
    <div
      className="min-h-screen p-3 lg:p-5"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* White app card */}
      <div
        className="min-h-[calc(100vh-24px)] lg:min-h-[calc(100vh-40px)] rounded-3xl flex overflow-hidden"
        style={{ background: "#ffffff", boxShadow: "0 4px 32px hsl(234 50% 80% / 0.25)" }}
      >
        <AppSidebar />

        {/* Right of sidebar */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top header bar */}
          <header className="flex items-center gap-3 px-6 py-4 border-b border-[hsl(var(--border))] shrink-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Cari destinasi, paket trip…"
                className="pl-10 h-10 bg-[hsl(var(--secondary))] border-0 rounded-xl text-sm focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-1"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] shrink-0"
            >
              <SlidersHorizontal strokeWidth={1.5} className="h-4 w-4" />
            </Button>
            <Button className="h-10 px-6 rounded-xl gradient-primary text-white shadow-glow hover:opacity-90 text-sm font-semibold shrink-0">
              Cari
            </Button>

            <div className="flex-1" />

            {/* User info */}
            <div className="flex items-center gap-3 shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-[hsl(var(--primary))]/20 cursor-pointer">
                <AvatarFallback className="gradient-primary text-white text-sm font-bold">TA</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block">
                <div className="text-[13px] font-semibold text-[hsl(var(--foreground))] leading-tight">Travel Agent</div>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))]">agent@travelhub.io</div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className={`flex-1 overflow-auto ${noPadding ? "" : "p-6 lg:p-8"}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
