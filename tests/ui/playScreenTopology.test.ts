import { describe, expect, it } from "vitest";

import { buildTopologyDebugSurface } from "../../src/ui/playScreenTopology";

describe("playScreenTopology", () => {
  it("returns null when the bounded world topology snapshot is absent", () => {
    expect(buildTopologyDebugSurface({})).toBeNull();
  });

  it("normalizes raw distance samples and the far threshold for debug rendering", () => {
    const surface = buildTopologyDebugSurface({
      world_topology_view: {
        schema_version: "world_topology_snapshot_v1",
        anchor_manor_id: "manor_hx_26597",
        anchor_holding_id: "holding_001",
        anchor_county_id: "county_001",
        canonical_numeric_distance: "travel_cost_distance",
        companion_metric: "route_hop_distance",
        far_threshold: 50,
        distance_sample_limit: 8,
        distance_sample_total: 387,
        territorial_neighbors: [],
        route_neighbors: [],
        distance_samples: [
          {
            to_manor_id: "manor_hx_28840",
            travel_cost_distance: 17.66,
            route_hop_distance: 1,
            distance_band: "near"
          },
          {
            to_manor_id: "manor_hx_30535",
            travel_cost_distance: 50.064,
            route_hop_distance: 1,
            distance_band: "far"
          }
        ]
      }
    });

    expect(surface).toEqual({
      anchorManorId: "manor_hx_26597",
      anchorHoldingId: "holding_001",
      anchorCountyId: "county_001",
      rawMetric: "travel_cost_distance",
      companionMetric: "route_hop_distance",
      farThreshold: "50",
      sampleSummary: "Showing 2 of 387 sampled distances.",
      samples: [
        {
          toManorId: "manor_hx_28840",
          rawDistance: "17.66",
          routeHops: "1",
          distanceBand: "near"
        },
        {
          toManorId: "manor_hx_30535",
          rawDistance: "50.064",
          routeHops: "1",
          distanceBand: "far"
        }
      ]
    });
  });
});
