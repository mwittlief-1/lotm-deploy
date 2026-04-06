export const ECONOMY_PORTFOLIO_REGISTRY_SCHEMA_VERSION = "economy_portfolio_registry_v1" as const;
export const ECONOMY_PORTFOLIO_SCOPE_SCHEMA_VERSION = "economy_portfolio_scope_v1" as const;
export const ECONOMY_PORTFOLIO_MANOR_ROW_SCHEMA_VERSION = "economy_portfolio_manor_row_v1" as const;
export const DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID = "player_portfolio" as const;

export const ECONOMY_PORTFOLIO_ASSET_KEYS = [
  "coin",
  "food_stores",
  "meat_stores"
] as const;

export const ECONOMY_PORTFOLIO_CATEGORY_KEYS = [
  "obligations.current_due.coin",
  "obligations.current_due.food_stores",
  "obligations.arrears.coin",
  "obligations.arrears.food_stores",
  "obligations.enforcement.war_levy",
  "production.food_delta",
  "production.meat_delta",
  "consumption.food_stores",
  "consumption.meat_stores",
  "consumption.shortage_bushels"
] as const;

export const ECONOMY_PORTFOLIO_NET_KEYS = [
  "net.coin",
  "net.food_stores",
  "net.meat_stores"
] as const;

export const ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS = [
  "outlier.highest.coin",
  "outlier.lowest.coin",
  "outlier.highest.food_stores",
  "outlier.lowest.food_stores",
  "outlier.highest.meat_stores",
  "outlier.lowest.meat_stores",
  "outlier.highest.tax_due_coin",
  "outlier.highest.tithe_due_bushels",
  "outlier.highest.arrears_coin",
  "outlier.highest.arrears_bushels",
  "outlier.highest.production.food_delta",
  "outlier.highest.production.meat_delta",
  "outlier.highest.consumption.shortage_bushels",
  "outlier.lowest.net.coin",
  "outlier.lowest.net.food_stores",
  "outlier.lowest.net.meat_stores"
] as const;

export type EconomyPortfolioRegistrySchemaVersionV1 = typeof ECONOMY_PORTFOLIO_REGISTRY_SCHEMA_VERSION;
export type EconomyPortfolioScopeSchemaVersionV1 = typeof ECONOMY_PORTFOLIO_SCOPE_SCHEMA_VERSION;
export type EconomyPortfolioManorRowSchemaVersionV1 = typeof ECONOMY_PORTFOLIO_MANOR_ROW_SCHEMA_VERSION;
export type EconomyPortfolioAssetKeyV1 = typeof ECONOMY_PORTFOLIO_ASSET_KEYS[number];
export type EconomyPortfolioCategoryKeyV1 = typeof ECONOMY_PORTFOLIO_CATEGORY_KEYS[number];
export type EconomyPortfolioNetKeyV1 = typeof ECONOMY_PORTFOLIO_NET_KEYS[number];
export type EconomyPortfolioOutlierMetricKeyV1 = typeof ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS[number];

export interface EconomyPortfolioScopeV1 {
  schema_version: EconomyPortfolioScopeSchemaVersionV1;
  scope_id: string;
  scope_key: string;
  total_asset_keys: Record<EconomyPortfolioAssetKeyV1, string>;
  total_category_keys: Record<EconomyPortfolioCategoryKeyV1, string>;
  outlier_metric_keys: Record<EconomyPortfolioOutlierMetricKeyV1, string>;
}

export interface EconomyPortfolioManorRowV1 {
  schema_version: EconomyPortfolioManorRowSchemaVersionV1;
  scope_key: string;
  manor_id: string;
  manor_key: string;
  asset_rollup_keys: Record<EconomyPortfolioAssetKeyV1, string>;
  category_rollup_keys: Record<EconomyPortfolioCategoryKeyV1, string>;
  net_rollup_keys: Record<EconomyPortfolioNetKeyV1, string>;
}

