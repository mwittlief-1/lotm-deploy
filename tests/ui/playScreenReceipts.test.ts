import { describe, expect, it } from "vitest";

import type { PhaseResultV0 } from "../../src/sim/types";
import type { LedgerItem } from "../../src/ui/playScreenModel";
import { buildObligationsCounterpartyContract } from "../../src/ui/playScreenObligations";
import {
  buildReceiptViewerData,
  createExplainChangesRoute,
  createResourceChipRoute,
  selectCounterpartyReceiptSections,
  selectGroupedReceiptSections,
  selectRawReceiptPhases
} from "../../src/ui/playScreenReceipts";

const DIFF_LEDGER_ITEMS: LedgerItem[] = [
  {
    id: "food",
    sort_mag: 40,
    tie_key: "00_food",
    primary: "Food: -321 bushels · Stores: 905",
    why: "Weather harmed harvest (0.70x)",
    source: "system_pressure"
  },
  {
    id: "coin",
    sort_mag: 7,
    tie_key: "01_coin",
    primary: "Coin: -2",
    why: "Tax due entering the turn.",
    source: "system_pressure"
  },
  {
    id: "unrest",
    sort_mag: 5,
    tie_key: "03_unrest",
    primary: "Unrest: +3",
    why: "Multiple causes this turn.",
    source: "event"
  }
];

const OBLIGATIONS_CONTRACT = buildObligationsCounterpartyContract({
  courtDecisionBudget: {
    limit: 6,
    spent: 1,
    remaining: 5,
    exhausted: false,
    entries: [
      {
        action: "gift_liege",
        cost: 1,
        spent: 0,
        label: "Gift to liege",
        detail: "Court favor spent on noble gifts.",
        isHighestCost: false
      },
      {
        action: "offering_church",
        cost: 1,
        spent: 1,
        label: "Offering to church",
        detail: "Court effort spent on religious offerings.",
        isHighestCost: false
      }
    ]
  } as any,
  previewState: {
    economy_obligations_view: {
      schema_version: "economy_obligations_view_v1",
      counterparty_order: ["liege", "church"],
      counterparty_summaries: [
        {
          counterparty_kind: "liege",
          counterparty_label: "House Liege",
          due_amount: 2,
          arrears_amount: 1,
          enforcement_stage: 1,
          settlement_status: "due_and_arrears",
          settlement_summary: "House Liege: 1 coin in arrears, 2 coin due.",
          enforcement_state: "arrears",
          enforcement_summary: "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
          settled_this_turn: false,
          carried_this_turn: true
        },
        {
          counterparty_kind: "church",
          counterparty_label: "Parish Church",
          due_amount: 60,
          arrears_amount: 12,
          enforcement_stage: 1,
          settlement_status: "due_and_arrears",
          settlement_summary: "Parish Church: 12 bushels in arrears, 60 bushels due.",
          enforcement_state: "arrears",
          enforcement_summary: "Stage-one enforcement pressure rose for Parish Church because arrears remain open after carry.",
          settled_this_turn: false,
          carried_this_turn: true
        }
      ]
    }
  } as any
});

const PHASE_RESULTS: PhaseResultV0[] = [
  {
    phase: "obligations",
    receipts: [
      { kind: "summary", line: "Tax due 2 coin; tithe due 60 bushels." },
      { kind: "summary", line: "Arrears coin 1; arrears bushels 12." }
    ],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
  },
  {
    phase: "consumption",
    receipts: [
      { kind: "summary", line: "Weather 0.70; market 0.08 coin/bushel; sell cap 460." },
      { kind: "summary", line: "Spoilage -41; production +1539; consumption -1819." }
    ],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
  },
  {
    phase: "events",
    receipts: [{ kind: "summary", line: "2 events applied." }],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
  }
];

