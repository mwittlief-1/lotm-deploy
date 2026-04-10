import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildHouseDossierSurface } from "../../src/ui/houseDossierView";
import { HouseDossierPanel } from "../../src/ui/panels/HouseDossierPanel";

describe("HouseDossierPanel", () => {
  it("renders the player tab for a canonical dossier surface", () => {
    const state = createNewRun("house_dossier_panel_player");
    const ctx = proposeTurn(state);
    const surface = buildHouseDossierSurface(ctx.preview_state, (ctx.preview_state.house_dossiers ?? [])[0]?.house_id ?? "h_ext_01");

    if (!surface) {
      throw new Error("Expected a dossier surface for the first known house.");
    }

    const html = renderToStaticMarkup(<HouseDossierPanel initialTab="player" surface={surface} />);

    expect(html).toContain("House dossier");
    expect(html).toContain("Player tab");
    expect(html).toContain("Ledger Posture");
    expect(html).toContain("Known Manor Footprint");
    expect(html).toContain(surface.houseName);
  });

  it("renders the debug tab table in deterministic field order", () => {
    const state = createNewRun("house_dossier_panel_debug");
    const ctx = proposeTurn(state);
    const surface = buildHouseDossierSurface(ctx.preview_state, (ctx.preview_state.house_dossiers ?? [])[0]?.house_id ?? "h_ext_01");

    if (!surface) {
      throw new Error("Expected a dossier surface for the first known house.");
    }

    const html = renderToStaticMarkup(<HouseDossierPanel initialTab="debug" surface={surface} />);

    expect(html).toContain("Debug tab");
    expect(html).toContain("Deterministic dossier field order");
    expect(html).toContain("schema_version");
    expect(html).toContain(surface.schemaVersion);
    expect(html.indexOf("schema_version")).toBeLessThan(html.indexOf("house_id"));
  });
});
