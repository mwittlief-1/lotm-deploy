import { describe, expect, it } from "vitest";

import { buildTurnExplanationV1 } from "../../src/sim/domains/experience/reporting";
import { createNewRun, proposeTurn } from "../../src/sim";
import type { PhaseResultV0, RunState, TurnReport } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function makeState(): RunState {
  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "turn_explanation_sparse_structured",
    turn_index: 3,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 40,
      meat_stores: 4,
      coin: 12,
      unrest: 18,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null
      }
    } as any,
    house: {
      head: {
        id: "p_head",
        name: "Lord Rowan",
        sex: "M",
        age: 40,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: true
      },
      spouse: {
        id: "p_spouse",
        name: "Lady Rowan",
        sex: "F",
        age: 38,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: true
      },
      spouse_status: "spouse",
      children: [],
      energy: { max: 3, available: 3 },
      heir_id: null
    },
    locals: {
      liege: {
        id: "p_liege",
        name: "House Liege",
        sex: "M",
        age: 51,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: true
      },
      clergy: {
        id: "p_clergy",
        name: "Parish Church",
        sex: "M",
        age: 45,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      },
      nobles: []
    },
    relationships: [],
    flags: {},
    log: []
  };
}

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

  it("reconciles food and coin walkdowns from structured obligation receipts when note lines are sparse", () => {
    const before = makeState();
    const after = makeState();
    after.manor.bushels_stored = 25;
    after.manor.coin = 6;

    const report: TurnReport = {
      turn_index: 3,
      weather_multiplier: 0.9,
      market: { price_per_bushel: 0.1, sell_cap_bushels: 40 },
      spoilage: { rate: 0.05, loss_bushels: 1 },
      production_bushels: 10,
      consumption_bushels: 18,
      peasant_consumption_bushels: 15,
      court_consumption_bushels: 3,
      total_consumption_bushels: 18,
      shortage_bushels: 0,
      construction: { progress_added: 0, completed_improvement_id: null },
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears_coin: 0,
        arrears_bushels: 0,
        war_levy_due: null
      },
      household: {
        births: [],
        deaths: [],
        population_delta: 0
      },
      house_log: [],
      events: [],
      top_drivers: [],
      notes: [],
      unrest_breakdown: {
        schema_version: "unrest_breakdown_v1",
        before: 18,
        after: 18,
        delta: 0,
        increased_by: [],
        decreased_by: []
      }
    };
    const phaseResults: PhaseResultV0[] = [
      {
        phase: "obligations",
        receipts: [],
        fiscal_receipts_v1: [
          {
            schema_version: "fiscal_receipt_v1",
            receipt_id: "maintenance_01",
            turn: 3,
            phase: "obligations",
            phase_sequence: 1,
            category: "expense.maintenance",
            counterparty_kind: "self",
            counterparty_id: "manor:maintenance",
            counterparty_label: "Manor upkeep",
            asset: "coin",
            delta: -2,
            balance_after: 10,
            summary: "Manor upkeep paid 2 coin for recurring maintenance.",
            rule_id: "maintenance.upkeep",
            related_actor_ids: ["p_head"]
          },
          {
            schema_version: "fiscal_receipt_v1",
            receipt_id: "liege_due_01",
            turn: 3,
            phase: "obligations",
            phase_sequence: 2,
            category: "obligation.liege_settlement",
            counterparty_kind: "liege",
            counterparty_id: "p_liege",
            counterparty_label: "House Liege",
            asset: "coin",
            delta: -4,
            balance_after: 6,
            summary: "Settlement paid in coin to House Liege.",
            rule_id: "obligations.liege_due",
            related_actor_ids: ["p_head", "p_liege"]
          },
          {
            schema_version: "fiscal_receipt_v1",
            receipt_id: "church_due_01",
            turn: 3,
            phase: "obligations",
            phase_sequence: 3,
            category: "obligation.church_settlement",
            counterparty_kind: "church",
            counterparty_id: "p_clergy",
            counterparty_label: "Parish Church",
            asset: "food_stores",
            delta: -6,
            balance_after: 25,
            summary: "Settlement drew down food stores for Parish Church.",
            rule_id: "obligations.church_due",
            related_actor_ids: ["p_head", "p_clergy"]
          }
        ],
        log_events: [],
        evidence_events_v0: [],
        rng_keys_used: []
      }
    ];

    const turnExplanation = buildTurnExplanationV1(report, before, after, phaseResults);

    expect(turnExplanation.food_walkdown.reconciles).toBe(true);
    expect(turnExplanation.coin_walkdown.reconciles).toBe(true);
    expect(turnExplanation.food_walkdown.rows.map((row) => row.id)).toEqual([
      "food_starting_stores",
      "food_production",
      "food_total_before_deductions",
      "food_consumption",
      "food_spoilage",
      "food_dues",
      "food_ending_stores"
    ]);
    expect(turnExplanation.coin_walkdown.rows.map((row) => row.id)).toEqual([
      "coin_starting_coin",
      "coin_market_trade",
      "coin_marriage_project_other_inflows",
      "coin_maintenance",
      "coin_dues_paid",
      "coin_ending_coin"
    ]);
    expect(turnExplanation.food_walkdown.rows.find((row) => row.id === "food_dues")).toMatchObject({
      amount: 6,
      summary: "6 bushels left stores to cover dues or arrears."
    });
    expect(turnExplanation.coin_walkdown.rows.find((row) => row.id === "coin_maintenance")).toMatchObject({
      amount: 2,
      summary: "2 coin went to upkeep and recurring maintenance."
    });
    expect(turnExplanation.coin_walkdown.rows.find((row) => row.id === "coin_dues_paid")).toMatchObject({
      amount: 4,
      summary: "4 coin went to dues or arrears payments."
    });
  });

  it("canonicalizes unrest causes into reconciled player-facing pressure and relief rows", () => {
    const before = makeState();
    const after = makeState();
    after.manor.unrest = 24;

    const report: TurnReport = {
      turn_index: 3,
      weather_multiplier: 1,
      market: { price_per_bushel: 0.1, sell_cap_bushels: 40 },
      spoilage: { rate: 0, loss_bushels: 0 },
      production_bushels: 0,
      consumption_bushels: 0,
      peasant_consumption_bushels: 0,
      court_consumption_bushels: 0,
      total_consumption_bushels: 0,
      shortage_bushels: 0,
      construction: { progress_added: 0, completed_improvement_id: null },
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears_coin: 0,
        arrears_bushels: 0,
        war_levy_due: null
      },
      household: {
        births: [],
        deaths: [],
        population_delta: 0
      },
      house_log: [],
      events: [],
      top_drivers: [],
      notes: [],
      unrest_breakdown: {
        schema_version: "unrest_breakdown_v1",
        before: 18,
        after: 24,
        delta: 6,
        increased_by: [
          { label: "Arrears", amount: 4 },
          { label: "Village Riot", amount: 2 },
          { label: "Bridge repairs", amount: 1 }
        ],
        decreased_by: [{ label: "Harvest Festival", amount: 1 }]
      }
    };

    const turnExplanation = buildTurnExplanationV1(report, before, after, []);

    expect(turnExplanation.unrest_walkdown.reconciles).toBe(true);
    expect(turnExplanation.unrest_walkdown.rows.map((row) => row.label)).toEqual([
      "Starting unrest",
      "Arrears pressure",
      "Project pressure: Bridge repairs",
      "Event pressure: Village Riot",
      "Relief: Harvest Festival",
      "Net unrest change",
      "Ending unrest"
    ]);
    expect(turnExplanation.headline_causes.find((cause) => cause.metric === "unrest")).toMatchObject({
      detail: "Arrears pressure (+4) pushed unrest up while Relief: Harvest Festival (-1) eased it."
    });
  });

  it("uses canonical improvement benefit and upkeep language for completed-project headline causes", () => {
    const before = makeState();
    const after = makeState();
    after.manor.improvements = ["granary_upgrade"];

    const report: TurnReport = {
      turn_index: 3,
      weather_multiplier: 1,
      market: { price_per_bushel: 0.1, sell_cap_bushels: 40 },
      spoilage: { rate: 0.05, loss_bushels: 0 },
      production_bushels: 0,
      consumption_bushels: 0,
      peasant_consumption_bushels: 0,
      court_consumption_bushels: 0,
      total_consumption_bushels: 0,
      shortage_bushels: 0,
      construction: { progress_added: 0, completed_improvement_id: "granary_upgrade" },
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears_coin: 0,
        arrears_bushels: 0,
        war_levy_due: null
      },
      household: {
        births: [],
        deaths: [],
        population_delta: 0
      },
      house_log: [],
      events: [],
      top_drivers: [],
      notes: [],
      unrest_breakdown: {
        schema_version: "unrest_breakdown_v1",
        before: 18,
        after: 18,
        delta: 0,
        increased_by: [],
        decreased_by: []
      }
    };

    const turnExplanation = buildTurnExplanationV1(report, before, after, []);
    const projectCause = turnExplanation.headline_causes.find((cause) => cause.id === "headline_project_completion");

    expect(projectCause).toMatchObject({
      summary: "Project completed: granary_upgrade",
      detail: "Reduces spoilage meaningfully. Ongoing upkeep: 2 coin and 1 labor once built."
    });
  });
});
