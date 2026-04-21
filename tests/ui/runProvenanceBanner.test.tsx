import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { buildCanonicalNewRunInit } from "../../src/ui/newRunPresetView";
import { RunProvenanceBanner } from "../../src/ui/panels/RunProvenanceBanner";
import { buildRunProvenanceSurface } from "../../src/ui/runProvenanceView";

describe("RunProvenanceBanner", () => {
  it("renders locked preset provenance for preset-backed runs", () => {
    const state = createNewRun(buildCanonicalNewRunInit("ignored_seed", "baseline_low_pressure_prudent"));
    const html = renderToStaticMarkup(<RunProvenanceBanner surface={buildRunProvenanceSurface(state)} />);

    expect(html).toContain("Run provenance");
    expect(html).toContain("Locked preset");
    expect(html).toContain("Version provenance");
    expect(html).toContain("Version aligned");
    expect(html).toContain("UI app");
    expect(html).toContain("Run app");
    expect(html).toContain("Build info");
    expect(html).toContain("Low-pressure prudent baseline (baseline_low_pressure_prudent)");
    expect(html).toContain("lotm_v022_seed_001_baseline_extworld");
    expect(html).toContain("qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json");
  });

  it("renders visible version mismatch copy when run metadata drifts", () => {
    const state = {
      ...createNewRun("custom_seed_789"),
      app_version: "v0.3.4-hotfix"
    };
    const html = renderToStaticMarkup(<RunProvenanceBanner surface={buildRunProvenanceSurface(state)} />);

    expect(html).toContain("Version mismatch");
    expect(html).toContain("v0.3.4-hotfix");
    expect(html).toContain("Custom seed");
    expect(html).toContain("custom_seed_789");
  });
});
