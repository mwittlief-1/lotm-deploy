import { describe, expect, it } from "vitest";

import { PLAY_SCREEN_CARD_ORDER, buildStickyResourceChips } from "../../src/ui/playScreenLayout";

describe("play screen layout", () => {
  it("keeps the audited single-column card order stable", () => {
    expect(PLAY_SCREEN_CARD_ORDER).toEqual([
      "council_agenda",
      "diff_ledger",
      "manor_state",
      "turn_report",
      "portfolio_overview",
      "prospects",
      "known_houses",
      "intel",
      "events",
      "decisions",
      "debug_relationships"
    ]);
  });

  it("builds sticky chips from the canonical headline resources", () => {
    const chips = buildStickyResourceChips({
      manor: {
        bushels_stored: 182,
        coin: 14,
        unrest: 47
      },
      deltaBushels: -9,
      deltaCoin: 3,
      deltaUnrest: 5,
      fmtSigned: (value) => (value > 0 ? `+${value}` : String(value))
    });

    expect(chips).toEqual([
      {
        id: "food",
        label: "Food Stores",
        value: "182 bushels",
        delta: "Delta -9",
        tone: "caution"
      },
      {
        id: "coin",
        label: "Coin",
        value: "14",
        delta: "Delta +3",
        tone: "neutral"
      },
      {
        id: "unrest",
        label: "Unrest",
        value: "47/100",
        delta: "Delta +5",
        tone: "caution"
      }
    ]);
  });
});
