import { classifyReceiptCounterpartyTags } from "./playScreenObligations";
const PHASE_LABELS = {
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
const GROUPED_SECTION_META = {
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
const FOCUS_SUBTITLES = {
    overview: "Drilldown keeps counterparties and relationship levers first, then the resource story beneath them. Phase record keeps the exact per-phase receipt trail underneath it.",
    food: "Food details keep the resource chip aligned with the receipt trail behind harvest, stores, and dues.",
    coin: "Coin details keep the resource chip aligned with the receipt trail behind market context and obligations.",
    unrest: "Unrest details keep stability pressure and its supporting receipt trail in one focused surface."
};
const RECEIPT_KEYWORDS = {
    food: ["bushel", "bushels", "tithe", "spoilage", "production", "consumption", "weather", "harvest", "stores"],
    coin: ["coin", "coins", "tax", "market", "price", "sell cap", "dowry", "grant"],
    unrest: ["unrest", "arrears", "festival", "stability", "riot", "rebellion", "pressure"]
};
const STRUCTURED_RECEIPT_ASSET_TAGS = {
    arrears_bushels: ["food", "unrest"],
    arrears_coin: ["coin", "unrest"],
    coin: ["coin"],
    food_stores: ["food"],
    meat_stores: ["food"],
    tax_due_coin: ["coin"],
    tithe_due_bushels: ["food"]
};
function classifyReceiptTags(phase, line, asset) {
    const lower = line.toLowerCase();
    const tags = new Set();
    if (phase === "consumption")
        tags.add("food");
    if (phase === "events")
        tags.add("unrest");
    for (const assetTag of STRUCTURED_RECEIPT_ASSET_TAGS[asset ?? ""] ?? []) {
        tags.add(assetTag);
    }
    for (const [tag, keywords] of Object.entries(RECEIPT_KEYWORDS)) {
        if (keywords.some((keyword) => lower.includes(keyword)))
            tags.add(tag);
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
}
function normalizeReceiptLine(phase, receipt, index, obligationsContract) {
    const line = typeof receipt.line === "string" ? receipt.line.trim() : "";
    if (!line)
        return null;
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
function formatReceiptDelta(delta) {
    return delta > 0 ? `+${delta}` : `${delta}`;
}
function formatAuditAmount(amount, unitLabel) {
    return `${amount} ${unitLabel}`;
}
function buildStructuredReceiptLine(receipt) {
    const summary = typeof receipt.summary === "string" ? receipt.summary.trim() : "";
    if (summary)
        return summary;
    const ruleLabel = typeof receipt.rule_id === "string" ? receipt.rule_id.trim() : "";
    if (ruleLabel)
        return ruleLabel;
    const category = typeof receipt.category === "string" ? receipt.category.trim() : "receipt";
    const asset = typeof receipt.asset === "string" ? receipt.asset.trim() : "asset";
    const counterpartyLabel = typeof receipt.counterparty_label === "string" ? receipt.counterparty_label.trim() : "";
    const delta = typeof receipt.delta === "number" && Number.isFinite(receipt.delta) ? formatReceiptDelta(Math.trunc(receipt.delta)) : "0";
    return [counterpartyLabel, `${category} · ${asset} ${delta}`].filter((part) => part.length > 0).join(" — ");
}
function normalizeStructuredReceiptLine(phase, receipt, index, obligationsContract) {
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
    if (!line)
        return null;
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
function highlightForMetric(diffLedgerItems, metric) {
    const item = diffLedgerItems.find((candidate) => candidate.id === metric);
    if (!item)
        return [];
    return [{ id: item.id, primary: item.primary, source: item.source, why: item.why }];
}
function formatWalkdownAmount(metric, direction, amount) {
    if (direction === "start" || direction === "ending" || direction === "net") {
        if (metric === "unrest")
            return `${amount}`;
        return metric === "coin" ? `${amount} coin` : `${amount} bushels`;
    }
    const signed = direction === "outflow" ? `-${amount}` : `+${amount}`;
    if (metric === "unrest")
        return signed;
    return metric === "coin" ? `${signed} coin` : `${signed} bushels`;
}
function walkdownRowsForMetric(turnExplanation, metric) {
    const walkdown = metric === "food"
        ? turnExplanation?.food_walkdown
        : metric === "coin"
            ? turnExplanation?.coin_walkdown
            : metric === "unrest"
                ? turnExplanation?.unrest_walkdown
                : null;
    if (!walkdown || !Array.isArray(walkdown.rows))
        return [];
    return walkdown.rows.map((row) => ({
        id: row.id,
        label: row.label,
        amountLabel: formatWalkdownAmount(metric, row.direction, row.amount),
        summary: row.summary
    }));
}
function walkdownAmount(turnExplanation, metric, rowId) {
    const walkdown = metric === "food" ? turnExplanation?.food_walkdown : turnExplanation?.coin_walkdown;
    const row = walkdown?.rows.find((candidate) => candidate.id === rowId) ?? null;
    return row ? Math.max(0, Math.trunc(row.amount)) : null;
}
function sumStructuredReceiptOutflow(rawPhases, predicate) {
    let total = 0;
    for (const phase of rawPhases) {
        for (const receipt of phase.receipts) {
            if (!receipt.structured || !predicate(receipt))
                continue;
            if (receipt.structured.delta < 0)
                total += Math.abs(receipt.structured.delta);
        }
    }
    return total;
}
function isConsumptionReceipt(receipt, asset) {
    if (!receipt.structured)
        return false;
    const category = receipt.structured.category.toLowerCase();
    const rule = receipt.structured.ruleLabel.toLowerCase();
    return receipt.phase === "consumption" && receipt.structured.asset === asset && (category.includes("consumption") || rule.includes("consumption"));
}
function isMaintenanceReceipt(receipt) {
    if (!receipt.structured)
        return false;
    const category = receipt.structured.category.toLowerCase();
    const summary = receipt.structured.summary.toLowerCase();
    const rule = receipt.structured.ruleLabel.toLowerCase();
    return receipt.structured.asset === "coin" && (category.includes("maintenance") || summary.includes("upkeep") || rule.includes("maintenance"));
}
function auditRowsForMetric(rawPhases, turnExplanation, metric) {
    if (metric === "food") {
        const foodReceiptAmount = sumStructuredReceiptOutflow(rawPhases, (receipt) => isConsumptionReceipt(receipt, "food_stores"));
        const meatReceiptAmount = sumStructuredReceiptOutflow(rawPhases, (receipt) => isConsumptionReceipt(receipt, "meat_stores"));
        const foodWalkdownAmount = walkdownAmount(turnExplanation, "food", "food_consumption");
        if (foodReceiptAmount === 0 && meatReceiptAmount === 0 && foodWalkdownAmount === null)
            return [];
        const receiptLabel = formatAuditAmount(foodReceiptAmount, "food");
        const walkdownLabel = foodWalkdownAmount === null ? "No food walkdown row" : formatAuditAmount(foodWalkdownAmount, "food walkdown");
        const statusLabel = foodReceiptAmount > 0
            ? foodWalkdownAmount === null || foodReceiptAmount === foodWalkdownAmount
                ? "Reconciled"
                : "Needs reconciliation"
            : "Walkdown only";
        return [
            {
                detail: foodReceiptAmount === 0
                    ? "No structured food consumption receipt was recorded; this audit row is anchored to the ordered food walkdown."
                    : meatReceiptAmount > 0
                        ? `${meatReceiptAmount} meat also moved through structured consumption receipts; meat is tracked separately from the bushel walkdown.`
                        : "No structured meat consumption receipt was recorded; meat remains passive stock unless a receipt exists.",
                id: "food_consumption_audit",
                label: "Consumption receipt audit",
                receiptLabel,
                statusLabel,
                walkdownLabel
            }
        ];
    }
    if (metric === "coin") {
        const maintenanceReceiptAmount = sumStructuredReceiptOutflow(rawPhases, isMaintenanceReceipt);
        const maintenanceWalkdownAmount = walkdownAmount(turnExplanation, "coin", "coin_maintenance");
        if (maintenanceReceiptAmount === 0 && maintenanceWalkdownAmount === null)
            return [];
        const reconciled = maintenanceWalkdownAmount === null || maintenanceReceiptAmount === maintenanceWalkdownAmount;
        return [
            {
                detail: "Only structured maintenance or upkeep coin receipts count as ledger-paid upkeep here.",
                id: "coin_maintenance_audit",
                label: "Maintenance receipt audit",
                receiptLabel: formatAuditAmount(maintenanceReceiptAmount, "coin"),
                statusLabel: reconciled ? "Reconciled" : "Needs reconciliation",
                walkdownLabel: maintenanceWalkdownAmount === null ? "No coin maintenance walkdown row" : formatAuditAmount(maintenanceWalkdownAmount, "coin walkdown")
            }
        ];
    }
    return [];
}
export function buildReceiptViewerData(args) {
    const { diffLedgerItems, obligationsContract = null, phaseResults, turnExplanation = null } = args;
    const rawPhases = [];
    for (const phaseResult of Array.isArray(phaseResults) ? phaseResults : []) {
        const structuredReceipts = Array.isArray(phaseResult?.fiscal_receipts_v1)
            ? phaseResult.fiscal_receipts_v1
                .map((receipt, index) => normalizeStructuredReceiptLine(phaseResult.phase, receipt, index, obligationsContract))
                .filter((receipt) => receipt !== null)
            : [];
        const legacyReceipts = Array.isArray(phaseResult?.receipts)
            ? phaseResult.receipts
                .map((receipt, index) => normalizeReceiptLine(phaseResult.phase, receipt, index, obligationsContract))
                .filter((receipt) => receipt !== null)
            : [];
        const receipts = structuredReceipts.length > 0 ? structuredReceipts : legacyReceipts;
        if (receipts.length === 0)
            continue;
        rawPhases.push({
            phase: phaseResult.phase,
            label: PHASE_LABELS[phaseResult.phase],
            receipts
        });
    }
    const groupedSections = [
        {
            id: "overview",
            ...GROUPED_SECTION_META.overview,
            auditRows: [],
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
            auditRows: auditRowsForMetric(rawPhases, turnExplanation, "food"),
            highlights: highlightForMetric(diffLedgerItems, "food"),
            walkdownRows: walkdownRowsForMetric(turnExplanation, "food"),
            receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.tags.includes("food")))
        },
        {
            id: "coin",
            ...GROUPED_SECTION_META.coin,
            auditRows: auditRowsForMetric(rawPhases, turnExplanation, "coin"),
            highlights: highlightForMetric(diffLedgerItems, "coin"),
            walkdownRows: walkdownRowsForMetric(turnExplanation, "coin"),
            receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.tags.includes("coin")))
        },
        {
            id: "unrest",
            ...GROUPED_SECTION_META.unrest,
            auditRows: [],
            highlights: highlightForMetric(diffLedgerItems, "unrest"),
            walkdownRows: walkdownRowsForMetric(turnExplanation, "unrest"),
            receipts: rawPhases.flatMap((phase) => phase.receipts.filter((receipt) => receipt.tags.includes("unrest")))
        }
    ];
    const counterpartySections = obligationsContract
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
export function createExplainChangesRoute() {
    return {
        focus: "overview",
        mode: "grouped",
        origin: "diff_ledger"
    };
}
export function createResourceChipRoute(chipId) {
    return {
        focus: chipId,
        mode: "grouped",
        origin: `${chipId}_chip`
    };
}
export function selectGroupedReceiptSections(groupedSections, focus) {
    if (focus === "overview")
        return groupedSections;
    return groupedSections.filter((section) => section.id === focus);
}
export function selectCounterpartyReceiptSections(counterpartySections, focus) {
    if (focus === "overview")
        return counterpartySections;
    return counterpartySections.filter((section) => section.receiptCategoryOrder.includes(focus));
}
export function selectRawReceiptPhases(rawPhases, focus) {
    if (focus === "overview")
        return rawPhases;
    return rawPhases
        .map((phase) => ({
        ...phase,
        receipts: phase.receipts.filter((receipt) => receipt.tags.includes(focus))
    }))
        .filter((phase) => phase.receipts.length > 0);
}
export function receiptViewerTitle(focus) {
    if (focus === "overview")
        return "Explain changes";
    return GROUPED_SECTION_META[focus].title;
}
export function receiptViewerSubtitle(focus) {
    return FOCUS_SUBTITLES[focus];
}
