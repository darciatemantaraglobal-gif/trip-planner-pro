import { LayoutDashboard, Calculator, Package, GitBranch, LogOut, Settings, Moon, X, FileText } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Kalkulator", url: "/calculator", icon: Calculator, end: false },
  { title: "Paket", url: "/packages", icon: Package, end: false },
  { title: "Progress", url: "/progress", icon: GitBranch, end: false },
  { title: "Generator PDF", url: "/pdf-generator", icon: FileText, end: false },
  { title: "Pengaturan", url: "/settings", icon: Settings, end: false },
];

const sidebarVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ open = false, onClose }: AppSidebarProps) {
  const location = useLocation();

  const active = (url: string, end: boolean) => {
    if (url === "#") return false;
    if (url.startsWith("/trips")) return location.pathname.startsWith("/trips");
    return end ? location.pathname === url : location.pathname.startsWith(url);
  };

  const sidebarContent = (
    <aside
      className="flex flex-col py-7 h-full border-r border-[hsl(var(--border))]"
      style={{ width: "var(--sidebar-width)", background: "hsl(var(--sidebar-bg))" }}
    >
      {/* Logo */}
      <motion.div
        className="px-6 mb-8 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo-igh-tour.png"
            alt="IGH Tour"
            className="h-12 w-auto object-contain shrink-0"
          />
          <div>
            <div className="font-bold text-[15px] text-[hsl(var(--foreground))] leading-tight">IGH Tour</div>
            <div className="text-[10px] font-medium tracking-widest text-[hsl(var(--muted-foreground))] uppercase">Travel Agency</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        )}
      </motion.div>

      {/* Nav */}
      <motion.nav
        className="flex-1 px-3 space-y-0.5"
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
      >
        {navItems.map((item) => {
          const isActive = active(item.url, item.end);
          return (
            <motion.div key={item.title} variants={navItemVariants}>
              <NavLink
                to={item.url}
                end={item.end}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-smooth relative group",
                  isActive
                    ? "text-[hsl(var(--primary))] bg-[hsl(var(--accent))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                )}
              >
                {isActive && (
                  <motion.span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[hsl(var(--primary))]"
                    layoutId="sidebar-active-indicator"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                  <item.icon
                    strokeWidth={1.5}
                    className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-[hsl(var(--primary))]" : "")}
                  />
                <span className="flex-1">{item.title}</span>
              </NavLink>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Bottom actions */}
      <motion.div
        className="px-3 mt-4 space-y-0.5 pt-4 border-t border-[hsl(var(--border))]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
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
      </motion.div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative flex-shrink-0"
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {sidebarContent}
          </motion.div>
        </div>
      )}
    </>
  );
}
