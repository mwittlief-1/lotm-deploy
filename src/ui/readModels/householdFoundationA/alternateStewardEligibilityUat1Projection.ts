import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../world1116/sqliteReadonlyDriver";
import type { Household1120StewardshipCandidateRow } from "../household1120/types";
import { FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION } from "../../courtosResponsibilityAuthoritySource";
import {
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_DIRECTORY,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_MANIFEST_SHA256,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_SQLITE_SHA256,
} from "./alternateStewardEligibilityContract";

export {
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_DIRECTORY,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_MANIFEST_SHA256,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_SQLITE_SHA256,
} from "./alternateStewardEligibilityContract";

interface AlternateStewardManifest {
  artifact_id: "phase_five_courtos_alternate_steward_eligibility_admission_v1";
  schema_version: "courtos_alternate_steward_eligibility_v1";
  status: "foundation_a_uat1_admitted_alternate_steward_eligibility_not_canon";
  generation_id: typeof FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION;
  effective_date: "1120-01-01";
  source_authority_generation_id: string;
  authority_boundary: "house_only";
  artifacts: { sqlite: "courtos_alternate_steward_eligibility_v1.sqlite" };
  coverage_posture: {
    all_24_responsibilities_dispositioned: true;
    accepted_policy_but_no_distinct_alternate: string[];
    no_admitted_alternate_selector_rule: string[];
  };
  assertions: {
    all_effective_1120: true;
    all_exact_admitted_scopes: true;
    all_living_adults: true;
    execution_revalidation_explicit: true;
    no_capacity_claim: true;
    no_current_holder_duplicates: true;
    no_house_head_duplicates: true;
    no_public_or_church_scope: true;
    no_runtime_or_canon_claim: true;
    unique_natural_key: true;
    original_candidate_lineage_preserved: true;
    exact_foundation_a_admission_wrapper_required: true;
  };
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

function assertManifest(value: unknown): asserts value is AlternateStewardManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Alternate-steward eligibility manifest must be an object.");
  }
  const manifest = value as Partial<AlternateStewardManifest>;
  const assertions = manifest.assertions;
  if (
    manifest.artifact_id !== "phase_five_courtos_alternate_steward_eligibility_admission_v1" ||
    manifest.schema_version !== "courtos_alternate_steward_eligibility_v1" ||
    manifest.status !== "foundation_a_uat1_admitted_alternate_steward_eligibility_not_canon" ||
    manifest.generation_id !== FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION ||
    manifest.effective_date !== "1120-01-01" ||
    manifest.source_authority_generation_id !== FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION ||
    manifest.authority_boundary !== "house_only" ||
    manifest.artifacts?.sqlite !== "courtos_alternate_steward_eligibility_v1.sqlite" ||
    manifest.coverage_posture?.all_24_responsibilities_dispositioned !== true ||
    manifest.coverage_posture?.accepted_policy_but_no_distinct_alternate?.join("|") !==
      "manor_stewardship|security_asset_protection|office_post_appointments" ||
    manifest.coverage_posture?.no_admitted_alternate_selector_rule?.join("|") !==
      "works_project_supervision|franchise_operations|portfolio_oversight|revenue_right_administration_collection|reception_intake|records_archives|martial_readiness_training|martial_stores_horse_capacity|household_observance_chaplaincy|church_rights_institutional_affairs" ||
    assertions?.all_effective_1120 !== true ||
    assertions.all_exact_admitted_scopes !== true ||
    assertions.all_living_adults !== true ||
    assertions.execution_revalidation_explicit !== true ||
    assertions.no_capacity_claim !== true ||
    assertions.no_current_holder_duplicates !== true ||
    assertions.no_house_head_duplicates !== true ||
    assertions.no_public_or_church_scope !== true ||
    assertions.no_runtime_or_canon_claim !== true ||
    assertions.unique_natural_key !== true ||
    assertions.original_candidate_lineage_preserved !== true ||
    assertions.exact_foundation_a_admission_wrapper_required !== true
  ) {
    throw new Error("Alternate-steward eligibility manifest failed its exact contract.");
  }
}

/**
 * Exact, fail-closed UAT-1 planning-candidate reader. These rows support a
 * proposed assignment only; they never confer runtime authority or custody.
 */
export class FoundationAAlternateStewardEligibilityUat1Projection {
  private readonly driver: World1116ReadonlySqliteDriver;

  private constructor(driver: World1116ReadonlySqliteDriver) {
    this.driver = driver;
  }

  static async open(
    rootDirectory = process.cwd(),
  ): Promise<FoundationAAlternateStewardEligibilityUat1Projection> {
    const directory = resolve(
      rootDirectory,
      FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_DIRECTORY,
    );
    const manifestPath = resolve(directory, "MANIFEST.json");
    if (
      (await sha256File(manifestPath)) !==
      FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_MANIFEST_SHA256
    ) {
      throw new Error("Alternate-steward eligibility manifest SHA mismatch.");
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    assertManifest(manifest);
    const sqlitePath = resolve(directory, manifest.artifacts.sqlite);
    if (
      (await sha256File(sqlitePath)) !==
      FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_SQLITE_SHA256
    ) {
      throw new Error("Alternate-steward eligibility SQLite SHA mismatch.");
    }
    const driver = new NativeSqliteReadonlyDriver(sqlitePath);
    await driver.assertReadPolicy();
    return new FoundationAAlternateStewardEligibilityUat1Projection(driver);
  }

  /** Uses eligibility tables copied into a verified outer Foundation A release. */
  static async openVerifiedEmbeddedCopy(
    rootDirectory: string,
    databasePath: string,
  ): Promise<FoundationAAlternateStewardEligibilityUat1Projection> {
    const directory = resolve(
      rootDirectory,
      FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_DIRECTORY,
    );
    const manifestPath = resolve(directory, "MANIFEST.json");
    const manifestSha = await sha256File(manifestPath);
    if (manifestSha !== FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_MANIFEST_SHA256) {
      throw new Error("Alternate-steward eligibility manifest SHA mismatch.");
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    assertManifest(manifest);
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new FoundationAAlternateStewardEligibilityUat1Projection(driver);
  }

  static async openVerifiedEmbeddedManifest(
    manifestJson: string,
    databasePath: string,
  ): Promise<FoundationAAlternateStewardEligibilityUat1Projection> {
    const manifest = JSON.parse(manifestJson) as unknown;
    assertManifest(manifest);
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new FoundationAAlternateStewardEligibilityUat1Projection(driver);
  }

  async candidatesForHouse(
    houseId: string,
  ): Promise<readonly Household1120StewardshipCandidateRow[]> {
    const rows = await this.driver.all<Household1120StewardshipCandidateRow>(`
      SELECT eligibility_candidate_id, generation_id, effective_date, house_id,
             responsibility_id, responsibility_instance_id, scope_id, person_id,
             person_name, eligibility_posture, eligibility_bounds,
             deterministic_order, selector_priority, selector,
             eligibility_basis, affiliation_basis, evidence_kind, evidence_ids,
             provenance_refs, authority_boundary, source_authority_assignment_id,
             source_authority_generation_id, source_candidate_only_lineage,
             foundation_a_authority_admission_disposition,
             source_runtime_authority_posture, policy_id, policy_sha256,
             capacity_posture, runtime_authority, canon_status
      FROM responsibility_assignment_candidate_v1
      WHERE house_id=${sqlString(houseId)}
      ORDER BY responsibility_id, scope_id, CAST(deterministic_order AS INTEGER), person_id
    `);
    return rows;
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
