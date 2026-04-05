import { describe, expect, it } from "vitest";

import {
  ECONOMY_PORTFOLIO_ASSET_KEYS,
  ECONOMY_PORTFOLIO_CATEGORY_KEYS,
  type EconomyPortfolioAssetKeyV1,
  type EconomyPortfolioCategoryKeyV1
} from "../../src/sim/domains/economy/portfolioRegistry";
import {
  buildEconomyPortfolioAnalysis,
  serializeEconomyPortfolioAnalysis
} from "../../src/sim/domains/economy/portfolioAnalysis";
import type { EconomyPortfolioManorInputV1 } from "../../src/sim/domains/economy/portfolioAggregation";
import { Rng } from "../../src/sim/rng";

const SEED_PACK = [
  "lotm_v022_seed_001_baseline_extworld",
  "lotm_v022_seed_002_relationship_edges",
  "lotm_v022_seed_003_succession_pressure",
  "lotm_v022_seed_004_widow_line",
  "lotm_v022_seed_005_unrest_pressure",
  "lotm_v022_seed_006_construction_path",
  "lotm_v022_seed_007_weather_volatility",
  "lotm_v022_seed_008_long_tail_check"
];

function buildSeededManorInputs(seed: string): EconomyPortfolioManorInputV1[] {
  const rng = new Rng(seed, "worldgen", 0, "portfolio_regression");
  const manorCount = rng.int(3, 5);
  const inputs: EconomyPortfolioManorInputV1[] = [];

  for (let i = 0; i < manorCount; i += 1) {
    const manorId = `manor_${rng.int(1000, 9999)}_${i}`;
    const assetTotals = {
      coin: rng.int(0, 50),
      food_stores: rng.int(0, 120),
      meat_stores: rng.int(0, 40)
    };

    const categoryTotals: Partial<Record<EconomyPortfolioCategoryKeyV1, number>> = {};
    for (const key of ECONOMY_PORTFOLIO_CATEGORY_KEYS) {
      if (rng.bool(0.55)) {
        categoryTotals[key] = rng.int(0, 25);
      }
    }

    inputs.push({
      manor_id: manorId,
      asset_totals: assetTotals,
      category_totals: categoryTotals
    });
  }

  return inputs;
}

function sumManorAssets(
  manorRows: Record<string, { asset_totals: Record<EconomyPortfolioAssetKeyV1, number> }>
): Record<EconomyPortfolioAssetKeyV1, number> {
  const totals = Object.fromEntries(ECONOMY_PORTFOLIO_ASSET_KEYS.map((key) => [key, 0])) as Record<
    EconomyPortfolioAssetKeyV1,
    number
  >;
  for (const row of Object.values(manorRows)) {
    for (const key of ECONOMY_PORTFOLIO_ASSET_KEYS) {
      totals[key] += row.asset_totals[key];
    }
  }
  return totals;
}

function sumManorCategories(
  manorRows: Record<string, { category_totals: Record<EconomyPortfolioCategoryKeyV1, number> }>
): Record<EconomyPortfolioCategoryKeyV1, number> {
  const totals = Object.fromEntries(ECONOMY_PORTFOLIO_CATEGORY_KEYS.map((key) => [key, 0])) as Record<
    EconomyPortfolioCategoryKeyV1,
    number
  >;
  for (const row of Object.values(manorRows)) {
    for (const key of ECONOMY_PORTFOLIO_CATEGORY_KEYS) {
      totals[key] += row.category_totals[key];
    }
  }
  return totals;
}

describe("portfolio invariant regression suite", () => {
  it("keeps portfolio totals equal to summed manor totals across the seed pack", () => {
    for (const seed of SEED_PACK) {
      const manors = buildSeededManorInputs(seed);
      const analysis = buildEconomyPortfolioAnalysis({ scope_id: "seed_pack", manors });

      expect(analysis.totals_by_asset).toEqual(sumManorAssets(analysis.manor_rows_by_key));
      expect(analysis.totals_by_category).toEqual(sumManorCategories(analysis.manor_rows_by_key));
    }
  });

  it("keeps multi-manor rollups deterministic for each seed pack entry", () => {
    for (const seed of SEED_PACK) {
      const manors = buildSeededManorInputs(seed);
      const analysisA = buildEconomyPortfolioAnalysis({ scope_id: "seed_pack", manors });
      const analysisB = buildEconomyPortfolioAnalysis({
        scope_id: "seed_pack",
        manors: [...manors].reverse()
      });

      expect(serializeEconomyPortfolioAnalysis(analysisA)).toBe(serializeEconomyPortfolioAnalysis(analysisB));
    }
  });
});
