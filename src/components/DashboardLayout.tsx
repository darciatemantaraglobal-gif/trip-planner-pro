import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Menu, LayoutDashboard, Calculator, Package, GitBranch, Settings, FileText, TrendingUp, RefreshCw, LogOut, StickyNote, FileSpreadsheet } from "lucide-react";

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
  { title: "Catatan", url: "/notes", icon: StickyNote, end: false },
  { title: "PDF", url: "/pdf-generator", icon: FileText, end: false },
  { title: "Export", url: "/exports", icon: FileSpreadsheet, end: false },
  { title: "Settings", url: "/settings", icon: Settings, end: false },
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

  const activeCheck = (url: string, end: boolean) => {
    if (url.startsWith("/trips")) return location.pathname.startsWith("/trips");
    return end ? location.pathname === url : location.pathname.startsWith(url);
  };

  return (
    <>
      {/* ── Mobile layout ── */}
      <div
        className="mobile-compact md:hidden app-shell-mobile"
        style={{ background: "hsl(var(--card))" }}
      >
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* ── Mobile Header ── */}
        <motion.header
          className="pwa-header flex items-center px-4 shrink-0"
          style={{
            height: "52px",
            background: "hsl(var(--card))",
            borderBottom: "1px solid hsl(var(--border))",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {/* Hamburger — bare icon, no box */}
          <button
            className="flex items-center justify-center shrink-0 -ml-1 p-1.5 transition-opacity active:opacity-50"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu strokeWidth={1.6} className="h-[19px] w-[19px] text-[hsl(var(--foreground))]" />
          </button>

          {/* Brand lockup */}
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <img src="/logo-igh-tour.png" alt="IGH Tour" className="h-6 w-auto object-contain" />
            <div className="flex flex-col leading-none">
              <span
                className="text-[11px] font-black tracking-[0.05em] uppercase"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  background: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                IGH Tour
              </span>
              <span className="text-[9px] font-medium tracking-[0.1em] uppercase text-[hsl(var(--muted-foreground))] mt-[2px]">
                Umrah & Haji
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Rates — bare text, no box */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
              <div
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{
                  background: rateMode === "manual" ? "#f97316" : "#10b981",
                  boxShadow: rateMode === "manual" ? "0 0 4px #f97316aa" : "0 0 4px #10b981aa",
                }}
              />
              <span className="text-[10.5px] font-semibold text-[hsl(var(--muted-foreground))]">
                USD <span className="text-orange-500 font-bold">{rates.USD ? `${(rates.USD / 1000).toFixed(1)}k` : "—"}</span>
              </span>
              <span className="text-[9px] text-[hsl(var(--border))]">·</span>
              <span className="text-[10.5px] font-semibold text-[hsl(var(--muted-foreground))]">
                SAR <span className="text-orange-500 font-bold">{rates.SAR ? `${(rates.SAR / 1000).toFixed(1)}k` : "—"}</span>
              </span>
            </div>
            <button
              onClick={() => refreshRates()}
              className="transition-opacity active:opacity-50"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <RefreshCw className={cn("h-3 w-3", ratesLoading && "animate-spin")} />
            </button>
          </div>
        </motion.header>

        {/* Page content */}
        <div className="flex-1 overflow-hidden relative min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={location.pathname}
              className={`pwa-main-content absolute inset-0 overflow-auto ${
                noPadding ? "" : "p-3"
              }`}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>

        {/* ── Bottom nav ── */}
        <nav
          className="pwa-bottom-nav shrink-0"
          style={{
            background: "hsl(var(--card))",
            borderTop: "1px solid hsl(var(--border))",
          }}
        >
          <div className="flex items-center px-1 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))]">
            {bottomNavItems.map((item) => {
              const isActive = activeCheck(item.url, item.end);
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.end}
                  className="flex-1 flex flex-col items-center"
                >
                  <motion.div
                    className="flex flex-col items-center gap-[3px] w-full"
                    whileTap={{ scale: 0.88 }}
                    transition={{ duration: 0.1 }}
                  >
                    {/* Active bar on top */}
                    <div className="w-full flex justify-center">
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            layoutId="nav-bar"
                            className="h-[2px] w-5 rounded-full bg-orange-500"
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        )}
                        {!isActive && <div className="h-[2px] w-5" />}
                      </AnimatePresence>
                    </div>

                    {/* Icon — no box */}
                    <item.icon
                      strokeWidth={isActive ? 2.2 : 1.5}
                      className={cn(
                        "h-[18px] w-[18px] transition-colors duration-150",
                        isActive ? "text-orange-500" : "text-[hsl(var(--muted-foreground))]"
                      )}
                    />

                    {/* Label */}
                    <span
                      className={cn(
                        "text-[9.5px] font-semibold leading-none tracking-tight transition-colors duration-150",
                        isActive ? "text-orange-500" : "text-[hsl(var(--muted-foreground))]"
                      )}
                    >
                      {item.title}
                    </span>
                  </motion.div>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ── Desktop layout ── */}
      <div
        className="mobile-compact hidden md:block min-h-screen md:p-3 lg:p-5"
        style={{ background: "hsl(var(--background))" }}
      >
        <div
          className="min-h-[calc(100vh-24px)] lg:min-h-[calc(100vh-40px)] rounded-3xl flex overflow-hidden"
          style={{ background: "hsl(var(--card))", boxShadow: "0 4px 32px hsl(27 91% 54% / 0.15)" }}
        >
          <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <motion.header
              className="pwa-header flex items-center gap-3 px-6 py-4 border-b border-[hsl(var(--border))] shrink-0"
              style={{ background: "hsl(var(--card))" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Live rates — minimal style */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: rateMode === "manual" ? "#f97316" : "#10b981",
                    boxShadow: rateMode === "manual" ? "0 0 5px #f97316" : "0 0 5px #10b981",
                  }}
                />
                <div className="flex items-center gap-3 text-[11px] font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <span className={cn(
                    "text-[9px] uppercase tracking-wide font-bold",
                    rateMode === "manual" ? "text-orange-500" : "text-emerald-500"
                  )}>
                    {rateMode === "manual" ? "Manual" : "Live"}
                  </span>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    USD <span className="text-orange-500 font-bold">Rp{rates.USD?.toLocaleString("id-ID") ?? "—"}</span>
                  </span>
                  <span className="text-[hsl(var(--border))]">·</span>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    SAR <span className="text-orange-500 font-bold">Rp{rates.SAR?.toLocaleString("id-ID") ?? "—"}</span>
                  </span>
                </div>
                <button
                  onClick={() => refreshRates()}
                  className="transition-colors text-[hsl(var(--muted-foreground))] hover:text-orange-500"
                  title={lastUpdated ? `Diperbarui: ${lastUpdated.toLocaleTimeString("id-ID")}` : "Belum diperbarui"}
                >
                  <RefreshCw className={cn("h-3 w-3", ratesLoading && "animate-spin")} />
                </button>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-4 shrink-0">
                <div className="hidden lg:flex flex-col items-end">
                  <div className="text-[13px] font-bold text-[hsl(var(--foreground))] leading-tight">{displayName}</div>
                  <div className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] capitalize tracking-wide">{currentUser?.role ?? "agent"}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="h-8 w-8 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors"
                  title="Keluar"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </motion.header>

            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.main
                  key={location.pathname}
                  className={`pwa-main-content absolute inset-0 overflow-auto ${noPadding
                    ? "pb-0"
                    : "p-6 md:pb-6 lg:p-8 lg:pb-8"
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
      </div>
    </>
  );
}
