import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildCourtProvisioningSurface } from "../../src/ui/courtProvisioningView";

describe("courtProvisioningView", () => {
  it("builds a deterministic provisioning surface from the canonical provisioning view and stipend registry", () => {
    const state = createNewRun("court_provisioning_surface");
    const ctx = proposeTurn(state);
    const surface = buildCourtProvisioningSurface(ctx.preview_state);

    expect(surface).not.toBeNull();
    expect(surface?.summaryCards.map((card) => card.id)).toEqual([
      "court_members",
      "ration_demand",
      "allocation_result",
      "stipend_coin"
    ]);
    expect(surface?.debugRows.map((row) => row.key)).toEqual([
      "provisioning_schema_version",
      "stipend_registry_schema_version",
      "generated_at_turn_index",
      "person_ids",
      "allocation_order",
      "stipend_keys",
      "total_requested_food_units",
      "total_requested_meat_units",
      "total_allocated_food_units",
      "total_allocated_meat_units",
      "total_requested_stipend_coin",
      "at_risk_person_ids"
    ]);
    expect(surface?.allocationRows.map((row) => row.allocationPriority)).toEqual(
      [...(surface?.allocationRows.map((row) => row.allocationPriority) ?? [])].sort((left, right) => left - right)
    );
    expect(surface?.overrideRows.map((row) => row.personId)).toEqual(
      [...(surface?.overrideRows.map((row) => row.personId) ?? [])].sort()
    );
    expect(surface?.stipendRows.map((row) => row.stipendKey)).toEqual(
      [...(surface?.stipendRows.map((row) => row.stipendKey) ?? [])].sort()
    );
    expect(surface?.subtitle).toContain("court members");
    expect(surface?.helperText).toContain("Meat here is passive ration stock already on hand, not a separate market control.");
    expect(surface?.summaryCards.find((card) => card.id === "ration_demand")?.detail).toContain("not a separate live market action");
    expect(surface?.summaryCards.find((card) => card.id === "allocation_result")?.detail).toContain("food or meat stock fell short");
  });
});
