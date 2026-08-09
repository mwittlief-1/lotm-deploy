import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import {
  COURTOS_DOMAINS,
  COURTOS_RESPONSIBILITIES,
  courtOsResponsibilityLocation,
} from "../../src/ui/courtosInformationArchitecture";
import {
  COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES,
  responsibilityWorkspaceSource,
} from "../../src/ui/responsibilityWorkspaceCatalog";
import {
  courtOsResponsibilityRoute,
  courtOsRouteFromSearch,
  courtOsSearchForRoute,
} from "../../src/ui/courtosRoute";
import { ResponsibilityWorkspaceReadModel } from "../../src/server/courtos1120Api/responsibilityWorkspaceReadModel";
import { FoundationAResponsibilityWorkspaceProjection } from "../../src/server/courtos1120Api/responsibilityWorkspaceProjection";
import { RouteBar } from "../../src/ui/panels/HouseholdVerticalSlice";
import { buildCourtOsStewardshipPlanningProjection } from "../../src/ui/courtosStewardshipPlanningProjection";
import type { Household1120ReadOnlyProjection } from "../../src/ui/readModels/household1120/types";
import type { CourtOsSessionContextV1 } from "../../src/courtosSessionContext";
import type { CouncilRoomReadyProjectionV1 } from "../../src/ready/councilRoomReadyProjection";

const PEARWICK_HOUSE_ID = "t0h_bcae5bd911ab10f4c7fdfea0";

describe("CourtOS 24-responsibility UAT1 coverage", () => {
  it("owns every current responsibility exactly once across House Command and eight rooms", () => {
    expect(COURTOS_DOMAINS).toHaveLength(8);
    expect(COURTOS_RESPONSIBILITIES).toHaveLength(24);
    expect(COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES).toHaveLength(24);
    expect(new Set(COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES.map((row) => row.responsibility)).size).toBe(24);

    for (const responsibility of COURTOS_RESPONSIBILITIES) {
      const source = responsibilityWorkspaceSource(responsibility.key);
      expect(source.packageId).toMatch(/^[a-z0-9_]+$/);
      expect(source.currentState.length).toBeGreaterThan(20);
      expect(source.evidence.length).toBeGreaterThan(0);
      expect(source.boundary.length).toBeGreaterThan(20);

      const route = courtOsResponsibilityRoute({ responsibility: responsibility.key });
      const parsed = courtOsRouteFromSearch(courtOsSearchForRoute("", route));
      const location = courtOsResponsibilityLocation(responsibility.key);
      if (location.kind === "house_command") {
        expect(parsed.place.kind).toBe("house_command");
      } else {
        expect(parsed.place).toMatchObject({
          kind: "responsibility",
          domain: location.domain,
          responsibility: responsibility.key,
        });
      }
    }
  }, 60_000);

  it("binds every semantic source to an admitted Foundation A UAT1 package", async () => {
    const packageIds = new Set(
      COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES.map((row) => row.packageId),
    );
    for (const packageId of packageIds) {
      const manifest = JSON.parse(
        await readFile(resolve("data/genrun", packageId, "MANIFEST.json"), "utf8"),
      ) as { status?: string; release_status?: string };
      expect(manifest.status ?? manifest.release_status, packageId).toMatch(
        /^foundation_a_uat1_admitted_read_model/,
      );
    }
  });

  it("projects actual Pearwick rows from admitted domain packages without cross-House leakage", async () => {
    const reader = new ResponsibilityWorkspaceReadModel(process.cwd());
    const records = await reader.recordsForHouse(PEARWICK_HOUSE_ID, [
      "manor_hx_38958",
      "manor_hx_44835",
    ]);
    expect(records.length).toBeGreaterThan(0);
    expect(records.some((row) => row.responsibility_key === "marriage_dynasty_stewardship" && row.record_kind === "subject")).toBe(true);
    expect(records.some((row) => row.responsibility_key === "external_relations_representation" && row.record_kind === "target")).toBe(true);
    expect(records.some((row) => row.responsibility_key === "security_asset_protection")).toBe(true);
    expect(records.some((row) => row.responsibility_key === "estate_fabric_maintenance_oversight" && row.scope_id === "manor_hx_44835")).toBe(true);
    expect(records.every((row) => row.runtime_authority === false)).toBe(true);
    expect(records.every((row) => !row.source_package_id.includes("49_atom"))).toBe(true);
  }, 60_000);

  it("gives House Command and the Works workspace the same exact Pearwick project charge", async () => {
    const reader = new FoundationAResponsibilityWorkspaceProjection(resolve("data/genrun"));
    const workspace = await reader.projection({
      houseId: PEARWICK_HOUSE_ID,
      responsibility: "works_project_supervision",
    });
    await reader.close();
    const exactRows = workspace.rows.filter((row) => row.player_surface_eligible === true);
    expect(exactRows).toEqual([expect.objectContaining({
      scope_id: "impproj_step5ec_ae97998be6dae2",
      accountable_person_label: "Osmund Cooper",
    })]);

    const result = buildCourtOsStewardshipPlanningProjection({
      projection: {
        contract: { effective_date: "1120-01-01" },
        query: { house_id: PEARWICK_HOUSE_ID },
        responsibility_summary: [],
      } as unknown as Household1120ReadOnlyProjection,
      session: {
        selected_house_id: PEARWICK_HOUSE_ID,
        capabilities: { manage_assignments: true },
        acting_actor: { status: "house_head", person_id: "t0p_head", authority_basis: "head-authority" },
      } as unknown as CourtOsSessionContextV1,
      council: {
        house_ref: { entity_id: PEARWICK_HOUSE_ID },
        head_ref: { entity_id: "t0p_head", display_name: "Head" },
      } as unknown as CouncilRoomReadyProjectionV1,
      authority_source_generation_id: "authority-generation",
      workspace_assignment_rows: exactRows.map((row) => ({
        responsibility_id: "works_project_supervision" as const,
        source_record_id: [
          workspace.source_binding.package_id,
          workspace.source_binding.source_digest,
          row.source_table,
          row.scope_id ?? row.subject_id,
          row.accountable_person_id,
        ].join("::"),
        row,
      })),
    });

    expect(result.responsibilities.find(
      (responsibility) => responsibility.responsibility_id === "works_project_supervision",
    )?.scopes).toEqual([expect.objectContaining({
      scope_id: "impproj_step5ec_ae97998be6dae2",
      current_holder: expect.objectContaining({ display_name: "Osmund Cooper" }),
    })]);
  }, 60_000);

  it("keeps Council, House Command, and the owning room reachable from every responsibility", () => {
    for (const responsibility of COURTOS_RESPONSIBILITIES) {
      const route = courtOsResponsibilityRoute({ responsibility: responsibility.key });
      const html = renderToStaticMarkup(
        React.createElement(RouteBar, {
          route,
          selectedManor: null,
          onCouncil: () => undefined,
          onHouseCommand: () => undefined,
          onDomain: () => undefined,
        }),
      );
      const visibleText = html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&");

      expect(visibleText, responsibility.key).toContain("Council Room");
      expect(visibleText, responsibility.key).toContain("House Command");
      if (route.place.kind === "responsibility") {
        const domain = COURTOS_DOMAINS.find((item) => item.key === route.place.domain);
        expect(visibleText, responsibility.key).toContain(domain?.label);
      }
    }
  });
});
