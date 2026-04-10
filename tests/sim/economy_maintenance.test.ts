import { describe, expect, it } from "vitest";

import { coinBalance, readLedgerReceiptSnapshots } from "../../src/sim/domains/economy/ledger";
import {
  ECONOMY_MAINTENANCE_APPLY_RESULT_SCHEMA_VERSION,
  ECONOMY_MAINTENANCE_REGISTRY_SCHEMA_VERSION,
  ECONOMY_MAINTENANCE_VIEW_SCHEMA_VERSION,
  applyEconomyMaintenanceCoinCosts,
  buildEconomyMaintenanceRegistry,
  buildEconomyMaintenanceView,
  serializeEconomyMaintenanceRegistry,
  serializeEconomyMaintenanceView
} from "../../src/sim/domains/economy/maintenance";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";
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
      coin: 5,
      unrest: 12,
      improvements: ["watch_ward", "granary_upgrade"],
      construction: {
        improvement_id: "drainage_ditches",
        progress: 20,
        required: 60
      },
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

describe("economy maintenance", () => {
  it("builds a deterministic maintenance registry and bounded manor summary keyed by manor", () => {
    const state = mkState();

    const registry = buildEconomyMaintenanceRegistry(state);
    const view = buildEconomyMaintenanceView(state);
    const manorKey = registry.manor_keys[0]!;
    const row = registry.manor_rows_by_key[manorKey];
    const summary = view.manor_summaries_by_key[manorKey]!;
    const snapshot = boundedSnapshot(state) as any;

    expect(registry.schema_version).toBe(ECONOMY_MAINTENANCE_REGISTRY_SCHEMA_VERSION);
    expect(view.schema_version).toBe(ECONOMY_MAINTENANCE_VIEW_SCHEMA_VERSION);
    expect(serializeEconomyMaintenanceRegistry(registry)).toBe(serializeEconomyMaintenanceRegistry(registry));
    expect(serializeEconomyMaintenanceView(view)).toBe(serializeEconomyMaintenanceView(view));
    expect(registry.manor_keys).toEqual([manorKey]);
    expect(row).toMatchObject({
      manor_id: "manor_hx_26597",
      totals: {
        coin_cost: 8,
        labor_required: 10,
        building_coin_cost: 4,
        building_labor_required: 3,
        franchise_right_coin_cost: 4,
        franchise_right_labor_required: 4,
        service_right_coin_cost: 0,
        service_right_labor_required: 3,
        building_count: 2,
        right_count: 7,
        entry_count: 9
      },
      active_project: {
        improvement_id: "drainage_ditches",
        improvement_label: "Drainage & Ditches",
        progress: 20,
        required: 60,
        remaining: 40
      }
    });
    expect(summary.building_entries.map((entry) => entry.source_id)).toEqual([
      "granary_upgrade",
      "watch_ward"
    ]);
    expect(summary.right_entries.map((entry) => entry.source_id)).toEqual([
      "bridge_or_crossing_revenue",
      "fair_right",
      "market_right",
      "toll_right",
      "court_attendance",
      "servitium_regis",
      "temporal_service"
    ]);
    expect(summary.totals.labor_required).toBe(10);
    expect(snapshot.economy_maintenance_view).toMatchObject({
      schema_version: "economy_maintenance_view_v1",
      manor_keys: [manorKey],
      manor_summaries_by_key: {
        [manorKey]: {
          manor_id: "manor_hx_26597",
          totals: {
            coin_cost: 8,
            labor_required: 10
          }
        }
      }
    });
  });

  it("applies recurring maintenance coin costs through canonical ledger receipts while preserving labor audit data", () => {
    const state = mkState();
    const registry = buildEconomyMaintenanceRegistry(state);

    const result = applyEconomyMaintenanceCoinCosts(state, {
      phase: "events",
      phase_sequence: 4,
      registry,
      related_actor_ids: ["p_liege"]
    });

    expect(result.schema_version).toBe(ECONOMY_MAINTENANCE_APPLY_RESULT_SCHEMA_VERSION);
    expect(result.applied_entry_order).toEqual([
      "maintenance:building:granary_upgrade",
      "maintenance:building:watch_ward",
      "maintenance:right:franchise:bridge_or_crossing_revenue",
      "maintenance:right:franchise:fair_right",
      "maintenance:right:franchise:market_right",
      "maintenance:right:franchise:toll_right"
    ]);
    expect(result).toMatchObject({
      total_requested_coin_cost: 8,
      total_paid_coin_cost: 5,
      total_shortfall_coin_cost: 3
    });
    expect(result.applied_entries_by_id["maintenance:right:franchise:fair_right"]).toMatchObject({
      requested_coin_cost: 1,
      paid_coin_cost: 0,
      shortfall_coin_cost: 1
    });
    expect(result.receipt_snapshots.map((receipt) => ({
      category: receipt.category,
      counterparty_id: receipt.counterparty_id,
      asset: receipt.asset,
      delta: receipt.delta,
      rule_id: receipt.rule_id,
      related_actor_ids: receipt.related_actor_ids
    }))).toEqual([
      {
        category: "expense.maintenance",
        counterparty_id: "maintenance:building:granary_upgrade",
        asset: "coin",
        delta: -2,
        rule_id: "maintenance.building.granary_upgrade",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        category: "expense.maintenance",
        counterparty_id: "maintenance:building:watch_ward",
        asset: "coin",
        delta: -2,
        rule_id: "maintenance.building.watch_ward",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        category: "expense.maintenance",
        counterparty_id: "maintenance:right:franchise:bridge_or_crossing_revenue",
        asset: "coin",
        delta: -1,
        rule_id: "maintenance.right.franchise.bridge_or_crossing_revenue",
        related_actor_ids: ["p_head", "p_liege"]
      }
    ]);
    expect(readLedgerReceiptSnapshots(state)).toEqual(result.receipt_snapshots);
    expect(coinBalance(state)).toBe(0);
    expect(registry.manor_rows_by_key[registry.manor_keys[0]!]?.totals.labor_required).toBe(10);
  });
});
