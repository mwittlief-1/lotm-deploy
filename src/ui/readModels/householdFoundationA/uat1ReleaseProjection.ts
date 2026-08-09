import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../world1116/sqliteReadonlyDriver";
import type {
  Household1120AdultKinArrangementRow,
  Household1120AdultKinRosterRow,
  Household1120CareArrangementRow,
  Household1120EducationLearnerPlanRow,
  Household1120EducationCycleReportRow,
  Household1120HealthRosterRow,
  Household1120MembershipRow,
  Household1120ProvenanceRow,
  Household1120ReadOnlyProjection,
  Household1120ResponsibilityRow,
  Household1120StoresPositionRow,
} from "../household1120/types";
import { resolveManifestArtifactPath } from "./manifestArtifactPath";

export const FOUNDATION_A_HOUSEHOLD_UAT1_RELEASE_ID =
  "foundation_a_household_uat1_release_v1" as const;

interface Uat1ReleaseManifest {
  package_id: typeof FOUNDATION_A_HOUSEHOLD_UAT1_RELEASE_ID;
  schema_version: typeof FOUNDATION_A_HOUSEHOLD_UAT1_RELEASE_ID;
  generation_id: string;
  effective_date: "1120-01-01";
  release_status: "foundation_a_uat1_admitted_read_model";
  source_inputs: readonly { role: string; path: string; sha256: string }[];
  module_dispositions: Record<string, string>;
  artifact: { path: string; sha256: string };
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function sha256File(file: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolvePromise, reject) => {
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

function assertManifest(value: unknown): asserts value is Uat1ReleaseManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Foundation A Household UAT1 release manifest must be an object.");
  }
  const manifest = value as Partial<Uat1ReleaseManifest>;
  if (
    manifest.package_id !== FOUNDATION_A_HOUSEHOLD_UAT1_RELEASE_ID ||
    manifest.schema_version !== FOUNDATION_A_HOUSEHOLD_UAT1_RELEASE_ID ||
    manifest.effective_date !== "1120-01-01" ||
    manifest.release_status !== "foundation_a_uat1_admitted_read_model" ||
    !manifest.generation_id ||
    !manifest.artifact?.path ||
    !/^[a-f0-9]{64}$/.test(manifest.artifact.sha256) ||
    !Array.isArray(manifest.source_inputs) ||
    manifest.source_inputs.length < 4 ||
    !manifest.module_dispositions
  ) {
    throw new Error("Foundation A Household UAT1 release manifest failed its contract.");
  }
  const required = {
    membership: "admitted_foundation_a_uat",
    adult_kin: "admitted_foundation_a_uat_resolved_rows_only",
    service_care: "admitted_foundation_a_uat_manager_bound_house_scope",
    education_arrangements: "admitted_foundation_a_uat",
    responsibility_authority: "admitted_foundation_a_uat_resolved_household_scope",
    house_manor_scope: "admitted_foundation_a_uat_read_only",
    stores_static_opening_positions: "admitted_foundation_a_uat_static_read_only",
    education_progress_reports: "provisional_admitted_foundation_a_uat1_fuzzy_only",
    health_cycle_receipts: "provisional_admitted_foundation_a_uat1_internal_only",
    health_cycle_reports: "provisional_admitted_foundation_a_uat1_deterministic_manager_summary",
    matters: "opening_empty",
  } as const;
  for (const [key, expected] of Object.entries(required)) {
    if (manifest.module_dispositions[key] !== expected) {
      throw new Error(`Foundation A Household UAT1 release has an unsafe ${key} disposition.`);
    }
  }
}

function boundary(sourceStatus: string, disclosurePosture = "foundation_a_uat1_read_projection") {
  return {
    effective_date: "1120-01-01",
    source_authority_status: sourceStatus,
    runtime_authority: 0 as const,
    disclosure_posture: disclosurePosture,
  };
}

/**
 * The Adult Kin room is a managed-accountability roster, not a resident or
 * demand roster. Keep this validation at release-open time so a malformed
 * package cannot quietly turn an office, dower, care, or education case into
 * a Household responsibility.
 */
