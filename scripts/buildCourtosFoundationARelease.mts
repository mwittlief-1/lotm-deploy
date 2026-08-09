#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import Database from "better-sqlite3";

import { buildCouncilRoomReadyProjection } from "../src/ready/councilRoomReadyProjection";
import { loadFoundationAManorFabricVisualFactsV1 } from "../src/server/courtos1120Api/manorFabricVisualSource.node";
import { RESPONSIBILITY_PACKAGE_DIRECTORIES } from "../src/server/courtos1120Api/responsibilityWorkspaceProjection";

const ROOT = process.cwd();
const SCHEMA_VERSION = "merecross_foundation_a_release_v1";
const COMPILER_REVISION = "2026-08-08.2";
const EFFECTIVE_DATE = "1120-01-01";
const OUTPUT_ROOT = resolve(ROOT, ".courtos-generated/foundation-a");
const CORE_MANIFEST =
  "data/uat/courtos_read_only_uat_contract_v1/generations/d338fca408a5bfb6bfe65c66a2dc18c0adbad0934d7879f4835806f6492ef2b9/MANIFEST.json";
const HOUSEHOLD_MANIFEST =
  "data/genrun/foundation_a_household_runtime_release_v1/MANIFEST.json";
const ELIGIBILITY_DIRECTORY =
  "data/genrun/phase_five_courtos_alternate_steward_eligibility_admission_v1";
const HOUSE_MANOR_DIRECTORY =
  "data/genrun/phase_five_foundation_a_uat_house_manor_scope_admission_v1";
const COUNCIL_INDEX =
  "data/ready/world_1120_turn0/readmodels/council_room_ready_index_v1/council_room_ready_index_v1.json";
const SPATIAL_PROJECTION = ".courtos-generated/courtos_spatial_read_model_v1.json";
const XMAP_MANORS = "data/map/xmap_alpha_v1/manor_units_v1.json";
const MAPGEN_MANIFEST = "data/map/mapgen_exports/courtos_mapgen_export_manifest_v1.json";
const MANOR_FABRIC_DIRECTORY =
  "data/genrun/phase_five_manor_operations_uat1_admission_v1";

type JsonObject = Record<string, unknown>;

type SqliteSource = {
  sourceId: string;
  packageId: string;
  status: string;
  manifestPath: string;
  sqlitePath: string;
  sqliteSha256: string;
  namespace: string | null;
};

function progress(message: string): void {
  process.stderr.write(`[Foundation A] ${message}\n`);
}

function fail(message: string): never {
  throw new Error(`Foundation A release build failed: ${message}`);
}

