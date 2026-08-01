import { resolve } from "node:path";

import type { Plugin, PreviewServer, UserConfig, ViteDevServer } from "vite";

import { buildWorld1116FiscalOfficeProjection } from "./src/ui/readModels/world1116/fiscalOfficeProjection";
import { World1116ReadModel } from "./src/ui/readModels/world1116/service";
import type { World1116ReadModelSessionContract } from "./src/ui/readModels/world1116/types";
import { courtOs1120ReadModelApiPlugin } from "./src/server/courtos1120Api/vitePlugin";

const WORLD_1116_POINTER = resolve(
  process.cwd(),
  "data/staging/world_1116_opening_v2/combined/CURRENT"
);
const COURTOS_ONLY_BUILD = process.env.COURTOS_ONLY_BUILD === "1";
function defineConfig<T extends UserConfig>(config: T): T {
  return config;
}

function world1116ReadModelApi(): Plugin {
  let sessionPromise: Promise<World1116ReadModelSessionContract> | undefined;

  function install(server: ViteDevServer | PreviewServer) {
      server.httpServer?.once("close", () => {
        void sessionPromise?.then((session) => session.close()).catch(() => undefined);
      });

      server.middlewares.use("/api/world1116/fiscal-office", async (request, response) => {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        if (request.method !== "GET") {
          response.statusCode = 405;
          response.end(JSON.stringify({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "GET required." } }));
          return;
        }

        try {
          // The World 1116 database is substantially larger than the CourtOS
          // contracts. Open it only when its own surface is requested so an
          // offloaded world database cannot stall the CourtOS UAT runtime.
          sessionPromise ??= World1116ReadModel.openFromPointer(WORLD_1116_POINTER, { rowLimit: 10_000 });
          const session = await sessionPromise;
          const data = await buildWorld1116FiscalOfficeProjection(session);
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true, data }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const code =
            error && typeof error === "object" && "code" in error && typeof error.code === "string"
              ? error.code
              : "READ_MODEL_UNAVAILABLE";
          response.statusCode = 503;
          response.end(JSON.stringify({ ok: false, error: { code, message } }));
        }
      });
  }

  return {
    name: "lotm-read-model-api",
    configureServer(server: ViteDevServer) {
      install(server);
    },
    configurePreviewServer(server: PreviewServer) {
      install(server);
    },
  };
}

export default defineConfig({
  // Vite's native esbuild pipeline handles this TSX application. Avoid the
  // optional React/Babel transform because this workspace carries a separate
  // Vite generation through Vitest and the two Babel graphs conflict in dev.
  plugins: [world1116ReadModelApi(), courtOs1120ReadModelApiPlugin()],
  publicDir: COURTOS_ONLY_BUILD ? ".courtos-public" : "public",
  optimizeDeps: {
    // This repository contains many review-only HTML artifacts. Limit Vite's
    // dependency discovery to the two shipped application entries.
    entries: ["courtos-home.html"],
  },
  build: {
    rollupOptions: {
      input: COURTOS_ONLY_BUILD
        ? { courtosHome: resolve(process.cwd(), "courtos-home.html") }
        : {
            main: resolve(process.cwd(), "index.html"),
            courtosHome: resolve(process.cwd(), "courtos-home.html"),
          },
    },
  },
  server: {
    port: 5173,
    watch: {
      ignored: [
        "**/.codex-lane-worktrees/**",
        "**/_archive/**",
        "**/data/**",
        "**/dispatch/**",
        "**/dispatch_map/**",
        "**/design-system/**",
        "**/docs/**",
        "**/ops/**",
        "**/poc/**",
        "**/qa_artifacts/**",
        "**/review_artifacts/**",
        "**/review_packet_delivery/**",
        "**/review_packets/**",
        "**/scripts/**",
        "**/tests/**",
        "**/tmp/**",
        "**/workpads/**"
      ]
    }
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["**/_patchB/**"]
  }
} as UserConfig);
