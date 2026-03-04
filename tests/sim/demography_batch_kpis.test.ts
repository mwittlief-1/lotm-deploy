import { describe, expect, it } from "vitest";
import { computeAgeBucketSnapshot, computeCagr, parseBucketOverride, runDemographyBatch } from "../../scripts/demographyBatch";

describe("demography batch KPI helpers", () => {
  it("bucket shares sum to ~1.0 for a snapshot", () => {
    const buckets = parseBucketOverride("0-14,15-25,26-40,41-65,66+");
    const snap = computeAgeBucketSnapshot([3, 8, 16, 22, 30, 45, 67, 80], buckets);
    const sum = Object.values(snap).reduce((a, b) => a + b.share_of_population, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
  });

  it("CAGR matches hand calculation", () => {
    const got = computeCagr(100, 121, 10);
    const expected = Math.pow(121 / 100, 1 / 10) - 1;
    expect(Math.abs(got - expected)).toBeLessThan(1e-12);
  });

  it("small fixed-seed batch produces non-zero births or deaths", () => {
    const summary = runDemographyBatch([1], 6, { fertilityScale: 1.5, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 }, "sim");
    expect(summary.total_births + summary.total_deaths).toBeGreaterThan(0);
  });

});
