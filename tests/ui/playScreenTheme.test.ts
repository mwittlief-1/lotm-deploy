import { describe, expect, it } from "vitest";

import {
  chipSigilForId,
  PLAY_SCREEN_CHIP_SIGILS,
  PLAY_SCREEN_PAGE_STYLE,
  PLAY_SCREEN_SECTION_SIGILS,
  PLAY_SCREEN_THEME
} from "../../src/ui/playScreenTheme";

describe("playScreenTheme", () => {
  it("locks the manuscript font and page treatment", () => {
    expect(PLAY_SCREEN_THEME.bodyFont).toContain("Iowan Old Style");
    expect(PLAY_SCREEN_THEME.bodyFont).toContain("Palatino");
    expect(String(PLAY_SCREEN_PAGE_STYLE.background)).toContain("linear-gradient");
  });

  it("keeps stable section sigils for the gameplay shell", () => {
    expect(PLAY_SCREEN_SECTION_SIGILS).toEqual({
      agenda: "AG",
      ledger: "LD",
      state: "ST",
      report: "RP",
      portfolio: "PF",
      decisions: "DO",
      receipts: "EX"
    });
  });

  it("maps sticky resource chips to deterministic sigils", () => {
    expect(PLAY_SCREEN_CHIP_SIGILS).toEqual({
      food: "FD",
      coin: "CN",
      unrest: "UR"
    });
    expect(chipSigilForId("food")).toBe("FD");
    expect(chipSigilForId("coin")).toBe("CN");
    expect(chipSigilForId("unrest")).toBe("UR");
  });
});
