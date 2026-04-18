import { LayoutDashboard, Calculator, Package, GitBranch, LogOut, Plane, Bell } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Calculator", url: "/calculator", icon: Calculator, end: false },
  { title: "Packages", url: "/packages", icon: Package, end: false },
  { title: "Progress", url: "/progress", icon: GitBranch, end: false },
  { title: "Notifications", url: "#", icon: Bell, end: false },
];

interface SidebarIconProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  to?: string;
  end?: boolean;
  danger?: boolean;
}

function SidebarIcon({ icon: Icon, label, active, danger }: SidebarIconProps) {
  return (
    <div
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer",
        active
          ? "bg-[hsl(344_70%_75%)] shadow-glow text-white"
          : danger
          ? "text-[hsl(var(--sidebar-icon))] hover:text-red-400 hover:bg-white/5"
          : "text-[hsl(var(--sidebar-icon))] hover:text-white hover:bg-white/8"
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />
      {active && (
        <span className="absolute -right-[1px] top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-l-full bg-[hsl(344_70%_75%)]" />
      )}
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();

  const isActive = (url: string, end: boolean) => {
    if (url === "#") return false;
    return end ? location.pathname === url : location.pathname.startsWith(url);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col items-center py-5 w-[72px] bg-[hsl(var(--sidebar-bg))]">
      {/* Logo */}
      <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary shadow-glow">
        <Plane className="h-5 w-5 text-white" />
      </div>

      {/* Separator */}
      <div className="mb-5 h-px w-8 bg-white/10" />

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map((item) => (
          <Tooltip key={item.title} delayDuration={0}>
            <TooltipTrigger asChild>
              {item.url === "#" ? (
                <div>
                  <SidebarIcon
                    icon={item.icon}
                    label={item.title}
                    active={isActive(item.url, item.end)}
                  />
                </div>
              ) : (
                <NavLink to={item.url} end={item.end}>
                  <SidebarIcon
                    icon={item.icon}
                    label={item.title}
                    active={isActive(item.url, item.end)}
                  />
                </NavLink>
              )}
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[hsl(231_40%_18%)] text-white border-white/10 text-xs">
              {item.title}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 mt-auto">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink to="/auth">
              <SidebarIcon icon={LogOut} label="Logout" danger />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[hsl(231_40%_18%)] text-white border-white/10 text-xs">
            Logout
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="cursor-pointer">
              <Avatar className="h-9 w-9 ring-2 ring-[hsl(344_70%_75%)]/40 hover:ring-[hsl(344_70%_75%)] transition-all">
                <AvatarFallback className="gradient-primary text-white text-xs font-bold">
                  TA
                </AvatarFallback>
              </Avatar>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[hsl(231_40%_18%)] text-white border-white/10 text-xs">
            Travel Agent
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
