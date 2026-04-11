import { describe, expect, it } from "vitest";

import { buildDiffLedgerItems } from "../../src/ui/playScreenModel";

const MAINTENANCE_PREVIEW_STATE = {
  world_topology_view: {
    anchor_manor_id: "manor_hx_26597"
  },
  economy_maintenance_view: {
    schema_version: "economy_maintenance_view_v1",
    manor_keys: ["portfolio:player_portfolio:manor:manor_hx_26597"],
    manor_summaries_by_key: {
      "portfolio:player_portfolio:manor:manor_hx_26597": {
        manor_id: "manor_hx_26597",
        manor_key: "portfolio:player_portfolio:manor:manor_hx_26597",
        totals: {
          building_count: 0,
          coin_cost: 4,
          entry_count: 2,
          labor_required: 7,
          right_count: 2
        },
        active_project: null,
        building_entries: [],
        right_entries: [
          {
            entry_id: "right_bridge",
            entry_kind: "right",
            source_id: "bridge_crossing",
            source_kind: "right",
            source_label: "Bridge & crossing revenue",
            source_state: "active",
            coin_cost: 1,
            labor_required: 3
          },
          {
            entry_id: "right_market",
            entry_kind: "right",
            source_id: "market_right",
            source_kind: "right",
            source_label: "Market right",
            source_state: "active",
            coin_cost: 3,
            labor_required: 4
          }
        ]
      }
    }
  }
} as const;

describe("playScreenModel", () => {
  it("appends a deterministic maintenance ledger item from the accepted upkeep surface", () => {
    const items = buildDiffLedgerItems({
      beforeManor: {} as any,
      copy: {
        diffLedgerMultipleCauses: "Multiple causes this turn."
      },
      deltaBushels: 0,
      deltaCoin: 0,
      deltaPop: 0,
      deltaUnrest: 0,
      fmtSigned: (value: number) => (value > 0 ? `+${value}` : `${value}`),
      personNameFromRegistry: () => null,
      popChangeSummary: null,
      previewState: MAINTENANCE_PREVIEW_STATE as any,
      report: {
        diff_ledger_items: [
          {
            id: "coin",
            sort_mag: 5,
            tie_key: "01_coin",
            primary: "Coin: -2",
            why: "Tax due entering the turn.",
            source: "system_pressure"
          }
        ]
      },
      shouldSurfaceWeatherOnFood: false,
      state: {} as any,
      weatherHarmedHarvestWhy: null
    });

    expect(items.map((item) => item.id)).toEqual(["maintenance", "coin"]);
    expect(items[0]).toEqual({
      id: "maintenance",
      sort_mag: 11,
      tie_key: "04_maintenance",
      primary: "Maintenance: 7 labor, 4 coin across 2 upkeep rows.",
      why: "Rights upkeep remains visible here so labor and coin pressure does not disappear into lower output totals.",
      source: "system_pressure"
    });
  });
});
