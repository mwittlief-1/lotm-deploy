import { describe, expect, it } from "vitest";

import {
  compactResponsibilityEvidenceReferences,
  FoundationAResponsibilityWorkspaceProjection,
} from "../../src/server/courtos1120Api/responsibilityWorkspaceProjection";
import { COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES } from "../../src/ui/responsibilityWorkspaceCatalog";

const PLAYER_HOUSE = "t0h_bcae5bd911ab10f4c7fdfea0";

function openProjection(): FoundationAResponsibilityWorkspaceProjection {
  return new FoundationAResponsibilityWorkspaceProjection(`${process.cwd()}/data/genrun`);
}

describe("Foundation A responsibility workspace package projection", () => {
  it("rejects undeclared source and reason-like fields at the compact evidence boundary", () => {
    expect(compactResponsibilityEvidenceReferences({
      assignment_basis: "recorded basis",
      source_status: "admitted",
      source_secret_note: "must not cross",
      reason_private_annotation: "must not cross",
    })).toEqual([
      { field: "assignment_basis", value: "recorded basis" },
      { field: "source_status", value: "admitted" },
    ]);
  });
  it("projects every canonical responsibility without admitting a noncanonical key", async () => {
    const reader = openProjection();
    try {
      const results = await Promise.all(
        COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES.map((source) =>
          reader.projection({ houseId: PLAYER_HOUSE, responsibility: source.responsibility }),
        ),
      );
      expect(results).toHaveLength(24);
      expect(new Set(results.map((row) => row.query.responsibility)).size).toBe(24);
      expect(results.filter((row) => row.source_binding.source_owned)).toHaveLength(20);
      expect(results.some((row) => row.query.responsibility === ("verification_synthesis" as never))).toBe(false);
    } finally {
      await reader.close();
    }
  }, 60_000);

  it("returns exact House-scoped physical manor rows without command authority", async () => {
    const projection = openProjection();
    try {
      const result = await projection.projection({
        houseId: PLAYER_HOUSE,
        responsibility: "estate_fabric_maintenance_oversight",
      });
      expect(result.row_count).toBeGreaterThan(0);
      expect(result.source_binding.source_owned).toBe(true);
      expect(result.source_binding.source_digest).toMatch(/^[a-f0-9]{64}$/);
      expect(result.rows.some((row) => row.scope_id === "manor_hx_38958")).toBe(true);
      expect(result.rows.some((row) => row.scope_id === "manor_hx_44835")).toBe(true);
      expect(result.rows.every((row) => !("source" in row))).toBe(true);
      expect(JSON.stringify(result.rows)).not.toContain("runtime_authority");
      expect(JSON.stringify(result.rows)).not.toContain("governing_actor_id");
      expect(JSON.stringify(result.rows)).not.toContain("t0h_12616e8f45a5184e190ee390");
    } finally {
      await projection.close();
    }
  }, 60_000);

  it("keeps conditional-empty and withheld workspaces explicit", async () => {
    const projection = openProjection();
    try {
      const [churchRights, revenueRights, reception] = await Promise.all([
        projection.projection({ houseId: PLAYER_HOUSE, responsibility: "church_rights_institutional_affairs" }),
        projection.projection({ houseId: PLAYER_HOUSE, responsibility: "revenue_right_administration_collection" }),
        projection.projection({ houseId: PLAYER_HOUSE, responsibility: "reception_intake" }),
      ]);
      expect(churchRights.workspace.posture).toBe("conditional_empty");
      expect(churchRights.rows.length).toBeGreaterThan(0);
      expect(churchRights.rows.every((row) => !("source" in row))).toBe(true);
      expect(revenueRights.workspace.posture).toBe("conditional_empty");
      expect(revenueRights.rows.every((row) => row.state !== "admitted_runtime_fact")).toBe(true);
      expect(reception.workspace.posture).toBe("withheld_fail_closed");
      expect(reception.rows.some((row) => row.state === "withheld_structural_only")).toBe(true);
    } finally {
      await projection.close();
    }
  }, 60_000);

  it("exposes only allow-listed exact Works assignment fields and eligibility", async () => {
    const projection = openProjection();
    try {
      const result = await projection.projection({
        houseId: PLAYER_HOUSE,
        responsibility: "works_project_supervision",
      });
      expect(result.rows.some((row) =>
        row.scope_id === "impproj_step5ec_ae97998be6dae2" &&
        row.player_surface_eligible === true &&
        row.accountable_person_id === "t0p_634b3b2d64f59e43d39ed93c"
      )).toBe(true);
      expect(JSON.stringify(result.rows)).not.toContain("owner_selector");
    } finally {
      await projection.close();
    }
  }, 60_000);

  it("does not rebind Household-owned responsibilities to the eight new packages", async () => {
    const projection = openProjection();
    const result = await projection.projection({
      houseId: PLAYER_HOUSE,
      responsibility: "education_formation",
    });
    expect(result.source_binding).toMatchObject({
      package_id: "foundation_a_household_uat1_release_v1",
      source_digest: null,
      source_owned: false,
      source_status: "existing_household_projection_owned",
    });
    expect(result.rows).toEqual([]);
    await projection.close();
  });
});
