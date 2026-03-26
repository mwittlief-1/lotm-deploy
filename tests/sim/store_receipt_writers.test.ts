import { describe, expect, it } from "vitest";

import {
  foodStoreBalance,
  meatStoreBalance,
  readLedgerReceiptSnapshots
} from "../../src/sim/domains/economy/ledger";
import {
  buildEconomyProductionRegistry,
  makeEconomyProductionSourceKey
} from "../../src/sim/domains/economy/productionRegistry";
import {
  FISCAL_SETTLEMENT_SCAFFOLD_FIELDS,
  FISCAL_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION,
  applyEconomyProductionReceiptEntry,
  applyFiscalSettlementScaffold,
  makeFiscalSettlementScaffold,
  serializeFiscalSettlementScaffoldSnapshot
} from "../../src/sim/domains/economy/storeReceiptWriters";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 40);
  const spouse = mkPerson("p_spouse", "F", 38);
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

describe("store receipt writers", () => {
  it("routes production food and meat deltas through canonical receipt-writer summaries", () => {
    const state = mkState();
    const registry = buildEconomyProductionRegistry({
      turn: state.turn_index,
      food_stores_before: state.manor.bushels_stored,
      meat_stores_before: state.manor.meat_stores,
      grain_production_bushels: 24,
      hunting_meat_units: 9
    });

    expect(
      applyEconomyProductionReceiptEntry(
        state,
        registry.entries_by_key[makeEconomyProductionSourceKey("demesne_grain", "food_stores")],
        { phase: "consumption", phase_sequence: 1, related_actor_ids: ["p_head", "p_clergy"] }
      )
    ).toBe(24);
    expect(
      applyEconomyProductionReceiptEntry(
        state,
        registry.entries_by_key[makeEconomyProductionSourceKey("hunting", "meat_stores")],
        { phase: "consumption", phase_sequence: 1, related_actor_ids: ["p_head", "p_liege"] }
      )
    ).toBe(9);

    expect(foodStoreBalance(state)).toBe(74);
    expect(meatStoreBalance(state)).toBe(15);

    expect(readLedgerReceiptSnapshots(state)).toEqual([
      expect.objectContaining({
        receipt_id: "ledger:t1:consumption:p1:food_stores:0001",
        category: "income.demesne_surplus",
        counterparty_kind: "self",
        counterparty_id: "manor:demesne",
        counterparty_label: "Demesne",
        asset: "food_stores",
        delta: 24,
        balance_after: 74,
        summary: "Production from Demesne grain recorded in food stores.",
        rule_id: "production.demesne_grain",
        related_actor_ids: ["p_clergy", "p_head"]
      }),
      expect.objectContaining({
        receipt_id: "ledger:t1:consumption:p1:meat_stores:0002",
        category: "income.demesne_surplus",
        counterparty_kind: "self",
        counterparty_id: "manor:demesne",
        counterparty_label: "Demesne",
        asset: "meat_stores",
        delta: 9,
        balance_after: 15,
        summary: "Production from Hunting recorded in meat stores.",
        rule_id: "production.hunting",
        related_actor_ids: ["p_head", "p_liege"]
      })
    ]);
  });

  it("builds deterministic settlement scaffolds for non-coin accepted payment modes", () => {
    const serviceScaffold = makeFiscalSettlementScaffold({
      phase: "obligations",
      phase_sequence: 5,
      contract_id: "extraordinary_levy",
      counterparty_id: "house:liege",
      counterparty_label: "House Liege",
      selected_payment_mode: "service_placeholder",
      amount: 3.9,
      rule_id: "obligations.levy_service",
      related_actor_ids: ["p_liege", "p_head"]
    });
    const meatScaffold = makeFiscalSettlementScaffold({
      phase: "obligations",
      phase_sequence: 4,
      contract_id: "liege_due",
      counterparty_id: "house:liege",
      counterparty_label: "House Liege",
      selected_payment_mode: "meat_stores",
      amount: 4.2,
      rule_id: "obligations.liege_meat",
      related_actor_ids: ["p_head", "p_liege"]
    });

    expect(Object.keys(serviceScaffold)).toEqual([...FISCAL_SETTLEMENT_SCAFFOLD_FIELDS]);
    expect(serviceScaffold.schema_version).toBe(FISCAL_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION);
    expect(serviceScaffold.accepted_payment_modes).toEqual([
      "coin",
      "food_stores",
      "meat_stores",
      "service_placeholder"
    ]);
    expect(serviceScaffold.selected_payment_mode).toBe("service_placeholder");
    expect(serviceScaffold.runtime_asset_path).toBeNull();
    expect(serviceScaffold.service_hook).toBe("placeholder_only");
    expect(serviceScaffold.amount).toBe(3);
    expect(serviceScaffold.related_actor_ids).toEqual(["p_head", "p_liege"]);

    const one = serializeFiscalSettlementScaffoldSnapshot([serviceScaffold, meatScaffold]);
    const two = serializeFiscalSettlementScaffoldSnapshot([
      makeFiscalSettlementScaffold({
        phase: "obligations",
        phase_sequence: 4,
        contract_id: "liege_due",
        counterparty_id: "house:liege",
        counterparty_label: "House Liege",
        selected_payment_mode: "meat_stores",
        amount: 4.2,
        rule_id: "obligations.liege_meat",
        related_actor_ids: ["p_liege", "p_head"]
      }),
      makeFiscalSettlementScaffold({
        phase: "obligations",
        phase_sequence: 5,
        contract_id: "extraordinary_levy",
        counterparty_id: "house:liege",
        counterparty_label: "House Liege",
        selected_payment_mode: "service_placeholder",
        amount: 3.9,
        rule_id: "obligations.levy_service",
        related_actor_ids: ["p_head", "p_liege"]
      })
    ]);

    expect(one).toBe(two);
  });

  it("executes meat-store settlement scaffolds without splitting receipt ownership from the mutation", () => {
    const state = mkState();
    const scaffold = makeFiscalSettlementScaffold({
      phase: "obligations",
      phase_sequence: 4,
      contract_id: "liege_due",
      counterparty_id: "house:liege",
      counterparty_label: "House Liege",
      selected_payment_mode: "meat_stores",
      amount: 4.7,
      rule_id: "obligations.liege_meat",
      related_actor_ids: ["p_liege", "p_head"]
    });

    expect(applyFiscalSettlementScaffold(state, scaffold)).toBe(4);
    expect(meatStoreBalance(state)).toBe(2);

    expect(readLedgerReceiptSnapshots(state)).toEqual([
      expect.objectContaining({
        receipt_id: "ledger:t1:obligations:p4:meat_stores:0001",
        category: "obligation.liege_settlement",
        counterparty_kind: "liege",
        counterparty_id: "house:liege",
        counterparty_label: "House Liege",
        asset: "meat_stores",
        delta: -4,
        balance_after: 2,
        summary: "Settlement drew down meat stores for House Liege.",
        rule_id: "obligations.liege_meat",
        related_actor_ids: ["p_head", "p_liege"]
      })
    ]);
  });
});
