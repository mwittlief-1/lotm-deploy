import type { CourtOsSessionContextV1 } from "../../courtosSessionContext";

export type CourtOs1120Endpoint =
  | "courtos"
  | "household"
  | "council-room"
  | "spatial";

export interface CourtOs1120ApiService {
  sessionContext(input: { houseId: string }): CourtOsSessionContextV1;
  courtOs(input: { houseId: string }): Promise<unknown>;
  household(input: {
    householdEntityId: string;
    houseId: string;
  }): Promise<unknown>;
  councilRoom(input: { houseId: string }): Promise<unknown>;
  spatial(input: { houseId: string }): Promise<unknown>;
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
