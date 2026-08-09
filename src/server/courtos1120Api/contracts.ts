import type { CourtOsSessionContextV1 } from "../../courtosSessionContext";
import type { CourtOsResponsibilityDesignKey } from "../../ui/courtosInformationArchitecture";

export type CourtOs1120Endpoint =
  | "courtos"
  | "household"
  | "council-room"
  | "responsibility-workspace"
  | "spatial"
  | "spatial-visual"
  | "spatial-visual-composition";

export interface CourtOs1120ApiService {
  sessionContext(input: { houseId: string }): CourtOsSessionContextV1 | Promise<CourtOsSessionContextV1>;
  courtOs(input: { houseId: string }): Promise<unknown>;
  household(input: {
    householdEntityId: string;
    houseId: string;
  }): Promise<unknown>;
  councilRoom(input: { houseId: string }): Promise<unknown>;
  responsibilityWorkspace(input: {
    houseId: string;
    responsibility: CourtOsResponsibilityDesignKey;
  }): Promise<unknown>;
  spatial(input: { houseId: string }): Promise<unknown>;
  spatialVisual(input: {
    houseId: string;
    manorId: string;
    lod: "macro" | "mid_hex" | "fine_cell";
    parentHexId?: string;
  }): Promise<unknown>;
  spatialVisualComposition(input: {
    houseId: string;
    manorId: string;
    lod: "mid_hex" | "fine_cell";
  }): Promise<unknown>;
  close(): Promise<void>;
}

export type CourtOs1120ApiServiceProvider =
  | CourtOs1120ApiService
  | (() => CourtOs1120ApiService);

export interface CourtOs1120TransportRequest {
  method: string | undefined;
  url: string | undefined;
}

export interface CourtOs1120TransportResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body:
    | { ok: true; context: CourtOsSessionContextV1; data: unknown }
    | {
        ok: false;
        error: { code: string; message: string; incident_id?: string };
      };
}
