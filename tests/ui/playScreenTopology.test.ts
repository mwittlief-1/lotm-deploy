import { describe, expect, it } from "vitest";

import { buildTopologyDebugSurface } from "../../src/ui/playScreenTopology";

describe("playScreenTopology", () => {
  it("returns null when the bounded world topology snapshot is absent", () => {
    expect(buildTopologyDebugSurface({})).toBeNull();
  });

  it("normalizes raw distance samples and the far threshold for debug rendering", () => {
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

    expect(surface).toMatchObject({
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
      ],
      scopeCaps: {
        tierLabel: "Knight",
        sourceTier: "knight",
        metricLabel: "travel_cost_distance",
        farThreshold: "50",
        candidateCount: 386,
        admittedCount: 160,
        rejectedCount: 226,
        bucketSummaries: [
          {
            bucketId: "kinship",
            label: "Kinship",
            cumulativeLimit: "24",
            admittedCount: 0,
            rejectedCount: 0
          },
          {
            bucketId: "territorial_adjacent",
            label: "Territorial Adjacent",
            cumulativeLimit: "48",
            admittedCount: 6,
            rejectedCount: 0
          },
          {
            bucketId: "route_adjacent",
            label: "Route Adjacent",
            cumulativeLimit: "72",
            admittedCount: 0,
            rejectedCount: 0
          },
          {
            bucketId: "near",
            label: "Near",
            cumulativeLimit: "112",
            admittedCount: 1,
            rejectedCount: 0
          },
          {
            bucketId: "far",
            label: "Far",
            cumulativeLimit: "160",
            admittedCount: 153,
            rejectedCount: 226
          }
        ],
        sampleRows: [
          {
            manorId: "manor_hx_28840",
            bucketLabel: "Territorial Adjacent",
            rawDistance: "17.66",
            routeHops: "1",
            distanceBand: "near",
            statusLabel: "Admitted",
            rationale:
              "Territorial adjacency outranks route adjacency and the near/far distance band. Admitted at 1 of the 48 cumulative-house limit."
          },
          {
            manorId: "manor_hx_28841",
            bucketLabel: "Territorial Adjacent",
            rawDistance: "18.2",
            routeHops: "1",
            distanceBand: "near",
            statusLabel: "Admitted",
            rationale:
              "Territorial adjacency outranks route adjacency and the near/far distance band. Admitted at 2 of the 48 cumulative-house limit."
          },
          {
            manorId: "manor_hx_29126",
            bucketLabel: "Territorial Adjacent",
            rawDistance: "33.73",
            routeHops: "1",
            distanceBand: "near",
            statusLabel: "Admitted",
            rationale:
              "Territorial adjacency outranks route adjacency and the near/far distance band. Admitted at 3 of the 48 cumulative-house limit."
          },
          {
            manorId: "manor_hx_30535",
            bucketLabel: "Territorial Adjacent",
            rawDistance: "50.064",
            routeHops: "1",
            distanceBand: "far",
            statusLabel: "Admitted",
            rationale:
              "Territorial adjacency outranks route adjacency and the near/far distance band. Admitted at 4 of the 48 cumulative-house limit."
          },
          {
            manorId: "manor_hx_39261",
            bucketLabel: "Far",
            rawDistance: "123.112",
            routeHops: "12",
            distanceBand: "far",
            statusLabel: "Outside cap",
            rationale: "At or beyond the travel_cost_distance far threshold (50). Excluded once the Far cap held at 160 total houses."
          },
          {
            manorId: "manor_hx_39442",
            bucketLabel: "Far",
            rawDistance: "209.164",
            routeHops: "10",
            distanceBand: "far",
            statusLabel: "Outside cap",
            rationale: "At or beyond the travel_cost_distance far threshold (50). Excluded once the Far cap held at 160 total houses."
          },
          {
            manorId: "manor_hx_39462",
            bucketLabel: "Far",
            rawDistance: "128.804",
            routeHops: "9",
            distanceBand: "far",
            statusLabel: "Outside cap",
            rationale: "At or beyond the travel_cost_distance far threshold (50). Excluded once the Far cap held at 160 total houses."
          }
        ],
        kinshipJoinSummary:
          "Kinship remains part of the cap table, but this bounded debug surface cannot join known-house ties onto world manor ids yet, so kinship stays rule-only here."
      }
    });
  });
});
