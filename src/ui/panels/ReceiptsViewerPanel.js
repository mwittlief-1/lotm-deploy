import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { PLAY_SCREEN_ACTION_BUTTON_STYLE, PLAY_SCREEN_SECONDARY_BUTTON_STYLE, PLAY_SCREEN_SUBCARD_STYLE, PLAY_SCREEN_THEME } from "../playScreenTheme";
const SOURCE_TONE_STYLE = {
    decision: {
        border: "1px solid #d2c4a5",
        background: "#fff6df"
    },
    event: {
        border: "1px solid #c9d7e8",
        background: "#f2f7fc"
    },
    system_pressure: {
        border: "1px solid #d7d0c2",
        background: "#f8f4eb"
    },
    prospect: {
        border: "1px solid #d8c6dc",
        background: "#faf0fd"
    }
};
function modeButtonStyle(active) {
    return {
        ...(active ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE),
        fontWeight: active ? 700 : 500
    };
}
function stagePillStyle(label) {
    const active = label.toLowerCase().includes("stage");
    return {
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        border: active ? "1px solid rgba(133, 67, 48, 0.28)" : "1px solid rgba(91, 112, 68, 0.24)",
        background: active ? "rgba(159, 92, 65, 0.12)" : "rgba(141, 168, 118, 0.14)",
        color: active ? "#854330" : "#4f633b"
    };
}
function rawReceiptFieldLabelStyle() {
    return {
        fontSize: 11,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        opacity: 0.65
    };
}
export function ReceiptsViewerPanel({ counterpartySections, groupedSections, mode, onModeChange, rawPhases, scopeLabel, scopeSummary }) {
    return (_jsxs("div", { style: { display: "grid", gap: 14 }, children: [scopeLabel || scopeSummary ? (_jsxs("div", { "data-receipts-scope": "true", style: {
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(172, 143, 100, 0.24)",
                    background: "#fcfaf5",
                    color: PLAY_SCREEN_THEME.ink
                }, children: [scopeLabel ? _jsx("div", { style: { fontWeight: 700 }, children: scopeLabel }) : null, scopeSummary ? _jsx("div", { style: { fontSize: 12, lineHeight: 1.45, opacity: 0.82, marginTop: scopeLabel ? 4 : 0 }, children: scopeSummary }) : null] })) : null, _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx("button", { "aria-pressed": mode === "grouped", onClick: () => onModeChange("grouped"), style: modeButtonStyle(mode === "grouped"), type: "button", children: "Drilldown" }), _jsx("button", { "aria-pressed": mode === "raw", onClick: () => onModeChange("raw"), style: modeButtonStyle(mode === "raw"), type: "button", children: "Phase record" })] }), _jsx("div", { style: {
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(172, 143, 100, 0.24)",
                    background: "#fcfaf5",
                    color: PLAY_SCREEN_THEME.ink,
                    fontSize: 12,
                    lineHeight: 1.45,
                    opacity: 0.86
                }, children: mode === "grouped"
                    ? "Drilldown is the main player-facing explanation path here: ordered walkdowns, counterparty timing, and matched receipts stay grouped together."
                    : "Phase record is secondary evidence. Use it when the drilldown still leaves questions about the exact per-phase receipt trail." }), mode === "grouped" ? (_jsxs("div", { style: { display: "grid", gap: 12 }, children: [counterpartySections.length ? (_jsxs("section", { "data-receipts-counterparties": "true", style: {
                            padding: 14,
                            borderRadius: 14,
                            color: PLAY_SCREEN_THEME.ink,
                            ...PLAY_SCREEN_SUBCARD_STYLE
                        }, children: [_jsx("div", { style: { fontWeight: 700 }, children: "Counterparty paths" }), _jsx("div", { style: { fontSize: 12, opacity: 0.8, marginTop: 4 }, children: "Gifts and offerings stay attached to liege and church identity here, so each obligation fact and relationship action keeps one stable home." }), _jsx("div", { style: { display: "grid", gap: 12, marginTop: 12 }, children: counterpartySections.map((section) => (_jsxs("div", { "data-receipts-counterparty": section.id, style: {
                                        padding: 12,
                                        borderRadius: 12,
                                        border: "1px solid rgba(172, 143, 100, 0.24)",
                                        background: "#fdfbf7",
                                        display: "grid",
                                        gap: 10
                                    }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 700 }, children: section.title }), _jsx("div", { style: { fontSize: 12, opacity: 0.78, marginTop: 4 }, children: section.helper })] }), _jsx("span", { style: stagePillStyle(section.stageLabel), children: section.stageLabel })] }), _jsxs("div", { style: { display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }, children: [_jsxs("div", { style: { padding: 10, borderRadius: 12, background: "#fcfaf5", border: "1px solid rgba(172, 143, 100, 0.18)" }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }, children: "Due & pressure" }), _jsx("div", { style: { marginTop: 6, fontSize: 12, lineHeight: 1.45 }, children: section.dueSummary }), _jsx("div", { style: { marginTop: 6, fontSize: 12, lineHeight: 1.45 }, children: section.penaltySummary })] }), _jsxs("div", { style: { padding: 10, borderRadius: 12, background: "#fcfaf5", border: "1px solid rgba(172, 143, 100, 0.18)" }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }, children: "Relationship lever" }), _jsx("div", { style: { marginTop: 6, fontWeight: 700 }, children: section.gestureLabel }), _jsx("div", { style: { marginTop: 4, fontSize: 12, lineHeight: 1.45 }, children: section.gestureSummary }), _jsx("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.82 }, children: section.gestureDetail }), _jsxs("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.82 }, children: [section.gestureCost === null ? "No court budget cost recorded." : `Cost ${section.gestureCost}.`, section.gestureSpent !== null ? ` Used this turn ${section.gestureSpent}.` : ""] })] }), _jsxs("div", { style: { padding: 10, borderRadius: 12, background: "#fcfaf5", border: "1px solid rgba(172, 143, 100, 0.18)" }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }, children: "Timing" }), _jsx("div", { style: { marginTop: 6, fontSize: 12, lineHeight: 1.45 }, children: section.resolvedSummary }), _jsx("div", { style: { marginTop: 6, fontSize: 12, lineHeight: 1.45 }, children: section.responseSummary })] })] }), section.receipts.length ? (_jsxs("div", { style: { display: "grid", gap: 8 }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }, children: "Matched receipts" }), section.receipts.map((receipt) => (_jsx("div", { "data-counterparty-receipt-line": receipt.id, style: {
                                                        padding: "10px 12px",
                                                        borderRadius: 12,
                                                        border: "1px solid rgba(172, 143, 100, 0.24)",
                                                        background: "#fff"
                                                    }, children: _jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }, children: [_jsx("div", { style: { fontWeight: 600 }, children: receipt.line }), _jsxs("div", { style: { fontSize: 11, opacity: 0.7 }, children: [receipt.phaseLabel, " · ", receipt.kind] })] }) }, receipt.id)))] })) : (_jsx("div", { style: { fontSize: 12, opacity: 0.72 }, children: "No receipt lines matched this counterparty yet. The summaries above remain the primary explanation home." }))] }, section.id))) })] })) : null, groupedSections.map((section) => (_jsxs("section", { "data-receipts-section": section.id, style: {
                            padding: 14,
                            borderRadius: 14,
                            color: PLAY_SCREEN_THEME.ink,
                            ...PLAY_SCREEN_SUBCARD_STYLE
                        }, children: [_jsx("div", { style: { fontWeight: 700 }, children: section.title }), _jsx("div", { style: { fontSize: 12, opacity: 0.8, marginTop: 4 }, children: section.helper }), section.walkdownRows.length ? (_jsxs("div", { style: { display: "grid", gap: 8, marginTop: 12 }, children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }, children: "Walkdown" }), section.walkdownRows.map((row) => (_jsxs("div", { style: {
                                            padding: 10,
                                            borderRadius: 12,
                                            background: "#fcfaf5",
                                            border: "1px solid rgba(172, 143, 100, 0.24)"
                                        }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }, children: [_jsx("div", { style: { fontWeight: 700 }, children: row.label }), _jsx("div", { style: { fontSize: 12, fontWeight: 700 }, children: row.amountLabel })] }), _jsx("div", { style: { fontSize: 12, opacity: 0.82, marginTop: 6 }, children: row.summary })] }, row.id)))] })) : null, section.highlights.length ? (_jsx("div", { style: { display: "grid", gap: 8, marginTop: 12 }, children: section.highlights.map((highlight) => (_jsxs("div", { style: {
                                        padding: 10,
                                        borderRadius: 12,
                                        background: "#fcfaf5",
                                        border: "1px solid rgba(172, 143, 100, 0.24)"
                                    }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }, children: [_jsx("div", { style: { fontWeight: 700 }, children: highlight.primary }), _jsx("span", { style: {
                                                        padding: "2px 8px",
                                                        borderRadius: 999,
                                                        fontSize: 11,
                                                        textTransform: "uppercase",
                                                        letterSpacing: 0.4,
                                                        ...SOURCE_TONE_STYLE[highlight.source]
                                                    }, children: highlight.source.replace(/_/g, " ") })] }), _jsx("div", { style: { fontSize: 12, opacity: 0.82, marginTop: 6 }, children: highlight.why })] }, highlight.id))) })) : null, section.receipts.length ? (_jsx("div", { style: { display: "grid", gap: 8, marginTop: 12 }, children: section.receipts.map((receipt) => (_jsx("div", { "data-receipt-line": receipt.id, style: {
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: "1px solid rgba(172, 143, 100, 0.24)",
                                        background: "#fdfbf7"
                                    }, children: _jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }, children: [_jsx("div", { style: { fontWeight: 600 }, children: receipt.line }), _jsxs("div", { style: { fontSize: 11, opacity: 0.7 }, children: [receipt.phaseLabel, " · ", receipt.kind] })] }) }, receipt.id))) })) : (_jsx("div", { style: { marginTop: 12, fontSize: 12, opacity: 0.72 }, children: "No extra receipt lines matched this focus. The grouped drilldown above is still the primary explanation." }))] }, section.id)))] })) : rawPhases.length ? (_jsx("div", { style: { display: "grid", gap: 12 }, children: rawPhases.map((phase) => (_jsxs("section", { "data-receipts-phase": phase.phase, style: {
                        padding: 14,
                        borderRadius: 14,
                        color: PLAY_SCREEN_THEME.ink,
                        ...PLAY_SCREEN_SUBCARD_STYLE
                    }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }, children: [_jsx("div", { style: { fontWeight: 700 }, children: phase.label }), _jsxs("div", { style: { fontSize: 12, opacity: 0.74 }, children: [phase.receipts.length, " receipt line", phase.receipts.length === 1 ? "" : "s"] })] }), _jsx("div", { style: { display: "grid", gap: 8, marginTop: 12 }, children: phase.receipts.map((receipt) => (_jsx("div", { "data-receipt-line": receipt.id, style: {
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    border: "1px solid rgba(172, 143, 100, 0.24)",
                                    background: "#fdfbf7"
                                }, children: receipt.structured ? (_jsxs("div", { "data-raw-structured-receipt": receipt.structured.receiptId, style: { display: "grid", gap: 10 }, children: [_jsxs("div", { style: { display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }, children: [_jsxs("div", { children: [_jsx("div", { style: rawReceiptFieldLabelStyle(), children: "Receipt ID" }), _jsx("div", { style: { marginTop: 4 }, children: receipt.structured.receiptId })] }), _jsxs("div", { children: [_jsx("div", { style: rawReceiptFieldLabelStyle(), children: "Category" }), _jsx("div", { style: { marginTop: 4 }, children: receipt.structured.category || "Unknown" })] }), _jsxs("div", { children: [_jsx("div", { style: rawReceiptFieldLabelStyle(), children: "Asset" }), _jsx("div", { style: { marginTop: 4 }, children: receipt.structured.asset || "Unknown" })] }), _jsxs("div", { children: [_jsx("div", { style: rawReceiptFieldLabelStyle(), children: "Delta" }), _jsx("div", { style: { marginTop: 4 }, children: receipt.structured.delta > 0 ? `+${receipt.structured.delta}` : `${receipt.structured.delta}` })] }), _jsxs("div", { children: [_jsx("div", { style: rawReceiptFieldLabelStyle(), children: "Counterparty" }), _jsx("div", { style: { marginTop: 4 }, children: receipt.structured.counterpartyLabel || "Unknown" })] })] }), _jsxs("div", { children: [_jsx("div", { style: rawReceiptFieldLabelStyle(), children: "Summary / rule" }), _jsx("div", { style: { marginTop: 4 }, children: receipt.structured.summary || receipt.structured.ruleLabel || receipt.line }), receipt.structured.summary && receipt.structured.ruleLabel ? (_jsxs("div", { style: { marginTop: 4, fontSize: 12, opacity: 0.76 }, children: ["Rule: ", receipt.structured.ruleLabel] })) : null] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.65 }, children: receipt.kind }), _jsx("div", { style: { marginTop: 4 }, children: receipt.line })] })) }, receipt.id))) })] }, phase.phase))) })) : (_jsx("div", { style: { ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }, children: "No phase record lines matched this focus yet." }))] }));
}
