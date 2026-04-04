import type { StickyResourceChip } from "./playScreenLayout";
import type { LedgerItem, SourceTag } from "./playScreenModel";
import type { PhaseNameV0, PhaseReceiptKindV0, PhaseResultV0 } from "../sim/types";
import {
  classifyReceiptCounterpartyTags,
  type ObligationsCounterpartyContract,
  type ObligationsCounterpartyId
} from "./playScreenObligations";

export type ReceiptViewerMode = "grouped" | "raw";
export type ReceiptViewerFocus = "overview" | StickyResourceChip["id"];
type ReceiptFocusTag = Exclude<ReceiptViewerFocus, "overview">;
export type ReceiptCounterpartyTag = ObligationsCounterpartyId;

export type ReceiptViewerRoute = {
  focus: ReceiptViewerFocus;
  mode: ReceiptViewerMode;
  origin: "diff_ledger" | "food_chip" | "coin_chip" | "unrest_chip";
};

export type ReceiptHighlight = {
  id: string;
  primary: string;
  source: SourceTag;
  why: string;
};

export type GroupedReceiptSection = {
  id: ReceiptViewerFocus;
  title: string;
  helper: string;
  highlights: ReceiptHighlight[];
  receipts: ReceiptLine[];
};

export type ReceiptLine = {
  counterpartyTags: ReceiptCounterpartyTag[];
  id: string;
  kind: PhaseReceiptKindV0;
  line: string;
  phase: PhaseNameV0;
  phaseLabel: string;
  tags: ReceiptFocusTag[];
};

export type CounterpartyReceiptSection = {
  dueSummary: string;
  gestureCost: number | null;
  gestureDetail: string;
  gestureLabel: string;
  gestureSpent: number | null;
  helper: string;
  id: ReceiptCounterpartyTag;
  penaltySummary: string;
  receiptCategoryOrder: ReceiptFocusTag[];
  receipts: ReceiptLine[];
  title: string;
};

export type RawReceiptPhase = {
  phase: PhaseNameV0;
  label: string;
  receipts: ReceiptLine[];
};

export type ReceiptViewerData = {
  counterpartySections: CounterpartyReceiptSection[];
  groupedSections: GroupedReceiptSection[];
  rawPhases: RawReceiptPhase[];
};

const PHASE_LABELS: Record<PhaseNameV0, string> = {
  consumption: "Consumption",
  construction: "Construction",
  demography: "Demography",
  events: "Events",
  labor: "Labor",
  marriage: "Marriage",
  obligations: "Obligations",
  prospects: "Prospects",
  sell: "Market",
  succession: "Succession"
};

const GROUPED_SECTION_META: Record<ReceiptViewerFocus, { title: string; helper: string }> = {
  overview: {
    title: "All changes",
    helper: "Headline shifts stay grouped here so the diff ledger summary and the deeper receipt trail stay in one place."
  },
  food: {
    title: "Food & stores",
    helper: "Harvest, spoilage, consumption, and tithe pressure stay grouped together here."
  },
  coin: {
    title: "Coin & dues",
    helper: "Coin movement, market context, and obligation pressure stay grouped together here."
  },
  unrest: {
    title: "Unrest & stability",
    helper: "Stability pressure stays grouped here so rising risk has one obvious explanation surface."
  }
};

const FOCUS_SUBTITLES: Record<ReceiptViewerFocus, string> = {
  overview: "Grouped mode keeps the headline story first. Raw mode preserves the exact phase receipt trail underneath it.",
  food: "Food details keep the resource chip aligned with the receipt trail behind harvest, stores, and dues.",
  coin: "Coin details keep the resource chip aligned with the receipt trail behind market context and obligations.",
  unrest: "Unrest details keep stability pressure and its supporting receipt trail in one focused surface."
};

const RECEIPT_KEYWORDS: Record<ReceiptFocusTag, string[]> = {
  food: ["bushel", "bushels", "tithe", "spoilage", "production", "consumption", "weather", "harvest", "stores"],
  coin: ["coin", "coins", "tax", "market", "price", "sell cap", "dowry", "grant"],
  unrest: ["unrest", "arrears", "festival", "stability", "riot", "rebellion", "pressure"]
};

