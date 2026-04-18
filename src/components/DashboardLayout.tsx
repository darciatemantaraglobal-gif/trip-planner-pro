import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Search, SlidersHorizontal, Menu, LayoutDashboard, Calculator, Package, GitBranch, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Kalkulator", url: "/calculator", icon: Calculator, end: false },
  { title: "Paket", url: "/packages", icon: Package, end: false },
  { title: "Progress", url: "/progress", icon: GitBranch, end: false },
  { title: "Pengaturan", url: "/settings", icon: Settings, end: false },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function DashboardLayout({ children, noPadding = false }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const activeCheck = (url: string, end: boolean) => {
    if (url.startsWith("/trips")) return location.pathname.startsWith("/trips");
    return end ? location.pathname === url : location.pathname.startsWith(url);
  };

  return (
    <div
      className="min-h-screen md:p-3 lg:p-5"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* App card */}
      <div
        className="min-h-screen md:min-h-[calc(100vh-24px)] lg:min-h-[calc(100vh-40px)] md:rounded-3xl flex overflow-hidden"
        style={{ background: "#ffffff", boxShadow: "0 4px 32px hsl(27 91% 54% / 0.15)" }}
      >
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Right of sidebar */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top header */}
          <header className="flex items-center gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 border-b border-[hsl(var(--border))] shrink-0">
            {/* Mobile hamburger */}
            <button
              className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu strokeWidth={1.5} className="h-5 w-5" />
            </button>

            {/* Mobile logo (only shows on mobile) */}
            <div className="md:hidden flex items-center gap-2 shrink-0">
              <img src="/logo-igh-tour.png" alt="IGH Tour" className="h-8 w-auto object-contain" />
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Cari destinasi, paket trip…"
                className="pl-10 h-10 bg-[hsl(var(--secondary))] border-0 rounded-xl text-sm focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-1"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="hidden sm:flex h-10 w-10 rounded-xl border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] shrink-0"
            >
              <SlidersHorizontal strokeWidth={1.5} className="h-4 w-4" />
            </Button>
            <Button className="hidden sm:flex h-10 px-6 rounded-xl gradient-primary text-white shadow-glow hover:opacity-90 text-sm font-semibold shrink-0">
              Cari
            </Button>

            <div className="flex-1" />

            {/* User info */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <Avatar className="h-9 w-9 md:h-10 md:w-10 ring-2 ring-[hsl(var(--primary))]/20 cursor-pointer">
                <AvatarFallback className="gradient-primary text-white text-sm font-bold">TA</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block">
                <div className="text-[13px] font-semibold text-[hsl(var(--foreground))] leading-tight">Travel Agent</div>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))]">agent@travelhub.io</div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className={noPadding
            ? "flex-1 overflow-auto pb-20 md:pb-0"
            : "flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6 lg:p-8 lg:pb-8"
          }>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[hsl(var(--border))] px-1">
        <div className="flex items-center">
          {bottomNavItems.map((item) => {
            const isActive = activeCheck(item.url, item.end);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.end}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-smooth",
                  isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"
                )}
              >
                <div className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-xl transition-smooth",
                  isActive ? "bg-[hsl(var(--accent))]" : ""
                )}>
                  <item.icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
