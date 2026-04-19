import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PhaseResultV0 } from "../../src/sim/types";
import { ReceiptsViewerPanel } from "../../src/ui/panels/ReceiptsViewerPanel";
import { buildObligationsCounterpartyContract } from "../../src/ui/playScreenObligations";
import type { LedgerItem } from "../../src/ui/playScreenModel";
import { buildReceiptViewerData } from "../../src/ui/playScreenReceipts";

const DIFF_LEDGER_ITEMS: LedgerItem[] = [
  {
    id: "coin",
    sort_mag: 7,
    tie_key: "01_coin",
    primary: "Coin: -2",
    why: "Tax due entering the turn.",
    source: "system_pressure"
  }
];

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
      }
    ],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
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
      schema_version: "economy_obligations_view_v2",
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

const TURN_EXPLANATION = {
  schema_version: "turn_explanation_v1",
  food_walkdown: {
    schema_version: "turn_explanation_walkdown_v1",
    metric: "food",
    unit_label: "bushels",
    start_amount: 40,
    end_amount: 25,
    reconciles: true,
    rows: [
      { id: "food_starting_stores", label: "Starting stores", direction: "start", amount: 40, summary: "40 bushels on hand at the start of the turn." },
      { id: "food_production", label: "Production", direction: "inflow", amount: 10, summary: "10 bushels came in from production." },
      { id: "food_total_before_deductions", label: "Total before deductions", direction: "net", amount: 50, summary: "50 bushels were available before consumption, spoilage, and dues." },
      { id: "food_consumption", label: "Consumption", direction: "outflow", amount: 18, summary: "18 bushels were consumed by peasants and court." },
      { id: "food_spoilage", label: "Spoilage", direction: "outflow", amount: 1, summary: "1 bushel was lost to spoilage." },
      { id: "food_dues", label: "Dues and tithe", direction: "outflow", amount: 6, summary: "6 bushels left stores to cover dues or arrears." },
      { id: "food_ending_stores", label: "Ending stores", direction: "ending", amount: 25, summary: "25 bushels remain at turn end." }
    ]
  },
  coin_walkdown: {
    schema_version: "turn_explanation_walkdown_v1",
    metric: "coin",
    unit_label: "coin",
    start_amount: 12,
    end_amount: 6,
    reconciles: true,
    rows: [
      { id: "coin_starting_coin", label: "Starting coin", direction: "start", amount: 12, summary: "12 coin on hand at the start of the turn." },
      { id: "coin_market_trade", label: "Market and trade", direction: "inflow", amount: 0, summary: "No market or trade coin movement was recorded." },
      { id: "coin_marriage_project_other_inflows", label: "Marriage, project, and other inflows", direction: "inflow", amount: 0, summary: "No marriage, project, or event coin inflows were recorded." },
      { id: "coin_maintenance", label: "Maintenance and upkeep", direction: "outflow", amount: 2, summary: "2 coin went to upkeep and recurring maintenance." },
      { id: "coin_dues_paid", label: "Dues paid", direction: "outflow", amount: 4, summary: "4 coin went to dues or arrears payments." },
      { id: "coin_ending_coin", label: "Ending coin", direction: "ending", amount: 6, summary: "6 coin remain at turn end." }
    ]
  },
  unrest_walkdown: {
    schema_version: "turn_explanation_walkdown_v1",
    metric: "unrest",
    unit_label: "unrest",
    start_amount: 12,
    end_amount: 12,
    reconciles: true,
    rows: [
      { id: "unrest_start", label: "Starting unrest", direction: "start", amount: 12, summary: "12 unrest at the start of the turn." },
      { id: "unrest_net", label: "Net unrest change", direction: "net", amount: 0, summary: "Net unrest change 0." },
      { id: "unrest_end", label: "Ending unrest", direction: "ending", amount: 12, summary: "12 unrest at the end of the turn." }
    ]
  },
  headline_causes: [],
  surface_roles: []
} as const;

