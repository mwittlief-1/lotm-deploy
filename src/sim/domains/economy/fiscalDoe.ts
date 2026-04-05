import type { GameOverState, RunSnapshot, RunState } from "../../types";

export const ECONOMY_FISCAL_DOE_RUN_METRIC_SCHEMA_VERSION = "economy_fiscal_doe_run_metric_v1" as const;
export const ECONOMY_FISCAL_DOE_SUMMARY_SCHEMA_VERSION = "economy_fiscal_doe_summary_v1" as const;

export interface EconomyFiscalDoeRunMetricV1 {
  schema_version: typeof ECONOMY_FISCAL_DOE_RUN_METRIC_SCHEMA_VERSION;
  policy: string;
  seed: string;
  turns_requested: number;
  turns_played: number;
  game_over_reason: GameOverState["reason"] | null;
  game_over_turn: number | null;
  ending: {
    food_stores: number;
    meat_stores: number;
    coin: number;
    unrest: number;
    arrears_coin: number;
    arrears_bushels: number;
    manor_count: number;
  };
  minima: {
    food_stores: number;
    meat_stores: number;
    manor_count: number;
  };
  maxima: {
    arrears_coin: number;
    arrears_bushels: number;
    manor_count: number;
  };
  indicators: {
    dispossessed: boolean;
    any_game_over: boolean;
    coin_arrears_seen: boolean;
    bushels_arrears_seen: boolean;
    any_arrears_seen: boolean;
    food_stockout_seen: boolean;
    meat_stockout_seen: boolean;
  };
}

export interface EconomyFiscalDoeDistributionEntryV1 {
  manor_count: number;
  run_count: number;
  share: number;
}

export interface EconomyFiscalDoeSummarySliceV1 {
  run_count: number;
  arrears: {
    coin_seen_share: number;
    bushels_seen_share: number;
    any_seen_share: number;
    mean_end_coin: number;
    mean_end_bushels: number;
    mean_max_coin: number;
    mean_max_bushels: number;
  };
  dispossession: {
    dispossessed_count: number;
    dispossession_rate: number;
    any_game_over_count: number;
    median_game_over_turn: number | null;
  };
  stores: {
    mean_ending_food_stores: number;
    mean_ending_meat_stores: number;
    mean_min_food_stores: number;
    mean_min_meat_stores: number;
    food_stockout_seen_share: number;
    meat_stockout_seen_share: number;
  };
  manor_count_distribution: EconomyFiscalDoeDistributionEntryV1[];
}

export interface EconomyFiscalDoeSummaryV1 {
  schema_version: typeof ECONOMY_FISCAL_DOE_SUMMARY_SCHEMA_VERSION;
  run_metric_schema_version: typeof ECONOMY_FISCAL_DOE_RUN_METRIC_SCHEMA_VERSION;
  policy_ids: string[];
  overall: EconomyFiscalDoeSummarySliceV1;
  by_policy: Record<string, EconomyFiscalDoeSummarySliceV1>;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeNonNegativeInteger(value: number | undefined | null): number {
  return Math.max(0, Math.trunc(Number(value ?? 0)));
}

function portfolioManorCount(portfolio: RunState["portfolio"] | RunSnapshot["portfolio"]): number {
  const positions = Array.isArray(portfolio?.positions) ? portfolio.positions.length : 0;
  return Math.max(1, normalizeNonNegativeInteger(positions) + 1);
}

function snapshotStoreSample(snapshot: Pick<RunSnapshot, "manor" | "portfolio">) {
  return {
    food_stores: normalizeNonNegativeInteger(snapshot.manor.bushels_stored),
    meat_stores: normalizeNonNegativeInteger(snapshot.manor.meat_stores ?? 0),
    arrears_coin: normalizeNonNegativeInteger(snapshot.manor.obligations.arrears.coin),
    arrears_bushels: normalizeNonNegativeInteger(snapshot.manor.obligations.arrears.bushels),
    manor_count: portfolioManorCount(snapshot.portfolio)
  };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle] ?? null;
  return ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2;
}

