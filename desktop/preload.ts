import { contextBridge, ipcRenderer } from "electron";

import type {
  CourtScribeFiscalBriefRequestV1,
  CourtScribeFiscalBriefResponseV1,
} from "../src/ui/scribe/courtScribeFiscalBrief";
import type { CourtScribeRuntimeTelemetryV1 } from "../src/ui/scribe/courtScribeRuntime";
import type {
  CourtScribeBriefingPacketV1,
  CourtScribeBriefingPlanV1,
} from "../src/ui/scribe/courtScribeBriefingContract";

contextBridge.exposeInMainWorld("courtOsScribe", {
  fiscalBrief: (request: CourtScribeFiscalBriefRequestV1) =>
    ipcRenderer.invoke("courtos:scribe:fiscal-brief", request) as Promise<CourtScribeFiscalBriefResponseV1 | null>,
  briefing: (request: CourtScribeBriefingPacketV1) =>
    ipcRenderer.invoke("courtos:scribe:briefing", request) as Promise<CourtScribeBriefingPlanV1 | null>,
  warm: () => ipcRenderer.invoke("courtos:scribe:warm") as Promise<boolean>,
  status: () => ipcRenderer.invoke("courtos:scribe:status") as Promise<CourtScribeRuntimeTelemetryV1>,
});

function playerStoreResult<T>(channel: string, ...args: unknown[]): T {
  const result = ipcRenderer.sendSync(channel, ...args) as
    | { ok: true; value: T }
    | { ok: false; message: string };
  if (!result?.ok) {
    throw new Error(result?.message || "CourtOS player store is unavailable.");
  }
  return result.value;
}

contextBridge.exposeInMainWorld("courtOsPlayerPlans", {
  getItem: (key: string) =>
    playerStoreResult<string | null>("courtos:player-store:get", key),
  setItem: (key: string, value: string) =>
    playerStoreResult<void>("courtos:player-store:set", key, value),
  removeItem: (key: string) =>
    playerStoreResult<void>("courtos:player-store:remove", key),
});