describe("ReceiptsViewerPanel", () => {
  it("renders counterparty-first relationship lever cards in grouped mode", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      obligationsContract: OBLIGATIONS_CONTRACT,
      phaseResults: PHASE_RESULTS
    });

    const markup = renderToStaticMarkup(
      <ReceiptsViewerPanel
        counterpartySections={data.counterpartySections}
        groupedSections={data.groupedSections}
        mode="grouped"
        onModeChange={() => undefined}
        rawPhases={data.rawPhases}
        scopeLabel="Current manor ledger"
        scopeSummary="Explain Changes is still following the current manor ledger. Holdings totals above remain summary context only."
      />
    );

    expect(markup).toContain("Current manor ledger");
    expect(markup).toContain("Explain Changes is still following the current manor ledger.");
    expect(markup).toContain("Drilldown is the main player-facing explanation path");
    expect(markup).toContain("Counterparty paths");
    expect(markup).toContain("Relationship lever");
    expect(markup).toContain("Gift to liege");
    expect(markup).toContain("Offering to church");
    expect(markup).toContain("Stage 1 active");
    expect(markup).toContain("Matched receipts");
  });

  it("renders structured fiscal receipt fields in raw mode when present", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      obligationsContract: OBLIGATIONS_CONTRACT,
      phaseResults: STRUCTURED_PHASE_RESULTS
    });

    const markup = renderToStaticMarkup(
      <ReceiptsViewerPanel
        counterpartySections={data.counterpartySections}
        groupedSections={data.groupedSections}
        mode="raw"
        onModeChange={() => undefined}
        rawPhases={data.rawPhases}
      />
    );

    expect(markup).toContain("Phase record is secondary evidence.");
    expect(markup).toContain("Receipt ID");
    expect(markup).toContain("ledger:t7:obligations:p5:coin:0001");
    expect(markup).toContain("Category");
    expect(markup).toContain("gift.liege");
    expect(markup).toContain("Asset");
    expect(markup).toContain("coin");
    expect(markup).toContain("Delta");
    expect(markup).toContain("-2");
    expect(markup).toContain("Counterparty");
    expect(markup).toContain("House Liege");
    expect(markup).toContain("Summary / rule");
    expect(markup).toContain("Sent a coin gift to House Liege.");
    expect(markup).toContain("Rule: obligations.liege_gift");
    expect(markup).not.toContain("Legacy obligation receipt that should stay hidden when structured rows are present.");
  });

  it("falls back to legacy raw receipt lines when no structured fiscal rows are present", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      obligationsContract: OBLIGATIONS_CONTRACT,
      phaseResults: PHASE_RESULTS
    });

    const markup = renderToStaticMarkup(
      <ReceiptsViewerPanel
        counterpartySections={data.counterpartySections}
        groupedSections={data.groupedSections}
        mode="raw"
        onModeChange={() => undefined}
        rawPhases={data.rawPhases}
      />
    );

    expect(markup).toContain("summary");
    expect(markup).toContain("Tax due 2 coin; tithe due 60 bushels.");
    expect(markup).not.toContain("Receipt ID");
  });

  it("renders ordered coin and food walkdown rows on the grouped player-facing drilldown path", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      obligationsContract: OBLIGATIONS_CONTRACT,
      phaseResults: STRUCTURED_PHASE_RESULTS,
      turnExplanation: TURN_EXPLANATION as any
    });

    const markup = renderToStaticMarkup(
      <ReceiptsViewerPanel
        counterpartySections={data.counterpartySections}
        groupedSections={data.groupedSections}
        mode="grouped"
        onModeChange={() => undefined}
        rawPhases={data.rawPhases}
      />
    );

    expect(markup).toContain("Walkdown");
    expect(markup).toContain("Dues and tithe");
    expect(markup).toContain("-6 bushels");
    expect(markup).toContain("6 bushels left stores to cover dues or arrears.");
    expect(markup).toContain("Maintenance and upkeep");
    expect(markup).toContain("-2 coin");
    expect(markup).toContain("Dues paid");
    expect(markup).toContain("-4 coin");
  });
});
