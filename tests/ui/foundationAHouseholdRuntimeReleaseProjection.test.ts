import path from "node:path";

import { describe, expect, it } from "vitest";

import { FoundationAHouseholdUat1ReleaseProjection } from "../../src/ui/readModels/householdFoundationA/uat1ReleaseProjection";

const root = process.cwd();
const releaseManifest = path.join(
  root,
  "data/genrun/foundation_a_household_uat1_release_v1/MANIFEST.json",
);

describe("Foundation A Household UAT1 release projection", () => {
  it("consumes the frozen UAT1 release with provisional fuzzy Education reports while keeping UAT2-only modules absent", async () => {
    const release = await FoundationAHouseholdUat1ReleaseProjection.open(releaseManifest);
    try {
      const projection = await release.projection({
        houseId: "t0h_1ed8d543f12b387ed751f1a6",
        householdEntityId: "t0h_1ed8d543f12b387ed751f1a6",
      });
      expect(projection.schema_version).toBe("foundation_a_household_uat1_release_v1");
      expect(projection.membership_context.length).toBeGreaterThan(0);
      expect(projection.adult_kin_roster.every((row) => row.roster_state !== "withheld")).toBe(true);
      expect(projection.adult_kin_roster.every(
        (row) =>
          row.support_eligibility === "managed_adult_kin" &&
          Boolean(row.classification_reason) &&
          Boolean(row.primary_support_basis) &&
          Boolean(row.manager_person_id) &&
          !row.linked_governing_domain,
      )).toBe(true);
      expect(projection.education_plans.every((row) => row.knowledge_state === "provisional_uat1_fuzzy_report_available_to_responsible_party")).toBe(true);
      expect(projection.education_plans.every(
        (row) => row.contract_state === "active_uat_formation_arrangement",
      )).toBe(true);
      expect(projection.stores_positions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          position_kind: "house_position",
          availability_posture: "available",
          source_effective_date: "start_of_1116_after_1115_harvest_allocation_before_1116_flows",
        }),
      ]));
      expect(projection.stores_history).toEqual([]);
      expect(projection.education_cycle_reports.length).toBe(projection.education_plans.length);
      expect(projection.education_cycle_reports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          report_delivery_route: expect.any(String),
          progress_interpretation: expect.any(String),
          progress_course_interpretation: expect.any(String),
          disclosure_posture: "provisional_uat1_fuzzy_report_no_raw_score_or_prose",
        }),
      ]));
      expect(projection.matters).toEqual([]);
      expect(projection.provenance).toEqual(expect.arrayContaining([
        expect.objectContaining({
          record_key: "ro_household_stores_position_v1",
          admission_state: "projected_read_ready",
          row_count: projection.stores_positions.length,
        }),
      ]));
    } finally {
      await release.close();
    }
  });

  it("fails closed when pointed at a non-release manifest", async () => {
    const candidateManifest = path.join(
      root,
      "data/genrun/phase_five_household_foundation_a_uat_candidate_v1/MANIFEST.json",
    );
    await expect(
      FoundationAHouseholdUat1ReleaseProjection.open(candidateManifest),
    ).rejects.toThrow("Foundation A Household UAT1 release manifest failed its contract");
  });

  it("exposes the four Household responsibility assignments without importing the legacy atom bank", async () => {
    const release = await FoundationAHouseholdUat1ReleaseProjection.open(releaseManifest);
    try {
      const projection = await release.projection({
        houseId: "t0h_bcae5bd911ab10f4c7fdfea0",
        householdEntityId: "t0h_bcae5bd911ab10f4c7fdfea0",
      });
      expect(projection.responsibility_summary.map((row) => row.source_legacy_responsibility_id).sort()).toEqual([
        "courtos.responsibility.adult_kin_support",
        "courtos.responsibility.education_formation",
        "courtos.responsibility.household_service_care",
        "courtos.responsibility.household_stores_provisioning_procurement",
      ]);
      expect(projection.health_cycle_reports.length).toBeLessThanOrEqual(
        projection.health_roster.length,
      );
    } finally {
      await release.close();
    }
  });

  it("projects bound static Stores detail without manufacturing receipts or a protected-manor ID", async () => {
    const release = await FoundationAHouseholdUat1ReleaseProjection.open(releaseManifest);
    try {
      const projection = await release.projection({
        houseId: "t0h_bcae5bd911ab10f4c7fdfea0",
        householdEntityId: "t0h_bcae5bd911ab10f4c7fdfea0",
      });
      expect(projection.stores_positions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          position_kind: "house_position",
          resource_id: "food",
          availability_posture: "available",
          source_effective_date: "start_of_1116_after_1115_harvest_allocation_before_1116_flows",
        }),
        expect.objectContaining({
          position_kind: "food_capacity",
          resource_id: "food",
          manor_id: expect.any(String),
          capacity_id: expect.any(String),
        }),
      ]));
      expect(projection.stores_history).toEqual([]);
      expect(projection.stores_positions.every((row) => row.manor_id === undefined || row.manor_id === null || row.manor_id.startsWith("manor_hx_"))).toBe(true);
    } finally {
      await release.close();
    }
  });

  it("projects the admitted responsible-manager Health summaries where the House has them", async () => {
    const release = await FoundationAHouseholdUat1ReleaseProjection.open(releaseManifest);
    try {
      const projection = await release.projection({
        houseId: "t0h_bcae5bd911ab10f4c7fdfea0",
        householdEntityId: "t0h_bcae5bd911ab10f4c7fdfea0",
      });
      expect(projection.health_cycle_reports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          report_state: "completed_cycle_assessed_report",
          current_presentation: expect.any(String),
          course_since_last_report: expect.any(String),
          prior_care_reading: expect.any(String),
          disclosure_posture: "responsible_household_manager_summary_only",
        }),
      ]));
    } finally {
      await release.close();
    }
  });
});
