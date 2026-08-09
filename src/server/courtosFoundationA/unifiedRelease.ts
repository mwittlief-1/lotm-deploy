import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../../ui/readModels/world1116/sqliteReadonlyDriver";
import type { CouncilRoomReadyProjectionV1 } from "../../ready/councilRoomReadyProjection";
import type { CourtOsSpatialPortfolio } from "../../ui/spatial/courtosSpatialContract";
import type { CourtOsManorFabricVisualFactsV1 } from "../courtos1120Api/manorFabricVisualAdapter";
import {
  RESPONSIBILITY_PACKAGE_DIRECTORIES,
  type ResponsibilityPackageKey,
  type UnifiedResponsibilityPackageBindingV1,
} from "../courtos1120Api/responsibilityWorkspaceProjection";

export const COURTOS_FOUNDATION_A_RELEASE_SCHEMA_VERSION =
  "merecross_foundation_a_release_v1" as const;
export const COURTOS_FOUNDATION_A_RELEASE_REPOSITORY_MANIFEST_PATH =
  ".courtos-generated/foundation-a/MANIFEST.json" as const;

type UnifiedManifest = {
  schema_version: typeof COURTOS_FOUNDATION_A_RELEASE_SCHEMA_VERSION;
  generation_id: string;
  effective_date: "1120-01-01";
  status: "compiled_runtime_candidate_pending_engineering_qa";
  boundary: {
    immutable_current_state: true;
    mutable_player_state: false;
    source_truth_mutation: false;
    raw_source_runtime_traversal_required: false;
    render_assets_external: true;
  };
  artifact: { path: string; sha256: string };
};

export type CourtOsFoundationAReleaseSourceV1 = {
  source_id: string;
  package_id: string;
  source_status: string;
  manifest_path: string;
  manifest_sha256: string;
  manifest_json: string;
  sqlite_path: string;
  sqlite_sha256: string;
  table_namespace: string | null;
  table_count: number;
  row_count: number;
};

type ProjectionJsonRow = { projection_json: string };

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

function assertManifest(value: unknown): asserts value is UnifiedManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CourtOS Foundation A release manifest must be an object.");
  }
  const manifest = value as Partial<UnifiedManifest>;
  if (
    manifest.schema_version !== COURTOS_FOUNDATION_A_RELEASE_SCHEMA_VERSION ||
    manifest.effective_date !== "1120-01-01" ||
    manifest.status !== "compiled_runtime_candidate_pending_engineering_qa" ||
    !/^[a-f0-9]{64}$/.test(manifest.generation_id ?? "") ||
    !manifest.artifact?.path ||
    !/^[a-f0-9]{64}$/.test(manifest.artifact.sha256 ?? "") ||
    manifest.boundary?.immutable_current_state !== true ||
    manifest.boundary.mutable_player_state !== false ||
    manifest.boundary.source_truth_mutation !== false ||
    manifest.boundary.raw_source_runtime_traversal_required !== false ||
    manifest.boundary.render_assets_external !== true
  ) {
    throw new Error("CourtOS Foundation A release manifest failed its contract.");
  }
}

/**
 * Single immutable CourtOS current-state database. It verifies the outer
 * release before opening SQLite and exposes only compiled projections or
 * exact admitted source identities; callers never traverse data/genrun,
 * data/ready, CSV, or XMAP JSON at runtime.
 */
export class CourtOsFoundationAUnifiedRelease {
  private constructor(
    readonly manifestPath: string,
    readonly databasePath: string,
    readonly generationId: string,
    readonly artifactSha256: string,
    private readonly driver: World1116ReadonlySqliteDriver,
  ) {}

  static async open(
    manifestPath: string,
  ): Promise<CourtOsFoundationAUnifiedRelease> {
    const manifestValue: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    assertManifest(manifestValue);
    const repositoryRoot = resolve(dirname(manifestPath), "../..");
    const databasePath = resolve(repositoryRoot, manifestValue.artifact.path);
    if ((await sha256File(databasePath)) !== manifestValue.artifact.sha256) {
      throw new Error("CourtOS Foundation A release SQLite SHA mismatch.");
    }
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    const metadata = await driver.all<{
      schema_version: string;
      generation_id: string;
      effective_date: string;
      read_only: number;
      source_truth_mutation: number;
    }>(
      "SELECT schema_version, generation_id, effective_date, read_only, source_truth_mutation " +
        "FROM foundation_release_metadata_v1",
    );
    const row = metadata[0];
    if (
      metadata.length !== 1 ||
      row?.schema_version !== manifestValue.schema_version ||
      row.generation_id !== manifestValue.generation_id ||
      row.effective_date !== manifestValue.effective_date ||
      Number(row.read_only) !== 1 ||
      Number(row.source_truth_mutation) !== 0
    ) {
      await driver.close();
      throw new Error("CourtOS Foundation A embedded release identity mismatch.");
    }
    return new CourtOsFoundationAUnifiedRelease(
      manifestPath,
      databasePath,
      manifestValue.generation_id,
      manifestValue.artifact.sha256,
      driver,
    );
  }