async function assertAdultKinClassification(
  driver: World1116ReadonlySqliteDriver,
): Promise<void> {
  const rows = await driver.all<{ invalid_count: number }>(`
    SELECT COUNT(*) AS invalid_count
    FROM household_adult_kin_v1
    WHERE adult_kin_posture = 'managed_adult_kin'
      AND (
        TRIM(COALESCE(classification_reason, '')) = ''
        OR TRIM(COALESCE(primary_support_basis, '')) = ''
        OR TRIM(COALESCE(manager_person_id, '')) = ''
        OR TRIM(COALESCE(linked_governing_domain, '')) <> ''
      )
  `);
  if (Number(rows[0]?.invalid_count ?? 0) !== 0) {
    throw new Error("Foundation A Household UAT1 Adult Kin classification is incomplete or crosses a governing domain.");
  }
}

/**
 * Player-planning UAT reader for the current module-admitted Household state.
 * It is deliberately read-only: a UAT1 release cannot manufacture UAT2
 * simulator lifecycle facts, raw education receipts, Matters, custody, or routes.
 * Its Education reports are a separately disclosed provisional UAT1 backcast.
 */
export class FoundationAHouseholdUat1ReleaseProjection {
  private constructor(
    private readonly manifest: Uat1ReleaseManifest,
    private readonly driver: World1116ReadonlySqliteDriver,
  ) {}

  static async open(manifestPath: string): Promise<FoundationAHouseholdUat1ReleaseProjection> {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    assertManifest(manifest);
    const databasePath = resolveManifestArtifactPath(manifestPath, manifest.artifact.path);
    if ((await sha256File(databasePath)) !== manifest.artifact.sha256) {
      throw new Error("Foundation A Household UAT1 SQLite SHA mismatch.");
    }
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    await assertAdultKinClassification(driver);
    return new FoundationAHouseholdUat1ReleaseProjection(manifest, driver);
  }

