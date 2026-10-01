import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ["@nymproject/mix-fetch", "@nymproject/mix-tunnel"],
  },
  worker: {
    format: "es",
  },
});
