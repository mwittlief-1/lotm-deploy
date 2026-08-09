import type { Plugin, PreviewServer, ViteDevServer } from "vite";

import { createCourtOs1120NodeHandler } from "./nodeAdapter";
import {
  createCourtOs1120ReadModelService,
  repositoryCourtOs1120Sources,
} from "./readModelService";

export function courtOs1120ReadModelApiPlugin(): Plugin {
  const service = createCourtOs1120ReadModelService(
    repositoryCourtOs1120Sources(),
    { accessMode: "player_runtime" },
  );

  function install(server: ViteDevServer | PreviewServer): void {
    server.httpServer?.once("close", () => {
      void service.close();
    });
    server.middlewares.use(
      "/api/courtos/1120",
      createCourtOs1120NodeHandler("courtos", service),
    );
    server.middlewares.use(
      "/api/household/1120",
      createCourtOs1120NodeHandler("household", service),
    );
    server.middlewares.use(
      "/api/council-room/1120",
      createCourtOs1120NodeHandler("council-room", service),
    );
    server.middlewares.use(
      "/api/responsibilities/1120",
      createCourtOs1120NodeHandler("responsibility-workspace", service),
    );
    server.middlewares.use(
      "/api/spatial/1120/visual-composition",
      createCourtOs1120NodeHandler("spatial-visual-composition", service),
    );
    server.middlewares.use(
      "/api/spatial/1120/visual",
      createCourtOs1120NodeHandler("spatial-visual", service),
    );
    server.middlewares.use(
      "/api/spatial/1120",
      createCourtOs1120NodeHandler("spatial", service),
    );
  }

  return {
    name: "courtos-1120-read-model-api",
    configureServer(server: ViteDevServer) {
      install(server);
    },
    configurePreviewServer(server: PreviewServer) {
      install(server);
    },
  };
}
