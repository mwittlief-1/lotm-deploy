import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildWorldMapScreenSurface } from "../../src/ui/worldMapView";
import { buildAppRouteHash, buildExternalMapRendererSurface, readAppRouteState } from "../../src/ui/worldMapRoute";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

function buildWorldMapRouteFixture(): string {
  const state = createNewRun("world_map_route_fixture_v035");
  const ctx = proposeTurn(state);
  const route = buildExternalMapRendererSurface({
    countyId: "c_2",
    holdingId: "church_fief_hx_28841",
    manorId: "manor_hx_26597",
    manorLabel: "Current manor"
  });
  const routedRoute = buildExternalMapRendererSurface({
    countyId: "c_6",
    holdingId: "barony_hx_27972",
    manorId: "manor_hx_27972",
    manorLabel: "Hx 27972"
  });
  const screen = buildWorldMapScreenSurface(ctx.preview_state, routedRoute);

  return `${JSON.stringify(
    {
      route,
      routed_selection: {
        selected_manor_id: screen.selectedManorId,
        selected_manor_label: screen.selectedManorLabel,
        player_holding_manor_ids: screen.playerHoldingManorIds,
        liege_seat_manor_id: screen.liegeSeatManorId,
        first_marker_ids: screen.markers.slice(0, 8).map((row) => row.manorId),
        first_debug_row_ids: screen.debugRows.slice(0, 8).map((row) => row.manorId),
        selected_marker: screen.markers.find((row) => row.manorId === screen.selectedManorId) ?? null,
        selected_debug_row: screen.debugRows.find((row) => row.manorId === screen.selectedManorId) ?? null
      }
    },
    null,
    2
  )}\n`;
}

describe("world map route fixtures", () => {
  it("matches the deterministic route and routed-selection fixture", () => {
    const expected = readFixture("world_map_route_snapshot_v0.3.5.json");

    expect(buildWorldMapRouteFixture()).toBe(expected);
    expect(buildWorldMapRouteFixture()).toBe(buildWorldMapRouteFixture());
  });

  it("keeps routed marker ordering, debug ordering, and route hashes aligned", () => {
    const fixture = JSON.parse(buildWorldMapRouteFixture()) as {
      routed_selection: {
        first_debug_row_ids: string[];
        first_marker_ids: string[];
        selected_debug_row: { flags: string[]; manorId: string };
        selected_marker: { target: { countyId: string; holdingId: string; manorId: string; manorLabel: string } };
      };
    };

    expect(fixture.routed_selection.first_marker_ids).toEqual(fixture.routed_selection.first_debug_row_ids);
    expect(fixture.routed_selection.selected_debug_row.flags).toEqual(["Selected"]);

    const hash = buildAppRouteHash("map", fixture.routed_selection.selected_marker.target);
    expect(hash).toBe("#/map?manor_id=manor_hx_27972");
    expect(readAppRouteState(hash)).toEqual({
      screen: "map",
      target_manor_id: fixture.routed_selection.selected_debug_row.manorId
    });
  });
});
