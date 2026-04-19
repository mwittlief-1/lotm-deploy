import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";

describe("turn explanation contract", () => {
  it("builds ordered walkdowns and surface roles on the preview report", () => {
    const state = createNewRun("turn_explanation_contract_v036");
    state.manor.obligations.arrears.coin = 2;

    const ctx = proposeTurn(state);

    expect(ctx.report.turn_explanation_v1).toMatchObject({
      schema_version: "turn_explanation_v1",
      food_walkdown: {
        schema_version: "turn_explanation_walkdown_v1",
        metric: "food",
        rows: expect.arrayContaining([
          expect.objectContaining({ id: "food_starting_stores", label: "Starting stores" }),
          expect.objectContaining({ id: "food_total_before_deductions", label: "Total before deductions" }),
          expect.objectContaining({ id: "food_ending_stores", label: "Ending stores" })
        ])
      },
      coin_walkdown: {
        schema_version: "turn_explanation_walkdown_v1",
        metric: "coin"
      },
      unrest_walkdown: {
        schema_version: "turn_explanation_walkdown_v1",
        metric: "unrest"
      },
      surface_roles: [
        expect.objectContaining({ surface: "turn_report", role_label: "Summary" }),
        expect.objectContaining({ surface: "diff_ledger", role_label: "Top deltas" }),
        expect.objectContaining({ surface: "manor_state", role_label: "Current state plus direct causes" }),
        expect.objectContaining({ surface: "explain_changes", role_label: "Drilldown" })
      ]
    });

    expect(ctx.report.relationship_change_log_v1).toMatchObject({
      schema_version: "relationship_change_log_v1",
      entries: expect.arrayContaining([
        expect.objectContaining({
          cause_key: "obligations_arrears_preview",
          cause_summary: "Arrears pressure"
        })
      ])
    });
    expect(ctx.report.headline_causes?.length ?? 0).toBeGreaterThan(0);
    expect(ctx.report.top_drivers.length).toBeGreaterThan(0);
  });
});
