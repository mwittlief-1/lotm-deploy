import { describe, expect, it } from "vitest";

import type { RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import {
  COURT_DECISION_BUDGET_ACTIONS,
  COURT_DECISION_BUDGET_LIMIT,
  COURT_DECISION_BUDGET_SCHEMA_VERSION,
  COURT_DECISION_BUDGET_TURN_YEARS,
  availableCourtDecisionBudget,
  canChargeCourtDecisionBudget,
  chargeCourtDecisionBudget,
  chargeCourtDecisionBudgetRegistry,
  createCourtDecisionBudgetRegistry,
  ensureCourtDecisionBudgetRegistry,
  normalizeCourtDecisionBudgetRegistry,
  resetCourtDecisionBudgetRegistry
} from "../../src/sim/domains/court/decisionBudget";

function mkState(): RunState {
  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 50,
      coin: 10,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null
      }
    },
    house: {
      head: {
        id: "p_head",
        name: "Head",
        sex: "M",
        age: 40,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      },
      children: [],
      energy: { max: 3, available: 2 }
    },
    locals: {
      liege: {
        id: "p_liege",
        name: "Liege",
        sex: "M",
        age: 50,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      },
      clergy: {
        id: "p_clergy",
        name: "Clergy",
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

describe("court decision budget domain", () => {
  it("creates a stable six-decision registry shape for a three-year turn", () => {
    expect(COURT_DECISION_BUDGET_ACTIONS).toEqual([
      "gift_liege",
      "offering_church",
      "marriage_inbound",
      "marriage_scout"
    ]);

    expect(createCourtDecisionBudgetRegistry()).toEqual({
      schema_version: COURT_DECISION_BUDGET_SCHEMA_VERSION,
      turn_years: COURT_DECISION_BUDGET_TURN_YEARS,
      limit: COURT_DECISION_BUDGET_LIMIT,
      spent: 0,
      remaining: 6,
      exhausted: false,
      spent_by_action: {
        gift_liege: 0,
        offering_church: 0,
        marriage_inbound: 0,
        marriage_scout: 0
      }
    });
  });

  it("ensures the registry on house state with the canonical shape", () => {
    const state = mkState();

    expect(ensureCourtDecisionBudgetRegistry(state)).toEqual(createCourtDecisionBudgetRegistry());
    expect((state.house as any).court_decision_budget).toEqual(createCourtDecisionBudgetRegistry());
  });

  it("charges deterministic amounts by action and blocks overspend once exhausted", () => {
    const start = createCourtDecisionBudgetRegistry();
    const gift = chargeCourtDecisionBudgetRegistry(start, "gift_liege", 2);
    const scout = chargeCourtDecisionBudgetRegistry(gift.registry, "marriage_scout", 4);
    const blocked = chargeCourtDecisionBudgetRegistry(scout.registry, "offering_church", 1);

    expect(gift).toEqual({
      action: "gift_liege",
      requested: 2,
      charged: 2,
      applied: true,
      reason: "applied",
      registry: {
        schema_version: COURT_DECISION_BUDGET_SCHEMA_VERSION,
        turn_years: COURT_DECISION_BUDGET_TURN_YEARS,
        limit: COURT_DECISION_BUDGET_LIMIT,
        spent: 2,
        remaining: 4,
        exhausted: false,
        spent_by_action: {
          gift_liege: 2,
          offering_church: 0,
          marriage_inbound: 0,
          marriage_scout: 0
        }
      }
    });

    expect(scout.registry).toEqual({
      schema_version: COURT_DECISION_BUDGET_SCHEMA_VERSION,
      turn_years: COURT_DECISION_BUDGET_TURN_YEARS,
      limit: COURT_DECISION_BUDGET_LIMIT,
      spent: 6,
      remaining: 0,
      exhausted: true,
      spent_by_action: {
        gift_liege: 2,
        offering_church: 0,
        marriage_inbound: 0,
        marriage_scout: 4
      }
    });

    expect(blocked.applied).toBe(false);
    expect(blocked.reason).toBe("insufficient_budget");
    expect(blocked.registry).toEqual(scout.registry);
    expect(availableCourtDecisionBudget(blocked.registry)).toBe(0);
    expect(canChargeCourtDecisionBudget(blocked.registry, 1)).toBe(false);
  });

  it("normalizes stale values and resets once per three-year turn", () => {
    const normalized = normalizeCourtDecisionBudgetRegistry({
      spent_by_action: {
        gift_liege: 1.9,
        offering_church: -7,
        marriage_inbound: 2,
        marriage_scout: 1
      }
    });

    expect(normalized).toEqual({
      schema_version: COURT_DECISION_BUDGET_SCHEMA_VERSION,
      turn_years: COURT_DECISION_BUDGET_TURN_YEARS,
      limit: COURT_DECISION_BUDGET_LIMIT,
      spent: 4,
      remaining: 2,
      exhausted: false,
      spent_by_action: {
        gift_liege: 1,
        offering_church: 0,
        marriage_inbound: 2,
        marriage_scout: 1
      }
    });

    expect(resetCourtDecisionBudgetRegistry()).toEqual(createCourtDecisionBudgetRegistry());
  });

  it("updates the attached state registry without touching court energy", () => {
    const state = mkState();
    const beforeEnergy = { ...(state.house.energy as any) };
    const result = chargeCourtDecisionBudget(state, "marriage_inbound", 3);

    expect(result.applied).toBe(true);
    expect((state.house as any).court_decision_budget).toEqual(result.registry);
    expect(state.house.energy).toEqual(beforeEnergy);
  });
});