const STRUCTURED_PHASE_RESULTS: PhaseResultV0[] = [
  {
    phase: "obligations",
    receipts: [{ kind: "summary", line: "Legacy obligation receipt that should stay hidden when structured rows are present." }],
    fiscal_receipts_v1: [
      {
        schema_version: "fiscal_receipt_v1",
        receipt_id: "ledger:t7:obligations:p5:coin:0001",
        turn: 7,
        phase: "obligations",
        phase_sequence: 5,
        category: "gift.liege",
        counterparty_kind: "liege",
        counterparty_id: "p_liege",
        counterparty_label: "House Liege",
        asset: "coin",
        delta: -2,
        balance_after: 5,
        summary: "Sent a coin gift to House Liege.",
        rule_id: "obligations.liege_gift",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        schema_version: "fiscal_receipt_v1",
        receipt_id: "ledger:t7:obligations:p6:food_stores:0002",
        turn: 7,
        phase: "obligations",
        phase_sequence: 6,
        category: "offering.church",
        counterparty_kind: "church",
        counterparty_id: "p_clergy",
        counterparty_label: "Parish Church",
        asset: "food_stores",
        delta: -4,
        balance_after: 101,
        summary: "Delivered a grain offering to the Parish Church.",
        rule_id: "obligations.church_offering",
        related_actor_ids: ["p_head", "p_clergy"]
      }
    ],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
  },
  {
    phase: "events",
    receipts: [{ kind: "summary", line: "2 events applied." }],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
  }
];

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

const MAINTENANCE_REPORT = {
  notes: ["Maintenance reserved 7 labor before output was applied."]
} as const;

