import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TopologyDebugPanel } from "../../src/ui/panels/TopologyDebugPanel";
import { buildTopologyDebugSurface } from "../../src/ui/playScreenTopology";

describe("TopologyDebugPanel", () => {
  it("renders the topology debug surface when bounded snapshot data is present", () => {
    const surface = buildTopologyDebugSurface({
      player_house_id: "h_player",
      houses: {
        h_player: {
          tier: "Knight"
        }
      },
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
            to_manor_id: "manor_hx_30535",
            travel_cost_distance: 50.064,
            route_hop_distance: 1,
            distance_band: "far"
          }
        ]
      }
    });

    const markup = renderToStaticMarkup(
      <TopologyDebugPanel
        description="Bounded world snapshot fields stay visible here so raw distance values, far-threshold inputs, and scope-cap rationale can be audited in the UI."
        surface={surface}
        title="Topology distances & scope caps"
      />
    );

    expect(markup).toContain("Topology distances &amp; scope caps");
    expect(markup).toContain("Far threshold");
    expect(markup).toContain("50.064");
    expect(markup).toContain("travel_cost_distance");
    expect(markup).toContain("route_hop_distance");
    expect(markup).toContain("manor_hx_30535");
    expect(markup).toContain("Scope cap row");
    expect(markup).toContain("knight");
    expect(markup).toContain("Cap 160");
    expect(markup).toContain("Outside cap");
    expect(markup).toContain("manor_hx_39261");
  });

  it("renders nothing when no topology debug surface is available", () => {
    const markup = renderToStaticMarkup(
      <TopologyDebugPanel
        description="Bounded world snapshot fields stay visible here so raw distance values, far-threshold inputs, and scope-cap rationale can be audited in the UI."
        surface={buildTopologyDebugSurface({})}
        title="Topology distances & scope caps"
      />
    );

    expect(markup).toBe("");
  });
});
