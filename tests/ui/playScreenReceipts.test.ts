import { describe, expect, it } from "vitest";

import type { PhaseResultV0 } from "../../src/sim/types";
import type { LedgerItem } from "../../src/ui/playScreenModel";
import {
  buildReceiptViewerData,
  createExplainChangesRoute,
  createResourceChipRoute,
  selectGroupedReceiptSections,
  selectRawReceiptPhases
} from "../../src/ui/playScreenReceipts";

const DIFF_LEDGER_ITEMS: LedgerItem[] = [
  {
    id: "food",
    sort_mag: 40,
    tie_key: "00_food",
    primary: "Food: -321 bushels · Stores: 905",
    why: "Weather harmed harvest (0.70x)",
    source: "system_pressure"
  },
  {
    id: "coin",
    sort_mag: 7,
    tie_key: "01_coin",
    primary: "Coin: -2",
    why: "Tax due entering the turn.",
    source: "system_pressure"
  },
  {
    id: "unrest",
    sort_mag: 5,
    tie_key: "03_unrest",
    primary: "Unrest: +3",
    why: "Multiple causes this turn.",
    source: "event"
  }
];

const PHASE_RESULTS: PhaseResultV0[] = [
  {
    phase: "obligations",
    receipts: [
      { kind: "summary", line: "Tax due 2 coin; tithe due 60 bushels." },
      { kind: "summary", line: "Arrears coin 1; arrears bushels 12." }
    ],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
  },
  {
    phase: "consumption",
    receipts: [
      { kind: "summary", line: "Weather 0.70; market 0.08 coin/bushel; sell cap 460." },
      { kind: "summary", line: "Spoilage -41; production +1539; consumption -1819." }
    ],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
  },
  {
    phase: "events",
    receipts: [{ kind: "summary", line: "2 events applied." }],
    log_events: [],
    evidence_events_v0: [],
    rng_keys_used: []
  }
];

describe("playScreenReceipts", () => {
  it("creates deterministic routes for explain-changes and resource chips", () => {
    expect(createExplainChangesRoute()).toEqual({
      focus: "overview",
      mode: "grouped",
      origin: "diff_ledger"
    });

    expect(createResourceChipRoute("coin")).toEqual({
      focus: "coin",
      mode: "grouped",
      origin: "coin_chip"
    });
  });

  it("builds grouped and raw receipt data from phase receipts", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      phaseResults: PHASE_RESULTS
    });

    expect(data.groupedSections.map((section) => section.id)).toEqual(["overview", "food", "coin", "unrest"]);
    expect(data.groupedSections[0].highlights.map((highlight) => highlight.id)).toEqual(["food", "coin", "unrest"]);

    const foodSection = data.groupedSections.find((section) => section.id === "food");
    const coinSection = data.groupedSections.find((section) => section.id === "coin");
    const unrestSection = data.groupedSections.find((section) => section.id === "unrest");

    expect(foodSection?.receipts.map((receipt) => receipt.line)).toEqual([
      "Tax due 2 coin; tithe due 60 bushels.",
      "Arrears coin 1; arrears bushels 12.",
      "Weather 0.70; market 0.08 coin/bushel; sell cap 460.",
      "Spoilage -41; production +1539; consumption -1819."
    ]);
    expect(coinSection?.receipts.map((receipt) => receipt.line)).toEqual([
      "Tax due 2 coin; tithe due 60 bushels.",
      "Arrears coin 1; arrears bushels 12.",
      "Weather 0.70; market 0.08 coin/bushel; sell cap 460."
    ]);
    expect(unrestSection?.receipts.map((receipt) => receipt.line)).toEqual([
      "Arrears coin 1; arrears bushels 12.",
      "2 events applied."
    ]);

    expect(data.rawPhases.map((phase) => phase.phase)).toEqual(["obligations", "consumption", "events"]);
  });

  it("filters grouped sections and raw phases for focused chip routes", () => {
    const data = buildReceiptViewerData({
      diffLedgerItems: DIFF_LEDGER_ITEMS,
      phaseResults: PHASE_RESULTS
    });

    expect(selectGroupedReceiptSections(data.groupedSections, "coin").map((section) => section.id)).toEqual(["coin"]);
    expect(selectRawReceiptPhases(data.rawPhases, "coin")).toEqual([
      {
        phase: "obligations",
        label: "Obligations",
        receipts: [
          {
            id: "obligations_00",
            kind: "summary",
            line: "Tax due 2 coin; tithe due 60 bushels.",
            phase: "obligations",
            phaseLabel: "Obligations",
            tags: ["coin", "food"]
          },
          {
            id: "obligations_01",
            kind: "summary",
            line: "Arrears coin 1; arrears bushels 12.",
            phase: "obligations",
            phaseLabel: "Obligations",
            tags: ["coin", "food", "unrest"]
          }
        ]
      },
      {
        phase: "consumption",
        label: "Consumption",
        receipts: [
          {
            id: "consumption_00",
            kind: "summary",
            line: "Weather 0.70; market 0.08 coin/bushel; sell cap 460.",
            phase: "consumption",
            phaseLabel: "Consumption",
            tags: ["coin", "food"]
          }
        ]
      }
    ]);
  });
});
