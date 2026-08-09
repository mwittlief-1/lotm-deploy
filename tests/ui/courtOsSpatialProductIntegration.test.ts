import { readFile } from "node:fs/promises";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CourtOsShellRuntimeModel } from "../../src/ui/courtosShellModel";
import {
  canUseNativeSpatialVisual,
  embeddedSpatialFramePlan,
  EstateHoldingsScene,
} from "../../src/ui/spatial/ManorOperationsScene";
import type { CourtOsSpatialPortfolio } from "../../src/ui/spatial/courtosSpatialClient";

const projectionPath = new URL(
  "../../.courtos-generated/courtos_spatial_read_model_v1.json",
  import.meta.url,
);

describe("CourtOS spatial product integration", () => {
  it("selects the native cached 3D renderer through the actual Estate room path", async () => {
    const source = JSON.parse(await readFile(projectionPath, "utf8")) as {
      effective_date: string;
      portfolios: CourtOsSpatialPortfolio[];
    };
    const portfolio = source.portfolios.find((item) => item.house_name === "House Pearwick Hall");
    const roadcote = portfolio?.manors.find((item) => item.manor_id === "manor_hx_44835");
    expect(portfolio).toBeDefined();
    expect(roadcote).toBeDefined();
    expect(canUseNativeSpatialVisual(roadcote ?? null)).toBe(true);

    const model = {
      house: { houseId: portfolio!.house_id, entityId: portfolio!.house_id, displayName: portfolio!.house_name },
      effectiveDate: source.effective_date,
    } as unknown as CourtOsShellRuntimeModel;
    const html = renderToStaticMarkup(React.createElement(EstateHoldingsScene, {
      model,
      spatialState: {
        status: "ready",
        context: {} as never,
        portfolio: portfolio!,
        effectiveDate: source.effective_date,
      },
      selectedManorId: roadcote!.manor_id,
      onOpenManorStewardship: () => undefined,
    }));

    expect(html).toContain("uat-spatial-webgl-surface");
    expect(html).toContain("Building the three-dimensional ground survey");
    expect(html).not.toContain("<iframe");
  });

  it("fails the native capability gate closed for incomplete or malformed derivations", async () => {
    const source = JSON.parse(await readFile(projectionPath, "utf8")) as {
      portfolios: CourtOsSpatialPortfolio[];
    };
    const roadcote = source.portfolios.flatMap((item) => item.manors)
      .find((item) => item.manor_id === "manor_hx_44835")!;

    expect(canUseNativeSpatialVisual({
      ...roadcote,
      visual_derivation: {
        ...roadcote.visual_derivation!,
        source_sha256: "not-a-source-digest",
      },
    })).toBe(false);
    expect(canUseNativeSpatialVisual({
      ...roadcote,
      visual_derivation: {
        ...roadcote.visual_derivation!,
        available_lods: ["xmap_hex", "parcel_cluster"],
      },
    })).toBe(false);
  });

  it("promotes the already-warmed iframe key without reconstructing its URL", () => {
    const realm = "https://maps.example/realm?theme=courtos";
    const county = "https://maps.example/county?theme=courtos";
    const warming = embeddedSpatialFramePlan({
      currentSrc: realm,
      currentLevel: "realm",
      incomingSrc: county,
      incomingLevel: "county",
    });
    const promoted = embeddedSpatialFramePlan({
      currentSrc: county,
      currentLevel: "county",
      incomingSrc: null,
      incomingLevel: null,
    });

    expect(warming).toEqual([
      { key: realm, role: "current", level: "realm", src: realm },
      { key: county, role: "incoming", level: "county", src: county },
    ]);
    expect(promoted).toEqual([
      { key: county, role: "current", level: "county", src: county },
    ]);
    expect(promoted[0]?.key).toBe(warming[1]?.key);
  });
});
