import type { StickyResourceChip } from "./playScreenLayout";
import type { LedgerItem, SourceTag } from "./playScreenModel";
import type { PhaseNameV0, PhaseReceiptKindV0, PhaseResultV0, TurnExplanationV1 } from "../sim/types";
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
  walkdownRows: Array<{ amountLabel: string; id: string; label: string; summary: string }>;
  receipts: ReceiptLine[];
};

export type ReceiptLine = {
  counterpartyTags: ReceiptCounterpartyTag[];
  id: string;
  kind: PhaseReceiptKindV0;
  line: string;
  phase: PhaseNameV0;
  phaseLabel: string;
  structured?: {
    asset: string;
    category: string;
    counterpartyLabel: string;
    delta: number;
    receiptId: string;
    ruleLabel: string;
    summary: string;
  };
  tags: ReceiptFocusTag[];
};

export type CounterpartyReceiptSection = {
  dueSummary: string;
  gestureCost: number | null;
  gestureDetail: string;
  gestureLabel: string;
  gestureSummary: string;
  gestureSpent: number | null;
  helper: string;
  id: ReceiptCounterpartyTag;
  penaltySummary: string;
  receiptCategoryOrder: ReceiptFocusTag[];
  resolvedSummary: string;
  responseSummary: string;
  receipts: ReceiptLine[];
  stageLabel: string;
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
  overview: "Drilldown keeps counterparties and relationship levers first, then the resource story beneath them. Phase record keeps the exact per-phase receipt trail underneath it.",
  food: "Food details keep the resource chip aligned with the receipt trail behind harvest, stores, and dues.",
  coin: "Coin details keep the resource chip aligned with the receipt trail behind market context and obligations.",
  unrest: "Unrest details keep stability pressure and its supporting receipt trail in one focused surface."
};

const RECEIPT_KEYWORDS: Record<ReceiptFocusTag, string[]> = {
  food: ["bushel", "bushels", "tithe", "spoilage", "production", "consumption", "weather", "harvest", "stores"],
  coin: ["coin", "coins", "tax", "market", "price", "sell cap", "dowry", "grant"],
  unrest: ["unrest", "arrears", "festival", "stability", "riot", "rebellion", "pressure"]
};
const STRUCTURED_RECEIPT_ASSET_TAGS: Partial<Record<string, ReceiptFocusTag[]>> = {
  arrears_bushels: ["food", "unrest"],
  arrears_coin: ["coin", "unrest"],
  coin: ["coin"],
  food_stores: ["food"],
  meat_stores: ["food"],
  tax_due_coin: ["coin"],
  tithe_due_bushels: ["food"]
};

type FiscalReceiptRow = NonNullable<PhaseResultV0["fiscal_receipts_v1"]>[number];

