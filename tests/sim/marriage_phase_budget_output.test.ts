import { describe, expect, it } from "vitest";

import {
  COURT_DECISION_BUDGET_ACTIONS,
  buildCourtDecisionBudgetView,
  ensureCourtDecisionBudgetRegistry
} from "../../src/sim/domains/court/decisionBudget";
import { applyMarriageDecisionPhase, buildMarriageWindowPhase } from "../../src/sim/phases/phase_marriage";
import type { MarriageWindow, Person, RunState, TurnContext } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, sex: "M" | "F", age: number, opts?: Partial<Person>): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    ...(opts ?? {})
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 40, { married: true });
  const spouse = mkPerson("p_spouse", "F", 38, { married: true });
  const child = mkPerson("p_child_1", "M", 18);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);
  const candidate = mkPerson("p_cand_a", "F", 19);
  const extHead = mkPerson("p_ext_head", "M", 46);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 9,
    manor: {
      population: 24,
      farmers: 12,
      builders: 0,
      bushels_stored: 80,
      meat_stores: 6,
      coin: 12,
      unrest: 0,
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
      children: [child],
      energy: { max: 3, available: 3 },
      heir_id: child.id
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: { MarriageOffer: true },
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [child.id]: child,
      [liege.id]: liege,
      [clergy.id]: clergy,
      [candidate.id]: candidate,
      [extHead.id]: extHead
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [child.id],
        member_person_ids: [head.id, spouse.id, child.id]
      },
      h_ext_01: {
        id: "h_ext_01",
        name: "Ashford",
        tier: "Baron",
        head_id: extHead.id,
        spouse_id: null,
        child_ids: [candidate.id],
        member_person_ids: [extHead.id, candidate.id]
      }
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }]
  } as any;
}

function mkReport(): TurnContext["report"] {
  return {
    turn_index: 9,
    weather_multiplier: 1,
    market: { price_per_bushel: 0.1, sell_cap_bushels: 0 },
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
    household: { births: [], deaths: [], population_delta: 0 },
    house_log: [],
    events: [],
    top_drivers: [],
    notes: []
  };
}

describe("marriage phase budget outputs", () => {
  it("attaches a deterministic court budget view to the preview marriage window", () => {
    const state = mkState();
    const marriageWindow = buildMarriageWindowPhase(state, null);

    expect(marriageWindow).not.toBeNull();
    expect((state.house as any).court_decision_budget).toEqual(ensureCourtDecisionBudgetRegistry(state));

    const budgetView = (marriageWindow as any).court_decision_budget;
    expect(budgetView).toEqual(buildCourtDecisionBudgetView(state));
    expect(budgetView.actions.map((entry: any) => entry.action)).toEqual([...COURT_DECISION_BUDGET_ACTIONS]);
    expect(budgetView.actions.map((entry: any) => entry.cost)).toEqual([1, 1, 1, 2]);
  });

  it("writes the ordered court budget summary into marriage-phase outputs", () => {
    const state = mkState();
    const marriageWindow = buildMarriageWindowPhase(state, null) as MarriageWindow;
    const ctx: TurnContext = {
      preview_state: state,
      report: mkReport(),
      marriage_window: marriageWindow,
      max_labor_shift: 0
    };
    const notes: string[] = [];

    applyMarriageDecisionPhase(
      state,
      ctx,
      { marriage: { kind: "marriage", action: "scout" } } as any,
      notes
    );

    expect((ctx.report as any).court_decision_budget).toEqual({
      schema_version: "court_decision_budget_view_v0",
      limit: 6,
      spent: 2,
      remaining: 4,
      exhausted: false,
      actions: [
        { action: "gift_liege", cost: 1, spent: 0 },
        { action: "offering_church", cost: 1, spent: 0 },
        { action: "marriage_inbound", cost: 1, spent: 0 },
        { action: "marriage_scout", cost: 2, spent: 2 }
      ]
    });
    expect((ctx.marriage_window as any).court_decision_budget).toEqual((ctx.report as any).court_decision_budget);
    expect(notes).toContain("Scouted prospects; next marriage window slightly improved.");
    expect(notes).toContain(
      "Court budget remaining 4/6; spent 2; actions gift_liege 0, offering_church 0, marriage_inbound 0, marriage_scout 2."
    );
  });
});
