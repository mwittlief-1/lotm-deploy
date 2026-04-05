import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PortfolioOverviewPanel } from "../../src/ui/panels/PortfolioOverviewPanel";
import { buildPortfolioOverviewSurface } from "../../src/ui/playScreenPortfolio";

describe("PortfolioOverviewPanel", () => {
  it("renders portfolio totals and the bounded outlier manor list", () => {
    const surface = buildPortfolioOverviewSurface({
      world_topology_view: {
        anchor_manor_id: "manor_hx_26597"
      },
      portfolio: {
        schema_version: "economy_portfolio_analysis_v1",
        manor_keys: ["portfolio:player_portfolio:manor:manor_hx_26597"],
        totals_by_asset: {
          coin: 14,
          food_stores: 90,
          meat_stores: 4
        },
        totals_by_category: {
          "obligations.current_due.coin": 2,
          "obligations.current_due.food_stores": 60,
          "obligations.arrears.coin": 1,
          "obligations.arrears.food_stores": 12
        },
        outliers_by_metric: {
          "outlier.lowest.net.coin": [{ manor_id: "manor_hx_26597", value: 11 }],
          "outlier.lowest.net.food_stores": [{ manor_id: "manor_hx_26597", value: 18 }],
          "outlier.highest.arrears_coin": [{ manor_id: "manor_hx_26597", value: 1 }],
          "outlier.highest.arrears_bushels": [{ manor_id: "manor_hx_26597", value: 12 }],
          "outlier.highest.coin": [{ manor_id: "manor_hx_26597", value: 14 }],
          "outlier.highest.food_stores": [{ manor_id: "manor_hx_26597", value: 90 }]
        }
      }
    });

    if (!surface) {
      throw new Error("Expected a portfolio overview surface.");
    }

    const html = renderToStaticMarkup(<PortfolioOverviewPanel surface={surface} />);

    expect(html).toContain("Portfolio Totals &amp; Outliers");
    expect(html).toContain("1 tracked manor");
    expect(html).toContain("Portfolio coin");
    expect(html).toContain("Food arrears");
    expect(html).toContain("Outlier manors");
    expect(html).toContain("Current manor");
    expect(html).toContain("Most food arrears: 12 bushels");
    expect(html).toContain("Lowest net coin: 11 coin");
  });
});
