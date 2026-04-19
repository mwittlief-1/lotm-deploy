import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildPersonCardSurface, createPersonCardRoute, listPersonCardIds } from "../../src/ui/personCardView";

describe("personCardView", () => {
  it("builds a deterministic routed surface from the canonical registry", () => {
    const state = createNewRun("person_card_surface");
    const ctx = proposeTurn(state);
    const personCardIds = listPersonCardIds(ctx.preview_state);
    const surface = buildPersonCardSurface(ctx.preview_state, "p_head");

    expect(personCardIds.length).toBeGreaterThan(100);
    expect(personCardIds).toContain("p_head");
    expect(surface).not.toBeNull();
    expect(surface?.familySections.map((section) => section.id)).toEqual(["parents", "spouse", "siblings", "children"]);
    expect(surface?.debugRows.map((row) => row.key)).toEqual([
      "schema_version",
      "person_id",
      "person_name",
      "short_id",
      "alive",
      "sex",
      "age",
      "current_house",
      "birth_house",
      "court_member",
      "court_roles",
      "known_house_relevance",
      "married_out",
      "residence_manor_id",
      "selector_contexts",
      "source_kind",
      "source_ref_id",
      "distance",
      "family_person_ids",
      "succession_projection",
      "office_assignments",
      "service_entries",
      "lands_held_projection",
      "relationship_rows"
    ]);
    expect(surface?.relationshipRows).toHaveLength(12);
    expect(surface?.relationshipCount ?? 0).toBeGreaterThan(surface?.relationshipRows.length ?? 0);
    expect(surface?.relationshipRows[0]?.totalScore ?? 0).toBeGreaterThanOrEqual(surface?.relationshipRows[1]?.totalScore ?? 0);
    expect(surface?.helperText).toContain("what the player actually knows");
    expect(surface?.overviewCards.find((card) => card.id === "lands")).toMatchObject({
      value: "Known footprint",
    });
    expect(surface?.overviewCards.find((card) => card.id === "lands")?.detail).toContain("Personal holdings not exposed");
  });

  it("creates stable origin routes for the shared tap-any-name modal flow", () => {
    expect(
      (["household", "roster", "prospects", "known_houses", "house_dossier", "person_card"] as const).map((origin) =>
        createPersonCardRoute("p_head", origin)
      )
    ).toEqual([
      { origin: "household", personId: "p_head" },
      { origin: "roster", personId: "p_head" },
      { origin: "prospects", personId: "p_head" },
      { origin: "known_houses", personId: "p_head" },
      { origin: "house_dossier", personId: "p_head" },
      { origin: "person_card", personId: "p_head" }
    ]);
  });
});
