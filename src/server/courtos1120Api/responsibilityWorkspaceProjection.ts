import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES } from "../../ui/responsibilityWorkspaceCatalog";
import type { CourtOsResponsibilityDesignKey } from "../../ui/courtosInformationArchitecture";
import { NativeSqliteReadonlyDriver } from "../../ui/readModels/world1116/sqliteReadonlyDriver";
import type { World1116ReadonlySqliteDriver } from "../../ui/readModels/world1116/sqliteReadonlyDriver";

const KEY_PREFIX = "courtos.responsibility.";

export const RESPONSIBILITY_PACKAGE_DIRECTORIES = Object.freeze({
  church: "phase_five_church_observance_rights_uat1_admission_v1",
  conditional: "phase_five_conditional_estate_governance_uat1_admission_v1",
  information: "phase_five_information_governance_second_batch_uat1_v1",
  manor: "phase_five_manor_operations_uat1_admission_v1",
  marriage: "phase_five_marriage_dynasty_uat1_admission_v1",
  records: "phase_five_records_correspondence_uat1_admission_v1",
  resources: "phase_five_resources_finance_uat1_admission_v1",
  security: "phase_five_security_readiness_uat1_admission_v1",
} as const);

export type ResponsibilityPackageKey = keyof typeof RESPONSIBILITY_PACKAGE_DIRECTORIES;
type PackageKey = ResponsibilityPackageKey;
type RawRow = Record<string, unknown>;
type TableNameResolver = (logicalName: string) => string;

interface PackageContract {
  package: string;
  status: string;
  effective_cutpoint?: string;
  runtime_authority: false;
  boundaries?: string[];
}

interface SectionSpec {
  table: string;
  where: (
    houseId: string,
    canonicalKey: string,
    tableName: TableNameResolver,
  ) => string;
}

interface ResponsibilitySpec {
  packageKey: PackageKey;
  sections: readonly SectionSpec[];
}

export interface ResponsibilityWorkspaceRowV1 {
  source_table: string;
  subject_id: string | null;
  subject_label: string | null;
  scope_id: string | null;
  scope_label: string | null;
  accountable_person_id: string | null;
  accountable_person_label: string | null;
  player_surface_eligible: boolean | null;
  state: string | null;
  evidence_references: readonly { field: string; value: string }[];
}

export interface CourtOsResponsibilityWorkspaceProjectionV1 {
  schema_version: "courtos_responsibility_workspace_projection_v1";
  effective_date: string;
  read_only: true;
  command_authority: false;
  query: { house_id: string; responsibility: CourtOsResponsibilityDesignKey };
  workspace: {
    label: string;
    package_id: string;
    posture: "read_ready" | "conditional_empty" | "withheld_fail_closed";
    current_state: string;
    boundary: string;
  };
  source_binding: {
    package_id: string;
    source_digest: string | null;
    manifest_path: string | null;
    sqlite_path: string | null;
    source_status: string | null;
    source_owned: boolean;
  };
  row_count: number;
  subjects: readonly { subject_id: string; subject_label: string | null }[];
  rows: readonly ResponsibilityWorkspaceRowV1[];
  evidence: readonly string[];
  source_boundaries: readonly string[];
}

export interface CourtOsOpeningSuccessionIdentityV1 {
  authority_status: string;
  source_truth_layer: string;
  regency_required: string;
  source_truth_head_person_id: string;
  source_truth_head_status: string;
}

const byActor = (table: string): SectionSpec => ({
  table,
  where: (houseId) => `governing_actor_id=${sqlString(houseId)}`,
});
const byActorAndKey = (table: string): SectionSpec => ({
  table,
  where: (houseId, key) =>
    `governing_actor_id=${sqlString(houseId)} AND responsibility_key=${sqlString(key)}`,
});
const byProtectedHouse = (table: string): SectionSpec => ({
  table,
  where: (houseId) => `protected_house_id=${sqlString(houseId)}`,
});
const globalKey = (table: string): SectionSpec => ({
  table,
  where: (_houseId, key) => `responsibility_key=${sqlString(key)}`,
});
const byHouseManors = (table: string, manorField = "manor_id"): SectionSpec => ({
  table,
  where: (houseId, _key, tableName) =>
    `${manorField} IN (SELECT manor_id FROM ${tableName("house_manor_scope")} WHERE protected_house_id=${sqlString(houseId)})`,
});
const byHouseSecurityFacilities = (table: string): SectionSpec => ({
  table,
  where: (houseId, _key, tableName) =>
    `facility_id IN (SELECT facility_id FROM ${tableName("security_facility_operating_state_v1")} WHERE parent_manor_id IN (SELECT manor_id FROM ${tableName("house_manor_scope")} WHERE protected_house_id=${sqlString(houseId)}))`,
});
const byActorManors = (table: string, manorField: string): SectionSpec => ({
  table,
  where: (houseId, _key, tableName) =>
    `${manorField} IN (SELECT DISTINCT manor_id FROM ${tableName("condition_observation")} WHERE governing_actor_id=${sqlString(houseId)})`,
});

