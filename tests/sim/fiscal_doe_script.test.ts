import path from "node:path";

import { describe, expect, it } from "vitest";

import { runEconomyFiscalDoeHarness } from "../../scripts/fiscalDoe";

describe("economy fiscal DOE harness script", () => {
  it("produces deterministic hashable KPI artifacts for a small canonical slice", async () => {
    const outdir = path.resolve("qa_artifacts/economy_balance/test_harness");

    const one = await runEconomyFiscalDoeHarness({
      seeds: ["lotm_v022_seed_001_baseline_extworld"],
      policies: ["prudent-builder"],
      turns: 2,
      outdir
    });
    const two = await runEconomyFiscalDoeHarness({
      seeds: ["lotm_v022_seed_001_baseline_extworld"],
      policies: ["prudent-builder"],
      turns: 2,
      outdir
    });

    expect(one.summaryArtifact.hash).toBe(two.summaryArtifact.hash);
    expect(one.runsArtifact.hash).toBe(two.runsArtifact.hash);
    expect(one.summaryArtifact.summary).toMatchObject({
      schema_version: "economy_fiscal_doe_summary_v1",
      policy_ids: ["prudent-builder"],
      overall: {
        run_count: 1
      }
    });
    expect(one.runsArtifact.runs).toHaveLength(1);
    expect(one.runsArtifact.runs[0]).toMatchObject({
      schema_version: "economy_fiscal_doe_run_metric_v1",
      policy: "prudent-builder",
      seed: "lotm_v022_seed_001_baseline_extworld",
      turns_requested: 2
    });
  });
});
