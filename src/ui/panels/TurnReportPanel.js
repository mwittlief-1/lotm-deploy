import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { PLAY_SCREEN_MODAL_TITLES } from "../playScreenChrome";
import { PLAY_SCREEN_ACTION_BUTTON_STYLE, PLAY_SCREEN_PANEL_STYLE, PLAY_SCREEN_SECTION_SIGILS, PLAY_SCREEN_SUBCARD_STYLE } from "../playScreenTheme";
import { HouseholdDetailsPanel } from "./HouseholdDetailsPanel";
import { HouseholdPanel } from "./HouseholdPanel";
import { ModalSheet } from "./ModalSheet";
import { SectionHeading } from "./SectionHeading";
function readTurnExplanation(report) {
    return report?.turn_explanation_v1 && typeof report.turn_explanation_v1 === "object"
        ? report.turn_explanation_v1
        : null;
}
function walkdownForMetric(explanation, metric) {
    if (!explanation)
        return null;
    if (metric === "food")
        return explanation.food_walkdown;
    if (metric === "coin")
        return explanation.coin_walkdown;
    return explanation.unrest_walkdown;
}
function formatWalkdownAmount(amount, unitLabel) {
    return `${amount} ${unitLabel}`;
}
function summarizeWalkdown(walkdown) {
    if (!walkdown)
        return null;
    const biggestRow = [...walkdown.rows]
        .filter((row) => !["start", "net", "ending"].includes(row.direction) && row.amount !== 0)
        .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount) || left.label.localeCompare(right.label))[0] ?? null;
    return {
        directSummary: biggestRow?.summary ?? `Explain Changes keeps the full ${walkdown.metric} walkdown for this turn.`,
        endLabel: formatWalkdownAmount(walkdown.end_amount, walkdown.unit_label),
        startLabel: formatWalkdownAmount(walkdown.start_amount, walkdown.unit_label)
    };
}
function headlineCauseDetail(headlineCauses, metric) {
    const match = headlineCauses.find((cause) => cause && typeof cause === "object" && cause.metric === metric) ?? null;
    if (!match)
        return null;
    return typeof match.detail === "string" && match.detail.length > 0 ? match.detail : null;
}
function summarizeObligations(sections) {
    if (!sections.length)
        return "Open the obligation detail sheet for current versus arrears timing by counterparty.";
    return sections
        .slice(0, 2)
        .map((section) => {
        const dueLabel = section.dueGroup.amountLabel;
        const arrearsLabel = section.penaltyGroup.amountLabel;
        const stageLabel = section.penaltyGroup.stageLabel;
        if (section.penaltyGroup.amount > 0) {
            return `${section.shortTitle}: ${dueLabel} due, ${arrearsLabel} arrears, ${stageLabel}.`;
        }
        return `${section.shortTitle}: ${dueLabel} due, ${stageLabel}.`;
    })
        .join(" ");
}
function formatTransitionItem(value) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }
    if (!value || typeof value !== "object")
        return null;
    const name = typeof value.name === "string" && value.name.trim().length ? value.name.trim() : null;
    const id = typeof value.id === "string" && value.id.trim().length
        ? value.id.trim()
        : typeof value.person_id === "string" && value.person_id.trim().length
            ? value.person_id.trim()
            : null;
    if (name && id)
        return `${name} (${id})`;
    return name ?? id;
}
function transitionList(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => formatTransitionItem(item))
        .filter((item) => Boolean(item));
}
function addTransitionLine(lines, line) {
    if (!line)
        return;
    const normalized = line.trim();
    if (!normalized || lines.includes(normalized))
        return;
    lines.push(normalized);
}
function summarizeDynasticTransitions(report, currentHouseLog) {
    const lines = [];
    const household = report?.household && typeof report.household === "object" ? report.household : {};
    const births = transitionList(household.births);
    const deaths = transitionList(household.deaths);
    const aggregateDeaths = Number(household.deaths_unitemized_count ?? 0);
    if (births.length)
        addTransitionLine(lines, `Births: ${births.join(", ")}.`);
    if (deaths.length)
        addTransitionLine(lines, `Deaths: ${deaths.join(", ")}.`);
    if (Number.isFinite(aggregateDeaths) && aggregateDeaths > 0) {
        addTransitionLine(lines, `Peasant losses: ${Math.trunc(aggregateDeaths)} aggregate shortage death${Math.trunc(aggregateDeaths) === 1 ? "" : "s"}.`);
    }
    const notes = Array.isArray(report?.notes) ? report.notes : [];
    for (const note of notes) {
        if (typeof note !== "string" || !/marri/i.test(note))
            continue;
        const trimmed = note.trim();
        if (!trimmed)
            continue;
        addTransitionLine(lines, trimmed.endsWith(".") ? trimmed : `${trimmed}.`);
    }
    const logEvents = Array.isArray(currentHouseLog) ? currentHouseLog : [];
    for (const event of logEvents) {
        if (!event || typeof event !== "object")
            continue;
        if (event.kind === "widowed" && typeof event.survivor_name === "string" && typeof event.deceased_name === "string") {
            addTransitionLine(lines, `${event.survivor_name} was widowed after ${event.deceased_name} died.`);
        }
        else if (event.kind === "succession" && typeof event.new_ruler_name === "string") {
            addTransitionLine(lines, `Succession settled on ${event.new_ruler_name}.`);
        }
        else if (event.kind === "heir_selected" && typeof event.heir_name === "string") {
            addTransitionLine(lines, `Heir selected: ${event.heir_name}.`);
        }
    }
    return lines;
}
export function TurnReportPanel({ accruedThisTurn, anchorFood, anchorHousehold, arrearsCarried, copy, courtRosterEntries, courtSize, currentHouseLog, dueEntering, fmtObAmount, obligationsSections, onOpenObligationsDetails, pricingSurface, peasantConsumptionBushels, previewState, report, showHouseholdDetails, state, toggleHouseholdDetails, totalConsumptionBushels, totalObligations, turnYears }) {
    const turnExplanation = readTurnExplanation(report);
    const headlineCauses = Array.isArray(turnExplanation?.headline_causes) && turnExplanation.headline_causes.length > 0
        ? turnExplanation.headline_causes
        : Array.isArray(report?.headline_causes)
            ? report.headline_causes
            : [];
    const summaryRole = Array.isArray(turnExplanation?.surface_roles)
        ? turnExplanation.surface_roles.find((role) => role.surface === "turn_report") ?? null
        : null;
    const foodWalkdown = summarizeWalkdown(walkdownForMetric(turnExplanation, "food"));
    const coinWalkdown = summarizeWalkdown(walkdownForMetric(turnExplanation, "coin"));
    const unrestWalkdown = summarizeWalkdown(walkdownForMetric(turnExplanation, "unrest"));
    const foodHeadlineDetail = headlineCauseDetail(headlineCauses, "food");
    const coinHeadlineDetail = headlineCauseDetail(headlineCauses, "coin");
    const unrestHeadlineDetail = headlineCauseDetail(headlineCauses, "unrest");
    const obligationsSummary = summarizeObligations(obligationsSections);
    const dynasticTransitionLines = summarizeDynasticTransitions(report, currentHouseLog);
    return (_jsxs("div", { style: PLAY_SCREEN_PANEL_STYLE, children: [_jsx(SectionHeading, { helper: copy.turnReportTimingHelper ?? "These figures explain what already resolved over the last turn before you set new orders below.", sigil: PLAY_SCREEN_SECTION_SIGILS.report, timingLabel: copy.turnSummary_last3Years, title: "Turn Report" }), _jsx(HouseholdPanel, { anchorId: anchorHousehold, copy: copy, courtSize: courtSize, previewState: previewState, state: state, showDetails: showHouseholdDetails, onToggleDetails: toggleHouseholdDetails }), _jsxs("div", { "data-turn-report-section": "dynastic_transitions", style: { ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12, marginTop: 12 }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }, children: "Household changes" }), dynasticTransitionLines.length ? (_jsx("ul", { style: { margin: "8px 0 0", paddingLeft: 18 }, children: dynasticTransitionLines.map((line) => (_jsx("li", { style: { marginTop: 4 }, children: line }, line))) })) : (_jsx("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.82 }, children: "No births, deaths, marriages, or succession changes were recorded this turn." }))] }), summaryRole ? (_jsxs("div", { style: { ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12, marginTop: 12 }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }, children: "Role" }), _jsxs("div", { style: { marginTop: 4, fontWeight: 700 }, children: [summaryRole.role_label, " only"] }), _jsx("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.82 }, children: summaryRole.helper })] })) : null, _jsxs("div", { style: { marginTop: 14 }, children: [_jsx("h4", { style: { marginBottom: 8 }, children: "Headline causes" }), headlineCauses.length ? (_jsx("ol", { style: { margin: 0, paddingLeft: 18 }, children: headlineCauses.slice(0, 4).map((cause) => (_jsxs("li", { style: { marginTop: 6 }, children: [_jsx("b", { children: cause.summary }), ". ", cause.detail] }, cause.id))) })) : report.top_drivers.length ? (_jsx("ol", { style: { margin: 0, paddingLeft: 18 }, children: report.top_drivers.slice(0, 4).map((driver, index) => (_jsx("li", { style: { marginTop: 6 }, children: driver }, index))) })) : (_jsx("div", { style: { opacity: 0.7 }, children: "No headline causes recorded for this turn." }))] }), _jsxs("div", { style: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 14 }, children: [_jsxs("div", { id: anchorFood, style: { ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }, children: "Food & stores" }), _jsx("div", { style: { marginTop: 4, fontSize: 22, fontWeight: 700 }, children: foodWalkdown ? foodWalkdown.endLabel : `${report.production_bushels} bushels produced` }), _jsx("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.82 }, children: foodHeadlineDetail ?? foodWalkdown?.directSummary ?? "Explain Changes keeps the ordered food walkdown when you need the full accounting path." }), foodWalkdown ? _jsxs("div", { style: { marginTop: 8, fontSize: 12, opacity: 0.76 }, children: ["Started at ", foodWalkdown.startLabel, "."] }) : null] }), _jsxs("div", { style: { ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }, children: "Coin & dues" }), _jsx("div", { style: { marginTop: 4, fontSize: 22, fontWeight: 700 }, children: coinWalkdown ? coinWalkdown.endLabel : `${manor.coin} coin` }), _jsx("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.82 }, children: coinHeadlineDetail ?? coinWalkdown?.directSummary ?? "Explain Changes keeps the ordered coin walkdown when offsets need a fuller reading." }), _jsxs("div", { style: { marginTop: 8, fontSize: 12, opacity: 0.76 }, children: ["Due entering ", fmtObAmount(dueEntering), ". Arrears carried ", fmtObAmount(arrearsCarried), ".", accruedThisTurn ? ` New obligations ${fmtObAmount(accruedThisTurn)}.` : ""] })] }), _jsxs("div", { style: { ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }, children: "Unrest & stability" }), _jsx("div", { style: { marginTop: 4, fontSize: 22, fontWeight: 700 }, children: unrestWalkdown ? unrestWalkdown.endLabel : `${manor.unrest} unrest` }), _jsx("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.82 }, children: unrestHeadlineDetail ?? unrestWalkdown?.directSummary ?? "Manor State keeps the live pressure while Explain Changes keeps the full unrest cause chain." }), unrestWalkdown ? _jsxs("div", { style: { marginTop: 8, fontSize: 12, opacity: 0.76 }, children: ["Started at ", unrestWalkdown.startLabel, "."] }) : null] }), _jsxs("div", { style: { ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }, children: "Obligations" }), _jsx("div", { style: { marginTop: 4, fontSize: 22, fontWeight: 700 }, children: fmtObAmount(totalObligations) })] }), onOpenObligationsDetails ? (_jsx("button", { onClick: () => onOpenObligationsDetails("overview"), style: PLAY_SCREEN_ACTION_BUTTON_STYLE, type: "button", children: "Open detail sheet" })) : null] }), _jsx("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.82 }, children: obligationsSummary })] })] }), _jsx("div", { style: { fontSize: 12, opacity: 0.78, marginTop: 12 }, children: "Diff Ledger keeps only the biggest resolved moves, Manor State keeps live conditions, and Explain Changes is the drilldown home for ordered walkdowns and matched receipts." }), _jsx(ModalSheet, { onClose: toggleHouseholdDetails, open: showHouseholdDetails, subtitle: "Court roster, household log, and succession context stay accessible here without crowding the main card.", title: PLAY_SCREEN_MODAL_TITLES.household, children: _jsx(HouseholdDetailsPanel, { copy: copy, currentHouseLog: currentHouseLog, courtRosterEntries: courtRosterEntries, courtSize: courtSize, previewState: previewState, state: state }) })] }));
}
