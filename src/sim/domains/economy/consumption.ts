import { courtConsumptionBushels_v0_2_4 } from "../../court";
import type { PhaseNameV0, RunState } from "../../types";
import { foodStoreBalance, meatStoreBalance } from "./ledger";
import { buildEconomyProductionOutputsFromState } from "./productionRegistry";
import { spendTrackedStoreWithReceiptWriter } from "./storeReceiptWriters";
import { ECONOMY_FISCAL_TUNING_TABLE } from "./tuningTable";

export const ECONOMY_CONSUMPTION_SCHEMA_VERSION = "economy_consumption_v1" as const;
export const ECONOMY_EQUILIBRIUM_FIXTURE_SCHEMA_VERSION = "economy_equilibrium_fixture_v1" as const;

// Meat is a bounded supplement rather than a staple. Court intake gets a richer target,
// but any leftover store can still backfill food shortfalls before a shortage is declared.
export const ECONOMY_MEAT_TARGET_BPS = ECONOMY_FISCAL_TUNING_TABLE.consumption.meat_target_bps;

export interface EconomyConsumptionInputV1 {
  turn: number;
  food_stores_available: number;
  meat_stores_available: number;
  peasant_consumption_bushels: number;
  court_consumption_bushels: number;
}

export interface EconomyConsumptionPlanV1 {
  schema_version: typeof ECONOMY_CONSUMPTION_SCHEMA_VERSION;
  turn: number;
  food_stores_available: number;
  meat_stores_available: number;
  peasant_consumption_bushels: number;
  court_consumption_bushels: number;
  total_consumption_bushels: number;
  target_food_consumption_bushels: number;
  target_meat_consumption_units: number;
  fallback_food_consumption_bushels: number;
  fallback_meat_consumption_units: number;
  food_consumed_bushels: number;
  meat_consumed_units: number;
  shortage_bushels: number;
  food_stores_after: number;
  meat_stores_after: number;
  summary_lines: string[];
}

export interface EconomyConsumptionReceiptContextV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  related_actor_ids?: readonly string[];
}

export interface EconomyConsumptionApplyResultV1 {
  food_consumed_bushels: number;
  meat_consumed_units: number;
  shortage_bushels: number;
}

export interface EconomyEquilibriumFixtureEntryV1 {
  scenario_id: string;
  seed: string;
  turn: number;
  food_stores_before: number;
  meat_stores_before: number;
  food_stores_after_production: number;
  meat_stores_after_production: number;
  food_stores_after: number;
  meat_stores_after: number;
  grain_production_bushels: number;
  hunting_meat_units: number;
  peasant_consumption_bushels: number;
  court_consumption_bushels: number;
  food_consumed_bushels: number;
  meat_consumed_units: number;
  shortage_bushels: number;
  food_net_delta: number;
  meat_net_delta: number;
}

