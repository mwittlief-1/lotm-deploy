import {
  ECONOMY_PORTFOLIO_ASSET_KEYS,
  ECONOMY_PORTFOLIO_NET_KEYS,
  ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS,
  type EconomyPortfolioNetKeyV1,
  type EconomyPortfolioOutlierMetricKeyV1,
  type EconomyPortfolioScopeV1
} from "./portfolioRegistry";
import {
  ECONOMY_PORTFOLIO_AGGREGATE_SCHEMA_VERSION,
  buildEconomyPortfolioAggregate,
  type EconomyPortfolioAggregateInputV1,
  type EconomyPortfolioAggregateV1,
  type EconomyPortfolioManorTotalsV1
} from "./portfolioAggregation";
import { buildBoundedWorldTopologyView } from "../world";
import type { RunState } from "../../types";

export const ECONOMY_PORTFOLIO_ANALYSIS_SCHEMA_VERSION = "economy_portfolio_analysis_v1" as const;
export const ECONOMY_PORTFOLIO_MANOR_ANALYSIS_SCHEMA_VERSION = "economy_portfolio_manor_analysis_v1" as const;
export const ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION = "economy_portfolio_outlier_entry_v1" as const;
export const ECONOMY_PORTFOLIO_OUTLIER_LIMIT = 3 as const;

export type EconomyPortfolioAnalysisSchemaVersionV1 = typeof ECONOMY_PORTFOLIO_ANALYSIS_SCHEMA_VERSION;
export type EconomyPortfolioManorAnalysisSchemaVersionV1 = typeof ECONOMY_PORTFOLIO_MANOR_ANALYSIS_SCHEMA_VERSION;
export type EconomyPortfolioOutlierEntrySchemaVersionV1 = typeof ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION;

export interface EconomyPortfolioManorAnalysisV1 extends Omit<EconomyPortfolioManorTotalsV1, "schema_version"> {
  schema_version: EconomyPortfolioManorAnalysisSchemaVersionV1;
  net_values: Record<EconomyPortfolioNetKeyV1, number>;
}

export interface EconomyPortfolioOutlierEntryV1 {
  schema_version: EconomyPortfolioOutlierEntrySchemaVersionV1;
  metric_key: EconomyPortfolioOutlierMetricKeyV1;
  manor_id: string;
  manor_key: string;
  rank: number;
  value: number;
}

export interface EconomyPortfolioAnalysisV1 {
  schema_version: EconomyPortfolioAnalysisSchemaVersionV1;
  aggregate_schema_version: typeof ECONOMY_PORTFOLIO_AGGREGATE_SCHEMA_VERSION;
  scope: EconomyPortfolioScopeV1;
  totals_by_asset: EconomyPortfolioAggregateV1["totals_by_asset"];
  totals_by_category: EconomyPortfolioAggregateV1["totals_by_category"];
  manor_keys: string[];
  manor_rows_by_key: Record<string, EconomyPortfolioManorAnalysisV1>;
  outliers_by_metric: Record<EconomyPortfolioOutlierMetricKeyV1, EconomyPortfolioOutlierEntryV1[]>;
}

export interface EconomyPortfolioPhaseHintsV1 {
  production_food_delta?: number;
  production_meat_delta?: number;
  consumption_food_stores?: number;
  consumption_meat_stores?: number;
  consumption_shortage_bushels?: number;
}

const ECONOMY_PORTFOLIO_PHASE_HINTS_FLAG = "_economy_portfolio_phase_hints_v1" as const;

type OutlierDirection = "highest" | "lowest";

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function normalizeNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function buildOrderedRecord<K extends string, V>(keys: readonly K[], valueFor: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, valueFor(key)])) as Record<K, V>;
}

function buildNetValues(row: EconomyPortfolioManorTotalsV1): Record<EconomyPortfolioNetKeyV1, number> {
  return {
    "net.coin": normalizeInteger(
      row.asset_totals.coin -
        row.category_totals["obligations.current_due.coin"] -
        row.category_totals["obligations.arrears.coin"]
    ),
    "net.food_stores": normalizeInteger(
      row.asset_totals.food_stores -
        row.category_totals["obligations.current_due.food_stores"] -
        row.category_totals["obligations.arrears.food_stores"]
    ),
    "net.meat_stores": normalizeInteger(row.asset_totals.meat_stores)
  };
}

