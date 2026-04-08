export const EXPERIENCE_CONTENT_CATEGORY_ORDER = [
  "obligations",
  "offerings",
  "grants",
  "marriage",
  "arrears",
  "dispossession"
] as const;

export type ExperienceContentCategory = (typeof EXPERIENCE_CONTENT_CATEGORY_ORDER)[number];

export type ExperienceContentCurrentState = "hard_coded" | "central_copy" | "missing";
export type ExperienceContentGap = "none" | "needs_template" | "needs_surface";

export type ExperienceContentSlotInventoryEntry = {
  category: ExperienceContentCategory;
  currentRefs: string[];
  currentState: ExperienceContentCurrentState;
  gap: ExperienceContentGap;
  id: string;
  notes: string;
  plannedTaskId: "V03-R3-007-T02" | "V03-R3-007-T03" | "V03-R3-007-T04" | "V03-R3-007-T05";
  surfaces: string[];
  title: string;
};

export const EXPERIENCE_OBLIGATION_COUNTERPARTY_ORDER = ["liege", "church"] as const;

export type ExperienceObligationCounterpartyId = (typeof EXPERIENCE_OBLIGATION_COUNTERPARTY_ORDER)[number];
export type ExperienceObligationEnforcementState = "clear" | "arrears";
export type ExperienceObligationWarningStage = number | null;

export type ExperienceObligationCounterpartyTemplate = {
  defaultGestureDetail: string;
  dueTitle: string;
  fallbackTitle: string;
  gestureTitle: string;
  helper: string;
  keywordHints: string[];
  penaltyTitle: string;
  shortTitle: string;
};

export type ExperienceGrantProspectTemplate = {
  acceptConfirmTitle: string;
  acceptNoCostBody: string;
  helperLine: string;
  rejectRiskNote: string;
};

export type ExperienceMarriageProspectTemplate = {
  acceptConfirmTitle: string;
  acceptNoCostBody: string;
  outcomeChildLeaves: string;
  outcomeCourtSizeDecreased: string;
  outcomeCourtSizeIncreased: string;
};

const EXPERIENCE_OBLIGATION_COUNTERPARTY_TEMPLATES: Record<
  ExperienceObligationCounterpartyId,
  ExperienceObligationCounterpartyTemplate
> = {
  liege: {
    defaultGestureDetail: "Court favor spent on noble gifts.",
    dueTitle: "Tax due",
    fallbackTitle: "House Liege",
    gestureTitle: "Gift to liege",
    helper: "Keeps liege dues, arrears pressure, and gift language aligned with coin-first receipts.",
    keywordHints: ["liege", "tax", "gift", "coin arrears", "tax due", "liege tax"],
    penaltyTitle: "Arrears & liege pressure",
    shortTitle: "Liege"
  },
  church: {
    defaultGestureDetail: "Court effort spent on religious offerings.",
    dueTitle: "Tithe due",
    fallbackTitle: "Parish Church",
    gestureTitle: "Offering to church",
    helper: "Keeps church dues, arrears pressure, and offering language aligned with food-first receipts.",
    keywordHints: ["church", "tithe", "offering", "bushels arrears", "tithe due", "church tithe"],
    penaltyTitle: "Arrears & church pressure",
    shortTitle: "Church"
  }
};

const EXPERIENCE_GRANT_PROSPECT_TEMPLATE: ExperienceGrantProspectTemplate = {
  acceptConfirmTitle: "Accept grant offer?",
  acceptNoCostBody: "Accept this grant offer?",
  helperLine: "Support from your liege to ease burdens this turn.",
  rejectRiskNote: "Declining may reduce your standing."
};

const EXPERIENCE_MARRIAGE_PROSPECT_TEMPLATE: ExperienceMarriageProspectTemplate = {
  acceptConfirmTitle: "Accept marriage proposal?",
  acceptNoCostBody: "Accept this marriage proposal?",
  outcomeChildLeaves: "leaves your court.",
  outcomeCourtSizeDecreased: "Court size decreased.",
  outcomeCourtSizeIncreased: "Court size increased."
};

