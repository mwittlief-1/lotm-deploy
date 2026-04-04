import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ObligationsDetailPanel } from "../../src/ui/panels/ObligationsDetailPanel";
import { ObligationsSummaryCards } from "../../src/ui/panels/ObligationsSummaryCards";
import { buildObligationsCounterpartyContract } from "../../src/ui/playScreenObligations";

const PREVIEW_STATE = {
  economy_obligations_view: {
    schema_version: "economy_obligations_view_v1",
    counterparty_order: ["liege", "church"],
    counterparty_summaries: [
      {
        counterparty_kind: "liege",
        counterparty_label: "House Liege",
        due_amount: 3,
        arrears_amount: 4,
        enforcement_stage: 1,
        settlement_status: "due_and_arrears",
        settlement_summary: "House Liege: 4 coin in arrears, 3 coin due.",
        enforcement_state: "arrears",
        enforcement_summary: "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
        settled_this_turn: false,
        carried_this_turn: true
      },
      {
        counterparty_kind: "church",
        counterparty_label: "Parish Church",
        due_amount: 5,
        arrears_amount: 0,
        enforcement_stage: 1,
        settlement_status: "due_only",
        settlement_summary: "Parish Church: 5 bushels due.",
        enforcement_state: "clear",
        enforcement_summary: "Parish Church: clear.",
        settled_this_turn: true,
        carried_this_turn: false
      }
    ]
  }
} as any;

const COURT_BUDGET = {
  limit: 6,
  spent: 2,
  remaining: 4,
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
} as any;

function createSections() {
  const contract = buildObligationsCounterpartyContract({
    courtDecisionBudget: COURT_BUDGET,
    previewState: PREVIEW_STATE
  });

  if (!contract) {
    throw new Error("Expected obligations contract for panel rendering test.");
  }

  return contract.counterpartySections;
}

describe("obligations panels", () => {
  it("renders summary cards with due, overdue, and carried arrears labels", () => {
    const html = renderToStaticMarkup(
      <ObligationsSummaryCards
        onOpenDetails={() => undefined}
        sections={createSections()}
        surface="turn_report"
      />
    );

    expect(html).toContain("House Liege");
    expect(html).toContain("Parish Church");
    expect(html).toContain("Due now:");
    expect(html).toContain("Overdue:");
    expect(html).toContain("Carried arrears:");
    expect(html).toContain("Relationship lever");
    expect(html).toContain("Gift to liege");
    expect(html).toContain("Stage 1 active");
    expect(html).toContain("This turn");
  });

  it("renders the modal detail surface with receipt alignment and decision routing", () => {
    const sections = createSections();
    const html = renderToStaticMarkup(
      <ObligationsDetailPanel
        allSections={sections}
        focus="overview"
        onFocusChange={() => undefined}
        onJumpToDecisions={() => undefined}
        sections={sections}
      />
    );

    expect(html).toContain("All counterparties");
    expect(html).toContain("Jump to Decisions");
    expect(html).toContain("Gift to liege");
    expect(html).toContain("Offering to church");
    expect(html).toContain("Relationship lever");
    expect(html).toContain("coin receipts");
    expect(html).toContain("food receipts");
    expect(html).toContain("Arrears stage");
    expect(html).toContain("Next turn:");
  });
});
