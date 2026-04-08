import { describe, expect, it } from "vitest";

import {
  EXPERIENCE_CONTENT_CATEGORY_ORDER,
  getObligationCounterpartyTemplate,
  listExperienceContentSlots,
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
});