export const EXPERIENCE_CONTENT_SLOT_INVENTORY: ExperienceContentSlotInventoryEntry[] = [
  {
    id: "obligations.counterparty_cards",
    title: "Obligations settlement and response copy",
    category: "obligations",
    currentState: "central_copy",
    gap: "none",
    plannedTaskId: "V03-R3-007-T02",
    surfaces: ["Turn report cards", "Decisions helper", "Obligations modal", "Receipts counterparty paths"],
    currentRefs: [
      "src/content/experienceContent.ts#EXPERIENCE_OBLIGATION_COUNTERPARTY_TEMPLATES",
      "src/content/experienceContent.ts#renderObligationResolvedSummary",
      "src/content/experienceContent.ts#renderObligationResponseSummary"
    ],
    notes: "Liege and church settlement, timing, and counterparty helper text now live in the shared experience-content registry so current UI surfaces can wire them without duplicating phrases."
  },
  {
    id: "offerings.relationship_levers",
    title: "Gift and offering outcome language",
    category: "offerings",
    currentState: "central_copy",
    gap: "none",
    plannedTaskId: "V03-R3-007-T02",
    surfaces: ["Court budget", "Obligations cards", "Receipts counterparty paths"],
    currentRefs: [
      "src/content/experienceContent.ts#EXPERIENCE_OBLIGATION_COUNTERPARTY_TEMPLATES",
      "src/content/experienceContent.ts#renderObligationGestureOutcome"
    ],
    notes: "Gift to liege and offering to church now have one shared content home for titles, details, and relationship-outcome phrasing."
  },
  {
    id: "grants.accept_reject_flow",
    title: "Grant received and denied copy",
    category: "grants",
    currentState: "central_copy",
    gap: "none",
    plannedTaskId: "V03-R3-007-T03",
    surfaces: ["Prospects panel", "Accept or reject confirm", "Decision toast"],
    currentRefs: [
      "src/content/experienceContent.ts#EXPERIENCE_GRANT_PROSPECT_TEMPLATE",
      "src/content/experienceContent.ts#renderGrantAcceptConfirmBody",
      "src/content/experienceContent.ts#renderGrantDecisionToast"
    ],
    notes: "Grant received and denied copy now has a typed template home, so later UI wiring can stop reaching back into generic App-level prospect strings."
  },
  {
    id: "marriage.accept_reject_flow",
    title: "Marriage accept and reject copy",
    category: "marriage",
    currentState: "central_copy",
    gap: "none",
    plannedTaskId: "V03-R3-007-T03",
    surfaces: ["Prospects panel", "Accept or reject confirm", "Decision toast", "Household details log summaries"],
    currentRefs: [
      "src/content/experienceContent.ts#EXPERIENCE_MARRIAGE_PROSPECT_TEMPLATE",
      "src/content/experienceContent.ts#renderMarriageAcceptConfirmBody",
      "src/content/experienceContent.ts#renderMarriageDecisionToast"
    ],
    notes: "Marriage accept and reject wording now lives in a typed content family that covers both the prospect decision moment and the immediate household outcome language."
  },
  {
    id: "arrears.stage_legibility",
    title: "Arrears stage and next-step warnings",
    category: "arrears",
    currentState: "central_copy",
    gap: "none",
    plannedTaskId: "V03-R3-007-T04",
    surfaces: ["Obligations cards", "Obligations modal", "Receipts counterparty paths"],
    currentRefs: [
      "src/content/experienceContent.ts#renderObligationStageLabel",
      "src/content/experienceContent.ts#renderObligationResolvedSummary",
      "src/content/experienceContent.ts#renderObligationResponseSummary"
    ],
    notes: "The arrears ladder now has a shared stage-aware template path, including stage-two tangible bite and stage-three dispossession danger wording."
  },
  {
    id: "dispossession.pretrigger_warning",
    title: "Dispossession warning before end-state",
    category: "dispossession",
    currentState: "central_copy",
    gap: "none",
    plannedTaskId: "V03-R3-007-T04",
    surfaces: ["Obligations cards", "Obligations modal", "Receipts counterparty paths"],
    currentRefs: ["src/content/experienceContent.ts#renderObligationStageLabel", "src/content/experienceContent.ts#renderObligationResponseSummary"],
    notes: "Stage-three fiscal pressure now has a dedicated pre-trigger warning template so the player sees dispossession danger before the end-state lands."
  },
  {
    id: "dispossession.end_state_label",
    title: "Dispossession end-state label",
    category: "dispossession",
    currentState: "central_copy",
    gap: "needs_template",
    plannedTaskId: "V03-R3-007-T05",
    surfaces: ["Game-over banner", "Manor-state unrest tip"],
    currentRefs: ["src/App.tsx#GAME_OVER_REASON_COPY.Dispossessed", "src/ui/panels/ManorStatePanel.tsx"],
    notes: "The shell already names dispossession after it happens, but the copy still sits apart from the fiscal warning path that leads into it."
  }
];

