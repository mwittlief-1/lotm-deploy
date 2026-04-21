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

export type ObligationsContractPaymentModes = {
  acceptedLabels: string[];
  preferredLabel: string;
  supportedLabels: string[];
};

export type ObligationsContractStageRow = {
  boundaryLabel: string;
  detail: string;
  id: "stage_1" | "stage_2" | "stage_3";
  statusLabel: string;
  title: string;
};

export type ObligationsContractReceiptRow = {
  assetLabel: string;
  balanceAfterLabel: string;
  category: string;
  deltaLabel: string;
  id: string;
  ruleLabel: string;
  summary: string;
};

export type ObligationsContractReceiptGroup = {
  categoryOrder: string[];
  id: "payment" | "penalty" | "seizure";
  label: string;
  receiptCount: number;
  rows: ObligationsContractReceiptRow[];
};

export type ObligationsContractTangibleBitePreview = {
  categoryLabel: string;
  paymentModeLabel: string;
  previewAmountLabel: string;
  summary: string;
  turnCapLabel: string;
};

export type ObligationsContractTerminalRisk = {
  boundaryLabel: string;
  statusLabel: string;
  summary: string;
};

export type ObligationsContractDetailFact = {
  detail: string;
  label: string;
  value: string;
};

export type ObligationsCounterpartyContractSection = {
  consequenceFacts: ObligationsContractDetailFact[];
  detailFacts: ObligationsContractDetailFact[];
  dueGroup: ObligationsContractGroup;
  gestureGroup: ObligationsContractGestureGroup;
  helper: string;
  id: ObligationsCounterpartyId;
  paymentModes: ObligationsContractPaymentModes;
  penaltyGroup: ObligationsContractPenaltyGroup;
  receiptGroups: ObligationsContractReceiptGroup[];
  receiptCategoryOrder: ObligationReceiptCategory[];
  receiptKeywords: string[];
  settlementStatus: string;
  stageRows: ObligationsContractStageRow[];
  shortTitle: string;
  tangibleBitePreview: ObligationsContractTangibleBitePreview | null;
  terminalRisk: ObligationsContractTerminalRisk;
  title: string;
};

export type ObligationsCounterpartyContract = {
  counterpartyOrder: ObligationsCounterpartyId[];
  counterpartySections: ObligationsCounterpartyContractSection[];
  receiptCategoryOrder: ObligationReceiptCategory[];
  schemaVersion: typeof PLAY_SCREEN_OBLIGATIONS_CONTRACT_SCHEMA_VERSION;
};

