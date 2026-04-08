import {
  ECONOMY_PORTFOLIO_ASSET_KEYS,
  ECONOMY_PORTFOLIO_CATEGORY_KEYS,
  ECONOMY_PORTFOLIO_NET_KEYS,
  buildEconomyPortfolioRegistry,
  type EconomyPortfolioAssetKeyV1,
  type EconomyPortfolioCategoryKeyV1,
  type EconomyPortfolioManorRowV1,
  type EconomyPortfolioNetKeyV1,
  type EconomyPortfolioScopeV1
} from "./portfolioRegistry";

export const ECONOMY_PORTFOLIO_AGGREGATE_SCHEMA_VERSION = "economy_portfolio_aggregate_v1" as const;
export const ECONOMY_PORTFOLIO_MANOR_TOTALS_SCHEMA_VERSION = "economy_portfolio_manor_totals_v1" as const;

export type EconomyPortfolioAggregateSchemaVersionV1 = typeof ECONOMY_PORTFOLIO_AGGREGATE_SCHEMA_VERSION;
export type EconomyPortfolioManorTotalsSchemaVersionV1 = typeof ECONOMY_PORTFOLIO_MANOR_TOTALS_SCHEMA_VERSION;

export interface EconomyPortfolioManorInputV1 {
  manor_id: string;
  asset_totals?: Partial<Record<EconomyPortfolioAssetKeyV1, number>>;
  category_totals?: Partial<Record<EconomyPortfolioCategoryKeyV1, number>>;
}

export interface EconomyPortfolioAggregateInputV1 {
  scope_id?: string;
  manors?: readonly EconomyPortfolioManorInputV1[];
}

export interface EconomyPortfolioManorTotalsV1 {
  schema_version: EconomyPortfolioManorTotalsSchemaVersionV1;
  scope_key: string;
  manor_id: string;
  manor_key: string;
  asset_rollup_keys: Record<EconomyPortfolioAssetKeyV1, string>;
  category_rollup_keys: Record<EconomyPortfolioCategoryKeyV1, string>;
  net_rollup_keys: Record<EconomyPortfolioNetKeyV1, string>;
  asset_totals: Record<EconomyPortfolioAssetKeyV1, number>;
  category_totals: Record<EconomyPortfolioCategoryKeyV1, number>;
}

export interface EconomyPortfolioAggregateV1 {
  schema_version: EconomyPortfolioAggregateSchemaVersionV1;
  scope: EconomyPortfolioScopeV1;
  totals_by_asset: Record<EconomyPortfolioAssetKeyV1, number>;
  totals_by_category: Record<EconomyPortfolioCategoryKeyV1, number>;
  manor_keys: string[];
  manor_rows_by_key: Record<string, EconomyPortfolioManorTotalsV1>;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function canonicalManorId(manorId: string): string {
  const trimmed = manorId.trim();
  return trimmed.length > 0 ? trimmed : "unknown_manor";
}

function normalizeNonNegativeInteger(value: number): number {
  return Math.max(0, Math.trunc(value));
}

function buildOrderedRecord<K extends string, V>(keys: readonly K[], valueFor: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, valueFor(key)])) as Record<K, V>;
}

function emptyAssetTotals(): Record<EconomyPortfolioAssetKeyV1, number> {
  return buildOrderedRecord(ECONOMY_PORTFOLIO_ASSET_KEYS, () => 0);
}

function emptyCategoryTotals(): Record<EconomyPortfolioCategoryKeyV1, number> {
  return buildOrderedRecord(ECONOMY_PORTFOLIO_CATEGORY_KEYS, () => 0);
}

function normalizeAssetTotals(
  totals: Partial<Record<EconomyPortfolioAssetKeyV1, number>> | undefined
): Record<EconomyPortfolioAssetKeyV1, number> {
  return buildOrderedRecord(ECONOMY_PORTFOLIO_ASSET_KEYS, (assetKey) => normalizeNonNegativeInteger(totals?.[assetKey] ?? 0));
}

function normalizeCategoryTotals(
  totals: Partial<Record<EconomyPortfolioCategoryKeyV1, number>> | undefined
): Record<EconomyPortfolioCategoryKeyV1, number> {
  return buildOrderedRecord(
    ECONOMY_PORTFOLIO_CATEGORY_KEYS,
    (categoryKey) => normalizeNonNegativeInteger(totals?.[categoryKey] ?? 0)
  );
}

function mergeAssetTotals(
  left: Record<EconomyPortfolioAssetKeyV1, number>,
  right: Partial<Record<EconomyPortfolioAssetKeyV1, number>> | undefined
): Record<EconomyPortfolioAssetKeyV1, number> {
  const normalizedRight = normalizeAssetTotals(right);
  return buildOrderedRecord(
    ECONOMY_PORTFOLIO_ASSET_KEYS,
    (assetKey) => normalizeNonNegativeInteger(left[assetKey] + normalizedRight[assetKey])
  );
}

function mergeCategoryTotals(
  left: Record<EconomyPortfolioCategoryKeyV1, number>,
  right: Partial<Record<EconomyPortfolioCategoryKeyV1, number>> | undefined
): Record<EconomyPortfolioCategoryKeyV1, number> {
  const normalizedRight = normalizeCategoryTotals(right);
  return buildOrderedRecord(
    ECONOMY_PORTFOLIO_CATEGORY_KEYS,
    (categoryKey) => normalizeNonNegativeInteger(left[categoryKey] + normalizedRight[categoryKey])
  );
}