function toEconomyPortfolioManorAnalysis(row: EconomyPortfolioManorTotalsV1): EconomyPortfolioManorAnalysisV1 {
  return {
    schema_version: ECONOMY_PORTFOLIO_MANOR_ANALYSIS_SCHEMA_VERSION,
    scope_key: row.scope_key,
    manor_id: row.manor_id,
    manor_key: row.manor_key,
    asset_rollup_keys: row.asset_rollup_keys,
    category_rollup_keys: row.category_rollup_keys,
    net_rollup_keys: row.net_rollup_keys,
    asset_totals: row.asset_totals,
    category_totals: row.category_totals,
    net_values: buildNetValues(row)
  };
}

function metricDirection(metricKey: EconomyPortfolioOutlierMetricKeyV1): OutlierDirection {
  return metricKey.includes(".lowest.") ? "lowest" : "highest";
}

function metricValue(metricKey: EconomyPortfolioOutlierMetricKeyV1, row: EconomyPortfolioManorAnalysisV1): number {
  switch (metricKey) {
    case "outlier.highest.coin":
    case "outlier.lowest.coin":
      return row.asset_totals.coin;
    case "outlier.highest.food_stores":
    case "outlier.lowest.food_stores":
      return row.asset_totals.food_stores;
    case "outlier.highest.meat_stores":
    case "outlier.lowest.meat_stores":
      return row.asset_totals.meat_stores;
    case "outlier.highest.tax_due_coin":
      return row.category_totals["obligations.current_due.coin"];
    case "outlier.highest.tithe_due_bushels":
      return row.category_totals["obligations.current_due.food_stores"];
    case "outlier.highest.arrears_coin":
      return row.category_totals["obligations.arrears.coin"];
    case "outlier.highest.arrears_bushels":
      return row.category_totals["obligations.arrears.food_stores"];
    case "outlier.highest.production.food_delta":
      return row.category_totals["production.food_delta"];
    case "outlier.highest.production.meat_delta":
      return row.category_totals["production.meat_delta"];
    case "outlier.highest.consumption.shortage_bushels":
      return row.category_totals["consumption.shortage_bushels"];
    case "outlier.lowest.net.coin":
      return row.net_values["net.coin"];
    case "outlier.lowest.net.food_stores":
      return row.net_values["net.food_stores"];
    case "outlier.lowest.net.meat_stores":
      return row.net_values["net.meat_stores"];
  }
}

function compareMetricRows(
  metricKey: EconomyPortfolioOutlierMetricKeyV1,
  left: EconomyPortfolioManorAnalysisV1,
  right: EconomyPortfolioManorAnalysisV1
): number {
  const leftValue = metricValue(metricKey, left);
  const rightValue = metricValue(metricKey, right);
  if (leftValue !== rightValue) {
    return metricDirection(metricKey) === "highest" ? rightValue - leftValue : leftValue - rightValue;
  }

  return compareText(left.manor_key, right.manor_key);
}

function buildOutlierEntries(
  metricKey: EconomyPortfolioOutlierMetricKeyV1,
  rows: readonly EconomyPortfolioManorAnalysisV1[]
): EconomyPortfolioOutlierEntryV1[] {
  return [...rows]
    .sort((left, right) => compareMetricRows(metricKey, left, right))
    .slice(0, ECONOMY_PORTFOLIO_OUTLIER_LIMIT)
    .map((row, index) => ({
      schema_version: ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION,
      metric_key: metricKey,
      manor_id: row.manor_id,
      manor_key: row.manor_key,
      rank: index + 1,
      value: metricValue(metricKey, row)
    }));
}