function ratio(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

function buildSlice(metrics: readonly EconomyFiscalDoeRunMetricV1[]): EconomyFiscalDoeSummarySliceV1 {
  const runCount = metrics.length;
  const dispossessedCount = metrics.filter((metric) => metric.indicators.dispossessed).length;
  const anyGameOverCount = metrics.filter((metric) => metric.indicators.any_game_over).length;
  const gameOverTurns = metrics
    .map((metric) => metric.game_over_turn)
    .filter((value): value is number => value != null)
    .map((value) => normalizeNonNegativeInteger(value));
  const manorCountBuckets = new Map<number, number>();

  for (const metric of metrics) {
    manorCountBuckets.set(metric.ending.manor_count, (manorCountBuckets.get(metric.ending.manor_count) ?? 0) + 1);
  }

  return {
    run_count: runCount,
    arrears: {
      coin_seen_share: ratio(metrics.filter((metric) => metric.indicators.coin_arrears_seen).length, runCount),
      bushels_seen_share: ratio(metrics.filter((metric) => metric.indicators.bushels_arrears_seen).length, runCount),
      any_seen_share: ratio(metrics.filter((metric) => metric.indicators.any_arrears_seen).length, runCount),
      mean_end_coin: mean(metrics.map((metric) => metric.ending.arrears_coin)),
      mean_end_bushels: mean(metrics.map((metric) => metric.ending.arrears_bushels)),
      mean_max_coin: mean(metrics.map((metric) => metric.maxima.arrears_coin)),
      mean_max_bushels: mean(metrics.map((metric) => metric.maxima.arrears_bushels))
    },
    dispossession: {
      dispossessed_count: dispossessedCount,
      dispossession_rate: ratio(dispossessedCount, runCount),
      any_game_over_count: anyGameOverCount,
      median_game_over_turn: median(gameOverTurns)
    },
    stores: {
      mean_ending_food_stores: mean(metrics.map((metric) => metric.ending.food_stores)),
      mean_ending_meat_stores: mean(metrics.map((metric) => metric.ending.meat_stores)),
      mean_min_food_stores: mean(metrics.map((metric) => metric.minima.food_stores)),
      mean_min_meat_stores: mean(metrics.map((metric) => metric.minima.meat_stores)),
      food_stockout_seen_share: ratio(metrics.filter((metric) => metric.indicators.food_stockout_seen).length, runCount),
      meat_stockout_seen_share: ratio(metrics.filter((metric) => metric.indicators.meat_stockout_seen).length, runCount)
    },
    manor_count_distribution: [...manorCountBuckets.entries()]
      .sort(([left], [right]) => left - right)
      .map(([manorCount, count]) => ({
        manor_count: manorCount,
        run_count: count,
        share: ratio(count, runCount)
      }))
  };
}

export function buildEconomyFiscalDoeRunMetric(
  policy: string,
  seed: string,
  turnsRequested: number,
  state: RunState
): EconomyFiscalDoeRunMetricV1 {
  const ending = {
    food_stores: normalizeNonNegativeInteger(state.manor.bushels_stored),
    meat_stores: normalizeNonNegativeInteger(state.manor.meat_stores ?? 0),
    coin: normalizeNonNegativeInteger(state.manor.coin),
    unrest: normalizeNonNegativeInteger(state.manor.unrest),
    arrears_coin: normalizeNonNegativeInteger(state.manor.obligations.arrears.coin),
    arrears_bushels: normalizeNonNegativeInteger(state.manor.obligations.arrears.bushels),
    manor_count: portfolioManorCount(state.portfolio)
  };

  const samples = state.log.map((entry) => snapshotStoreSample(entry.snapshot_after));
  if (samples.length === 0) {
    samples.push({
      food_stores: ending.food_stores,
      meat_stores: ending.meat_stores,
      arrears_coin: ending.arrears_coin,
      arrears_bushels: ending.arrears_bushels,
      manor_count: ending.manor_count
    });
  }

  const foodSeries = samples.map((sample) => sample.food_stores);
  const meatSeries = samples.map((sample) => sample.meat_stores);
  const arrearsCoinSeries = samples.map((sample) => sample.arrears_coin);
  const arrearsBushelsSeries = samples.map((sample) => sample.arrears_bushels);
  const manorCountSeries = samples.map((sample) => sample.manor_count);

  const maxArrearsCoin = arrearsCoinSeries.length > 0 ? Math.max(...arrearsCoinSeries) : ending.arrears_coin;
  const maxArrearsBushels = arrearsBushelsSeries.length > 0 ? Math.max(...arrearsBushelsSeries) : ending.arrears_bushels;

  return {
    schema_version: ECONOMY_FISCAL_DOE_RUN_METRIC_SCHEMA_VERSION,
    policy,
    seed,
    turns_requested: normalizeNonNegativeInteger(turnsRequested),
    turns_played: normalizeNonNegativeInteger(state.turn_index),
    game_over_reason: state.game_over?.reason ?? null,
    game_over_turn: state.game_over?.turn_index ?? null,
    ending,
    minima: {
      food_stores: foodSeries.length > 0 ? Math.min(...foodSeries) : ending.food_stores,
      meat_stores: meatSeries.length > 0 ? Math.min(...meatSeries) : ending.meat_stores,
      manor_count: manorCountSeries.length > 0 ? Math.min(...manorCountSeries) : ending.manor_count
    },
    maxima: {
      arrears_coin: maxArrearsCoin,
      arrears_bushels: maxArrearsBushels,
      manor_count: manorCountSeries.length > 0 ? Math.max(...manorCountSeries) : ending.manor_count
    },
    indicators: {
      dispossessed: state.game_over?.reason === "Dispossessed",
      any_game_over: state.game_over != null,
      coin_arrears_seen: maxArrearsCoin > 0,
      bushels_arrears_seen: maxArrearsBushels > 0,
      any_arrears_seen: maxArrearsCoin > 0 || maxArrearsBushels > 0,
      food_stockout_seen: (foodSeries.length > 0 ? Math.min(...foodSeries) : ending.food_stores) === 0,
      meat_stockout_seen: (meatSeries.length > 0 ? Math.min(...meatSeries) : ending.meat_stores) === 0
    }
  };
}

export function buildEconomyFiscalDoeRunMetricsSnapshot(
  metrics: readonly EconomyFiscalDoeRunMetricV1[]
): EconomyFiscalDoeRunMetricV1[] {
  return [...metrics]
    .sort((left, right) => {
      const policyOrder = compareText(left.policy, right.policy);
      if (policyOrder !== 0) return policyOrder;
      return compareText(left.seed, right.seed);
    })
    .map((metric) => ({
      ...metric,
      ending: { ...metric.ending },
      minima: { ...metric.minima },
      maxima: { ...metric.maxima },
      indicators: { ...metric.indicators }
    }));
}

export function buildEconomyFiscalDoeSummary(
  metrics: readonly EconomyFiscalDoeRunMetricV1[]
): EconomyFiscalDoeSummaryV1 {
  const orderedMetrics = buildEconomyFiscalDoeRunMetricsSnapshot(metrics);
  const policyIds = [...new Set(orderedMetrics.map((metric) => metric.policy))].sort(compareText);

  return {
    schema_version: ECONOMY_FISCAL_DOE_SUMMARY_SCHEMA_VERSION,
    run_metric_schema_version: ECONOMY_FISCAL_DOE_RUN_METRIC_SCHEMA_VERSION,
    policy_ids: policyIds,
    overall: buildSlice(orderedMetrics),
    by_policy: Object.fromEntries(
      policyIds.map((policyId) => [policyId, buildSlice(orderedMetrics.filter((metric) => metric.policy === policyId))])
    )
  };
}
