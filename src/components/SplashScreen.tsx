import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] md:hidden flex flex-col items-center justify-center bg-white"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* Center content */}
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
          >
            {/* Logo mark */}
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,hsl(27 91% 54%),hsl(16 88% 58%))" }}
            >
              <img
                src="/logo-igh-tour.png"
                alt="IGH Tour"
                className="h-13 w-13 object-contain"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const parent = img.parentElement!;
                  parent.innerHTML = `<span style="font-size:2rem;font-weight:800;color:#fff;letter-spacing:-0.04em">IGH</span>`;
                }}
              />
            </div>

            {/* Brand text */}
            <div className="text-center space-y-0.5">
              <h1 className="text-[26px] font-bold tracking-tight text-[hsl(var(--foreground))]">
                IGH Tour
              </h1>
              <p className="text-[13px] font-medium text-[hsl(var(--primary))] tracking-widest uppercase">
                Travel Agency
              </p>
            </div>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            className="absolute bottom-14 left-10 right-10 h-[2px] rounded-full bg-[hsl(var(--border))] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.2 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "hsl(27 91% 54%)" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.4, delay: 0.35, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
