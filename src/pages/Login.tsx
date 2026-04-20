import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock, User, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!username || !password) return;
    const ok = await login(username.trim(), password);
    if (ok) navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 60%, #fed7aa 100%)" }}>

      <motion.div
        className="w-full max-w-sm mx-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
            <img src="/logo-igh-tour.png" alt="IGH Tour" className="h-16 w-auto object-contain mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white">IGH Tour</h1>
            <p className="text-white/80 text-sm mt-0.5">Travel Management System</p>
          </div>

          {/* Form */}
          <div className="px-8 py-7 space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">Masuk ke Dashboard</h2>
              <p className="text-sm text-gray-500 mt-0.5">Masukkan akun agen Anda</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200"
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Username</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="contoh: admin"
                    className="pl-10 h-11 rounded-xl border-gray-200 focus-visible:ring-orange-400"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11 rounded-xl border-gray-200 focus-visible:ring-orange-400"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full h-11 rounded-xl text-white font-semibold shadow-md"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Masuk…</>
                ) : "Masuk"}
              </Button>
            </form>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Default: <span className="font-mono text-gray-600">admin</span> / <span className="font-mono text-gray-600">admin123</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
