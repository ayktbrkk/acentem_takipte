// vite.config.js
import { resolve } from "node:path";
import { defineConfig } from "file:///C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import Icons from "file:///C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/node_modules/unplugin-icons/dist/vite.js";
var __vite_injected_original_dirname = "C:\\Users\\Aykut\\Documents\\GitHub\\acentem_takipte\\frontend";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    Icons({
      compiler: "vue3"
    })
  ],
  base: "/assets/acentem_takipte/frontend/",
  build: {
    manifest: true,
    outDir: resolve(__vite_injected_original_dirname, "../acentem_takipte/acentem_takipte/public/frontend"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__vite_injected_original_dirname, "src/main.js"),
      output: {
        manualChunks: {
          vue: ["vue", "vue-router"],
          frappe_ui: ["frappe-ui"]
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "^/(api|assets|files|private)": {
        target: process.env.VITE_PROXY_URL || "http://127.0.0.1:8000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBeWt1dFxcXFxEb2N1bWVudHNcXFxcR2l0SHViXFxcXGFjZW50ZW1fdGFraXB0ZVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQXlrdXRcXFxcRG9jdW1lbnRzXFxcXEdpdEh1YlxcXFxhY2VudGVtX3Rha2lwdGVcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0F5a3V0L0RvY3VtZW50cy9HaXRIdWIvYWNlbnRlbV90YWtpcHRlL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHZ1ZSBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tdnVlXCI7XHJcbmltcG9ydCBJY29ucyBmcm9tIFwidW5wbHVnaW4taWNvbnMvdml0ZVwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICB2dWUoKSxcclxuICAgIEljb25zKHtcclxuICAgICAgY29tcGlsZXI6IFwidnVlM1wiLFxyXG4gICAgfSksXHJcbiAgXSxcclxuICBiYXNlOiBcIi9hc3NldHMvYWNlbnRlbV90YWtpcHRlL2Zyb250ZW5kL1wiLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBtYW5pZmVzdDogdHJ1ZSxcclxuICAgIG91dERpcjogcmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vYWNlbnRlbV90YWtpcHRlL2FjZW50ZW1fdGFraXB0ZS9wdWJsaWMvZnJvbnRlbmRcIiksXHJcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgaW5wdXQ6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyYy9tYWluLmpzXCIpLFxyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgIHZ1ZTogW1widnVlXCIsIFwidnVlLXJvdXRlclwiXSxcclxuICAgICAgICAgIGZyYXBwZV91aTogW1wiZnJhcHBlLXVpXCJdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgIFwiXi8oYXBpfGFzc2V0c3xmaWxlc3xwcml2YXRlKVwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX1BST1hZX1VSTCB8fCBcImh0dHA6Ly8xMjcuMC4wLjE6ODAwMFwiLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd1csU0FBUyxlQUFlO0FBQ2hZLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQUNoQixPQUFPLFdBQVc7QUFIbEIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osTUFBTTtBQUFBLE1BQ0osVUFBVTtBQUFBLElBQ1osQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE1BQU07QUFBQSxFQUNOLE9BQU87QUFBQSxJQUNMLFVBQVU7QUFBQSxJQUNWLFFBQVEsUUFBUSxrQ0FBVyxvREFBb0Q7QUFBQSxJQUMvRSxhQUFhO0FBQUEsSUFDYixlQUFlO0FBQUEsTUFDYixPQUFPLFFBQVEsa0NBQVcsYUFBYTtBQUFBLE1BQ3ZDLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLEtBQUssQ0FBQyxPQUFPLFlBQVk7QUFBQSxVQUN6QixXQUFXLENBQUMsV0FBVztBQUFBLFFBQ3pCO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixPQUFPO0FBQUEsTUFDTCxnQ0FBZ0M7QUFBQSxRQUM5QixRQUFRLFFBQVEsSUFBSSxrQkFBa0I7QUFBQSxRQUN0QyxjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
