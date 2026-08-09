import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: false,
    ssr: resolve(import.meta.dirname, "preload.ts"),
    rollupOptions: {
      external: ["electron"],
      output: { entryFileNames: "preload.cjs", format: "cjs" },
    },
  },
});
