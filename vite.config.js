import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: { enabled: false },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/landing(?:\/|$)/],
      },
      manifest: {
        name: "AxisVTU",
        short_name: "AxisVTU",
        description: "Wallet-first VTU platform with clean receipts.",
        start_url: "/app/",
        scope: "/app/",
        display: "standalone",
        background_color: "#f7f6f2",
        theme_color: "#0f766e",
        icons: [
          { src: "/pwa/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    port: 5173
  }
});
