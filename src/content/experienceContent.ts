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

export const EXPERIENCE_CONTENT_SLOT_INVENTORY: ExperienceContentSlotInventoryEntry[] = [
  {
    id: "obligations.counterparty_cards",
    title: "Obligations settlement and response copy",
    category: "obligations",
    currentState: "hard_coded",
    gap: "needs_template",
    plannedTaskId: "V03-R3-007-T02",
    surfaces: ["Turn report cards", "Decisions helper", "Obligations modal", "Receipts counterparty paths"],
    currentRefs: [
      "src/ui/playScreenObligations.ts#COUNTERPARTY_META",
      "src/ui/playScreenObligations.ts#resolvedPressureSummary",
      "src/ui/playScreenObligations.ts#responsePressureSummary"
    ],
    notes: "Liege and church settlement, timing, and counterparty helper text already exist, but they still live inside the UI contract instead of a shared content module."
  },
  {
    id: "offerings.relationship_levers",
    title: "Gift and offering outcome language",
    category: "offerings",
    currentState: "hard_coded",
    gap: "needs_template",
    plannedTaskId: "V03-R3-007-T02",
    surfaces: ["Court budget", "Obligations cards", "Receipts counterparty paths"],
    currentRefs: [
      "src/ui/playScreenCourtBudget.ts#COURT_DECISION_BUDGET_ACTION_COPY",
      "src/ui/playScreenObligations.ts#gestureRelationshipSummary",
      "src/ui/panels/ReceiptsViewerPanel.tsx"
    ],
    notes: "Gift to liege and offering to church already have stable labels, but the relationship-outcome phrasing is duplicated across budget and obligations explainers."
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
