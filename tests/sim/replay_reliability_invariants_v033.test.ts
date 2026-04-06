import { describe, expect, it } from "vitest";

import { applyDecisions, createNewRun, proposeTurn } from "../../src/sim";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";
import {
  ECONOMY_PORTFOLIO_ASSET_KEYS,
  ECONOMY_PORTFOLIO_CATEGORY_KEYS,
  type EconomyPortfolioAssetKeyV1,
  type EconomyPortfolioCategoryKeyV1
} from "../../src/sim/domains/economy/portfolioRegistry";
import { decide } from "../../src/sim/policies";
import {
  ECONOMY_REGISTRY_PLACEHOLDER_SCHEMA_VERSION,
  MANOR_ECONOMY_SURFACE_ID,
  MANOR_ECONOMY_SURFACE_SCHEMA_VERSION,
  MANOR_ECONOMY_TRACKED_STATE_PATHS
} from "../../src/sim/stateRegistryPlaceholders";

const ECONOMY_TRACKED_PATHS = [...MANOR_ECONOMY_TRACKED_STATE_PATHS];

function readPath(root: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), root);
}

function assertEconomyPlaceholderInvariants(state: any) {
  expect(state.economy).toMatchObject({
    schema_version: ECONOMY_REGISTRY_PLACEHOLDER_SCHEMA_VERSION,
    surface_id: MANOR_ECONOMY_SURFACE_ID,
    surface_schema_version: MANOR_ECONOMY_SURFACE_SCHEMA_VERSION
  });
  expect(state.economy?.tracked_state_paths).toEqual(ECONOMY_TRACKED_PATHS);

  for (const path of ECONOMY_TRACKED_PATHS) {
    const value = readPath(state, path);
    if (path.endsWith("war_levy_due") && (value === null || value === undefined)) continue;
    expect(Number.isFinite(value as number)).toBe(true);
    expect((value as number) >= 0).toBe(true);
  }
}

function assertPortfolioTotalsInvariant(state: any) {
  const snapshot = boundedSnapshot(state) as any;
  const portfolio = snapshot.portfolio as {
    totals_by_asset: Record<EconomyPortfolioAssetKeyV1, number>;
    totals_by_category: Record<EconomyPortfolioCategoryKeyV1, number>;
    manor_rows_by_key: Record<
      string,
      {
        asset_totals: Record<EconomyPortfolioAssetKeyV1, number>;
        category_totals: Record<EconomyPortfolioCategoryKeyV1, number>;
      }
    >;
  };

  const assetTotals = Object.fromEntries(ECONOMY_PORTFOLIO_ASSET_KEYS.map((key) => [key, 0])) as Record<
    EconomyPortfolioAssetKeyV1,
    number
  >;
  const categoryTotals = Object.fromEntries(ECONOMY_PORTFOLIO_CATEGORY_KEYS.map((key) => [key, 0])) as Record<
    EconomyPortfolioCategoryKeyV1,
    number
  >;

  for (const row of Object.values(portfolio.manor_rows_by_key)) {
    for (const key of ECONOMY_PORTFOLIO_ASSET_KEYS) {
      assetTotals[key] += row.asset_totals[key];
    }
    for (const key of ECONOMY_PORTFOLIO_CATEGORY_KEYS) {
      categoryTotals[key] += row.category_totals[key];
    }
  }

  expect(portfolio.totals_by_asset).toEqual(assetTotals);
  expect(portfolio.totals_by_category).toEqual(categoryTotals);
}

describe("replay reliability invariants v0.3.3", () => {
  it("keeps economy placeholder registry paths finite and non-negative", () => {
    const seeds = ["reliability_econ_paths_v033_a", "reliability_econ_paths_v033_b"];
    for (const seed of seeds) {
      let state = createNewRun(seed);
      assertEconomyPlaceholderInvariants(state);

      for (let turn = 0; turn < 3; turn += 1) {
        const ctx = proposeTurn(state);
        const decisions = decide("prudent-builder", state, ctx);
        state = applyDecisions(state, decisions);
        assertEconomyPlaceholderInvariants(state);
        if (state.game_over) break;
      }
    }
  });

  it("keeps portfolio snapshot totals equal to summed manor totals", () => {
    const seeds = ["reliability_portfolio_v033_a", "reliability_portfolio_v033_b"];
    for (const seed of seeds) {
      let state = createNewRun(seed);
      const preview = proposeTurn(state).preview_state;
      assertPortfolioTotalsInvariant(preview);

      for (let turn = 0; turn < 3; turn += 1) {
        const ctx = proposeTurn(state);
        const decisions = decide("prudent-builder", state, ctx);
        state = applyDecisions(state, decisions);
        assertPortfolioTotalsInvariant(state);
        if (state.game_over) break;
      }
    }
  });
});
