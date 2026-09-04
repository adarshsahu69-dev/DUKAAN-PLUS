import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/DUKAAN-PLUS/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon-32.png",
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-192.png",
        "icon-maskable-512.png",
        "icon-maskable-1024.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "DUKAAN PLUS - Kirana Inventory",
        short_name: "Dukaan",
        description: "Offline-first inventory & billing for kirana shops",
        theme_color: "#0A2C4E",
        background_color: "#F8F4EC",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "fullscreen"],
        orientation: "portrait",
        start_url: "/DUKAAN-PLUS/",
        scope: "/DUKAAN-PLUS/",
        id: "/DUKAAN-PLUS/",
        lang: "en",
        dir: "ltr",
        categories: ["shopping", "utilities"],
        // PWABuilder "optional" manifest members. Most are no-ops on Android
        // TWA but are listed so the validation checklist is fully populated.
        prefer_related_applications: false,
        related_applications: [],
        protocol_handlers: [],
        file_handlers: [],
        launch_handler: { client_mode: "focus-existing" },
        share_target: {
          action: "/DUKAAN-PLUS/?share=",
          method: "GET",
          enctype: "application/x-www-form-urlencoded",
          params: { title: "title", text: "text", url: "url" },
        },
        note_taking: { id: "dukaan-plus-note-taking" },
        edge_side_panel: { preferred_display_mode: "fullscreen" },
        scope_extensions: [],
        widgets: [],
        shortcuts: [
          {
            name: "New Sale",
            short_name: "Sale",
            url: "/DUKAAN-PLUS/billing",
            icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Add Stock",
            short_name: "Stock",
            url: "/DUKAAN-PLUS/purchases",
            icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Reports",
            short_name: "Reports",
            url: "/DUKAAN-PLUS/reports",
            icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Customers",
            short_name: "Customers",
            url: "/DUKAAN-PLUS/customers",
            icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icon-maskable-1024.png", sizes: "1024x1024", type: "image/png", purpose: "maskable" },
        ],
        // Add real Android screenshots (2+). You can upload them directly in
        // PWABuilder's UI instead of adding them here. If you put PNGs in
        // web/public, add them to includeAssets above and list them here.
        screenshots: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
