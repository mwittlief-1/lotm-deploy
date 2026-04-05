import { describe, expect, it } from "vitest";

import {
  arrearsBushels,
  arrearsCoin,
  readLedgerReceiptSnapshots,
  taxDueCoin,
  titheDueBushels
} from "../../src/sim/domains/economy/ledger";
import {
  ECONOMY_OBLIGATION_PENALTY_STAGE,
  ECONOMY_OBLIGATION_PENALTY_STAGE_CATEGORY,
  ECONOMY_OBLIGATION_PENALTY_STAGE_SCHEMA_VERSION,
  applyEconomyObligationCloseTurnStage,
  applyEconomyObligationStageOnePenalties
} from "../../src/sim/domains/economy/obligationEnforcement";
import type { Person, RelationshipEdge, RunState } from "../../src/sim/types";
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

function relationshipEdge(state: RunState, fromId: string, toId: string): RelationshipEdge | undefined {
  return state.relationships.find((edge) => edge.from_id === fromId && edge.to_id === toId);
}

describe("economy obligation enforcement", () => {
  it("carries dues into canonical arrears receipts, then applies bounded stage-one pressure", () => {
    const state = mkState();
    state.manor.obligations.tax_due_coin = 7;
    state.manor.obligations.tithe_due_bushels = 9;

    const result = applyEconomyObligationCloseTurnStage(state, {
      phase: "succession",
      phase_sequence: 9,
      rule_prefix: "obligations.close_turn",
      related_actor_ids: ["p_liege", "p_head", "p_clergy"]
    });

    expect(result.carry_results_by_counterparty.church).toMatchObject({
      counterparty_kind: "church",
      carried_amount: 9,
      reason: "applied",
      blocked: false
    });
    expect(result.carry_results_by_counterparty.liege).toMatchObject({
      counterparty_kind: "liege",
      carried_amount: 7,
      reason: "applied",
      blocked: false
    });
    expect(result.penalty_stage.schema_version).toBe(ECONOMY_OBLIGATION_PENALTY_STAGE_SCHEMA_VERSION);
    expect(result.penalty_stage.stage).toBe(ECONOMY_OBLIGATION_PENALTY_STAGE);
    expect(result.penalty_stage.entries.map((entry) => ({
      category: entry.category,
      counterparty_kind: entry.counterparty_kind,
      arrears_amount: entry.arrears_amount,
      relationship_delta: entry.relationship_delta,
      rule_id: entry.rule_id
    }))).toEqual([
      {
        category: ECONOMY_OBLIGATION_PENALTY_STAGE_CATEGORY,
        counterparty_kind: "church",
        arrears_amount: 9,
        relationship_delta: { respect: -1, threat: 1 },
        rule_id: "enforcement.penalty.stage_one.church_arrears"
      },
      {
        category: ECONOMY_OBLIGATION_PENALTY_STAGE_CATEGORY,
        counterparty_kind: "liege",
        arrears_amount: 7,
        relationship_delta: { respect: -1, threat: 1 },
        rule_id: "enforcement.penalty.stage_one.liege_arrears"
      }
    ]);
    expect(result.penalty_stage.stable_unrest_delta).toBe(0);

    expect(taxDueCoin(state)).toBe(0);
    expect(titheDueBushels(state)).toBe(0);
    expect(arrearsCoin(state)).toBe(7);
    expect(arrearsBushels(state)).toBe(9);
    expect(state.manor.unrest).toBe(12);
    expect(relationshipEdge(state, "p_liege", "p_head")).toMatchObject({ respect: 49, threat: 21 });
    expect(relationshipEdge(state, "p_clergy", "p_head")).toMatchObject({ respect: 49, threat: 21 });

    expect(
      readLedgerReceiptSnapshots(state).map((receipt) => ({
        category: receipt.category,
        counterparty_kind: receipt.counterparty_kind,
        asset: receipt.asset,
        delta: receipt.delta,
        rule_id: receipt.rule_id
      }))
    ).toEqual([
      {
        category: "obligation.arrears_carry",
        counterparty_kind: "church",
        asset: "arrears_bushels",
        delta: 9,
        rule_id: "obligations.close_turn.church_arrears_carry.credit"
      },
      {
        category: "obligation.arrears_carry",
        counterparty_kind: "church",
        asset: "tithe_due_bushels",
        delta: -9,
        rule_id: "obligations.close_turn.church_arrears_carry.debit"
      },
      {
        category: "obligation.arrears_carry",
        counterparty_kind: "liege",
        asset: "arrears_coin",
        delta: 7,
        rule_id: "obligations.close_turn.liege_arrears_carry.credit"
      },
      {
        category: "obligation.arrears_carry",
        counterparty_kind: "liege",
        asset: "tax_due_coin",
        delta: -7,
        rule_id: "obligations.close_turn.liege_arrears_carry.debit"
      }
    ]);
  });

  it("applies favorable clear-state pressure and bounded unrest relief when arrears are clear", () => {
    const state = mkState();
    state.manor.unrest = 10;

    const result = applyEconomyObligationStageOnePenalties(state);

    expect(result.entries.map((entry) => ({
      counterparty_kind: entry.counterparty_kind,
      relationship_delta: entry.relationship_delta,
      rule_id: entry.rule_id
    }))).toEqual([
      {
        counterparty_kind: "church",
        relationship_delta: { respect: 1, threat: 0 },
        rule_id: "enforcement.penalty.stage_one.church_clear"
      },
      {
        counterparty_kind: "liege",
        relationship_delta: { respect: 1, threat: -1 },
        rule_id: "enforcement.penalty.stage_one.liege_clear"
      }
    ]);
    expect(result.stable_unrest_delta).toBe(-2);
    expect(result.stable_unrest_rule_id).toBe("enforcement.penalty.stage_one.stable_relief");

    expect(state.manor.unrest).toBe(8);
    expect(relationshipEdge(state, "p_clergy", "p_head")).toMatchObject({ respect: 51, threat: 20 });
    expect(relationshipEdge(state, "p_liege", "p_head")).toMatchObject({ respect: 51, threat: 19 });
  });

  it("blocks stable unrest relief when shortage is active while keeping stage-one deltas bounded", () => {
    const state = mkState();
    state.manor.unrest = 10;
    (state.flags as any).Shortage = true;

    const result = applyEconomyObligationStageOnePenalties(state);

    expect(result.shortage_active).toBe(true);
    expect(result.stable_unrest_delta).toBe(0);
    expect(result.stable_unrest_rule_id).toBeNull();
    expect(state.manor.unrest).toBe(10);
    expect(relationshipEdge(state, "p_clergy", "p_head")).toMatchObject({ respect: 51, threat: 20 });
    expect(relationshipEdge(state, "p_liege", "p_head")).toMatchObject({ respect: 51, threat: 19 });
  });
});
