import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildHouseDossierSurface, listHouseDossierIds } from "../../src/ui/houseDossierView";
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
    expect(html).toContain("Standing posture");
    expect(html).toContain("Turn movement");
    expect(html).toContain("Ledger Posture");
    expect(html).toContain("Known Manor Footprint");
    expect(html).toContain(surface.houseName);
    expect(html).toContain(surface.subtitle);
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

  it("renders known-people person-card triggers when the dossier surface resolves them canonically", () => {
    const state = createNewRun("house_dossier_panel_people");
    const ctx = proposeTurn(state);
    const dossierId = listHouseDossierIds(ctx.preview_state).find((houseId) => {
      return (buildHouseDossierSurface(ctx.preview_state, houseId)?.relatedPeople.length ?? 0) > 0;
    });

    if (!dossierId) {
      throw new Error("Expected a dossier surface with related people.");
    }

    const surface = buildHouseDossierSurface(ctx.preview_state, dossierId);
    const person = surface?.relatedPeople[0];

    if (!surface || !person) {
      throw new Error("Expected a known person on the dossier surface.");
    }

    const html = renderToStaticMarkup(
      <HouseDossierPanel initialTab="player" onOpenPersonCard={() => undefined} surface={surface} />
    );

    expect(html).toContain("Known people");
    expect(html).toContain(person.title);
    expect(html).toContain(`data-person-card-open="${person.personId}"`);
  });
});
