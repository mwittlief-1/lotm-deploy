import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../world1116/sqliteReadonlyDriver";
import type { Household1120ResponsibilityRow } from "../household1120/types";
import { FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SQLITE_SHA256 } from "../../courtosResponsibilityAuthoritySource";

export const FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_MANIFEST_PATH =
  "data/genrun/phase_five_foundation_a_uat_24_responsibility_authority_admission_v1/MANIFEST.json" as const;
export const FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SQLITE_PATH =
  "data/genrun/phase_five_foundation_a_uat_24_responsibility_authority_admission_v1/phase_five_foundation_a_uat_24_responsibility_authority_admission_v1.sqlite" as const;

interface AuthorityAdmissionManifest {
  artifact_id: "phase_five_foundation_a_uat_24_responsibility_authority_admission_v1";
  status: "foundation_a_uat_admitted_resolved_authority_not_canon";
  effective_date: "1120-01-01";
  assertions: {
    exactly_24_types: true;
    all_resolved_have_named_owner: true;
    all_source_candidate_status_preserved: true;
    all_issues_withheld: true;
  };
}

interface AuthorityRow {
  authority_assignment_id: string;
  responsibility_instance_id: string;
  responsibility_key: string;
  responsibility_label: string;
  scope_id: string;
  scope_label: string | null;
  manor_id: string | null;
  accountable_owner_person_id: string;
  accountable_owner_person_name: string;
  foundation_a_uat_disposition: string;
  source_truth_status: string;
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

function assertManifest(value: unknown): asserts value is AuthorityAdmissionManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Foundation A UAT1 responsibility authority manifest must be an object.");
  }
  const manifest = value as Partial<AuthorityAdmissionManifest>;
  if (
    manifest.artifact_id !== "phase_five_foundation_a_uat_24_responsibility_authority_admission_v1" ||
    manifest.status !== "foundation_a_uat_admitted_resolved_authority_not_canon" ||
    manifest.effective_date !== "1120-01-01" ||
    manifest.assertions?.exactly_24_types !== true ||
    manifest.assertions?.all_resolved_have_named_owner !== true ||
    manifest.assertions?.all_source_candidate_status_preserved !== true ||
    manifest.assertions?.all_issues_withheld !== true
  ) {
    throw new Error("Foundation A UAT1 responsibility authority manifest failed its contract.");
  }
}

/** Read-only 24-responsibility owner/scope projection for UAT1. */
export class FoundationAResponsibilityAuthorityUat1Projection {
  private constructor(private readonly driver: World1116ReadonlySqliteDriver) {}

  static async open(rootDirectory = process.cwd()): Promise<FoundationAResponsibilityAuthorityUat1Projection> {
    const manifestPath = resolve(rootDirectory, FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_MANIFEST_PATH);
    assertManifest(JSON.parse(readFileSync(manifestPath, "utf8")) as unknown);
    const sqlitePath = resolve(rootDirectory, FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SQLITE_PATH);
    if ((await sha256File(sqlitePath)) !== FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SQLITE_SHA256) {
      throw new Error("Foundation A UAT1 responsibility authority SQLite SHA mismatch.");
    }
    const driver = new NativeSqliteReadonlyDriver(sqlitePath);
    await driver.assertReadPolicy();
    return new FoundationAResponsibilityAuthorityUat1Projection(driver);
  }

  async responsibilitiesForHouse(houseId: string, householdEntityId: string): Promise<readonly Household1120ResponsibilityRow[]> {
    const rows = await this.driver.all<AuthorityRow>(`
      SELECT authority_assignment_id, responsibility_instance_id, responsibility_key, responsibility_label,
             scope_id, scope_label, manor_id, accountable_owner_person_id, accountable_owner_person_name,
             foundation_a_uat_disposition, source_truth_status
      FROM responsibility_authority_instance_v1
      WHERE governing_actor_id=${sqlString(houseId)}
      ORDER BY responsibility_key, scope_id, responsibility_instance_id
    `);
    return rows.map((row) => ({
      responsibility_summary_id: row.authority_assignment_id,
      responsibility_demand_id: row.responsibility_instance_id,
      demand_entity_id: householdEntityId,
      demand_entity_label: null,
      responsibility_id: `sr_${row.responsibility_key.replace("courtos.responsibility.", "")}`,
      responsibility_label: row.responsibility_label,
      source_legacy_responsibility_id: row.responsibility_key,
      source_legacy_responsibility_label: row.responsibility_label,
      demand_state: "foundation_a_uat1_opening_assignment",
      coverage_state: "accountable_owner_resolved",
      holder_person_id: row.accountable_owner_person_id,
      holder_display_name: row.accountable_owner_person_name,
      authority_posture: row.foundation_a_uat_disposition,
      authority_scope_id: row.scope_id,
      authority_scope_label: row.scope_label,
      manor_id: row.manor_id || null,
      effective_date: "1120-01-01",
      source_authority_status: row.source_truth_status,
      runtime_authority: 0,
      disclosure_posture: "foundation_a_uat1_resolved_authority_read_only",
    }));
  }

  async close(): Promise<void> { await this.driver.close(); }
}
