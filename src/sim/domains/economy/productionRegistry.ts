import type { RunState } from "../../types";
import { meatStoreBalance, trackedStoreBalance } from "./ledger";
import { ECONOMY_FISCAL_TUNING_TABLE } from "./tuningTable";

export const ECONOMY_PRODUCTION_REGISTRY_SCHEMA_VERSION = "economy_production_registry_v1" as const;
export const ECONOMY_PRODUCTION_SUMMARY_SCHEMA_VERSION = "economy_production_summary_v1" as const;
export const ECONOMY_PRODUCTION_SOURCE_KINDS = ["demesne_grain", "hunting"] as const;
export const HUNTING_PRODUCTION_RULE_ID = "production.hunting";
export const GRAIN_PRODUCTION_RULE_ID = "production.demesne_grain";

export type EconomyProductionSourceKindV1 = typeof ECONOMY_PRODUCTION_SOURCE_KINDS[number];
export type EconomyProductionAssetV1 = "food_stores" | "meat_stores";

export interface EconomyProductionRegistryEntryV1 {
  schema_version: typeof ECONOMY_PRODUCTION_REGISTRY_SCHEMA_VERSION;
  source_key: string;
  source_kind: EconomyProductionSourceKindV1;
  asset: EconomyProductionAssetV1;
  turn: number;
  delta: number;
  balance_before: number;
  balance_after: number;
  summary: string;
  rule_id: string;
}

export interface EconomyProductionRegistryV1 {
  schema_version: typeof ECONOMY_PRODUCTION_REGISTRY_SCHEMA_VERSION;
  source_keys: string[];
  entries_by_key: Record<string, EconomyProductionRegistryEntryV1>;
  totals_by_asset: Record<EconomyProductionAssetV1, number>;
}

export interface EconomyProductionSummaryV1 {
  schema_version: typeof ECONOMY_PRODUCTION_SUMMARY_SCHEMA_VERSION;
  turn: number;
  food_stores_before: number;
  food_stores_after: number;
  meat_stores_before: number;
  meat_stores_after: number;
  food_delta: number;
  meat_delta: number;
  summary_lines: string[];
}

export interface EconomyProductionOutputsV1 {
  registry: EconomyProductionRegistryV1;
  summary: EconomyProductionSummaryV1;
}

