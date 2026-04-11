import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ObligationsCounterpartyContractSection } from "../../src/ui/playScreenObligations";
import { ObligationsDetailPanel } from "../../src/ui/panels/ObligationsDetailPanel";

const LIEGE_SECTION: ObligationsCounterpartyContractSection = {
  dueGroup: {
    amount: 3,
    amountLabel: "3 coin",
    receiptCategories: ["coin"],
    summary: "House Liege: 4 coin in arrears, 3 coin due.",
    title: "Tax due"
  },
  gestureGroup: {
    actionId: "gift_liege",
    availableInBudget: true,
    cost: 1,
    detail: "Court favor spent on noble gifts.",
    leverSummary: "Gift to liege is the relationship lever for easing noble pressure when coin arrears are already visible.",
    receiptCategories: ["coin"],
    spent: 0,
    title: "Gift to liege"
  },
  helper: "Keeps liege dues, arrears pressure, and gift language aligned with coin-first receipts.",
  id: "liege",
  paymentModes: {
    acceptedLabels: ["Coin", "Food stores", "Service placeholder"],
    preferredLabel: "Coin",
    supportedLabels: ["Coin"]
  },
  penaltyGroup: {
    amount: 4,
    amountLabel: "4 coin",
    carriedThisTurn: true,
    enforcementStage: 2,
    enforcementState: "arrears",
    enforcementSummary: "Stage-two tangible bite is active for House Liege; forced collection receipts are already landing against open arrears.",
    receiptCategories: ["coin", "unrest"],
    resolvedSummary: "This turn: arrears carried, so stage 2 active now applies.",
    responseSummary: "Next turn: clear liege arrears immediately or pressure escalates.",
    settledThisTurn: false,
    stageLabel: "Stage 2 active",
    summary: "House Liege: 4 coin in arrears, 3 coin due.",
    title: "Arrears & liege pressure"
  },
  receiptCategoryOrder: ["coin", "unrest"],
  receiptGroups: [
    {
      categoryOrder: ["obligation.liege_settlement", "gift.liege"],
      id: "payment",
      label: "Payments",
      receiptCount: 1,
      rows: [
        {
          assetLabel: "Coin",
          balanceAfterLabel: "11",
          category: "obligation.liege_settlement",
          deltaLabel: "-2",
          id: "liege_payment_1",
          ruleLabel: "obligation.settle.liege",
          summary: "Paid 2 coin toward House Liege."
        }
      ]
    },
    {
      categoryOrder: ["obligation.arrears_carry", "enforcement.penalty"],
      id: "penalty",
      label: "Penalty trail",
      receiptCount: 1,
      rows: [
        {
          assetLabel: "Coin",
          balanceAfterLabel: "4",
          category: "obligation.arrears_carry",
          deltaLabel: "0",
          id: "liege_penalty_1",
          ruleLabel: "obligation.carry.liege",
          summary: "Arrears carried for House Liege."
        }
      ]
    },
    {
      categoryOrder: ["enforcement.seizure", "enforcement.forced_payment_stores"],
      id: "seizure",
      label: "Seizures & forced payment",
      receiptCount: 1,
      rows: [
        {
          assetLabel: "Coin",
          balanceAfterLabel: "10",
          category: "enforcement.seizure",
          deltaLabel: "-1",
          id: "liege_seizure_1",
          ruleLabel: "enforcement.seizure.liege",
          summary: "Seized 1 coin for House Liege arrears."
        }
      ]
    }
  ],
  receiptKeywords: ["house liege", "liege", "tax due"],
  settlementStatus: "due_and_arrears",
  shortTitle: "Liege",
  stageRows: [
    {
      boundaryLabel: "House Liege: 4 coin in arrears, 3 coin due.",
      detail: "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
      id: "stage_1",
      statusLabel: "Passed",
      title: "Stage 1 · Arrears carry"
    },
    {
      boundaryLabel: "Tangible Bite boundary: 4/1 on manor.obligations.arrears.coin",
      detail: "Stage-two preview: enterprise seizure can force up to 2 coin for House Liege this turn.",
      id: "stage_2",
      statusLabel: "Current",
      title: "Stage 2 · Tangible bite"
    },
    {
      boundaryLabel: "Unrest 88/100; remaining 12.",
      detail: "Dispossession occurs if unrest reaches 100 at end of turn; current unrest is 88.",
      id: "stage_3",
      statusLabel: "Armed",
      title: "Stage 3 · Dispossession danger"
    }
  ],
  tangibleBitePreview: {
    categoryLabel: "Enforcement Seizure",
    paymentModeLabel: "Coin",
    previewAmountLabel: "2",
    summary: "Stage-two preview: enterprise seizure can force up to 2 coin for House Liege this turn.",
    turnCapLabel: "2 via enterprise_seizure_turn_cap_coin"
  },
  terminalRisk: {
    boundaryLabel: "Boundary 88/100 on manor.unrest",
    statusLabel: "Armed",
    summary: "Dispossession occurs if unrest reaches 100 at end of turn; current unrest is 88."
  },
  title: "House Liege"
};

describe("ObligationsDetailPanel", () => {
  it("renders payment modes, ladder state, and tangible-bite preview for the focused counterparty", () => {
    const html = renderToStaticMarkup(
      <ObligationsDetailPanel
        allSections={[LIEGE_SECTION]}
        focus="liege"
        onFocusChange={() => undefined}
        onJumpToDecisions={() => undefined}
        sections={[LIEGE_SECTION]}
      />
    );

    expect(html).toContain("Payment modes");
    expect(html).toContain("Terminal risk");
    expect(html).toContain("Tangible bite preview");
    expect(html).toContain("Enforcement ladder");
    expect(html).toContain("Receipt groups");
    expect(html).toContain("Service placeholder");
    expect(html).toContain("Stage 3 · Dispossession danger");
    expect(html).toContain("Seizures &amp; forced payment");
  });
});
