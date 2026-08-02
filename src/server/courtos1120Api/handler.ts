import { randomUUID } from "node:crypto";

import type {
  CourtOs1120ApiService,
  CourtOs1120ApiServiceProvider,
  CourtOs1120Endpoint,
  CourtOs1120TransportRequest,
  CourtOs1120TransportResponse,
} from "./contracts";
import { CourtOsHouseAccessDenied } from "./accessPolicy";

const JSON_NO_STORE_HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
});

const SOURCE_ERROR_CODES: Readonly<Record<CourtOs1120Endpoint, string>> = {
  courtos: "COURTOS_READ_MODEL_UNAVAILABLE",
  household: "HOUSEHOLD_READ_MODEL_UNAVAILABLE",
  "council-room": "COUNCIL_ROOM_SOURCE_UNAVAILABLE",
  spatial: "SPATIAL_READ_MODEL_UNAVAILABLE",
};

class CourtOsRequestInvalid extends Error {
  readonly code = "COURTOS_REQUEST_INVALID";

  constructor() {
    super("Required request context is missing.");
    this.name = "CourtOsRequestInvalid";
  }
}

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
  if (error instanceof CourtOsHouseAccessDenied) {
    return response(403, {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }
  if (error instanceof CourtOsRequestInvalid) {
    return response(400, {
      ok: false,
      error: { code: error.code, message: error.message },
    });
  }
  const incidentId = randomUUID();
  console.error("CourtOS read source unavailable", {
    endpoint,
    incident_id: incidentId,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { value: String(error) },
  });
  return response(503, {
    ok: false,
    error: {
      code: SOURCE_ERROR_CODES[endpoint],
      message: "The requested read-only record is temporarily unavailable.",
      incident_id: incidentId,
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
      const houseId = url.searchParams.get("houseId")?.trim();
      if (!houseId) throw new CourtOsRequestInvalid();
      const data = await service.courtOs({ houseId });
      return response(200, {
        ok: true,
        context: service.sessionContext({ houseId }),
        data,
      });
    }

    if (endpoint === "household") {
      const householdEntityId = url.searchParams.get("householdEntityId")?.trim();
      const houseId = url.searchParams.get("houseId")?.trim();
      if (!householdEntityId || !houseId) throw new CourtOsRequestInvalid();
      return response(200, {
        ok: true,
        context: service.sessionContext({ houseId }),
        data: await service.household({ householdEntityId, houseId }),
      });
    }

    const houseId = url.searchParams.get("houseId")?.trim();
    if (!houseId) throw new CourtOsRequestInvalid();
    if (endpoint === "spatial") {
      return response(200, {
        ok: true,
        context: service.sessionContext({ houseId }),
        data: await service.spatial({ houseId }),
      });
    }
    return response(200, {
      ok: true,
      context: service.sessionContext({ houseId }),
      data: await service.councilRoom({ houseId }),
    });
  } catch (error) {
    return sourceUnavailable(endpoint, error);
  }
}
