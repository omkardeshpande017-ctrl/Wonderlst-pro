import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_API_PROXY_TARGET lets Docker Compose point this at the "server"
// container by name; it defaults to localhost for non-Docker local dev.
const proxyTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
      "/uploads": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
