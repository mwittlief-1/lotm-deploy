import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { WorldMapScreen } from "../../src/ui/panels/WorldMapScreen";
import { buildExternalMapRendererSurface } from "../../src/ui/worldMapRoute";

describe("WorldMapScreen", () => {
  it("renders the kingdom map, map host, and Manor View for the selected holding route", () => {
    const state = createNewRun("world_map_screen");
    const ctx = proposeTurn(state);
    const surface = buildExternalMapRendererSurface({
      countyId: "c_2",
      holdingId: "church_fief_hx_28841",
      manorId: "manor_hx_26597",
      manorLabel: "Current manor"
    });

    const html = renderToStaticMarkup(
      <WorldMapScreen
        appVersion="v0.3.5"
        onBack={() => undefined}
        onSelectManor={() => undefined}
        previewState={ctx.preview_state}
        surface={surface}
      />
    );

    expect(html).toContain("Kingdom Map");
    expect(html).toContain("Frozen xmap data drives this view end-to-end.");
    expect(html).toContain("Current manor");
    expect(html).toContain("Manor View v0");
    expect(html).toContain("Player tab");
    expect(html).toContain("Show debug overlay");
    expect(html).toContain('data-external-map-renderer-host="world-map-renderer-host"');
    expect(html).toContain('data-world-map-canvas="xmap_alpha_v1"');
    expect(html).toContain('data-manor-view="manor_hx_26597"');
  });
});
