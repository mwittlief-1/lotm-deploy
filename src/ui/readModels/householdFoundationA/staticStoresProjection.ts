import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../world1116/sqliteReadonlyDriver";
import type {
  Household1120ProvenanceRow,
  Household1120StoresPositionRow,
} from "../household1120/types";

export const FOUNDATION_A_STATIC_STORES_PROJECTION_SCHEMA =
  "foundation_a_static_1120_uat_stores_projection_v1" as const;
export const FOUNDATION_A_STATIC_STORES_PROJECTION_STATUS =
  "founder_approved_provisional_1120_uat_opening_state_not_historical_successor" as const;

interface FoundationAStaticStoresManifestV1 {
  schema_version: typeof FOUNDATION_A_STATIC_STORES_PROJECTION_SCHEMA;
  package_id: "foundation_a_static_1120_uat_stores_projection_v1";
  generation_id: string;
  status: typeof FOUNDATION_A_STATIC_STORES_PROJECTION_STATUS;
  effective_date: "1120-01-01";
  source_effective_date: "1116-01-01";
  foundation_a_uat_only: true;
  historical_replay_claim: false;
  planning_availability_posture: "available";
  receipt_lineage: "none_provisional_opening_baseline";
  output: { path: string; sha256: string };
}

interface StaticStoresRow {
  stores_position_id: string;
  household_entity_id: string;
  resource_id: string;
  quantity_integer: number;
  position_state: string;
  availability_posture: "available";
  source_effective_date: string;
  uat_effective_date: string;
  source_path: string;
  source_sha256: string;
  foundation_a_uat_only: number;
  historical_replay_claim: number;
  receipt_ids_json: "[]";
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

function assertManifest(value: unknown): asserts value is FoundationAStaticStoresManifestV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Foundation A static Stores manifest must be an object.");
  }
  const manifest = value as Record<string, unknown>;
  if (manifest.schema_version !== FOUNDATION_A_STATIC_STORES_PROJECTION_SCHEMA) {
    throw new Error("Unsupported Foundation A static Stores manifest schema.");
  }
  if (manifest.package_id !== "foundation_a_static_1120_uat_stores_projection_v1") {
    throw new Error("Unexpected Foundation A static Stores package identity.");
  }
  if (typeof manifest.generation_id !== "string" || !manifest.generation_id) {
    throw new Error("Foundation A static Stores generation is required.");
  }
  if (manifest.status !== FOUNDATION_A_STATIC_STORES_PROJECTION_STATUS) {
    throw new Error("Foundation A static Stores projection is not founder-approved for UAT.");
  }
  if (
    manifest.effective_date !== "1120-01-01" ||
    manifest.source_effective_date !== "1116-01-01" ||
    manifest.foundation_a_uat_only !== true ||
    manifest.historical_replay_claim !== false ||
    manifest.planning_availability_posture !== "available" ||
    manifest.receipt_lineage !== "none_provisional_opening_baseline"
  ) {
    throw new Error("Foundation A static Stores manifest violates its provisional UAT boundary.");
  }
  const output = manifest.output;
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("Foundation A static Stores manifest output is required.");
  }
  const typedOutput = output as Record<string, unknown>;
  if (typeof typedOutput.path !== "string" || !typedOutput.path || !isSha256(typedOutput.sha256)) {
    throw new Error("Foundation A static Stores manifest output is invalid.");
  }
}

/**
 * Read-only adapter for the generated Stores projection. It intentionally
 * returns only owner positions bound by the data builder to the requested
 * protected House. The CourtOS household selector is retained only as the
 * response scope; it is never used to invent a separate economic identity.
 * This adapter never joins raw economic source rows at request time and has
 * no receipt/history surface to merge.
 */
export class FoundationAStaticStoresProjection {
  private constructor(
    private readonly manifest: FoundationAStaticStoresManifestV1,
    private readonly driver: World1116ReadonlySqliteDriver,
  ) {}

  static async open(manifestPath: string): Promise<FoundationAStaticStoresProjection> {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    assertManifest(manifest);
    const databasePath = resolve(process.cwd(), manifest.output.path);
    const actualSha256 = await sha256File(databasePath);
    if (actualSha256 !== manifest.output.sha256) {
      throw new Error("Foundation A static Stores SQLite SHA mismatch.");
    }
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new FoundationAStaticStoresProjection(manifest, driver);
  }

  async positions(input: {
    householdEntityId: string;
    houseId: string;
  }): Promise<readonly Household1120StoresPositionRow[]> {
    const householdEntityId = input.householdEntityId.trim();
    const houseId = input.houseId.trim();
    if (!householdEntityId || !houseId) {
      throw new Error("Foundation A static Stores requires household and House identifiers.");
    }
    const rows = await this.driver.all<StaticStoresRow>(
      `SELECT stores_position_id, household_entity_id, resource_id, quantity_integer,
              position_state, availability_posture, source_effective_date,
              uat_effective_date, source_path, source_sha256,
              foundation_a_uat_only, historical_replay_claim, receipt_ids_json
       FROM ro_foundation_a_stores_position_v1
       WHERE protected_house_id=${sqlString(houseId)}
       ORDER BY resource_id, stores_position_id`,
    );
    return rows.map((row) => {
      if (
        row.uat_effective_date !== "1120-01-01" ||
        row.source_effective_date !== "1116-01-01" ||
        row.availability_posture !== "available" ||
        row.foundation_a_uat_only !== 1 ||
        row.historical_replay_claim !== 0 ||
        row.receipt_ids_json !== "[]"
      ) {
        throw new Error("Foundation A static Stores row violates provisional UAT policy.");
      }
      return {
        stores_position_id: row.stores_position_id,
        household_entity_id: householdEntityId,
        resource_id: row.resource_id,
        quantity_integer: row.quantity_integer,
        position_state: row.position_state,
        custody_id: null,
        capacity_id: null,
        effective_date: row.uat_effective_date,
        source_authority_status:
          "founder_approved_provisional_static_1116_position_displayed_at_1120_uat_epoch",
        runtime_authority: 0,
        disclosure_posture: "provisional_uat_planning_position_no_historical_receipt_claim",
        availability_posture: row.availability_posture,
        source_effective_date: row.source_effective_date,
        projection_generation_id: this.manifest.generation_id,
      };
    });
  }

  provenance(rowCount: number): Household1120ProvenanceRow {
    return {
      provenance_id: `source:foundation-a-static-stores:${this.manifest.generation_id}`,
      record_kind: "surface",
      record_key: "ro_household_stores_position_v1",
      source_path: this.manifest.output.path,
      source_sha256: this.manifest.output.sha256,
      admission_state: "projected_read_ready",
      row_count: rowCount,
      withheld_reason: null,
      effective_date: this.manifest.effective_date,
      source_authority_status: FOUNDATION_A_STATIC_STORES_PROJECTION_STATUS,
      runtime_authority: 0,
      disclosure_posture: "provisional_uat_planning_position_no_historical_receipt_claim",
    };
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
