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
    expect(html).toContain("Low-pressure prudent baseline (baseline_low_pressure_prudent)");
    expect(html).toContain("lotm_v022_seed_001_baseline_extworld");
    expect(html).toContain("qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json");
  });

  it("renders custom-seed provenance when no preset id is present", () => {
    const state = createNewRun("custom_seed_789");
    const html = renderToStaticMarkup(<RunProvenanceBanner surface={buildRunProvenanceSurface(state)} />);

    expect(html).toContain("Custom seed");
    expect(html).toContain("custom_seed_789");
    expect(html).toContain("canonical_new_run_init_v1");
  });
});
