import { describe, expect, it } from "vitest";

import {
  CANONICAL_NUMERIC_DISTANCE_METRIC,
  WORLD_SCOPE_CAP_TABLE_SCHEMA_VERSION,
  classifyWorldScopeBucket,
  createWorldDomain,
  evaluateWorldScopeCaps,
  evaluateWorldScopeCapsForAnchor,
  getBundledWorldImportSurface,
  getWorldScopeCapBucketOrder,
  getWorldScopeCapLimit,
  getWorldScopeCapTable,
  listWorldScopeCandidatesForAnchor,
  normalizeWorldScopeCapTierKey,
  type WorldScopeCapBucketV1,
  type WorldScopeCapCandidateV1
} from "../../src/sim/domains/world";

function makeCandidates(prefix: string, count: number, bucket: WorldScopeCapBucketV1): WorldScopeCapCandidateV1[] {
  return Array.from({ length: count }, (_, index) => ({
    stable_id: `${prefix}_${String(index + 1).padStart(3, "0")}`,
    bucket
  }));
}

function admittedCountsByBucket(candidates: ReturnType<typeof evaluateWorldScopeCaps>): Record<string, number> {
  return candidates.decisions
    .filter((decision) => decision.admitted)
    .reduce<Record<string, number>>((counts, decision) => {
      counts[decision.bucket] = (counts[decision.bucket] ?? 0) + 1;
      return counts;
    }, {});
}

function createWorldFixtureWithFarThreshold(farThreshold: number | null) {
  const importSurface = structuredClone(getBundledWorldImportSurface());
  importSurface.manifest.distance_metrics.far_threshold_default = farThreshold;
  importSurface.world_topology.distance_metrics.far_threshold_default = farThreshold;
  return createWorldDomain(importSurface);
}

