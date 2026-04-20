import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import splashBackground from "@assets/image_1776663921386.png";
import { useAuthStore } from "@/store/authStore";

export function SplashScreen() {
  const { isAuthenticated, isLoading, error, login, clearError } = useAuthStore();
  const [visible, setVisible] = useState(!isAuthenticated);
  const [phase, setPhase] = useState<"loading" | "form">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  /* Skip splash entirely if already logged in */
  useEffect(() => {
    if (isAuthenticated) setVisible(false);
  }, [isAuthenticated]);

  /* Loading phase → form phase */
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setPhase("form"), 1800);
    return () => clearTimeout(t);
  }, [visible]);

  /* Focus username field when form appears */
  useEffect(() => {
    if (phase === "form") {
      setTimeout(() => usernameRef.current?.focus(), 350);
    }
  }, [phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    const ok = await login(username.trim(), password);
    if (ok) {
      /* Short pause for success feel, then fade out */
      setTimeout(() => setVisible(false), 200);
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            backgroundImage: `url(${splashBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#190d23",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/60" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
              className="flex flex-col items-center mb-2"
            >
              <img
                src="/logo-igh-tour.png"
                alt="IGH Tour"
                className="h-24 w-auto object-contain brightness-0 invert drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const fallback = document.createElement("span");
                  fallback.textContent = "IGH";
                  fallback.className =
                    "text-5xl font-black tracking-[-0.06em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]";
                  img.parentElement!.appendChild(fallback);
                }}
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {/* ── Loading phase ── */}
              {phase === "loading" && (
                <motion.div
                  key="loading"
                  className="flex flex-col items-center gap-5 mt-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="h-9 w-9 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/80">
                    Memuat…
                  </p>
                  {/* Progress bar */}
                  <div className="w-56 h-[2px] rounded-full bg-white/20 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              )}

              {/* ── Login form phase ── */}
              {phase === "form" && (
                <motion.div
                  key="form"
                  className="w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Card */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-7 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
                    {/* Heading */}
                    <div className="text-center mb-6">
                      <h2 className="text-white font-extrabold text-xl tracking-tight">
                        Portal Admin
                      </h2>
                      <p className="text-white/60 text-[12px] mt-1">
                        Masuk untuk mengakses IGH Tour Portal
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Error */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/20 border border-red-400/30"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-red-300 shrink-0" />
                            <p className="text-red-200 text-[12px] font-medium">{error}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Username */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-white/70 pl-1">
                          Username
                        </label>
                        <input
                          ref={usernameRef}
                          type="text"
                          autoComplete="username"
                          placeholder="admin"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            clearError();
                          }}
                          disabled={isLoading}
                          className="w-full h-11 bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent disabled:opacity-50 transition-all"
                        />
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-white/70 pl-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              clearError();
                            }}
                            disabled={isLoading}
                            className="w-full h-11 bg-white/10 border border-white/20 rounded-xl px-4 pr-11 text-white placeholder-white/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-transparent disabled:opacity-50 transition-all"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Submit */}
                      <motion.button
                        type="submit"
                        disabled={isLoading || !username.trim() || !password.trim()}
                        className="w-full h-12 rounded-xl font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
                        style={{
                          background: "linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)",
                          color: "white",
                          boxShadow: "0 8px 28px rgba(249,115,22,0.4)",
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isLoading ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Masuk…
                          </>
                        ) : (
                          <>
                            <LogIn className="h-4 w-4" />
                            Masuk
                          </>
                        )}
                      </motion.button>
                    </form>
                  </div>

                  <p className="text-center text-white/30 text-[10px] mt-4 tracking-wide">
                    © IGH Tour — Land Arrangement Umrah & Haji
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
