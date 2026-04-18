import { LayoutDashboard, Calculator, Package, GitBranch, LogOut, Plane, Settings, Moon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Kalkulator", url: "/calculator", icon: Calculator, end: false },
  { title: "Paket", url: "/packages", icon: Package, end: false },
  { title: "Progress", url: "/progress", icon: GitBranch, end: false },
  { title: "Pengaturan", url: "/settings", icon: Settings, end: false },
];

export function AppSidebar() {
  const location = useLocation();

  const active = (url: string, end: boolean) => {
    if (url === "#") return false;
    if (url.startsWith("/trips")) return location.pathname.startsWith("/trips");
    return end ? location.pathname === url : location.pathname.startsWith(url);
  };

  return (
    <aside
      className="shrink-0 flex flex-col py-7 border-r border-[hsl(var(--border))]"
      style={{ width: "var(--sidebar-width)", background: "hsl(var(--sidebar-bg))" }}
    >
      {/* Logo */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl gradient-primary shadow-glow flex items-center justify-center shrink-0">
            <Plane strokeWidth={1.5} className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-[15px] text-[hsl(var(--foreground))] leading-tight">TravelHub</div>
            <div className="text-[10px] font-medium tracking-widest text-[hsl(var(--muted-foreground))] uppercase">Travel Agency</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = active(item.url, item.end);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.end}
              onClick={() => {}}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-smooth relative",
                isActive
                  ? "text-[hsl(var(--primary))] bg-[hsl(var(--accent))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
              )}
            >
              {/* Active left border */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[hsl(var(--primary))]" />
              )}
              <item.icon
                strokeWidth={1.5}
                className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-[hsl(var(--primary))]" : "")}
              />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] shrink-0" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 mt-4 space-y-0.5 pt-4 border-t border-[hsl(var(--border))]">
        <button className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-smooth w-full">
          <Moon strokeWidth={1.5} className="h-[18px] w-[18px] shrink-0" />
          <span>Mode Gelap</span>
        </button>
        <NavLink
          to="/auth"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium text-[hsl(var(--muted-foreground))] hover:bg-red-50 hover:text-red-500 transition-smooth"
        >
          <LogOut strokeWidth={1.5} className="h-[18px] w-[18px] shrink-0" />
          <span>Logout</span>
        </NavLink>
      </div>
    </aside>
  );
}
