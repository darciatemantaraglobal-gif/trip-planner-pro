import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SplashScreen } from "@/components/SplashScreen";
import Index from "./pages/Index.tsx";
import Calculator from "./pages/Calculator";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import ProgressTracker from "./pages/ProgressTracker";
import TripDetail from "./pages/TripDetail";
import JamaahProfile from "./pages/JamaahProfile";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";
import PdfGenerator from "./pages/PdfGenerator";
import { useRatesStore } from "@/store/ratesStore";
import { usePackagesStore } from "@/store/packagesStore";
import { useTripsStore } from "@/store/tripsStore";
import { useAuthStore } from "@/store/authStore";
import { applyAppearanceSettings, loadAppearanceSettings } from "@/lib/appearance";

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

function AppearanceBootstrap() {
  useEffect(() => {
    const applySavedAppearance = () => applyAppearanceSettings(loadAppearanceSettings());
    applySavedAppearance();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applySavedAppearance);
    window.addEventListener("storage", applySavedAppearance);
    return () => {
      mediaQuery.removeEventListener("change", applySavedAppearance);
      window.removeEventListener("storage", applySavedAppearance);
    };
  }, []);
  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
      <Route path="/calculator" element={<RequireAuth><DashboardLayout><Calculator /></DashboardLayout></RequireAuth>} />
      <Route path="/packages" element={<RequireAuth><DashboardLayout><Packages /></DashboardLayout></RequireAuth>} />
      <Route path="/packages/:id" element={<RequireAuth><DashboardLayout><PackageDetail /></DashboardLayout></RequireAuth>} />
      <Route path="/progress" element={<RequireAuth><DashboardLayout><ProgressTracker /></DashboardLayout></RequireAuth>} />
      <Route path="/pdf-generator" element={<RequireAuth><DashboardLayout><PdfGenerator /></DashboardLayout></RequireAuth>} />
      <Route path="/trips/:id" element={<RequireAuth><DashboardLayout><TripDetail /></DashboardLayout></RequireAuth>} />
      <Route path="/trips/:id/jamaah/:jamaahId" element={<RequireAuth><DashboardLayout><JamaahProfile /></DashboardLayout></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><DashboardLayout><Settings /></DashboardLayout></RequireAuth>} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppearanceBootstrap />
      <StoreBootstrap />
      <SplashScreen />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
