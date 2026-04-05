import { describe, expect, it } from "vitest";

import {
  DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID,
  ECONOMY_PORTFOLIO_ASSET_KEYS,
  ECONOMY_PORTFOLIO_CATEGORY_KEYS,
  ECONOMY_PORTFOLIO_MANOR_ROW_SCHEMA_VERSION,
  ECONOMY_PORTFOLIO_NET_KEYS,
  ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS,
  ECONOMY_PORTFOLIO_REGISTRY_SCHEMA_VERSION,
  ECONOMY_PORTFOLIO_SCOPE_SCHEMA_VERSION,
  buildEconomyPortfolioRegistry,
  buildEconomyPortfolioScope,
  makeEconomyPortfolioManorKey,
  makeEconomyPortfolioScopeKey,
  serializeEconomyPortfolioRegistry,
  toEconomyPortfolioManorRow
} from "../../src/sim/domains/economy/portfolioRegistry";

describe("economy portfolio registry contract", () => {
  it("locks the portfolio scope, category, net, and outlier key inventory", () => {
    expect(ECONOMY_PORTFOLIO_REGISTRY_SCHEMA_VERSION).toBe("economy_portfolio_registry_v1");
    expect(ECONOMY_PORTFOLIO_SCOPE_SCHEMA_VERSION).toBe("economy_portfolio_scope_v1");
    expect(ECONOMY_PORTFOLIO_MANOR_ROW_SCHEMA_VERSION).toBe("economy_portfolio_manor_row_v1");
    expect(DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID).toBe("player_portfolio");
    expect(ECONOMY_PORTFOLIO_ASSET_KEYS).toEqual(["coin", "food_stores", "meat_stores"]);
    expect(ECONOMY_PORTFOLIO_CATEGORY_KEYS).toEqual([
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
    ]);
    expect(ECONOMY_PORTFOLIO_NET_KEYS).toEqual([
      "net.coin",
      "net.food_stores",
      "net.meat_stores"
    ]);
    expect(ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS).toEqual([
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
    ]);
  });

  it("builds deterministic scope and manor row rollup keys", () => {
    const scope = buildEconomyPortfolioScope();
    const scopeKey = makeEconomyPortfolioScopeKey();
    const manorRow = toEconomyPortfolioManorRow("abbey_demesne");
    const manorKey = makeEconomyPortfolioManorKey(scopeKey, "abbey_demesne");

    expect(scope).toEqual({
      schema_version: ECONOMY_PORTFOLIO_SCOPE_SCHEMA_VERSION,
      scope_id: DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID,
      scope_key: scopeKey,
      total_asset_keys: {
        coin: "portfolio:player_portfolio:total_asset:coin",
        food_stores: "portfolio:player_portfolio:total_asset:food_stores",
        meat_stores: "portfolio:player_portfolio:total_asset:meat_stores"
      },
      total_category_keys: {
        "obligations.current_due.coin": "portfolio:player_portfolio:total_category:obligations.current_due.coin",
        "obligations.current_due.food_stores":
          "portfolio:player_portfolio:total_category:obligations.current_due.food_stores",
        "obligations.arrears.coin": "portfolio:player_portfolio:total_category:obligations.arrears.coin",
        "obligations.arrears.food_stores":
          "portfolio:player_portfolio:total_category:obligations.arrears.food_stores",
        "obligations.enforcement.war_levy":
          "portfolio:player_portfolio:total_category:obligations.enforcement.war_levy",
        "production.food_delta": "portfolio:player_portfolio:total_category:production.food_delta",
        "production.meat_delta": "portfolio:player_portfolio:total_category:production.meat_delta",
        "consumption.food_stores": "portfolio:player_portfolio:total_category:consumption.food_stores",
        "consumption.meat_stores": "portfolio:player_portfolio:total_category:consumption.meat_stores",
        "consumption.shortage_bushels":
          "portfolio:player_portfolio:total_category:consumption.shortage_bushels"
      },
      outlier_metric_keys: {
        "outlier.highest.coin": "portfolio:player_portfolio:outlier.highest.coin",
        "outlier.lowest.coin": "portfolio:player_portfolio:outlier.lowest.coin",
        "outlier.highest.food_stores": "portfolio:player_portfolio:outlier.highest.food_stores",
        "outlier.lowest.food_stores": "portfolio:player_portfolio:outlier.lowest.food_stores",
        "outlier.highest.meat_stores": "portfolio:player_portfolio:outlier.highest.meat_stores",
        "outlier.lowest.meat_stores": "portfolio:player_portfolio:outlier.lowest.meat_stores",
        "outlier.highest.tax_due_coin": "portfolio:player_portfolio:outlier.highest.tax_due_coin",
        "outlier.highest.tithe_due_bushels": "portfolio:player_portfolio:outlier.highest.tithe_due_bushels",
        "outlier.highest.arrears_coin": "portfolio:player_portfolio:outlier.highest.arrears_coin",
        "outlier.highest.arrears_bushels": "portfolio:player_portfolio:outlier.highest.arrears_bushels",
        "outlier.highest.production.food_delta": "portfolio:player_portfolio:outlier.highest.production.food_delta",
        "outlier.highest.production.meat_delta": "portfolio:player_portfolio:outlier.highest.production.meat_delta",
        "outlier.highest.consumption.shortage_bushels":
          "portfolio:player_portfolio:outlier.highest.consumption.shortage_bushels",
        "outlier.lowest.net.coin": "portfolio:player_portfolio:outlier.lowest.net.coin",
        "outlier.lowest.net.food_stores": "portfolio:player_portfolio:outlier.lowest.net.food_stores",
        "outlier.lowest.net.meat_stores": "portfolio:player_portfolio:outlier.lowest.net.meat_stores"
      }
    });

    expect(manorRow).toEqual({
      schema_version: ECONOMY_PORTFOLIO_MANOR_ROW_SCHEMA_VERSION,
      scope_key: scopeKey,
      manor_id: "abbey_demesne",
      manor_key: manorKey,
      asset_rollup_keys: {
        coin: `${manorKey}:asset:coin`,
        food_stores: `${manorKey}:asset:food_stores`,
        meat_stores: `${manorKey}:asset:meat_stores`
      },
      category_rollup_keys: {
        "obligations.current_due.coin": `${manorKey}:category:obligations.current_due.coin`,
        "obligations.current_due.food_stores": `${manorKey}:category:obligations.current_due.food_stores`,
        "obligations.arrears.coin": `${manorKey}:category:obligations.arrears.coin`,
        "obligations.arrears.food_stores": `${manorKey}:category:obligations.arrears.food_stores`,
        "obligations.enforcement.war_levy": `${manorKey}:category:obligations.enforcement.war_levy`,
        "production.food_delta": `${manorKey}:category:production.food_delta`,
        "production.meat_delta": `${manorKey}:category:production.meat_delta`,
        "consumption.food_stores": `${manorKey}:category:consumption.food_stores`,
        "consumption.meat_stores": `${manorKey}:category:consumption.meat_stores`,
        "consumption.shortage_bushels": `${manorKey}:category:consumption.shortage_bushels`
      },
      net_rollup_keys: {
        "net.coin": `${manorKey}:net.coin`,
        "net.food_stores": `${manorKey}:net.food_stores`,
        "net.meat_stores": `${manorKey}:net.meat_stores`
      }
    });
  });

  it("sorts, trims, and dedupes manor ids before assigning manor row keys", () => {
    const registry = buildEconomyPortfolioRegistry({
      manor_ids: ["  north_field  ", "abbey_demesne", "north_field", "", "  "]
    });

    expect(registry.manor_keys).toEqual([
      "portfolio:player_portfolio:manor:abbey_demesne",
      "portfolio:player_portfolio:manor:north_field"
    ]);
    expect(Object.keys(registry.manor_rows_by_key)).toEqual(registry.manor_keys);
    expect(registry.manor_rows_by_key["portfolio:player_portfolio:manor:north_field"]).toMatchObject({
      manor_id: "north_field",
      manor_key: "portfolio:player_portfolio:manor:north_field"
    });
  });

  it("serializes the registry deterministically regardless of manor input order", () => {
    const registryA = buildEconomyPortfolioRegistry({
      scope_id: "county_review",
      manor_ids: ["north_field", "abbey_demesne", "west_hall"]
    });
    const registryB = buildEconomyPortfolioRegistry({
      scope_id: "county_review",
      manor_ids: ["west_hall", "north_field", "abbey_demesne"]
    });

    expect(serializeEconomyPortfolioRegistry(registryA)).toBe(serializeEconomyPortfolioRegistry(registryB));
  });
});