export interface EconomyPortfolioRegistryV1 {
  schema_version: EconomyPortfolioRegistrySchemaVersionV1;
  scope: EconomyPortfolioScopeV1;
  manor_keys: string[];
  manor_rows_by_key: Record<string, EconomyPortfolioManorRowV1>;
}

export interface EconomyPortfolioRegistryInputV1 {
  scope_id?: string;
  manor_ids?: readonly string[];
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function canonicalId(value: string | undefined, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : fallback;
}

function keyToken(value: string): string {
  return encodeURIComponent(value);
}

function buildOrderedRecord<K extends string, V>(keys: readonly K[], valueFor: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, valueFor(key)])) as Record<K, V>;
}

function canonicalManorIds(manorIds: readonly string[]): string[] {
  const deduped = new Set<string>();
  for (const manorId of manorIds) {
    const canonical = canonicalId(manorId, "");
    if (canonical.length === 0) continue;
    deduped.add(canonical);
  }

  return [...deduped].sort(compareText);
}

export function makeEconomyPortfolioScopeKey(scopeId: string = DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID): string {
  return `portfolio:${keyToken(canonicalId(scopeId, DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID))}`;
}

export function makeEconomyPortfolioTotalAssetKey(
  scopeKey: string,
  assetKey: EconomyPortfolioAssetKeyV1
): string {
  return `${scopeKey}:total_asset:${assetKey}`;
}

export function makeEconomyPortfolioTotalCategoryKey(
  scopeKey: string,
  categoryKey: EconomyPortfolioCategoryKeyV1
): string {
  return `${scopeKey}:total_category:${categoryKey}`;
}

export function makeEconomyPortfolioOutlierBookkeepingKey(
  scopeKey: string,
  metricKey: EconomyPortfolioOutlierMetricKeyV1
): string {
  return `${scopeKey}:${metricKey}`;
}

export function makeEconomyPortfolioManorKey(scopeKey: string, manorId: string): string {
  return `${scopeKey}:manor:${keyToken(canonicalId(manorId, "unknown_manor"))}`;
}

export function makeEconomyPortfolioManorAssetRollupKey(
  manorKey: string,
  assetKey: EconomyPortfolioAssetKeyV1
): string {
  return `${manorKey}:asset:${assetKey}`;
}

export function makeEconomyPortfolioManorCategoryRollupKey(
  manorKey: string,
  categoryKey: EconomyPortfolioCategoryKeyV1
): string {
  return `${manorKey}:category:${categoryKey}`;
}

export function makeEconomyPortfolioManorNetRollupKey(
  manorKey: string,
  netKey: EconomyPortfolioNetKeyV1
): string {
  return `${manorKey}:${netKey}`;
}

export function buildEconomyPortfolioScope(scopeId: string = DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID): EconomyPortfolioScopeV1 {
  const normalizedScopeId = canonicalId(scopeId, DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID);
  const scopeKey = makeEconomyPortfolioScopeKey(normalizedScopeId);

  return {
    schema_version: ECONOMY_PORTFOLIO_SCOPE_SCHEMA_VERSION,
    scope_id: normalizedScopeId,
    scope_key: scopeKey,
    total_asset_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_ASSET_KEYS, (assetKey) =>
      makeEconomyPortfolioTotalAssetKey(scopeKey, assetKey)
    ),
    total_category_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_CATEGORY_KEYS, (categoryKey) =>
      makeEconomyPortfolioTotalCategoryKey(scopeKey, categoryKey)
    ),
    outlier_metric_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS, (metricKey) =>
      makeEconomyPortfolioOutlierBookkeepingKey(scopeKey, metricKey)
    )
  };
}

