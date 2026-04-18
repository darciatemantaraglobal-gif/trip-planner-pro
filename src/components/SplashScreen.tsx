import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] md:hidden flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(145deg, hsl(27 91% 48%) 0%, hsl(20 90% 58%) 60%, hsl(35 95% 65%) 100%)",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Decorative circles */}
          <div className="absolute top-[-80px] right-[-60px] h-56 w-56 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-[-60px] left-[-50px] h-48 w-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-1/3 left-[-40px] h-32 w-32 rounded-full bg-white/5 pointer-events-none" />

          {/* Logo + brand */}
          <motion.div
            className="flex flex-col items-center gap-5"
            initial={{ opacity: 0, y: 28, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl ring-4 ring-white/25">
              <img
                src="/logo-igh-tour.png"
                alt="IGH Tour"
                className="h-16 w-16 object-contain drop-shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            <div className="text-center">
              <motion.h1
                className="text-3xl font-bold text-white tracking-tight drop-shadow-md"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                IGH Tour
              </motion.h1>
              <motion.p
                className="text-white/80 text-sm font-medium tracking-widest uppercase mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.45 }}
              >
                Travel Agency
              </motion.p>
            </div>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            className="absolute bottom-16 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-white/70"
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
