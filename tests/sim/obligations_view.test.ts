import { describe, expect, it } from "vitest";

import { settleEconomyObligationCounterparty } from "../../src/sim/domains/economy/obligationRegistry";
import { applyEconomyObligationCloseTurnStage } from "../../src/sim/domains/economy/obligationEnforcement";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";
import {
  ECONOMY_OBLIGATIONS_VIEW_COUNTERPARTY_ORDER,
  ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION,
  buildEconomyObligationsView,
  serializeEconomyObligationsView
} from "../../src/sim/domains/experience/obligationsView";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, name: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "Lord Rowan", "M", 40);
  const spouse = mkPerson("p_spouse", "Lady Rowan", "F", 38);
  const liege = mkPerson("p_liege", "House Liege", "M", 50);
  const clergy = mkPerson("p_clergy", "Parish Church", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 20,
      meat_stores: 6,
      coin: 12,
      unrest: 12,
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
      head,
      spouse,
      spouse_status: "spouse",
      children: [],
      energy: { max: 3, available: 3 },
      heir_id: null
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: []
  };
}

describe("economy obligations view", () => {
  it("builds deterministic liege-first counterparty summaries from settlement state", () => {
    const state = mkState();
    state.manor.obligations.tax_due_coin = 8;
    state.manor.obligations.tithe_due_bushels = 6;
    state.manor.obligations.arrears.coin = 1;
    state.manor.obligations.arrears.bushels = 2;

    settleEconomyObligationCounterparty(state, {
      phase: "obligations",
      phase_sequence: 4,
      counterparty_kind: "liege",
      requested_amount: 6,
      rule_id: "obligations.liege_view",
      related_actor_ids: ["p_liege", "p_head"]
    });
    settleEconomyObligationCounterparty(state, {
      phase: "obligations",
      phase_sequence: 5,
      counterparty_kind: "church",
      requested_amount: 5,
      rule_id: "obligations.church_view",
      related_actor_ids: ["p_clergy", "p_head"]
    });

    const viewA = buildEconomyObligationsView(state);
    const viewB = buildEconomyObligationsView(state);

    expect(viewA.schema_version).toBe(ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION);
    expect(viewA.counterparty_order).toEqual([...ECONOMY_OBLIGATIONS_VIEW_COUNTERPARTY_ORDER]);
    expect(viewA.counterparty_summaries.map((entry) => entry.counterparty_kind)).toEqual(["liege", "church"]);
    expect(serializeEconomyObligationsView(state)).toBe(serializeEconomyObligationsView(state));
    expect(JSON.parse(JSON.stringify(viewA))).toEqual(JSON.parse(JSON.stringify(viewB)));
    expect(viewA.total_due).toEqual({ coin: 3, bushels: 3 });
    expect(viewA.total_arrears).toEqual({ coin: 0, bushels: 0 });
    expect(viewA.counterparty_summaries[0]).toMatchObject({
      counterparty_kind: "liege",
      counterparty_label: "House Liege",
      due_amount: 3,
      arrears_amount: 0,
      total_outstanding: 3,
      settled_this_turn: true,
      carried_this_turn: false,
      settlement_status: "due_only",
      settlement_summary: "House Liege: 3 coin due.",
      enforcement_state: "clear",
      enforcement_rule_id: "enforcement.penalty.stage_one.liege_clear"
    });
    expect(viewA.counterparty_summaries[1]).toMatchObject({
      counterparty_kind: "church",
      counterparty_label: "Parish Church",
      due_amount: 3,
      arrears_amount: 0,
      total_outstanding: 3,
      settled_this_turn: true,
      carried_this_turn: false,
      settlement_status: "due_only",
      settlement_summary: "Parish Church: 3 bushels due.",
      enforcement_state: "clear",
      enforcement_rule_id: "enforcement.penalty.stage_one.church_clear"
    });
  });

  it("projects the obligations view into bounded snapshots with carried arrears and enforcement summaries", () => {
    const state = mkState();
    state.manor.obligations.tax_due_coin = 7;
    state.manor.obligations.tithe_due_bushels = 9;

    applyEconomyObligationCloseTurnStage(state, {
      phase: "succession",
      phase_sequence: 9,
      rule_prefix: "obligations.close_turn",
      related_actor_ids: ["p_head", "p_liege", "p_clergy"]
    });

    const snapshot = boundedSnapshot(state) as any;

    expect(snapshot.economy_obligations_view).toEqual({
      schema_version: "economy_obligations_view_v1",
      turn: 1,
      shortage_active: false,
      stable_unrest_delta: 0,
      stable_unrest_rule_id: null,
      stable_unrest_summary: null,
      total_due: { coin: 0, bushels: 0 },
      total_arrears: { coin: 7, bushels: 9 },
      counterparty_order: ["liege", "church"],
      counterparty_summaries: [
        {
          schema_version: "economy_obligations_view_v1",
          counterparty_kind: "liege",
          counterparty_id: "p_liege",
          counterparty_label: "House Liege",
          contract_id: "liege_due",
          due_asset: "tax_due_coin",
          due_amount: 0,
          arrears_asset: "arrears_coin",
          arrears_amount: 7,
          total_outstanding: 7,
          accepted_payment_modes: ["coin", "food_stores", "meat_stores"],
          supported_payment_modes: ["coin"],
          preferred_payment_mode: "coin",
          settled_this_turn: false,
          carried_this_turn: true,
          settlement_status: "arrears_only",
          settlement_summary: "House Liege: 7 coin in arrears.",
          enforcement_stage: 1,
          enforcement_state: "arrears",
          enforcement_rule_id: "enforcement.penalty.stage_one.liege_arrears",
          enforcement_summary: "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
          relationship_delta: { respect: -1, threat: 1 }
        },
        {
          schema_version: "economy_obligations_view_v1",
          counterparty_kind: "church",
          counterparty_id: "p_clergy",
          counterparty_label: "Parish Church",
          contract_id: "church_due",
          due_asset: "tithe_due_bushels",
          due_amount: 0,
          arrears_asset: "arrears_bushels",
          arrears_amount: 9,
          total_outstanding: 9,
          accepted_payment_modes: ["coin", "food_stores"],
          supported_payment_modes: ["food_stores"],
          preferred_payment_mode: "food_stores",
          settled_this_turn: false,
          carried_this_turn: true,
          settlement_status: "arrears_only",
          settlement_summary: "Parish Church: 9 bushels in arrears.",
          enforcement_stage: 1,
          enforcement_state: "arrears",
          enforcement_rule_id: "enforcement.penalty.stage_one.church_arrears",
          enforcement_summary: "Stage-one enforcement pressure rose for Parish Church because arrears remain open after carry.",
          relationship_delta: { respect: -1, threat: 1 }
        }
      ]
    });
  });
});
