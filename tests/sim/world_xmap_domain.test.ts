import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CANONICAL_NUMERIC_DISTANCE_METRIC,
  HOLDING_FABRIC_LEGAL_RULE_VERSION,
  ROUTE_HOP_DISTANCE_METRIC,
  WORLD_DOMAIN_SCHEMA_VERSION,
  getArchbishopricForManor,
  getBishopricForManor,
  getBundledWorldImportSurface,
  getCountyForManor,
  getHoldingById,
  getHoldingImmediateLordActorId,
  getHoldingSuperiorLordActorId,
  getManorAssignment,
  getManorById,
  getManorImmediateLordActorId,
  getManorSuperiorLordActorId,
  getNumericDistanceMetrics,
  getRouteAdjacency,
  getRouteEdgeById,
  getTerritorialAdjacency,
  getTravelCostDistance,
  loadBundledWorldDomain
} from "../../src/sim/domains/world";

function sha256ForFile(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

describe("xmap world domain", () => {
  it("loads the frozen xmap snapshot with the expected current-world counts", () => {
    const world = loadBundledWorldDomain();

    expect(world.schema_version).toBe(WORLD_DOMAIN_SCHEMA_VERSION);
    expect(world.manors).toHaveLength(387);
    expect(world.holdings).toHaveLength(121);
    expect(world.counties).toHaveLength(15);
    expect(world.bishoprics).toHaveLength(8);
    expect(world.archbishoprics).toHaveLength(2);
    expect(world.manor_assignments).toHaveLength(387);
    expect(world.world_topology.manor_ids).toHaveLength(387);
    expect(world.world_topology.distance_metrics.canonical_numeric_distance).toBe(CANONICAL_NUMERIC_DISTANCE_METRIC);
    expect(world.world_topology.distance_metrics.companion_metric).toBe(ROUTE_HOP_DISTANCE_METRIC);
    expect(world.holding_fabric.legal_rule_version).toBe(HOLDING_FABRIC_LEGAL_RULE_VERSION);
  });

  it("freezes the vendored primary files against the manifest and config hash", () => {
    const world = loadBundledWorldDomain();
    const root = path.resolve("data/map/xmap_alpha_v1");
    const primary = world.manifest.public_artifacts.primary;
    const importSurface = getBundledWorldImportSurface();

    expect(sha256ForFile(path.join(root, "map_v1_config.json"))).toBe(world.manifest.config_sha256);

    expect(sha256ForFile(path.join(root, primary.manor_units.filename))).toBe(primary.manor_units.sha256);
    expect(sha256ForFile(path.join(root, primary.holding_fabric.filename))).toBe(primary.holding_fabric.sha256);
    expect(sha256ForFile(path.join(root, primary.world_topology.filename))).toBe(primary.world_topology.sha256);

    expect(importSurface.manor_units.config_sha256).toBe(world.manifest.config_sha256);
    expect(importSurface.holding_fabric.config_sha256).toBe(world.manifest.config_sha256);
    expect(importSurface.world_topology.config_sha256).toBe(world.manifest.config_sha256);
  });

  it("supports manor, holding, lordship, and overlay lookups without flattening overlay semantics", () => {
    const world = loadBundledWorldDomain();
    const manor = getManorById(world, "manor_hx_26597");
    const holding = getHoldingById(world, "church_fief_hx_28841");
    const assignment = getManorAssignment(world, "manor_hx_26597");
    const county = getCountyForManor(world, "manor_hx_26597");
    const bishopric = getBishopricForManor(world, "manor_hx_26597");
    const archbishopric = getArchbishopricForManor(world, "manor_hx_26597");

    expect(manor?.holding_id).toBe("church_fief_hx_28841");
    expect(manor?.holder_actor_id).toBe("actor_abbey_hx_28841");
    expect(manor?.tenure_basis).toBe("church_temporalities");
    expect(manor?.service_basis).toContain("servitium_regis");
    expect(assignment?.holding_id).toBe("church_fief_hx_28841");

    expect(holding?.holding_type).toBe("church_fief");
    expect(holding?.manor_ids).toContain("manor_hx_26597");
    expect(holding?.franchise_bundle.market_right).toBe("by_grant_only");
    expect(getManorImmediateLordActorId(world, "manor_hx_26597")).toBe("actor_abbey_hx_28841");
    expect(getManorSuperiorLordActorId(world, "manor_hx_26597")).toBe("actor_crown");
    expect(getHoldingImmediateLordActorId(world, "church_fief_hx_28841")).toBe("actor_abbey_hx_28841");
    expect(getHoldingSuperiorLordActorId(world, "church_fief_hx_28841")).toBe("actor_crown");

    expect(county?.county_id).toBe("c_2");
    expect(county?.controls_jurisdiction).toBe(true);
    expect(county?.controls_ownership).toBe(false);

    expect(bishopric?.bishopric_id).toBe("bishopric_hx_31094");
    expect(bishopric?.controls_jurisdiction).toBe(true);
    expect(bishopric?.controls_ownership).toBe(false);

    expect(archbishopric?.archbishopric_id).toBe("archbishopric_01");
    expect(archbishopric?.controls_jurisdiction).toBe(true);
    expect(archbishopric?.controls_ownership).toBe(false);
  });

  it("answers territorial and route adjacency from the canonical manor ids", () => {
    const world = loadBundledWorldDomain();
    const territorial = getTerritorialAdjacency(world, "manor_hx_26597");
    const routes = getRouteAdjacency(world, "manor_hx_26597");

    expect(territorial).toEqual([
      { manor_id: "manor_hx_28840", shared_border_sides: 12 },
      { manor_id: "manor_hx_28841", shared_border_sides: 15 },
      { manor_id: "manor_hx_29126", shared_border_sides: 5 },
      { manor_id: "manor_hx_30535", shared_border_sides: 9 },
      { manor_id: "manor_hx_30811", shared_border_sides: 12 },
      { manor_id: "manor_hx_32209", shared_border_sides: 10 }
    ]);

    expect(routes?.[0]).toEqual({
      edge_id: "route_manor_hx_26597__manor_hx_28840",
      manor_id: "manor_hx_28840",
      travel_cost: 17.66
    });
    expect(getRouteEdgeById(world, "route_manor_hx_26597__manor_hx_28840")).toMatchObject({
      from_manor_id: "manor_hx_26597",
      to_manor_id: "manor_hx_28840",
      route_tier: "trunk",
      travel_cost: 17.66
    });
  });

  it("answers canonical numeric distance from the route graph and matches preview rows", () => {
    const world = loadBundledWorldDomain();

    expect(getNumericDistanceMetrics(world, "manor_hx_26597", "manor_hx_26597")).toEqual({
      travel_cost_distance: 0,
      route_hop_distance: 0
    });
    expect(getTravelCostDistance(world, "manor_hx_26597", "manor_hx_28840")).toBe(17.66);

    for (const previewRow of world.world_topology.distance_preview_rows) {
      for (const preview of previewRow.distances) {
        expect(getNumericDistanceMetrics(world, previewRow.manor_id, preview.to_manor_id)).toEqual({
          travel_cost_distance: preview.travel_cost_distance,
          route_hop_distance: preview.route_hop_distance
        });
      }
    }
  });
});
