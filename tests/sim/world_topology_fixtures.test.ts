import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  WORLD_TOPOLOGY_SNAPSHOT_SCHEMA_VERSION,
  buildBoundedWorldTopologyView,
  createWorldDomain,
  getBundledWorldImportSurface
} from "../../src/sim/domains/world";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

function buildWorldTopologyFixture(): string {
  const importSurface = structuredClone(getBundledWorldImportSurface());
  importSurface.manifest.distance_metrics.far_threshold_default = 50;
  importSurface.world_topology.distance_metrics.far_threshold_default = 50;
  const world = createWorldDomain(importSurface);
  return `${JSON.stringify(buildBoundedWorldTopologyView(world), null, 2)}\n`;
}

describe("world topology fixtures", () => {
  it("matches the deterministic bounded topology fixture with an opted-in far threshold", () => {
    const expected = readFixture("world_topology_snapshot_v0.3.1.json");

    expect(buildWorldTopologyFixture()).toBe(expected);
    expect(buildWorldTopologyFixture()).toBe(buildWorldTopologyFixture());
  });

  it("keeps the topology fixture bounded and field-stable for review", () => {
    const snapshot = JSON.parse(readFixture("world_topology_snapshot_v0.3.1.json")) as Record<string, unknown>;

    expect(snapshot.schema_version).toBe(WORLD_TOPOLOGY_SNAPSHOT_SCHEMA_VERSION);
    expect(Object.keys(snapshot)).toEqual([
      "schema_version",
      "anchor_manor_id",
      "anchor_holding_id",
      "anchor_county_id",
      "canonical_numeric_distance",
      "companion_metric",
      "far_threshold",
      "distance_sample_limit",
      "distance_sample_total",
      "territorial_neighbors",
      "route_neighbors",
      "distance_samples"
    ]);
    expect((snapshot.territorial_neighbors as unknown[]).length).toBe(6);
    expect((snapshot.route_neighbors as unknown[]).length).toBe(6);
    expect((snapshot.distance_samples as unknown[]).length).toBe(8);

    for (const neighbor of snapshot.territorial_neighbors as Array<Record<string, unknown>>) {
      expect(Object.keys(neighbor)).toEqual(["manor_id", "shared_border_sides"]);
    }
    for (const neighbor of snapshot.route_neighbors as Array<Record<string, unknown>>) {
      expect(Object.keys(neighbor)).toEqual(["edge_id", "manor_id", "travel_cost"]);
    }
    for (const sample of snapshot.distance_samples as Array<Record<string, unknown>>) {
      expect(Object.keys(sample)).toEqual([
        "to_manor_id",
        "travel_cost_distance",
        "route_hop_distance",
        "distance_band"
      ]);
    }
  });
});
