import { describe, expect, it } from "vitest";

import { resolveEconomyObligationGesture } from "../../src/sim/domains/economy/obligationGestures";
import { settleEconomyObligationCounterparty } from "../../src/sim/domains/economy/obligationRegistry";
import { applyEconomyObligationCloseTurnStage } from "../../src/sim/domains/economy/obligationEnforcement";
import { applyEconomyObligationEnterpriseSeizure } from "../../src/sim/domains/economy/obligationTangibleBite";
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
      collector_state: "active",
      collector_successor_label: null,
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
    expect(viewA.receipt_group_order).toEqual(["payment", "penalty", "seizure"]);
    expect(viewA.counterparty_summaries[0]?.receipt_groups.map((group) => group.group_kind)).toEqual([
      "payment",
      "penalty",
      "seizure"
    ]);
    expect(viewA.counterparty_summaries[0]?.receipt_groups[0]?.receipt_count).toBeGreaterThan(0);
    expect(viewA.counterparty_summaries[0]?.next_stage_trigger).toBeNull();
    expect(viewA.counterparty_summaries[0]?.tangible_bite_preview).toBeNull();
    expect(viewA.counterparty_summaries[1]).toMatchObject({
      counterparty_kind: "church",
      counterparty_label: "Parish Church",
      collector_state: "active",
      collector_successor_label: null,
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
    expect(viewA.counterparty_summaries[1]?.receipt_groups[0]?.receipt_count).toBeGreaterThan(0);
    expect(viewA.counterparty_summaries[1]?.next_stage_trigger).toBeNull();
    expect(viewA.counterparty_summaries[1]?.tangible_bite_preview).toBeNull();
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
    const liegeSummary = snapshot.economy_obligations_view.counterparty_summaries[0];
    const churchSummary = snapshot.economy_obligations_view.counterparty_summaries[1];

    expect(snapshot.economy_obligations_view).toMatchObject({
      schema_version: "economy_obligations_view_v2",
      turn: 1,
      shortage_active: false,
      stable_unrest_delta: 0,
      stable_unrest_rule_id: null,
      stable_unrest_summary: null,
      total_due: { coin: 0, bushels: 0 },
      total_arrears: { coin: 7, bushels: 9 },
      counterparty_order: ["liege", "church"],
      receipt_group_order: ["payment", "penalty", "seizure"],
      counterparty_summaries: [
        {
          schema_version: "economy_obligations_view_v2",
          counterparty_kind: "liege",
          counterparty_id: "p_liege",
          counterparty_label: "House Liege",
          collector_state: "active",
          collector_successor_label: null,
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
          schema_version: "economy_obligations_view_v2",
          counterparty_kind: "church",
          counterparty_id: "p_clergy",
          counterparty_label: "Parish Church",
          collector_state: "active",
          collector_successor_label: null,
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
    expect(liegeSummary.next_stage_trigger).toMatchObject({
      next_stage: 2,
      next_stage_label: "tangible_bite",
      trigger_kind: "arrears_persist",
      trigger_source_path: "manor.obligations.arrears.coin",
      current_value: 7,
      armed: true
    });
    expect(liegeSummary.terminal_risk).toMatchObject({
      stage: 3,
      stage_label: "dispossession_danger",
      armed: true,
      active: false,
      current_value: 12,
      remaining_to_threshold: 88,
      trigger_threshold: 100,
      rule_id: "succession.dispossession.unrest_threshold"
    });
    expect(liegeSummary.tangible_bite_preview).toMatchObject({
      stage: 2,
      category: "enforcement.seizure",
      payment_mode: "coin",
      outstanding_amount: 7,
      preview_amount: 7,
      turn_cap_amount: null
    });
    expect(liegeSummary.receipt_groups[0]).toMatchObject({ group_kind: "payment", receipt_count: 0 });
    expect(liegeSummary.receipt_groups[1]).toMatchObject({ group_kind: "penalty", receipt_count: 2 });
    expect(liegeSummary.receipt_groups[2]).toMatchObject({ group_kind: "seizure", receipt_count: 0 });
    expect(churchSummary.next_stage_trigger).toMatchObject({
      next_stage: 2,
      next_stage_label: "tangible_bite",
      trigger_kind: "arrears_persist",
      trigger_source_path: "manor.obligations.arrears.bushels",
      current_value: 9,
      armed: true
    });
    expect(churchSummary.tangible_bite_preview).toMatchObject({
      stage: 2,
      category: "enforcement.forced_payment_stores",
      payment_mode: "food_stores",
      outstanding_amount: 9,
      preview_amount: 9,
      turn_cap_amount: null
    });
    expect(churchSummary.receipt_groups[0]).toMatchObject({ group_kind: "payment", receipt_count: 0 });
    expect(churchSummary.receipt_groups[1]).toMatchObject({ group_kind: "penalty", receipt_count: 2 });
    expect(churchSummary.receipt_groups[2]).toMatchObject({ group_kind: "seizure", receipt_count: 0 });
  });

  it("groups payment and seizure receipts deterministically for later obligations playback", () => {
    const state = mkState();
    state.manor.coin = 10;
    state.manor.obligations.tax_due_coin = 5;
    state.manor.obligations.arrears.coin = 2;

    settleEconomyObligationCounterparty(state, {
      phase: "obligations",
      phase_sequence: 4,
      counterparty_kind: "liege",
      requested_amount: 1,
      rule_id: "obligations.liege_partial",
      related_actor_ids: ["p_liege", "p_head"]
    });
    resolveEconomyObligationGesture(state, {
      phase: "obligations",
      phase_sequence: 5,
      gesture_action: "gift_liege",
      decision: {
        amount: 2,
        payment_mode: "coin"
      },
      related_actor_ids: ["p_liege", "p_head"]
    });
    applyEconomyObligationEnterpriseSeizure(state, {
      phase: "obligations",
      phase_sequence: 6,
      counterparty_kind: "liege",
      requested_amount: 3,
      cap_amount: 3,
      rule_id: "enforcement.seizure.liege_followup",
      related_actor_ids: ["p_liege", "p_head"]
    });

    const liegeSummary = buildEconomyObligationsView(state).counterparty_summaries[0]!;
    const paymentGroup = liegeSummary.receipt_groups.find((group) => group.group_kind === "payment");
    const seizureGroup = liegeSummary.receipt_groups.find((group) => group.group_kind === "seizure");

    expect(paymentGroup?.receipts.map((receipt) => receipt.category)).toEqual(
      expect.arrayContaining(["obligation.liege_settlement", "gift.liege"])
    );
    expect(seizureGroup?.receipt_count).toBeGreaterThan(0);
    expect(seizureGroup?.receipts.every((receipt) => receipt.category === "enforcement.seizure")).toBe(true);
  });

  it("rebases a dead liege collector to the current living house successor", () => {
    const state = mkState();
    const liegeSuccessor = mkPerson("p_liege_successor", "Lady Westmarch", "F", 28);
    state.manor.obligations.tax_due_coin = 4;
    state.manor.obligations.arrears.coin = 2;
    state.locals.liege.alive = false;

    (state as any).people = {
      [state.locals.liege.id]: { ...state.locals.liege },
      [liegeSuccessor.id]: liegeSuccessor
    };
    (state as any).houses = {
      h_liege: {
        house_name: "House Westmarch",
        head_id: state.locals.liege.id,
        spouse_id: null,
        child_ids: [liegeSuccessor.id],
        member_person_ids: [state.locals.liege.id, liegeSuccessor.id]
      }
    };
    liegeSuccessor.house_id = "h_liege";
    liegeSuccessor.residence_house_id = "h_liege";

    const liegeSummary = buildEconomyObligationsView(state).counterparty_summaries[0]!;

    expect(liegeSummary).toMatchObject({
      counterparty_kind: "liege",
      counterparty_id: "p_liege_successor",
      counterparty_label: "Lady Westmarch (current liege)",
      counterparty_actor_kind: "person",
      collector_state: "successor",
      collector_successor_label: "Lady Westmarch",
      collector_summary: "Lady Westmarch now collects liege dues after House Liege died.",
      due_amount: 4,
      arrears_amount: 2,
      settlement_summary: "Lady Westmarch (current liege): 2 coin in arrears, 4 coin due."
    });
  });

  it("rebases a dead clergy collector to the parish institution when no living priest is available", () => {
    const state = mkState();
    state.manor.obligations.tithe_due_bushels = 5;
    state.manor.obligations.arrears.bushels = 3;
    state.locals.clergy.alive = false;

    (state as any).people = {
      [state.locals.clergy.id]: { ...state.locals.clergy }
    };
    (state as any).institutions = {
      parish_st_cuthbert: {
        id: "parish_st_cuthbert",
        type: "parish",
        name: "St. Cuthbert Parish",
        patron_actor_id: { kind: "house", id: "h_player" },
        priest_person_id: state.locals.clergy.id
      }
    };
    (state as any).locals.parish_institution_id = "parish_st_cuthbert";

    const churchSummary = buildEconomyObligationsView(state).counterparty_summaries[1]!;

    expect(churchSummary).toMatchObject({
      counterparty_kind: "church",
      counterparty_id: "parish_st_cuthbert",
      counterparty_label: "St. Cuthbert Parish (Vacant)",
      counterparty_actor_kind: "institution",
      collector_state: "vacant",
      collector_successor_label: "St. Cuthbert Parish",
      collector_summary: "St. Cuthbert Parish has no living priest; dues remain with the institution until a successor is placed.",
      due_amount: 5,
      arrears_amount: 3,
      settlement_summary: "St. Cuthbert Parish (Vacant): 3 bushels in arrears, 5 bushels due."
    });
  });
});
