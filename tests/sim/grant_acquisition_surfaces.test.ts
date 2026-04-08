import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";
import {
  ACQUISITION_PROSPECTS_WINDOW_SCHEMA_VERSION,
  GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION,
  GRANT_ELIGIBILITY_SCHEMA_VERSION,
  GRANT_SOURCE_REGISTRY_SCHEMA_VERSION,
} from "../../src/sim/domains/people/grantAcquisitionRegistry";

describe("grant acquisition surfaces", () => {
  it("attaches the grant and acquisition seam to preview state and mirrors it on house", () => {
    const ctx = proposeTurn(createNewRun("grant_acquisition_preview_surface_v032"));
    const previewState: any = ctx.preview_state;

    expect(previewState.grant_eligibility).toMatchObject({
      schema_version: GRANT_ELIGIBILITY_SCHEMA_VERSION,
      eligible: expect.any(Boolean),
    });
    expect(previewState.grant_source_registry).toMatchObject({
      schema_version: GRANT_SOURCE_REGISTRY_SCHEMA_VERSION,
      source_entry_ids: expect.any(Array),
    });
    expect(previewState.grant_dossier_summaries[0]).toMatchObject({
      schema_version: GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION,
      manor_id: expect.any(String),
    });
    expect(previewState.acquisition_prospects_window).toMatchObject({
      schema_version: ACQUISITION_PROSPECTS_WINDOW_SCHEMA_VERSION,
      prospects: expect.any(Array),
    });
    expect(previewState.house.grant_eligibility).toEqual(previewState.grant_eligibility);
    expect(previewState.house.grant_source_registry).toEqual(previewState.grant_source_registry);
    expect(previewState.house.grant_dossier_summaries).toEqual(previewState.grant_dossier_summaries);
    expect(previewState.house.acquisition_prospects_window).toEqual(previewState.acquisition_prospects_window);
  });

  it("attaches the grant and acquisition seam to bounded snapshots without changing the serialized contract", () => {
    const snapshot: any = boundedSnapshot(createNewRun("grant_acquisition_snapshot_surface_v032"));

    expect(snapshot.grant_eligibility).toMatchObject({
      schema_version: GRANT_ELIGIBILITY_SCHEMA_VERSION,
      eligible: expect.any(Boolean),
    });
    expect(snapshot.grant_source_registry).toMatchObject({
      schema_version: GRANT_SOURCE_REGISTRY_SCHEMA_VERSION,
      source_entry_ids: expect.any(Array),
    });
    expect(snapshot.grant_dossier_summaries[0]).toMatchObject({
      schema_version: GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION,
      manor_id: expect.any(String),
    });
    expect(snapshot.acquisition_prospects_window).toMatchObject({
      schema_version: ACQUISITION_PROSPECTS_WINDOW_SCHEMA_VERSION,
      prospects: expect.any(Array),
    });
    expect(snapshot.house.grant_eligibility).toEqual(snapshot.grant_eligibility);
    expect(snapshot.house.grant_source_registry).toEqual(snapshot.grant_source_registry);
    expect(snapshot.house.grant_dossier_summaries).toEqual(snapshot.grant_dossier_summaries);
    expect(snapshot.house.acquisition_prospects_window).toEqual(snapshot.acquisition_prospects_window);
    expect(JSON.parse(JSON.stringify(snapshot)).grant_eligibility).toBeUndefined();
    expect(JSON.parse(JSON.stringify(snapshot)).grant_source_registry).toBeUndefined();
    expect(JSON.parse(JSON.stringify(snapshot)).grant_dossier_summaries).toBeUndefined();
    expect(JSON.parse(JSON.stringify(snapshot)).acquisition_prospects_window).toBeUndefined();
  });
});
