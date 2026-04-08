import { describe, expect, it } from "vitest";

import {
  EXPERIENCE_CONTENT_CATEGORY_ORDER,
  getGrantProspectTemplate,
  getMarriageProspectTemplate,
  getObligationCounterpartyTemplate,
  listExperienceContentSlots,
  renderGrantAcceptConfirmBody,
  renderGrantDecisionToast,
  renderMarriageAcceptConfirmBody,
  renderMarriageDecisionToast,
  renderObligationGestureOutcome,
  renderObligationResolvedSummary,
  renderObligationResponseSummary,
  summarizeExperienceContentInventory
} from "../../src/content/experienceContent";

describe("experienceContent inventory", () => {
  it("covers every locked v0.3.3 content category in one ordered registry", () => {
    const summary = summarizeExperienceContentInventory();

    expect(summary.categories).toEqual([...EXPERIENCE_CONTENT_CATEGORY_ORDER]);
    expect(summary.slotCount).toBe(7);
    expect(summary.missingCount).toBe(1);
    expect(summary.needsSurfaceCount).toBe(1);
  });

  it("maps current copy sources before the follow-on template tasks rewire them", () => {
    const obligations = listExperienceContentSlots("obligations");
    const grants = listExperienceContentSlots("grants");
    const dispossession = listExperienceContentSlots("dispossession");

    expect(obligations).toEqual([
      expect.objectContaining({
        id: "obligations.counterparty_cards",
        currentState: "central_copy",
        plannedTaskId: "V03-R3-007-T02"
      })
    ]);

    expect(grants).toEqual([
      expect.objectContaining({
        id: "grants.accept_reject_flow",
        currentState: "central_copy",
        gap: "none",
        plannedTaskId: "V03-R3-007-T03"
      })
    ]);

    expect(dispossession).toEqual([
      expect.objectContaining({
        id: "dispossession.pretrigger_warning",
        currentState: "missing",
        gap: "needs_surface"
      }),
      expect.objectContaining({
        id: "dispossession.end_state_label",
        currentState: "central_copy",
        plannedTaskId: "V03-R3-007-T05"
      })
    ]);
  });

  it("provides typed grant and marriage template families for the outcome pass", () => {
    expect(getGrantProspectTemplate()).toEqual({
      acceptConfirmTitle: "Accept grant offer?",
      acceptNoCostBody: "Accept this grant offer?",
      helperLine: "Support from your liege to ease burdens this turn.",
      rejectRiskNote: "Declining may reduce your standing."
    });

    expect(getMarriageProspectTemplate()).toEqual({
      acceptConfirmTitle: "Accept marriage proposal?",
      acceptNoCostBody: "Accept this marriage proposal?",
      outcomeChildLeaves: "leaves your court.",
      outcomeCourtSizeDecreased: "Court size decreased.",
      outcomeCourtSizeIncreased: "Court size increased."
    });
  });

  it("provides deterministic liege and church settlement templates for the obligations pass", () => {
    expect(getObligationCounterpartyTemplate("liege")).toEqual({
      defaultGestureDetail: "Court favor spent on noble gifts.",
      dueTitle: "Tax due",
      fallbackTitle: "House Liege",
      gestureTitle: "Gift to liege",
      helper: "Keeps liege dues, arrears pressure, and gift language aligned with coin-first receipts.",
      keywordHints: ["liege", "tax", "gift", "coin arrears", "tax due", "liege tax"],
      penaltyTitle: "Arrears & liege pressure",
      shortTitle: "Liege"
    });

    expect(getObligationCounterpartyTemplate("church")).toEqual({
      defaultGestureDetail: "Court effort spent on religious offerings.",
      dueTitle: "Tithe due",
      fallbackTitle: "Parish Church",
      gestureTitle: "Offering to church",
      helper: "Keeps church dues, arrears pressure, and offering language aligned with food-first receipts.",
      keywordHints: ["church", "tithe", "offering", "bushels arrears", "tithe due", "church tithe"],
      penaltyTitle: "Arrears & church pressure",
      shortTitle: "Church"
    });
  });

  it("renders distinct gifts and offerings outcomes without touching sim logic", () => {
    expect(renderObligationGestureOutcome("liege", "arrears")).toBe(
      "Gift to liege is the relationship lever for easing noble pressure when coin arrears are already visible."
    );
    expect(renderObligationGestureOutcome("liege", "clear")).toBe(
      "Gift to liege is the relationship lever for steadying noble support when dues alone are not the whole problem."
    );
    expect(renderObligationGestureOutcome("church", "arrears")).toBe(
      "Offering to church is the relationship lever for easing church pressure when bushel arrears are already visible."
    );
    expect(renderObligationGestureOutcome("church", "clear")).toBe(
      "Offering to church is the relationship lever for steadying church support when dues alone are not the whole problem."
    );
  });

  it("renders deterministic resolved and next-turn settlement summaries for both counterparties", () => {
    expect(
      renderObligationResolvedSummary({
        arrearsAmount: 4,
        carriedThisTurn: true,
        counterpartyId: "liege",
        settledThisTurn: false,
        stageLabel: "Stage 1 active"
      })
    ).toBe("This turn: arrears carried, so stage 1 active now applies.");

    expect(
      renderObligationResolvedSummary({
        arrearsAmount: 0,
        carriedThisTurn: false,
        counterpartyId: "church",
        settledThisTurn: true,
        stageLabel: "Pressure clear"
      })
    ).toBe("This turn: no arrears carried, so pressure stayed clear.");

    expect(
      renderObligationResponseSummary({
        arrearsAmount: 2,
        counterpartyId: "liege",
        dueAmount: 3
      })
    ).toBe("Next turn: pay coin to cut carried arrears, then add a gift if you need more liege cover.");

    expect(
      renderObligationResponseSummary({
        arrearsAmount: 0,
        counterpartyId: "church",
        dueAmount: 5
      })
    ).toBe(
      "Next turn: line up bushels for the current tithe before it carries, then add an offering if you need extra church support."
    );
  });

  it("renders deterministic grant and marriage decision copy without touching prospect mechanics", () => {
    expect(renderGrantAcceptConfirmBody(true)).toBe("This will apply the listed costs. Continue?");
    expect(renderGrantAcceptConfirmBody(false)).toBe("Accept this grant offer?");
    expect(renderGrantDecisionToast({ action: "accept", shortEffectSummary: "Coin +4." })).toBe("Accepted: Grant. Coin +4.");
    expect(renderGrantDecisionToast({ action: "reject", standingRisk: true })).toBe("Declined: Grant. Standing may decrease.");

    expect(renderMarriageAcceptConfirmBody({ anyCost: true, coinDeltaText: "+3 coin" })).toBe(
      "This will apply the listed costs. Continue?"
    );
    expect(renderMarriageAcceptConfirmBody({ anyCost: false, coinDeltaText: "+3 coin" })).toBe("Dowry: +3 coin. Continue?");
    expect(renderMarriageAcceptConfirmBody({ anyCost: false })).toBe("Accept this marriage proposal?");
    expect(
      renderMarriageDecisionToast({
        action: "accept",
        childName: "Matilda",
        spouseJoinsCourt: true,
        spouseName: "Hugh"
      })
    ).toBe("Marriage arranged. Matilda is now married.\nHugh joins your court. Court size increased.");
    expect(
      renderMarriageDecisionToast({
        action: "accept",
        childName: "Matilda",
        spouseJoinsCourt: false
      })
    ).toBe("Marriage arranged. Matilda is now married.\nMatilda leaves your court. Court size decreased.");
    expect(renderMarriageDecisionToast({ action: "reject", standingRisk: true })).toBe("Declined: Marriage. Standing may decrease.");
  });
});
