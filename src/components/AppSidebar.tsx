import { LayoutDashboard, Calculator, Package, GitBranch, Plane, LogOut, Sparkles } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePackagesStore } from "@/store/packagesStore";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Calculator", url: "/calculator", icon: Calculator, end: false },
  { title: "Packages", url: "/packages", icon: Package, end: false, showCount: true },
  { title: "Progress Tracker", url: "/progress", icon: GitBranch, end: false },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const packageCount = usePackagesStore((s) => s.items.length);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 [&_[data-sidebar=sidebar]]:bg-[var(--gradient-sidebar)]"
    >
      {/* Brand header */}
      <SidebarHeader className="border-b border-sidebar-border/50 px-2 py-3">
        <div className={cn(
          "flex items-center gap-3 transition-all",
          collapsed && "justify-center"
        )}>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Plane className="h-5 w-5 text-primary-foreground" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-sidebar" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-sm font-bold text-sidebar-foreground truncate">
                TravelHub
              </span>
              <span className="text-[11px] text-sidebar-foreground/60 truncate">
                Agent Portal
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold px-2">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 mt-1">
              {items.map((item) => {
                const isActive = item.end
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={cn(
                        "group/menu relative h-10 rounded-lg transition-all duration-200",
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                        isActive && [
                          "bg-sidebar-accent text-sidebar-foreground font-semibold",
                          "shadow-md shadow-primary/10",
                        ],
                      )}
                    >
                      <NavLink to={item.url} end={item.end}>
                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full gradient-primary" />
                        )}
                        <item.icon className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive && "text-primary"
                        )} />
                        <span className="flex-1 truncate">{item.title}</span>
                        {item.showCount && packageCount > 0 && !collapsed && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-[20px] px-1.5 bg-primary/15 text-primary border-0 text-[10px] font-semibold"
                          >
                            {packageCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Promo card — hidden when collapsed */}
        {!collapsed && (
          <div className="mt-6 mx-1 rounded-xl bg-gradient-to-br from-primary/15 to-primary-glow/10 border border-sidebar-border/50 p-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
              <span className="text-xs font-semibold text-sidebar-foreground">Pro Tip</span>
            </div>
            <p className="text-[11px] text-sidebar-foreground/70 leading-relaxed">
              Use the Calculator to build a quote, then save it as a package.
            </p>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          {/* User card */}
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/40 transition-colors",
              collapsed && "justify-center px-0"
            )}>
              <Avatar className="h-8 w-8 ring-2 ring-primary/30 shrink-0">
                <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-semibold">
                  TA
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-sidebar-foreground truncate">
                    Travel Agent
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/60 truncate">
                    agent@travelhub.io
                  </span>
                </div>
              )}
            </div>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Logout"
              className="h-9 rounded-lg text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <NavLink to="/auth">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
