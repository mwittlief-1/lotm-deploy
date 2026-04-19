import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DiffLedgerPanel } from "../../src/ui/panels/DiffLedgerPanel";

describe("DiffLedgerPanel", () => {
  it("renders a scope label and helper when selected-manor evidence is holdings-only", () => {
    const html = renderToStaticMarkup(
      <DiffLedgerPanel
        copy={{
          diffLedgerExplainChanges: "Explain Changes",
          diffLedgerHelper: "Base helper",
          diffLedgerTitle: "Diff Ledger",
          turnSummary_last3Years: "Last 3 years"
        }}
        items={[
          {
            id: "coin",
            primary: "Coin: -2",
            source: "system_pressure",
            why: "Tax due entering the turn."
          }
        ]}
        onOpenExplainChanges={() => undefined}
        scopeHelperText="Hx 30001 detail is selected above, but this ledger still follows the current manor because non-anchor holdings do not yet expose their own resolved turn ledger."
        scopeLabel="Current manor ledger · Hx 30001 selected"
      />
    );

    expect(html).toContain("Current manor ledger · Hx 30001 selected");
    expect(html).toContain("this ledger still follows the current manor");
    expect(html).toContain("Explain Changes");
    expect(html).toContain("Coin: -2");
    expect(html).toContain("Top deltas only");
  });

  it("shows only the biggest resolved moves in the panel body", () => {
    const html = renderToStaticMarkup(
      <DiffLedgerPanel
        copy={{
          diffLedgerExplainChanges: "Explain Changes",
          diffLedgerHelper: "Base helper",
          diffLedgerTitle: "Diff Ledger",
          turnSummary_last3Years: "Last 3 years"
        }}
        items={[
          { id: "a", primary: "A", source: "system_pressure", why: "A why" },
          { id: "b", primary: "B", source: "system_pressure", why: "B why" },
          { id: "c", primary: "C", source: "event", why: "C why" },
          { id: "d", primary: "D", source: "decision", why: "D why" },
          { id: "e", primary: "E", source: "prospect", why: "E why" }
        ]}
      />
    );

    expect(html).toContain("Showing the 4 biggest resolved moves");
    expect(html).toContain("A");
    expect(html).toContain("D");
    expect(html).not.toContain(">E<");
  });
});
