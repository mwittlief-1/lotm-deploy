import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { APP_VERSION } from "../../src/version";
import { buildNewRunPresetSurface } from "../../src/ui/newRunPresetView";
import { NewRunScreen } from "../../src/ui/panels/NewRunScreen";

describe("NewRunScreen", () => {
  it("renders the canonical preset wiring and selected preset provenance", () => {
    const html = renderToStaticMarkup(
      <NewRunScreen
        appVersion="0.3.5"
        onGenerateSeed={() => undefined}
        onNewRun={() => undefined}
        onPresetChange={() => undefined}
        onSeedChange={() => undefined}
        presetSurface={buildNewRunPresetSurface("arrears_pressure_builder")}
        seed="lotm_v022_seed_001_baseline_extworld"
        seedLocked={true}
        turnYears={3}
      />
    );

    expect(html).toContain("Preset selection");
    expect(html).toContain("Canonical wiring");
    expect(html).toContain("qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json");
    expect(html).toContain("applyPlayabilityPreset");
    expect(html).toContain("createNewRun");
    expect(html).toContain("Arrears-pressure builder");
    expect(html).toContain("builder-forward");
    expect(html).toContain("lotm_v022_seed_001_baseline_extworld");
    expect(html).toContain(`Provenance: UI ${APP_VERSION}, build ${APP_VERSION}, status aligned.`);
    expect(html).toContain("qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json -&gt; arrears_pressure_builder");
  });

  it("renders the custom-seed path without preset provenance", () => {
    const html = renderToStaticMarkup(
      <NewRunScreen
        appVersion="0.3.5"
        onGenerateSeed={() => undefined}
        onNewRun={() => undefined}
        onPresetChange={() => undefined}
        onSeedChange={() => undefined}
        presetSurface={buildNewRunPresetSurface(null)}
        seed="custom_seed_123"
        seedLocked={false}
        turnYears={3}
      />
    );

    expect(html).toContain("Custom seed");
    expect(html).toContain(`Provenance: UI ${APP_VERSION}, build ${APP_VERSION}, status aligned.`);
    expect(html).toContain("Generate");
    expect(html).not.toContain("Preset provenance");
  });
});
