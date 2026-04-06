import { describe, expect, it } from "vitest";

import { applyDecisions, createNewRun, proposeTurn } from "../../src/sim";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";
import { buildBoundedWorldTopologyView } from "../../src/sim/domains/world";
import { decide } from "../../src/sim/policies";

describe("portfolio phase integration", () => {
  it("populates bounded portfolio analysis on preview state", () => {
    const state = createNewRun("portfolio_phase_preview_v032");
    const ctx = proposeTurn(state);
    const snapshot = boundedSnapshot(ctx.preview_state);
    const portfolio = snapshot.portfolio as Record<string, any>;
    const anchor = buildBoundedWorldTopologyView();
    const manorKey = portfolio.manor_keys[0];
    const manorRow = portfolio.manor_rows_by_key[manorKey];

    expect(portfolio.schema_version).toBe("economy_portfolio_analysis_v1");
    expect(portfolio.scope.scope_id).toBe("player_portfolio");
    expect(portfolio.manor_keys).toHaveLength(1);
    expect(manorRow.manor_id).toBe(anchor.anchor_manor_id);
    expect(manorRow.asset_totals.coin).toBe(ctx.preview_state.manor.coin);
    expect(manorRow.asset_totals.food_stores).toBe(ctx.preview_state.manor.bushels_stored);
    expect(manorRow.category_totals["obligations.current_due.coin"]).toBe(ctx.preview_state.manor.obligations.tax_due_coin);
    expect(manorRow.category_totals["obligations.current_due.food_stores"]).toBe(ctx.preview_state.manor.obligations.tithe_due_bushels);
    expect(portfolio.outliers_by_metric["outlier.highest.coin"][0]).toMatchObject({
      manor_id: anchor.anchor_manor_id,
      rank: 1,
      value: ctx.preview_state.manor.coin
    });
  });

  it("keeps portfolio analysis available in post-turn bounded snapshots", () => {
    const state = createNewRun("portfolio_phase_apply_v032");
    const ctx = proposeTurn(state);
    const decisions = decide("prudent-builder", state, ctx);
    const next = applyDecisions(state, decisions);
    const entry = next.log.at(-1);
    const afterPortfolio = entry?.snapshot_after?.portfolio as Record<string, any>;
    const manorKey = afterPortfolio.manor_keys[0];
    const manorRow = afterPortfolio.manor_rows_by_key[manorKey];

    expect(afterPortfolio.schema_version).toBe("economy_portfolio_analysis_v1");
    expect(manorRow.asset_totals.coin).toBe(next.manor.coin);
    expect(manorRow.category_totals["obligations.arrears.coin"]).toBe(next.manor.obligations.arrears.coin);
    expect(manorRow.category_totals["obligations.arrears.food_stores"]).toBe(next.manor.obligations.arrears.bushels);
    expect(afterPortfolio.outliers_by_metric["outlier.lowest.net.coin"][0]).toMatchObject({
      manor_id: manorRow.manor_id,
      rank: 1,
      value: manorRow.net_values["net.coin"]
    });
  });
});
