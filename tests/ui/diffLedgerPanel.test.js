import { jsx as _jsx } from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiffLedgerPanel } from "../../src/ui/panels/DiffLedgerPanel";
describe("DiffLedgerPanel", () => {
    it("renders a scope label and helper when selected-manor evidence is holdings-only", () => {
        const html = renderToStaticMarkup(_jsx(DiffLedgerPanel, { copy: {
                diffLedgerExplainChanges: "Explain Changes",
                diffLedgerHelper: "Base helper",
                diffLedgerTitle: "Diff Ledger",
                turnSummary_last3Years: "Last 3 years"
            }, items: [
                {
                    id: "coin",
                    primary: "Coin: -2",
                    source: "system_pressure",
                    why: "Tax due entering the turn."
                }
            ], onOpenExplainChanges: () => undefined, scopeHelperText: "Hx 30001 detail is selected above, but this ledger still follows the current manor because non-anchor holdings do not yet expose their own resolved turn ledger.", scopeLabel: "Current manor ledger \u00B7 Hx 30001 selected" }));
        expect(html).toContain("Current manor ledger · Hx 30001 selected");
        expect(html).toContain("this ledger still follows the current manor");
        expect(html).toContain("Explain Changes");
        expect(html).toContain("Coin: -2");
    });
});
