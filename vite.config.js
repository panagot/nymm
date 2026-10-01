/**
 * Vite config for NYMM
 * - Dev server on 5177 (fixed port for local demos)
 * - Exclude mix-fetch from pre-bundle so the WASM worker loads correctly
 * - ES worker format required by @nymproject/mix-tunnel
 */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    strictPort: true,
  },
  optimizeDeps: {
    // Pre-bundling these packages breaks the WASM / worker path in mix-fetch v2
    exclude: ["@nymproject/mix-fetch", "@nymproject/mix-tunnel"],
  },
  worker: {
    format: "es",
  },
});
