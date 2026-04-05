import { describe, expect, it } from "vitest";

import { FISCAL_LEDGER_RUNTIME_ASSET_PATHS } from "../../src/sim/domains/economy/schema";
import {
  ECONOMY_FISCAL_TUNING_TABLE,
  ECONOMY_FISCAL_TUNING_TABLE_SCHEMA_VERSION,
  ECONOMY_FISCAL_TUNING_SECTION_KEYS,
  ECONOMY_TUNING_MAINTENANCE_ENTRY_KEYS,
  ECONOMY_TUNING_PRICE_KEYS,
  buildEconomyFiscalTuningTableSnapshot,
  economyObligationSettlementCadenceTurns,
  economyObligationStageOneRelationshipDelta,
  economyStableUnrestReliefWhenClear,
  serializeEconomyFiscalTuningTableSnapshot
} from "../../src/sim/domains/economy/tuningTable";

describe("economy fiscal tuning table", () => {
  it("locks the shipped tuning baseline and placeholder maintenance hooks", () => {
    const snapshot = buildEconomyFiscalTuningTableSnapshot();

    expect(snapshot.schema_version).toBe(ECONOMY_FISCAL_TUNING_TABLE_SCHEMA_VERSION);
    expect(snapshot.sections).toEqual([...ECONOMY_FISCAL_TUNING_SECTION_KEYS]);
    expect(snapshot.obligations).toMatchObject({
      settlement_cadence_turns: 1,
      stable_unrest_relief_when_clear: 2,
      stage_two_placeholder_caps: {
        enterprise_seizure_turn_cap_coin: null,
        forced_church_food_turn_cap: null
      }
    });
    expect(snapshot.maintenance.entries.map((entry) => entry.key)).toEqual([
      ...ECONOMY_TUNING_MAINTENANCE_ENTRY_KEYS
    ]);
    expect(snapshot.maintenance.entries.map((entry) => entry.status)).toEqual([
      "taxonomy_only",
      "taxonomy_only",
      "taxonomy_only",
      "placeholder",
      "placeholder",
      "placeholder"
    ]);
    expect(snapshot.pricing.price_keys).toEqual([...ECONOMY_TUNING_PRICE_KEYS]);
    expect(snapshot.pricing.price_table.food_stores_market_sell).toMatchObject({
      quote_amount: 1,
      base_amount: 10,
      runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.food_stores
    });
    expect(snapshot.consumption).toMatchObject({
      bushels_per_person_per_year: 12,
      builder_extra_bushels_per_year: 1,
      turn_years: 3,
      meat_target_bps: { peasant: 100, court: 500 }
    });
    expect(snapshot.production).toMatchObject({
      turn_years: 3,
      hunting: {
        idle_worker_turn_years_divisor: 2,
        martial_bonus_threshold: 2,
        martial_bonus_divisor: 3
      }
    });
  });

  it("exposes obligation helper values through the central table", () => {
    expect(economyObligationSettlementCadenceTurns()).toBe(1);
    expect(economyStableUnrestReliefWhenClear()).toBe(2);
    expect(economyObligationStageOneRelationshipDelta("church", "clear")).toEqual({ respect: 1, threat: 0 });
    expect(economyObligationStageOneRelationshipDelta("church", "arrears")).toEqual({ respect: -1, threat: 1 });
    expect(economyObligationStageOneRelationshipDelta("liege", "clear")).toEqual({ respect: 1, threat: -1 });
    expect(economyObligationStageOneRelationshipDelta("liege", "arrears")).toEqual({ respect: -1, threat: 1 });
  });

  it("serializes deterministically across repeated builds", () => {
    const one = serializeEconomyFiscalTuningTableSnapshot(buildEconomyFiscalTuningTableSnapshot());
    const two = serializeEconomyFiscalTuningTableSnapshot(buildEconomyFiscalTuningTableSnapshot());

    expect(one).toBe(two);
    expect(JSON.parse(one)).toMatchObject({
      schema_version: ECONOMY_FISCAL_TUNING_TABLE_SCHEMA_VERSION,
      sections: [...ECONOMY_FISCAL_TUNING_SECTION_KEYS]
    });
    expect(ECONOMY_FISCAL_TUNING_TABLE.pricing.price_keys).toEqual([...ECONOMY_TUNING_PRICE_KEYS]);
  });
});
