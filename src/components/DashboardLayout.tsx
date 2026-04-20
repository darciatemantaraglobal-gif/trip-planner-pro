import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Menu, LayoutDashboard, Calculator, Package, GitBranch, Settings, FileText, TrendingUp, RefreshCw, LogOut } from "lucide-react";

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
          className="pwa-header relative flex items-center px-3 shrink-0 overflow-hidden"
          style={{
            height: "52px",
            background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(27 91% 97%) 100%)",
            borderBottom: "1px solid transparent",
            backgroundClip: "padding-box",
          }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Gradient border bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, hsl(27 91% 54% / 0.3), hsl(27 91% 54% / 0.6), hsl(27 91% 54% / 0.3), transparent)" }}
          />

          {/* Decorative glow top-right */}
          <div
            className="absolute -top-6 right-10 h-14 w-24 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, hsl(27 91% 54% / 0.12) 0%, transparent 70%)" }}
          />

          {/* Hamburger */}
          <button
            className="relative z-10 h-8 w-8 flex items-center justify-center rounded-xl shrink-0 transition-all active:scale-90"
            style={{ background: "hsl(var(--secondary))" }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu strokeWidth={1.8} className="h-4 w-4 text-[hsl(var(--foreground))]" />
          </button>

          {/* Brand lockup */}
          <div className="flex items-center gap-2 ml-2.5 shrink-0">
            <div className="relative">
              <img src="/logo-igh-tour.png" alt="IGH Tour" className="h-7 w-auto object-contain relative z-10" />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-[11px] font-black tracking-[0.06em] uppercase"
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                IGH Tour
              </span>
              <span className="text-[8px] font-medium tracking-[0.12em] uppercase text-[hsl(var(--muted-foreground))] mt-0.5">
                Umrah & Haji
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Rate chip */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(27 91% 96%) 100%)",
              border: "1px solid hsl(27 91% 54% / 0.15)",
            }}
          >
            <div
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{
                background: rateMode === "manual" ? "#f97316" : "#10b981",
                boxShadow: rateMode === "manual" ? "0 0 4px #f97316" : "0 0 4px #10b981",
              }}
            />
            <div className="flex items-center gap-1.5 text-[9.5px] font-bold leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: "hsl(var(--muted-foreground))" }}>
                USD <span style={{ color: "#f97316" }}>{rates.USD ? `${(rates.USD / 1000).toFixed(1)}k` : "—"}</span>
              </span>
              <span style={{ color: "hsl(var(--border))", fontSize: "8px" }}>·</span>
              <span style={{ color: "hsl(var(--muted-foreground))" }}>
                SAR <span style={{ color: "#f97316" }}>{rates.SAR ? `${(rates.SAR / 1000).toFixed(1)}k` : "—"}</span>
              </span>
            </div>
            <button
              onClick={() => refreshRates()}
              className="ml-0.5 transition-colors"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <RefreshCw className={cn("h-2.5 w-2.5", ratesLoading && "animate-spin")} />
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
          className="pwa-bottom-nav shrink-0 relative"
          style={{
            background: "hsl(var(--card))",
            borderTop: "1px solid transparent",
          }}
        >
          {/* Gradient border top */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, hsl(27 91% 54% / 0.25), hsl(27 91% 54% / 0.5), hsl(27 91% 54% / 0.25), transparent)" }}
          />

          <div className="flex items-center px-1 pt-1 pb-[max(8px,env(safe-area-inset-bottom))]">
            {bottomNavItems.map((item) => {
              const isActive = activeCheck(item.url, item.end);
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.end}
                  className="flex-1 flex flex-col items-center gap-0.5"
                >
                  <motion.div
                    className="flex flex-col items-center gap-0.5 w-full"
                    whileTap={{ scale: 0.86 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div
                      className={cn(
                        "relative h-8 w-full max-w-[46px] rounded-xl flex items-center justify-center transition-all duration-200",
                        isActive ? "shadow-sm" : ""
                      )}
                      style={isActive ? {
                        background: "linear-gradient(135deg, hsl(27 91% 94%) 0%, hsl(27 91% 90%) 100%)",
                        boxShadow: "0 2px 8px hsl(27 91% 54% / 0.2)",
                      } : {}}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: "linear-gradient(135deg, hsl(27 91% 94%) 0%, hsl(27 91% 90%) 100%)",
                          }}
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                      <item.icon
                        strokeWidth={isActive ? 2.2 : 1.5}
                        className={cn(
                          "relative z-10 h-[17px] w-[17px] transition-colors duration-200",
                          isActive ? "text-orange-600" : "text-[hsl(var(--muted-foreground))]"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[8.5px] font-semibold leading-none tracking-tight transition-colors duration-200",
                        isActive ? "text-orange-600" : "text-[hsl(var(--muted-foreground))]"
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
              className="pwa-header relative flex items-center gap-3 px-6 py-4 shrink-0 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(27 91% 97%) 100%)",
                borderBottom: "1px solid transparent",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Gradient border bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, hsl(27 91% 54% / 0.25), hsl(27 91% 54% / 0.5), hsl(27 91% 54% / 0.25), transparent)" }}
              />

              {/* Live rates ticker */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(27 91% 96%) 100%)",
                  border: "1px solid hsl(27 91% 54% / 0.15)",
                }}
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    background: rateMode === "manual" ? "#f97316" : "#10b981",
                    boxShadow: rateMode === "manual" ? "0 0 5px #f97316" : "0 0 5px #10b981",
                  }}
                />
                <div className="flex items-center gap-3 text-[11px] font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide font-bold",
                    rateMode === "manual" ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {rateMode === "manual" ? "Manual" : "Live"}
                  </span>
                  <span className="text-[hsl(var(--foreground))]">
                    USD <span className="text-orange-500 font-bold">Rp{rates.USD?.toLocaleString("id-ID") ?? "—"}</span>
                  </span>
                  <span style={{ color: "hsl(var(--border))" }}>|</span>
                  <span className="text-[hsl(var(--foreground))]">
                    SAR <span className="text-orange-500 font-bold">Rp{rates.SAR?.toLocaleString("id-ID") ?? "—"}</span>
                  </span>
                </div>
                <button
                  onClick={() => refreshRates()}
                  className="ml-1 transition-colors text-[hsl(var(--muted-foreground))] hover:text-orange-500"
                  title={lastUpdated ? `Diperbarui: ${lastUpdated.toLocaleTimeString("id-ID")}` : "Belum diperbarui"}
                >
                  <RefreshCw className={cn("h-3 w-3", ratesLoading && "animate-spin")} />
                </button>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleLogout}
                  className="h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-red-50 hover:text-red-500 transition-colors flex"
                  title="Keluar"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <div className="hidden lg:flex flex-col items-end">
                  <div className="text-[13px] font-bold text-[hsl(var(--foreground))] leading-tight">{displayName}</div>
                  <div className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] capitalize tracking-wide">{currentUser?.role ?? "agent"}</div>
                </div>
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