type ParsedObligationsViewSummary = {
  acceptedPaymentModes: string[];
  arrearsAmount: number;
  carriedThisTurn: boolean;
  collectorState: "active" | "successor" | "vacant";
  collectorSuccessorLabel: string | null;
  collectorSummary: string | null;
  counterpartyKind: ObligationsCounterpartyId;
  counterpartyLabel: string;
  dueAmount: number;
  enforcementStage: number | null;
  enforcementState: "clear" | "arrears";
  enforcementSummary: string;
  nextStageTrigger: Record<string, unknown> | null;
  preferredPaymentMode: string | null;
  receiptGroups: Record<string, unknown>[];
  settlementStatus: string;
  settlementSummary: string;
  settledThisTurn: boolean;
  supportedPaymentModes: string[];
  tangibleBitePreview: Record<string, unknown> | null;
  terminalRisk: Record<string, unknown> | null;
  totalOutstanding: number;
  relationshipDelta: {
    respect: number;
    threat: number;
  };
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

function formatToken(value: string | null | undefined): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "Unknown";
  return token
    .split(/[._]/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readStringArray(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of values) {
    const item = readString(entry);
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }

  return result;
}

function readStage(value: unknown): number | null {
  const parsed = readNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function formatAmount(amount: number, counterpartyId: ObligationsCounterpartyId): string {
  if (counterpartyId === "liege") return `${amount} coin`;
  return `${amount} ${amount === 1 ? "bushel" : "bushels"}`;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
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

function receiptGroupRows(summary: ParsedObligationsViewSummary): ObligationsContractReceiptGroup[] {
  return summary.receiptGroups
    .map((group) => {
      const groupRecord = asRecord(group);
      const id = readString(groupRecord?.group_kind);
      if (id !== "payment" && id !== "penalty" && id !== "seizure") return null;

      const rawRows = Array.isArray(groupRecord?.receipts) ? groupRecord.receipts : [];
      const rows = rawRows
        .map((row) => {
          const rowRecord = asRecord(row);
          if (!rowRecord) return null;
          const receiptId = readString(rowRecord.receipt_id);
          if (!receiptId) return null;
          const delta = readNumber(rowRecord.delta) ?? 0;
          const balanceAfter = readNumber(rowRecord.balance_after) ?? 0;

          return {
            assetLabel: formatToken(readString(rowRecord.asset)),
            balanceAfterLabel: String(balanceAfter),
            category: readString(rowRecord.category) ?? "receipt",
            deltaLabel: delta > 0 ? `+${delta}` : `${delta}`,
            id: receiptId,
            ruleLabel: readString(rowRecord.rule_id) ?? "Unavailable",
            summary: readString(rowRecord.summary) ?? receiptId
          };
        })
        .filter((row): row is ObligationsContractReceiptRow => row !== null);

      return {
        categoryOrder: readStringArray(groupRecord?.category_order),
        id,
        label: readString(groupRecord?.label) ?? formatToken(id),
        receiptCount: readNumber(groupRecord?.receipt_count) ?? rows.length,
        rows
      };
    })
    .filter((group): group is ObligationsContractReceiptGroup => group !== null);
}

function paidThisTurnAmount(summary: ParsedObligationsViewSummary): number {
  let total = 0;
  for (const group of summary.receiptGroups) {
    const groupRecord = asRecord(group);
    if (readString(groupRecord?.group_kind) !== "payment") continue;
    const receipts = Array.isArray(groupRecord?.receipts) ? groupRecord.receipts : [];
    for (const receipt of receipts) {
      const receiptRecord = asRecord(receipt);
      const delta = readNumber(receiptRecord?.delta) ?? 0;
      if (delta < 0) total += Math.abs(delta);
    }
  }
  return total;
}

function paymentModes(summary: ParsedObligationsViewSummary): ObligationsContractPaymentModes {
  return {
    acceptedLabels: summary.acceptedPaymentModes.map((mode) => obligationGesturePaymentModeLabel(mode as ObligationsGesturePaymentMode)),
    preferredLabel: obligationGesturePaymentModeLabel((summary.preferredPaymentMode ?? "none") as ObligationsGesturePaymentMode),
    supportedLabels: summary.supportedPaymentModes.map((mode) => obligationGesturePaymentModeLabel(mode as ObligationsGesturePaymentMode))
  };
}

function collectorStatusFact(summary: ParsedObligationsViewSummary): ObligationsContractDetailFact {
  if (summary.collectorState === "successor") {
    return {
      label: "Collector",
      value: `Successor: ${summary.collectorSuccessorLabel ?? summary.counterpartyLabel}`,
      detail: summary.collectorSummary ?? "Dues have rebased to the current successor collector."
    };
  }
  if (summary.collectorState === "vacant") {
    return {
      label: "Collector",
      value: summary.collectorSuccessorLabel ? `Vacant: ${summary.collectorSuccessorLabel}` : "Vacant",
      detail: summary.collectorSummary ?? "No living collector is active; dues remain with the institution until succession is resolved."
    };
  }
  return {
    label: "Collector",
    value: `Active: ${summary.counterpartyLabel}`,
    detail: summary.collectorSummary ?? "This is the active collector used by the obligations contract."
  };
}

function detailFacts(summary: ParsedObligationsViewSummary): ObligationsContractDetailFact[] {
  return [
    collectorStatusFact(summary),
    {
      label: "Current due",
      value: formatAmount(summary.dueAmount, summary.counterpartyKind),
      detail: summary.dueAmount > 0 ? summary.settlementSummary : "No current due remains in the v2 obligations snapshot."
    },
    {
      label: "Arrears carried in",
      value: formatAmount(summary.arrearsAmount, summary.counterpartyKind),
      detail: summary.carriedThisTurn
        ? "Arrears carried in this resolved turn and are visible in the penalty trail."
        : "No arrears carry was recorded for this counterparty this turn."
    },
    {
      label: "Paid this turn",
      value: formatAmount(paidThisTurnAmount(summary), summary.counterpartyKind),
      detail: "Summed from this counterparty's v2 payment receipt group."
    },
    {
      label: "Unpaid carried out",
      value: formatAmount(summary.totalOutstanding, summary.counterpartyKind),
      detail: "Current due plus arrears still open in the v2 obligations snapshot."
    }
  ];
}

function consequenceFacts(summary: ParsedObligationsViewSummary): ObligationsContractDetailFact[] {
  const facts: ObligationsContractDetailFact[] = [
    {
      label: "Enforcement consequence",
      value: enforcementStageLabel(summary),
      detail: summary.enforcementSummary
    },
    {
      label: "Relationship pressure",
      value: `Respect ${formatSigned(summary.relationshipDelta.respect)}, threat ${formatSigned(summary.relationshipDelta.threat)}`,
      detail:
        summary.relationshipDelta.respect !== 0 || summary.relationshipDelta.threat !== 0
          ? "Relationship deltas are sourced from the v2 obligation penalty summary."
          : "No relationship pressure was recorded for this counterparty."
    },
    {
      label: "Terminal risk",
      value: terminalRisk(summary).statusLabel,
      detail: terminalRisk(summary).summary
    }
  ];

  if (summary.collectorState !== "active") {
    facts.push({
      label: "Succession or vacancy",
      value: summary.collectorState === "successor" ? "Successor collector" : "Vacancy",
      detail: summary.collectorSummary ?? "Collector state is sourced from the accepted obligations view."
    });
  }

  return facts;
}

function stageRows(summary: ParsedObligationsViewSummary): ObligationsContractStageRow[] {
  const trigger = summary.nextStageTrigger;
  const triggerStage = readStage(trigger?.next_stage);
  const triggerSummary = readString(trigger?.summary);
  const triggerBoundary =
    triggerStage !== null
      ? `${formatToken(readString(trigger?.next_stage_label))} boundary: ${readNumber(trigger?.current_value) ?? 0}/${readNumber(trigger?.trigger_threshold) ?? 0} on ${readString(trigger?.trigger_source_path) ?? "unknown"}`
      : "No next-stage boundary recorded.";

  const terminalRisk = summary.terminalRisk;
  const terminalSummary = readString(terminalRisk?.summary) ?? "No terminal-risk summary recorded.";
  const terminalBoundary = terminalRisk
    ? `Unrest ${readNumber(terminalRisk.current_value) ?? 0}/${readNumber(terminalRisk.trigger_threshold) ?? 0}; remaining ${readNumber(terminalRisk.remaining_to_threshold) ?? 0}.`
    : "Terminal risk is not exposed in the current snapshot.";
  const terminalActive = readBoolean(terminalRisk?.active);
  const terminalArmed = readBoolean(terminalRisk?.armed);

  return [
    {
      boundaryLabel: summary.settlementSummary,
      detail: summary.enforcementSummary,
      id: "stage_1",
      statusLabel:
        summary.enforcementState === "clear" ? "Clear" : summary.enforcementStage === 1 ? "Current" : "Passed",
      title: "Stage 1 · Arrears carry"
    },
    {
      boundaryLabel: triggerBoundary,
      detail:
        readString(summary.tangibleBitePreview?.summary) ??
        (triggerStage === 2 ? triggerSummary ?? "Stage-two trigger is present." : "No stage-two trigger recorded."),
      id: "stage_2",
      statusLabel:
        summary.enforcementStage !== null && summary.enforcementStage >= 2 && !terminalActive
          ? "Current"
          : triggerStage === 2
            ? readBoolean(trigger?.armed)
              ? "Armed"
              : "Dormant"
            : "Dormant",
      title: "Stage 2 · Tangible bite"
    },
    {
      boundaryLabel: terminalBoundary,
      detail: terminalActive ? terminalSummary : triggerStage === 3 ? triggerSummary ?? terminalSummary : terminalSummary,
      id: "stage_3",
      statusLabel: terminalActive ? "Active" : terminalArmed ? "Armed" : "Dormant",
      title: "Stage 3 · Dispossession danger"
    }
  ];
}

function tangibleBitePreview(summary: ParsedObligationsViewSummary): ObligationsContractTangibleBitePreview | null {
  const preview = summary.tangibleBitePreview;
  if (!preview) return null;

  return {
    categoryLabel: formatToken(readString(preview.category)),
    paymentModeLabel: obligationGesturePaymentModeLabel((readString(preview.payment_mode) ?? "none") as ObligationsGesturePaymentMode),
    previewAmountLabel: String(readNumber(preview.preview_amount) ?? 0),
    summary: readString(preview.summary) ?? "No tangible-bite preview summary recorded.",
    turnCapLabel:
      readNumber(preview.turn_cap_amount) === null
        ? "No per-turn cap"
        : `${readNumber(preview.turn_cap_amount)} via ${readString(preview.turn_cap_tuning_key) ?? "cap"}`
  };
}

function terminalRisk(summary: ParsedObligationsViewSummary): ObligationsContractTerminalRisk {
  const risk = summary.terminalRisk;
  const active = readBoolean(risk?.active);
  const armed = readBoolean(risk?.armed);

  return {
    boundaryLabel: risk
      ? `Boundary ${readNumber(risk.current_value) ?? 0}/${readNumber(risk.trigger_threshold) ?? 0} on ${readString(risk.trigger_source_path) ?? "unknown"}`
      : "No terminal-risk boundary recorded.",
    statusLabel: active ? "Active" : armed ? "Armed" : "Dormant",
    summary: readString(risk?.summary) ?? "No terminal-risk summary recorded."
  };
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
      acceptedPaymentModes: readStringArray(summary.accepted_payment_modes),
      arrearsAmount: readNumber(summary.arrears_amount) ?? 0,
      carriedThisTurn: readBoolean(summary.carried_this_turn),
      collectorState:
        summary.collector_state === "successor" || summary.collector_state === "vacant"
          ? summary.collector_state
          : "active",
      collectorSuccessorLabel: readString(summary.collector_successor_label),
      collectorSummary: readString(summary.collector_summary),
      counterpartyKind,
      counterpartyLabel,
      dueAmount: readNumber(summary.due_amount) ?? 0,
      enforcementStage: readStage(summary.enforcement_stage),
      enforcementState: summary.enforcement_state === "arrears" ? "arrears" : "clear",
      enforcementSummary: readString(summary.enforcement_summary) ?? `${counterpartyLabel}: clear.`,
      nextStageTrigger: asRecord(summary.next_stage_trigger),
      preferredPaymentMode: readString(summary.preferred_payment_mode),
      receiptGroups: Array.isArray(summary.receipt_groups)
        ? summary.receipt_groups
            .map((entry) => asRecord(entry))
            .filter((entry): entry is Record<string, unknown> => entry !== null)
        : [],
      settlementStatus: readString(summary.settlement_status) ?? "clear",
      settlementSummary: readString(summary.settlement_summary) ?? `${counterpartyLabel}: clear.`,
      settledThisTurn: readBoolean(summary.settled_this_turn),
      supportedPaymentModes: readStringArray(summary.supported_payment_modes),
      tangibleBitePreview: asRecord(summary.tangible_bite_preview),
      terminalRisk: asRecord(summary.terminal_risk),
      totalOutstanding: readNumber(summary.total_outstanding) ?? 0,
      relationshipDelta: {
        respect: readNumber(asRecord(summary.relationship_delta)?.respect) ?? 0,
        threat: readNumber(asRecord(summary.relationship_delta)?.threat) ?? 0
      }
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
      helper: summary.collectorState === "active" ? meta.helper : summary.collectorSummary ?? meta.helper,
      paymentModes: paymentModes(summary),
      settlementStatus: summary.settlementStatus,
      detailFacts: detailFacts(summary),
      consequenceFacts: consequenceFacts(summary),
      stageRows: stageRows(summary),
      receiptCategoryOrder: [...meta.receiptCategoryOrder],
      receiptGroups: receiptGroupRows(summary),
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
      },
      tangibleBitePreview: tangibleBitePreview(summary),
      terminalRisk: terminalRisk(summary)
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
  if (mode === "service_placeholder") return "Service placeholder";
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
