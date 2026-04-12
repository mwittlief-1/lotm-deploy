import fs from "node:fs";
import path from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildManorViewSurface } from "../../src/ui/worldMapView";
import { ManorViewPanel } from "../../src/ui/panels/ManorViewPanel";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

function buildManorViewFixture(): string {
  const state = createNewRun("manor_view_fixture_v035");
  const ctx = proposeTurn(state);
  const anchor = buildManorViewSurface(ctx.preview_state, "manor_hx_26597");
  const routed = buildManorViewSurface(ctx.preview_state, "manor_hx_27972");

  return `${JSON.stringify(
    {
      anchor: {
        manor_id: anchor.detail.manor_id,
        helper_text: anchor.helperText,
        maintenance_summary_note: anchor.maintenanceSummaryNote,
        maintenance_totals: anchor.maintenanceSummary?.totals ?? null,
        nearest_manor_ids: anchor.nearestManors.map((row) => row.manor_id),
        terrain_order: anchor.detail.terrain_mix.map((row) => row.terrain),
        first_hex_ids: anchor.detail.hex_rows.slice(0, 6).map((row) => row.hex_id)
      },
      routed: {
        manor_id: routed.detail.manor_id,
        helper_text: routed.helperText,
        maintenance_summary_note: routed.maintenanceSummaryNote,
        maintenance_totals: routed.maintenanceSummary?.totals ?? null,
        nearest_manor_ids: routed.nearestManors.map((row) => row.manor_id),
        terrain_order: routed.detail.terrain_mix.map((row) => row.terrain),
        first_hex_ids: routed.detail.hex_rows.slice(0, 6).map((row) => row.hex_id)
      }
    },
    null,
    2
  )}\n`;
}

describe("manor view fixtures", () => {
  it("matches the deterministic anchor and routed manor-view fixture", () => {
    const expected = readFixture("manor_view_surface_v0.3.5.json");

    expect(buildManorViewFixture()).toBe(expected);
    expect(buildManorViewFixture()).toBe(buildManorViewFixture());
  });

  it("keeps routed nearest-manor and debug hex ordering stable across tab surfaces", () => {
    const state = createNewRun("manor_view_fixture_v035");
    const ctx = proposeTurn(state);
    const anchor = buildManorViewSurface(ctx.preview_state, "manor_hx_26597");
    const routed = buildManorViewSurface(ctx.preview_state, "manor_hx_27972");

    expect(anchor.maintenanceSummary?.totals.right_count).toBeGreaterThan(0);
    expect(routed.maintenanceSummary).toBeNull();
    expect(anchor.nearestManors.map((row) => row.manor_id)).toEqual([
      "manor_hx_28840",
      "manor_hx_28841",
      "manor_hx_29126",
      "manor_hx_30811",
      "manor_hx_31093"
    ]);
    expect(routed.detail.hex_rows.slice(0, 4).map((row) => row.hex_id)).toEqual([
      "hx_27972",
      "hx_28252",
      "hx_28253",
      "hx_28532"
    ]);

    const playerHtml = renderToStaticMarkup(
      <ManorViewPanel initialTab="player" onSelectManor={() => undefined} surface={routed} />
    );
    const debugHtml = renderToStaticMarkup(<ManorViewPanel initialTab="debug" surface={routed} />);

    expect(playerHtml).toContain("Open manor");
    expect(playerHtml).toContain("current manor chronicle");
    expect(playerHtml.indexOf(routed.nearestManors[0]?.manor_label ?? "")).toBeLessThan(
      playerHtml.indexOf(routed.nearestManors[1]?.manor_label ?? "")
    );
    expect(debugHtml.indexOf(routed.detail.hex_rows[0]?.hex_id ?? "")).toBeLessThan(
      debugHtml.indexOf(routed.detail.hex_rows[1]?.hex_id ?? "")
    );
  });
});
