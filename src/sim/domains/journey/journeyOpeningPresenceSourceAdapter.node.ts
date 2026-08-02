import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import path from "node:path";

import type { JourneyOpeningPresenceInputV1 } from "./journeyLifecycle";

export const JOURNEY_OPENING_PRESENCE_SOURCE_ADAPTER_SCHEMA_VERSION =
  "phase_five_journey_opening_presence_source_adapter_v1" as const;

export const JOURNEY_OPENING_PRESENCE_PACKAGE_ID =
  "t0_realm_residence_event_state_v1" as const;
export const JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE = "1120-01-01" as const;

export const JOURNEY_OPENING_PRESENCE_SOURCE_PATHS = {
  currentState:
    "data/genrun/t0_realm_residence_event_state_v1/PersonResidenceCurrentState__c.jsonl",
  sqlite:
    "data/genrun/t0_realm_residence_event_state_v1/turn0_realm_residence_event_state_v1.sqlite",
  manifest: "data/genrun/t0_realm_residence_event_state_v1/MANIFEST.json",
  lockRegistry:
    "data/genrun/t0_person_household_state_cross_domain_audit_v9/authoritative_lock_registry.json",
} as const;

type JourneyResidenceCurrentSourceRowV1 = {
  id: string;
  person_id: string;
  person_name: string;
  current_house_id: string;
  current_house_name: string;
  residence_entity_id: string;
  residence_label: string;
  residence_state_basis: string;
  opening_household_status_receipt_id: string;
  latest_residence_change_receipt_id: string | null;
  as_of: string;
  runtime_authority: string | boolean;
  sqlite_readiness_authority: string | boolean;
};

type JourneyOpeningPresenceManifestV1 = {
  package_id: string;
  effective_from: string;
  status: string;
  runtime_authority: boolean;
  sqlite_readiness_authority: boolean;
  outputs: Array<{ path: string; sha256: string; rows: number | null }>;
};

type JourneyOpeningPresenceLockRegistryV1 = {
  authoritative_packages: Array<{
    package_id: string;
    manifest: string;
    status: string;
  }>;
};

export interface JourneyOpeningPresenceAdmissionGrantV1 {
  schema_version: "phase_five_journey_opening_presence_admission_grant_v1";
  package_id: typeof JOURNEY_OPENING_PRESENCE_PACKAGE_ID;
  effective_date: typeof JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE;
  admitted_sqlite_sha256: string;
  admission_ref: string;
  runtime_authority: true;
}

export interface JourneyOpeningPresenceEvidenceRowV1 {
  person_id: string;
  person_label: string;
  acting_house_id: string;
  acting_house_label: string;
  location_id: string;
  location_label: string;
  as_of: string;
  residence_state_basis: string;
  source_row_id: string;
  source_refs: readonly string[];
  source_status: "locked_sqlite_readiness_pending_runtime_admission";
  runtime_authority: false;
}

export interface JourneyOpeningPresenceHouseScopeV1 {
  person_id: string;
  acting_house_id: string;
  source_refs: readonly string[];
  runtime_authority: true;
}