  async projection(input: { householdEntityId: string; houseId: string }): Promise<Household1120ReadOnlyProjection> {
    const houseId = input.houseId.trim();
    const householdEntityId = input.householdEntityId.trim();
    if (!houseId || !householdEntityId) throw new Error("Foundation A Household UAT1 requires House and Household identifiers.");
    const house = sqlString(houseId);
    const membership = await this.driver.all<Record<string, string | null>>(`
      SELECT * FROM household_membership_v1 WHERE house_id=${house} ORDER BY person_name, person_id
    `);
    if (!membership.length) throw new Error("Foundation A Household UAT1 has no admitted membership for the selected House.");
    if (new Set(membership.map((row) => row.household_entity_id)).size !== 1) {
      throw new Error("Foundation A Household UAT1 membership has no single admitted Household scope.");
    }
    const [authority, adultKin, arrangements, education, educationReports, health, healthReports, care, stores, foodCapacity] = await Promise.all([
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_responsibility_authority_v1 WHERE house_id=${house} ORDER BY responsibility_key, authority_assignment_id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_adult_kin_v1 WHERE house_id=${house} AND adult_kin_posture='managed_adult_kin' ORDER BY person_name, person_id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_support_arrangement_v1 WHERE accountable_house_id=${house} ORDER BY id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_education_arrangement_v1 WHERE house_id=${house} ORDER BY learner_name, learner_person_id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_education_cycle_report_uat1_v1 WHERE learner_house_id=${house} ORDER BY learner_person_id, education_assignment_id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_service_care_roster_v1 WHERE house_id=${house} ORDER BY person_name, health_condition_id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_health_cycle_report_uat1_v1 WHERE house_id=${house} ORDER BY person_id, household_health_roster_id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_specialized_care_commitment_v1 WHERE recipient_house_id=${house} ORDER BY recipient_person_name, id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_stores_position_v1 WHERE house_id=${house} ORDER BY resource_id, id`),
      this.driver.all<Record<string, string | null>>(`SELECT * FROM household_manor_food_capacity_v1 WHERE house_id=${house} ORDER BY manor_id, id`),
    ]);

    const membershipContext: Household1120MembershipRow[] = membership.map((row) => ({
      protected_person_id: row.person_id!, display_name: row.person_name!, life_state: "membership_projection_at_opening",
      birth_year: row.age_turn0 ? 1120 - Number(row.age_turn0) : null, death_year: null,
      endpoint_house_protected_id: row.house_id ?? null, endpoint_house_label: null,
      primary_residence_id: row.residence_entity_id ?? null, primary_residence_label: row.residence_label ?? null,
      residence_state: row.current_resident === "true" ? "current_resident" : "not_current_resident",
      father_person_id: null, mother_person_id: null, current_union_id: null,
      kinship_source_status: `member=${row.house_member}; supported=${row.house_supported}`,
      relationship_projection_state: "foundation_a_uat1_membership_projection",
      ...boundary(row.source_status ?? "admitted_foundation_a_uat", row.disclosure_posture ?? undefined),
    }));
    const responsibilitySummary: Household1120ResponsibilityRow[] = authority.map((row) => ({
      responsibility_summary_id: row.authority_assignment_id!, responsibility_demand_id: row.authority_assignment_id!,
      demand_entity_id: householdEntityId, demand_entity_label: null,
      responsibility_id: `sr_${row.responsibility_key!.replace("courtos.responsibility.", "")}`,
      responsibility_label: row.responsibility_label!, source_legacy_responsibility_id: row.responsibility_key!,
      source_legacy_responsibility_label: row.responsibility_label!, demand_state: "foundation_a_uat1_opening_assignment",
      coverage_state: "accountable_owner_resolved", holder_person_id: row.accountable_owner_person_id ?? null,
      holder_display_name: row.accountable_owner_person_name ?? null, authority_posture: row.admission_disposition ?? "admitted_foundation_a_uat",
      ...boundary(row.source_truth_status ?? "admitted_foundation_a_uat"),
    }));
    const adultKinRoster: Household1120AdultKinRosterRow[] = adultKin.map((row) => ({
      support_roster_id: row.id!, household_entity_id: row.household_entity_id!, person_id: row.person_id!,
      roster_state: row.adult_kin_posture ?? "resolved_managed_adult_kin",
      support_eligibility: "managed_adult_kin",
      classification_reason: row.classification_reason,
      linked_governing_domain: row.linked_governing_domain,
      primary_support_basis: row.primary_support_basis,
      independence_qualifier: row.independence_qualifier,
      manager_person_id: row.manager_person_id,
      manager_person_name: row.manager_person_name,
      residence_label: row.residence_label,
      ...boundary(row.source_status ?? "admitted_foundation_a_uat"),
    }));
    const arrangementByPerson = new Map<string, Record<string, string | null>>();
    for (const row of arrangements) for (const personId of JSON.parse(row.member_person_ids ?? "[]") as string[]) arrangementByPerson.set(personId, row);
    const adultKinArrangements: Household1120AdultKinArrangementRow[] = adultKin.map((row) => {
      const arrangement = arrangementByPerson.get(row.person_id!);
      return {
        support_arrangement_id: row.arrangement_id ?? arrangement?.id ?? row.id!, person_id: row.person_id!,
        responsible_party_id: row.manager_person_id ?? arrangement?.manager_person_id ?? "withheld_manager_identity",
        commitment_id: row.arrangement_id ?? arrangement?.id ?? row.id!,
        arrangement_state: row.primary_support_basis ?? arrangement?.primary_support_basis ?? "resolved_support_arrangement",
        ...boundary(row.source_status ?? "admitted_foundation_a_uat"),
      };
    });
    const educationReportByAssignment = new Map(educationReports.map((row) => [row.education_assignment_id, row]));
    const educationPlans: Household1120EducationLearnerPlanRow[] = education.map((row) => ({
      education_assignment_id: row.education_assignment_id!, learner_person_id: row.learner_person_id!, learner_name: row.learner_name!,
      learner_age_turn0: row.learner_age_turn0 ? Number(row.learner_age_turn0) : null, learner_age_band: row.learner_age_band ?? null,
      learner_house_id: row.house_id ?? null, learner_house_name: row.house_name ?? null, learner_house_class: null,
      recommended_track_id: row.track_id!, recommended_track: row.track_label!, setting_type: row.setting_type!,
      setting_entity: row.host_entity ?? row.host_or_guardian_name ?? null, primary_provider_person_id: row.provider_person_id ?? null,
      primary_provider_name: row.provider_name ?? null, responsible_party_person_id: row.responsible_party_person_id ?? null,
      responsible_party_name: row.responsible_party_name ?? null, review_date: null,
      // The frozen UAT1 release admits every row in this table as an active
      // formation arrangement. Earlier candidate labels such as
      // `no_contract_row_created_profile_only` describe the pre-admission
      // source stage and must not override the release disposition.
      contract_state: "active_uat_formation_arrangement",
      capacity_availability_state: "provider_capacity_not_modeled_in_uat", knowledge_state: educationReportByAssignment.has(row.education_assignment_id)
        ? "provisional_uat1_fuzzy_report_available_to_responsible_party"
        : "progress_withheld_pending_knowledge_safe_report_projection",
      ...boundary(row.source_status ?? "admitted_foundation_a_uat", educationReportByAssignment.has(row.education_assignment_id)
        ? "education_arrangement_with_provisional_uat1_fuzzy_report"
        : "education_arrangement_admitted_progress_withheld"),
    }));
    const educationCycleReports: Household1120EducationCycleReportRow[] = educationReports.map((row) => ({
      cycle_report_id: row.id!, learner_person_id: row.learner_person_id!, cycle_year: 1119,
      report_state: row.report_state!, report_delivery_route: row.report_delivery_route ?? undefined,
      progress_interpretation: row.progress_interpretation ?? undefined,
      progress_course_interpretation: row.progress_course_interpretation ?? undefined,
      annual_receipt_count: row.annual_receipt_count ? Number(row.annual_receipt_count) : 0,
      assignment_continuity_basis: row.assignment_continuity_basis ?? undefined,
      ...boundary(row.assertion_status ?? "foundation_a_uat1_provisional_backcast_not_observed_history", row.disclosure_posture ?? "provisional_uat1_fuzzy_report_no_raw_score_or_prose"),
    }));
    const healthRoster: Household1120HealthRosterRow[] = health.map((row) => ({
      health_roster_id: row.id!, person_id: row.person_id!, condition_id: row.health_condition_id!, severity_state: row.overall_state!,
      ...boundary(row.source_status ?? "admitted_foundation_a_uat", row.disclosure_posture ?? undefined),
    }));
    const healthCycleReports = healthReports.map((row) => ({
      health_cycle_report_id: row.id!, person_id: row.person_id!, cycle_year: 1119,
      report_state: "completed_cycle_assessed_report", health_condition_id: row.health_condition_id ?? undefined,
      current_presentation: row.current_presentation ?? undefined,
      course_since_last_report: row.course_since_last_report ?? undefined,
      household_consequence: row.household_consequence ?? undefined,
      prior_care_reading: row.prior_care_reading ?? undefined,
      current_care_arrangement: row.current_care_arrangement ?? undefined,
      review_prompt: row.review_prompt ?? undefined, evidence_label: row.evidence_label ?? undefined,
      evidence_attribution: row.evidence_attribution ?? undefined,
      ...boundary(row.assertion_status ?? "foundation_a_uat1_provisional_backcast_not_observed_history", row.report_disclosure_posture ?? "responsible_household_manager_summary_only"),
    }));
    const careArrangements: Household1120CareArrangementRow[] = care.map((row) => ({
      care_arrangement_id: row.id!, person_id: row.recipient_person_id!, commitment_id: row.id!, provider_id: row.provider_person_id ?? null,
      arrangement_state: row.coverage_state!, ...boundary(row.source_status ?? "admitted_foundation_a_uat"),
    }));
    const storesPositions: Household1120StoresPositionRow[] = [
      ...stores.map((row) => ({
        stores_position_id: row.id!, household_entity_id: householdEntityId, resource_id: row.resource_id!,
        quantity_integer: Number(row.quantity_units), position_state: row.availability_posture ?? "provisional_uat_opening_available",
        custody_id: null, capacity_id: null, position_kind: "house_position" as const,
        availability_posture: "available" as const, source_effective_date: row.source_cutpoint ?? "1116-01-01",
        projection_generation_id: this.manifest.generation_id,
        ...boundary(row.source_status ?? "admitted_foundation_a_uat_static_read_only", "provisional_uat_planning_position_no_historical_receipt_claim"),
      })),
      ...foodCapacity.map((row) => ({
        stores_position_id: row.id!, household_entity_id: householdEntityId, resource_id: "food",
        quantity_integer: Number(row.food_capacity_units), position_state: "manor_food_capacity",
        custody_id: null, capacity_id: row.id!, manor_id: row.manor_id, manor_label: row.manor_display_label,
        position_kind: "food_capacity" as const, availability_posture: "available" as const,
        source_effective_date: row.source_cutpoint ?? "1116-01-01", projection_generation_id: this.manifest.generation_id,
        ...boundary(row.binding_basis ?? "admitted_foundation_a_uat_read_only", "provisional_uat_capacity_no_custody_or_receipt_claim"),
      })),
    ];
    const provenanceKey: Record<string, string> = {
      membership: "ro_household_membership_v1",
      adult_kin: "ro_adult_kin_support_roster_v1",
      service_care: "ro_household_health_roster_v1",
      education_arrangements: "ro_education_learner_plan_v1",
      education_progress_reports: "ro_education_cycle_report_uat1_v1",
      health_cycle_receipts: "ro_household_health_cycle_receipt_uat1_v1",
      health_cycle_reports: "ro_health_cycle_report_uat1_v1",
      responsibility_authority: "ro_household_responsibility_summary_v1",
      house_manor_scope: "ro_household_house_manor_scope_v1",
      stores_static_opening_positions: "ro_household_stores_position_v1",
      matters: "ro_household_matter_v1",
    };
    const provenance: Household1120ProvenanceRow[] = Object.entries(this.manifest.module_dispositions).map(([key, disposition]) => ({
      provenance_id: `foundation-a-household-uat1:${this.manifest.generation_id}:${key}`, record_kind: "surface",
      record_key: provenanceKey[key] ?? `household_${key}_v1`, source_path: this.manifest.artifact.path, source_sha256: this.manifest.artifact.sha256,
      admission_state: disposition.startsWith("admitted") ? "projected_read_ready" : "withheld_pending_admission",
      row_count: key === "stores_static_opening_positions" ? storesPositions.length : 0,
      withheld_reason: disposition.startsWith("admitted") ? null : disposition, ...boundary("foundation_a_household_uat1_release_v1"),
    }));
    return {
      schema_version: "foundation_a_household_uat1_release_v1" as Household1120ReadOnlyProjection["schema_version"],
      contract: { generation_id: this.manifest.generation_id, effective_date: "1120-01-01", sqlite_sha256: this.manifest.artifact.sha256, sqlite_integrity: "ok", runtime_authority: false },
      query: { household_entity_id: householdEntityId, house_id: houseId }, membership_context: membershipContext,
      responsibility_summary: responsibilitySummary, stores_positions: storesPositions, stores_history: [], supply_routes: [],
      adult_kin_roster: adultKinRoster, adult_kin_arrangements: adultKinArrangements, education_plans: educationPlans,
      education_cycle_reports: educationCycleReports, health_roster: healthRoster, health_cycle_reports: healthCycleReports, care_arrangements: careArrangements,
      protected_person_dossiers: [], economic_activity_lookback: [], matters: [], provenance,
    };
  }

  async close(): Promise<void> { await this.driver.close(); }
}