describe("playScreenReceipts", () => {
  it("creates deterministic routes for explain-changes and resource chips", () => {
    expect(createExplainChangesRoute()).toEqual({
      focus: "overview",
      mode: "grouped",
      origin: "diff_ledger"
    });

    expect(createResourceChipRoute("coin")).toEqual({
      focus: "coin",
      mode: "grouped",
      origin: "coin_chip"
    });
  });

  it("builds grouped and raw receipt data from phase receipts", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      obligationsContract: OBLIGATIONS_CONTRACT,
      phaseResults: PHASE_RESULTS
    });

    expect(data.groupedSections.map((section) => section.id)).toEqual(["overview", "food", "coin", "unrest"]);
    expect(data.groupedSections[0].highlights.map((highlight) => highlight.id)).toEqual(["food", "coin", "unrest"]);
    expect(data.counterpartySections.map((section) => section.id)).toEqual(["liege", "church"]);

    const foodSection = data.groupedSections.find((section) => section.id === "food");
    const coinSection = data.groupedSections.find((section) => section.id === "coin");
    const unrestSection = data.groupedSections.find((section) => section.id === "unrest");
    const liegeSection = data.counterpartySections.find((section) => section.id === "liege");
    const churchSection = data.counterpartySections.find((section) => section.id === "church");

    expect(foodSection?.receipts.map((receipt) => receipt.line)).toEqual([
      "Tax due 2 coin; tithe due 60 bushels.",
      "Arrears coin 1; arrears bushels 12.",
      "Weather 0.70; market 0.08 coin/bushel; sell cap 460.",
      "Spoilage -41; production +1539; consumption -1819."
    ]);
    expect(coinSection?.receipts.map((receipt) => receipt.line)).toEqual([
      "Tax due 2 coin; tithe due 60 bushels.",
      "Arrears coin 1; arrears bushels 12.",
      "Weather 0.70; market 0.08 coin/bushel; sell cap 460."
    ]);
    expect(unrestSection?.receipts.map((receipt) => receipt.line)).toEqual([
      "Arrears coin 1; arrears bushels 12.",
      "2 events applied."
    ]);
    expect(liegeSection).toMatchObject({
      title: "House Liege",
      dueSummary: "House Liege: 1 coin in arrears, 2 coin due.",
      penaltySummary: "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
      gestureLabel: "Gift to liege",
      gestureSummary: "Gift to liege is the relationship lever for easing noble pressure when coin arrears are already visible.",
      receiptCategoryOrder: ["coin", "unrest"]
    });
    expect(liegeSection?.receipts.map((receipt) => receipt.line)).toEqual([
      "Tax due 2 coin; tithe due 60 bushels.",
      "Arrears coin 1; arrears bushels 12."
    ]);
    expect(churchSection).toMatchObject({
      title: "Parish Church",
      dueSummary: "Parish Church: 12 bushels in arrears, 60 bushels due.",
      penaltySummary: "Stage-one enforcement pressure rose for Parish Church because arrears remain open after carry.",
      gestureLabel: "Offering to church",
      gestureSummary: "Offering to church is the relationship lever for easing church pressure when bushel arrears are already visible.",
      receiptCategoryOrder: ["food", "unrest"]
    });
    expect(churchSection?.receipts.map((receipt) => receipt.line)).toEqual([
      "Tax due 2 coin; tithe due 60 bushels.",
      "Arrears coin 1; arrears bushels 12."
    ]);
    expect(data.rawPhases[0]?.receipts[0]?.counterpartyTags).toEqual(["liege", "church"]);
    expect(data.rawPhases[0]?.receipts[1]?.counterpartyTags).toEqual(["liege", "church"]);
    expect(data.rawPhases[1]?.receipts[0]?.counterpartyTags).toEqual([]);

    expect(data.rawPhases.map((phase) => phase.phase)).toEqual(["obligations", "consumption", "events"]);
  });

  it("filters grouped sections and raw phases for focused chip routes", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      obligationsContract: OBLIGATIONS_CONTRACT,
      phaseResults: PHASE_RESULTS
    });

    expect(selectGroupedReceiptSections(data.groupedSections, "coin").map((section) => section.id)).toEqual(["coin"]);
    expect(selectCounterpartyReceiptSections(data.counterpartySections, "coin").map((section) => section.id)).toEqual(["liege"]);
    expect(selectCounterpartyReceiptSections(data.counterpartySections, "food").map((section) => section.id)).toEqual(["church"]);
    expect(selectCounterpartyReceiptSections(data.counterpartySections, "unrest").map((section) => section.id)).toEqual(["liege", "church"]);
    expect(selectRawReceiptPhases(data.rawPhases, "coin")).toEqual([
      {
        phase: "obligations",
        label: "Obligations",
        receipts: [
          {
            counterpartyTags: ["liege", "church"],
            id: "obligations_00",
            kind: "summary",
            line: "Tax due 2 coin; tithe due 60 bushels.",
            phase: "obligations",
            phaseLabel: "Obligations",
            tags: ["coin", "food"]
          },
          {
            counterpartyTags: ["liege", "church"],
            id: "obligations_01",
            kind: "summary",
            line: "Arrears coin 1; arrears bushels 12.",
            phase: "obligations",
            phaseLabel: "Obligations",
            tags: ["coin", "food", "unrest"]
          }
        ]
      },
      {
        phase: "consumption",
        label: "Consumption",
        receipts: [
          {
            counterpartyTags: [],
            id: "consumption_00",
            kind: "summary",
            line: "Weather 0.70; market 0.08 coin/bushel; sell cap 460.",
            phase: "consumption",
            phaseLabel: "Consumption",
            tags: ["coin", "food"]
          }
        ]
      }
    ]);
  });

  it("prefers structured fiscal receipts in raw mode while preserving grouped and counterparty tagging", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      obligationsContract: OBLIGATIONS_CONTRACT,
      phaseResults: STRUCTURED_PHASE_RESULTS
    });

    expect(data.rawPhases.map((phase) => phase.phase)).toEqual(["obligations", "events"]);
    expect(data.rawPhases[0]?.receipts.map((receipt) => receipt.id)).toEqual([
      "ledger:t7:obligations:p5:coin:0001",
      "ledger:t7:obligations:p6:food_stores:0002"
    ]);
    expect(data.rawPhases[0]?.receipts[0]?.line).toBe("Sent a coin gift to House Liege.");
    expect(data.rawPhases[0]?.receipts[0]?.structured).toEqual({
      asset: "coin",
      category: "gift.liege",
      counterpartyLabel: "House Liege",
      delta: -2,
      receiptId: "ledger:t7:obligations:p5:coin:0001",
      ruleLabel: "obligations.liege_gift",
      summary: "Sent a coin gift to House Liege."
    });
    expect(data.rawPhases[0]?.receipts[1]?.structured).toEqual({
      asset: "food_stores",
      category: "offering.church",
      counterpartyLabel: "Parish Church",
      delta: -4,
      receiptId: "ledger:t7:obligations:p6:food_stores:0002",
      ruleLabel: "obligations.church_offering",
      summary: "Delivered a grain offering to the Parish Church."
    });

    expect(data.groupedSections.find((section) => section.id === "coin")?.receipts.map((receipt) => receipt.line)).toEqual([
      "Sent a coin gift to House Liege."
    ]);
    expect(data.groupedSections.find((section) => section.id === "food")?.receipts.map((receipt) => receipt.line)).toEqual([
      "Delivered a grain offering to the Parish Church."
    ]);
    expect(data.counterpartySections.find((section) => section.id === "liege")?.receipts.map((receipt) => receipt.id)).toEqual([
      "ledger:t7:obligations:p5:coin:0001"
    ]);
    expect(data.counterpartySections.find((section) => section.id === "church")?.receipts.map((receipt) => receipt.id)).toEqual([
      "ledger:t7:obligations:p6:food_stores:0002"
    ]);
  });

  it("adds a maintenance grouped section when the upkeep read model resolves", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: [
        ...DIFF_LEDGER_ITEMS,
        {
          id: "maintenance",
          sort_mag: 11,
          tie_key: "04_maintenance",
          primary: "Maintenance: 7 labor, 4 coin across 2 upkeep rows.",
          why: "Rights upkeep remains visible here so labor and coin pressure does not disappear into lower output totals.",
          source: "system_pressure"
        }
      ],
      obligationsContract: OBLIGATIONS_CONTRACT,
      phaseResults: PHASE_RESULTS,
      previewState: MAINTENANCE_PREVIEW_STATE,
      report: MAINTENANCE_REPORT
    });

    expect(data.groupedSections.map((section) => section.id)).toEqual(["overview", "food", "coin", "maintenance", "unrest"]);
    expect(data.groupedSections.find((section) => section.id === "maintenance")).toEqual({
      id: "maintenance",
      title: "Maintenance pressure",
      helper: "Upkeep rows stay visible here so maintenance labor and coin pressure do not disappear into lower output.",
      highlights: [
        {
          id: "maintenance",
          primary: "Maintenance: 7 labor, 4 coin across 2 upkeep rows.",
          why: "Rights upkeep remains visible here so labor and coin pressure does not disappear into lower output totals.",
          source: "system_pressure"
        }
      ],
      receipts: [
        {
          counterpartyTags: [],
          id: "maintenance_note_00",
          kind: "summary",
          line: "Maintenance reserved 7 labor before output was applied.",
          phase: "consumption",
          phaseLabel: "Consumption",
          tags: ["maintenance"]
        },
        {
          counterpartyTags: [],
          id: "maintenance_row_00",
          kind: "summary",
          line: "Bridge & crossing revenue — Right; 1 coin; 3 labor; Active.",
          phase: "events",
          phaseLabel: "Maintenance view",
          tags: ["coin", "maintenance"]
        },
        {
          counterpartyTags: [],
          id: "maintenance_row_01",
          kind: "summary",
          line: "Market right — Right; 3 coin; 4 labor; Active.",
          phase: "events",
          phaseLabel: "Maintenance view",
          tags: ["coin", "maintenance"]
        }
      ]
    });
  });
});
