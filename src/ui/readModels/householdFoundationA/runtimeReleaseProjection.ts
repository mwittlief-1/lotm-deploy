import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../world1116/sqliteReadonlyDriver";
import type {
  Household1120EconomicActivityLookbackRow,
  Household1120AdultKinArrangementRow,
  Household1120AdultKinRosterRow,
  Household1120CareArrangementRow,
  Household1120EducationLearnerPlanRow,
  Household1120HealthRosterRow,
  Household1120MembershipRow,
  Household1120ProvenanceRow,
  Household1120ReadOnlyProjection,
  Household1120ResponsibilityRow,
  Household1120StoresPositionRow,
} from "../household1120/types";
import { resolveManifestArtifactPath } from "./manifestArtifactPath";

interface RuntimeReleaseManifest {
  package_id: "foundation_a_household_runtime_release_v1";
  schema_version: "foundation_a_household_runtime_release_v1";
  generation_id: string;
  effective_date: "1120-01-01";
  release_status: "runtime_admitted_foundation_a_uat";
  source_inputs: readonly { role: string; path: string; sha256: string }[];
  module_dispositions: Record<string, string>;
  artifact: { path: string; sha256: string };
}

interface MembershipSourceRow {
  id: string;
  house_id: string;
  household_entity_id: string;
  person_id: string;
  person_name: string;
  residence_entity_id: string | null;
  residence_label: string | null;
  source_status: string;
  disclosure_posture: string;
  house_member: string;
  current_resident: string;
  house_supported: string;
}

interface AdultKinSourceRow {
  id: string;
  household_entity_id: string;
  person_id: string;
  arrangement_id: string | null;
  manager_person_id: string | null;
  primary_support_basis: string | null;
  source_status: string;
}

interface AuthoritySourceRow {
  responsibility_instance_id: string;
  responsibility_key: string;
  responsibility_label: string;
  scope_id: string;
  scope_label: string | null;
  accountable_owner_person_id: string | null;
  accountable_owner_person_name: string | null;
  instance_admission_basis: string;
}

interface EducationSourceRow {
  education_assignment_id: string;
  house_id: string;
  house_name: string;
  learner_person_id: string;
  learner_name: string;
  learner_age_turn0: number | null;
  learner_age_band: string | null;
  track_id: string;
  track_label: string;
  setting_type: string;
  host_entity: string | null;
  host_or_guardian_name: string | null;
  provider_person_id: string | null;
  provider_name: string | null;
  responsible_party_person_id: string | null;
  responsible_party_name: string | null;
  progress_disclosure_state: string;
}

interface HealthSourceRow {
  id: string;
  person_id: string;
  health_condition_id: string;
  overall_state: string;
  source_status: string;
  disclosure_posture: string;
}

interface CareSourceRow {
  id: string;
  recipient_person_id: string;
  care_commitment_id: string;
  provider_person_id: string | null;
  coverage_state: string;
  source_status: string;
}

interface EconomicActivitySourceRow {
  activity_id: string;
  source_economic_leg_id: string;
  activity_year: 1117 | 1118 | 1119;
  effective_date: string;
  resource_id: string;
  flow_family: string;
  regularity: "regular";
  direction: string;
  signed_amount: number;
  counterparty_entity_id: string | null;
  counterparty_label: string | null;
  temporal_basis: "annual_regular_posting";
  evidence_status: "founder_approved_provisional_economic_lookback";
}

interface StoresSourceRow {
  stores_position_id: string;
  resource_id: string;
  quantity_integer: number;
  position_state: string;
  position_kind: "house_position" | "custody_position" | "food_capacity";
  availability_posture: "available";
  custody_id: string | null;
  capacity_id: string | null;
  manor_id: string | null;
  manor_label: string | null;
  source_effective_date: string;
  uat_effective_date: "1120-01-01";
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

function assertManifest(value: unknown): asserts value is RuntimeReleaseManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Foundation A Household runtime release manifest must be an object.");
  }
  const manifest = value as Partial<RuntimeReleaseManifest>;
  if (
    manifest.package_id !== "foundation_a_household_runtime_release_v1" ||
    manifest.schema_version !== "foundation_a_household_runtime_release_v1" ||
    manifest.effective_date !== "1120-01-01" ||
    manifest.release_status !== "runtime_admitted_foundation_a_uat" ||
    !manifest.generation_id ||
    !manifest.artifact?.path ||
    !/^[a-f0-9]{64}$/.test(manifest.artifact.sha256) ||
    !Array.isArray(manifest.source_inputs) ||
    manifest.source_inputs.length < 3 ||
    !manifest.module_dispositions
  ) {
    throw new Error("Foundation A Household release manifest failed its contract.");
  }
  const required = {
    membership: "runtime_admitted",
    adult_kin: "runtime_admitted_resolved_rows_only",
    service_care: "runtime_admitted_courtos_house_scope_only",
    education_arrangements: "runtime_admitted_without_progress_presentation",
    stores_positions_and_custody: "runtime_admitted_static_uat_bound_house_and_manor_rows",
    matters_opening: "empty_at_opening",
  } as const;
  for (const [key, disposition] of Object.entries(required)) {
    if (manifest.module_dispositions[key] !== disposition) {
      throw new Error(`Foundation A Household release has an unsafe ${key} disposition.`);
    }
  }
}

