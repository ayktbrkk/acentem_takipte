import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";

export default defineConfig({
  plugins: [
    vue(),
    Icons({
      compiler: "vue3",
    }),
  ],
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
