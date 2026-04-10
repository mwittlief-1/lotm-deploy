import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { ManorViewPanel } from "../../src/ui/panels/ManorViewPanel";
import { buildManorViewSurface } from "../../src/ui/worldMapView";

describe("ManorViewPanel", () => {
  it("renders the player tab with nearby-manor routing detail", () => {
    const state = createNewRun("manor_view_panel_player");
    const ctx = proposeTurn(state);
    const surface = buildManorViewSurface(ctx.preview_state, "manor_hx_26597");

    const html = renderToStaticMarkup(<ManorViewPanel initialTab="player" onSelectManor={() => undefined} surface={surface} />);

    expect(html).toContain("Nearby Manors");
    expect(html).toContain("Deterministic world neighbors");
    expect(html).toContain(surface.nearestManors[0]?.manor_label ?? "");
    expect(html).toContain("Rights &amp; Maintenance");
  });

  it("renders the debug tab hex table in projection order", () => {
    const state = createNewRun("manor_view_panel_debug");
    const ctx = proposeTurn(state);
    const surface = buildManorViewSurface(ctx.preview_state, "manor_hx_26597");
    const [firstRow, secondRow] = surface.detail.hex_rows;

    const html = renderToStaticMarkup(<ManorViewPanel initialTab="debug" surface={surface} />);

    expect(html).toContain("Hex Table");
    expect(html).toContain(surface.detail.owner_actor_id);
    expect(html).toContain(firstRow?.hex_id ?? "");
    expect(html).toContain(`${firstRow?.q},${firstRow?.r}`);

    if (firstRow && secondRow) {
      expect(html.indexOf(firstRow.hex_id)).toBeLessThan(html.indexOf(secondRow.hex_id));
    }
  });
});