function boundary(sourceStatus: string, disclosurePosture = "foundation_a_uat_read_projection"): Pick<Household1120MembershipRow, "effective_date" | "source_authority_status" | "runtime_authority" | "disclosure_posture"> {
  return {
    effective_date: "1120-01-01",
    source_authority_status: sourceStatus,
    runtime_authority: 0,
    disclosure_posture: disclosurePosture,
  };
}

/**
 * Manifest-pinned consumer for the frozen Foundation A Household release.
 * It does not open the candidate inputs and cannot fall back to them.
 */
export class FoundationAHouseholdRuntimeReleaseProjection {
  private constructor(
    private readonly manifest: RuntimeReleaseManifest,
    private readonly driver: World1116ReadonlySqliteDriver,
  ) {}

  static async open(manifestPath: string): Promise<FoundationAHouseholdRuntimeReleaseProjection> {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    assertManifest(manifest);
    const databasePath = resolveManifestArtifactPath(manifestPath, manifest.artifact.path);
    if ((await sha256File(databasePath)) !== manifest.artifact.sha256) {
      throw new Error("Foundation A Household runtime release SQLite SHA mismatch.");
    }
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new FoundationAHouseholdRuntimeReleaseProjection(manifest, driver);
  }

  /** Uses Household tables copied byte-for-byte into a verified outer release. */
  static async openVerifiedEmbeddedCopy(
    manifestPath: string,
    databasePath: string,
  ): Promise<FoundationAHouseholdRuntimeReleaseProjection> {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    assertManifest(manifest);
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new FoundationAHouseholdRuntimeReleaseProjection(manifest, driver);
  }

  static async openVerifiedEmbeddedManifest(
    manifestJson: string,
    databasePath: string,
  ): Promise<FoundationAHouseholdRuntimeReleaseProjection> {
    const manifest = JSON.parse(manifestJson) as unknown;
    assertManifest(manifest);
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new FoundationAHouseholdRuntimeReleaseProjection(manifest, driver);
  }