export function toEconomyPortfolioManorRow(
  manorId: string,
  scopeId: string = DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID
): EconomyPortfolioManorRowV1 {
  const normalizedScopeId = canonicalId(scopeId, DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID);
  const normalizedManorId = canonicalId(manorId, "unknown_manor");
  const scopeKey = makeEconomyPortfolioScopeKey(normalizedScopeId);
  const manorKey = makeEconomyPortfolioManorKey(scopeKey, normalizedManorId);

  return {
    schema_version: ECONOMY_PORTFOLIO_MANOR_ROW_SCHEMA_VERSION,
    scope_key: scopeKey,
    manor_id: normalizedManorId,
    manor_key: manorKey,
    asset_rollup_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_ASSET_KEYS, (assetKey) =>
      makeEconomyPortfolioManorAssetRollupKey(manorKey, assetKey)
    ),
    category_rollup_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_CATEGORY_KEYS, (categoryKey) =>
      makeEconomyPortfolioManorCategoryRollupKey(manorKey, categoryKey)
    ),
    net_rollup_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_NET_KEYS, (netKey) =>
      makeEconomyPortfolioManorNetRollupKey(manorKey, netKey)
    )
  };
}

export function buildEconomyPortfolioRegistry(
  input: EconomyPortfolioRegistryInputV1 = {}
): EconomyPortfolioRegistryV1 {
  const scope = buildEconomyPortfolioScope(input.scope_id);
  const manorRows = canonicalManorIds(input.manor_ids ?? []).map((manorId) => toEconomyPortfolioManorRow(manorId, scope.scope_id));

  return {
    schema_version: ECONOMY_PORTFOLIO_REGISTRY_SCHEMA_VERSION,
    scope,
    manor_keys: manorRows.map((row) => row.manor_key),
    manor_rows_by_key: Object.fromEntries(manorRows.map((row) => [row.manor_key, row]))
  };
}

function toEconomyPortfolioScopeSnapshot(scope: EconomyPortfolioScopeV1): EconomyPortfolioScopeV1 {
  return {
    schema_version: scope.schema_version,
    scope_id: canonicalId(scope.scope_id, DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID),
    scope_key: scope.scope_key,
    total_asset_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_ASSET_KEYS, (assetKey) => scope.total_asset_keys[assetKey]),
    total_category_keys: buildOrderedRecord(
      ECONOMY_PORTFOLIO_CATEGORY_KEYS,
      (categoryKey) => scope.total_category_keys[categoryKey]
    ),
    outlier_metric_keys: buildOrderedRecord(
      ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS,
      (metricKey) => scope.outlier_metric_keys[metricKey]
    )
  };
}

function toEconomyPortfolioManorRowSnapshot(row: EconomyPortfolioManorRowV1): EconomyPortfolioManorRowV1 {
  return {
    schema_version: row.schema_version,
    scope_key: row.scope_key,
    manor_id: canonicalId(row.manor_id, "unknown_manor"),
    manor_key: row.manor_key,
    asset_rollup_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_ASSET_KEYS, (assetKey) => row.asset_rollup_keys[assetKey]),
    category_rollup_keys: buildOrderedRecord(
      ECONOMY_PORTFOLIO_CATEGORY_KEYS,
      (categoryKey) => row.category_rollup_keys[categoryKey]
    ),
    net_rollup_keys: buildOrderedRecord(ECONOMY_PORTFOLIO_NET_KEYS, (netKey) => row.net_rollup_keys[netKey])
  };
}

export function serializeEconomyPortfolioRegistry(registry: EconomyPortfolioRegistryV1): string {
  return JSON.stringify({
    schema_version: registry.schema_version,
    scope: toEconomyPortfolioScopeSnapshot(registry.scope),
    manor_keys: [...registry.manor_keys].sort(compareText),
    manor_rows_by_key: Object.fromEntries(
      [...registry.manor_keys]
        .sort(compareText)
        .map((manorKey) => [manorKey, toEconomyPortfolioManorRowSnapshot(registry.manor_rows_by_key[manorKey])])
    )
  });
}
