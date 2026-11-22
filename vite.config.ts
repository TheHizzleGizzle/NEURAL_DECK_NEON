import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "icon.svg"],
      manifest: {
        id: "/",
        name: "NEURAL//DECK",
        short_name: "NEURAL//DECK",
        description:
          "Pixel-art cyber deck app for AI-assisted brainstorming with branching idea cards, creative skill cartridges, splice mashups, convergence briefs, and an anti-pattern graveyard.",
        theme_color: "#080A12",
        background_color: "#080A12",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        // Fonts are self-hosted via @fontsource and precached by globPatterns above.
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  server: {
    hmr: false,
  },
});
