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
    gap: "needs_template",
    plannedTaskId: "V03-R3-007-T03",
    surfaces: ["Prospects panel", "Accept or reject confirm", "Decision toast"],
    currentRefs: ["src/App.tsx#COPY.prospectGrantHelperLine", "src/App.tsx#COPY.prospectAcceptConfirmTitle_grant", "src/App.tsx#COPY.prospectToastAccepted_grant", "src/App.tsx#COPY.prospectToastRejected_grant"],
    notes: "Grant copy is centralized in App-level UI copy, but it is still a generic prospect string set rather than a typed v0.3.3 content slot family."
  },
  {
    id: "marriage.accept_reject_flow",
    title: "Marriage accept and reject copy",
    category: "marriage",
    currentState: "central_copy",
    gap: "needs_template",
    plannedTaskId: "V03-R3-007-T03",
    surfaces: ["Prospects panel", "Accept or reject confirm", "Decision toast", "Household details log summaries"],
    currentRefs: [
      "src/App.tsx#COPY.prospectAcceptConfirmTitle_marriage",
      "src/App.tsx#COPY.prospectToastAccepted_marriage",
      "src/App.tsx#COPY.prospectToastRejected_marriage",
      "src/App.tsx#COPY.marriageToast_line1"
    ],
    notes: "Marriage response strings are centralized, but outcome phrasing is split between prospect decisions and household aftermath instead of one content family."
  },
  {
    id: "arrears.stage_legibility",
    title: "Arrears stage and next-step warnings",
    category: "arrears",
    currentState: "hard_coded",
    gap: "needs_template",
    plannedTaskId: "V03-R3-007-T04",
    surfaces: ["Obligations cards", "Obligations modal", "Receipts counterparty paths"],
    currentRefs: [
      "src/ui/playScreenObligations.ts#enforcementStageLabel",
      "src/ui/playScreenObligations.ts#resolvedPressureSummary",
      "src/ui/playScreenObligations.ts#responsePressureSummary"
    ],
    notes: "Stage messaging currently supports the v0.3.1 baseline, but it has no shared stage-specific content slots for stage-two tangible bite or stage-three dispossession danger."
  },
  {
    id: "dispossession.pretrigger_warning",
    title: "Dispossession warning before end-state",
    category: "dispossession",
    currentState: "missing",
    gap: "needs_surface",
    plannedTaskId: "V03-R3-007-T04",
    surfaces: ["No dedicated pre-trigger warning surface yet"],
    currentRefs: [],
    notes: "The current shell has a game-over threshold tip and a game-over label, but no dedicated warning string family that escalates before the end-state actually lands."
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
  settledThisTurn: boolean;
  stageLabel: string;
}): string {
  const { arrearsAmount, carriedThisTurn, settledThisTurn, stageLabel } = args;
  const normalizedStageLabel = stageLabel.trim().toLowerCase();

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
}): string {
  const { arrearsAmount, counterpartyId, dueAmount } = args;

  if (counterpartyId === "liege") {
    if (arrearsAmount > 0) {
      return "Next turn: pay coin to cut carried arrears, then add a gift if you need more liege cover.";
    }
    if (dueAmount > 0) {
      return "Next turn: line up coin for the current tax due before it carries, then add a gift if support still looks thin.";
    }
    return "Next turn: no liege arrears are carried right now, but coin payments and gifts remain your levers if pressure returns.";
  }

  if (arrearsAmount > 0) {
    return "Next turn: pay bushels to cut carried arrears, then add an offering if you need more church cover.";
  }
  if (dueAmount > 0) {
    return "Next turn: line up bushels for the current tithe before it carries, then add an offering if you need extra church support.";
  }
  return "Next turn: no church arrears are carried right now, but bushel payments and offerings remain your levers if pressure returns.";
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
