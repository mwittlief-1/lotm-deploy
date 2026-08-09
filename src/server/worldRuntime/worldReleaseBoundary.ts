import { createHash } from "node:crypto";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

export interface CourtOsWorldContractV1 {
  contract_id: string;
  package_id: string;
  schema_version: string;
  table_names: readonly string[];
}

export interface CourtOsAdmittedWorldReleaseV1 {
  schema_version: "courtos_admitted_world_release_boundary_v1";
  generation_id: string;
  effective_date: string;
  artifact_sha256: string;
  contracts: readonly CourtOsWorldContractV1[];
}

interface WorldReleaseManifestV1 {
  schema_version: string;
  generation_id: string;
  effective_date: string;
  release_posture: string;
  immutable: boolean;
  artifact?: { path?: string; sha256?: string };
}

function requireBoundary(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`world_release_withheld:${reason}`);
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function releaseDirectory(manifestPath: string, generationId: string): string {
  return path.basename(manifestPath) === "CURRENT_MANIFEST.json"
    ? path.resolve(path.dirname(manifestPath), generationId)
    : path.dirname(manifestPath);
}

/**
 * Verifies only the immutable consumer boundary. Domain adapters may open the
 * release after this succeeds, but this function deliberately returns no
 * world facts and never traverses a Product source package.
 */
export async function inspectAdmittedWorldRelease(
  manifestPath: string,
  requiredContractIds: readonly string[] = [],
): Promise<CourtOsAdmittedWorldReleaseV1> {
  let manifest: WorldReleaseManifestV1;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as WorldReleaseManifestV1;
  } catch {
    throw new Error("world_release_withheld:manifest_unreadable");
  }
  requireBoundary(manifest.schema_version === "merecross_world_release_v1", "manifest_schema_mismatch");
  requireBoundary(manifest.immutable === true, "release_not_immutable");
  requireBoundary(manifest.release_posture === "admitted", "release_not_admitted");
  requireBoundary(/^[a-f0-9]{64}$/.test(manifest.generation_id ?? ""), "generation_identity_invalid");
  requireBoundary(/^\d{4}-\d{2}-\d{2}$/.test(manifest.effective_date ?? ""), "effective_date_invalid");
  requireBoundary(/^[a-f0-9]{64}$/.test(manifest.artifact?.sha256 ?? ""), "artifact_identity_invalid");
  requireBoundary(
    manifest.artifact?.path === `releases/${manifest.generation_id}/merecross_world_v1.sqlite`,
    "artifact_path_invalid",
  );

  const directory = releaseDirectory(manifestPath, manifest.generation_id);
  const databasePath = path.resolve(directory, "merecross_world_v1.sqlite");
  let artifactSha256: string;
  try {
    artifactSha256 = await sha256File(databasePath);
  } catch {
    throw new Error("world_release_withheld:artifact_unreadable");
  }
  requireBoundary(artifactSha256 === manifest.artifact.sha256, "artifact_checksum_mismatch");
  const expectedSums = `${artifactSha256}  merecross_world_v1.sqlite\n`;
  let sums: string;
  try {
    sums = await readFile(path.resolve(directory, "SHA256SUMS.txt"), "utf8");
  } catch {
    throw new Error("world_release_withheld:checksum_manifest_unreadable");
  }
  requireBoundary(sums === expectedSums, "checksum_manifest_mismatch");

  let database: Database.Database;
  try {
    database = new Database(databasePath, { readonly: true, fileMustExist: true });
  } catch {
    throw new Error("world_release_withheld:sqlite_unreadable");
  }
  try {
    requireBoundary(database.pragma("integrity_check", { simple: true }) === "ok", "sqlite_integrity_failed");
    requireBoundary(database.pragma("application_id", { simple: true }) === 1296257603, "sqlite_application_mismatch");
    const metadataRows = database.prepare("SELECT key, value FROM world_release_metadata_v1").all() as Record<string, unknown>[];
    const metadata = Object.fromEntries(
      metadataRows.map((row) => [String(row.key), String(row.value)]),
    );
    requireBoundary(metadata.generation_id === manifest.generation_id, "embedded_generation_mismatch");
    requireBoundary(metadata.effective_date === manifest.effective_date, "embedded_effective_date_mismatch");
    requireBoundary(metadata.release_posture === "admitted", "embedded_posture_mismatch");
    requireBoundary(metadata.schema_version === manifest.schema_version, "embedded_schema_mismatch");

    const contractRows = database.prepare(`SELECT contract_id, package_id, schema_version, table_names_json
      FROM world_release_contract_v1 ORDER BY contract_id`).all() as Record<string, unknown>[];
    const contracts = contractRows.map((row) => {
      let tableNames: unknown;
      try {
        tableNames = JSON.parse(String(row.table_names_json));
      } catch {
        throw new Error("world_release_withheld:contract_registry_invalid");
      }
      requireBoundary(
        Array.isArray(tableNames) && tableNames.length > 0 &&
          tableNames.every((name) => typeof name === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)),
        "contract_registry_invalid",
      );
      for (const tableName of tableNames) {
        requireBoundary(
          database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(tableName),
          "contract_table_absent",
        );
      }
      return {
        contract_id: String(row.contract_id),
        package_id: String(row.package_id),
        schema_version: String(row.schema_version),
        table_names: tableNames,
      } satisfies CourtOsWorldContractV1;
    });
    const availableContracts = new Set(contracts.map((contract) => contract.contract_id));
    for (const requiredContractId of requiredContractIds) {
      requireBoundary(availableContracts.has(requiredContractId), `required_contract_absent:${requiredContractId}`);
    }
    return {
      schema_version: "courtos_admitted_world_release_boundary_v1",
      generation_id: manifest.generation_id,
      effective_date: manifest.effective_date,
      artifact_sha256: artifactSha256,
      contracts,
    };
  } finally {
    database.close();
  }
}

export async function configuredAdmittedWorldRelease(
  environment: NodeJS.ProcessEnv = process.env,
  requiredContractIds: readonly string[] = [],
): Promise<CourtOsAdmittedWorldReleaseV1 | null> {
  const manifestPath = environment.MERECROSS_WORLD_RELEASE_MANIFEST?.trim();
  if (!manifestPath) return null;
  return inspectAdmittedWorldRelease(manifestPath, requiredContractIds);
}
