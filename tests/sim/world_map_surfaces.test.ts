import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildBoundedMapViewSnapshot,
  buildManorDetailView,
  getMapViewSelectorRow,
  resolveActionScope
} from "../../src/sim/domains/world";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

function readJsonFixture<T>(name: string): T {
  return JSON.parse(readFixture(name)) as T;
}

function buildMapViewFixture(): string {
  return `${JSON.stringify(buildBoundedMapViewSnapshot(), null, 2)}\n`;
}

function buildManorDetailFixture(): string {
  return `${JSON.stringify(buildManorDetailView("manor_hx_26597"), null, 2)}\n`;
}

describe("world map surfaces", () => {
  it("matches the deterministic map view fixture", () => {
    const expected = readFixture("map_view_snapshot_v0.3.5.json");

    expect(buildMapViewFixture()).toBe(expected);
    expect(buildMapViewFixture()).toBe(buildMapViewFixture());
  });

  it("matches the deterministic manor detail fixture", () => {
    const expected = readFixture("manor_detail_view_v0.3.5.json");

    expect(buildManorDetailFixture()).toBe(expected);
    expect(buildManorDetailFixture()).toBe(buildManorDetailFixture());
  });

  it("keeps the map snapshot compact while selector rows and manor detail stay field-stable", () => {
    const mapSnapshot = readJsonFixture<Record<string, unknown>>("map_view_snapshot_v0.3.5.json");
    const manorDetail = readJsonFixture<Record<string, unknown>>("manor_detail_view_v0.3.5.json");
    const mapRows = mapSnapshot.rows as Array<Record<string, unknown>>;
    const secondMapRow = mapRows[1] as Record<string, unknown>;
    const selectorRow = getMapViewSelectorRow("manor_hx_27972");
    const hexRows = manorDetail.hex_rows as Array<Record<string, unknown>>;

    expect(Object.keys(mapSnapshot)).toEqual([
      "schema_version",
      "anchor_manor_id",
      "anchor_holding_id",
      "anchor_county_id",
      "row_ordering",
      "rows"
    ]);
    expect(Object.keys(mapRows[0] ?? {})).toEqual([
      "manor_id",
      "manor_label",
      "is_anchor_manor",
      "seat_hex_id",
      "seat_q",
      "seat_r",
      "owner_actor_id",
      "holding_id",
      "county_id"
    ]);
    expect(mapRows).toHaveLength(387);
    expect(secondMapRow.manor_id).toBe("manor_hx_27972");
    expect(Object.keys(selectorRow)).toEqual([
      "manor_id",
      "manor_label",
      "is_anchor_manor",
      "seat_hex_id",
      "seat_q",
      "seat_r",
      "owner_actor_id",
      "owner_label",
      "holding_id",
      "holding_label",
      "county_id",
      "county_label",
      "map_checkpoint_target",
      "road_exposure",
      "river_exposure"
    ]);
    expect(selectorRow.river_exposure).toEqual({
      state: "none",
      hex_count: 0,
      river_tags: []
    });

    expect(Object.keys(manorDetail)).toEqual([
      "schema_version",
      "manor_id",
      "manor_label",
      "seat_hex_id",
      "seat_q",
      "seat_r",
      "owner_actor_id",
      "owner_label",
      "holding_id",
      "holding_label",
      "county_id",
      "county_label",
      "hex_count",
      "nearest_manor_limit",
      "arability_summary",
      "terrain_mix",
      "nearest_manors",
      "hex_rows"
    ]);
    expect(Object.keys(hexRows[0] ?? {})).toEqual([
      "hex_id",
      "q",
      "r",
      "terrain",
      "tile_kind",
      "elevation",
      "river_tags",
      "road_route_tiers",
      "base_arable_capacity",
      "base_pasture_capacity",
      "net_productive_capacity",
      "water_access_score",
      "buildability_score"
    ]);
    expect((manorDetail.terrain_mix as Array<Record<string, unknown>>).map((row) => row.terrain)).toEqual([
      "forest",
      "marsh",
      "lake",
      "plains"
    ]);
  });

  it("resolves marriage scouting through topology caps and household residence hooks", () => {
    const state = {
      player_house_id: "h_player",
      houses: {
        h_player: {
          tier: "Knight"
        }
      }
    } as Record<string, unknown>;

    Object.defineProperty(state, "residence_selector_summary", {
      value: {
        schema_version: "residence_selector_summary_v0",
        anchor_manor_id: "manor_hx_26597",
        person_ids: ["p_head", "p_child"],
        entries_by_person_id: {
          p_head: {
            residence_manor_id: "manor_hx_26597",
            selector_contexts: ["household"]
          },
          p_child: {
            residence_manor_id: "manor_hx_29096",
            selector_contexts: ["household"]
          }
        }
      },
      enumerable: false,
      writable: true,
      configurable: true
    });

    const scope = resolveActionScope("manor_hx_26597", "marriage_scout", {
      far_threshold: 50,
      state
    });

    expect(scope).toMatchObject({
      schema_version: "action_scope_resolution_v1",
      action_type: "marriage_scout",
      anchor_manor_id: "manor_hx_26597",
      scope_mode: "topology_cap",
      tier_label: "Knight",
      far_threshold: 50,
      residence_manor_ids: ["manor_hx_26597", "manor_hx_29096"],
      kinship_manor_ids: ["manor_hx_29096"]
    });
    expect(scope.candidates[0]).toMatchObject({
      manor_id: "manor_hx_29096",
      bucket: "kinship"
    });
    expect(scope.admitted_manor_ids).toContain("manor_hx_29096");
    expect(scope.rejected_manor_ids.length).toBeGreaterThan(0);
  });

  it("keeps maintenance scoped to the anchor manor without widening into topology candidates", () => {
    const scope = resolveActionScope("manor_hx_26597", "maintenance");

    expect(scope).toEqual({
      schema_version: "action_scope_resolution_v1",
      action_type: "maintenance",
      anchor_manor_id: "manor_hx_26597",
      scope_mode: "anchor_only",
      tier_label: null,
      far_threshold: null,
      residence_manor_ids: [],
      kinship_manor_ids: [],
      admitted_manor_ids: ["manor_hx_26597"],
      rejected_manor_ids: [],
      candidates: [],
      cap_evaluation: null
    });
  });
});