export function listExperienceContentSlots(category?: ExperienceContentCategory): ExperienceContentSlotInventoryEntry[] {
  return EXPERIENCE_CONTENT_SLOT_INVENTORY.filter((entry) => (category ? entry.category === category : true)).map((entry) => ({
    ...entry,
    currentRefs: [...entry.currentRefs],
    surfaces: [...entry.surfaces]
  }));
}

export function getObligationCounterpartyTemplate(
  counterpartyId: ExperienceObligationCounterpartyId
): ExperienceObligationCounterpartyTemplate {
  const template = EXPERIENCE_OBLIGATION_COUNTERPARTY_TEMPLATES[counterpartyId];
  return {
    ...template,
    keywordHints: [...template.keywordHints]
  };
}

export function getGrantProspectTemplate(): ExperienceGrantProspectTemplate {
  return { ...EXPERIENCE_GRANT_PROSPECT_TEMPLATE };
}

export function getMarriageProspectTemplate(): ExperienceMarriageProspectTemplate {
  return { ...EXPERIENCE_MARRIAGE_PROSPECT_TEMPLATE };
}

export function renderObligationGestureOutcome(
  counterpartyId: ExperienceObligationCounterpartyId,
  enforcementState: ExperienceObligationEnforcementState
): string {
  if (counterpartyId === "liege") {
    if (enforcementState === "arrears") {
      return "Gift to liege is the relationship lever for easing noble pressure when coin arrears are already visible.";
    }
    return "Gift to liege is the relationship lever for steadying noble support when dues alone are not the whole problem.";
  }

  if (enforcementState === "arrears") {
    return "Offering to church is the relationship lever for easing church pressure when bushel arrears are already visible.";
  }
  return "Offering to church is the relationship lever for steadying church support when dues alone are not the whole problem.";
}

export function renderObligationResolvedSummary(args: {
  arrearsAmount: number;
  carriedThisTurn: boolean;
  counterpartyId: ExperienceObligationCounterpartyId;
  enforcementStage: ExperienceObligationWarningStage;
  settledThisTurn: boolean;
}): string {
  const { arrearsAmount, carriedThisTurn, enforcementStage, settledThisTurn } = args;
  const normalizedStageLabel = renderObligationStageLabel({
    enforcementStage,
    enforcementState: arrearsAmount > 0 ? "arrears" : "clear"
  }).toLowerCase();

  if (arrearsAmount > 0) {
    if (carriedThisTurn) {
      return `This turn: arrears carried, so ${normalizedStageLabel} now applies.`;
    }
    return `This turn: arrears remained open, so ${normalizedStageLabel} stayed in place.`;
  }

  if (settledThisTurn) {
    return "This turn: no arrears carried, so pressure stayed clear.";
  }

  return "This turn: pressure ended clear with no carried arrears.";
}

export function renderObligationResponseSummary(args: {
  arrearsAmount: number;
  counterpartyId: ExperienceObligationCounterpartyId;
  dueAmount: number;
  enforcementStage: ExperienceObligationWarningStage;
}): string {
  const { arrearsAmount, counterpartyId, dueAmount, enforcementStage } = args;

  if (counterpartyId === "liege") {
    if (arrearsAmount > 0) {
      if (enforcementStage !== null && enforcementStage >= 3) {
        return "Next turn: dispossession danger is active. Clear liege arrears immediately or you can lose the seat.";
      }
      if (enforcementStage !== null && enforcementStage >= 2) {
        return "Next turn: tangible bite is active. Clear liege arrears before more coin or stores are forced out of the manor.";
      }
      return "Next turn: pay coin to cut carried arrears, then add a gift if you need more liege cover.";
    }
    if (dueAmount > 0) {
      return "Next turn: line up coin for the current tax due before it carries, then add a gift if support still looks thin.";
    }
    return "Next turn: no liege arrears are carried right now, but coin payments and gifts remain your levers if pressure returns.";
  }

  if (arrearsAmount > 0) {
    if (enforcementStage !== null && enforcementStage >= 3) {
      return "Next turn: dispossession danger is active. Clear church arrears immediately or you can lose the seat.";
    }
    if (enforcementStage !== null && enforcementStage >= 2) {
      return "Next turn: tangible bite is active. Clear church arrears before more stores are forced out under church pressure.";
    }
    return "Next turn: pay bushels to cut carried arrears, then add an offering if you need more church cover.";
  }
  if (dueAmount > 0) {
    return "Next turn: line up bushels for the current tithe before it carries, then add an offering if you need extra church support.";
  }
  return "Next turn: no church arrears are carried right now, but bushel payments and offerings remain your levers if pressure returns.";
}