export interface EconomyProductionRegistryInputV1 {
  turn: number;
  food_stores_before: number;
  meat_stores_before: number;
  grain_production_bushels: number;
  hunting_meat_units: number;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function normalizedNonNegative(value: number): number {
  return Math.max(0, normalizeInteger(value));
}

export function makeEconomyProductionSourceKey(
  sourceKind: EconomyProductionSourceKindV1,
  asset: EconomyProductionAssetV1
): string {
  return `production:${asset}:${sourceKind}`;
}

export function deterministicHuntingYieldForState(state: RunState): number {
  const idleWorkers = Math.max(0, normalizeInteger(state.manor.population) - normalizeInteger(state.manor.farmers) - normalizeInteger(state.manor.builders));
  const headMartial = Math.max(0, normalizeInteger(state.house.head?.traits?.martial ?? 0));
  const baseYield = Math.floor(
    (idleWorkers * ECONOMY_FISCAL_TUNING_TABLE.production.turn_years) /
      ECONOMY_FISCAL_TUNING_TABLE.production.hunting.idle_worker_turn_years_divisor
  );
  const martialBonus = Math.floor(
    (idleWorkers *
      Math.max(0, headMartial - ECONOMY_FISCAL_TUNING_TABLE.production.hunting.martial_bonus_threshold)) /
      ECONOMY_FISCAL_TUNING_TABLE.production.hunting.martial_bonus_divisor
  );
  return normalizedNonNegative(baseYield + martialBonus);
}

function createEconomyProductionEntry(args: {
  turn: number;
  source_kind: EconomyProductionSourceKindV1;
  asset: EconomyProductionAssetV1;
  delta: number;
  balance_before: number;
}): EconomyProductionRegistryEntryV1 {
  const delta = normalizeInteger(args.delta);
  const balanceBefore = normalizedNonNegative(args.balance_before);
  const balanceAfter = normalizedNonNegative(balanceBefore + delta);
  const sourceKey = makeEconomyProductionSourceKey(args.source_kind, args.asset);
  const ruleId = args.source_kind === "hunting" ? HUNTING_PRODUCTION_RULE_ID : GRAIN_PRODUCTION_RULE_ID;
  const sourceLabel = args.source_kind === "hunting" ? "Hunting" : "Demesne grain";
  const assetLabel = args.asset === "meat_stores" ? "meat stores" : "food stores";

  return {
    schema_version: ECONOMY_PRODUCTION_REGISTRY_SCHEMA_VERSION,
    source_key: sourceKey,
    source_kind: args.source_kind,
    asset: args.asset,
    turn: normalizeInteger(args.turn),
    delta,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    summary: `${sourceLabel} ${delta >= 0 ? "+" : ""}${delta} ${assetLabel}; stores now ${balanceAfter}.`,
    rule_id: ruleId
  };
}

export function buildEconomyProductionRegistry(input: EconomyProductionRegistryInputV1): EconomyProductionRegistryV1 {
  const foodEntry = createEconomyProductionEntry({
    turn: input.turn,
    source_kind: "demesne_grain",
    asset: "food_stores",
    delta: input.grain_production_bushels,
    balance_before: input.food_stores_before
  });
  const meatEntry = createEconomyProductionEntry({
    turn: input.turn,
    source_kind: "hunting",
    asset: "meat_stores",
    delta: input.hunting_meat_units,
    balance_before: input.meat_stores_before
  });

  const entries = [foodEntry, meatEntry].sort((left, right) => compareText(left.source_key, right.source_key));
  const sourceKeys = entries.map((entry) => entry.source_key);
  const entriesByKey: Record<string, EconomyProductionRegistryEntryV1> = Object.fromEntries(
    entries.map((entry) => [entry.source_key, entry])
  );

  return {
    schema_version: ECONOMY_PRODUCTION_REGISTRY_SCHEMA_VERSION,
    source_keys: sourceKeys,
    entries_by_key: entriesByKey,
    totals_by_asset: {
      food_stores: normalizeInteger(foodEntry.delta),
      meat_stores: normalizeInteger(meatEntry.delta)
    }
  };
}

export function buildEconomyProductionSummary(registry: EconomyProductionRegistryV1): EconomyProductionSummaryV1 {
  const foodEntry = registry.entries_by_key[makeEconomyProductionSourceKey("demesne_grain", "food_stores")];
  const meatEntry = registry.entries_by_key[makeEconomyProductionSourceKey("hunting", "meat_stores")];

  return {
    schema_version: ECONOMY_PRODUCTION_SUMMARY_SCHEMA_VERSION,
    turn: normalizeInteger(foodEntry?.turn ?? meatEntry?.turn ?? 0),
    food_stores_before: normalizedNonNegative(foodEntry?.balance_before ?? 0),
    food_stores_after: normalizedNonNegative(foodEntry?.balance_after ?? 0),
    meat_stores_before: normalizedNonNegative(meatEntry?.balance_before ?? 0),
    meat_stores_after: normalizedNonNegative(meatEntry?.balance_after ?? 0),
    food_delta: normalizeInteger(foodEntry?.delta ?? 0),
    meat_delta: normalizeInteger(meatEntry?.delta ?? 0),
    summary_lines: registry.source_keys.map((sourceKey) => registry.entries_by_key[sourceKey].summary)
  };
}

export function buildEconomyProductionOutputsFromState(
  state: RunState,
  grainProductionBushels: number
): EconomyProductionOutputsV1 {
  const registry = buildEconomyProductionRegistry({
    turn: state.turn_index,
    food_stores_before: trackedStoreBalance(state, "food_stores"),
    meat_stores_before: meatStoreBalance(state),
    grain_production_bushels: grainProductionBushels,
    hunting_meat_units: deterministicHuntingYieldForState(state)
  });

  return {
    registry,
    summary: buildEconomyProductionSummary(registry)
  };
}

export function serializeEconomyProductionRegistry(registry: EconomyProductionRegistryV1): string {
  return JSON.stringify({
    schema_version: registry.schema_version,
    source_keys: [...registry.source_keys],
    entries_by_key: Object.fromEntries(
      [...registry.source_keys].sort(compareText).map((sourceKey) => [sourceKey, registry.entries_by_key[sourceKey]])
    ),
    totals_by_asset: {
      food_stores: normalizeInteger(registry.totals_by_asset.food_stores),
      meat_stores: normalizeInteger(registry.totals_by_asset.meat_stores)
    }
  });
}

export function serializeEconomyProductionSummary(summary: EconomyProductionSummaryV1): string {
  return JSON.stringify({
    schema_version: summary.schema_version,
    turn: normalizeInteger(summary.turn),
    food_stores_before: normalizedNonNegative(summary.food_stores_before),
    food_stores_after: normalizedNonNegative(summary.food_stores_after),
    meat_stores_before: normalizedNonNegative(summary.meat_stores_before),
    meat_stores_after: normalizedNonNegative(summary.meat_stores_after),
    food_delta: normalizeInteger(summary.food_delta),
    meat_delta: normalizeInteger(summary.meat_delta),
    summary_lines: [...summary.summary_lines]
  });
}
