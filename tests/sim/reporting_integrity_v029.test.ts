import { describe, it, expect } from "vitest";
import { createNewRun, proposeTurn } from "../../src/sim";

describe("v0.2.9 reporting integrity", () => {
  it("household births/deaths counts reconcile with itemization + omissions", () => {
    const s: any = createNewRun("TEST_REPORT_INTEGRITY");
    s.manor.bushels_stored = 0;

    const ctx: any = proposeTurn(s);
    const hh: any = ctx.report.household;

    const birthsCount = typeof hh.births_count === "number" ? hh.births_count : hh.births.length;
    const deathsCount = typeof hh.deaths_count === "number" ? hh.deaths_count : hh.deaths.length;
    const birthsUn = typeof hh.births_unitemized_count === "number" ? hh.births_unitemized_count : 0;
    const deathsUn = typeof hh.deaths_unitemized_count === "number" ? hh.deaths_unitemized_count : 0;

    expect(birthsCount).toBe((hh.births?.length ?? 0) + birthsUn);
    expect(deathsCount).toBe((hh.deaths?.length ?? 0) + deathsUn);
    if (deathsUn > 0) expect(typeof hh.omissions_note).toBe("string");
  });
});
