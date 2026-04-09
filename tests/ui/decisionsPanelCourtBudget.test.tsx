import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DecisionsPanel } from "../../src/ui/panels/DecisionsPanel";
import type { CourtDecisionBudgetSurface } from "../../src/ui/playScreenCourtBudget";
import type { ObligationsCounterpartyContractSection } from "../../src/ui/playScreenObligations";

function createCourtDecisionBudget(): CourtDecisionBudgetSurface {
  return {
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
        spent: 0,
        label: "Offering to church",
        detail: "Court effort spent on religious offerings.",
        isHighestCost: false
      },
      {
        action: "marriage_inbound",
        cost: 1,
        spent: 0,
        label: "Marriage reply",
        detail: "Processing existing offers or refusals.",
        isHighestCost: false
      },
      {
        action: "marriage_scout",
        cost: 2,
        spent: 2,
        label: "Marriage scouting",
        detail: "Seeking new prospects beyond the current offers.",
        isHighestCost: true
      }
    ]
  };
}

function createObligationsSections(): ObligationsCounterpartyContractSection[] {
  return [
    {
      id: "liege",
      title: "House Liege",
      shortTitle: "Liege",
      helper: "Keeps liege dues, arrears pressure, and gift language aligned with coin-first receipts.",
      settlementStatus: "due_and_arrears",
      receiptCategoryOrder: ["coin", "unrest"],
      receiptKeywords: ["liege"],
      dueGroup: {
        title: "Tax due",
        amount: 3,
        amountLabel: "3 coin",
        summary: "House Liege: 4 coin in arrears, 3 coin due.",
        receiptCategories: ["coin"]
      },
      penaltyGroup: {
        title: "Arrears & liege pressure",
        amount: 4,
        amountLabel: "4 coin",
        summary: "House Liege: 4 coin in arrears, 3 coin due.",
        receiptCategories: ["coin", "unrest"],
        enforcementStage: 1,
        enforcementState: "arrears",
        enforcementSummary: "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
        resolvedSummary: "This turn: arrears carried, so stage 1 active now applies.",
        responseSummary: "Next turn: pay coin to cut carried arrears, then add a gift if you need more liege cover.",
        stageLabel: "Stage 1 active",
        carriedThisTurn: true,
        settledThisTurn: false
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
      }
    },
    {
      id: "church",
      title: "Parish Church",
      shortTitle: "Church",
      helper: "Keeps church dues, arrears pressure, and offering language aligned with food-first receipts.",
      settlementStatus: "due_only",
      receiptCategoryOrder: ["food", "unrest"],
      receiptKeywords: ["church"],
      dueGroup: {
        title: "Tithe due",
        amount: 5,
        amountLabel: "5 bushels",
        summary: "Parish Church: 5 bushels due.",
        receiptCategories: ["food"]
      },
      penaltyGroup: {
        title: "Arrears & church pressure",
        amount: 0,
        amountLabel: "0 bushels",
        summary: "Parish Church: no carried arrears.",
        receiptCategories: ["food", "unrest"],
        enforcementStage: 1,
        enforcementState: "clear",
        enforcementSummary: "Parish Church: clear.",
        resolvedSummary: "This turn: no arrears carried, so pressure stayed clear.",
        responseSummary: "Next turn: line up bushels for the current tithe before it carries, then add an offering if you need extra church support.",
        stageLabel: "Pressure clear",
        carriedThisTurn: false,
        settledThisTurn: true
      },
      gestureGroup: {
        actionId: "offering_church",
        availableInBudget: true,
        cost: 1,
        detail: "Court effort spent on religious offerings.",
        leverSummary: "Offering to church is the relationship lever for steadying church support when dues alone are not the whole problem.",
        receiptCategories: ["food"],
        spent: 0,
        title: "Offering to church"
      }
    }
  ];
}