export function renderObligationStageLabel(args: {
  enforcementStage: ExperienceObligationWarningStage;
  enforcementState: ExperienceObligationEnforcementState;
}): string {
  const { enforcementStage, enforcementState } = args;

  if (enforcementState === "clear") return "Pressure clear";
  if (enforcementStage === null) return "Pressure active";
  if (enforcementStage >= 3) return "Stage 3: dispossession danger";
  if (enforcementStage >= 2) return "Stage 2: tangible bite";
  return `Stage ${enforcementStage} active`;
}

export function renderGrantAcceptConfirmBody(anyCost: boolean): string {
  return anyCost ? "This will apply the listed costs. Continue?" : EXPERIENCE_GRANT_PROSPECT_TEMPLATE.acceptNoCostBody;
}

export function renderGrantDecisionToast(args: {
  action: "accept" | "reject";
  shortEffectSummary?: string;
  standingRisk?: boolean;
}): string {
  const { action, shortEffectSummary = "Arrangement recorded.", standingRisk = false } = args;
  if (action === "accept") {
    return `Accepted: Grant. ${shortEffectSummary}`;
  }

  const base = "Declined: Grant.";
  return standingRisk ? `${base} Standing may decrease.` : base;
}

export function renderMarriageAcceptConfirmBody(args: {
  anyCost: boolean;
  coinDeltaText?: string | null;
}): string {
  const { anyCost, coinDeltaText } = args;
  if (anyCost) {
    return "This will apply the listed costs. Continue?";
  }
  if (coinDeltaText) {
    return `Dowry: ${coinDeltaText}. Continue?`;
  }
  return EXPERIENCE_MARRIAGE_PROSPECT_TEMPLATE.acceptNoCostBody;
}

export function renderMarriageDecisionToast(args: {
  action: "accept" | "reject";
  childName?: string | null;
  shortEffectSummary?: string;
  spouseJoinsCourt?: boolean;
  spouseName?: string | null;
  standingRisk?: boolean;
}): string {
  const {
    action,
    childName,
    shortEffectSummary = "Arrangement recorded.",
    spouseJoinsCourt = false,
    spouseName,
    standingRisk = false
  } = args;

  if (action === "reject") {
    const base = "Declined: Marriage.";
    return standingRisk ? `${base} Standing may decrease.` : base;
  }

  if (!childName) {
    return `Accepted: Marriage. ${shortEffectSummary}`;
  }

  const line1 = `Marriage arranged. ${childName} is now married.`;
  if (spouseJoinsCourt && spouseName) {
    return `${line1}\n${spouseName} joins your court. ${EXPERIENCE_MARRIAGE_PROSPECT_TEMPLATE.outcomeCourtSizeIncreased}`;
  }

  return `${line1}\n${childName} ${EXPERIENCE_MARRIAGE_PROSPECT_TEMPLATE.outcomeChildLeaves} ${EXPERIENCE_MARRIAGE_PROSPECT_TEMPLATE.outcomeCourtSizeDecreased}`;
}

export function summarizeExperienceContentInventory(): {
  categories: ExperienceContentCategory[];
  mappedCount: number;
  missingCount: number;
  needsSurfaceCount: number;
  slotCount: number;
} {
  const missingCount = EXPERIENCE_CONTENT_SLOT_INVENTORY.filter((entry) => entry.currentState === "missing").length;
  const needsSurfaceCount = EXPERIENCE_CONTENT_SLOT_INVENTORY.filter((entry) => entry.gap === "needs_surface").length;

  return {
    categories: [...EXPERIENCE_CONTENT_CATEGORY_ORDER],
    mappedCount: EXPERIENCE_CONTENT_SLOT_INVENTORY.length - missingCount,
    missingCount,
    needsSurfaceCount,
    slotCount: EXPERIENCE_CONTENT_SLOT_INVENTORY.length
  };
}
