export type CourtOs1120Endpoint = "courtos" | "household" | "council-room";

export interface CourtOs1120ApiService {
  courtOs(input: { houseId: string }): Promise<unknown>;
  household(input: {
    householdEntityId: string;
    houseId: string;
  }): Promise<unknown>;
  councilRoom(input: { houseId: string }): Promise<unknown>;
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
    | { ok: true; data: unknown }
    | { ok: false; error: { code: string; message: string } };
}
