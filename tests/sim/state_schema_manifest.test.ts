import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";
import { buildRunSummary } from "../../src/sim/exports";
import {
  BOUNDED_REGISTRY_MANIFEST_ENTRY_IDS,
  BOUNDED_REGISTRY_MANIFEST_SCHEMA_VERSION,
  RUN_STATE_SCHEMA_VERSION,
  buildBoundedRegistryManifest
} from "../../src/sim/stateSchema";

function loadLegacyFixture(): any {
  const fixturePath = path.resolve("tests/fixtures/v0.1.0_state_fixture.json");
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

describe("state schema scaffold", () => {
  it("stores explicit state schema metadata on new runs and summaries", () => {
    const state = createNewRun("state_schema_manifest_v031");

    expect(state.state_schema_version).toBe(RUN_STATE_SCHEMA_VERSION);
    expect(state.bounded_registry_manifest).toEqual(buildBoundedRegistryManifest());
    expect(state.bounded_registry_manifest?.entries.map((entry) => entry.registry_id)).toEqual([...BOUNDED_REGISTRY_MANIFEST_ENTRY_IDS]);

    const summary = buildRunSummary(state);
    expect(summary.state_schema_version).toBe(RUN_STATE_SCHEMA_VERSION);
    expect(summary.bounded_registry_manifest).toEqual(state.bounded_registry_manifest);
  });

  it("adds the canonical scaffold to legacy preview states deterministically", () => {
    const ctxA = proposeTurn(loadLegacyFixture() as any);
    const ctxB = proposeTurn(loadLegacyFixture() as any);

    expect(ctxA.preview_state.state_schema_version).toBe(RUN_STATE_SCHEMA_VERSION);
    expect(ctxA.preview_state.bounded_registry_manifest).toEqual(buildBoundedRegistryManifest());
    expect(ctxA.preview_state.bounded_registry_manifest).toEqual(ctxB.preview_state.bounded_registry_manifest);
    expect(
      ctxA.preview_state.bounded_registry_manifest?.entries.find((entry) => entry.registry_id === "kinship_edges")?.legacy_paths
    ).toEqual(["kinship"]);
  });

  it("projects bounded snapshots with stable schema metadata", () => {
    const state = createNewRun("state_schema_manifest_snapshot");
    const snapshot = boundedSnapshot(state);

    expect(snapshot.state_schema_version).toBe(RUN_STATE_SCHEMA_VERSION);
    expect(snapshot.bounded_registry_manifest.schema_version).toBe(BOUNDED_REGISTRY_MANIFEST_SCHEMA_VERSION);
    expect(snapshot.bounded_registry_manifest.entries.map((entry) => entry.registry_id)).toEqual([...BOUNDED_REGISTRY_MANIFEST_ENTRY_IDS]);
    expect(snapshot.bounded_registry_manifest).toEqual(state.bounded_registry_manifest);
  });
});
