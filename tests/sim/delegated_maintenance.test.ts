import { describe, expect, it } from "vitest";

import { buildCourtDelegationRegistry } from "../../src/sim/domains/court/delegationRegistry";
import {
  applyCourtMaintenanceScaffold,
  COURT_MAINTENANCE_SCAFFOLD_SCHEMA_VERSION,
  makeCourtMaintenanceScaffold,
} from "../../src/sim/domains/court/maintenance";
import { ensureCourtDecisionBudgetRegistry } from "../../src/sim/domains/court/decisionBudget";
import { coinBalance, readLedgerReceiptSnapshots } from "../../src/sim/domains/economy/ledger";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 40);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);

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
      meat_stores: 6,
      coin: 10,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null,
      },
    } as any,
    house: {
      head,
      spouse: null,
      spouse_status: "widow",
      children: [],
      energy: { max: 3, available: 3 },
      heir_id: null,
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: [],
  };
}

describe("court maintenance scaffold", () => {
  it("builds and applies a canonical maintenance coin expense", () => {
    const state = mkState();
    const scaffold = makeCourtMaintenanceScaffold(state, {
      phase: "events",
      phase_sequence: 2,
      amount: 5.9,
      rule_id: "maintenance.base",
      related_actor_ids: ["p_liege", "p_head"],
    });

    expect(scaffold).toEqual({
      schema_version: COURT_MAINTENANCE_SCAFFOLD_SCHEMA_VERSION,
      scaffold_id: "maintenance:events:p2:maintenance.base",
      phase: "events",
      phase_sequence: 2,
      category: "expense.maintenance",
      counterparty_kind: "self",
      counterparty_id: "manor:maintenance",
      counterparty_label: "Maintenance",
      summary_label: "Maintenance",
      amount: 5,
      delegated: false,
      rule_id: "maintenance.base",
      related_actor_ids: ["p_head", "p_liege"],
    });

    expect(applyCourtMaintenanceScaffold(state, scaffold)).toBe(5);
    expect(coinBalance(state)).toBe(5);
    expect(readLedgerReceiptSnapshots(state)).toEqual([
      expect.objectContaining({
        receipt_id: "ledger:t1:events:p2:coin:0001",
        category: "expense.maintenance",
        counterparty_kind: "self",
        counterparty_id: "manor:maintenance",
        counterparty_label: "Maintenance",
        asset: "coin",
        delta: -5,
        balance_after: 5,
        summary: "Maintenance paid 5 coin for manor upkeep.",
        rule_id: "maintenance.base",
        related_actor_ids: ["p_head", "p_liege"],
      }),
    ]);
  });

  it("applies delegated maintenance efficiency without consuming court budget", () => {
    const state = mkState();
    (state.house as any).court_delegation_registry = buildCourtDelegationRegistry([
      {
        action: "maintenance",
        delegated: true,
        effect: {
          amount_multiplier_pct: 60,
        },
      },
    ]);

    const scaffold = makeCourtMaintenanceScaffold(state, {
      phase: "events",
      phase_sequence: 3,
      amount: 5,
      rule_id: "maintenance.delegated",
      related_actor_ids: ["p_head"],
    });

    expect(scaffold.delegated).toBe(true);
    expect(scaffold.amount).toBe(3);
    expect(applyCourtMaintenanceScaffold(state, scaffold)).toBe(3);
    expect(coinBalance(state)).toBe(7);
    expect(ensureCourtDecisionBudgetRegistry(state)).toMatchObject({
      spent: 0,
      remaining: 6,
      spent_by_action: {
        gift_liege: 0,
        offering_church: 0,
        marriage_inbound: 0,
        marriage_scout: 0,
      },
    });
  });
});
