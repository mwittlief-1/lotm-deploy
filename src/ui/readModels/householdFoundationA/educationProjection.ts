import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../world1116/sqliteReadonlyDriver";
import type {
  Household1120EducationCycleReportRow,
  Household1120EducationLearnerPlanRow,
  Household1120ProvenanceRow,
} from "../household1120/types";

const FOUNDATION_A_EDUCATION_SCHEMA = "foundation_a_education_projection_v1" as const;
const FOUNDATION_A_EDUCATION_STATUS =
  "foundation_a_uat_active_arrangements_with_endpoint_initialization_evidence" as const;

interface FoundationAEducationManifestV1 {
  schema_version: typeof FOUNDATION_A_EDUCATION_SCHEMA;
  package_id: "foundation_a_education_projection_v1";
  generation_id: string;
  status: typeof FOUNDATION_A_EDUCATION_STATUS;
  effective_date: "1120-01-01";
  foundation_a_uat_only: true;
  historical_progress_fact_claim: false;
  player_report_prose: "absent";
  output: { path: string; sha256: string };
}

interface EducationArrangementRow {
  education_assignment_id: string;
  house_id: string;
  learner_person_id: string;
  learner_name: string;
  learner_age_turn0: number | null;
  learner_age_band: string | null;
  track_id: string;
  track_label: string;
  setting_type: string;
  provider_person_id: string | null;
  provider_name: string | null;
  host_or_guardian_name: string | null;
  host_entity: string | null;
  responsible_party_person_id: string | null;
  responsible_party_name: string | null;
  arrangement_state: "active_uat_formation_arrangement";
  progress_disclosure_state: string;
  effective_date: string;
  runtime_authority: number;
}

interface EducationProgressRow {
  prior_progress_id: string;
  education_assignment_id: string;
  learner_person_id: string;
  observation_year: number;
  evidence_state: "endpoint_initialization_evidence_not_player_report";
  source_effective_date: string;
  uat_effective_date: string;
  runtime_authority: number;
  disclosure_posture: string;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
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

function assertManifest(value: unknown): asserts value is FoundationAEducationManifestV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Foundation A Education manifest must be an object.");
  }
  const manifest = value as Record<string, unknown>;
  if (
    manifest.schema_version !== FOUNDATION_A_EDUCATION_SCHEMA ||
    manifest.package_id !== "foundation_a_education_projection_v1" ||
    manifest.status !== FOUNDATION_A_EDUCATION_STATUS ||
    manifest.effective_date !== "1120-01-01" ||
    manifest.foundation_a_uat_only !== true ||
    manifest.historical_progress_fact_claim !== false ||
    manifest.player_report_prose !== "absent" ||
    typeof manifest.generation_id !== "string" ||
    !manifest.generation_id
  ) {
    throw new Error("Foundation A Education manifest violates the UAT consumer boundary.");
  }
  if (!manifest.output || typeof manifest.output !== "object" || Array.isArray(manifest.output)) {
    throw new Error("Foundation A Education manifest output is required.");
  }
  const output = manifest.output as Record<string, unknown>;
  if (typeof output.path !== "string" || !output.path || !isSha256(output.sha256)) {
    throw new Error("Foundation A Education manifest output is invalid.");
  }
}

/**
 * House-scoped reader for the Foundation A Education package. It supplies
 * active UAT formation arrangements and evidence-count-only prior progress;
 * it intentionally never exposes raw progress coordinates, receipt prose, or
 * an executed runtime contract.
 */
export class FoundationAEducationProjection {
  private constructor(
    private readonly manifest: FoundationAEducationManifestV1,
    private readonly driver: World1116ReadonlySqliteDriver,
  ) {}

  static async open(manifestPath: string): Promise<FoundationAEducationProjection> {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    assertManifest(manifest);
    const databasePath = resolve(process.cwd(), manifest.output.path);
    if ((await sha256File(databasePath)) !== manifest.output.sha256) {
      throw new Error("Foundation A Education SQLite SHA mismatch.");
    }
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new FoundationAEducationProjection(manifest, driver);
  }

