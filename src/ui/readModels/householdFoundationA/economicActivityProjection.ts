import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../world1116/sqliteReadonlyDriver";
import type {
  Household1120EconomicActivityLookbackRow,
  Household1120ProvenanceRow,
} from "../household1120/types";
import { resolveManifestArtifactPath } from "./manifestArtifactPath";

export const FOUNDATION_A_HOUSEHOLD_ECONOMIC_ACTIVITY_PROJECTION_ID =
  "foundation_a_household_economic_activity_projection_v1" as const;

interface EconomicActivityManifest {
  schema_version: typeof FOUNDATION_A_HOUSEHOLD_ECONOMIC_ACTIVITY_PROJECTION_ID;
  generation_id: string;
  effective_date: "1120-01-01";
  status: "founder_approved_foundation_a_uat_economic_lookback";
  temporal_coverage: { start: "1117-01-01"; end: "1119-12-31" };
  artifact: { path: string; sha256: string };
  runtime_authority: false;
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

function assertManifest(value: unknown): asserts value is EconomicActivityManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Foundation A economic activity manifest must be an object.");
  }
  const manifest = value as Partial<EconomicActivityManifest>;
  if (
    manifest.schema_version !== FOUNDATION_A_HOUSEHOLD_ECONOMIC_ACTIVITY_PROJECTION_ID ||
    manifest.effective_date !== "1120-01-01" ||
    manifest.status !== "founder_approved_foundation_a_uat_economic_lookback" ||
    manifest.runtime_authority !== false ||
    manifest.temporal_coverage?.start !== "1117-01-01" ||
    manifest.temporal_coverage?.end !== "1119-12-31" ||
    !manifest.generation_id ||
    !manifest.artifact?.path ||
    !/^[a-f0-9]{64}$/.test(manifest.artifact.sha256)
  ) {
    throw new Error("Foundation A economic activity manifest failed its contract.");
  }
}

/**
 * Read-only bridge for the founder-approved economic harness lookback.
 * This is evidence for planning review, not a Stores movement ledger or an
 * execution result. It deliberately remains outside the frozen Household
 * SQLite so its separate source and temporal limits remain visible.
 */
export class FoundationAHouseholdEconomicActivityProjection {
  private constructor(
    private readonly manifest: EconomicActivityManifest,
    private readonly driver: World1116ReadonlySqliteDriver,
  ) {}

  static async open(manifestPath: string): Promise<FoundationAHouseholdEconomicActivityProjection> {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    assertManifest(manifest);
    const databasePath = resolveManifestArtifactPath(manifestPath, manifest.artifact.path);
    if ((await sha256File(databasePath)) !== manifest.artifact.sha256) {
      throw new Error("Foundation A economic activity SQLite SHA mismatch.");
    }
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new FoundationAHouseholdEconomicActivityProjection(manifest, driver);
  }

  async activityForHouse(houseId: string): Promise<Household1120EconomicActivityLookbackRow[]> {
    const trimmedHouseId = houseId.trim();
    if (!trimmedHouseId) throw new Error("Economic activity projection requires a House identifier.");
    const rows = await this.driver.all<EconomicActivitySourceRow>(`
      SELECT activity_id, source_economic_leg_id, activity_year, effective_date,
             resource_id, flow_family, regularity, direction, signed_amount,
             counterparty_entity_id, counterparty_label, temporal_basis, evidence_status
      FROM ro_household_economic_activity_lookback_v1
      WHERE protected_house_id=${sqlString(trimmedHouseId)}
      ORDER BY activity_year DESC, activity_id
    `);
    return rows.map((row) => ({
      ...row,
      source_authority_status: row.evidence_status,
      runtime_authority: 0,
      disclosure_posture: "founder_approved_provisional_economic_lookback_1117_1119",
    }));
  }

  provenance(rowCount: number): Household1120ProvenanceRow {
    return {
      provenance_id: `foundation-a-economic-activity:${this.manifest.generation_id}`,
      record_kind: "surface",
      record_key: "ro_household_economic_activity_lookback_v1",
      source_path: this.manifest.artifact.path,
      source_sha256: this.manifest.artifact.sha256,
      admission_state: "projected_read_ready",
      row_count: rowCount,
      withheld_reason: null,
      effective_date: "1120-01-01",
      source_authority_status: "founder_approved_foundation_a_uat_economic_lookback",
      runtime_authority: 0,
      disclosure_posture: "provisional_economic_evidence_not_execution_receipt",
    };
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
