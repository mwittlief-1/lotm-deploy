import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildRunawayDetectorsArtifact, RUNAWAY_DETECTORS_RELPATH } from "../../scripts/runawayDetectors";
import { sha256, stableStringify } from "../../scripts/seed_replay/hash";

function readArtifact() {
  return JSON.parse(fs.readFileSync(path.resolve(RUNAWAY_DETECTORS_RELPATH), "utf8")) as Record<string, any>;
}

describe("runaway detectors", () => {
  it("matches the checked-in deterministic runaway-detector artifact", () => {
    const artifact = readArtifact();
    const built = buildRunawayDetectorsArtifact();

    expect(artifact).toEqual({
      ...built,
      hash: sha256(stableStringify(built))
    });
  });

  it("covers the five requested fiscal and starvation failure modes", () => {
    const artifact = buildRunawayDetectorsArtifact();

    expect(artifact.detectors.map((detector) => detector.detector_id)).toEqual([
      "coin_runaway",
      "starvation_spiral",
      "arrears_too_soft",
      "arrears_too_hard",
      "manor_count_growth_frozen"
    ]);

    for (const detector of artifact.detectors) {
      expect(detector.status).toBe("pass");
      expect(detector.checks.length).toBeGreaterThan(0);
      expect(detector.checks.every((check) => check.status === "pass")).toBe(true);
    }
  });

  it("anchors each detector to the locked preset, KPI, regression, and DOE rails", () => {
    const artifact = buildRunawayDetectorsArtifact();
    const coinRunaway = artifact.detectors.find((detector) => detector.detector_id === "coin_runaway");
    const starvation = artifact.detectors.find((detector) => detector.detector_id === "starvation_spiral");
    const arrearsSoft = artifact.detectors.find((detector) => detector.detector_id === "arrears_too_soft");
    const arrearsHard = artifact.detectors.find((detector) => detector.detector_id === "arrears_too_hard");
    const manorFrozen = artifact.detectors.find((detector) => detector.detector_id === "manor_count_growth_frozen");

    expect(coinRunaway).toMatchObject({
      acceptance_ids: ["runaway_coin_runaway"],
      preset_ids: ["baseline_low_pressure_prudent", "stable_clear_prudent"]
    });
    expect(coinRunaway?.checks.map((check) => check.band)).toEqual([
      { min: 19, max: 118 },
      { min: 19, max: 118 }
    ]);

    expect(starvation?.checks[0]).toMatchObject({
      observed_value: 0,
      source: { scenario_id: "weather_shortage_builder" }
    });
    expect(starvation?.checks[1]).toMatchObject({
      observed_value: 402
    });

    expect(arrearsSoft?.checks.map((check) => check.observed_value)).toEqual([1, 1]);
    expect(arrearsHard?.checks.map((check) => check.observed_value)).toEqual([0, 52, 1, 26]);
    expect(manorFrozen?.checks.map((check) => check.observed_value)).toEqual([1, 1, 1, 1]);
  });
});
