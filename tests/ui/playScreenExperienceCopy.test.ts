import { describe, expect, it } from "vitest";

import {
  resolveGameOverReasonLabel,
  resolveProspectAcceptCopy,
  resolveProspectDecisionToast
} from "../../src/ui/playScreenExperienceCopy";

const FALLBACK_COPY = {
  prospectAcceptConfirmBody_inheritance_claim: "This will record the claim. Continue?",
  prospectAcceptConfirmBody_noCosts: "Accept this prospect?",
  prospectAcceptConfirmBody_withCosts: "This will apply the listed costs. Continue?",
  prospectAcceptConfirmTitle: "Accept prospect?",
  prospectAcceptConfirmTitle_inheritance_claim: "Accept inheritance claim?",
  prospectToastAccepted: (prospectType: string, shortEffectSummary: string) => `Accepted: ${prospectType}. ${shortEffectSummary}`,
  prospectToastDeclined: (prospectType: string) => `Declined: ${prospectType}.`,
  prospectToastStandingMayDecrease: "Standing may decrease."
};

describe("playScreenExperienceCopy", () => {
  it("uses typed grant and marriage content for confirm dialogs", () => {
    expect(
      resolveProspectAcceptCopy({
        anyCost: false,
        fallbackCopy: FALLBACK_COPY,
        prospectType: "grant"
      })
    ).toEqual({
      body: "Accept this grant offer?",
      title: "Accept grant offer?"
    });

    expect(
      resolveProspectAcceptCopy({
        anyCost: false,
        coinDeltaText: "+6",
        fallbackCopy: FALLBACK_COPY,
        prospectType: "marriage"
      })
    ).toEqual({
      body: "Dowry: +6. Continue?",
      title: "Accept marriage proposal?"
    });
  });

  it("uses typed grant and marriage content for accept or reject toasts", () => {
    expect(
      resolveProspectDecisionToast({
        action: "accept",
        fallbackCopy: FALLBACK_COPY,
        prospectType: "grant",
        shortEffectSummary: "Coin +4.",
        typeLabel: "Grant"
      })
    ).toBe("Accepted: Grant. Coin +4.");

    expect(
      resolveProspectDecisionToast({
        action: "reject",
        fallbackCopy: FALLBACK_COPY,
        prospectType: "marriage",
        shortEffectSummary: "Arrangement recorded.",
        standingRisk: true,
        typeLabel: "Marriage"
      })
    ).toBe("Declined: Marriage. Standing may decrease.");
  });

  it("uses typed marriage aftermath copy for spouse movement and falls back for inheritance claims", () => {
    expect(
      resolveProspectDecisionToast({
        action: "accept",
        childName: "Agnes",
        fallbackCopy: FALLBACK_COPY,
        prospectType: "marriage",
        shortEffectSummary: "Arrangement recorded.",
        spouseJoinsCourt: true,
        spouseName: "Rohese",
        typeLabel: "Marriage"
      })
    ).toBe("Marriage arranged. Agnes is now married.\nRohese joins your court. Court size increased.");

    expect(
      resolveProspectDecisionToast({
        action: "accept",
        fallbackCopy: FALLBACK_COPY,
        prospectType: "inheritance_claim",
        shortEffectSummary: "Claim recorded.",
        typeLabel: "Inheritance claim"
      })
    ).toBe("Accepted: Inheritance claim. Claim recorded.");
  });

  it("uses the shared dispossession end-state label in the gameplay shell", () => {
    expect(
      resolveGameOverReasonLabel({
        fallbackCopy: {
          DeathNoHeir: "No living heir."
        },
        reason: "Dispossessed"
      })
    ).toBe("Dispossessed (Unrest ≥ 100 at end of turn)");
  });
});
