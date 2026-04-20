import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { buildDiffLedgerItems } from "../../src/ui/playScreenModel";
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

  it("reuses the shared unrest headline detail in the diff ledger why text", () => {
    const state = createNewRun("diff_ledger_unrest_alignment");
    const previewState = {
      ...state,
      manor: {
        ...state.manor,
        unrest: state.manor.unrest + 5
      },
      known_houses: []
    };
    const report = {
      events: [],
      headline_causes: [],
      relationship_change_log_v1: { entries: [] },
      top_drivers: [],
      turn_explanation_v1: {
        headline_causes: [
          {
            id: "headline_unrest",
            metric: "unrest",
            source: "system_pressure",
            magnitude: 5,
            summary: "Unrest +5",
            detail: "Arrears pressure (+4) pushed unrest up while Relief: Harvest Festival (-1) eased it."
          }
        ]
      }
    };

    const items = buildDiffLedgerItems({
      beforeManor: state.manor,
      copy: {
        housePrefix: (name: string) => `House ${name}`,
        diffLedgerLine_coin: (signed: string) => `Coin: ${signed}`,
        diffLedgerLine_food: (signed: string) => `Food: ${signed}`,
        diffLedgerLine_population: (signed: string) => `Population: ${signed}`,
        diffLedgerLine_relations: (target: string, a: string, r: string, t: string) => `Relations ${target}: ${a}/${r}/${t}`,
        diffLedgerLine_unrest: (signed: string) => `Unrest: ${signed}`,
        diffLedgerMultipleCauses: "Multiple causes"
      },
      deltaBushels: previewState.manor.bushels_stored - state.manor.bushels_stored,
      deltaCoin: previewState.manor.coin - state.manor.coin,
      deltaPop: previewState.manor.population - state.manor.population,
      deltaUnrest: previewState.manor.unrest - state.manor.unrest,
      fmtSigned: (value: number) => (value > 0 ? `+${value}` : `${value}`),
      personNameFromRegistry: () => null,
      popChangeSummary: null,
      previewState: previewState as any,
      report: report as any,
      shouldSurfaceWeatherOnFood: false,
      state,
      weatherHarmedHarvestWhy: null
    });

    expect(items.find((item) => item.id === "unrest")?.why).toBe(
      "Arrears pressure (+4) pushed unrest up while Relief: Harvest Festival (-1) eased it."
    );
  });
});
