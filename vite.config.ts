import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/api/frankfurter": {
        target: "https://api.frankfurter.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/frankfurter/, ""),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo-igh-tour.png"],
      manifest: {
        name: "IGH Tour - Travel Management",
        short_name: "IGH Tour",
        description: "Aplikasi manajemen trip & kalkulasi biaya Umrah / Haji",
        theme_color: "#f97316",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/logo-igh-tour.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/logo-igh-tour.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.frankfurter\.app\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "exchange-rates-cache",
              expiration: { maxEntries: 5, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
