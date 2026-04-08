import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { buildCourtDelegationRegistry } from "../../src/sim/domains/court/delegationRegistry";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";

describe("court delegation snapshot outputs", () => {
  it("projects ordered delegation summaries into bounded snapshots", () => {
    const state = createNewRun("court_delegation_snapshot_v032");
    (state.house as any).court_delegation_registry = buildCourtDelegationRegistry([
      {
        action: "gift_liege",
        delegated: true,
        effect: {
          budget_cost_delta: -1,
          budget_cost_floor: 0,
          amount_multiplier_pct: 75,
        },
      },
      {
        action: "maintenance",
        delegated: true,
        effect: {
          amount_multiplier_pct: 80,
        },
      },
    ]);

    const snapshot: any = boundedSnapshot(state);

    expect(snapshot.court_delegation_view).toEqual({
      schema_version: "court_delegation_view_v0",
      action_keys: ["gift_liege", "offering_church", "marriage_scout", "maintenance"],
      active_action_keys: ["gift_liege", "maintenance"],
      actions: [
        {
          action: "gift_liege",
          mode: "delegated",
          delegated: true,
          summary_label: "Liege gifts",
          budget_cost_delta: -1,
          budget_cost_floor: 0,
          amount_multiplier_pct: 75,
          energy_cost_delta: 0,
          energy_cost_floor: 0,
        },
        {
          action: "offering_church",
          mode: "manual",
          delegated: false,
          summary_label: "Church offerings",
          budget_cost_delta: 0,
          budget_cost_floor: 0,
          amount_multiplier_pct: 100,
          energy_cost_delta: 0,
          energy_cost_floor: 0,
        },
        {
          action: "marriage_scout",
          mode: "manual",
          delegated: false,
          summary_label: "Marriage scouting",
          budget_cost_delta: 0,
          budget_cost_floor: 0,
          amount_multiplier_pct: 100,
          energy_cost_delta: 0,
          energy_cost_floor: 0,
        },
        {
          action: "maintenance",
          mode: "delegated",
          delegated: true,
          summary_label: "Maintenance",
          budget_cost_delta: 0,
          budget_cost_floor: 0,
          amount_multiplier_pct: 80,
          energy_cost_delta: 0,
          energy_cost_floor: 0,
        },
      ],
    });
    expect(snapshot.house.court_delegation_view).toEqual(snapshot.court_delegation_view);
  });
});