export function buildEconomyPortfolioAnalysisFromAggregate(
  aggregate: EconomyPortfolioAggregateV1
): EconomyPortfolioAnalysisV1 {
  const manorRowsByKey = Object.fromEntries(
    aggregate.manor_keys.map((manorKey) => [manorKey, toEconomyPortfolioManorAnalysis(aggregate.manor_rows_by_key[manorKey])])
  ) as Record<string, EconomyPortfolioManorAnalysisV1>;
  const orderedRows = aggregate.manor_keys.map((manorKey) => manorRowsByKey[manorKey]);

  return {
    schema_version: ECONOMY_PORTFOLIO_ANALYSIS_SCHEMA_VERSION,
    aggregate_schema_version: ECONOMY_PORTFOLIO_AGGREGATE_SCHEMA_VERSION,
    scope: aggregate.scope,
    totals_by_asset: aggregate.totals_by_asset,
    totals_by_category: aggregate.totals_by_category,
    manor_keys: [...aggregate.manor_keys],
    manor_rows_by_key: manorRowsByKey,
    outliers_by_metric: buildOrderedRecord(
      ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS,
      (metricKey) => buildOutlierEntries(metricKey, orderedRows)
    )
  };
}

export function buildEconomyPortfolioAnalysis(
  input: EconomyPortfolioAggregateInputV1 = {}
): EconomyPortfolioAnalysisV1 {
  return buildEconomyPortfolioAnalysisFromAggregate(buildEconomyPortfolioAggregate(input));
}

export function serializeEconomyPortfolioAnalysis(analysis: EconomyPortfolioAnalysisV1): string {
  return JSON.stringify({
    schema_version: analysis.schema_version,
    aggregate_schema_version: analysis.aggregate_schema_version,
    scope: analysis.scope,
    totals_by_asset: buildOrderedRecord(ECONOMY_PORTFOLIO_ASSET_KEYS, (assetKey) => analysis.totals_by_asset[assetKey]),
    totals_by_category: buildOrderedRecord(
      Object.keys(analysis.totals_by_category).sort(compareText) as (keyof typeof analysis.totals_by_category)[],
      (categoryKey) => analysis.totals_by_category[categoryKey]
    ),
    manor_keys: [...analysis.manor_keys].sort(compareText),
    manor_rows_by_key: Object.fromEntries(
      [...analysis.manor_keys]
        .sort(compareText)
        .map((manorKey) => {
          const row = analysis.manor_rows_by_key[manorKey];
          return [
            manorKey,
            {
              schema_version: row.schema_version,
              scope_key: row.scope_key,
              manor_id: row.manor_id,
              manor_key: row.manor_key,
              asset_rollup_keys: buildOrderedRecord(
                ECONOMY_PORTFOLIO_ASSET_KEYS,
                (assetKey) => row.asset_rollup_keys[assetKey]
              ),
              category_rollup_keys: buildOrderedRecord(
                Object.keys(row.category_rollup_keys).sort(compareText) as (keyof typeof row.category_rollup_keys)[],
                (categoryKey) => row.category_rollup_keys[categoryKey]
              ),
              net_rollup_keys: buildOrderedRecord(
                ECONOMY_PORTFOLIO_NET_KEYS,
                (netKey) => row.net_rollup_keys[netKey]
              ),
              asset_totals: buildOrderedRecord(
                ECONOMY_PORTFOLIO_ASSET_KEYS,
                (assetKey) => row.asset_totals[assetKey]
              ),
              category_totals: buildOrderedRecord(
                Object.keys(row.category_totals).sort(compareText) as (keyof typeof row.category_totals)[],
                (categoryKey) => row.category_totals[categoryKey]
              ),
              net_values: buildOrderedRecord(
                ECONOMY_PORTFOLIO_NET_KEYS,
                (netKey) => row.net_values[netKey]
              )
            }
          ];
        })
    ),
    outliers_by_metric: buildOrderedRecord(
      ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS,
      (metricKey) => analysis.outliers_by_metric[metricKey]
    )
  });
}

