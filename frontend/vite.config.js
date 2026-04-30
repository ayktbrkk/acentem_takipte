import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";
// audit(perf/P-02): Bundle visualizer — run with ANALYZE=true npm run build
// to generate dist/stats.html for visual bundle inspection.
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    vue(),
    Icons({
      compiler: "vue3",
    }),
    // Only generate the bundle report when explicitly requested
    process.env.ANALYZE === "true" &&
      visualizer({ open: true, gzipSize: true, filename: "dist/stats.html" }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  base: "/assets/acentem_takipte/frontend/",
  build: {
    manifest: true,
    outDir: "../acentem_takipte/public/frontend",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/main.js"),
      output: {
        manualChunks: {
          vue: ["vue", "vue-router"],
          frappe_ui: ["frappe-ui"],
          chart: ["chart.js"],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "^/(api|assets|files|private)": {
        target: process.env.VITE_PROXY_URL || "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
