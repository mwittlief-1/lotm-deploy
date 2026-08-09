import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(import.meta.dirname, ".."),
  base: "./",
  publicDir: resolve(import.meta.dirname, "../.courtos-public"),
  build: {
    outDir: resolve(import.meta.dirname, "dist/renderer"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, "../courtos-home.html"),
    },
  },
});
