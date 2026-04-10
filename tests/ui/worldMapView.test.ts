import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildManorViewSurface, buildWorldMapScreenSurface } from "../../src/ui/worldMapView";
import { buildExternalMapRendererSurface } from "../../src/ui/worldMapRoute";

describe("worldMapView", () => {
  it("builds deterministic markers and manor-id-sorted debug rows from the accepted world seams", () => {
    const state = createNewRun("world_map_view_surface");
    const ctx = proposeTurn(state);
    const surface = buildWorldMapScreenSurface(
      ctx.preview_state,
      buildExternalMapRendererSurface({
        countyId: "c_2",
        holdingId: "church_fief_hx_28841",
        manorId: "manor_hx_26597",
        manorLabel: "Current manor"
      })
    );

    expect(surface.markerCount).toBeGreaterThan(300);
    expect(surface.playerHoldingManorIds).toEqual(["manor_hx_26597", "manor_hx_28841"]);
    expect(surface.liegeSeatManorId).toBeTruthy();

    const debugIds = surface.debugRows.map((row) => row.manorId);
    expect(debugIds).toEqual([...debugIds].sort());
    expect(surface.markers.find((marker) => marker.manorId === surface.selectedManorId)?.isSelected).toBe(true);
  });

  it("builds world detail for routed manors while keeping maintenance anchored to the current manor read model", () => {
    const state = createNewRun("world_map_manor_view");
    const ctx = proposeTurn(state);

    const anchorSurface = buildManorViewSurface(ctx.preview_state, "manor_hx_26597");
    expect(anchorSurface.detail.manor_id).toBe("manor_hx_26597");
    expect(anchorSurface.detail.hex_rows.length).toBeGreaterThan(0);
    expect(anchorSurface.nearestManors.length).toBeGreaterThan(0);
    expect(anchorSurface.maintenanceSummary).not.toBeNull();
    expect(anchorSurface.maintenanceSummary?.right_entries.length).toBeGreaterThan(0);

    const routedSurface = buildManorViewSurface(ctx.preview_state, "manor_hx_28840");
    expect(routedSurface.detail.manor_id).toBe("manor_hx_28840");
    expect(routedSurface.detail.hex_rows.length).toBeGreaterThan(0);
    expect(routedSurface.maintenanceSummary).toBeNull();
  });
});
