import { FISCAL_LEDGER_RUNTIME_ASSET_PATHS } from "./schema";

export const ECONOMY_PRICE_TABLE_SCHEMA_VERSION = "economy_price_table_v1" as const;
export const ECONOMY_PRICE_REFERENCE_SCHEMA_VERSION = "economy_price_reference_v1" as const;

export const ECONOMY_PRICE_KEYS = [
  "food_stores_market_sell",
  "meat_stores_market_sell_placeholder",
  "farm_labor_turn_placeholder",
  "builder_labor_turn_placeholder"
] as const;

export const ECONOMY_PRICE_CATEGORIES = [
  "good",
  "labor"
] as const;

export const ECONOMY_PRICE_LIFECYCLES = [
  "active",
  "placeholder"
] as const;

export const ECONOMY_PRICE_MODELS = [
  "fixed_ratio"
] as const;

export const ECONOMY_PRICE_SUBJECTS = [
  "food_stores",
  "meat_stores",
  "farm_labor_turn",
  "builder_labor_turn"
] as const;

export const ECONOMY_PRICE_UNITS = [
  "store_unit",
  "labor_turn"
] as const;

export type EconomyPriceTableSchemaVersionV1 = typeof ECONOMY_PRICE_TABLE_SCHEMA_VERSION;
export type EconomyPriceReferenceSchemaVersionV1 = typeof ECONOMY_PRICE_REFERENCE_SCHEMA_VERSION;
export type EconomyPriceKeyV1 = typeof ECONOMY_PRICE_KEYS[number];
export type EconomyPriceCategoryV1 = typeof ECONOMY_PRICE_CATEGORIES[number];
export type EconomyPriceLifecycleV1 = typeof ECONOMY_PRICE_LIFECYCLES[number];
export type EconomyPriceModelV1 = typeof ECONOMY_PRICE_MODELS[number];
export type EconomyPriceSubjectV1 = typeof ECONOMY_PRICE_SUBJECTS[number];
export type EconomyPriceUnitV1 = typeof ECONOMY_PRICE_UNITS[number];
export type EconomyPriceQuoteAssetV1 = "coin";

export interface EconomyPriceContractEntryV1 {
  category: EconomyPriceCategoryV1;
  lifecycle: EconomyPriceLifecycleV1;
  subject: EconomyPriceSubjectV1;
  label: string;
  pricing_model: EconomyPriceModelV1;
  quote_asset: EconomyPriceQuoteAssetV1;
  quote_amount: number;
  base_amount: number;
  unit: EconomyPriceUnitV1;
  runtime_asset_path: string | null;
  notes: string;
}

export type EconomyPriceTableContractV1 = Readonly<Record<EconomyPriceKeyV1, EconomyPriceContractEntryV1>>;

export interface EconomyPriceTableEntryV1 extends EconomyPriceContractEntryV1 {
  price_key: EconomyPriceKeyV1;
}

export interface EconomyPriceTableSnapshotV1 {
  schema_version: EconomyPriceTableSchemaVersionV1;
  entries: EconomyPriceTableEntryV1[];
}

export interface EconomyPriceReferenceV1 extends EconomyPriceTableEntryV1 {
  schema_version: EconomyPriceReferenceSchemaVersionV1;
  reference_id: string;
}

