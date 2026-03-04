import { describe, expect, it } from "vitest";
import { runDemographyBatch } from "../../scripts/demographyBatch";

describe("v0.2.9 spacing invariant", () => {
  it("reports no <2-year spacing violations across canonical multi-seed batch", () => {
    const seeds = Array.from({ length: 8 }, (_, i) => i + 1);
    const summary = runDemographyBatch(
      seeds,
      10,
      { fertilityScale: 1, mortalityScaleChild: 1, mortalityScaleAdult: 1 },
      "sim",
    );

    expect(summary.births_by_maternal_age_band["45+"]).toBe(0);
    expect(summary.spacing_lt_2_count).toBe(0);
  });
});