  async projection(input: { householdEntityId: string; houseId: string }): Promise<Household1120ReadOnlyProjection> {
    const houseId = input.houseId.trim();
    const householdEntityId = input.householdEntityId.trim();
    if (!houseId || !householdEntityId) throw new Error("Foundation A Household requires House and Household identifiers.");
    const house = sqlString(houseId);
    const membership = await this.driver.all<MembershipSourceRow>(`
      SELECT id, house_id, household_entity_id, person_id, person_name, residence_entity_id,
             residence_label, source_status, disclosure_posture, house_member, current_resident, house_supported
      FROM ro_household_membership_v1
      WHERE house_id=${house}
      ORDER BY person_name, person_id
    `);
    if (membership.length === 0) {
      throw new Error("Foundation A Household has no admitted membership for the selected House.");
    }
    const sourceHouseholdIds = new Set(
      membership.map((row) => row.household_entity_id),
    );
    if (sourceHouseholdIds.size !== 1) {
      throw new Error("Foundation A Household membership has no single admitted Household scope.");
    }
    const [authority, adultKin, education, health, care, stores, economicActivity] = await Promise.all([
      this.driver.all<AuthoritySourceRow>(`
        SELECT responsibility_instance_id, responsibility_key, responsibility_label, scope_id, scope_label,
               accountable_owner_person_id, accountable_owner_person_name, instance_admission_basis
        FROM ro_responsibility_authority_v1
        WHERE governing_actor_id=${house}
        ORDER BY responsibility_key, scope_id, responsibility_instance_id
      `),
      this.driver.all<AdultKinSourceRow>(`
        SELECT id, household_entity_id, person_id, arrangement_id, manager_person_id,
               primary_support_basis, source_status
        FROM ro_adult_kin_subject_v1
        WHERE house_id=${house}
        ORDER BY person_id, id
      `),
      this.driver.all<EducationSourceRow>(`
        SELECT education_assignment_id, house_id, house_name, learner_person_id, learner_name, learner_age_turn0,
               learner_age_band, track_id, track_label, setting_type, host_entity, host_or_guardian_name,
               provider_person_id, provider_name, responsible_party_person_id, responsible_party_name,
               progress_disclosure_state
        FROM ro_household_education_arrangement_v1
        WHERE house_id=${house}
        ORDER BY learner_name, learner_person_id, education_assignment_id
      `),
      this.driver.all<HealthSourceRow>(`
        SELECT id, person_id, health_condition_id, overall_state, source_status, disclosure_posture
        FROM ro_household_health_roster_v1
        WHERE house_id=${house}
        ORDER BY person_id, health_condition_id, id
      `),
      this.driver.all<CareSourceRow>(`
        SELECT id, recipient_person_id, id AS care_commitment_id, provider_person_id, coverage_state, source_status
        FROM ro_household_care_arrangement_v1
        WHERE recipient_house_id=${house}
        ORDER BY recipient_person_id, id
      `),
      this.driver.all<StoresSourceRow>(`
        SELECT stores_position_id, resource_id, quantity_integer, position_state, position_kind,
               availability_posture, custody_id, capacity_id, manor_id, manor_label,
               source_effective_date, uat_effective_date
        FROM ro_household_stores_position_v1
        WHERE house_id=${house}
        ORDER BY position_kind, resource_id, manor_id, stores_position_id
      `),
      this.driver.all<EconomicActivitySourceRow>(`
        SELECT activity_id, source_economic_leg_id, activity_year, effective_date,
               resource_id, flow_family, regularity, direction, signed_amount,
               counterparty_entity_id, counterparty_label, temporal_basis, evidence_status
        FROM ro_household_economic_activity_lookback_v1
        WHERE protected_house_id=${house}
        ORDER BY activity_year DESC, activity_id
      `),
    ]);

    const membershipContext: Household1120MembershipRow[] = membership.map((row) => ({
      protected_person_id: row.person_id,
      display_name: row.person_name,
      life_state: "membership_projection_at_opening",
      birth_year: null,
      death_year: null,
      endpoint_house_protected_id: row.house_id,
      endpoint_house_label: null,
      primary_residence_id: row.residence_entity_id,
      primary_residence_label: row.residence_label,
      residence_state: row.current_resident === "true" ? "current_resident" : "not_current_resident",
      father_person_id: null,
      mother_person_id: null,
      current_union_id: null,
      kinship_source_status: `member=${row.house_member}; supported=${row.house_supported}`,
      relationship_projection_state: "foundation_a_membership_projection",
      ...boundary(row.source_status, row.disclosure_posture),
    }));
    const responsibilitySummary: Household1120ResponsibilityRow[] = authority.map((row) => ({
      responsibility_summary_id: row.responsibility_instance_id,
      responsibility_demand_id: row.responsibility_instance_id,
      demand_entity_id: householdEntityId,
      demand_entity_label: null,
      responsibility_id: `sr_${row.responsibility_key.replace("courtos.responsibility.", "")}`,
      responsibility_label: row.responsibility_label,
      source_legacy_responsibility_id: row.responsibility_key,
      source_legacy_responsibility_label: row.responsibility_label,
      demand_state: "foundation_a_opening_assignment",
      coverage_state: "accountable_owner_resolved",
      holder_person_id: row.accountable_owner_person_id,
      holder_display_name: row.accountable_owner_person_name,
      authority_posture: row.instance_admission_basis,
      authority_scope_id: row.scope_id,
      authority_scope_label: row.scope_label,
      manor_id: row.scope_id.startsWith("manor_") ? row.scope_id : null,
      ...boundary("foundation_a_runtime_admitted_responsibility_authority"),
    }));
    const adultKinRoster: Household1120AdultKinRosterRow[] = adultKin.map((row) => ({
      support_roster_id: row.id,
      household_entity_id: row.household_entity_id,
      person_id: row.person_id,
      roster_state: "resolved_managed_adult_kin",
      ...boundary(row.source_status),
    }));
    const adultKinArrangements: Household1120AdultKinArrangementRow[] = adultKin.map((row) => ({
      support_arrangement_id: row.arrangement_id ?? row.id,
      person_id: row.person_id,
      responsible_party_id: row.manager_person_id ?? "withheld_manager_identity",
      commitment_id: row.arrangement_id ?? row.id,
      arrangement_state: row.primary_support_basis ?? "resolved_support_arrangement",
      ...boundary(row.source_status),
    }));
    const educationPlans: Household1120EducationLearnerPlanRow[] = education.map((row) => ({
      education_assignment_id: row.education_assignment_id,
      learner_person_id: row.learner_person_id,
      learner_name: row.learner_name,
      learner_age_turn0: row.learner_age_turn0,
      learner_age_band: row.learner_age_band,
      learner_house_id: row.house_id,
      learner_house_name: row.house_name,
      learner_house_class: null,
      recommended_track_id: row.track_id,
      recommended_track: row.track_label,
      setting_type: row.setting_type,
      setting_entity: row.host_entity ?? row.host_or_guardian_name,
      primary_provider_person_id: row.provider_person_id,
      primary_provider_name: row.provider_name,
      responsible_party_person_id: row.responsible_party_person_id,
      responsible_party_name: row.responsible_party_name,
      review_date: null,
      contract_state: "active_uat_formation_arrangement",
      capacity_availability_state: "provider_capacity_not_modeled_in_uat",
      knowledge_state: row.progress_disclosure_state,
      ...boundary("foundation_a_runtime_admitted_education_arrangement", "raw_progress_withheld_pending_knowledge_safe_report_projection"),
    }));
    const healthRoster: Household1120HealthRosterRow[] = health.map((row) => ({
      health_roster_id: row.id,
      person_id: row.person_id,
      condition_id: row.health_condition_id,
      severity_state: row.overall_state,
      ...boundary(row.source_status, row.disclosure_posture),
    }));
    const careArrangements: Household1120CareArrangementRow[] = care.map((row) => ({
      care_arrangement_id: row.id,
      person_id: row.recipient_person_id,
      commitment_id: row.care_commitment_id,
      provider_id: row.provider_person_id,
      arrangement_state: row.coverage_state,
      ...boundary(row.source_status),
    }));
    const storesPositions: Household1120StoresPositionRow[] = stores.map((row) => ({
      stores_position_id: row.stores_position_id,
      household_entity_id: householdEntityId,
      resource_id: row.resource_id,
      quantity_integer: row.quantity_integer,
      position_state: row.position_state,
      custody_id: row.custody_id,
      capacity_id: row.capacity_id,
      manor_id: row.manor_id,
      manor_label: row.manor_label,
      position_kind: row.position_kind,
      availability_posture: row.availability_posture,
      source_effective_date: row.source_effective_date,
      projection_generation_id: this.manifest.generation_id,
      ...boundary(
        "founder_approved_provisional_static_1116_position_displayed_at_1120_uat_epoch",
        "provisional_uat_planning_position_no_historical_receipt_claim",
      ),
    }));
    const economicActivityLookback: Household1120EconomicActivityLookbackRow[] = economicActivity.map((row) => ({
      ...row,
      source_authority_status: "founder_approved_provisional_economic_activity",
      runtime_authority: 0,
      disclosure_posture: "house_scoped_uat_evidence",
    }));
    const provenance: Household1120ProvenanceRow[] = Object.entries(this.manifest.module_dispositions).map(([key, disposition]) => ({
      provenance_id: `foundation-a-household:${this.manifest.generation_id}:${key}`,
      record_kind: "surface",
      record_key: ({
        membership: "ro_household_family_book_v1",
        adult_kin: "ro_adult_kin_support_roster_v1",
        service_care: "ro_health_roster_v1",
        education_arrangements: "ro_education_learner_plan_v1",
        education_progress_presentation: "ro_education_cycle_report_v1",
        stores_positions_and_custody: "ro_household_stores_position_v1",
        matters_opening: "ro_household_matter_v1",
        responsibility_authority: "ro_household_responsibility_summary_v1",
      } as Record<string, string>)[key] ?? `foundation_a:${key}`,
      source_path: this.manifest.artifact.path,
      source_sha256: this.manifest.artifact.sha256,
      admission_state: disposition.startsWith("runtime_admitted") ? "projected_read_ready" : "withheld_pending_admission",
      row_count: key === "stores_positions_and_custody" ? storesPositions.length : 0,
      withheld_reason: disposition.startsWith("runtime_admitted") ? null : disposition,
      ...boundary("foundation_a_household_runtime_release_v1"),
    }));

    return {
      schema_version: "foundation_a_household_runtime_release_v1",
      contract: {
        generation_id: this.manifest.generation_id,
        effective_date: "1120-01-01",
        sqlite_sha256: this.manifest.artifact.sha256,
        sqlite_integrity: "ok",
        runtime_authority: false,
      },
      query: { household_entity_id: householdEntityId, house_id: houseId },
      membership_context: membershipContext,
      responsibility_summary: responsibilitySummary,
      stores_positions: storesPositions,
      stores_history: [],
      supply_routes: [],
      adult_kin_roster: adultKinRoster,
      adult_kin_arrangements: adultKinArrangements,
      education_plans: educationPlans,
      education_cycle_reports: [],
      health_roster: healthRoster,
      health_cycle_reports: [],
      care_arrangements: careArrangements,
      economic_activity_lookback: economicActivityLookback,
      protected_person_dossiers: [],
      matters: [],
      provenance,
    };
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