// Keep prices as integer ratios so later wiring can stay deterministic without float drift.
export const ECONOMY_FIXED_PRICE_TABLE: EconomyPriceTableContractV1 = {
  food_stores_market_sell: {
    category: "good",
    lifecycle: "active",
    subject: "food_stores",
    label: "Food stores market sell",
    pricing_model: "fixed_ratio",
    quote_asset: "coin",
    quote_amount: 1,
    base_amount: 10,
    unit: "store_unit",
    runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.food_stores,
    notes: "Anchors the future fixed bushel sale constant near the legacy 0.10 coin-per-bushel midpoint."
  },
  meat_stores_market_sell_placeholder: {
    category: "good",
    lifecycle: "placeholder",
    subject: "meat_stores",
    label: "Meat stores market sell placeholder",
    pricing_model: "fixed_ratio",
    quote_asset: "coin",
    quote_amount: 1,
    base_amount: 5,
    unit: "store_unit",
    runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.meat_stores,
    notes: "Reserved for future meat-sale exposure without implying an active live market action in v0.3."
  },
  farm_labor_turn_placeholder: {
    category: "labor",
    lifecycle: "placeholder",
    subject: "farm_labor_turn",
    label: "Farm labor turn placeholder",
    pricing_model: "fixed_ratio",
    quote_asset: "coin",
    quote_amount: 1,
    base_amount: 1,
    unit: "labor_turn",
    runtime_asset_path: null,
    notes: "Reserved for future fixed labor pricing hooks; not wired into runtime actions in v0.3."
  },
  builder_labor_turn_placeholder: {
    category: "labor",
    lifecycle: "placeholder",
    subject: "builder_labor_turn",
    label: "Builder labor turn placeholder",
    pricing_model: "fixed_ratio",
    quote_asset: "coin",
    quote_amount: 2,
    base_amount: 1,
    unit: "labor_turn",
    runtime_asset_path: null,
    notes: "Reserved for future construction labor pricing hooks; not wired into runtime actions in v0.3."
  }
} as const;

function normalizePositiveInteger(value: number): number {
  return Math.max(1, Math.trunc(value));
}

function priceReferenceId(priceKey: EconomyPriceKeyV1): string {
  return `price_ref:${priceKey}`;
}

export function toEconomyPriceTableEntry(
  priceKey: EconomyPriceKeyV1,
  entry: EconomyPriceContractEntryV1 = ECONOMY_FIXED_PRICE_TABLE[priceKey]
): EconomyPriceTableEntryV1 {
  return {
    price_key: priceKey,
    category: entry.category,
    lifecycle: entry.lifecycle,
    subject: entry.subject,
    label: entry.label,
    pricing_model: entry.pricing_model,
    quote_asset: entry.quote_asset,
    quote_amount: normalizePositiveInteger(entry.quote_amount),
    base_amount: normalizePositiveInteger(entry.base_amount),
    unit: entry.unit,
    runtime_asset_path: entry.runtime_asset_path,
    notes: entry.notes
  };
}

export function buildEconomyPriceTableSnapshot(
  table: EconomyPriceTableContractV1 = ECONOMY_FIXED_PRICE_TABLE
): EconomyPriceTableSnapshotV1 {
  return {
    schema_version: ECONOMY_PRICE_TABLE_SCHEMA_VERSION,
    entries: ECONOMY_PRICE_KEYS.map((priceKey) => toEconomyPriceTableEntry(priceKey, table[priceKey]))
  };
}

export function serializeEconomyPriceTableSnapshot(
  table: EconomyPriceTableContractV1 = ECONOMY_FIXED_PRICE_TABLE
): string {
  return JSON.stringify(buildEconomyPriceTableSnapshot(table));
}

export function toEconomyPriceReference(
  priceKey: EconomyPriceKeyV1,
  table: EconomyPriceTableContractV1 = ECONOMY_FIXED_PRICE_TABLE
): EconomyPriceReferenceV1 {
  return {
    schema_version: ECONOMY_PRICE_REFERENCE_SCHEMA_VERSION,
    reference_id: priceReferenceId(priceKey),
    ...toEconomyPriceTableEntry(priceKey, table[priceKey])
  };
}

export function buildEconomyPriceReferenceSnapshot(
  table: EconomyPriceTableContractV1 = ECONOMY_FIXED_PRICE_TABLE
): EconomyPriceReferenceV1[] {
  return ECONOMY_PRICE_KEYS.map((priceKey) => toEconomyPriceReference(priceKey, table));
}

export function serializeEconomyPriceReferenceSnapshot(
  table: EconomyPriceTableContractV1 = ECONOMY_FIXED_PRICE_TABLE
): string {
  return JSON.stringify(buildEconomyPriceReferenceSnapshot(table));
}
