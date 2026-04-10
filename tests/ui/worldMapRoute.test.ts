import { describe, expect, it } from "vitest";

import { buildAppRouteHash, buildExternalMapRendererSurface, readAppRouteState } from "../../src/ui/worldMapRoute";

describe("worldMapRoute", () => {
  it("round-trips the explicit map route hash with a selected manor target", () => {
    const hash = buildAppRouteHash("map", {
      countyId: "c_2",
      holdingId: "holding_hx_26597",
      manorId: "manor_hx_26597",
      manorLabel: "Current manor"
    });

    expect(hash).toBe("#/map?manor_id=manor_hx_26597");
    expect(readAppRouteState(hash)).toEqual({
      screen: "map",
      target_manor_id: "manor_hx_26597"
    });
  });

  it("builds a deterministic renderer surface from the frozen xmap bundle", () => {
    const surfaceA = buildExternalMapRendererSurface({
      countyId: "c_2",
      holdingId: "holding_hx_26597",
      manorId: "manor_hx_26597",
      manorLabel: "Current manor"
    });
    const surfaceB = buildExternalMapRendererSurface({
      countyId: "c_2",
      holdingId: "holding_hx_26597",
      manorId: "manor_hx_26597",
      manorLabel: "Current manor"
    });

    expect(surfaceA).toEqual(surfaceB);
    expect(surfaceA).toMatchObject({
      schema_version: "external_map_renderer_surface_v1",
      map_bundle_id: "xmap_alpha_v1",
      renderer_host_id: "world-map-renderer-host",
      manor_count: 387,
      route_edge_count: 996,
      target: {
        manor_id: "manor_hx_26597",
        holding_id: "holding_hx_26597",
        county_id: "c_2"
      }
    });
  });
});
