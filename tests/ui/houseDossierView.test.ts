import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildHouseDossierSurface, listHouseDossierIds } from "../../src/ui/houseDossierView";

describe("houseDossierView", () => {
  it("lists canonical dossier ids and resolves routed dossier surfaces from preview state only", () => {
    const state = createNewRun("house_dossier_surface");
    const ctx = proposeTurn(state);
    const dossierIds = listHouseDossierIds(ctx.preview_state);
    const prospectId =
      (ctx.preview_state.house_dossiers ?? []).find((dossier) => dossier.knownness !== "known_house")?.house_id ?? dossierIds[0];

    expect(dossierIds.length).toBeGreaterThan(10);
    expect(dossierIds).toEqual([...dossierIds].sort());

    const surface = buildHouseDossierSurface(ctx.preview_state, prospectId);
    expect(surface).not.toBeNull();
    expect(surface?.houseId).toBe(prospectId);
    expect(surface?.debugRows.map((row) => row.key)).toEqual([
      "schema_version",
      "house_id",
      "house_name",
      "tier",
      "relevance_tier",
      "relevance_reasons",
      "knownness",
      "knownness_sources",
      "kinship_summary",
      "kinship_tags",
      "relationship_band",
      "relationship_summary",
      "household_scope",
      "household_member_count",
      "living_member_count",
      "child_count",
      "has_male_heir",
      "heiress_possible",
      "holdings_count",
      "holdings_band",
      "anchor_manor_id",
      "known_manor_ids",
      "source_kind",
      "ledger_band",
      "ledger_trend"
    ]);
  });
});
