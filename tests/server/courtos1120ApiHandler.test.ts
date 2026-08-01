import { describe, expect, it, vi } from "vitest";

import type { CourtOs1120ApiService } from "../../src/server/courtos1120Api/contracts";
import { handleCourtOs1120Request } from "../../src/server/courtos1120Api/handler";
import { createCourtOs1120FetchHandler } from "../../src/server/courtos1120Api/webAdapter";

function serviceStub(): CourtOs1120ApiService {
  return {
    courtOs: vi.fn(async (input) => ({
      data: { schema_version: "courtos_1120_read_only_projection_v1", query: input },
      pasCalibration: { schema_version: "pas_calibration_proposal_v0" },
    })),
    household: vi.fn(async (input) => ({
      schema_version: "household_1120_read_only_projection_v2",
      query: input,
    })),
    councilRoom: vi.fn(async (input) => ({
      schema_version: "council_room_ready_projection_v1",
      query: input,
    })),
    close: vi.fn(async () => undefined),
  };
}

describe("CourtOS 1120 provider-neutral endpoint contract", () => {
  it("preserves GET-only, no-store JSON behavior for every endpoint", async () => {
    for (const endpoint of ["courtos", "household", "council-room"] as const) {
      const service = serviceStub();
      const result = await handleCourtOs1120Request(
        endpoint,
        { method: "POST", url: `https://example.test/api/${endpoint}/1120` },
        service,
      );
      expect(result).toEqual({
        status: 405,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
        body: {
          ok: false,
          error: { code: "METHOD_NOT_ALLOWED", message: "GET required." },
        },
      });
      expect(service.courtOs).not.toHaveBeenCalled();
      expect(service.household).not.toHaveBeenCalled();
      expect(service.councilRoom).not.toHaveBeenCalled();
    }
  });

  it("passes only the documented CourtOS selectors to the read service", async () => {
    const service = serviceStub();
    const result = await handleCourtOs1120Request(
      "courtos",
      {
        method: "GET",
        url: "https://example.test/api/courtos/1120?entityId=e1&houseId=h1&entityLabel=House%20One&ignored=secret",
      },
      service,
    );
    expect(service.courtOs).toHaveBeenCalledWith({
      entityId: "e1",
      houseId: "h1",
      entityLabel: "House One",
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      data: { schema_version: "courtos_1120_read_only_projection_v1" },
      pas_calibration: { schema_version: "pas_calibration_proposal_v0" },
    });
  });

  it("requires both scoped Household selectors before reading", async () => {
    const service = serviceStub();
    const missing = await handleCourtOs1120Request(
      "household",
      {
        method: "GET",
        url: "https://example.test/api/household/1120?houseId=h1",
      },
      service,
    );
    expect(missing).toMatchObject({
      status: 503,
      body: {
        ok: false,
        error: {
          code: "HOUSEHOLD_READ_MODEL_UNAVAILABLE",
          message: "householdEntityId is required.",
        },
      },
    });
    expect(service.household).not.toHaveBeenCalled();

    const ready = await handleCourtOs1120Request(
      "household",
      {
        method: "GET",
        url: "https://example.test/api/household/1120?householdEntityId=e1&houseId=h1",
      },
      service,
    );
    expect(service.household).toHaveBeenCalledWith({
      householdEntityId: "e1",
      houseId: "h1",
    });
    expect(ready.status).toBe(200);
  });

  it("requires a House-scoped Council Room request", async () => {
    const service = serviceStub();
    const missing = await handleCourtOs1120Request(
      "council-room",
      { method: "GET", url: "https://example.test/api/council-room/1120" },
      service,
    );
    expect(missing).toMatchObject({
      status: 503,
      body: {
        error: {
          code: "COUNCIL_ROOM_SOURCE_UNAVAILABLE",
          message: "houseId is required.",
        },
      },
    });
    expect(service.councilRoom).not.toHaveBeenCalled();
  });

  it("maps source failures to the endpoint-specific existing error contracts", async () => {
    const cases = [
      ["courtos", "COURTOS_READ_MODEL_UNAVAILABLE", "courtOs"],
      ["household", "HOUSEHOLD_READ_MODEL_UNAVAILABLE", "household"],
      ["council-room", "COUNCIL_ROOM_SOURCE_UNAVAILABLE", "councilRoom"],
    ] as const;
    for (const [endpoint, code, method] of cases) {
      const service = serviceStub();
      vi.mocked(service[method]).mockRejectedValueOnce(new Error("source offline"));
      const query =
        endpoint === "household"
          ? "?householdEntityId=e1&houseId=h1"
          : "?houseId=h1";
      const result = await handleCourtOs1120Request(
        endpoint,
        { method: "GET", url: `https://example.test/api/${endpoint}/1120${query}` },
        service,
      );
      expect(result).toMatchObject({
        status: 503,
        body: {
          ok: false,
          error: { code, message: "source offline" },
        },
      });
    }
  });
});

describe("CourtOS 1120 Web-standard production transport", () => {
  it("returns the same contract through a Fetch handler", async () => {
    const handler = createCourtOs1120FetchHandler("council-room", serviceStub());
    const response = await handler(
      new Request("https://example.test/api/council-room/1120?houseId=h1"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { schema_version: "council_room_ready_projection_v1" },
    });
  });

  it("fails closed when the production source binding is not configured", async () => {
    const handler = createCourtOs1120FetchHandler("courtos", () => {
      throw new Error("COURTOS_1120_SQLITE_PATH is required");
    });
    const response = await handler(
      new Request("https://example.test/api/courtos/1120?houseId=h1"),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "COURTOS_READ_MODEL_UNAVAILABLE",
        message: "COURTOS_1120_SQLITE_PATH is required",
      },
    });
  });

  it("rejects non-GET requests before resolving the production source binding", async () => {
    const provider = vi.fn(() => {
      throw new Error("production binding should not be opened");
    });
    const handler = createCourtOs1120FetchHandler("household", provider);
    const response = await handler(
      new Request("https://example.test/api/household/1120", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "GET required." },
    });
    expect(provider).not.toHaveBeenCalled();
  });
});