export interface EconomyEquilibriumFixtureSnapshotV1 {
  schema_version: typeof ECONOMY_EQUILIBRIUM_FIXTURE_SCHEMA_VERSION;
  entries: EconomyEquilibriumFixtureEntryV1[];
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

function basisPointShare(value: number, bps: number): number {
  return Math.floor((normalizedNonNegative(value) * normalizedNonNegative(bps)) / 10000);
}

function totalDemand(input: EconomyConsumptionInputV1): number {
  return normalizedNonNegative(input.peasant_consumption_bushels) + normalizedNonNegative(input.court_consumption_bushels);
}

function meatTarget(input: EconomyConsumptionInputV1): number {
  return Math.min(
    totalDemand(input),
    basisPointShare(input.peasant_consumption_bushels, ECONOMY_MEAT_TARGET_BPS.peasant) +
      basisPointShare(input.court_consumption_bushels, ECONOMY_MEAT_TARGET_BPS.court)
  );
}

export function peasantConsumptionBushelsForState(state: RunState): number {
  const population = normalizedNonNegative(state.manor.population);
  const farmers = normalizedNonNegative(state.manor.farmers);
  const builders = normalizedNonNegative(state.manor.builders);
  const idle = Math.max(0, population - farmers - builders);

  return normalizedNonNegative(
    (farmers * ECONOMY_FISCAL_TUNING_TABLE.consumption.bushels_per_person_per_year +
      builders *
        (ECONOMY_FISCAL_TUNING_TABLE.consumption.bushels_per_person_per_year +
          ECONOMY_FISCAL_TUNING_TABLE.consumption.builder_extra_bushels_per_year) +
      idle * ECONOMY_FISCAL_TUNING_TABLE.consumption.bushels_per_person_per_year) *
      ECONOMY_FISCAL_TUNING_TABLE.consumption.turn_years
  );
}

export function courtConsumptionBushelsForState(state: RunState): number {
  return normalizedNonNegative(
    courtConsumptionBushels_v0_2_4(
      state,
      ECONOMY_FISCAL_TUNING_TABLE.consumption.bushels_per_person_per_year,
      ECONOMY_FISCAL_TUNING_TABLE.consumption.turn_years
    ).court_consumption_bushels
  );
}

export function buildEconomyConsumptionPlan(input: EconomyConsumptionInputV1): EconomyConsumptionPlanV1 {
  const normalizedInput = {
    turn: normalizeInteger(input.turn),
    food_stores_available: normalizedNonNegative(input.food_stores_available),
    meat_stores_available: normalizedNonNegative(input.meat_stores_available),
    peasant_consumption_bushels: normalizedNonNegative(input.peasant_consumption_bushels),
    court_consumption_bushels: normalizedNonNegative(input.court_consumption_bushels)
  } satisfies EconomyConsumptionInputV1;

  const targetMeat = meatTarget(normalizedInput);
  const targetFood = totalDemand(normalizedInput) - targetMeat;

  const plannedFood = Math.min(normalizedInput.food_stores_available, targetFood);
  const plannedMeat = Math.min(normalizedInput.meat_stores_available, targetMeat);

  let unmet = totalDemand(normalizedInput) - plannedFood - plannedMeat;
  const fallbackFood = Math.min(normalizedInput.food_stores_available - plannedFood, unmet);
  unmet -= fallbackFood;
  const fallbackMeat = Math.min(normalizedInput.meat_stores_available - plannedMeat, unmet);
  unmet -= fallbackMeat;

  const foodConsumed = plannedFood + fallbackFood;
  const meatConsumed = plannedMeat + fallbackMeat;
  const shortage = Math.max(0, unmet);

  return {
    schema_version: ECONOMY_CONSUMPTION_SCHEMA_VERSION,
    turn: normalizedInput.turn,
    food_stores_available: normalizedInput.food_stores_available,
    meat_stores_available: normalizedInput.meat_stores_available,
    peasant_consumption_bushels: normalizedInput.peasant_consumption_bushels,
    court_consumption_bushels: normalizedInput.court_consumption_bushels,
    total_consumption_bushels: totalDemand(normalizedInput),
    target_food_consumption_bushels: targetFood,
    target_meat_consumption_units: targetMeat,
    fallback_food_consumption_bushels: fallbackFood,
    fallback_meat_consumption_units: fallbackMeat,
    food_consumed_bushels: foodConsumed,
    meat_consumed_units: meatConsumed,
    shortage_bushels: shortage,
    food_stores_after: normalizedInput.food_stores_available - foodConsumed,
    meat_stores_after: normalizedInput.meat_stores_available - meatConsumed,
    summary_lines: [
      `Demand peasant ${normalizedInput.peasant_consumption_bushels}, court ${normalizedInput.court_consumption_bushels}, total ${totalDemand(normalizedInput)}.`,
      `Target food ${targetFood}, target meat ${targetMeat}; fallback food ${fallbackFood}, fallback meat ${fallbackMeat}.`,
      `Consumed food ${foodConsumed}, meat ${meatConsumed}; shortage ${shortage}.`
    ]
  };
}

export function buildEconomyConsumptionPlanFromState(
  state: RunState,
  overrides: Partial<Pick<EconomyConsumptionInputV1, "food_stores_available" | "meat_stores_available" | "court_consumption_bushels">> = {}
): EconomyConsumptionPlanV1 {
  return buildEconomyConsumptionPlan({
    turn: state.turn_index,
    food_stores_available: overrides.food_stores_available ?? foodStoreBalance(state),
    meat_stores_available: overrides.meat_stores_available ?? meatStoreBalance(state),
    peasant_consumption_bushels: peasantConsumptionBushelsForState(state),
    court_consumption_bushels: overrides.court_consumption_bushels ?? courtConsumptionBushelsForState(state)
  });
}

export function applyEconomyConsumptionPlan(
  state: RunState,
  plan: EconomyConsumptionPlanV1,
  context: EconomyConsumptionReceiptContextV1
): EconomyConsumptionApplyResultV1 {
  const foodSpent = spendTrackedStoreWithReceiptWriter(state, {
    phase: context.phase,
    phase_sequence: context.phase_sequence,
    asset: "food_stores",
    amount: plan.food_consumed_bushels,
    flow_kind: "consumption",
    source_label: "Household rations",
    category: "consumption.household_rations",
    counterparty_kind: "household",
    counterparty_id: "manor:household",
    counterparty_label: "Household",
    rule_id: "consumption.food_stores",
    related_actor_ids: context.related_actor_ids
  });
  const meatSpent = spendTrackedStoreWithReceiptWriter(state, {
    phase: context.phase,
    phase_sequence: context.phase_sequence,
    asset: "meat_stores",
    amount: plan.meat_consumed_units,
    flow_kind: "consumption",
    source_label: "Household rations",
    category: "consumption.household_rations",
    counterparty_kind: "household",
    counterparty_id: "manor:household",
    counterparty_label: "Household",
    rule_id: "consumption.meat_stores",
    related_actor_ids: context.related_actor_ids
  });

  return {
    food_consumed_bushels: foodSpent,
    meat_consumed_units: meatSpent,
    shortage_bushels: plan.shortage_bushels
  };
}

export function buildEconomyEquilibriumFixtureEntryFromState(
  state: RunState,
  scenarioId: string,
  grainProductionBushels: number
): EconomyEquilibriumFixtureEntryV1 {
  const foodBefore = foodStoreBalance(state);
  const meatBefore = meatStoreBalance(state);
  const productionOutputs = buildEconomyProductionOutputsFromState(state, grainProductionBushels);
  const plan = buildEconomyConsumptionPlanFromState(state, {
    food_stores_available: productionOutputs.summary.food_stores_after,
    meat_stores_available: productionOutputs.summary.meat_stores_after
  });

  return {
    scenario_id: scenarioId,
    seed: state.run_seed,
    turn: normalizeInteger(state.turn_index),
    food_stores_before: foodBefore,
    meat_stores_before: meatBefore,
    food_stores_after_production: normalizedNonNegative(productionOutputs.summary.food_stores_after),
    meat_stores_after_production: normalizedNonNegative(productionOutputs.summary.meat_stores_after),
    food_stores_after: normalizedNonNegative(plan.food_stores_after),
    meat_stores_after: normalizedNonNegative(plan.meat_stores_after),
    grain_production_bushels: normalizedNonNegative(grainProductionBushels),
    hunting_meat_units: normalizedNonNegative(productionOutputs.summary.meat_delta),
    peasant_consumption_bushels: normalizedNonNegative(plan.peasant_consumption_bushels),
    court_consumption_bushels: normalizedNonNegative(plan.court_consumption_bushels),
    food_consumed_bushels: normalizedNonNegative(plan.food_consumed_bushels),
    meat_consumed_units: normalizedNonNegative(plan.meat_consumed_units),
    shortage_bushels: normalizedNonNegative(plan.shortage_bushels),
    food_net_delta: normalizeInteger(grainProductionBushels) - normalizeInteger(plan.food_consumed_bushels),
    meat_net_delta: normalizeInteger(productionOutputs.summary.meat_delta) - normalizeInteger(plan.meat_consumed_units)
  };
}

export function buildEconomyEquilibriumFixtureSnapshot(
  entries: readonly EconomyEquilibriumFixtureEntryV1[]
): EconomyEquilibriumFixtureSnapshotV1 {
  return {
    schema_version: ECONOMY_EQUILIBRIUM_FIXTURE_SCHEMA_VERSION,
    entries: [...entries].sort((left, right) => compareText(left.scenario_id, right.scenario_id)).map((entry) => ({
      scenario_id: entry.scenario_id,
      seed: entry.seed,
      turn: normalizeInteger(entry.turn),
      food_stores_before: normalizedNonNegative(entry.food_stores_before),
      meat_stores_before: normalizedNonNegative(entry.meat_stores_before),
      food_stores_after_production: normalizedNonNegative(entry.food_stores_after_production),
      meat_stores_after_production: normalizedNonNegative(entry.meat_stores_after_production),
      food_stores_after: normalizedNonNegative(entry.food_stores_after),
      meat_stores_after: normalizedNonNegative(entry.meat_stores_after),
      grain_production_bushels: normalizedNonNegative(entry.grain_production_bushels),
      hunting_meat_units: normalizedNonNegative(entry.hunting_meat_units),
      peasant_consumption_bushels: normalizedNonNegative(entry.peasant_consumption_bushels),
      court_consumption_bushels: normalizedNonNegative(entry.court_consumption_bushels),
      food_consumed_bushels: normalizedNonNegative(entry.food_consumed_bushels),
      meat_consumed_units: normalizedNonNegative(entry.meat_consumed_units),
      shortage_bushels: normalizedNonNegative(entry.shortage_bushels),
      food_net_delta: normalizeInteger(entry.food_net_delta),
      meat_net_delta: normalizeInteger(entry.meat_net_delta)
    }))
  };
}

export function serializeEconomyEquilibriumFixtureSnapshot(
  entries: readonly EconomyEquilibriumFixtureEntryV1[]
): string {
  return `${JSON.stringify(buildEconomyEquilibriumFixtureSnapshot(entries), null, 2)}\n`;
}