function mergedManorInputs(manors: readonly EconomyPortfolioManorInputV1[]): Map<string, EconomyPortfolioManorInputV1> {
  const merged = new Map<string, EconomyPortfolioManorInputV1>();

  for (const manor of manors) {
    const manorId = canonicalManorId(manor.manor_id);
    const existing = merged.get(manorId);
    if (!existing) {
      merged.set(manorId, {
        manor_id: manorId,
        asset_totals: normalizeAssetTotals(manor.asset_totals),
        category_totals: normalizeCategoryTotals(manor.category_totals)
      });
      continue;
    }

    merged.set(manorId, {
      manor_id: manorId,
      asset_totals: mergeAssetTotals(existing.asset_totals, manor.asset_totals),
      category_totals: mergeCategoryTotals(existing.category_totals, manor.category_totals)
    });
  }

  return new Map([...merged.entries()].sort(([left], [right]) => compareText(left, right)));
}

function toEconomyPortfolioManorTotals(row: EconomyPortfolioManorRowV1, input: EconomyPortfolioManorInputV1): EconomyPortfolioManorTotalsV1 {
  return {
    schema_version: ECONOMY_PORTFOLIO_MANOR_TOTALS_SCHEMA_VERSION,
    scope_key: row.scope_key,
    manor_id: row.manor_id,
    manor_key: row.manor_key,
    asset_rollup_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_ASSET_KEYS, (assetKey) => row.asset_rollup_keys[assetKey]),
    category_rollup_keys: buildOrderedRecord(
      ECONOMY_PORTFOLIO_CATEGORY_KEYS,
      (categoryKey) => row.category_rollup_keys[categoryKey]
    ),
    net_rollup_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_NET_KEYS, (netKey) => row.net_rollup_keys[netKey]),
    asset_totals: normalizeAssetTotals(input.asset_totals),
    category_totals: normalizeCategoryTotals(input.category_totals)
  };
}

export function buildEconomyPortfolioAggregate(
  input: EconomyPortfolioAggregateInputV1 = {}
): EconomyPortfolioAggregateV1 {
  const mergedInputs = mergedManorInputs(input.manors ?? []);
  const registry = buildEconomyPortfolioRegistry({
    scope_id: input.scope_id,
    manor_ids: [...mergedInputs.keys()]
  });

  const manorRowsByKey = Object.fromEntries(
    registry.manor_keys.map((manorKey) => {
      const row = registry.manor_rows_by_key[manorKey];
      const manorInput = mergedInputs.get(row.manor_id) ?? {
        manor_id: row.manor_id,
        asset_totals: emptyAssetTotals(),
        category_totals: emptyCategoryTotals()
      };
      return [manorKey, toEconomyPortfolioManorTotals(row, manorInput)];
    })
  ) as Record<string, EconomyPortfolioManorTotalsV1>;

  const totalsByAsset = emptyAssetTotals();
  const totalsByCategory = emptyCategoryTotals();

  for (const manorKey of registry.manor_keys) {
    const manorRow = manorRowsByKey[manorKey];
    for (const assetKey of ECONOMY_PORTFOLIO_ASSET_KEYS) {
      totalsByAsset[assetKey] = normalizeNonNegativeInteger(totalsByAsset[assetKey] + manorRow.asset_totals[assetKey]);
    }
    for (const categoryKey of ECONOMY_PORTFOLIO_CATEGORY_KEYS) {
      totalsByCategory[categoryKey] = normalizeNonNegativeInteger(
        totalsByCategory[categoryKey] + manorRow.category_totals[categoryKey]
      );
    }
  }

  return {
    schema_version: ECONOMY_PORTFOLIO_AGGREGATE_SCHEMA_VERSION,
    scope: registry.scope,
    totals_by_asset: totalsByAsset,
    totals_by_category: totalsByCategory,
    manor_keys: [...registry.manor_keys],
    manor_rows_by_key: manorRowsByKey
  };
}

export function serializeEconomyPortfolioAggregate(aggregate: EconomyPortfolioAggregateV1): string {
  return JSON.stringify({
    schema_version: aggregate.schema_version,
    scope: aggregate.scope,
    totals_by_asset: buildOrderedRecord(
      ECONOMY_PORTFOLIO_ASSET_KEYS,
      (assetKey) => aggregate.totals_by_asset[assetKey]
    ),
    totals_by_category: buildOrderedRecord(
      ECONOMY_PORTFOLIO_CATEGORY_KEYS,
      (categoryKey) => aggregate.totals_by_category[categoryKey]
    ),
    manor_keys: [...aggregate.manor_keys].sort(compareText),
    manor_rows_by_key: Object.fromEntries(
      [...aggregate.manor_keys]
        .sort(compareText)
        .map((manorKey) => {
          const manorRow = aggregate.manor_rows_by_key[manorKey];
          return [
            manorKey,
            {
              schema_version: manorRow.schema_version,
              scope_key: manorRow.scope_key,
              manor_id: manorRow.manor_id,
              manor_key: manorRow.manor_key,
              asset_rollup_keys: buildOrderedRecord(
                ECONOMY_PORTFOLIO_ASSET_KEYS,
                (assetKey) => manorRow.asset_rollup_keys[assetKey]
              ),
              category_rollup_keys: buildOrderedRecord(
                ECONOMY_PORTFOLIO_CATEGORY_KEYS,
                (categoryKey) => manorRow.category_rollup_keys[categoryKey]
              ),
              net_rollup_keys: buildOrderedRecord(
                ECONOMY_PORTFOLIO_NET_KEYS,
                (netKey) => manorRow.net_rollup_keys[netKey]
              ),
              asset_totals: buildOrderedRecord(
                ECONOMY_PORTFOLIO_ASSET_KEYS,
                (assetKey) => manorRow.asset_totals[assetKey]
              ),
              category_totals: buildOrderedRecord(
                ECONOMY_PORTFOLIO_CATEGORY_KEYS,
                (categoryKey) => manorRow.category_totals[categoryKey]
              )
            }
          ];
        })
    )
  });
}
