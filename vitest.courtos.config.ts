import { defineConfig } from "vitest/config";

/**
 * CourtOS engineering tests do not need the dev server's World/CourtOS API
 * plugins. Keeping this config Node-only prevents Vitest from evaluating the
 * production Vite server graph before every focused contract test.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["**/_patchB/**"],
  },
});
