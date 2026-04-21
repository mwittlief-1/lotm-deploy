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
      "relationship_summary",
      "relationship_turn_movement_count",
      "relationship_turn_movement_rows",
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
    expect(surface?.relationshipPostureLabel).toBe(surface?.relationshipSummary?.standingBandLabel ?? "Unknown");
    expect(surface?.helperText).toContain("Standing posture comes from the current relationship summary");
    expect(surface?.knownnessHelperText.length ?? 0).toBeGreaterThan(0);
    expect(surface?.holdingsFootprintHelperText.length ?? 0).toBeGreaterThan(0);
  });

  it("keeps baseline relationship standing separate from signed turn movement copy", () => {
    const previewState = {
      house_dossiers: [
        {
          schema_version: "house_dossier_summary_v2",
          house_id: "house:house:h_baseline",
          house_name: "House Baseline",
          relationship_summary: {
            allegiance: 50,
            respect: 50,
            threat: 20,
            favor_score: 40,
            standing_band: "favored"
          },
          relationship_turn_movement_count: 0,
          relationship_turn_movement_rows: []
        }
      ]
    } as any;

    const surface = buildHouseDossierSurface(previewState, "house:house:h_baseline");
    const relationshipDebug = surface?.debugRows.find((row) => row.key === "relationship_summary")?.value ?? "";

    expect(surface?.relationshipSummary?.standingVectorLabel).toBe("Standing A 50 / R 50 / T 20");
    expect(surface?.relationshipPostureLabel).toBe("Favored");
    expect(surface?.relationshipMovementCount).toBe(0);
    expect(surface?.relationshipMovementRows).toEqual([]);
    expect(relationshipDebug).toContain("Standing A 50 / R 50 / T 20");
    expect(relationshipDebug).not.toContain("A +50");
    expect(relationshipDebug).not.toContain("R +50");
    expect(relationshipDebug).not.toContain("T +20");
  });

  it("labels signed relationship values only as turn deltas", () => {
    const previewState = {
      house_dossiers: [
        {
          schema_version: "house_dossier_summary_v2",
          house_id: "house:house:h_delta",
          house_name: "House Delta",
          relationship_summary: {
            allegiance: 50,
            respect: 50,
            threat: 20,
            favor_score: 40,
            standing_band: "favored"
          },
          relationship_turn_movement_count: 1,
          relationship_turn_movement_rows: [
            {
              row_id: "relationship_turn_movement:house_delta:1",
              counterparty_label: "House Delta",
              counterparty_person_id: "p_delta",
              allegiance_delta: 2,
              respect_delta: -1,
              threat_delta: 0,
              before_standing_band: "neutral",
              after_standing_band: "favored",
              cause_summary: "Accepted proposal",
              direction_label: "Toward this house",
              magnitude: 3
            }
          ]
        }
      ]
    } as any;

    const surface = buildHouseDossierSurface(previewState, "house:house:h_delta");

    expect(surface?.relationshipSummary?.standingVectorLabel).toBe("Standing A 50 / R 50 / T 20");
    expect(surface?.relationshipMovementRows).toHaveLength(1);
    expect(surface?.relationshipMovementRows[0]?.detail).toBe("Turn delta A +2 · R -1 · T 0");
  });
});
