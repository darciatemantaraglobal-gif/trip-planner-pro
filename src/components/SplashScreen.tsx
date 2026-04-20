import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashBackground from "@assets/image_1776663921386.png";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#190d23]"
          style={{
            backgroundImage: `url(${splashBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 bg-black/5" />

          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.2, 0.64, 1] }}
          >
            <img
              src="/logo-igh-tour.png"
              alt="IGH Tour"
              className="h-24 w-auto object-contain brightness-0 invert drop-shadow-[0_10px_32px_rgba(0,0,0,0.35)]"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const parent = img.parentElement!;
                const fallback = document.createElement("span");
                fallback.textContent = "IGH";
                fallback.className = "text-5xl font-black tracking-[-0.06em] text-white drop-shadow-[0_10px_32px_rgba(0,0,0,0.35)]";
                parent.appendChild(fallback);
              }}
            />

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  className="mt-9 flex flex-col items-center gap-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: 0.35, duration: 0.35, ease: "easeOut" }}
                >
                  <div className="h-9 w-9 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/85">
                    Loading
                  </p>
                </motion.div>
              ) : (
                <motion.button
                  key="login"
                  type="button"
                  onClick={() => setVisible(false)}
                  className="mt-10 rounded-full bg-white px-10 py-3 text-sm font-bold uppercase tracking-[0.22em] text-[#d94b00] shadow-[0_18px_45px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  Login
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {loading && (
            <motion.div
              className="absolute bottom-14 left-10 right-10 z-10 h-[2px] overflow-hidden rounded-full bg-white/20 sm:left-1/2 sm:w-72 sm:-translate-x-1/2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.25 }}
            >
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.35, delay: 0.35, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
