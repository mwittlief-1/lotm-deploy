import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  courtOsTimeoutError,
  createCourtOsRequestDeadline,
} from "../../src/ui/courtosRequestDeadline";

import {
  COURTOS_CARTOGRAPHY_THEME_ID,
  COURTOS_CARTOGRAPHY_THEME_SCHEMA,
  COURTOS_CARTOGRAPHY_THEME_VERSION,
  COURTOS_SPATIAL_PROTOCOL_VERSION,
  COURTOS_SPATIAL_SCHEMA,
  isSpatialReadyMessage,
  rendererUrl,
  resolveMapGenBaseUrl,
} from "../../src/ui/spatial/embeddedMapContract";
import { isCourtOsSpatialHouseProjection } from "../../src/ui/spatial/courtosSpatialContract";

describe("CourtOS direct embedded map contract", () => {
  it("bounds every CourtOS browser request with a stable timeout contract", () => {
    vi.useFakeTimers();
    const deadline = createCourtOsRequestDeadline(25);
    expect(deadline.signal.aborted).toBe(false);
    vi.advanceTimersByTime(25);
    expect(deadline.signal.aborted).toBe(true);
    expect(deadline.didTimeOut()).toBe(true);
    expect(courtOsTimeoutError("READ_TIMEOUT", "The record")).toEqual({
      code: "READ_TIMEOUT",
      message: "The record took too long to answer. Try the record again.",
    });
    deadline.clear();
    vi.useRealTimers();
  });

  it("accepts only admitted, non-empty House-scoped spatial payloads", () => {
    expect(
      isCourtOsSpatialHouseProjection({
        schema_version: "courtos_spatial_house_projection_v1",
        effective_date: "1120-01-01",
        read_only: true,
        command_authority: false,
        query: { house_id: "h1" },
        availability: "not_admitted",
        portfolio: null,
      }),
    ).toBe(true);
    expect(
      isCourtOsSpatialHouseProjection({
        schema_version: "courtos_spatial_house_projection_v1",
        effective_date: "1120-01-01",
        read_only: true,
        command_authority: false,
        query: { house_id: "h1" },
        availability: "admitted",
        portfolio: {
          house_id: "h2",
          association_posture: "ui_admitted",
          manors: [{}],
        },
      }),
    ).toBe(false);
  });

  it("opens the admitted renderer directly with an origin-scoped headless contract", () => {
    const url = rendererUrl({
      baseUrl: "http://127.0.0.1:4173/merecross-map-viewer.html",
      rendererKey: "orchardmere_county_v1",
      parentOrigin: "http://127.0.0.1:5174/courtos-home.html",
    });

    expect(url.pathname).toBe("/orchardmere-county-viewer.html");
    expect(url.searchParams.get("embedded")).toBe("1");
    expect(url.searchParams.get("courtos")).toBe("1");
    expect(url.searchParams.get("parentOrigin")).toBe("http://127.0.0.1:5174");
    expect(url.searchParams.get("theme")).toBe(COURTOS_CARTOGRAPHY_THEME_ID);
  });

  it("requires a renderer-scoped readiness response", () => {
    expect(isSpatialReadyMessage({
      type: "merecross:spatial:ready:v1",
      payload: {
        schemaVersion: COURTOS_SPATIAL_SCHEMA,
        protocolVersion: COURTOS_SPATIAL_PROTOCOL_VERSION,
        rendererKey: "merecross_realm_v1",
        themeId: COURTOS_CARTOGRAPHY_THEME_ID,
        themeSchemaVersion: COURTOS_CARTOGRAPHY_THEME_SCHEMA,
        themeVersion: COURTOS_CARTOGRAPHY_THEME_VERSION,
        firstUsableFrame: true,
      },
    })).toBe(true);
    expect(isSpatialReadyMessage({ type: "merecross:spatial:ready:v1", payload: {} })).toBe(false);
    expect(isSpatialReadyMessage({
      type: "merecross:spatial:ready:v1",
      payload: {
        schemaVersion: COURTOS_SPATIAL_SCHEMA,
        protocolVersion: 2,
        rendererKey: "merecross_realm_v1",
        themeId: COURTOS_CARTOGRAPHY_THEME_ID,
        themeSchemaVersion: COURTOS_CARTOGRAPHY_THEME_SCHEMA,
        themeVersion: COURTOS_CARTOGRAPHY_THEME_VERSION,
        firstUsableFrame: true,
      },
    })).toBe(false);
  });

  it("fails closed without explicit MapGen configuration outside development", () => {
    expect(resolveMapGenBaseUrl({ development: false })).toBeNull();
    expect(resolveMapGenBaseUrl({ development: true })).toBe("http://127.0.0.1:4173/");
    expect(resolveMapGenBaseUrl({
      development: false,
      configuredBaseUrl: "https://maps.merecross.example/runtime",
    })).toBe("https://maps.merecross.example/runtime");
  });

  it("keeps candidate manor associations out of the server-only spatial catalog", async () => {
    const projection = JSON.parse(await readFile(
      new URL("../../.courtos-generated/courtos_spatial_read_model_v1.json", import.meta.url),
      "utf8",
    ));
    for (const portfolio of projection.portfolios) {
      expect(portfolio.association_posture).toBe("ui_admitted");
      expect(portfolio.manors.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(projection)).not.toContain("provisional_operator_crosswalk");
    expect(existsSync(new URL("../../public/data/ready/courtos_spatial_read_model_v1.json", import.meta.url))).toBe(false);
  });

  it("contains embedded MapGen frames to the capabilities required by the protocol", async () => {
    const source = await readFile(
      new URL("../../src/ui/spatial/ManorOperationsScene.tsx", import.meta.url),
      "utf8",
    );

    expect(source.match(/sandbox="allow-same-origin allow-scripts"/g)).toHaveLength(2);
    expect(source.match(/referrerPolicy="strict-origin"/g)).toHaveLength(2);
    expect(source).not.toContain("allow-popups");
    expect(source).not.toContain("allow-forms");
    expect(source).not.toContain("allow-top-navigation");
  });
});
