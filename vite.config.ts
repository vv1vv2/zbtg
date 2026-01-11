import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        popup: "popup.html"
      },
      output: {
        entryFileNames: "popup.js",
        assetFileNames: "popup.[ext]",
        inlineDynamicImports: true
      }
    }
  }
});
