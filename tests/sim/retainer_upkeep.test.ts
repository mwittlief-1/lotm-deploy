import { describe, expect, it } from "vitest";

import type { Person, RunState } from "../../src/sim/types";
import { readLedgerReceiptSnapshots } from "../../src/sim/domains/economy/ledger";
import {
  applyCourtRetainerUpkeepScaffold,
  COURT_RETAINER_UPKEEP_SCAFFOLD_SCHEMA_VERSION,
  listCourtRetainerUpkeepScaffolds,
} from "../../src/sim/domains/economy/retainerUpkeep";
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
  const head = mkPerson("p_head", "M", 42);
  const liege = mkPerson("p_liege", "M", 51);
  const clergy = mkPerson("p_clergy", "M", 46);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "retainer_upkeep_seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 0,
      bushels_stored: 40,
      meat_stores: 0,
      coin: 8,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null,
      },
    },
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
    people: {
      [head.id]: head,
      [liege.id]: liege,
      [clergy.id]: clergy,
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: null,
        child_ids: [],
        member_person_ids: [head.id],
      },
    },
    player_house_id: "h_player",
    kinship_edges: [],
    game_over: null,
  };
}

describe("court retainer upkeep", () => {
  it("builds upkeep scaffolds only for non-family retainers", () => {
    const state = mkState();
    const retainerClerk = mkPerson("p_retainer_clerk", "F", 29);
    (state as any).people.p_retainer_clerk = retainerClerk;
    (state as any).houses.h_player.court_officers = {
      steward: "p_head",
      clerk: "p_retainer_clerk",
    };

    expect(listCourtRetainerUpkeepScaffolds(state, "events", 2)).toEqual([
      {
        schema_version: COURT_RETAINER_UPKEEP_SCAFFOLD_SCHEMA_VERSION,
        scaffold_id: "retainer_upkeep:events:p2:clerk:p_retainer_clerk",
        phase: "events",
        phase_sequence: 2,
        seat_id: "house:house:h_player:clerk",
        seat_key: "clerk",
        holder_person_id: "p_retainer_clerk",
        amount: 1,
        category: "expense.household_admin",
        counterparty_kind: "household",
        counterparty_id: "retainer:p_retainer_clerk",
        counterparty_label: "Clerk",
        summary_label: "Clerk",
        rule_id: "court.retainer_upkeep.clerk",
        related_actor_ids: ["p_retainer_clerk"],
      },
    ]);
  });

  it("applies retainer upkeep through canonical coin receipts", () => {
    const state = mkState();
    const retainerClerk = mkPerson("p_retainer_clerk", "F", 29);
    (state as any).people.p_retainer_clerk = retainerClerk;
    (state as any).houses.h_player.court_officers = {
      steward: "p_head",
      clerk: "p_retainer_clerk",
    };

    const [scaffold] = listCourtRetainerUpkeepScaffolds(state, "events", 2);

    expect(scaffold).toBeTruthy();
    expect(applyCourtRetainerUpkeepScaffold(state, scaffold!)).toBe(1);
    expect(state.manor.coin).toBe(7);
    expect(readLedgerReceiptSnapshots(state)).toEqual([
      expect.objectContaining({
        receipt_id: "ledger:t1:events:p2:coin:0001",
        category: "expense.household_admin",
        counterparty_kind: "household",
        counterparty_id: "retainer:p_retainer_clerk",
        counterparty_label: "Clerk",
        asset: "coin",
        delta: -1,
        balance_after: 7,
        summary: "Clerk retainer upkeep paid 1 coin.",
        rule_id: "court.retainer_upkeep.clerk",
        related_actor_ids: ["p_retainer_clerk"],
      }),
    ]);
  });
});
