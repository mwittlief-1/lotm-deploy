import type {
  CourtOs1120ApiService,
  CourtOs1120ApiServiceProvider,
  CourtOs1120Endpoint,
  CourtOs1120TransportRequest,
  CourtOs1120TransportResponse,
} from "./contracts";

const JSON_NO_STORE_HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
});

const SOURCE_ERROR_CODES: Readonly<Record<CourtOs1120Endpoint, string>> = {
  courtos: "COURTOS_READ_MODEL_UNAVAILABLE",
  household: "HOUSEHOLD_READ_MODEL_UNAVAILABLE",
  "council-room": "COUNCIL_ROOM_SOURCE_UNAVAILABLE",
};

function response(
  status: number,
  body: CourtOs1120TransportResponse["body"],
): CourtOs1120TransportResponse {
  return { status, headers: JSON_NO_STORE_HEADERS, body };
}

function sourceUnavailable(
  endpoint: CourtOs1120Endpoint,
  error: unknown,
): CourtOs1120TransportResponse {
  return response(503, {
    ok: false,
    error: {
      code: SOURCE_ERROR_CODES[endpoint],
      message: error instanceof Error ? error.message : String(error),
    },
  });
}

function requestUrl(request: CourtOs1120TransportRequest): URL {
  return new URL(request.url || "/", "http://courtos.invalid");
}

/**
 * Provider-neutral CourtOS endpoint contract. It contains no Vite, Vercel,
 * socket, or filesystem behavior; transports and source bindings are injected.
 */
export async function handleCourtOs1120Request(
  endpoint: CourtOs1120Endpoint,
  request: CourtOs1120TransportRequest,
  serviceProvider: CourtOs1120ApiServiceProvider,
): Promise<CourtOs1120TransportResponse> {
  if (request.method !== "GET") {
    return response(405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "GET required." },
    });
  }

  try {
    const service: CourtOs1120ApiService =
      typeof serviceProvider === "function"
        ? serviceProvider()
        : serviceProvider;
    const url = requestUrl(request);
    if (endpoint === "courtos") {
      const result = await service.courtOs({
        entityId: url.searchParams.get("entityId"),
        houseId: url.searchParams.get("houseId"),
        entityLabel: url.searchParams.get("entityLabel"),
      });
      return response(200, {
        ok: true,
        data: result.data,
        pas_calibration: result.pasCalibration,
      });
    }

    if (endpoint === "household") {
      const householdEntityId = url.searchParams.get("householdEntityId")?.trim();
      const houseId = url.searchParams.get("houseId")?.trim();
      if (!householdEntityId) throw new Error("householdEntityId is required.");
      if (!houseId) throw new Error("houseId is required.");
      return response(200, {
        ok: true,
        data: await service.household({ householdEntityId, houseId }),
      });
    }

    const houseId = url.searchParams.get("houseId")?.trim();
    if (!houseId) throw new Error("houseId is required.");
    return response(200, {
      ok: true,
      data: await service.councilRoom({ houseId }),
    });
  } catch (error) {
    return sourceUnavailable(endpoint, error);
  }
}
