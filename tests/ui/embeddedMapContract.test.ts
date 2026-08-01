import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

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

describe("CourtOS direct embedded map contract", () => {
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

  it("retains provisional associations only when no UI-admitted associations exist", async () => {
    const projection = JSON.parse(await readFile(
      new URL("../../public/data/ready/courtos_spatial_read_model_v1.json", import.meta.url),
      "utf8",
    ));
    for (const portfolio of projection.portfolios) {
      if (portfolio.association_posture === "ui_admitted") {
        expect(portfolio.manors.every((manor: { ui_authority: boolean }) => manor.ui_authority)).toBe(true);
      } else {
        expect(portfolio.association_posture).toBe("provisional_operator_crosswalk");
        expect(portfolio.association_note).toContain("not an assignment or tenure lock");
        expect(portfolio.manors.every((manor: { ui_authority: boolean }) => !manor.ui_authority)).toBe(true);
      }
    }
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
