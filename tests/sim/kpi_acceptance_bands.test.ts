import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildKpiAcceptanceBandsArtifact, KPI_ACCEPTANCE_BANDS_RELPATH } from "../../scripts/kpiAcceptanceBands";
import { sha256, stableStringify } from "../../scripts/seed_replay/hash";

function readArtifact() {
  return JSON.parse(fs.readFileSync(path.resolve(KPI_ACCEPTANCE_BANDS_RELPATH), "utf8")) as Record<string, any>;
}

describe("kpi acceptance bands", () => {
  it("matches the checked-in deterministic KPI acceptance artifact", () => {
    const artifact = readArtifact();
    const built = buildKpiAcceptanceBandsArtifact();

    expect(artifact).toEqual({
      ...built,
      hash: sha256(stableStringify(built))
    });
  });

  it("covers the requested KPI metrics with explicit targets and comparison rails", () => {
    const artifact = buildKpiAcceptanceBandsArtifact();

    expect(artifact.metric_bands.map((band) => band.metric_id)).toEqual([
      "net_coin",
      "arrears_incidence",
      "dispossession",
      "shortages",
      "manor_count_growth"
    ]);

    for (const band of artifact.metric_bands) {
      expect(band.targets.length).toBeGreaterThan(0);
      expect(band.comparison_rails.length).toBeGreaterThan(0);
      expect(band.acceptance_ids.length).toBeGreaterThan(0);
    }
  });

  it("anchors each KPI band to the locked preset and DOE sources", () => {
    const artifact = buildKpiAcceptanceBandsArtifact();
    const netCoin = artifact.metric_bands.find((band) => band.metric_id === "net_coin");
    const arrears = artifact.metric_bands.find((band) => band.metric_id === "arrears_incidence");
    const dispossession = artifact.metric_bands.find((band) => band.metric_id === "dispossession");
    const shortages = artifact.metric_bands.find((band) => band.metric_id === "shortages");
    const manorCount = artifact.metric_bands.find((band) => band.metric_id === "manor_count_growth");

    expect(netCoin?.targets[0]).toMatchObject({
      preset_ids: ["baseline_low_pressure_prudent"],
      source: {
        scenario_id: "baseline_low_pressure_prudent"
      },
      value: 118
    });
    expect(arrears?.comparison_rails[0]).toMatchObject({
      source: {
        artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/turns_15/summary.json",
        policy_id: "builder-forward"
      },
      value: 1
    });
    expect(dispossession?.targets[0]).toMatchObject({
      preset_ids: ["dispossession_builder"],
      value: 1
    });
    expect(shortages?.targets[0]).toMatchObject({
      preset_ids: ["weather_shortage_builder"],
      value: 0
    });
    expect(manorCount?.targets.map((entry) => entry.value)).toEqual([1, 1]);
  });
});