function createProps(): React.ComponentProps<typeof DecisionsPanel> {
  return {
    accruedThisTurn: null,
    advanceTurn: () => undefined,
    anchorLabor: "labor",
    anchorObligations: "obligations",
    buildRatePerBuilderPerTurn: 1,
    builderExtraPerTurn: 3,
    copy: {
      decisionsTimingHelper: "These controls set the next turn.",
      turnSummary_nowChoose: "Now choose the next turn",
      laborTimingProduction: "Farmers affect production next turn.",
      laborTimingBuilders: "Builders affect construction next turn.",
      laborDeltaCapClarifier: "Labor shifts are capped.",
      laborDeltaCapError: (max: number, requested: number) => `Max ${max}; requested ${requested}.`,
      laborOversubscribedTitle: "Too many assignments",
      laborOversubscribedBody: (assigned: number, available: number) => `${assigned}/${available}`,
      laborOversubscribedHelper: "Reduce assignments.",
      obligationsHelper: "Obligations resolve after labor.",
      obligationsTotal: "Total obligations",
      obligationsDueEntering: "Due entering the turn",
      obligationsAccrued: "Accrued this turn",
      obligationsArrears: "Arrears carried"
    },
    decisions: {
      labor: { kind: "labor", desired_farmers: 6, desired_builders: 2 },
      sell: { kind: "sell", sell_bushels: 0 },
      obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
      construction: { kind: "construction", action: "none" },
      marriage: { kind: "marriage", action: "none" }
    },
    dueEntering: { coin: 0, bushels: 0 },
    eligibleMaidensLocalRaw: [],
    fmtObAmount: ({ coin, bushels }) => `${coin} coin / ${bushels} bushels`,
    improvementIds: [],
    improvements: {},
    laborAssignedNextTurn: 8,
    laborAvailableNextTurn: 10,
    laborLimitExceeded: false,
    laborOversubscribed: false,
    laborRequested: 0,
    manor: {
      coin: 10,
      bushels_stored: 120,
      construction: null,
      improvements: []
    },
    courtDecisionBudget: createCourtDecisionBudget(),
    marriageWindow: null,
    maxLaborShift: 2,
    obligations: { war_levy_due: null },
    obligationsSections: createObligationsSections(),
    onExportFullRunJson: () => undefined,
    onExportRunSummary: () => undefined,
    onOpenLog: () => undefined,
    onOpenObligationsDetails: () => undefined,
    pfHouseLabelById: new Map(),
    pfParentsByChild: new Map(),
    pfPeopleRec: {},
    pfPersonHouseById: new Map(),
    pricingSurface: {
      schemaVersion: "economy_pricing_view_v1",
      referenceId: "price_ref:food_stores_market_sell",
      referenceLabel: "Food stores market sell",
      ratioLabel: "1 coin / 10 bushels",
      fixedSellCapUnits: 240,
      maxSellableUnits: 120,
      maxQuotedCoin: 12,
      catalogLines: [
        "Food stores market sell: 1 coin / 10 bushels (active)"
      ]
    },
    previewState: {
      house: {
        energy: {
          available: 3,
          max: 3
        }
      }
    } as any,
    prospectsTotalCount: 1,
    runSeed: "lotm_v022_seed_001_baseline_extworld",
    sellCapBushels: 0,
    setDecisions: () => undefined,
    totalObligations: { coin: 0, bushels: 0 },
    turnYears: 3,
    arrearsCarried: { coin: 0, bushels: 0 }
  };
}

describe("DecisionsPanel court budget", () => {
  it("renders the spent and remaining court decision budget state", () => {
    const html = renderToStaticMarkup(<DecisionsPanel {...createProps()} />);

    expect(html).toContain("Court decision budget");
    expect(html).toContain("4 remaining");
    expect(html).toContain("of 6");
    expect(html).toContain("Spent 2");
    expect(html).toContain("Gift to liege");
    expect(html).toContain("Offering to church");
    expect(html).toContain("Marriage reply");
    expect(html).toContain("Marriage scouting");
    expect(html).toContain("Cost 2");
    expect(html).toContain("Used 2");
    expect(html).toContain("Highest cost");
    expect(html).toContain("Reference price:");
    expect(html).toContain("1 coin / 10 bushels");
    expect(html).toContain("Fixed reference cap: 240 bushels");
    expect(html).toContain("Open Run Log");
    expect(html).toContain("Playtest packet handoff:");
    expect(html).toContain("run_summary_lotm_v022_seed_001_baseline_extworld.json");
    expect(html).toContain("run_export_lotm_v022_seed_001_baseline_extworld.json");
    expect(html).toContain("Open detail sheet");
    expect(html).toContain("House Liege");
    expect(html).toContain("Parish Church");
  });
});