function json(path: string): JsonObject {
  const value: unknown = JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${path} is not a JSON object`);
  }
  return value as JsonObject;
}

function sha256Bytes(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256Bytes(readFileSync(resolve(ROOT, path)));
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) fail(`${label} is absent`);
  return value;
}

function checksumForSqlite(directory: string): { path: string; sha256: string } {
  const lines = readFileSync(resolve(ROOT, directory, "SHA256SUMS.txt"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matches = lines
    .map((line) => /^([a-f0-9]{64})\s+\*?(.+\.sqlite)$/i.exec(line))
    .filter((match): match is RegExpMatchArray => Boolean(match));
  if (matches.length !== 1 || !matches[0]?.[1] || !matches[0]?.[2]) {
    fail(`${directory} must pin exactly one SQLite artifact`);
  }
  return {
    path: join(directory, basename(matches[0][2])),
    sha256: matches[0][1].toLowerCase(),
  };
}

function sourceCatalog(): SqliteSource[] {
  progress("validating CourtOS opening contract");
  const core = json(CORE_MANIFEST);
  if (
    core.package_id !== "january_1120_courtos_read_only_uat_contract_v1" ||
    core.effective_date !== EFFECTIVE_DATE ||
    !String(core.contract_status ?? "").includes("LOCKED_READ_ONLY")
  ) fail("the CourtOS opening contract is not the locked January 1120 release");
  const coreSqlitePath = requiredString(core.sqlite_path, "CourtOS SQLite path");
  const coreSqliteSha256 = requiredString(core.sqlite_sha256, "CourtOS SQLite SHA");

  progress("validating Household runtime release");
  const household = json(HOUSEHOLD_MANIFEST);
  if (
    household.package_id !== "foundation_a_household_runtime_release_v1" ||
    household.release_status !== "runtime_admitted_foundation_a_uat" ||
    household.effective_date !== EFFECTIVE_DATE
  ) fail("the Household package is not the admitted Foundation A runtime release");
  const householdArtifact = household.artifact as JsonObject | undefined;
  const householdSqlitePath = requiredString(
    householdArtifact?.path,
    "Household SQLite path",
  );
  const householdSqliteSha256 = requiredString(
    householdArtifact?.sha256,
    "Household SQLite SHA",
  );

  progress("validating stewardship eligibility");
  const eligibility = json(join(ELIGIBILITY_DIRECTORY, "MANIFEST.json"));
  if (
    eligibility.artifact_id !==
      "phase_five_courtos_alternate_steward_eligibility_admission_v1" ||
    eligibility.status !==
      "foundation_a_uat1_admitted_alternate_steward_eligibility_not_canon" ||
    eligibility.effective_date !== EFFECTIVE_DATE
  ) fail("alternate steward eligibility is not the admitted UAT1 release");
  const eligibilitySqlite = checksumForSqlite(ELIGIBILITY_DIRECTORY);

  progress("validating House-to-manor scope");
  const houseManor = json(join(HOUSE_MANOR_DIRECTORY, "MANIFEST.json"));
  if (
    houseManor.artifact_id !==
      "phase_five_foundation_a_uat_house_manor_scope_admission_v1" ||
    houseManor.status !==
      "foundation_a_uat_admitted_scope_read_model_not_canon" ||
    houseManor.effective_date !== EFFECTIVE_DATE
  ) fail("House-to-manor scope is not the admitted Foundation A UAT release");
  const houseManorSqlite = checksumForSqlite(HOUSE_MANOR_DIRECTORY);

  const sources: SqliteSource[] = [
    {
      sourceId: "courtos_opening",
      packageId: String(core.package_id),
      status: String(core.contract_status),
      manifestPath: CORE_MANIFEST,
      sqlitePath: coreSqlitePath,
      sqliteSha256: coreSqliteSha256,
      namespace: null,
    },
    {
      sourceId: "household",
      packageId: String(household.package_id),
      status: String(household.release_status),
      manifestPath: HOUSEHOLD_MANIFEST,
      sqlitePath: householdSqlitePath,
      sqliteSha256: householdSqliteSha256,
      namespace: null,
    },
    {
      sourceId: "steward_eligibility",
      packageId: String(eligibility.artifact_id),
      status: String(eligibility.status),
      manifestPath: join(ELIGIBILITY_DIRECTORY, "MANIFEST.json"),
      sqlitePath: eligibilitySqlite.path,
      sqliteSha256: eligibilitySqlite.sha256,
      namespace: null,
    },
    {
      sourceId: "house_manor_scope",
      packageId: String(houseManor.artifact_id),
      status: String(houseManor.status),
      manifestPath: join(HOUSE_MANOR_DIRECTORY, "MANIFEST.json"),
      sqlitePath: houseManorSqlite.path,
      sqliteSha256: houseManorSqlite.sha256,
      namespace: "house_manor",
    },
  ];

  for (const [namespace, packageId] of Object.entries(
    RESPONSIBILITY_PACKAGE_DIRECTORIES,
  )) {
    progress(`validating responsibility package ${namespace}`);
    const directory = `data/genrun/${packageId}`;
    const manifestPath = join(directory, "MANIFEST.json");
    const manifest = json(manifestPath);
    if (
      manifest.package !== packageId ||
      !String(manifest.status ?? "").includes("uat1_admitted_read_model") ||
      manifest.runtime_authority !== false
    ) fail(`${packageId} is not an admitted read-only responsibility package`);
    const sqlite = checksumForSqlite(directory);
    sources.push({
      sourceId: `responsibility_${namespace}`,
      packageId,
      status: String(manifest.status),
      manifestPath,
      sqlitePath: sqlite.path,
      sqliteSha256: sqlite.sha256,
      namespace: `responsibility_${namespace}`,
    });
  }
  return sources;
}

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    fail(`unsafe SQLite identifier ${value}`);
  }
  return `"${value}"`;
}

function copySource(
  database: Database.Database,
  source: SqliteSource,
): { tables: number; rows: number } {
  progress(`checking and importing ${source.sourceId}`);
  if (sha256File(source.sqlitePath) !== source.sqliteSha256) {
    fail(`${source.packageId} SQLite does not match its admitted checksum`);
  }
  const manifestSha256 = sha256File(source.manifestPath);
  database.prepare(
    `INSERT INTO foundation_release_source_v1
     (source_id, package_id, source_status, manifest_path, manifest_sha256,
      manifest_json, sqlite_path, sqlite_sha256, table_namespace, table_count,
      row_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
  ).run(
    source.sourceId,
    source.packageId,
    source.status,
    source.manifestPath,
    manifestSha256,
    readFileSync(resolve(ROOT, source.manifestPath), "utf8"),
    source.sqlitePath,
    source.sqliteSha256,
    source.namespace,
  );
  database.exec(`ATTACH DATABASE ${JSON.stringify(resolve(ROOT, source.sqlitePath))} AS source_db`);
  const tables = database.prepare(
    "SELECT name FROM source_db.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all() as Array<{ name: string }>;
  let totalRows = 0;
  for (const { name } of tables) {
    const destination = source.namespace ? `${source.namespace}__${name}` : name;
    const existing = database.prepare(
      "SELECT 1 FROM main.sqlite_master WHERE name=? LIMIT 1",
    ).get(destination);
    if (existing) fail(`table collision while importing ${destination}`);
    database.exec(
      `CREATE TABLE ${quoteIdentifier(destination)} AS SELECT * FROM source_db.${quoteIdentifier(name)}`,
    );
    const count = Number(
      (database.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(destination)}`).get() as { count: number }).count,
    );
    totalRows += count;
    database.prepare(
      `INSERT INTO foundation_release_table_v1
       (source_id, source_table, release_table, row_count)
       VALUES (?, ?, ?, ?)`,
    ).run(source.sourceId, name, destination, count);
    const columns = database.prepare(
      `PRAGMA table_info(${quoteIdentifier(destination)})`,
    ).all() as Array<{ name: string }>;
    const useful = [
      "house_id",
      "governing_actor_id",
      "protected_house_id",
      "entity_id",
      "manor_id",
      "parent_manor_id",
      "responsibility_id",
      "responsibility_key",
      "scope_id",
    ].filter((column) => columns.some((candidate) => candidate.name === column));
    for (const column of useful.slice(0, 3)) {
      const indexName = `idx_${destination}_${column}`.slice(0, 120);
      database.exec(
        `CREATE INDEX ${quoteIdentifier(indexName)} ON ${quoteIdentifier(destination)} (${quoteIdentifier(column)})`,
      );
    }
  }
  database.exec("DETACH DATABASE source_db");
  database.prepare(
    `UPDATE foundation_release_source_v1
     SET table_count=?, row_count=? WHERE source_id=?`,
  ).run(tables.length, totalRows, source.sourceId);
  progress(`imported ${source.sourceId}: ${tables.length} tables / ${totalRows} rows`);
  return { tables: tables.length, rows: totalRows };
}

function insertCouncilProjections(database: Database.Database): number {
  const indexPath = resolve(ROOT, COUNCIL_INDEX);
  const ready = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schema_version?: string;
    dataset?: { houses?: Array<{ id?: string }> };
  };
  if (
    ready.schema_version !== "council_room_ready_index_v1" ||
    !Array.isArray(ready.dataset?.houses)
  ) fail("Council Room ready index failed its source contract");
  const insert = database.prepare(
    `INSERT INTO council_room_projection_v1
     (house_id, effective_date, projection_json) VALUES (?, ?, ?)`,
  );
  let count = 0;
  for (const house of ready.dataset.houses) {
    if (!house.id) fail("Council Room ready index contains a House without an ID");
    insert.run(
      house.id,
      EFFECTIVE_DATE,
      JSON.stringify(buildCouncilRoomReadyProjection({ houseId: house.id })),
    );
    count += 1;
  }
  database.prepare(
    `INSERT INTO foundation_release_file_source_v1
     (source_id, source_path, source_sha256, disposition)
     VALUES (?, ?, ?, ?)`,
  ).run(
    "council_room_ready_index",
    COUNCIL_INDEX,
    sha256File(COUNCIL_INDEX),
    "compiled_into_sqlite_projection",
  );
  return count;
}

function insertSpatialProjections(database: Database.Database): number {
  if (!existsSync(resolve(ROOT, SPATIAL_PROJECTION))) {
    fail("the spatial read model must be built before Foundation A compilation");
  }
  const spatial = json(SPATIAL_PROJECTION) as {
    schema_version?: string;
    effective_date?: string;
    read_only?: boolean;
    command_authority?: boolean;
    portfolios?: Array<JsonObject & { house_id?: string }>;
  };
  if (
    spatial.schema_version !== "courtos_spatial_read_model_v1" ||
    spatial.effective_date !== EFFECTIVE_DATE ||
    spatial.read_only !== true ||
    spatial.command_authority !== false ||
    !Array.isArray(spatial.portfolios)
  ) fail("the generated spatial projection failed its source contract");
  const insert = database.prepare(
    `INSERT INTO spatial_house_projection_v1
     (house_id, effective_date, projection_json) VALUES (?, ?, ?)`,
  );
  for (const portfolio of spatial.portfolios) {
    const houseId = requiredString(portfolio.house_id, "spatial portfolio House ID");
    insert.run(houseId, EFFECTIVE_DATE, JSON.stringify(portfolio));
  }
  database.prepare(
    `INSERT INTO foundation_release_file_source_v1
     (source_id, source_path, source_sha256, disposition)
     VALUES (?, ?, ?, ?)`,
  ).run(
    "spatial_house_projection",
    SPATIAL_PROJECTION,
    sha256File(SPATIAL_PROJECTION),
    "compiled_into_sqlite_projection",
  );
  return spatial.portfolios.length;
}

function insertManorSemantics(database: Database.Database): number {
  const source = json(XMAP_MANORS) as { manors?: JsonObject[] };
  if (!Array.isArray(source.manors)) fail("XMAP manor source has no manor array");
  const insert = database.prepare(
    `INSERT INTO manor_semantic_projection_v1 (
       manor_id, county_id, seat_hex_id, holding_type, manor_size_class,
       seat_archetype, is_seat_complex, estimated_peasant_households,
       avg_buildability_score, avg_water_access_score, defensibility_score,
       route_access_score, total_net_productive_capacity, hex_ids_json,
       source_projection_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const manor of source.manors) {
    insert.run(
      requiredString(manor.manor_id, "XMAP manor ID"),
      requiredString(manor.county_id, "XMAP county ID"),
      requiredString(manor.seat_hex_id, "XMAP seat hex ID"),
      requiredString(manor.holding_type, "XMAP holding type"),
      requiredString(manor.manor_size_class, "XMAP manor size class"),
      requiredString(manor.seat_archetype, "XMAP seat archetype"),
      manor.is_seat_complex ? 1 : 0,
      Number(manor.estimated_peasant_households ?? 0),
      Number(manor.avg_buildability_score ?? 0),
      Number(manor.avg_water_access_score ?? 0),
      Number(manor.defensibility_score ?? 0),
      Number(manor.route_access_score ?? 0),
      Number(manor.total_net_productive_capacity ?? 0),
      JSON.stringify(manor.hex_ids ?? []),
      JSON.stringify(manor),
    );
  }
  database.prepare(
    `INSERT INTO foundation_release_file_source_v1
     (source_id, source_path, source_sha256, disposition)
     VALUES (?, ?, ?, ?)`,
  ).run(
    "xmap_manor_semantics",
    XMAP_MANORS,
    sha256File(XMAP_MANORS),
    "compiled_into_sqlite_projection",
  );
  return source.manors.length;
}

async function insertManorFabricProjections(
  database: Database.Database,
): Promise<number> {
  const manorRows = database
    .prepare("SELECT manor_id FROM manor_semantic_projection_v1 ORDER BY manor_id")
    .all() as Array<{ manor_id: string }>;
  const insert = database.prepare(
    `INSERT INTO manor_fabric_projection_v1
     (manor_id, governing_actor_id, effective_date, projection_json)
     VALUES (?, ?, ?, ?)`,
  );
  let count = 0;
  for (const row of manorRows) {
    const projection = await loadFoundationAManorFabricVisualFactsV1({
      manorId: row.manor_id,
      paths: {
        releaseDirectory: resolve(ROOT, MANOR_FABRIC_DIRECTORY),
        xmapManorsPath: resolve(ROOT, XMAP_MANORS),
      },
    });
    insert.run(
      row.manor_id,
      projection.manor.governing_actor_id,
      EFFECTIVE_DATE,
      JSON.stringify(projection),
    );
    count += 1;
  }
  for (const [sourceId, sourcePath] of [
    ["manor_fabric_release", `${MANOR_FABRIC_DIRECTORY}/MANIFEST.json`],
    ["manor_fabric_checksums", `${MANOR_FABRIC_DIRECTORY}/SHA256SUMS.txt`],
  ] as const) {
    database
      .prepare(
        `INSERT INTO foundation_release_file_source_v1
         (source_id, source_path, source_sha256, disposition)
         VALUES (?, ?, ?, ?)`,
      )
      .run(
        sourceId,
        sourcePath,
        sha256File(sourcePath),
        "compiled_into_sqlite_projection",
      );
  }
  return count;
}

function insertAssetReferences(database: Database.Database): number {
  const manifest = json(MAPGEN_MANIFEST) as {
    schema_version?: string;
    exports?: Array<{ path?: string; target_manor_id?: string; sha256?: string }>;
  };
  if (
    manifest.schema_version !== "courtos_mapgen_export_manifest_v1" ||
    !Array.isArray(manifest.exports)
  ) fail("the MapGen visual export manifest failed its source contract");
  const insert = database.prepare(
    `INSERT INTO release_asset_reference_v1
     (asset_kind, owner_entity_id, asset_path, asset_sha256)
     VALUES (?, ?, ?, ?)`,
  );
  for (const entry of manifest.exports) {
    const path = requiredString(entry.path, "MapGen asset path");
    const hash = requiredString(entry.sha256, "MapGen asset SHA");
    if (sha256File(path) !== hash) fail(`MapGen export ${path} failed its checksum`);
    insert.run(
      "mapgen_manor_visual_export",
      requiredString(entry.target_manor_id, "MapGen target manor ID"),
      path,
      hash,
    );
  }
  database.prepare(
    `INSERT INTO foundation_release_file_source_v1
     (source_id, source_path, source_sha256, disposition)
     VALUES (?, ?, ?, ?)`,
  ).run(
    "mapgen_visual_export_manifest",
    MAPGEN_MANIFEST,
    sha256File(MAPGEN_MANIFEST),
    "external_hashed_assets_referenced_from_sqlite",
  );
  return manifest.exports.length;
}

function createSchema(database: Database.Database): void {
  database.exec(`
    PRAGMA journal_mode=OFF;
    PRAGMA synchronous=OFF;
    PRAGMA foreign_keys=ON;
    PRAGMA user_version=1;
    CREATE TABLE foundation_release_metadata_v1 (
      schema_version TEXT PRIMARY KEY,
      generation_id TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      read_only INTEGER NOT NULL CHECK (read_only=1),
      source_truth_mutation INTEGER NOT NULL CHECK (source_truth_mutation=0)
    );
    CREATE TABLE foundation_release_source_v1 (
      source_id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      source_status TEXT NOT NULL,
      manifest_path TEXT NOT NULL,
      manifest_sha256 TEXT NOT NULL,
      manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
      sqlite_path TEXT NOT NULL,
      sqlite_sha256 TEXT NOT NULL,
      table_namespace TEXT,
      table_count INTEGER NOT NULL,
      row_count INTEGER NOT NULL
    );
    CREATE TABLE foundation_release_file_source_v1 (
      source_id TEXT PRIMARY KEY,
      source_path TEXT NOT NULL,
      source_sha256 TEXT NOT NULL,
      disposition TEXT NOT NULL
    );
    CREATE TABLE foundation_release_table_v1 (
      source_id TEXT NOT NULL REFERENCES foundation_release_source_v1(source_id),
      source_table TEXT NOT NULL,
      release_table TEXT NOT NULL UNIQUE,
      row_count INTEGER NOT NULL,
      PRIMARY KEY (source_id, source_table)
    );
    CREATE TABLE council_room_projection_v1 (
      house_id TEXT PRIMARY KEY,
      effective_date TEXT NOT NULL,
      projection_json TEXT NOT NULL CHECK (json_valid(projection_json))
    );
    CREATE TABLE spatial_house_projection_v1 (
      house_id TEXT PRIMARY KEY,
      effective_date TEXT NOT NULL,
      projection_json TEXT NOT NULL CHECK (json_valid(projection_json))
    );
    CREATE TABLE manor_semantic_projection_v1 (
      manor_id TEXT PRIMARY KEY,
      county_id TEXT NOT NULL,
      seat_hex_id TEXT NOT NULL,
      holding_type TEXT NOT NULL,
      manor_size_class TEXT NOT NULL,
      seat_archetype TEXT NOT NULL,
      is_seat_complex INTEGER NOT NULL,
      estimated_peasant_households REAL NOT NULL,
      avg_buildability_score REAL NOT NULL,
      avg_water_access_score REAL NOT NULL,
      defensibility_score REAL NOT NULL,
      route_access_score REAL NOT NULL,
      total_net_productive_capacity REAL NOT NULL,
      hex_ids_json TEXT NOT NULL CHECK (json_valid(hex_ids_json)),
      source_projection_json TEXT NOT NULL CHECK (json_valid(source_projection_json))
    );
    CREATE INDEX idx_manor_semantic_county ON manor_semantic_projection_v1(county_id);
    CREATE INDEX idx_manor_semantic_seat_hex ON manor_semantic_projection_v1(seat_hex_id);
    CREATE TABLE manor_fabric_projection_v1 (
      manor_id TEXT PRIMARY KEY REFERENCES manor_semantic_projection_v1(manor_id),
      governing_actor_id TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      projection_json TEXT NOT NULL CHECK (json_valid(projection_json))
    );
    CREATE INDEX idx_manor_fabric_governing_actor
      ON manor_fabric_projection_v1(governing_actor_id);
    CREATE TABLE release_asset_reference_v1 (
      asset_kind TEXT NOT NULL,
      owner_entity_id TEXT NOT NULL,
      asset_path TEXT NOT NULL,
      asset_sha256 TEXT NOT NULL,
      PRIMARY KEY (asset_kind, owner_entity_id, asset_path)
    );
  `);
}

async function main(): Promise<void> {
  const sqliteSources = sourceCatalog();
  progress("hashing the exact source set for the release identity");
  const generationInputs = [
    ...sqliteSources.map((source) => ({
      source_id: source.sourceId,
      manifest_sha256: sha256File(source.manifestPath),
      sqlite_sha256: source.sqliteSha256,
    })),
    ...[
      COUNCIL_INDEX,
      SPATIAL_PROJECTION,
      XMAP_MANORS,
      MAPGEN_MANIFEST,
      `${MANOR_FABRIC_DIRECTORY}/MANIFEST.json`,
      `${MANOR_FABRIC_DIRECTORY}/SHA256SUMS.txt`,
    ].map(
      (path) => ({ source_id: path, sha256: sha256File(path) }),
    ),
  ];
  const generationId = sha256Bytes(
    JSON.stringify({
      schema_version: SCHEMA_VERSION,
      compiler_revision: COMPILER_REVISION,
      effective_date: EFFECTIVE_DATE,
      inputs: generationInputs,
    }),
  );
  const generationDirectory = join(OUTPUT_ROOT, "generations", generationId);
  const sqlitePath = join(generationDirectory, "merecross_foundation_a_v1.sqlite");
  const temporaryPath = `${sqlitePath}.tmp`;
  mkdirSync(generationDirectory, { recursive: true });
  const existingManifestPath = join(generationDirectory, "MANIFEST.json");
  if (existsSync(sqlitePath) && existsSync(existingManifestPath)) {
    const existing = JSON.parse(readFileSync(existingManifestPath, "utf8")) as {
      schema_version?: string;
      compiler_revision?: string;
      generation_id?: string;
      artifact?: { path?: string; sha256?: string };
    };
    if (
      existing.schema_version === SCHEMA_VERSION &&
      existing.compiler_revision === COMPILER_REVISION &&
      existing.generation_id === generationId &&
      existing.artifact?.path === sqlitePath.slice(ROOT.length + 1) &&
      /^[a-f0-9]{64}$/.test(existing.artifact.sha256 ?? "")
    ) {
      mkdirSync(OUTPUT_ROOT, { recursive: true });
      writeFileSync(join(OUTPUT_ROOT, "CURRENT"), `${generationId}\n`, "utf8");
      copyFileSync(existingManifestPath, join(OUTPUT_ROOT, "MANIFEST.json"));
      progress(`reused existing immutable generation ${generationId}`);
      console.log(JSON.stringify(existing, null, 2));
      return;
    }
  }
  rmSync(temporaryPath, { force: true });

  const database = new Database(temporaryPath);
  let sqliteTableCount = 0;
  let sqliteRowCount = 0;
  let councilCount = 0;
  let spatialCount = 0;
  let manorCount = 0;
  let manorFabricCount = 0;
  let assetCount = 0;
  try {
    progress(`building generation ${generationId}`);
    createSchema(database);
    for (const source of sqliteSources) {
      const copied = copySource(database, source);
      sqliteTableCount += copied.tables;
      sqliteRowCount += copied.rows;
    }
    councilCount = insertCouncilProjections(database);
    progress(`compiled ${councilCount} Council Room projections`);
    spatialCount = insertSpatialProjections(database);
    progress(`compiled ${spatialCount} spatial House projections`);
    manorCount = insertManorSemantics(database);
    progress(`compiled ${manorCount} XMAP manor semantic projections`);
    manorFabricCount = await insertManorFabricProjections(database);
    progress(`compiled ${manorFabricCount} Manor Fabric projections`);
    assetCount = insertAssetReferences(database);
    progress(`registered ${assetCount} external MapGen asset references`);
    database.prepare(
      `INSERT INTO foundation_release_metadata_v1
       (schema_version, generation_id, effective_date, read_only, source_truth_mutation)
       VALUES (?, ?, ?, 1, 0)`,
    ).run(SCHEMA_VERSION, generationId, EFFECTIVE_DATE);
    const integrity = database.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") fail(`SQLite integrity check returned ${String(integrity)}`);
    database.exec("ANALYZE");
  } finally {
    database.close();
  }
  renameSync(temporaryPath, sqlitePath);
  const artifactSha256 = sha256File(sqlitePath);
  const manifest = {
    schema_version: SCHEMA_VERSION,
    compiler_revision: COMPILER_REVISION,
    generation_id: generationId,
    effective_date: EFFECTIVE_DATE,
    status: "compiled_runtime_candidate_pending_engineering_qa",
    boundary: {
      immutable_current_state: true,
      mutable_player_state: false,
      source_truth_mutation: false,
      raw_source_runtime_traversal_required: false,
      render_assets_external: true,
    },
    sources: generationInputs,
    counts: {
      sqlite_sources: sqliteSources.length,
      sqlite_tables: sqliteTableCount,
      sqlite_rows: sqliteRowCount,
      council_house_projections: councilCount,
      spatial_house_projections: spatialCount,
      manor_semantic_projections: manorCount,
      manor_fabric_projections: manorFabricCount,
      external_asset_references: assetCount,
    },
    artifact: {
      path: sqlitePath.slice(ROOT.length + 1),
      sha256: artifactSha256,
    },
  };
  const manifestPath = join(generationDirectory, "MANIFEST.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  writeFileSync(join(OUTPUT_ROOT, "CURRENT"), `${generationId}\n`, "utf8");
  copyFileSync(manifestPath, join(OUTPUT_ROOT, "MANIFEST.json"));
  console.log(JSON.stringify(manifest, null, 2));
}

await main();
