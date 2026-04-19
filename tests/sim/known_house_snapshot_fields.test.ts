import { describe, expect, it } from "vitest";

import { structuredHouseIdForPerson } from "../../src/sim/actors";
import { createNewRun, proposeTurn } from "../../src/sim";
import {
  HOUSE_DOSSIER_SUMMARY_SCHEMA_VERSION,
  buildKnownHouseExperienceSurfaces,
} from "../../src/sim/domains/people/knownHouseSummaries";
import { buildMarriageWindow } from "../../src/sim/domains/people/marriage";
import { getKnownHouses } from "../../src/ui/playViewModel";

describe("known-house snapshot fields", () => {
  it("builds deterministic known-house summaries and standing-vs-delta dossier contracts from the people registries", () => {
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
      knownness: expect.any(String),
      knownness_sources: expect.any(Array),
      relationship_summary: expect.objectContaining({
        favor_score: expect.any(Number),
        allegiance: expect.any(Number),
        respect: expect.any(Number),
        threat: expect.any(Number),
        standing_band: expect.any(String),
      }),
      relationship_turn_movement_count: expect.any(Number),
      relationship_turn_movement_rows: expect.any(Array),
      kinship_summary: expect.any(String),
      holdings_footprint: expect.objectContaining({
        holdings_count: expect.any(Number),
        holdings_band: expect.any(String),
      }),
      ledger_band: expect.any(String),
      ledger_trend: expect.any(String),
    });
    expect((one.house_dossiers[0] as any).relationship_band).toBeUndefined();

    const externalDossier = one.house_dossiers.find((dossier) => dossier.holdings_footprint.source_kind === "house_seed");

    expect(one.house_dossiers.every((dossier) => Array.isArray(dossier.holdings_footprint.known_manor_ids))).toBe(true);
    expect(externalDossier?.holdings_footprint.known_manor_ids).toEqual([]);
    expect(externalDossier?.holdings_footprint.source_kind).toBe("house_seed");
  });

  it("keeps active prospect houses backed by matching dossier rows", () => {
    const state = createNewRun("known_house_prospect_invariant_v035");
    const surfaces = buildKnownHouseExperienceSurfaces(state);
    const marriageWindow = buildMarriageWindow(state);

    for (const offer of marriageWindow?.offers ?? []) {
      const offerHouseId = structuredHouseIdForPerson(state, offer.house_person_id);
      expect(offerHouseId).toBeTruthy();
      expect(surfaces.house_dossiers.some((dossier) => dossier.house_id === offerHouseId)).toBe(true);
    }
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