function portfolioPhaseHintsFor(state: RunState): EconomyPortfolioPhaseHintsV1 {
  const flags = state.flags as Record<string, unknown>;
  const raw = flags[ECONOMY_PORTFOLIO_PHASE_HINTS_FLAG];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const row = raw as Record<string, unknown>;
  return {
    production_food_delta: normalizeNonNegativeInteger(row.production_food_delta),
    production_meat_delta: normalizeNonNegativeInteger(row.production_meat_delta),
    consumption_food_stores: normalizeNonNegativeInteger(row.consumption_food_stores),
    consumption_meat_stores: normalizeNonNegativeInteger(row.consumption_meat_stores),
    consumption_shortage_bushels: normalizeNonNegativeInteger(row.consumption_shortage_bushels)
  };
}

export function recordEconomyPortfolioPhaseHints(
  state: RunState,
  hints: EconomyPortfolioPhaseHintsV1
): EconomyPortfolioPhaseHintsV1 {
  const flags = state.flags as Record<string, unknown>;
  const current = portfolioPhaseHintsFor(state);
  const next: EconomyPortfolioPhaseHintsV1 = {
    production_food_delta:
      hints.production_food_delta === undefined
        ? current.production_food_delta
        : normalizeNonNegativeInteger(hints.production_food_delta),
    production_meat_delta:
      hints.production_meat_delta === undefined
        ? current.production_meat_delta
        : normalizeNonNegativeInteger(hints.production_meat_delta),
    consumption_food_stores:
      hints.consumption_food_stores === undefined
        ? current.consumption_food_stores
        : normalizeNonNegativeInteger(hints.consumption_food_stores),
    consumption_meat_stores:
      hints.consumption_meat_stores === undefined
        ? current.consumption_meat_stores
        : normalizeNonNegativeInteger(hints.consumption_meat_stores),
    consumption_shortage_bushels:
      hints.consumption_shortage_bushels === undefined
        ? current.consumption_shortage_bushels
        : normalizeNonNegativeInteger(hints.consumption_shortage_bushels)
  };
  flags[ECONOMY_PORTFOLIO_PHASE_HINTS_FLAG] = next;
  return next;
}

export function buildEconomyPortfolioAnalysisFromState(state: RunState): EconomyPortfolioAnalysisV1 {
  const anchor = buildBoundedWorldTopologyView();
  const hints = portfolioPhaseHintsFor(state);
  const manor = state.manor;

  return buildEconomyPortfolioAnalysis({
    manors: [
      {
        manor_id: anchor.anchor_manor_id,
        asset_totals: {
          coin: normalizeNonNegativeInteger(manor.coin),
          food_stores: normalizeNonNegativeInteger(manor.bushels_stored),
          meat_stores: normalizeNonNegativeInteger(manor.meat_stores ?? 0)
        },
        category_totals: {
          "obligations.current_due.coin": normalizeNonNegativeInteger(manor.obligations.tax_due_coin),
          "obligations.current_due.food_stores": normalizeNonNegativeInteger(manor.obligations.tithe_due_bushels),
          "obligations.arrears.coin": normalizeNonNegativeInteger(manor.obligations.arrears.coin),
          "obligations.arrears.food_stores": normalizeNonNegativeInteger(manor.obligations.arrears.bushels),
          "obligations.enforcement.war_levy": manor.obligations.war_levy_due ? 1 : 0,
          "production.food_delta": normalizeNonNegativeInteger(hints.production_food_delta ?? 0),
          "production.meat_delta": normalizeNonNegativeInteger(hints.production_meat_delta ?? 0),
          "consumption.food_stores": normalizeNonNegativeInteger(hints.consumption_food_stores ?? 0),
          "consumption.meat_stores": normalizeNonNegativeInteger(hints.consumption_meat_stores ?? 0),
          "consumption.shortage_bushels": normalizeNonNegativeInteger(hints.consumption_shortage_bushels ?? 0)
        }
      }
    ]
  });
}

export function refreshEconomyPortfolioState(state: RunState): EconomyPortfolioAnalysisV1 {
  const analysis = buildEconomyPortfolioAnalysisFromState(state);
  (state as RunState & { portfolio?: unknown }).portfolio = analysis;
  return analysis;
}
