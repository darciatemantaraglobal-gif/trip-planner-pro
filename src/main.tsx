import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() {},
  onOfflineReady() {
    console.log("[PWA] App ready for offline use");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