describe("world scope caps", () => {
  it("exposes a stable cap-table contract with canonical bucket order and tier fallbacks", () => {
    const table = getWorldScopeCapTable();

    expect(table.schema_version).toBe(WORLD_SCOPE_CAP_TABLE_SCHEMA_VERSION);
    expect(table.canonical_numeric_distance).toBe(CANONICAL_NUMERIC_DISTANCE_METRIC);
    expect(table.bucket_order).toEqual(["kinship", "territorial_adjacent", "route_adjacent", "near", "far"]);
    expect(getWorldScopeCapBucketOrder()).toEqual(table.bucket_order);
    expect(table.rows.map((row) => row.tier_key)).toEqual([
      "king",
      "count",
      "baron",
      "knight",
      "bishop",
      "abbot",
      "unknown"
    ]);

    expect(normalizeWorldScopeCapTierKey(" Knight ")).toBe("knight");
    expect(normalizeWorldScopeCapTierKey("earl")).toBe("count");
    expect(normalizeWorldScopeCapTierKey("mystery")).toBe("unknown");
    expect(getWorldScopeCapLimit("Knight", "far")).toBe(160);
    expect(getWorldScopeCapLimit("mystery", "far")).toBe(160);
    expect(getWorldScopeCapLimit("Count", "near")).toBe(184);
  });

  it("applies cumulative bucket caps in deterministic bucket-and-id order", () => {
    const evaluation = evaluateWorldScopeCaps("Knight", [
      ...makeCandidates("far", 70, "far"),
      ...makeCandidates("near", 50, "near"),
      ...makeCandidates("route", 30, "route_adjacent"),
      ...makeCandidates("territorial", 30, "territorial_adjacent"),
      ...makeCandidates("kinship", 30, "kinship")
    ]);

    expect(evaluation.source_tier).toBe("knight");
    expect(evaluation.admitted_ids).toHaveLength(160);
    expect(evaluation.rejected_ids).toHaveLength(50);
    expect(admittedCountsByBucket(evaluation)).toEqual({
      kinship: 24,
      territorial_adjacent: 24,
      route_adjacent: 24,
      near: 40,
      far: 48
    });
    expect(evaluation.decisions[0]).toMatchObject({
      stable_id: "kinship_001",
      bucket: "kinship",
      bucket_rank: 0,
      bucket_limit: 24,
      admitted: true,
      admitted_total: 1
    });
    expect(evaluation.decisions.at(-1)).toMatchObject({
      stable_id: "far_070",
      bucket: "far",
      bucket_rank: 4,
      bucket_limit: 160,
      admitted: false,
      admitted_total: 160
    });
  });

  it("deduplicates candidates by keeping the closest bucket before evaluation", () => {
    const evaluation = evaluateWorldScopeCaps("Knight", [
      { stable_id: "h_002", bucket: "near" },
      { stable_id: "h_001", bucket: "far" },
      { stable_id: "h_001", bucket: "territorial_adjacent" },
      { stable_id: "h_003", bucket: "route_adjacent" },
      { stable_id: "h_002", bucket: "kinship" }
    ]);

    expect(evaluation.decisions).toEqual([
      {
        stable_id: "h_002",
        bucket: "kinship",
        bucket_rank: 0,
        bucket_limit: 24,
        admitted: true,
        admitted_total: 1
      },
      {
        stable_id: "h_001",
        bucket: "territorial_adjacent",
        bucket_rank: 1,
        bucket_limit: 48,
        admitted: true,
        admitted_total: 2
      },
      {
        stable_id: "h_003",
        bucket: "route_adjacent",
        bucket_rank: 2,
        bucket_limit: 72,
        admitted: true,
        admitted_total: 3
      }
    ]);
    expect(evaluation.admitted_ids).toEqual(["h_002", "h_001", "h_003"]);
    expect(evaluation.rejected_ids).toEqual([]);
  });

  it("widens the same scope buckets deterministically for higher tiers", () => {
    const candidatePool = [
      ...makeCandidates("far", 300, "far"),
      ...makeCandidates("near", 200, "near"),
      ...makeCandidates("route", 80, "route_adjacent"),
      ...makeCandidates("territorial", 80, "territorial_adjacent"),
      ...makeCandidates("kinship", 80, "kinship")
    ];

    const knight = evaluateWorldScopeCaps("Knight", candidatePool);
    const count = evaluateWorldScopeCaps("Count", candidatePool);
    const king = evaluateWorldScopeCaps("King", candidatePool);

    expect(knight.admitted_ids).toHaveLength(160);
    expect(count.admitted_ids).toHaveLength(256);
    expect(king.admitted_ids).toHaveLength(320);
    expect(admittedCountsByBucket(knight)).toEqual({
      kinship: 24,
      territorial_adjacent: 24,
      route_adjacent: 24,
      near: 40,
      far: 48
    });
    expect(admittedCountsByBucket(count)).toEqual({
      kinship: 40,
      territorial_adjacent: 40,
      route_adjacent: 40,
      near: 64,
      far: 72
    });
    expect(admittedCountsByBucket(king)).toEqual({
      kinship: 48,
      territorial_adjacent: 48,
      route_adjacent: 48,
      near: 72,
      far: 104
    });
  });

  it("classifies topology-backed scope buckets with kinship, adjacency, and near/far precedence", () => {
    const world = createWorldFixtureWithFarThreshold(50);
    const anchor = "manor_hx_27972";

    expect(classifyWorldScopeBucket(world, anchor, anchor)).toBeNull();
    expect(classifyWorldScopeBucket(world, anchor, "manor_hx_29096")).toBe("route_adjacent");
    expect(classifyWorldScopeBucket(world, anchor, "manor_hx_28538")).toBe("near");
    expect(classifyWorldScopeBucket(world, anchor, "manor_hx_26597")).toBe("far");
    expect(classifyWorldScopeBucket(world, anchor, "manor_hx_29096", { kinship_manor_ids: ["manor_hx_29096"] })).toBe(
      "kinship"
    );
  });

  it("builds deterministic fixed-fixture scope candidates and evaluates them through the cap table", () => {
    const world = createWorldFixtureWithFarThreshold(50);
    const anchor = "manor_hx_27972";
    const options = {
      candidate_manor_ids: ["manor_hx_26597", "manor_hx_29096", "manor_hx_28538", anchor],
      kinship_manor_ids: ["manor_hx_29096"]
    };

    const candidates = listWorldScopeCandidatesForAnchor(world, anchor, options);
    const evaluation = evaluateWorldScopeCapsForAnchor(world, anchor, "Knight", options);

    expect(candidates).toEqual([
      {
        manor_id: "manor_hx_29096",
        stable_id: "manor_hx_29096",
        bucket: "kinship",
        travel_cost_distance: 5.536,
        route_hop_distance: 1,
        distance_band: "near",
        territorial_adjacent: false,
        route_adjacent: true
      },
      {
        manor_id: "manor_hx_28538",
        stable_id: "manor_hx_28538",
        bucket: "near",
        travel_cost_distance: 8.304,
        route_hop_distance: 2,
        distance_band: "near",
        territorial_adjacent: false,
        route_adjacent: false
      },
      {
        manor_id: "manor_hx_26597",
        stable_id: "manor_hx_26597",
        bucket: "far",
        travel_cost_distance: 134.378,
        route_hop_distance: 5,
        distance_band: "far",
        territorial_adjacent: false,
        route_adjacent: false
      }
    ]);

    expect(evaluation.anchor_manor_id).toBe(anchor);
    expect(evaluation.far_threshold).toBe(50);
    expect(evaluation.candidates).toEqual(candidates);
    expect(evaluation.cap_evaluation.admitted_ids).toEqual([
      "manor_hx_29096",
      "manor_hx_28538",
      "manor_hx_26597"
    ]);
    expect(evaluation.cap_evaluation.rejected_ids).toEqual([]);
  });
});
