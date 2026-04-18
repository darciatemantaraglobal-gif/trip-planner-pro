import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SplashScreen } from "@/components/SplashScreen";
import Index from "./pages/Index.tsx";
import Calculator from "./pages/Calculator";
import Packages from "./pages/Packages";
import ProgressTracker from "./pages/ProgressTracker";
import TripDetail from "./pages/TripDetail";
import JamaahProfile from "./pages/JamaahProfile";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound.tsx";
import PdfGenerator from "./pages/PdfGenerator";
import { useRatesStore } from "@/store/ratesStore";
import { usePackagesStore } from "@/store/packagesStore";
import { useTripsStore } from "@/store/tripsStore";

const queryClient = new QueryClient();

function StoreBootstrap() {
  const refreshRates = useRatesStore((s) => s.refresh);
  const refreshPackages = usePackagesStore((s) => s.refresh);
  const fetchTrips = useTripsStore((s) => s.fetchTrips);
  useEffect(() => {
    refreshRates();
    refreshPackages();
    fetchTrips();
  }, [refreshRates, refreshPackages, fetchTrips]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/calculator" element={<DashboardLayout><Calculator /></DashboardLayout>} />
        <Route path="/packages" element={<DashboardLayout><Packages /></DashboardLayout>} />
        <Route path="/progress" element={<DashboardLayout><ProgressTracker /></DashboardLayout>} />
        <Route path="/pdf-generator" element={<DashboardLayout><PdfGenerator /></DashboardLayout>} />
        <Route path="/trips/:id" element={<DashboardLayout><TripDetail /></DashboardLayout>} />
        <Route path="/trips/:id/jamaah/:jamaahId" element={<DashboardLayout><JamaahProfile /></DashboardLayout>} />
        <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <StoreBootstrap />
      <SplashScreen />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
