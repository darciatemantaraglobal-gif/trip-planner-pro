import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Di dev mode: matikan & buang semua service worker yang udah terlanjur
// ke-install. SW caching bundle Vite (yg hash-nya berubah tiap restart) bikin
// white-screen karena chunk lama di-serve untuk module yang udah berubah
// export-nya. Lihat juga `devOptions.enabled: false` di vite.config.ts.
if (import.meta.env.DEV && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister();
  });
  // Buang juga cache-storage yang ditinggal SW lama supaya gak ada static
  // asset stale yang nyangkut.
  if ("caches" in window) {
    void caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
} else {
  // Prod: normal PWA behavior — auto-update + offline support.
  registerSW({
    onNeedRefresh() {},
    onOfflineReady() {
      console.log("[PWA] App ready for offline use");
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
