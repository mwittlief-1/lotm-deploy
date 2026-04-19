import { describe, expect, it } from "vitest";

import {
  buildObligationsCounterpartyContract,
  classifyReceiptCounterpartyTags,
  clearObligationGestureDecision,
  createObligationsModalRoute,
  obligationsModalSubtitle,
  obligationsModalTitle,
  obligationGesturePaymentModeOptions,
  queueDefaultObligationGesture,
  readObligationGestureDecision,
  selectObligationsCounterpartySections,
  updateObligationGestureAmount,
  updateObligationGesturePaymentMode
} from "../../src/ui/playScreenObligations";

const PREVIEW_STATE = {
  economy_obligations_view: {
    schema_version: "economy_obligations_view_v2",
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
        accepted_payment_modes: ["coin", "food_stores", "service_placeholder"],
        supported_payment_modes: ["coin"],
        preferred_payment_mode: "coin",
        next_stage_trigger: {
          next_stage: 2,
          next_stage_label: "tangible_bite",
          current_value: 4,
          trigger_threshold: 1,
          trigger_source_path: "manor.obligations.arrears.coin",
          armed: true,
          summary: "If House Liege arrears remain open into the next collection step, stage-two tangible bite can start."
        },
        terminal_risk: {
          active: false,
          armed: true,
          current_value: 58,
          trigger_threshold: 100,
          remaining_to_threshold: 42,
          trigger_source_path: "manor.unrest",
          summary: "Dispossession occurs if unrest reaches 100 at end of turn; current unrest is 58."
        },
        tangible_bite_preview: {
          category: "enforcement.seizure",
          payment_mode: "coin",
          preview_amount: 2,
          turn_cap_amount: 2,
          turn_cap_tuning_key: "enterprise_seizure_turn_cap_coin",
          summary: "Stage-two preview: enterprise seizure can force up to 2 coin for House Liege this turn."
        },
        receipt_groups: [
          {
            group_kind: "payment",
            label: "Payments",
            category_order: ["obligation.liege_settlement", "gift.liege"],
            receipt_count: 1,
            receipts: [
              {
                receipt_id: "liege_payment_1",
                category: "obligation.liege_settlement",
                asset: "coin",
                delta: -2,
                balance_after: 11,
                summary: "Paid 2 coin toward House Liege.",
                rule_id: "obligation.settle.liege"
              }
            ]
          },
          {
            group_kind: "penalty",
            label: "Penalty trail",
            category_order: ["obligation.arrears_carry", "enforcement.penalty"],
            receipt_count: 1,
            receipts: [
              {
                receipt_id: "liege_penalty_1",
                category: "obligation.arrears_carry",
                asset: "coin",
                delta: 0,
                balance_after: 4,
                summary: "Arrears carried for House Liege.",
                rule_id: "obligation.carry.liege"
              }
            ]
          },
          {
            group_kind: "seizure",
            label: "Seizures & forced payment",
            category_order: ["enforcement.seizure", "enforcement.forced_payment_stores"],
            receipt_count: 1,
            receipts: [
              {
                receipt_id: "liege_seizure_1",
                category: "enforcement.seizure",
                asset: "coin",
                delta: -1,
                balance_after: 10,
                summary: "Seized 1 coin for House Liege arrears.",
                rule_id: "enforcement.seizure.liege"
              }
            ]
          }
        ],
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
        accepted_payment_modes: ["food_stores", "coin"],
        supported_payment_modes: ["food_stores"],
        preferred_payment_mode: "food_stores",
        next_stage_trigger: null,
        terminal_risk: {
          active: false,
          armed: false,
          current_value: 14,
          trigger_threshold: 100,
          remaining_to_threshold: 86,
          trigger_source_path: "manor.unrest",
          summary: "Dispossession occurs if unrest reaches 100 at end of turn; current unrest is 14."
        },
        tangible_bite_preview: null,
        receipt_groups: [
          {
            group_kind: "payment",
            label: "Payments",
            category_order: ["obligation.church_settlement", "offering.church"],
            receipt_count: 1,
            receipts: [
              {
                receipt_id: "church_payment_1",
                category: "obligation.church_settlement",
                asset: "food_stores",
                delta: -3,
                balance_after: 27,
                summary: "Paid 3 bushels toward Parish Church.",
                rule_id: "obligation.settle.church"
              }
            ]
          },
          {
            group_kind: "penalty",
            label: "Penalty trail",
            category_order: ["obligation.arrears_carry", "enforcement.penalty"],
            receipt_count: 0,
            receipts: []
          },
          {
            group_kind: "seizure",
            label: "Seizures & forced payment",
            category_order: ["enforcement.seizure", "enforcement.forced_payment_stores"],
            receipt_count: 0,
            receipts: []
          }
        ],
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
    expect(contractA?.counterpartySections.map((section) => section.id)).toEqual(["liege", "church"]);
    expect(contractA?.counterpartySections.map((section) => section.shortTitle)).toEqual(["Liege", "Church"]);
  });

  it("surfaces payment modes, full ladder state, and grouped receipts from the accepted obligations seam", () => {
    const contract = buildObligationsCounterpartyContract({
      courtDecisionBudget: COURT_BUDGET,
      previewState: PREVIEW_STATE
    });

    const liegeSection = contract?.counterpartySections.find((section) => section.id === "liege");
    const churchSection = contract?.counterpartySections.find((section) => section.id === "church");

    expect(liegeSection).toMatchObject({
      id: "liege",
      title: "House Liege",
      shortTitle: "Liege",
      helper: "Keeps liege dues, arrears pressure, and gift language aligned with coin-first receipts.",
      settlementStatus: "due_and_arrears",
      receiptCategoryOrder: ["coin", "unrest"],
      receiptKeywords: ["coin arrears", "gift", "house liege", "liege", "liege tax", "tax", "tax due"],
      paymentModes: {
        acceptedLabels: ["Coin", "Food stores", "Service placeholder"],
        preferredLabel: "Coin",
        supportedLabels: ["Coin"]
      },
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
        responseSummary: "Next turn: pay coin to cut carried arrears, then add a gift if you need more liege cover.",
        resolvedSummary: "This turn: arrears carried, so stage 1 active now applies.",
        stageLabel: "Stage 1 active",
        carriedThisTurn: true,
        settledThisTurn: false
      },
      gestureGroup: {
        actionId: "gift_liege",
        title: "Gift to liege",
        detail: "Court favor spent on noble gifts.",
        leverSummary: "Gift to liege is the relationship lever for easing noble pressure when coin arrears are already visible.",
        cost: 1,
        spent: 0,
        availableInBudget: true,
        receiptCategories: ["coin"]
      },
      tangibleBitePreview: {
        categoryLabel: "Enforcement Seizure",
        paymentModeLabel: "Coin",
        previewAmountLabel: "2",
        summary: "Stage-two preview: enterprise seizure can force up to 2 coin for House Liege this turn.",
        turnCapLabel: "2 via enterprise_seizure_turn_cap_coin"
      },
      terminalRisk: {
        boundaryLabel: "Boundary 58/100 on manor.unrest",
        statusLabel: "Armed",
        summary: "Dispossession occurs if unrest reaches 100 at end of turn; current unrest is 58."
      }
    });
    expect(liegeSection?.stageRows).toEqual([
      {
        boundaryLabel: "House Liege: 4 coin in arrears, 3 coin due.",
        detail: "Stage-one enforcement pressure rose for House Liege because arrears remain open after carry.",
        id: "stage_1",
        statusLabel: "Current",
        title: "Stage 1 · Arrears carry"
      },
      {
        boundaryLabel: "Tangible Bite boundary: 4/1 on manor.obligations.arrears.coin",
        detail: "Stage-two preview: enterprise seizure can force up to 2 coin for House Liege this turn.",
        id: "stage_2",
        statusLabel: "Armed",
        title: "Stage 2 · Tangible bite"
      },
      {
        boundaryLabel: "Unrest 58/100; remaining 42.",
        detail: "Dispossession occurs if unrest reaches 100 at end of turn; current unrest is 58.",
        id: "stage_3",
        statusLabel: "Armed",
        title: "Stage 3 · Dispossession danger"
      }
    ]);
    expect(liegeSection?.receiptGroups).toEqual([
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
    ]);

    expect(churchSection).toMatchObject({
      id: "church",
      title: "Parish Church",
      shortTitle: "Church",
      helper: "Keeps church dues, arrears pressure, and offering language aligned with food-first receipts.",
      settlementStatus: "due_only",
      receiptCategoryOrder: ["food", "unrest"],
      receiptKeywords: ["bushels arrears", "church", "church tithe", "offering", "parish church", "tithe", "tithe due"],
      paymentModes: {
        acceptedLabels: ["Food stores", "Coin"],
        preferredLabel: "Food stores",
        supportedLabels: ["Food stores"]
      },
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
        responseSummary:
          "Next turn: line up bushels for the current tithe before it carries, then add an offering if you need extra church support.",
        resolvedSummary: "This turn: no arrears carried, so pressure stayed clear.",
        stageLabel: "Pressure clear",
        carriedThisTurn: false,
        settledThisTurn: true
      },
      gestureGroup: {
        actionId: "offering_church",
        title: "Offering to church",
        detail: "Court effort spent on religious offerings.",
        leverSummary:
          "Offering to church is the relationship lever for steadying church support when dues alone are not the whole problem.",
        cost: 1,
        spent: 1,
        availableInBudget: true,
        receiptCategories: ["food"]
      },
      tangibleBitePreview: null,
      terminalRisk: {
        boundaryLabel: "Boundary 14/100 on manor.unrest",
        statusLabel: "Dormant",
        summary: "Dispossession occurs if unrest reaches 100 at end of turn; current unrest is 14."
      }
    });
    expect(churchSection?.stageRows).toEqual([
      {
        boundaryLabel: "Parish Church: 5 bushels due.",
        detail: "Parish Church: clear.",
        id: "stage_1",
        statusLabel: "Clear",
        title: "Stage 1 · Arrears carry"
      },
      {
        boundaryLabel: "No next-stage boundary recorded.",
        detail: "No stage-two trigger recorded.",
        id: "stage_2",
        statusLabel: "Dormant",
        title: "Stage 2 · Tangible bite"
      },
      {
        boundaryLabel: "Unrest 14/100; remaining 86.",
        detail: "Dispossession occurs if unrest reaches 100 at end of turn; current unrest is 14.",
        id: "stage_3",
        statusLabel: "Dormant",
        title: "Stage 3 · Dispossession danger"
      }
    ]);
    expect(churchSection?.receiptGroups).toEqual([
      {
        categoryOrder: ["obligation.church_settlement", "offering.church"],
        id: "payment",
        label: "Payments",
        receiptCount: 1,
        rows: [
          {
            assetLabel: "Food Stores",
            balanceAfterLabel: "27",
            category: "obligation.church_settlement",
            deltaLabel: "-3",
            id: "church_payment_1",
            ruleLabel: "obligation.settle.church",
            summary: "Paid 3 bushels toward Parish Church."
          }
        ]
      },
      {
        categoryOrder: ["obligation.arrears_carry", "enforcement.penalty"],
        id: "penalty",
        label: "Penalty trail",
        receiptCount: 0,
        rows: []
      },
      {
        categoryOrder: ["enforcement.seizure", "enforcement.forced_payment_stores"],
        id: "seizure",
        label: "Seizures & forced payment",
        receiptCount: 0,
        rows: []
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

  it("keeps modal routing, focus selection, and helper copy deterministic", () => {
    const contract = buildObligationsCounterpartyContract({
      courtDecisionBudget: COURT_BUDGET,
      previewState: PREVIEW_STATE
    });

    expect(createObligationsModalRoute("turn_report")).toEqual({
      origin: "turn_report",
      focus: "overview"
    });
    expect(createObligationsModalRoute("decisions", "church")).toEqual({
      origin: "decisions",
      focus: "church"
    });

    expect(selectObligationsCounterpartySections(contract, "overview").map((section) => section.id)).toEqual(["liege", "church"]);
    expect(selectObligationsCounterpartySections(contract, "liege").map((section) => section.id)).toEqual(["liege"]);
    expect(selectObligationsCounterpartySections(contract, "church").map((section) => section.id)).toEqual(["church"]);

    expect(obligationsModalTitle("overview")).toBe("Obligations & counterparties");
    expect(obligationsModalTitle("liege")).toBe("Liege obligations");
    expect(obligationsModalTitle("church")).toBe("Church obligations");

    expect(obligationsModalSubtitle("turn_report", "overview")).toBe(
      "Compare liege and church pressure side by side, including any carried arrears stage, before you set the next turn's response. Jump to Decisions below when you are ready to respond with coin, bushels, or court attention."
    );
    expect(obligationsModalSubtitle("decisions", "liege")).toBe(
      "Track tax due, coin arrears, and the current liege pressure stage in one place. Use the payment controls just below to respond after you review the already-resolved stage state."
    );
    expect(obligationsModalSubtitle("decisions", "church")).toBe(
      "Track tithe due, bushel arrears, and the current church pressure stage in one place. Use the payment controls just below to respond after you review the already-resolved stage state."
    );
  });

  it("normalizes gift and offering gesture decisions for the live planning surface", () => {
    const baseDecisions: any = {
      labor: { kind: "labor", desired_farmers: 6, desired_builders: 2 },
      sell: { kind: "sell", sell_bushels: 0 },
      obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
      construction: { kind: "construction", action: "none" },
      marriage: { kind: "marriage", action: "none" }
    };

    expect(obligationGesturePaymentModeOptions("gift_liege")).toEqual(["coin", "food_stores", "meat_stores", "none"]);
    expect(obligationGesturePaymentModeOptions("offering_church")).toEqual(["food_stores", "coin", "meat_stores", "none"]);
    expect(readObligationGestureDecision(baseDecisions, "gift_liege")).toEqual({ amount: 0, payment_mode: "none" });

    const queuedGift = queueDefaultObligationGesture(baseDecisions, "gift_liege");
    expect(readObligationGestureDecision(queuedGift, "gift_liege")).toEqual({ amount: 1, payment_mode: "coin" });

    const foodGift = updateObligationGesturePaymentMode(queuedGift, "gift_liege", "food_stores");
    expect(readObligationGestureDecision(foodGift, "gift_liege")).toEqual({ amount: 1, payment_mode: "food_stores" });

    const largerGift = updateObligationGestureAmount(foodGift, "gift_liege", 3);
    expect(readObligationGestureDecision(largerGift, "gift_liege")).toEqual({ amount: 3, payment_mode: "food_stores" });

    const clearedGift = clearObligationGestureDecision(largerGift, "gift_liege");
    expect(readObligationGestureDecision(clearedGift, "gift_liege")).toEqual({ amount: 0, payment_mode: "none" });

    const queuedOffering = queueDefaultObligationGesture(baseDecisions, "offering_church");
    expect(readObligationGestureDecision(queuedOffering, "offering_church")).toEqual({ amount: 1, payment_mode: "food_stores" });

    const coinOffering = updateObligationGesturePaymentMode(queuedOffering, "offering_church", "coin");
    const zeroedOffering = updateObligationGestureAmount(coinOffering, "offering_church", 0);
    expect(readObligationGestureDecision(zeroedOffering, "offering_church")).toEqual({ amount: 0, payment_mode: "none" });
  });

  it("surfaces stage-three dispossession danger through the obligations contract", () => {
    const stageThreeContract = buildObligationsCounterpartyContract({
      courtDecisionBudget: COURT_BUDGET,
      previewState: {
        economy_obligations_view: {
          schema_version: "economy_obligations_view_v2",
          counterparty_order: ["liege", "church"],
          counterparty_summaries: [
            {
              counterparty_kind: "liege",
              counterparty_label: "House Liege",
              due_amount: 3,
              arrears_amount: 7,
              enforcement_stage: 3,
              settlement_status: "due_and_arrears",
              settlement_summary: "House Liege: 7 coin in arrears, 3 coin due.",
              enforcement_state: "arrears",
              enforcement_summary: "Stage-three enforcement pressure rose for House Liege because arrears remain open after carry.",
              settled_this_turn: false,
              carried_this_turn: true
            }
          ]
        }
      } as any
    });

    expect(stageThreeContract?.counterpartySections[0]?.penaltyGroup.stageLabel).toBe("Stage 3: dispossession danger");
    expect(stageThreeContract?.counterpartySections[0]?.penaltyGroup.responseSummary).toBe(
      "Next turn: dispossession danger is active. Clear liege arrears immediately or you can lose the seat."
    );
  });

  it("surfaces successor and vacancy collector copy on the main obligations path", () => {
    const rebasedContract = buildObligationsCounterpartyContract({
      courtDecisionBudget: COURT_BUDGET,
      previewState: {
        economy_obligations_view: {
          schema_version: "economy_obligations_view_v2",
          counterparty_order: ["liege", "church"],
          counterparty_summaries: [
            {
              counterparty_kind: "liege",
              counterparty_label: "Lady Westmarch (current liege)",
              collector_state: "successor",
              collector_successor_label: "Lady Westmarch",
              collector_summary: "Lady Westmarch now collects liege dues after House Liege died.",
              due_amount: 2,
              arrears_amount: 1,
              enforcement_stage: 1,
              settlement_status: "due_and_arrears",
              settlement_summary: "Lady Westmarch (current liege): 1 coin in arrears, 2 coin due.",
              enforcement_state: "arrears",
              enforcement_summary: "Stage-one enforcement pressure rose for Lady Westmarch (current liege) because arrears remain open after carry.",
              settled_this_turn: false,
              carried_this_turn: true
            },
            {
              counterparty_kind: "church",
              counterparty_label: "St. Cuthbert Parish (Vacant)",
              collector_state: "vacant",
              collector_successor_label: "St. Cuthbert Parish",
              collector_summary: "St. Cuthbert Parish has no living priest; dues remain with the institution until a successor is placed.",
              due_amount: 4,
              arrears_amount: 3,
              enforcement_stage: 1,
              settlement_status: "due_and_arrears",
              settlement_summary: "St. Cuthbert Parish (Vacant): 3 bushels in arrears, 4 bushels due.",
              enforcement_state: "arrears",
              enforcement_summary: "Stage-one enforcement pressure rose for St. Cuthbert Parish (Vacant) because arrears remain open after carry.",
              settled_this_turn: false,
              carried_this_turn: true
            }
          ]
        }
      } as any
    });

    expect(rebasedContract?.counterpartySections[0]).toMatchObject({
      title: "Lady Westmarch (current liege)",
      helper: "Lady Westmarch now collects liege dues after House Liege died."
    });
    expect(rebasedContract?.counterpartySections[1]).toMatchObject({
      title: "St. Cuthbert Parish (Vacant)",
      helper: "St. Cuthbert Parish has no living priest; dues remain with the institution until a successor is placed."
    });
  });
});
