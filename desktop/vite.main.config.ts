import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: false,
    ssr: resolve(import.meta.dirname, "main.ts"),
    rollupOptions: {
      external: ["electron", "better-sqlite3"],
      output: { entryFileNames: "main.mjs", format: "es" },
    },
  },
});