function classifyReceiptTags(phase: PhaseNameV0, line: string): ReceiptFocusTag[] {
  const lower = line.toLowerCase();
  const tags = new Set<ReceiptFocusTag>();

  if (phase === "consumption") tags.add("food");
  if (phase === "events") tags.add("unrest");

  for (const [tag, keywords] of Object.entries(RECEIPT_KEYWORDS) as Array<[ReceiptFocusTag, string[]]>) {
    if (keywords.some((keyword) => lower.includes(keyword))) tags.add(tag);
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

function normalizeReceiptLine(
  phase: PhaseNameV0,
  receipt: { kind: PhaseReceiptKindV0; line: string },
  index: number,
  obligationsContract: ObligationsCounterpartyContract | null
): ReceiptLine | null {
  const line = typeof receipt.line === "string" ? receipt.line.trim() : "";
  if (!line) return null;

  return {
    counterpartyTags: classifyReceiptCounterpartyTags(line, obligationsContract),
    id: `${phase}_${String(index).padStart(2, "0")}`,
    kind: receipt.kind,
    line,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    tags: classifyReceiptTags(phase, line)
  };
}

function highlightForMetric(diffLedgerItems: LedgerItem[], metric: ReceiptFocusTag): ReceiptHighlight[] {
  const item = diffLedgerItems.find((candidate) => candidate.id === metric);
  if (!item) return [];
  return [{ id: item.id, primary: item.primary, source: item.source, why: item.why }];
}

export function buildReceiptViewerData(args: {
  diffLedgerItems: LedgerItem[];
  obligationsContract?: ObligationsCounterpartyContract | null;
  phaseResults: PhaseResultV0[] | null | undefined;
}): ReceiptViewerData {
  const { diffLedgerItems, obligationsContract = null, phaseResults } = args;
  const rawPhases: RawReceiptPhase[] = [];

  for (const phaseResult of Array.isArray(phaseResults) ? phaseResults : []) {
    const receipts = Array.isArray(phaseResult?.receipts)
      ? phaseResult.receipts
          .map((receipt, index) => normalizeReceiptLine(phaseResult.phase, receipt, index, obligationsContract))
          .filter((receipt): receipt is ReceiptLine => receipt !== null)
      : [];
    if (receipts.length === 0) continue;
    rawPhases.push({
      phase: phaseResult.phase,
      label: PHASE_LABELS[phaseResult.phase],
      receipts
    });
  }

  const groupedSections: GroupedReceiptSection[] = [
    {
      id: "overview",
      ...GROUPED_SECTION_META.overview,
      highlights: diffLedgerItems.map((item) => ({
        id: item.id,
        primary: item.primary,
        source: item.source,
        why: item.why
      })),
      receipts: []
    },
    {
      id: "food",
      ...GROUPED_SECTION_META.food,
      highlights: highlightForMetric(diffLedgerItems, "food"),
      receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.tags.includes("food")))
    },
    {
      id: "coin",
      ...GROUPED_SECTION_META.coin,
      highlights: highlightForMetric(diffLedgerItems, "coin"),
      receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.tags.includes("coin")))
    },
    {
      id: "unrest",
      ...GROUPED_SECTION_META.unrest,
      highlights: highlightForMetric(diffLedgerItems, "unrest"),
      receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.tags.includes("unrest")))
    }
  ];

  const counterpartySections: CounterpartyReceiptSection[] = obligationsContract
    ? obligationsContract.counterpartySections.map((section) => ({
        id: section.id,
        title: section.title,
        helper: section.helper,
        dueSummary: section.dueGroup.summary,
        penaltySummary: section.penaltyGroup.enforcementSummary,
        gestureLabel: section.gestureGroup.title,
        gestureDetail: section.gestureGroup.detail,
        gestureCost: section.gestureGroup.cost,
        gestureSpent: section.gestureGroup.spent,
        receiptCategoryOrder: [...section.receiptCategoryOrder],
        receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.counterpartyTags.includes(section.id)))
      }))
    : [];

  return { counterpartySections, groupedSections, rawPhases };
}

export function createExplainChangesRoute(): ReceiptViewerRoute {
  return {
    focus: "overview",
    mode: "grouped",
    origin: "diff_ledger"
  };
}

export function createResourceChipRoute(chipId: StickyResourceChip["id"]): ReceiptViewerRoute {
  return {
    focus: chipId,
    mode: "grouped",
    origin: `${chipId}_chip`
  };
}

export function selectGroupedReceiptSections(
  groupedSections: GroupedReceiptSection[],
  focus: ReceiptViewerFocus
): GroupedReceiptSection[] {
  if (focus === "overview") return groupedSections;
  return groupedSections.filter((section) => section.id === focus);
}

export function selectRawReceiptPhases(rawPhases: RawReceiptPhase[], focus: ReceiptViewerFocus): RawReceiptPhase[] {
  if (focus === "overview") return rawPhases;

  return rawPhases
    .map((phase) => ({
      ...phase,
      receipts: phase.receipts.filter((receipt) => receipt.tags.includes(focus))
    }))
    .filter((phase) => phase.receipts.length > 0);
}

export function receiptViewerTitle(focus: ReceiptViewerFocus): string {
  if (focus === "overview") return "Explain changes";
  return GROUPED_SECTION_META[focus].title;
}

export function receiptViewerSubtitle(focus: ReceiptViewerFocus): string {
  return FOCUS_SUBTITLES[focus];
}
