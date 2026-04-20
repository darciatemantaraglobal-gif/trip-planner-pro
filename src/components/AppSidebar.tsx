import { LayoutDashboard, Calculator, Package, GitBranch, LogOut, Settings, X, FileText } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, type Variants } from "framer-motion";

const navGroups = [
  {
    label: null,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "Operasional",
    items: [
      { title: "Kalkulator", url: "/calculator", icon: Calculator, end: false },
      { title: "Paket Trip", url: "/packages", icon: Package, end: false },
      { title: "Progress", url: "/progress", icon: GitBranch, end: false },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Generator PDF", url: "/pdf-generator", icon: FileText, end: false },
    ],
  },
];

const bottomItems = [
  { title: "Pengaturan", url: "/settings", icon: Settings, end: false, danger: false },
  { title: "Logout", url: "/auth", icon: LogOut, end: false, danger: true },
];

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const itemVariant: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ open = false, onClose }: AppSidebarProps) {
  const location = useLocation();

  const isActive = (url: string, end: boolean) => {
    if (url === "#") return false;
    if (url.startsWith("/trips")) return location.pathname.startsWith("/trips");
    return end ? location.pathname === url : location.pathname.startsWith(url);
  };

  const NavItem = ({ title, url, icon: Icon, end, danger = false }: {
    title: string; url: string; icon: typeof LayoutDashboard; end: boolean; danger?: boolean;
  }) => {
    const active = isActive(url, end);
    return (
      <NavLink
        to={url}
        end={end}
        onClick={onClose}
        className={cn(
          "relative flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium rounded-2xl transition-[background-color,color,box-shadow,transform] duration-150 group",
          active
            ? "text-[hsl(var(--primary))] bg-[hsl(var(--accent))] shadow-[0_10px_24px_hsl(27_91%_54%_/_0.12)]"
            : danger
              ? "text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] hover:translate-x-0.5"
        )}
      >
        {/* Active left bar */}
        {active && (
          <motion.span
            layoutId="sidebar-pill"
            className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[hsl(var(--primary))]"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        <Icon
          strokeWidth={active ? 2 : 1.5}
          className={cn(
            "h-[17px] w-[17px] shrink-0 transition-colors duration-150",
            active ? "text-[hsl(var(--primary))]" : danger ? "group-hover:text-red-500" : ""
          )}
        />
        <span className="flex-1 leading-none pl-1">{title}</span>
      </NavLink>
    );
  };

  const sidebarContent = (
    <aside
      className="flex h-full flex-col border border-[hsl(var(--border))] bg-white/95 shadow-[0_18px_45px_hsl(27_91%_54%_/_0.10)] backdrop-blur md:m-3 md:h-[calc(100%-1.5rem)] md:rounded-[2rem] max-md:rounded-r-[2rem]"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo-igh-tour.png"
            alt="IGH Tour"
            className="h-10 w-auto object-contain shrink-0"
          />
          <div className="leading-tight">
            <div className="font-bold text-[14.5px] text-[hsl(var(--foreground))]">IGH Tour</div>
            <div className="text-[10px] font-medium tracking-widest text-[hsl(var(--muted-foreground))] uppercase mt-0.5">
              Travel Agency
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Nav groups ── */}
      <motion.div
        className="flex-1 overflow-y-auto px-3 space-y-1 pb-2"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "pt-3" : ""}>
            {group.label && (
              <motion.p
                variants={itemVariant}
                className="px-4 mb-1 text-[10.5px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]"
              >
                {group.label}
              </motion.p>
            )}
            {group.items.map((item) => (
              <motion.div key={item.url} variants={itemVariant}>
                <NavItem {...item} />
              </motion.div>
            ))}
          </div>
        ))}
      </motion.div>

      {/* ── Bottom: Settings + Logout ── */}
      <div className="shrink-0 mx-3 px-0 py-4 border-t border-[hsl(var(--border))] space-y-0.5">
        {bottomItems.map((item) => (
          <NavItem key={item.url} {...item} />
        ))}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={onClose}
            />
            <motion.div
              className="relative flex-shrink-0"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
