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
        scopeLabel="Current manor chronicle"
        scopeSummary="Explain Changes is still showing the current manor receipt trail."
      />
    );

    expect(markup).toContain("Current manor chronicle");
    expect(markup).toContain("Explain Changes is still showing the current manor receipt trail.");
    expect(markup).toContain("Counterparty paths");
    expect(markup).toContain("Relationship lever");
    expect(markup).toContain("Gift to liege");
    expect(markup).toContain("Offering to church");
    expect(markup).toContain("Stage 1 active");
    expect(markup).toContain("Matched receipts");
  });
});
