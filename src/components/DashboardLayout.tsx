import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CurrencyTicker } from "./CurrencyTicker";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-16 border-b bg-card/80 backdrop-blur-md flex items-center gap-3 px-3 md:px-6">
            <SidebarTrigger className="hover:bg-accent transition-colors" />
            <div className="hidden md:flex flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search packages, clients..." className="pl-9 bg-secondary border-0" />
              </div>
            </div>
            <div className="flex-1 md:hidden" />
            <CurrencyTicker />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            </Button>
            <Avatar className="h-9 w-9 ring-2 ring-primary/20">
              <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-semibold">
                TA
              </AvatarFallback>
            </Avatar>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