  async source(sourceId: string): Promise<CourtOsFoundationAReleaseSourceV1> {
    const rows = await this.driver.all<CourtOsFoundationAReleaseSourceV1>(
      `SELECT * FROM foundation_release_source_v1 WHERE source_id=${sqlString(sourceId)} LIMIT 2`,
    );
    if (rows.length !== 1 || !rows[0]) {
      throw new Error(`CourtOS Foundation A source ${sourceId} is not uniquely bound.`);
    }
    return rows[0];
  }

  async assertSource(input: {
    sourceId: string;
    packageId: string;
    sqliteSha256: string;
  }): Promise<CourtOsFoundationAReleaseSourceV1> {
    const source = await this.source(input.sourceId);
    if (
      source.package_id !== input.packageId ||
      source.sqlite_sha256 !== input.sqliteSha256
    ) {
      throw new Error(`CourtOS Foundation A source ${input.sourceId} is stale or mixed.`);
    }
    return source;
  }

  async councilRoom(houseId: string): Promise<CouncilRoomReadyProjectionV1> {
    const rows = await this.driver.all<ProjectionJsonRow>(
      `SELECT projection_json FROM council_room_projection_v1 WHERE house_id=${sqlString(houseId)} LIMIT 2`,
    );
    if (rows.length !== 1 || !rows[0]) {
      throw new Error("The selected House has no compiled Council Room projection.");
    }
    const projection = JSON.parse(rows[0].projection_json) as CouncilRoomReadyProjectionV1;
    if (
      projection.schema_version !== "council_room_ready_projection_v1" ||
      projection.house_ref.entity_id !== houseId
    ) {
      throw new Error("The compiled Council Room projection failed its House scope.");
    }
    return projection;
  }

  async spatialPortfolio(houseId: string): Promise<CourtOsSpatialPortfolio | null> {
    const rows = await this.driver.all<ProjectionJsonRow>(
      `SELECT projection_json FROM spatial_house_projection_v1 WHERE house_id=${sqlString(houseId)} LIMIT 2`,
    );
    if (rows.length === 0) return null;
    if (rows.length !== 1 || !rows[0]) {
      throw new Error("The selected House has multiple compiled spatial projections.");
    }
    const portfolio = JSON.parse(rows[0].projection_json) as CourtOsSpatialPortfolio;
    if (portfolio.house_id !== houseId || portfolio.association_posture !== "ui_admitted") {
      throw new Error("The compiled spatial projection failed its House scope.");
    }
    return portfolio;
  }

  async manorFabric(input: {
    manorId: string;
    houseId: string;
  }): Promise<CourtOsManorFabricVisualFactsV1> {
    const rows = await this.driver.all<
      ProjectionJsonRow & { governing_actor_id: string }
    >(
      `SELECT governing_actor_id, projection_json FROM manor_fabric_projection_v1 ` +
        `WHERE manor_id=${sqlString(input.manorId)} LIMIT 2`,
    );
    if (rows.length !== 1 || !rows[0]) {
      throw new Error("The selected manor has no compiled Manor Fabric projection.");
    }
    if (rows[0].governing_actor_id !== input.houseId) {
      throw new Error(
        "The compiled Manor Fabric governing actor does not match the requested House.",
      );
    }
    const projection = JSON.parse(
      rows[0].projection_json,
    ) as CourtOsManorFabricVisualFactsV1;
    if (
      projection.schema_version !== "courtos_manor_fabric_visual_facts_v1" ||
      projection.manor.manor_id !== input.manorId ||
      projection.manor.governing_actor_id !== input.houseId
    ) {
      throw new Error("The compiled Manor Fabric projection failed its scope.");
    }
    return projection;
  }

  async responsibilityBindings(): Promise<
    Readonly<Record<ResponsibilityPackageKey, UnifiedResponsibilityPackageBindingV1>>
  > {
    const entries = await Promise.all(
      Object.entries(RESPONSIBILITY_PACKAGE_DIRECTORIES).map(
        async ([key, packageId]) => {
          const source = await this.source(`responsibility_${key}`);
          const expectedNamespace = `responsibility_${key}`;
          if (
            source.package_id !== packageId ||
            source.table_namespace !== expectedNamespace ||
            !source.source_status.includes("uat1_admitted_read_model")
          ) {
            throw new Error(`CourtOS responsibility source ${key} is stale or mixed.`);
          }
          return [
            key as ResponsibilityPackageKey,
            {
              packageId,
              sourceStatus: source.source_status,
              sourceDigest: source.sqlite_sha256,
              manifestJson: source.manifest_json,
              tableNamespace: expectedNamespace,
            },
          ] as const;
        },
      ),
    );
    return Object.freeze(Object.fromEntries(entries)) as Readonly<
      Record<ResponsibilityPackageKey, UnifiedResponsibilityPackageBindingV1>
    >;
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