function classifyReceiptTags(phase: PhaseNameV0, line: string, asset?: string): ReceiptFocusTag[] {
  const lower = line.toLowerCase();
  const tags = new Set<ReceiptFocusTag>();

  if (phase === "consumption") tags.add("food");
  if (phase === "events") tags.add("unrest");

  for (const assetTag of STRUCTURED_RECEIPT_ASSET_TAGS[asset ?? ""] ?? []) {
    tags.add(assetTag);
  }

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

function formatReceiptDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function buildStructuredReceiptLine(receipt: FiscalReceiptRow): string {
  const summary = typeof receipt.summary === "string" ? receipt.summary.trim() : "";
  if (summary) return summary;

  const ruleLabel = typeof receipt.rule_id === "string" ? receipt.rule_id.trim() : "";
  if (ruleLabel) return ruleLabel;

  const category = typeof receipt.category === "string" ? receipt.category.trim() : "receipt";
  const asset = typeof receipt.asset === "string" ? receipt.asset.trim() : "asset";
  const counterpartyLabel = typeof receipt.counterparty_label === "string" ? receipt.counterparty_label.trim() : "";
  const delta = typeof receipt.delta === "number" && Number.isFinite(receipt.delta) ? formatReceiptDelta(Math.trunc(receipt.delta)) : "0";

  return [counterpartyLabel, `${category} · ${asset} ${delta}`].filter((part) => part.length > 0).join(" — ");
}

function normalizeStructuredReceiptLine(
  phase: PhaseNameV0,
  receipt: FiscalReceiptRow,
  index: number,
  obligationsContract: ObligationsCounterpartyContract | null
): ReceiptLine | null {
  const receiptId = typeof receipt.receipt_id === "string" && receipt.receipt_id.trim().length > 0
    ? receipt.receipt_id.trim()
    : `${phase}_fiscal_${String(index).padStart(2, "0")}`;
  const category = typeof receipt.category === "string" ? receipt.category.trim() : "";
  const asset = typeof receipt.asset === "string" ? receipt.asset.trim() : "";
  const counterpartyLabel = typeof receipt.counterparty_label === "string" ? receipt.counterparty_label.trim() : "";
  const summary = typeof receipt.summary === "string" ? receipt.summary.trim() : "";
  const ruleLabel = typeof receipt.rule_id === "string" ? receipt.rule_id.trim() : "";
  const delta = typeof receipt.delta === "number" && Number.isFinite(receipt.delta) ? Math.trunc(receipt.delta) : 0;
  const line = buildStructuredReceiptLine(receipt);
  if (!line) return null;

  const searchText = [line, counterpartyLabel, category, asset, ruleLabel].filter((value) => value.length > 0).join(" ");

  return {
    counterpartyTags: classifyReceiptCounterpartyTags(searchText, obligationsContract),
    id: receiptId,
    kind: "summary",
    line,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    structured: {
      asset,
      category,
      counterpartyLabel,
      delta,
      receiptId,
      ruleLabel,
      summary
    },
    tags: classifyReceiptTags(phase, searchText, asset)
  };
}

function highlightForMetric(diffLedgerItems: LedgerItem[], metric: ReceiptFocusTag): ReceiptHighlight[] {
  const item = diffLedgerItems.find((candidate) => candidate.id === metric);
  if (!item) return [];
  return [{ id: item.id, primary: item.primary, source: item.source, why: item.why }];
}

function formatWalkdownAmount(metric: ReceiptFocusTag, direction: string, amount: number): string {
  if (direction === "start" || direction === "ending" || direction === "net") {
    if (metric === "unrest") return `${amount}`;
    return metric === "coin" ? `${amount} coin` : `${amount} bushels`;
  }
  const signed = direction === "outflow" ? `-${amount}` : `+${amount}`;
  if (metric === "unrest") return signed;
  return metric === "coin" ? `${signed} coin` : `${signed} bushels`;
}

function walkdownRowsForMetric(turnExplanation: TurnExplanationV1 | null | undefined, metric: ReceiptFocusTag) {
  const walkdown =
    metric === "food"
      ? turnExplanation?.food_walkdown
      : metric === "coin"
        ? turnExplanation?.coin_walkdown
        : metric === "unrest"
          ? turnExplanation?.unrest_walkdown
          : null;
  if (!walkdown || !Array.isArray(walkdown.rows)) return [];
  return walkdown.rows.map((row) => ({
    id: row.id,
    label: row.label,
    amountLabel: formatWalkdownAmount(metric, row.direction, row.amount),
    summary: row.summary
  }));
}

export function buildReceiptViewerData(args: {
  diffLedgerItems: LedgerItem[];
  obligationsContract?: ObligationsCounterpartyContract | null;
  phaseResults: PhaseResultV0[] | null | undefined;
  turnExplanation?: TurnExplanationV1 | null;
}): ReceiptViewerData {
  const { diffLedgerItems, obligationsContract = null, phaseResults, turnExplanation = null } = args;
  const rawPhases: RawReceiptPhase[] = [];

  for (const phaseResult of Array.isArray(phaseResults) ? phaseResults : []) {
    const structuredReceipts = Array.isArray(phaseResult?.fiscal_receipts_v1)
      ? phaseResult.fiscal_receipts_v1
          .map((receipt, index) => normalizeStructuredReceiptLine(phaseResult.phase, receipt, index, obligationsContract))
          .filter((receipt): receipt is ReceiptLine => receipt !== null)
      : [];
    const legacyReceipts = Array.isArray(phaseResult?.receipts)
      ? phaseResult.receipts
          .map((receipt, index) => normalizeReceiptLine(phaseResult.phase, receipt, index, obligationsContract))
          .filter((receipt): receipt is ReceiptLine => receipt !== null)
      : [];
    const receipts = structuredReceipts.length > 0 ? structuredReceipts : legacyReceipts;
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
      walkdownRows: [],
      receipts: []
    },
    {
      id: "food",
      ...GROUPED_SECTION_META.food,
      highlights: highlightForMetric(diffLedgerItems, "food"),
      walkdownRows: walkdownRowsForMetric(turnExplanation, "food"),
      receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.tags.includes("food")))
    },
    {
      id: "coin",
      ...GROUPED_SECTION_META.coin,
      highlights: highlightForMetric(diffLedgerItems, "coin"),
      walkdownRows: walkdownRowsForMetric(turnExplanation, "coin"),
      receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.tags.includes("coin")))
    },
    {
      id: "unrest",
      ...GROUPED_SECTION_META.unrest,
      highlights: highlightForMetric(diffLedgerItems, "unrest"),
      walkdownRows: walkdownRowsForMetric(turnExplanation, "unrest"),
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
        gestureSummary: section.gestureGroup.leverSummary,
        gestureCost: section.gestureGroup.cost,
        gestureSpent: section.gestureGroup.spent,
        receiptCategoryOrder: [...section.receiptCategoryOrder],
        resolvedSummary: section.penaltyGroup.resolvedSummary,
        responseSummary: section.penaltyGroup.responseSummary,
        receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.counterpartyTags.includes(section.id))),
        stageLabel: section.penaltyGroup.stageLabel
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

export function selectCounterpartyReceiptSections(
  counterpartySections: CounterpartyReceiptSection[],
  focus: ReceiptViewerFocus
): CounterpartyReceiptSection[] {
  if (focus === "overview") return counterpartySections;
  return counterpartySections.filter((section) => section.receiptCategoryOrder.includes(focus));
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
