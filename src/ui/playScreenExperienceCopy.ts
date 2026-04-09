import {
  getGrantProspectTemplate,
  getMarriageProspectTemplate,
  renderDispossessionEndStateLabel,
  renderGrantAcceptConfirmBody,
  renderGrantDecisionToast,
  renderMarriageAcceptConfirmBody,
  renderMarriageDecisionToast
} from "../content/experienceContent";

type PlayScreenCopyFallback = {
  prospectAcceptConfirmBody_inheritance_claim: string;
  prospectAcceptConfirmBody_noCosts: string;
  prospectAcceptConfirmBody_withCosts: string;
  prospectAcceptConfirmTitle: string;
  prospectAcceptConfirmTitle_inheritance_claim: string;
  prospectToastAccepted: (prospectType: string, shortEffectSummary: string) => string;
  prospectToastDeclined: (prospectType: string) => string;
  prospectToastStandingMayDecrease: string;
};

export function resolveProspectAcceptCopy(args: {
  anyCost: boolean;
  coinDeltaText?: string | null;
  fallbackCopy: PlayScreenCopyFallback;
  prospectType: string | null | undefined;
}): { body: string; title: string } {
  const { anyCost, coinDeltaText, fallbackCopy, prospectType } = args;

  if (prospectType === "grant") {
    return {
      body: renderGrantAcceptConfirmBody(anyCost),
      title: getGrantProspectTemplate().acceptConfirmTitle
    };
  }

  if (prospectType === "marriage") {
    return {
      body: renderMarriageAcceptConfirmBody({
        anyCost,
        coinDeltaText
      }),
      title: getMarriageProspectTemplate().acceptConfirmTitle
    };
  }

  if (prospectType === "inheritance_claim") {
    return {
      body: fallbackCopy.prospectAcceptConfirmBody_inheritance_claim,
      title: fallbackCopy.prospectAcceptConfirmTitle_inheritance_claim
    };
  }

  return {
    body: anyCost ? fallbackCopy.prospectAcceptConfirmBody_withCosts : fallbackCopy.prospectAcceptConfirmBody_noCosts,
    title: fallbackCopy.prospectAcceptConfirmTitle
  };
}

export function resolveProspectDecisionToast(args: {
  action: "accept" | "reject";
  childName?: string | null;
  fallbackCopy: Pick<PlayScreenCopyFallback, "prospectToastAccepted" | "prospectToastDeclined" | "prospectToastStandingMayDecrease">;
  prospectType: string | null | undefined;
  shortEffectSummary: string;
  spouseJoinsCourt?: boolean;
  spouseName?: string | null;
  standingRisk?: boolean;
  typeLabel: string;
}): string {
  const {
    action,
    childName,
    fallbackCopy,
    prospectType,
    shortEffectSummary,
    spouseJoinsCourt,
    spouseName,
    standingRisk = false,
    typeLabel
  } = args;

  if (prospectType === "grant") {
    return renderGrantDecisionToast({
      action,
      shortEffectSummary,
      standingRisk
    });
  }

  if (prospectType === "marriage") {
    return renderMarriageDecisionToast({
      action,
      childName,
      shortEffectSummary,
      spouseJoinsCourt,
      spouseName,
      standingRisk
    });
  }

  if (action === "accept") {
    return fallbackCopy.prospectToastAccepted(typeLabel, shortEffectSummary);
  }

  const baseMessage = fallbackCopy.prospectToastDeclined(typeLabel);
  return standingRisk ? `${baseMessage} ${fallbackCopy.prospectToastStandingMayDecrease}` : baseMessage;
}

export function resolveGameOverReasonLabel(args: {
  fallbackCopy: Record<string, string>;
  reason: string;
}): string {
  const { fallbackCopy, reason } = args;
  if (reason === "Dispossessed") {
    return renderDispossessionEndStateLabel();
  }
  return fallbackCopy[reason] ?? reason;
}
