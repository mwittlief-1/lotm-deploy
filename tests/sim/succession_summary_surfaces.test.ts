import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import {
  CLAIMANT_SUMMARY_SCHEMA_VERSION,
  SUCCESSION_LINE_SUMMARY_SCHEMA_VERSION,
  buildSuccessionExperienceSurfaces,
} from "../../src/sim/domains/people/successionSummaries";

describe("succession summary surfaces", () => {
  it("builds deterministic bounded succession summaries from the people-domain seam", () => {
    const one = buildSuccessionExperienceSurfaces(createNewRun("succession_summary_surfaces_v031"));
    const two = buildSuccessionExperienceSurfaces(createNewRun("succession_summary_surfaces_v031"));

    expect(one).toEqual(two);
    expect(one.succession_line_summary).toMatchObject({
      schema_version: SUCCESSION_LINE_SUMMARY_SCHEMA_VERSION,
      house_id: "h_player",
      entries: expect.arrayContaining([
        expect.objectContaining({
          person_id: expect.any(String),
          person_name: expect.any(String),
          line_position: expect.any(Number),
        }),
      ]),
    });
    expect(one.claimant_summary).toMatchObject({
      schema_version: CLAIMANT_SUMMARY_SCHEMA_VERSION,
      house_id: "h_player",
      entries: expect.arrayContaining([
        expect.objectContaining({
          claimant_person_id: expect.any(String),
          claimant_name: expect.any(String),
        }),
      ]),
    });
  });

  it("attaches succession summaries to preview_state and mirrors them on house for direct UI consumption", () => {
    const ctx = proposeTurn(createNewRun("succession_summary_preview_surface_v031"));
    const previewState: any = ctx.preview_state;

    expect(previewState.succession_line_summary).toMatchObject({
      schema_version: SUCCESSION_LINE_SUMMARY_SCHEMA_VERSION,
      house_id: "h_player",
      entries: expect.any(Array),
    });
    expect(previewState.claimant_summary).toMatchObject({
      schema_version: CLAIMANT_SUMMARY_SCHEMA_VERSION,
      house_id: "h_player",
      entries: expect.any(Array),
    });
    expect(previewState.house.succession_line_summary).toEqual(previewState.succession_line_summary);
    expect(previewState.house.claimant_summary).toEqual(previewState.claimant_summary);
    expect(previewState.succession_line_summary.entries[0]).toMatchObject({
      person_id: expect.any(String),
      person_name: expect.any(String),
      line_position: expect.any(Number),
    });
  });
});
