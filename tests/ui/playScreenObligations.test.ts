import { describe, expect, it } from "vitest";

import { buildObligationsCounterpartyContract, classifyReceiptCounterpartyTags } from "../../src/ui/playScreenObligations";

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

describe("playScreenObligations", () => {
  it("builds a deterministic counterparty contract from the bounded obligations view and court budget", () => {
    const contractA = buildObligationsCounterpartyContract({
      courtDecisionBudget: COURT_BUDGET,
      previewState: PREVIEW_STATE
    });
    const contractB = buildObligationsCounterpartyContract({
      courtDecisionBudget: COURT_BUDGET,
      previewState: PREVIEW_STATE
    });

    expect(contractA).toEqual(contractB);
    expect(contractA).toMatchObject({
      schemaVersion: "play_screen_obligations_contract_v1",
      counterpartyOrder: ["liege", "church"],
      receiptCategoryOrder: ["coin", "food", "unrest"]
    });
    expect(contractA?.counterpartySections).toEqual([
      {
        id: "liege",
        title: "House Liege",
        shortTitle: "Liege",
        helper: "Keeps liege dues, arrears pressure, and gift language aligned with coin-first receipts.",
        settlementStatus: "due_and_arrears",
        receiptCategoryOrder: ["coin", "unrest"],
        receiptKeywords: ["coin arrears", "gift", "house liege", "liege", "liege tax", "tax", "tax due"],
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
          enforcementState: "arrears",
          enforcementSummary: "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
          carriedThisTurn: true,
          settledThisTurn: false
        },
        gestureGroup: {
          actionId: "gift_liege",
          title: "Gift to liege",
          detail: "Court favor spent on noble gifts.",
          cost: 1,
          spent: 0,
          availableInBudget: true,
          receiptCategories: ["coin"]
        }
      },
      {
        id: "church",
        title: "Parish Church",
        shortTitle: "Church",
        helper: "Keeps church dues, arrears pressure, and offering language aligned with food-first receipts.",
        settlementStatus: "due_only",
        receiptCategoryOrder: ["food", "unrest"],
        receiptKeywords: ["bushels arrears", "church", "church tithe", "offering", "parish church", "tithe", "tithe due"],
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
          enforcementState: "clear",
          enforcementSummary: "Parish Church: clear.",
          carriedThisTurn: false,
          settledThisTurn: true
        },
        gestureGroup: {
          actionId: "offering_church",
          title: "Offering to church",
          detail: "Court effort spent on religious offerings.",
          cost: 1,
          spent: 1,
          availableInBudget: true,
          receiptCategories: ["food"]
        }
      }
    ]);
  });

  it("classifies receipt lines into deterministic liege and church tags", () => {
    const contract = buildObligationsCounterpartyContract({
      courtDecisionBudget: COURT_BUDGET,
      previewState: PREVIEW_STATE
    });

    expect(classifyReceiptCounterpartyTags("Tax due 3 coin; tithe due 5 bushels.", contract)).toEqual(["liege", "church"]);
    expect(
      classifyReceiptCounterpartyTags(
        "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
        contract
      )
    ).toEqual(["liege"]);
    expect(classifyReceiptCounterpartyTags("Offering to church used 1 court budget.", contract)).toEqual(["church"]);
    expect(classifyReceiptCounterpartyTags("2 events applied.", contract)).toEqual([]);
  });
});