  async plans(houseId: string): Promise<readonly Household1120EducationLearnerPlanRow[]> {
    const scopedHouseId = houseId.trim();
    if (!scopedHouseId) throw new Error("Foundation A Education requires a House identifier.");
    const rows = await this.driver.all<EducationArrangementRow>(`
      SELECT education_assignment_id, house_id, learner_person_id, learner_name,
             learner_age_turn0, learner_age_band, track_id, track_label,
             setting_type, provider_person_id, provider_name, host_or_guardian_name,
             host_entity, responsible_party_person_id, responsible_party_name,
             arrangement_state, progress_disclosure_state, effective_date,
             runtime_authority
      FROM ro_foundation_a_education_arrangement_v1
      WHERE house_id=${sqlString(scopedHouseId)}
      ORDER BY learner_name, learner_person_id
    `);
    return rows.map((row) => {
      if (
        row.arrangement_state !== "active_uat_formation_arrangement" ||
        row.effective_date !== "1120-01-01" ||
        row.runtime_authority !== 0
      ) {
        throw new Error("Foundation A Education arrangement violates UAT policy.");
      }
      return {
        education_assignment_id: row.education_assignment_id,
        learner_person_id: row.learner_person_id,
        learner_name: row.learner_name,
        learner_age_turn0: row.learner_age_turn0,
        learner_age_band: row.learner_age_band,
        learner_house_id: row.house_id,
        learner_house_name: null,
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
        contract_state: row.arrangement_state,
        capacity_availability_state: "provider_capacity_not_modeled_in_uat",
        knowledge_state: row.progress_disclosure_state,
        effective_date: row.effective_date,
        source_authority_status:
          "foundation_a_uat_active_formation_arrangement_not_runtime_execution",
        runtime_authority: 0,
        disclosure_posture: "knowledge_safe_prior_progress_summary_pending_separate_report_projection",
      };
    });
  }

  async priorProgress(houseId: string): Promise<readonly Household1120EducationCycleReportRow[]> {
    const scopedHouseId = houseId.trim();
    if (!scopedHouseId) throw new Error("Foundation A Education requires a House identifier.");
    const rows = await this.driver.all<EducationProgressRow>(`
      SELECT p.prior_progress_id, p.education_assignment_id, p.learner_person_id,
             p.observation_year, p.evidence_state, p.source_effective_date,
             p.uat_effective_date, p.runtime_authority, p.disclosure_posture
      FROM ro_foundation_a_education_prior_progress_v1 p
      INNER JOIN ro_foundation_a_education_arrangement_v1 a
        ON a.education_assignment_id=p.education_assignment_id
      WHERE a.house_id=${sqlString(scopedHouseId)}
      ORDER BY p.observation_year DESC, p.learner_person_id, p.prior_progress_id
    `);
    return rows.map((row) => {
      if (
        row.evidence_state !== "endpoint_initialization_evidence_not_player_report" ||
        row.uat_effective_date !== "1120-01-01" ||
        row.runtime_authority !== 0
      ) {
        throw new Error("Foundation A Education prior progress violates UAT policy.");
      }
      return {
        cycle_report_id: row.prior_progress_id,
        learner_person_id: row.learner_person_id,
        cycle_year: row.observation_year,
        report_state: row.evidence_state,
        effective_date: row.uat_effective_date,
        source_authority_status:
          "foundation_a_endpoint_initialization_evidence_not_historical_fact_or_player_report",
        runtime_authority: 0,
        disclosure_posture: row.disclosure_posture,
      };
    });
  }

  provenance(planRows: number, progressRows: number): readonly Household1120ProvenanceRow[] {
    const base = {
      effective_date: this.manifest.effective_date,
      source_authority_status: FOUNDATION_A_EDUCATION_STATUS,
      runtime_authority: 0,
      disclosure_posture: "knowledge_safe_prior_progress_summary_pending_separate_report_projection",
    } as const;
    return [
      {
        provenance_id: `surface:foundation-a-education-plan:${this.manifest.generation_id}`,
        record_kind: "surface",
        record_key: "ro_education_learner_plan_v1",
        source_path: this.manifest.output.path,
        source_sha256: this.manifest.output.sha256,
        admission_state: "projected_read_ready",
        row_count: planRows,
        withheld_reason: null,
        ...base,
      },
      {
        provenance_id: `surface:foundation-a-education-progress:${this.manifest.generation_id}`,
        record_kind: "surface",
        record_key: "ro_education_cycle_report_v1",
        source_path: this.manifest.output.path,
        source_sha256: this.manifest.output.sha256,
        admission_state: "projected_read_ready",
        row_count: progressRows,
        withheld_reason: null,
        ...base,
      },
    ];
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
