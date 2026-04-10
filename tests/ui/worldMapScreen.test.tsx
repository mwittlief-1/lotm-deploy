import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WorldMapScreen } from "../../src/ui/panels/WorldMapScreen";
import { buildExternalMapRendererSurface } from "../../src/ui/worldMapRoute";

describe("WorldMapScreen", () => {
  it("renders the renderer host and frozen bundle summary for the selected holding route", () => {
    const surface = buildExternalMapRendererSurface({
      countyId: "c_2",
      holdingId: "holding_hx_26597",
      manorId: "manor_hx_26597",
      manorLabel: "Current manor"
    });

    const html = renderToStaticMarkup(
      <WorldMapScreen appVersion="v0.3.4" onBack={() => undefined} surface={surface} />
    );

    expect(html).toContain("World Map Preview");
    expect(html).toContain("External renderer seam is attached to the frozen xmap_alpha_v1 bundle.");
    expect(html).toContain("Current manor");
    expect(html).toContain("387 manors");
    expect(html).toContain("996 route edges");
    expect(html).toContain('data-external-map-renderer-host="world-map-renderer-host"');
  });
});
