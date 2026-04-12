import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildKnownHouseExperienceSurfaces } from "../../src/sim/domains/people/knownHouseSummaries";
import { buildHouseDossierSurface } from "../../src/ui/houseDossierView";

const DOSSIER_DEBUG_KEYS = [
  "schema_version",
  "house_id",
  "house_name",
  "tier",
  "relevance_tier",
  "relevance_reasons",
  "knownness",
  "knownness_sources",
  "kinship_summary",
  "kinship_tags",
  "relationship_band",
  "relationship_summary",
  "household_scope",
  "household_member_count",
  "living_member_count",
  "child_count",
  "has_male_heir",
  "heiress_possible",
  "holdings_count",
  "holdings_band",
  "anchor_manor_id",
  "known_manor_ids",
  "source_kind",
  "ledger_band",
  "ledger_trend"
] as const;

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

function attachProspectsWindow(state: Record<string, unknown>, prospectsWindow: unknown): void {
  Object.defineProperty(state, "prospects_window", {
    value: prospectsWindow,
    enumerable: false,
    configurable: true,
    writable: true
  });
}

function compactDossier(surface: ReturnType<typeof buildHouseDossierSurface>) {
  if (!surface) return null;

  return {
    house_id: surface.houseId,
    house_name: surface.houseName,
    knownness_label: surface.knownnessLabel,
    knownness_sources: surface.knownnessSources,
    tier_label: surface.tierLabel,
    relevance_tier_label: surface.relevanceTierLabel,
    relationship_band_label: surface.relationshipBandLabel,
    holdings_count: surface.holdingsCount,
    ledger_band_label: surface.ledgerBandLabel,
    household_member_count: surface.householdMemberCount,
    debug_keys: surface.debugRows.map((row) => row.key)
  };
}

function buildHouseDossierFixture(): string {
  const knownState = createNewRun("house_dossier_fixture_v035");
  const knownCtx = proposeTurn(knownState);
  const knownId = (knownCtx.preview_state.house_dossiers ?? []).find((dossier) => dossier.knownness === "known_house")?.house_id;

  const marriageState = createNewRun("marriage_dossier_fixture_v035") as Record<string, unknown>;
  const marriageCtx = proposeTurn(marriageState as any);
  attachProspectsWindow(marriageState, marriageCtx.prospects_window);
  const marriageSurfaces = buildKnownHouseExperienceSurfaces(marriageState as any);
  const marriageProspect = (marriageCtx.prospects_window?.prospects ?? []).find((prospect) => prospect.type === "marriage") ?? null;

  const grantState = createNewRun("grant_dossier_fixture_v035") as any;
  grantState.manor.obligations.arrears.coin = 10;
  grantState.manor.obligations.arrears.bushels = 0;
  const grantCtx = proposeTurn(grantState);
  attachProspectsWindow(grantState, grantCtx.prospects_window);
  const grantSurfaces = buildKnownHouseExperienceSurfaces(grantState);
  const grantProspect = (grantCtx.prospects_window?.prospects ?? []).find((prospect) => prospect.type === "grant") ?? null;

  return `${JSON.stringify(
    {
      known_house: compactDossier(buildHouseDossierSurface(knownCtx.preview_state, knownId)),
      marriage_prospect: {
        prospect: {
          from_house_id: marriageProspect?.from_house_id ?? null,
          to_house_id: marriageProspect?.to_house_id ?? null
        },
        dossier: compactDossier(
          buildHouseDossierSurface({ house_dossiers: marriageSurfaces.house_dossiers } as any, marriageProspect?.from_house_id ?? null)
        )
      },
      grant_prospect: {
        prospect: {
          from_house_id: grantProspect?.from_house_id ?? null,
          to_house_id: grantProspect?.to_house_id ?? null
        },
        dossier: compactDossier(
          buildHouseDossierSurface({ house_dossiers: grantSurfaces.house_dossiers } as any, grantProspect?.from_house_id ?? null)
        )
      }
    },
    null,
    2
  )}\n`;
}

function buildProspectPreview(seed: string, mutate?: (state: any) => void) {
  const state = createNewRun(seed) as any;
  mutate?.(state);
  const ctx = proposeTurn(state);
  attachProspectsWindow(state, ctx.prospects_window);
  const surfaces = buildKnownHouseExperienceSurfaces(state);
  return {
    preview: { house_dossiers: surfaces.house_dossiers } as any,
    prospects: (ctx.prospects_window?.prospects ?? []).filter((prospect) => prospect.type === "marriage" || prospect.type === "grant")
  };
}

describe("house dossier fixtures", () => {
  it("matches the deterministic known and prospect dossier fixture", () => {
    const expected = readFixture("house_dossier_snapshot_v0.3.5.json");

    expect(buildHouseDossierFixture()).toBe(expected);
    expect(buildHouseDossierFixture()).toBe(buildHouseDossierFixture());
  });

  it("resolves every grant and marriage prospect house to a populated dossier surface", () => {
    const cases = [
      buildProspectPreview("marriage_dossier_fixture_v035"),
      buildProspectPreview("grant_dossier_fixture_v035", (state) => {
        state.manor.obligations.arrears.coin = 10;
        state.manor.obligations.arrears.bushels = 0;
      })
    ];

    for (const testCase of cases) {
      expect(testCase.prospects.length).toBeGreaterThan(0);

      for (const prospect of testCase.prospects) {
        const houseIds = [prospect.from_house_id, prospect.to_house_id].filter(
          (houseId): houseId is string => typeof houseId === "string" && houseId.length > 0 && houseId !== "h_player"
        );

        expect(houseIds.length).toBeGreaterThan(0);

        for (const houseId of houseIds) {
          const surface = buildHouseDossierSurface(testCase.preview, houseId);

          expect(surface).not.toBeNull();
          expect(surface?.houseId).toBe(houseId);
          expect(surface?.knownnessLabel).toContain("Prospect");
          expect(surface?.debugRows.map((row) => row.key)).toEqual([...DOSSIER_DEBUG_KEYS]);
        }
      }
    }
  });
});
