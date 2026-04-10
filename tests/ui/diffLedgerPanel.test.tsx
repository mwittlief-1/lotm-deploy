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
        scopeHelperText="Hx 30001 detail is selected above, but this resolved ledger remains pinned to the current manor chronicle because non-anchor holdings do not expose a separate ledger trail yet."
        scopeLabel="Current manor chronicle · Hx 30001 selected"
      />
    );

    expect(html).toContain("Current manor chronicle · Hx 30001 selected");
    expect(html).toContain("resolved ledger remains pinned to the current manor chronicle");
    expect(html).toContain("Explain Changes");
    expect(html).toContain("Coin: -2");
  });
});