const SPECS: Readonly<Partial<Record<CourtOsResponsibilityDesignKey, ResponsibilitySpec>>> = {
  office_post_appointments: { packageKey: "information", sections: [byActorAndKey("office_post_authority_assignment")] },
  external_relations_representation: {
    packageKey: "information",
    sections: [
      { table: "external_relations_house_owner", where: (houseId) => `source_house_id=${sqlString(houseId)}` },
      { table: "external_relations_target_delegate", where: (houseId) => `source_house_id=${sqlString(houseId)}` },
    ],
  },
  reception_intake: {
    packageKey: "information",
    // The withheld reception anchors do not carry an admitted House binding.
    // Returning another House's sponsor row would violate the fail-closed contract.
    sections: [globalKey("second_batch_responsibility_status")],
  },
  manor_stewardship: {
    packageKey: "manor",
    sections: [byActor("condition_observation"), byActorManors("discrete_facility_registry", "parent_manor_id"), byActor("project_reconstruction")],
  },
  estate_fabric_maintenance_oversight: {
    packageKey: "manor",
    sections: [byActor("condition_observation"), byActorManors("discrete_facility_registry", "parent_manor_id"), byActor("project_reconstruction")],
  },
  works_project_supervision: { packageKey: "conditional", sections: [byActorAndKey("works_project_assignment_context_v1")] },
  franchise_operations: { packageKey: "conditional", sections: [byActorAndKey("franchise_assignment_context_v1")] },
  portfolio_oversight: { packageKey: "conditional", sections: [byActorAndKey("portfolio_assignment_context_v1")] },
  revenue_right_administration_collection: {
    packageKey: "conditional",
    sections: [byActorAndKey("revenue_right_assignment_withheld_v1"), globalKey("conditional_predicate_catalog_v1")],
  },
  marriage_dynasty_stewardship: {
    packageKey: "marriage",
    sections: [
      byActorAndKey("marriage_authority_assignment_v1"),
      { table: "marriage_subject_current_v1", where: (houseId) => `current_house_id=${sqlString(houseId)}` },
      { table: "succession_snapshot_v1", where: (houseId) => `house_id=${sqlString(houseId)}` },
    ],
  },
  patronage_hospitality_gifts: {
    packageKey: "marriage",
    sections: [{ table: "succession_snapshot_v1", where: (houseId) => `house_id=${sqlString(houseId)}` }],
  },
  records_archives: {
    packageKey: "records",
    sections: [byProtectedHouse("house_manor_scope"), { table: "record_family_catalog", where: () => "1=1" }],
  },
  correspondence_dispatch: {
    packageKey: "records",
    sections: [
      { table: "correspondence_entity", where: (houseId) => `entity_id=${sqlString(houseId)}` },
      { table: "correspondence_operator", where: (houseId) => `entity_id=${sqlString(houseId)}` },
      { table: "correspondence_withheld", where: (houseId) => `entity_id=${sqlString(houseId)}` },
    ],
  },
  house_fiscal_administration: {
    packageKey: "resources",
    sections: [byActorAndKey("fiscal_authority_assignment"), byProtectedHouse("house_manor_scope")],
  },
  manor_fiscal_administration: {
    packageKey: "resources",
    sections: [byActorAndKey("fiscal_authority_assignment"), byProtectedHouse("house_manor_scope")],
  },
  security_asset_protection: {
    packageKey: "security",
    sections: [
      byActorAndKey("security_readiness_authority_assignment"),
      byHouseManors("security_facility_operating_state_v1", "parent_manor_id"),
      byHouseManors("security_fortification_profile_v1"),
      byHouseSecurityFacilities("security_named_post_assignment_v1"),
      byHouseManors("security_functional_custody_assignment_v1", "parent_manor_id"),
    ],
  },
  martial_readiness_training: {
    packageKey: "security",
    sections: [byActorAndKey("security_readiness_authority_assignment"), byHouseManors("martial_service_claim_junction_v1")],
  },
  martial_stores_horse_capacity: {
    packageKey: "security",
    sections: [byActorAndKey("security_readiness_authority_assignment"), byHouseManors("martial_equipment_readiness_v1")],
  },
  household_observance_chaplaincy: {
    packageKey: "church",
    sections: [byActorAndKey("observance_authority_assignment_v1")],
  },
  church_rights_institutional_affairs: {
    packageKey: "church",
    sections: [globalKey("church_rights_current_empty_v1"), { table: "church_house_side_evidence_docket_v1", where: () => "1=1" }],
  },
};

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function assertPackageManifest(value: unknown, expectedPackage: string): asserts value is PackageContract {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Responsibility package ${expectedPackage} manifest must be an object.`);
  }
  const manifest = value as Partial<PackageContract>;
  if (
    manifest.package !== expectedPackage ||
    typeof manifest.status !== "string" ||
    !manifest.status.includes("uat1_admitted_read_model") ||
    manifest.runtime_authority !== false
  ) {
    throw new Error(`Responsibility package ${expectedPackage} failed its admission contract.`);
  }
}

function pickString(row: RawRow, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

function pickBoolean(row: RawRow, keys: readonly string[]): boolean | null {
  for (const key of keys) {
    const value = row[key];
    if (value === true || value === 1 || value === "1" || value === "true") return true;
    if (value === false || value === 0 || value === "0" || value === "false") return false;
  }
  return null;
}

const EVIDENCE_FIELD_ALLOWLIST = new Set([
  "assignment_basis",
  "binding_basis",
  "evidence_id",
  "evidence_ids",
  "owner_selection_evidence_id",
  "owner_selection_evidence_kind",
  "provenance_id",
  "project_ids",
  "reason",
  "source_status",
  "source_truth_status",
]);

export function compactResponsibilityEvidenceReferences(
  row: RawRow,
): readonly { field: string; value: string }[] {
  return Object.entries(row)
    .filter(([field, value]) =>
      value !== null && value !== "" && EVIDENCE_FIELD_ALLOWLIST.has(field),
    )
    .map(([field, value]) => ({ field, value: String(value) }));
}

function workspaceRow(table: string, row: RawRow): ResponsibilityWorkspaceRowV1 {
  const evidence = compactResponsibilityEvidenceReferences(row);
  return {
    source_table: table,
    subject_id: pickString(row, [
      "person_id", "owner_person_id", "accountable_owner_person_id", "resolved_person_id",
      "entity_id", "manor_id", "scope_id", "instance_key", "responsibility_instance_id",
      "authority_assignment_id", "project_id", "facility_id", "id",
    ]),
    subject_label: pickString(row, [
      "display_name", "owner_person_name", "accountable_owner_person_name", "resolved_person_name",
      "entity_name", "manor_label", "manor_display_label", "scope_label", "surface_name", "responsibility_label",
    ]),
    scope_id: pickString(row, [
      "scope_id", "project_id", "facility_id", "responsibility_instance_id", "instance_key",
      "manor_id", "parent_manor_id", "house_id", "source_house_id", "protected_house_id",
    ]),
    scope_label: pickString(row, [
      "scope_label", "manor_label", "manor_display_label", "project_label", "surface_name", "responsibility_label",
    ]),
    accountable_person_id: pickString(row, [
      "accountable_owner_person_id", "resolved_person_id", "owner_person_id", "holder_person_id", "manager_person_id",
    ]),
    accountable_person_label: pickString(row, [
      "accountable_owner_person_name", "resolved_person_name", "owner_person_name", "holder_display_name", "manager_display_name",
    ]),
    player_surface_eligible: pickBoolean(row, ["player_surface_eligible"]),
    state: pickString(row, [
      "workspace_state", "admission_status", "admission_state", "foundation_a_uat_disposition",
      "source_status", "source_truth_status", "status", "readiness_state", "uat1_display_state",
    ]),
    evidence_references: evidence,
  };
}

interface OpenPackage {
  driver: World1116ReadonlySqliteDriver;
  manifest: PackageContract;
  manifestPath: string;
  sqlitePath: string;
  sqliteSha256: string;
  tableName: TableNameResolver;
}

export interface UnifiedResponsibilityPackageBindingV1 {
  packageId: string;
  sourceStatus: string;
  sourceDigest: string;
  manifestJson: string;
  tableNamespace: string;
}

/**
 * House-scoped adapter over the eight Foundation A UAT1 domain packages.
 * It returns only the allow-listed presentation contract above and never
 * coalesces candidates, withheld rows, or conditional-empty workspaces into
 * live runtime facts. Raw source rows never cross the CourtOS API boundary.
 */
export class FoundationAResponsibilityWorkspaceProjection {
  private readonly opened = new Map<PackageKey, Promise<OpenPackage>>();
  private unifiedDriver: Promise<World1116ReadonlySqliteDriver> | undefined;

  constructor(
    private readonly sourceRoot: string,
    private readonly driverFactory: (
      path: string,
    ) => World1116ReadonlySqliteDriver = (path) => new NativeSqliteReadonlyDriver(path),
    private readonly unified?: {
      databasePath: string;
      bindings: Readonly<Record<PackageKey, UnifiedResponsibilityPackageBindingV1>>;
    },
  ) {}

  static fromUnifiedRelease(
    databasePath: string,
    bindings: Readonly<Record<PackageKey, UnifiedResponsibilityPackageBindingV1>>,
    driverFactory: (
      path: string,
    ) => World1116ReadonlySqliteDriver = (path) => new NativeSqliteReadonlyDriver(path),
  ): FoundationAResponsibilityWorkspaceProjection {
    return new FoundationAResponsibilityWorkspaceProjection(
      ".",
      driverFactory,
      { databasePath, bindings },
    );
  }

  private open(packageKey: PackageKey): Promise<OpenPackage> {
    const existing = this.opened.get(packageKey);
    if (existing) return existing;
    const pending = (async () => {
      if (this.unified) {
        const binding = this.unified.bindings[packageKey];
        const packageId = RESPONSIBILITY_PACKAGE_DIRECTORIES[packageKey];
        if (!binding || binding.packageId !== packageId) {
          throw new Error(`Unified Foundation A binding for ${packageId} is unavailable.`);
        }
        const manifestValue: unknown = JSON.parse(binding.manifestJson);
        assertPackageManifest(manifestValue, packageId);
        this.unifiedDriver ??= (async () => {
          const driver = this.driverFactory(this.unified!.databasePath);
          await driver.assertReadPolicy();
          return driver;
        })();
        return {
          driver: await this.unifiedDriver,
          manifest: manifestValue,
          manifestPath: `foundation-a:${packageKey}:manifest`,
          sqlitePath: this.unified.databasePath,
          sqliteSha256: binding.sourceDigest,
          tableName: (logicalName: string) => `${binding.tableNamespace}__${logicalName}`,
        };
      }
      const packageId = RESPONSIBILITY_PACKAGE_DIRECTORIES[packageKey];
      const directory = join(this.sourceRoot, packageId);
      const manifestPath = join(directory, "MANIFEST.json");
      const manifestValue: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
      assertPackageManifest(manifestValue, packageId);
      const sqliteNames = (await readFile(join(directory, "SHA256SUMS.txt"), "utf8"))
        .split(/\r?\n/)
        .map((line) => line.trim().match(/^([a-f0-9]{64})\s+\*?(.+\.sqlite)$/i))
        .filter((match): match is RegExpMatchArray => Boolean(match));
      if (sqliteNames.length !== 1) throw new Error(`${packageId} must admit exactly one SQLite source.`);
      const match = sqliteNames[0];
      if (!match) throw new Error(`${packageId} has no SQLite checksum entry.`);
      const [, expectedHash, sqliteName] = match;
      if (!expectedHash || !sqliteName) throw new Error(`${packageId} SQLite checksum entry is incomplete.`);
      const sqlitePath = join(directory, basename(sqliteName));
      const sqliteSha256 = await sha256(sqlitePath);
      if (sqliteSha256 !== expectedHash.toLowerCase()) {
        throw new Error(`${packageId} SQLite SHA mismatch.`);
      }
      const driver = this.driverFactory(sqlitePath);
      await driver.assertReadPolicy();
      return {
        driver,
        manifest: manifestValue,
        manifestPath,
        sqlitePath,
        sqliteSha256,
        tableName: (logicalName: string) => logicalName,
      };
    })();
    this.opened.set(packageKey, pending);
    return pending;
  }

  async projection(input: {
    houseId: string;
    responsibility: CourtOsResponsibilityDesignKey;
  }): Promise<CourtOsResponsibilityWorkspaceProjectionV1> {
    const catalog = COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES.find(
      (row) => row.responsibility === input.responsibility,
    );
    if (!catalog) throw new Error("Responsibility is not in the canonical 24-key workspace catalog.");
    const canonicalKey = `${KEY_PREFIX}${input.responsibility}`;
    const spec = SPECS[input.responsibility];
    if (!spec) {
      // Six Household-owned keys are intentionally not rebound to one of the
      // eight new packages. Their existing Household projection remains truth.
      return {
        schema_version: "courtos_responsibility_workspace_projection_v1",
        effective_date: "1120-01-01",
        read_only: true,
        command_authority: false,
        query: { house_id: input.houseId, responsibility: input.responsibility },
        workspace: {
          label: input.responsibility,
          package_id: catalog.packageId,
          posture: catalog.posture,
          current_state: catalog.currentState,
          boundary: catalog.boundary,
        },
        source_binding: {
          package_id: catalog.packageId,
          source_digest: null,
          manifest_path: null,
          sqlite_path: null,
          source_status: "existing_household_projection_owned",
          source_owned: false,
        },
        row_count: 0,
        subjects: [],
        rows: [],
        evidence: [...catalog.evidence],
        source_boundaries: [catalog.boundary],
      };
    }

    const opened = await this.open(spec.packageKey);
    const sections = await Promise.all(
      spec.sections.map(async (section) => ({
        table: section.table,
        rows: await opened.driver.all<RawRow>(
          `SELECT * FROM ${opened.tableName(section.table)} WHERE ${section.where(input.houseId, canonicalKey, opened.tableName)} ORDER BY rowid`,
        ),
      })),
    );
    const rows = sections.flatMap(({ table, rows: values }) =>
      values.map((row) => workspaceRow(table, row)),
    );
    const subjects = new Map<string, string | null>();
    for (const row of rows) {
      if (row.subject_id && !subjects.has(row.subject_id)) subjects.set(row.subject_id, row.subject_label);
    }
    return {
      schema_version: "courtos_responsibility_workspace_projection_v1",
      effective_date: opened.manifest.effective_cutpoint ?? "1120-01-01",
      read_only: true,
      command_authority: false,
      query: { house_id: input.houseId, responsibility: input.responsibility },
      workspace: {
        label: rows[0]?.scope_label ?? input.responsibility,
        package_id: catalog.packageId,
        posture: catalog.posture,
        current_state: catalog.currentState,
        boundary: catalog.boundary,
      },
      source_binding: {
        package_id: opened.manifest.package,
        source_digest: opened.sqliteSha256,
        manifest_path: opened.manifestPath,
        sqlite_path: opened.sqlitePath,
        source_status: opened.manifest.status,
        source_owned: true,
      },
      row_count: rows.length,
      subjects: [...subjects].map(([subject_id, subject_label]) => ({ subject_id, subject_label })),
      rows,
      evidence: [...catalog.evidence],
      source_boundaries: [...(opened.manifest.boundaries ?? []), catalog.boundary],
    };
  }

  async openingSuccessionIdentity(
    houseId: string,
  ): Promise<CourtOsOpeningSuccessionIdentityV1 | null> {
    const opened = await this.open("marriage");
    const rows = await opened.driver.all<CourtOsOpeningSuccessionIdentityV1>(
      `SELECT authority_status, source_truth_layer, regency_required, source_truth_head_person_id, source_truth_head_status FROM ${opened.tableName("succession_snapshot_v1")} WHERE house_id=${sqlString(houseId)} ORDER BY rowid LIMIT 2`,
    );
    if (rows.length > 1) {
      throw new Error("The selected House has multiple opening succession identities.");
    }
    return rows[0] ?? null;
  }

  async close(): Promise<void> {
    if (this.unifiedDriver) {
      await this.unifiedDriver.then((driver) => driver.close()).catch(() => undefined);
      return;
    }
    await Promise.all([...this.opened.values()].map((entry) => entry.then(({ driver }) => driver.close()).catch(() => undefined)));
  }
}
