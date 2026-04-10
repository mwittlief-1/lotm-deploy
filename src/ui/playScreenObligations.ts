import type {
  ObligationsGestureDecision,
  ObligationsGesturePaymentMode,
  RunState,
  TurnDecisions
} from "../sim/types";
import type { CourtDecisionBudgetSurface } from "./playScreenCourtBudget";
import {
  getObligationCounterpartyTemplate,
  renderObligationGestureOutcome,
  renderObligationResolvedSummary,
  renderObligationResponseSummary,
  renderObligationStageLabel
} from "../content/experienceContent";

export const PLAY_SCREEN_OBLIGATIONS_CONTRACT_SCHEMA_VERSION = "play_screen_obligations_contract_v1" as const;
export const PLAY_SCREEN_OBLIGATION_COUNTERPARTY_ORDER = ["liege", "church"] as const;
export const PLAY_SCREEN_OBLIGATION_RECEIPT_CATEGORY_ORDER = ["coin", "food", "unrest"] as const;
const OBLIGATION_GESTURE_PAYMENT_MODE_OPTIONS = {
  gift_liege: ["coin", "food_stores", "meat_stores", "none"],
  offering_church: ["food_stores", "coin", "meat_stores", "none"]
} as const satisfies Record<string, readonly ObligationsGesturePaymentMode[]>;
const OBLIGATION_GESTURE_DEFAULT_PAYMENT_MODES = {
  gift_liege: "coin",
  offering_church: "food_stores"
} as const satisfies Record<string, Exclude<ObligationsGesturePaymentMode, "none">>;

export type ObligationsCounterpartyId = (typeof PLAY_SCREEN_OBLIGATION_COUNTERPARTY_ORDER)[number];
export type ObligationReceiptCategory = (typeof PLAY_SCREEN_OBLIGATION_RECEIPT_CATEGORY_ORDER)[number];
export type ObligationsModalFocus = "overview" | ObligationsCounterpartyId;
export type ObligationsModalOrigin = "turn_report" | "decisions";
export type ObligationsGestureActionId = "gift_liege" | "offering_church";

export type ObligationsModalRoute = {
  focus: ObligationsModalFocus;
  origin: ObligationsModalOrigin;
};

export type ObligationsContractGroup = {
  amount: number;
  amountLabel: string;
  receiptCategories: ObligationReceiptCategory[];
  summary: string;
  title: string;
};

export type ObligationsContractPenaltyGroup = ObligationsContractGroup & {
  carriedThisTurn: boolean;
  enforcementStage: number | null;
  enforcementState: "clear" | "arrears";
  enforcementSummary: string;
  responseSummary: string;
  resolvedSummary: string;
  stageLabel: string;
  settledThisTurn: boolean;
};

export type ObligationsContractGestureGroup = {
  actionId: "gift_liege" | "offering_church";
  availableInBudget: boolean;
  cost: number | null;
  detail: string;
  leverSummary: string;
  receiptCategories: ObligationReceiptCategory[];
  spent: number | null;
  title: string;
};

export type ObligationsCounterpartyContractSection = {
  dueGroup: ObligationsContractGroup;
  gestureGroup: ObligationsContractGestureGroup;
  helper: string;
  id: ObligationsCounterpartyId;
  penaltyGroup: ObligationsContractPenaltyGroup;
  receiptCategoryOrder: ObligationReceiptCategory[];
  receiptKeywords: string[];
  settlementStatus: string;
  shortTitle: string;
  title: string;
};

export type ObligationsCounterpartyContract = {
  counterpartyOrder: ObligationsCounterpartyId[];
  counterpartySections: ObligationsCounterpartyContractSection[];
  receiptCategoryOrder: ObligationReceiptCategory[];
  schemaVersion: typeof PLAY_SCREEN_OBLIGATIONS_CONTRACT_SCHEMA_VERSION;
};

type ParsedObligationsViewSummary = {
  arrearsAmount: number;
  carriedThisTurn: boolean;
  counterpartyKind: ObligationsCounterpartyId;
  counterpartyLabel: string;
  dueAmount: number;
  enforcementStage: number | null;
  enforcementState: "clear" | "arrears";
  enforcementSummary: string;
  settlementStatus: string;
  settlementSummary: string;
  settledThisTurn: boolean;
};

const COUNTERPARTY_META: Record<
  ObligationsCounterpartyId,
  ReturnType<typeof getObligationCounterpartyTemplate> & {
    receiptCategoryOrder: ObligationReceiptCategory[];
  }
