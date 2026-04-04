import type { RunState } from "../sim/types";
import type { CourtDecisionBudgetSurface } from "./playScreenCourtBudget";

export const PLAY_SCREEN_OBLIGATIONS_CONTRACT_SCHEMA_VERSION = "play_screen_obligations_contract_v1" as const;
export const PLAY_SCREEN_OBLIGATION_COUNTERPARTY_ORDER = ["liege", "church"] as const;
export const PLAY_SCREEN_OBLIGATION_RECEIPT_CATEGORY_ORDER = ["coin", "food", "unrest"] as const;

export type ObligationsCounterpartyId = (typeof PLAY_SCREEN_OBLIGATION_COUNTERPARTY_ORDER)[number];
export type ObligationReceiptCategory = (typeof PLAY_SCREEN_OBLIGATION_RECEIPT_CATEGORY_ORDER)[number];

export type ObligationsContractGroup = {
  amount: number;
  amountLabel: string;
  receiptCategories: ObligationReceiptCategory[];
  summary: string;
  title: string;
};

export type ObligationsContractPenaltyGroup = ObligationsContractGroup & {
  carriedThisTurn: boolean;
  enforcementState: "clear" | "arrears";
  enforcementSummary: string;
  settledThisTurn: boolean;
};

export type ObligationsContractGestureGroup = {
  actionId: "gift_liege" | "offering_church";
  availableInBudget: boolean;
  cost: number | null;
  detail: string;
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
  enforcementState: "clear" | "arrears";
  enforcementSummary: string;
  settlementStatus: string;
  settlementSummary: string;
  settledThisTurn: boolean;
};

const COUNTERPARTY_META: Record<
  ObligationsCounterpartyId,
  {
    defaultGestureDetail: string;
    dueTitle: string;
    fallbackTitle: string;
    helper: string;
    keywordHints: string[];
    penaltyTitle: string;
    receiptCategoryOrder: ObligationReceiptCategory[];
    shortTitle: string;
  }
> = {
  liege: {
    defaultGestureDetail: "Court favor spent on noble gifts.",
    dueTitle: "Tax due",
    fallbackTitle: "House Liege",
    helper: "Keeps liege dues, arrears pressure, and gift language aligned with coin-first receipts.",
    keywordHints: ["liege", "tax", "gift", "coin arrears", "tax due", "liege tax"],
    penaltyTitle: "Arrears & liege pressure",
    receiptCategoryOrder: ["coin", "unrest"],
    shortTitle: "Liege"
  },
  church: {
    defaultGestureDetail: "Court effort spent on religious offerings.",
    dueTitle: "Tithe due",
    fallbackTitle: "Parish Church",
    helper: "Keeps church dues, arrears pressure, and offering language aligned with food-first receipts.",
    keywordHints: ["church", "tithe", "offering", "bushels arrears", "tithe due", "church tithe"],
    penaltyTitle: "Arrears & church pressure",
    receiptCategoryOrder: ["food", "unrest"],
    shortTitle: "Church"
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

function formatAmount(amount: number, counterpartyId: ObligationsCounterpartyId): string {
  if (counterpartyId === "liege") return `${amount} coin`;
  return `${amount} ${amount === 1 ? "bushel" : "bushels"}`;
}

function gestureActionId(counterpartyId: ObligationsCounterpartyId): "gift_liege" | "offering_church" {
  return counterpartyId === "liege" ? "gift_liege" : "offering_church";
}

function gestureReceiptCategory(counterpartyId: ObligationsCounterpartyId): ObligationReceiptCategory[] {
  return counterpartyId === "liege" ? ["coin"] : ["food"];
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
        enforcementState: summary.enforcementState,
        enforcementSummary: summary.enforcementSummary,
        carriedThisTurn: summary.carriedThisTurn,
        settledThisTurn: summary.settledThisTurn
      },
      gestureGroup: {
        actionId: gestureActionId(counterpartyId),
        title: gestureEntry?.label ?? (counterpartyId === "liege" ? "Gift to liege" : "Offering to church"),
        detail: gestureEntry?.detail ?? meta.defaultGestureDetail,
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
