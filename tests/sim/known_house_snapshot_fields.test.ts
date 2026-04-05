import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import {
  HOUSE_DOSSIER_SUMMARY_SCHEMA_VERSION,
  buildKnownHouseExperienceSurfaces,
} from "../../src/sim/domains/people/knownHouseSummaries";
import { getKnownHouses } from "../../src/ui/playViewModel";

describe("known-house snapshot fields", () => {
  it("builds deterministic known-house summaries and coarse dossiers from the people registries", () => {
    const state = createNewRun("known_house_snapshot_fields_v031");

    const one = buildKnownHouseExperienceSurfaces(state);
    const two = buildKnownHouseExperienceSurfaces(createNewRun("known_house_snapshot_fields_v031"));

    expect(one.known_houses).toEqual(two.known_houses);
    expect(one.house_dossiers).toEqual(two.house_dossiers);
    expect(one.known_houses.length).toBeGreaterThan(0);
    expect(one.known_houses[0]).toMatchObject({
      house_id: expect.any(String),
      house_name: expect.any(String),
      head_name: expect.any(String),
      heir_indicator: expect.any(String),
    });
    expect(one.house_dossiers[0]).toMatchObject({
      schema_version: HOUSE_DOSSIER_SUMMARY_SCHEMA_VERSION,
      relationship_band: expect.any(String),
      kinship_summary: expect.any(String),
    });
  });

  it("attaches known-house summaries to preview_state so the view-model can consume them directly", () => {
    const ctx = proposeTurn(createNewRun("known_house_preview_surface_v031"));
    const previewState: any = ctx.preview_state;

    expect(Array.isArray(previewState.known_houses)).toBe(true);
    expect(Array.isArray(previewState.house_dossiers)).toBe(true);
    expect(previewState.house.known_houses).toEqual(previewState.known_houses);
    expect(previewState.house.house_dossiers).toEqual(previewState.house_dossiers);

    const knownHouses = getKnownHouses(previewState, previewState.known_houses);
    expect(knownHouses.length).toBeGreaterThan(0);
    expect(knownHouses[0]).toMatchObject({
      house_id: expect.any(String),
      house_name: expect.any(String),
    });
    expect(
      knownHouses.some(
        (house) =>
          house?.relationship &&
          typeof house.relationship.allegiance === "number" &&
          typeof house.relationship.respect === "number" &&
          typeof house.relationship.threat === "number"
      )
    ).toBe(true);
  });
});