> = {
  liege: {
    ...getObligationCounterpartyTemplate("liege"),
    receiptCategoryOrder: ["coin", "unrest"],
  },
  church: {
    ...getObligationCounterpartyTemplate("church"),
    receiptCategoryOrder: ["food", "unrest"],
  }
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readStage(value: unknown): number | null {
  const parsed = readNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function formatAmount(amount: number, counterpartyId: ObligationsCounterpartyId): string {
  if (counterpartyId === "liege") return `${amount} coin`;
  return `${amount} ${amount === 1 ? "bushel" : "bushels"}`;
}

function gestureActionId(counterpartyId: ObligationsCounterpartyId): "gift_liege" | "offering_church" {
  return counterpartyId === "liege" ? "gift_liege" : "offering_church";
}

function normalizeGestureAmount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function defaultGestureDecision(actionId: ObligationsGestureActionId): ObligationsGestureDecision {
  return {
    amount: 0,
    payment_mode: "none"
  };
}

function normalizedGesturePaymentMode(
  actionId: ObligationsGestureActionId,
  value: unknown
): ObligationsGesturePaymentMode {
  return obligationGesturePaymentModeOptions(actionId).includes(value as ObligationsGesturePaymentMode)
    ? (value as ObligationsGesturePaymentMode)
    : defaultGestureDecision(actionId).payment_mode;
}

function readGestureMap(decisions: TurnDecisions) {
  return decisions.obligations.gestures ?? {
    gift_liege: defaultGestureDecision("gift_liege"),
    offering_church: defaultGestureDecision("offering_church")
  };
}

function writeGestureDecision(
  decisions: TurnDecisions,
  actionId: ObligationsGestureActionId,
  decision: ObligationsGestureDecision
): TurnDecisions {
  const gestures = readGestureMap(decisions);
  return {
    ...decisions,
    obligations: {
      ...decisions.obligations,
      gestures: {
        ...gestures,
        [actionId]: decision
      }
    }
  };
}

function gestureReceiptCategory(counterpartyId: ObligationsCounterpartyId): ObligationReceiptCategory[] {
  return counterpartyId === "liege" ? ["coin"] : ["food"];
}

function gestureRelationshipSummary(counterpartyId: ObligationsCounterpartyId, summary: ParsedObligationsViewSummary): string {
  return renderObligationGestureOutcome(counterpartyId, summary.enforcementState);
}

function enforcementStageLabel(summary: ParsedObligationsViewSummary): string {
  return renderObligationStageLabel({
    enforcementStage: summary.enforcementStage,
    enforcementState: summary.enforcementState
  });
}

function resolvedPressureSummary(summary: ParsedObligationsViewSummary): string {
  return renderObligationResolvedSummary({
    arrearsAmount: summary.arrearsAmount,
    carriedThisTurn: summary.carriedThisTurn,
    counterpartyId: summary.counterpartyKind,
    enforcementStage: summary.enforcementStage,
    settledThisTurn: summary.settledThisTurn
  });
}

function responsePressureSummary(summary: ParsedObligationsViewSummary): string {
  return renderObligationResponseSummary({
    arrearsAmount: summary.arrearsAmount,
    counterpartyId: summary.counterpartyKind,
    dueAmount: summary.dueAmount,
    enforcementStage: summary.enforcementStage
  });
}

function parseSummaryByCounterparty(previewState: RunState): Map<ObligationsCounterpartyId, ParsedObligationsViewSummary> | null {
  const previewRecord = previewState as RunState & { economy_obligations_view?: unknown };
  const obligationsView = asRecord(previewRecord.economy_obligations_view);
  if (!obligationsView) return null;

  const rawSummaries = Array.isArray(obligationsView.counterparty_summaries) ? obligationsView.counterparty_summaries : [];
  const summaries = new Map<ObligationsCounterpartyId, ParsedObligationsViewSummary>();

  for (const rawSummary of rawSummaries) {
    const summary = asRecord(rawSummary);
    if (!summary) continue;

    const counterpartyKind = readString(summary.counterparty_kind);
    if (counterpartyKind !== "liege" && counterpartyKind !== "church") continue;

    const counterpartyLabel = readString(summary.counterparty_label) ?? COUNTERPARTY_META[counterpartyKind].fallbackTitle;

    summaries.set(counterpartyKind, {
      arrearsAmount: readNumber(summary.arrears_amount) ?? 0,
      carriedThisTurn: readBoolean(summary.carried_this_turn),
      counterpartyKind,
      counterpartyLabel,
      dueAmount: readNumber(summary.due_amount) ?? 0,
      enforcementStage: readStage(summary.enforcement_stage),
      enforcementState: summary.enforcement_state === "arrears" ? "arrears" : "clear",
      enforcementSummary: readString(summary.enforcement_summary) ?? `${counterpartyLabel}: clear.`,
      settlementStatus: readString(summary.settlement_status) ?? "clear",
      settlementSummary: readString(summary.settlement_summary) ?? `${counterpartyLabel}: clear.`,
      settledThisTurn: readBoolean(summary.settled_this_turn)
    });
  }

  return summaries.size > 0 ? summaries : null;
}

function buildReceiptKeywords(
  counterpartyId: ObligationsCounterpartyId,
  counterpartyLabel: string
): string[] {
  return Array.from(new Set([counterpartyLabel.toLowerCase(), ...COUNTERPARTY_META[counterpartyId].keywordHints])).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function buildObligationsCounterpartyContract(args: {
  courtDecisionBudget: CourtDecisionBudgetSurface | null;
  previewState: RunState;
}): ObligationsCounterpartyContract | null {
  const { courtDecisionBudget, previewState } = args;
  const summaries = parseSummaryByCounterparty(previewState);
  if (!summaries) return null;

  const counterpartySections = PLAY_SCREEN_OBLIGATION_COUNTERPARTY_ORDER.map((counterpartyId) => {
    const summary = summaries.get(counterpartyId);
    if (!summary) return null;

    const meta = COUNTERPARTY_META[counterpartyId];
    const gestureEntry = courtDecisionBudget?.entries.find((entry) => entry.action === gestureActionId(counterpartyId)) ?? null;

    return {
      id: counterpartyId,
      title: summary.counterpartyLabel,
      shortTitle: meta.shortTitle,
      helper: meta.helper,
      settlementStatus: summary.settlementStatus,
      receiptCategoryOrder: [...meta.receiptCategoryOrder],
      receiptKeywords: buildReceiptKeywords(counterpartyId, summary.counterpartyLabel),
      dueGroup: {
        title: meta.dueTitle,
        amount: summary.dueAmount,
        amountLabel: formatAmount(summary.dueAmount, counterpartyId),
        summary: summary.settlementSummary,
        receiptCategories: [meta.receiptCategoryOrder[0]]
      },
      penaltyGroup: {
        title: meta.penaltyTitle,
        amount: summary.arrearsAmount,
        amountLabel: formatAmount(summary.arrearsAmount, counterpartyId),
        summary: summary.arrearsAmount > 0 ? summary.settlementSummary : `${summary.counterpartyLabel}: no carried arrears.`,
        receiptCategories: [...meta.receiptCategoryOrder],
        enforcementStage: summary.enforcementStage,
        enforcementState: summary.enforcementState,
        enforcementSummary: summary.enforcementSummary,
        responseSummary: responsePressureSummary(summary),
        resolvedSummary: resolvedPressureSummary(summary),
        stageLabel: enforcementStageLabel(summary),
        carriedThisTurn: summary.carriedThisTurn,
        settledThisTurn: summary.settledThisTurn
      },
      gestureGroup: {
        actionId: gestureActionId(counterpartyId),
        title: gestureEntry?.label ?? (counterpartyId === "liege" ? "Gift to liege" : "Offering to church"),
        detail: gestureEntry?.detail ?? meta.defaultGestureDetail,
        leverSummary: gestureRelationshipSummary(counterpartyId, summary),
        cost: gestureEntry?.cost ?? null,
        spent: gestureEntry?.spent ?? null,
        availableInBudget: gestureEntry !== null,
        receiptCategories: gestureReceiptCategory(counterpartyId)
      }
    };
  }).filter((section): section is ObligationsCounterpartyContractSection => section !== null);

  if (counterpartySections.length === 0) return null;

  return {
    schemaVersion: PLAY_SCREEN_OBLIGATIONS_CONTRACT_SCHEMA_VERSION,
    receiptCategoryOrder: [...PLAY_SCREEN_OBLIGATION_RECEIPT_CATEGORY_ORDER],
    counterpartyOrder: [...PLAY_SCREEN_OBLIGATION_COUNTERPARTY_ORDER],
    counterpartySections
  };
}

export function classifyReceiptCounterpartyTags(
  line: string,
  contract: ObligationsCounterpartyContract | null
): ObligationsCounterpartyId[] {
  const normalizedLine = line.trim().toLowerCase();
  if (!normalizedLine || !contract) return [];

  const matched = new Set<ObligationsCounterpartyId>();

  for (const section of contract.counterpartySections) {
    if (section.receiptKeywords.some((keyword) => normalizedLine.includes(keyword))) {
      matched.add(section.id);
    }
  }

  if (normalizedLine.includes("arrears coin")) matched.add("liege");
  if (normalizedLine.includes("arrears bushels")) matched.add("church");

  return contract.counterpartyOrder.filter((counterpartyId) => matched.has(counterpartyId));
}

export function createObligationsModalRoute(
  origin: ObligationsModalOrigin,
  focus: ObligationsModalFocus = "overview"
): ObligationsModalRoute {
  return { origin, focus };
}

export function obligationGesturePaymentModeOptions(
  actionId: ObligationsGestureActionId
): ObligationsGesturePaymentMode[] {
  return [...OBLIGATION_GESTURE_PAYMENT_MODE_OPTIONS[actionId]];
}

export function obligationGesturePaymentModeLabel(mode: ObligationsGesturePaymentMode): string {
  if (mode === "coin") return "Coin";
  if (mode === "food_stores") return "Food stores";
  if (mode === "meat_stores") return "Meat stores";
  return "None";
}

export function readObligationGestureDecision(
  decisions: TurnDecisions,
  actionId: ObligationsGestureActionId
): ObligationsGestureDecision {
  const gesture = decisions.obligations.gestures?.[actionId];
  return {
    amount: normalizeGestureAmount(gesture?.amount),
    payment_mode: normalizedGesturePaymentMode(actionId, gesture?.payment_mode)
  };
}

export function updateObligationGestureAmount(
  decisions: TurnDecisions,
  actionId: ObligationsGestureActionId,
  amount: number
): TurnDecisions {
  const current = readObligationGestureDecision(decisions, actionId);
  const normalizedAmount = normalizeGestureAmount(amount);
  const nextPaymentMode =
    normalizedAmount > 0
      ? current.payment_mode === "none"
        ? OBLIGATION_GESTURE_DEFAULT_PAYMENT_MODES[actionId]
        : current.payment_mode
      : "none";
  return writeGestureDecision(decisions, actionId, {
    amount: normalizedAmount,
    payment_mode: nextPaymentMode
  });
}

export function updateObligationGesturePaymentMode(
  decisions: TurnDecisions,
  actionId: ObligationsGestureActionId,
  paymentMode: ObligationsGesturePaymentMode
): TurnDecisions {
  const current = readObligationGestureDecision(decisions, actionId);
  const normalizedMode = normalizedGesturePaymentMode(actionId, paymentMode);
  return writeGestureDecision(decisions, actionId, {
    amount: normalizedMode === "none" ? 0 : current.amount,
    payment_mode: normalizedMode
  });
}

export function queueDefaultObligationGesture(
  decisions: TurnDecisions,
  actionId: ObligationsGestureActionId
): TurnDecisions {
  const current = readObligationGestureDecision(decisions, actionId);
  return writeGestureDecision(decisions, actionId, {
    amount: current.amount > 0 ? current.amount : 1,
    payment_mode:
      current.payment_mode === "none" ? OBLIGATION_GESTURE_DEFAULT_PAYMENT_MODES[actionId] : current.payment_mode
  });
}

export function clearObligationGestureDecision(
  decisions: TurnDecisions,
  actionId: ObligationsGestureActionId
): TurnDecisions {
  return writeGestureDecision(decisions, actionId, defaultGestureDecision(actionId));
}

export function selectObligationsCounterpartySections(
  contract: ObligationsCounterpartyContract | null,
  focus: ObligationsModalFocus
): ObligationsCounterpartyContractSection[] {
  if (!contract) return [];
  if (focus === "overview") return contract.counterpartySections;
  return contract.counterpartySections.filter((section) => section.id === focus);
}

export function obligationsModalTitle(focus: ObligationsModalFocus): string {
  if (focus === "liege") return "Liege obligations";
  if (focus === "church") return "Church obligations";
  return "Obligations & counterparties";
}

export function obligationsModalSubtitle(origin: ObligationsModalOrigin, focus: ObligationsModalFocus): string {
  const routeHint =
    origin === "decisions"
      ? "Use the payment controls just below to respond after you review the already-resolved stage state."
      : "Jump to Decisions below when you are ready to respond with coin, bushels, or court attention.";

  if (focus === "liege") {
    return `Track tax due, coin arrears, and the current liege pressure stage in one place. ${routeHint}`;
  }
  if (focus === "church") {
    return `Track tithe due, bushel arrears, and the current church pressure stage in one place. ${routeHint}`;
  }
  return `Compare liege and church pressure side by side, including any carried arrears stage, before you set the next turn's response. ${routeHint}`;
}
