import type {
  EconomyRegistryPlaceholderV1,
  ManorState,
  PortfolioRegistryPlaceholderV1,
  RunState
} from "./types";
import { asNonNegInt } from "./util";

export const MANOR_ECONOMY_SURFACE_ID = "manor_economy_surface" as const;
export const MANOR_ECONOMY_SURFACE_SCHEMA_VERSION = "manor_economy_surface_v1" as const;
export const ECONOMY_REGISTRY_PLACEHOLDER_SCHEMA_VERSION = "economy_registry_placeholder_v1" as const;
export const PORTFOLIO_REGISTRY_PLACEHOLDER_SCHEMA_VERSION = "portfolio_registry_placeholder_v1" as const;

export const MANOR_ECONOMY_TRACKED_STATE_PATHS = [
  "manor.bushels_stored",
  "manor.coin",
  "manor.meat_stores",
  "manor.obligations.arrears.bushels",
  "manor.obligations.arrears.coin",
  "manor.obligations.tax_due_coin",
  "manor.obligations.tithe_due_bushels",
  "manor.obligations.war_levy_due"
] as const;

export function buildEconomyRegistryPlaceholder(): EconomyRegistryPlaceholderV1 {
  return {
    schema_version: ECONOMY_REGISTRY_PLACEHOLDER_SCHEMA_VERSION,
    surface_id: MANOR_ECONOMY_SURFACE_ID,
    surface_schema_version: MANOR_ECONOMY_SURFACE_SCHEMA_VERSION,
    tracked_state_paths: [...MANOR_ECONOMY_TRACKED_STATE_PATHS]
  };
}

export function ensureEconomyRegistryPlaceholder(state: RunState): RunState {
  const manor = state.manor as ManorState & { meat_stores?: number };
  manor.meat_stores = asNonNegInt(Number(manor.meat_stores ?? 0));

  const anyState = state as RunState & { economy?: unknown };
  const scaffold = buildEconomyRegistryPlaceholder();
  if (!anyState.economy || typeof anyState.economy !== "object" || Array.isArray(anyState.economy)) {
    anyState.economy = scaffold;
    return state;
  }

  const economy = anyState.economy as Record<string, unknown>;
  economy.schema_version = scaffold.schema_version;
  economy.surface_id = scaffold.surface_id;
  economy.surface_schema_version = scaffold.surface_schema_version;
  economy.tracked_state_paths = [...scaffold.tracked_state_paths];
  return state;
}

export function buildPortfolioRegistryPlaceholder(): PortfolioRegistryPlaceholderV1 {
  return {
    schema_version: PORTFOLIO_REGISTRY_PLACEHOLDER_SCHEMA_VERSION,
    positions: []
  };
}

export function ensurePortfolioRegistryPlaceholder(state: RunState): RunState {
  const anyState = state as RunState & { portfolio?: unknown };
  const scaffold = buildPortfolioRegistryPlaceholder();
  if (!anyState.portfolio || typeof anyState.portfolio !== "object" || Array.isArray(anyState.portfolio)) {
    anyState.portfolio = scaffold;
    return state;
  }

  const portfolio = anyState.portfolio as Record<string, unknown>;
  portfolio.schema_version = scaffold.schema_version;
  if (!Array.isArray(portfolio.positions)) {
    portfolio.positions = [];
  } else {
    portfolio.positions = [...portfolio.positions];
  }
  return state;
}