export interface JourneyOpeningPresenceSourceResultV1 {
  schema_version: typeof JOURNEY_OPENING_PRESENCE_SOURCE_ADAPTER_SCHEMA_VERSION;
  package_id: typeof JOURNEY_OPENING_PRESENCE_PACKAGE_ID;
  effective_date: typeof JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE;
  sqlite_sha256: string;
  current_state_sha256: string;
  source_status:
    | "locked_sqlite_readiness_pending_runtime_admission"
    | "admitted_runtime_input";
  runtime_authority: boolean;
  evidence_rows: readonly JourneyOpeningPresenceEvidenceRowV1[];
  opening_presence: readonly JourneyOpeningPresenceInputV1[];
  admitted_house_scope: readonly JourneyOpeningPresenceHouseScopeV1[];
  pending_admission_count: number;
  withheld_reason_codes: readonly string[];
  admission_ref: string | null;
  boundaries: {
    source_rows_rewritten: false;
    residence_inferred_from_duty_station: false;
    candidate_fixture_promoted: false;
    runtime_seed_requires_explicit_admission_grant: true;
  };
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trueText(value: unknown): boolean {
  return value === true || value === 1 || clean(value).toLowerCase() === "true";
}

function stableStrings(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.map(clean).filter(Boolean))].sort();
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function readJsonLines<T>(filePath: string): T[] {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function validateControlPlane(input: {
  manifest: JourneyOpeningPresenceManifestV1;
  registry: JourneyOpeningPresenceLockRegistryV1;
  sqliteRepositoryPath: string;
  sqliteSha256: string;
  currentStateRepositoryPath: string;
  currentStateSha256: string;
}): void {
  const { manifest, registry } = input;
  if (manifest.package_id !== JOURNEY_OPENING_PRESENCE_PACKAGE_ID) {
    throw new Error("journey_opening_presence_manifest_package_mismatch");
  }
  if (manifest.effective_from !== JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE) {
    throw new Error("journey_opening_presence_effective_date_mismatch");
  }
  if (manifest.runtime_authority !== false || manifest.sqlite_readiness_authority !== true) {
    throw new Error("journey_opening_presence_source_authority_boundary_changed");
  }
  const registered = registry.authoritative_packages.find(
    (row) => row.package_id === JOURNEY_OPENING_PRESENCE_PACKAGE_ID,
  );
  if (!registered || !registered.status.includes("pending_live_runtime_admission")) {
    throw new Error("journey_opening_presence_lock_registry_entry_missing");
  }
  const expectedOutput = manifest.outputs.find(
    (row) => path.normalize(row.path) === path.normalize(input.sqliteRepositoryPath),
  );
  if (!expectedOutput || expectedOutput.sha256 !== input.sqliteSha256) {
    throw new Error("journey_opening_presence_sqlite_digest_mismatch");
  }
  const expectedCurrentState = manifest.outputs.find(
    (row) => path.normalize(row.path) === path.normalize(input.currentStateRepositoryPath),
  );
  if (!expectedCurrentState || expectedCurrentState.sha256 !== input.currentStateSha256) {
    throw new Error("journey_opening_presence_current_state_digest_mismatch");
  }
}

function evidenceFromRow(
  row: JourneyResidenceCurrentSourceRowV1,
): JourneyOpeningPresenceEvidenceRowV1 {
  const personId = clean(row.person_id);
  const houseId = clean(row.current_house_id);
  const locationId = clean(row.residence_entity_id);
  if (!personId || !houseId || !locationId) {
    throw new Error(`journey_opening_presence_incomplete_row:${clean(row.id) || "unknown"}`);
  }
  if (row.as_of !== JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE) {
    throw new Error(`journey_opening_presence_wrong_cutpoint:${personId}`);
  }
  if (trueText(row.runtime_authority) || !trueText(row.sqlite_readiness_authority)) {
    throw new Error(`journey_opening_presence_row_authority_boundary_changed:${personId}`);
  }
  return {
    person_id: personId,
    person_label: clean(row.person_name) || personId,
    acting_house_id: houseId,
    acting_house_label: clean(row.current_house_name) || houseId,
    location_id: locationId,
    location_label: clean(row.residence_label) || locationId,
    as_of: row.as_of,
    residence_state_basis: clean(row.residence_state_basis) || "unresolved",
    source_row_id: clean(row.id),
    source_refs: stableStrings([
      JOURNEY_OPENING_PRESENCE_SOURCE_PATHS.currentState,
      clean(row.id),
      clean(row.opening_household_status_receipt_id),
      clean(row.latest_residence_change_receipt_id),
    ]),
    source_status: "locked_sqlite_readiness_pending_runtime_admission",
    runtime_authority: false,
  };
}

function admitted(grant: JourneyOpeningPresenceAdmissionGrantV1 | null | undefined, sha256: string): boolean {
  if (!grant) return false;
  if (
    grant.package_id !== JOURNEY_OPENING_PRESENCE_PACKAGE_ID ||
    grant.effective_date !== JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE ||
    grant.admitted_sqlite_sha256 !== sha256 ||
    grant.runtime_authority !== true ||
    !clean(grant.admission_ref)
  ) {
    throw new Error("invalid_journey_opening_presence_admission_grant");
  }
  return true;
}

/**
 * Loads the founder-locked residence current-state package as exact evidence.
 * The package is SQLite-ready but not runtime-admitted.  Consequently this
 * adapter returns no Journey runtime seed unless the caller injects a matching
 * admission grant from a separately governed promotion step.
 */
export async function loadJourneyOpeningPresenceSource(input: {
  rootDirectory?: string;
  admissionGrant?: JourneyOpeningPresenceAdmissionGrantV1 | null;
} = {}): Promise<JourneyOpeningPresenceSourceResultV1> {
  const root = input.rootDirectory ?? process.cwd();
  const currentStatePath = path.resolve(root, JOURNEY_OPENING_PRESENCE_SOURCE_PATHS.currentState);
  const sqlitePath = path.resolve(root, JOURNEY_OPENING_PRESENCE_SOURCE_PATHS.sqlite);
  const manifestPath = path.resolve(root, JOURNEY_OPENING_PRESENCE_SOURCE_PATHS.manifest);
  const registryPath = path.resolve(root, JOURNEY_OPENING_PRESENCE_SOURCE_PATHS.lockRegistry);
  const [manifest, registry, sqliteSha256, currentStateSha256] = await Promise.all([
    Promise.resolve(readJson<JourneyOpeningPresenceManifestV1>(manifestPath)),
    Promise.resolve(readJson<JourneyOpeningPresenceLockRegistryV1>(registryPath)),
    sha256File(sqlitePath),
    sha256File(currentStatePath),
  ]);
  validateControlPlane({
    manifest,
    registry,
    sqliteRepositoryPath: JOURNEY_OPENING_PRESENCE_SOURCE_PATHS.sqlite,
    sqliteSha256,
    currentStateRepositoryPath: JOURNEY_OPENING_PRESENCE_SOURCE_PATHS.currentState,
    currentStateSha256,
  });
  const rows = readJsonLines<JourneyResidenceCurrentSourceRowV1>(currentStatePath)
    .sort((left, right) => clean(left.person_id).localeCompare(clean(right.person_id)));
  const evidenceRows = rows.map(evidenceFromRow);
  if (new Set(evidenceRows.map((row) => row.person_id)).size !== evidenceRows.length) {
    throw new Error("duplicate_journey_opening_presence_person");
  }
  const hasAdmission = admitted(input.admissionGrant, sqliteSha256);
  const admissionRef = hasAdmission ? clean(input.admissionGrant?.admission_ref) : null;
  const openingPresence: JourneyOpeningPresenceInputV1[] = hasAdmission
    ? evidenceRows.map((row) => ({
        person_id: row.person_id,
        location_id: row.location_id,
        evidence_refs: stableStrings([...row.source_refs, admissionRef]),
      }))
    : [];
  const admittedHouseScope: JourneyOpeningPresenceHouseScopeV1[] = hasAdmission
    ? evidenceRows.map((row) => ({
        person_id: row.person_id,
        acting_house_id: row.acting_house_id,
        source_refs: stableStrings([...row.source_refs, admissionRef]),
        runtime_authority: true,
      }))
    : [];
  return {
      schema_version: JOURNEY_OPENING_PRESENCE_SOURCE_ADAPTER_SCHEMA_VERSION,
      package_id: JOURNEY_OPENING_PRESENCE_PACKAGE_ID,
      effective_date: JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE,
      sqlite_sha256: sqliteSha256,
      current_state_sha256: currentStateSha256,
      source_status: hasAdmission
        ? "admitted_runtime_input"
        : "locked_sqlite_readiness_pending_runtime_admission",
      runtime_authority: hasAdmission,
      evidence_rows: evidenceRows,
      opening_presence: openingPresence,
      admitted_house_scope: admittedHouseScope,
      pending_admission_count: hasAdmission ? 0 : evidenceRows.length,
      withheld_reason_codes: hasAdmission ? [] : ["opening_presence_pending_live_runtime_admission"],
      admission_ref: admissionRef,
      boundaries: {
        source_rows_rewritten: false,
        residence_inferred_from_duty_station: false,
        candidate_fixture_promoted: false,
        runtime_seed_requires_explicit_admission_grant: true,
      },
  };
}
