import { describe, expect, it } from "vitest";

import {
  arrearsBushels,
  arrearsCoin,
  coinBalance,
  readLedgerReceiptSnapshots,
  taxDueCoin,
  titheDueBushels
} from "../../src/sim/domains/economy/ledger";
import {
  ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
  buildEconomyObligationRegistryFromState,
  carryEconomyObligationCounterpartyIntoArrears,
  serializeEconomyObligationRegistry,
  settleEconomyObligationCounterparty
} from "../../src/sim/domains/economy/obligationRegistry";
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

describe("economy obligation registry", () => {
  it("builds deterministic per-counterparty snapshots from the legacy due and arrears slots", () => {
    const state = mkState();
    state.manor.obligations.tax_due_coin = 5;
    state.manor.obligations.tithe_due_bushels = 7;
    state.manor.obligations.arrears.coin = 2;
    state.manor.obligations.arrears.bushels = 3;

    const registryA = buildEconomyObligationRegistryFromState(state);
    const registryB = buildEconomyObligationRegistryFromState(state);

    expect(registryA.schema_version).toBe(ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION);
    expect(registryA.counterparty_keys).toEqual(["church", "liege"]);
    expect(serializeEconomyObligationRegistry(registryA)).toBe(serializeEconomyObligationRegistry(registryB));

    expect(registryA.counterparties_by_key.church).toEqual({
      schema_version: ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
      counterparty_kind: "church",
      counterparty_id: "p_clergy",
      counterparty_label: "Parish Church",
      contract_id: "church_due",
      due_asset: "tithe_due_bushels",
      arrears_asset: "arrears_bushels",
      due_amount: 7,
      arrears_amount: 3,
      accepted_payment_modes: ["coin", "food_stores"],
      supported_payment_modes: ["food_stores"],
      preferred_payment_mode: "food_stores",
      settlement_cadence_turns: 1,
      last_settled_turn_index: null,
      last_carried_turn_index: null
    });
    expect(registryA.counterparties_by_key.liege).toEqual({
      schema_version: ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
      counterparty_kind: "liege",
      counterparty_id: "p_liege",
      counterparty_label: "House Liege",
      contract_id: "liege_due",
      due_asset: "tax_due_coin",
      arrears_asset: "arrears_coin",
      due_amount: 5,
      arrears_amount: 2,
      accepted_payment_modes: ["coin", "food_stores", "meat_stores"],
      supported_payment_modes: ["coin"],
      preferred_payment_mode: "coin",
      settlement_cadence_turns: 1,
      last_settled_turn_index: null,
      last_carried_turn_index: null
    });
  });

  it("settles each counterparty at most once per turn without blocking the other counterparty", () => {
    const state = mkState();
    state.manor.obligations.tax_due_coin = 8;
    state.manor.obligations.tithe_due_bushels = 6;
    state.manor.obligations.arrears.coin = 1;
    state.manor.obligations.arrears.bushels = 2;

    const liegeSettlement = settleEconomyObligationCounterparty(state, {
      phase: "obligations",
      phase_sequence: 4,
      counterparty_kind: "liege",
      requested_amount: 6,
      rule_id: "obligations.liege_native",
      related_actor_ids: ["p_liege", "p_head"]
    });
    const repeatLiegeSettlement = settleEconomyObligationCounterparty(state, {
      phase: "obligations",
      phase_sequence: 5,
      counterparty_kind: "liege",
      requested_amount: 2,
      rule_id: "obligations.liege_repeat",
      related_actor_ids: ["p_head", "p_liege"]
    });
    const churchSettlement = settleEconomyObligationCounterparty(state, {
      phase: "obligations",
      phase_sequence: 6,
      counterparty_kind: "church",
      requested_amount: 5,
      rule_id: "obligations.church_native",
      related_actor_ids: ["p_clergy", "p_head"]
    });

    expect(liegeSettlement).toMatchObject({
      counterparty_kind: "liege",
      reason: "applied",
      paid_amount: 6,
      paid_to_arrears: 1,
      paid_to_due: 5,
      blocked: false
    });
    expect(repeatLiegeSettlement).toMatchObject({
      counterparty_kind: "liege",
      reason: "already_settled_this_turn",
      paid_amount: 0,
      blocked: true
    });
    expect(churchSettlement).toMatchObject({
      counterparty_kind: "church",
      reason: "applied",
      paid_amount: 5,
      paid_to_arrears: 2,
      paid_to_due: 3,
      blocked: false
    });

    expect(coinBalance(state)).toBe(6);
    expect(state.manor.bushels_stored).toBe(15);
    expect(taxDueCoin(state)).toBe(3);
    expect(titheDueBushels(state)).toBe(3);
    expect(arrearsCoin(state)).toBe(0);
    expect(arrearsBushels(state)).toBe(0);

    const registry = buildEconomyObligationRegistryFromState(state);
    expect(registry.counterparties_by_key.liege.last_settled_turn_index).toBe(1);
    expect(registry.counterparties_by_key.church.last_settled_turn_index).toBe(1);
  });

  it("rolls unpaid liege dues into arrears deterministically when coin is short", () => {
    const state = mkState();
    state.manor.coin = 4;
    state.manor.obligations.tax_due_coin = 9;
    state.manor.obligations.arrears.coin = 1;

    const settlement = settleEconomyObligationCounterparty(state, {
      phase: "obligations",
      phase_sequence: 2,
      counterparty_kind: "liege",
      rule_id: "obligations.liege_settlement",
      related_actor_ids: ["p_liege", "p_head"]
    });
    const carry = carryEconomyObligationCounterpartyIntoArrears(state, {
      phase: "succession",
      phase_sequence: 9,
      counterparty_kind: "liege",
      rule_id: "obligations.liege_carry",
      related_actor_ids: ["p_head", "p_liege"]
    });
    const repeatCarry = carryEconomyObligationCounterpartyIntoArrears(state, {
      phase: "succession",
      phase_sequence: 10,
      counterparty_kind: "liege",
      rule_id: "obligations.liege_carry_repeat",
      related_actor_ids: ["p_head", "p_liege"]
    });

    expect(settlement).toMatchObject({
      counterparty_kind: "liege",
      reason: "applied",
      paid_amount: 4,
      paid_to_arrears: 1,
      paid_to_due: 3,
      blocked: false
    });
    expect(carry).toMatchObject({
      counterparty_kind: "liege",
      reason: "applied",
      carried_amount: 6,
      blocked: false
    });
    expect(repeatCarry).toMatchObject({
      counterparty_kind: "liege",
      reason: "already_carried_this_turn",
      carried_amount: 0,
      blocked: true
    });

    expect(coinBalance(state)).toBe(0);
    expect(taxDueCoin(state)).toBe(0);
    expect(arrearsCoin(state)).toBe(6);

    expect(
      readLedgerReceiptSnapshots(state).map((receipt) => ({
        asset: receipt.asset,
        delta: receipt.delta,
        rule_id: receipt.rule_id,
        counterparty_kind: receipt.counterparty_kind,
        counterparty_id: receipt.counterparty_id,
        related_actor_ids: receipt.related_actor_ids
      }))
    ).toEqual([
      {
        asset: "arrears_coin",
        delta: -1,
        rule_id: "obligations.liege_settlement",
        counterparty_kind: "liege",
        counterparty_id: "p_liege",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        asset: "coin",
        delta: -4,
        rule_id: "obligations.liege_settlement",
        counterparty_kind: "liege",
        counterparty_id: "p_liege",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        asset: "tax_due_coin",
        delta: -3,
        rule_id: "obligations.liege_settlement",
        counterparty_kind: "liege",
        counterparty_id: "p_liege",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        asset: "arrears_coin",
        delta: 6,
        rule_id: "obligations.liege_carry.credit",
        counterparty_kind: "liege",
        counterparty_id: "p_liege",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        asset: "tax_due_coin",
        delta: -6,
        rule_id: "obligations.liege_carry.debit",
        counterparty_kind: "liege",
        counterparty_id: "p_liege",
        related_actor_ids: ["p_head", "p_liege"]
      }
    ]);
  });
});
