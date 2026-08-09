import { resolve } from "node:path";

import type { CourtOs1120Endpoint } from "../src/server/courtos1120Api/contracts";
import { handleCourtOs1120Request } from "../src/server/courtos1120Api/handler";
import {
  createCourtOs1120ReadModelService,
  repositoryCourtOs1120Sources,
} from "../src/server/courtos1120Api/readModelService";

function desktopDataRoot(): string {
  // `main.ts` sets COURTOS_DATA_ROOT before this module loads. This keeps the
  // contract adapter independent from Electron UI state and makes its exact
  // packaged data root testable. Direct development imports retain the repo
  // fallback.
  return process.env.COURTOS_DATA_ROOT || resolve(import.meta.dirname, "..");
}

export function desktopCourtOs1120Sources(root = desktopDataRoot()) {
  return repositoryCourtOs1120Sources(root);
}

function desktopService() {
  return createCourtOs1120ReadModelService(
    desktopCourtOs1120Sources(),
    { accessMode: "player_runtime" },
  );
}

const service = desktopService();

function endpointFor(pathname: string): CourtOs1120Endpoint | null {
  if (pathname === "/api/courtos/1120") return "courtos";
  if (pathname === "/api/household/1120") return "household";
  if (pathname === "/api/council-room/1120") return "council-room";
  if (pathname === "/api/responsibilities/1120") return "responsibility-workspace";
  if (pathname === "/api/spatial/1120") return "spatial";
  if (pathname === "/api/spatial/1120/visual") return "spatial-visual";
  if (pathname === "/api/spatial/1120/visual-composition") return "spatial-visual-composition";
  return null;
}

export async function handleDesktopCourtOsApi(request: Request): Promise<Response> {
  const endpoint = endpointFor(new URL(request.url).pathname);
  if (!endpoint) return new Response("Not found", { status: 404 });
  const result = await handleCourtOs1120Request(
    endpoint,
    { method: request.method, url: request.url },
    service,
  );
  return new Response(JSON.stringify(result.body), { status: result.status, headers: result.headers });
}
