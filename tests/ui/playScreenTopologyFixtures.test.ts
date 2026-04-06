import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildTopologyDebugSurface } from "../../src/ui/playScreenTopology";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

function readJsonFixture<T>(name: string): T {
  return JSON.parse(readFixture(name)) as T;
}

function buildTierScopeDebugFixture(): string {
  const worldTopologyView = readJsonFixture<Record<string, unknown>>("world_topology_snapshot_v0.3.1.json");
  const surface = buildTopologyDebugSurface({
    player_house_id: "h_player",
    houses: {
      h_player: {
        tier: "Knight"
      }
    },
    world_topology_view: worldTopologyView
  });

  if (!surface) {
    throw new Error("expected a bounded topology debug surface from the canonical world topology fixture");
  }

  return `${JSON.stringify(surface, null, 2)}\n`;
}

describe("playScreenTopology fixtures", () => {
  it("matches the deterministic tier-scope debug fixture built from the bounded topology snapshot", () => {
    const expected = readFixture("tier_scope_debug_surface_v0.3.2.json");

    expect(buildTierScopeDebugFixture()).toBe(expected);
    expect(buildTierScopeDebugFixture()).toBe(buildTierScopeDebugFixture());
  });

  it("keeps the tier-scope debug fixture bounded and field-stable for review", () => {
    const snapshot = readJsonFixture<Record<string, unknown>>("tier_scope_debug_surface_v0.3.2.json");
    const scopeCaps = snapshot.scopeCaps as Record<string, unknown>;
    const bucketSummaries = scopeCaps.bucketSummaries as Array<Record<string, unknown>>;
    const sampleRows = scopeCaps.sampleRows as Array<Record<string, unknown>>;
    const samples = snapshot.samples as Array<Record<string, unknown>>;

    expect(Object.keys(snapshot)).toEqual([
      "anchorManorId",
      "anchorHoldingId",
      "anchorCountyId",
      "rawMetric",
      "companionMetric",
      "farThreshold",
      "sampleSummary",
      "samples",
      "scopeCaps"
    ]);
    expect(Object.keys(scopeCaps)).toEqual([
      "admittedCount",
      "bucketSummaries",
      "candidateCount",
      "farThreshold",
      "kinshipJoinSummary",
      "metricLabel",
      "rejectedCount",
      "sampleRows",
      "sourceTier",
      "tierLabel"
    ]);
    expect(samples).toHaveLength(8);
    expect(bucketSummaries).toHaveLength(5);
    expect(sampleRows).toHaveLength(7);
    expect(scopeCaps.candidateCount).toBe(386);
    expect(scopeCaps.admittedCount).toBe(160);
    expect(scopeCaps.rejectedCount).toBe(226);
    expect(bucketSummaries.map((entry) => entry.bucketId)).toEqual([
      "kinship",
      "territorial_adjacent",
      "route_adjacent",
      "near",
      "far"
    ]);

    for (const sample of samples) {
      expect(Object.keys(sample)).toEqual(["toManorId", "rawDistance", "routeHops", "distanceBand"]);
    }
    for (const summary of bucketSummaries) {
      expect(Object.keys(summary)).toEqual(["admittedCount", "bucketId", "cumulativeLimit", "label", "rejectedCount"]);
    }
    for (const row of sampleRows) {
      expect(Object.keys(row)).toEqual([
        "bucketLabel",
        "distanceBand",
        "manorId",
        "rationale",
        "rawDistance",
        "routeHops",
        "statusLabel"
      ]);
    }
  });
});
