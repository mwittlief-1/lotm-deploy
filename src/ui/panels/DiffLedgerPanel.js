import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { PLAY_SCREEN_ACTION_BUTTON_STYLE, PLAY_SCREEN_PANEL_ACCENT_STYLE, PLAY_SCREEN_SECTION_SIGILS, PLAY_SCREEN_SUBCARD_STYLE } from "../playScreenTheme";
import { SectionHeading } from "./SectionHeading";
const MAX_VISIBLE_DIFF_LEDGER_ITEMS = 4;
export function DiffLedgerPanel({ copy, items, onOpenExplainChanges, scopeHelperText, scopeLabel }) {
    const visibleItems = items.slice(0, MAX_VISIBLE_DIFF_LEDGER_ITEMS);
    const hiddenCount = Math.max(0, items.length - visibleItems.length);
    return (_jsxs("div", { style: { ...PLAY_SCREEN_PANEL_ACCENT_STYLE, marginBottom: 12 }, children: [_jsx(SectionHeading, { action: onOpenExplainChanges ? (_jsx("button", { "data-open-explain-changes": true, onClick: onOpenExplainChanges, style: PLAY_SCREEN_ACTION_BUTTON_STYLE, type: "button", children: copy.diffLedgerExplainChanges ?? "Explain Changes" })) : null, helper: scopeHelperText ?? copy.diffLedgerHelper, sigil: PLAY_SCREEN_SECTION_SIGILS.ledger, timingLabel: copy.turnSummary_last3Years, title: copy.diffLedgerTitle }), scopeLabel ? (_jsx("div", { style: { marginTop: 10 }, children: _jsx("span", { style: {
                        fontSize: 11,
                        padding: "2px 8px",
                        border: "1px solid rgba(172, 143, 100, 0.32)",
                        borderRadius: 999,
                        background: "#f8f0df",
                        color: "#74542f"
                    }, children: scopeLabel }) })) : null, _jsx("div", { style: { marginTop: 10, fontSize: 12, opacity: 0.82 }, children: hiddenCount > 0
                    ? `Showing the ${visibleItems.length} biggest resolved moves here. Open Explain Changes for ${hiddenCount} more item${hiddenCount === 1 ? "" : "s"} and the deeper cause chain.`
                    : "Top deltas only. Open Explain Changes for the ordered walkdowns and matched receipts behind them." }), _jsx("div", { style: { display: "grid", gap: 8, marginTop: 10 }, children: visibleItems.map((it) => (_jsxs("div", { style: { ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }, children: [_jsx("div", { style: { fontWeight: 700 }, children: it.primary }), _jsx("span", { title: "Source of the change (highest-priority contributor).", style: {
                                        fontSize: 12,
                                        padding: "2px 8px",
                                        border: "1px solid rgba(172, 143, 100, 0.32)",
                                        borderRadius: 999,
                                        background: "#f8f0df",
                                        whiteSpace: "nowrap"
                                    }, children: it.source.replace(/_/g, " ") })] }), _jsx("div", { style: { fontSize: 12, opacity: 0.85, marginTop: 6 }, children: it.why })] }, it.id))) })] }));
}
