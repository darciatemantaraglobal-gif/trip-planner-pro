import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Menu, LayoutDashboard, Calculator, Package, GitBranch, Settings, FileText, TrendingUp, RefreshCw, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRatesStore } from "@/store/ratesStore";
import { useAuthStore } from "@/store/authStore";

const bottomNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Kalkulator", url: "/calculator", icon: Calculator, end: false },
  { title: "Paket", url: "/packages", icon: Package, end: false },
  { title: "Progress", url: "/progress", icon: GitBranch, end: false },
  { title: "PDF", url: "/pdf-generator", icon: FileText, end: false },
  { title: "Pengaturan", url: "/settings", icon: Settings, end: false },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function DashboardLayout({ children, noPadding = false }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { rates, mode: rateMode, loading: ratesLoading, lastUpdated, refresh: refreshRates } = useRatesStore();
  const { user: currentUser, logout } = useAuthStore();

  const handleLogout = () => { logout(); navigate("/login"); };

  const displayName = currentUser?.displayName ?? "IGH Tour";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const activeCheck = (url: string, end: boolean) => {
    if (url.startsWith("/trips")) return location.pathname.startsWith("/trips");
    return end ? location.pathname === url : location.pathname.startsWith(url);
  };

  return (
    <div
      className="mobile-compact min-h-screen md:p-3 lg:p-5"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* App card */}
      <div
        className="min-h-screen md:min-h-[calc(100vh-24px)] lg:min-h-[calc(100vh-40px)] md:rounded-3xl flex overflow-hidden"
        style={{ background: "hsl(var(--card))", boxShadow: "0 4px 32px hsl(27 91% 54% / 0.15)" }}
      >
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Right of sidebar */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top header */}
          <motion.header
            className="pwa-header flex items-center gap-1.5 md:gap-3 px-2.5 md:px-6 py-2 md:py-4 border-b border-[hsl(var(--border))] shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Mobile hamburger */}
            <button
              className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu strokeWidth={1.5} className="h-4.5 w-4.5" />
            </button>

            {/* Mobile logo */}
            <div className="md:hidden flex items-center gap-1.5 shrink-0">
              <img src="/logo-igh-tour.png" alt="IGH Tour" className="h-7 w-auto object-contain" />
            </div>

            {/* Live rates ticker */}
            <div className="hidden sm:flex items-center gap-2 bg-[hsl(var(--secondary))] rounded-xl px-3 py-1.5 shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-orange-500" strokeWidth={2} />
              <div className="flex items-center gap-3 text-[11px] font-semibold text-[hsl(var(--foreground))]">
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide", rateMode === "manual" ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600")}>
                  {rateMode === "manual" ? "Manual" : "Live"}
                </span>
                <span>USD <span className="text-orange-500">Rp{rates.USD?.toLocaleString("id-ID") ?? "—"}</span></span>
                <span className="text-[hsl(var(--border))]">|</span>
                <span>SAR <span className="text-orange-500">Rp{rates.SAR?.toLocaleString("id-ID") ?? "—"}</span></span>
              </div>
              <button
                onClick={() => refreshRates()}
                className="ml-1 text-[hsl(var(--muted-foreground))] hover:text-orange-500 transition-colors"
                title={lastUpdated ? `Diperbarui: ${lastUpdated.toLocaleTimeString("id-ID")}` : "Belum diperbarui"}
              >
                <RefreshCw className={cn("h-3 w-3", ratesLoading && "animate-spin")} />
              </button>
            </div>

            <div className="flex-1" />

            {/* User info + logout */}
            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
              <button
                onClick={handleLogout}
                className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <Avatar className="h-8 w-8 md:h-10 md:w-10 ring-2 ring-[hsl(var(--primary))]/20 cursor-pointer" onClick={handleLogout}>
                <AvatarFallback className="gradient-primary text-white text-xs md:text-sm font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block">
                <div className="text-[13px] font-semibold text-[hsl(var(--foreground))] leading-tight">{displayName}</div>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))] capitalize">{currentUser?.role ?? "agent"}</div>
              </div>
            </div>
          </motion.header>

          {/* Page content */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.main
                key={location.pathname}
                className={`pwa-main-content absolute inset-0 overflow-auto ${noPadding
                  ? "pb-16 md:pb-0"
                  : "p-3 pb-20 md:p-6 md:pb-6 lg:p-8 lg:pb-8"
                }`}
                initial={{ x: 56, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -56, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {children}
              </motion.main>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="pwa-bottom-nav nav-safe-bottom md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[hsl(var(--border))] bg-white/95 backdrop-blur-sm px-1">
        <div className="flex items-center">
          {bottomNavItems.map((item) => {
            const isActive = activeCheck(item.url, item.end);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.end}
                className="flex-1 flex flex-col items-center gap-0.5 py-1.5 px-0.5"
              >
                <motion.div
                  className={cn(
                    "h-8 w-full max-w-[44px] rounded-xl flex items-center justify-center transition-all",
                    isActive
                      ? "bg-orange-100 text-orange-600"
                      : "text-[hsl(var(--muted-foreground))]"
                  )}
                  whileTap={{ scale: 0.85 }}
                  animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon strokeWidth={isActive ? 2 : 1.5} className="h-4 w-4" />
                </motion.div>
                <span className={cn(
                  "text-[9px] font-semibold leading-none tracking-tight",
                  isActive ? "text-orange-600" : "text-[hsl(var(--muted-foreground))]"
                )}>{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
