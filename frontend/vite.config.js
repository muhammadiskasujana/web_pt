// vite.config.ts (atau .js)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",        // cek update otomatis di background
      workbox: {
        skipWaiting: true,               // aktifkan SW baru tanpa nunggu tutup tab
        clientsClaim: true,              // SW baru langsung claim semua client
        // optional: contoh agar request /api tidak di-cache oleh workbox
        navigateFallbackDenylist: [/^\/api\//],
      },
      includeAssets: ["smith_ai_logo.png"],
      manifest: {
        name: "CHECK SOLUTION",
        short_name: "ONE-CHECK",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1d4ed8",
        icons: [
          { src: "smith_ai_logo.png", sizes: "192x192", type: "image/png" },
          { src: "smith_ai_logo.png", sizes: "512x512", type: "image/png" },
          // (opsional) maskable agar ikon PWA bagus di Android
          // { src: "smith_ai_logo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      // (opsional) aktifkan PWA saat dev untuk uji UX update
      // devOptions: { enabled: true }
    }),
  ],
  server: {
    allowedHosts: ["kasir.garasicetak.id","kasir.educoders.cloud","vscode3.huntersmithnusantara.id"],
    host: "127.0.0.1",
    port: 3314,
  },
});
