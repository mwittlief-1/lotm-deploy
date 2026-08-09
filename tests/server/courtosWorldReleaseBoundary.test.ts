import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import {
  configuredAdmittedWorldRelease,
  inspectAdmittedWorldRelease,
} from "../../src/server/worldRuntime/worldReleaseBoundary";

const workspaces: string[] = [];
const sha256 = (filePath: string) => createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

function buildRelease(posture: "admitted" | "development_noncanonical" = "admitted") {
  const root = fs.mkdtempSync(path.resolve(os.tmpdir(), "courtos-world-release-"));
  workspaces.push(root);
  const generationId = "a".repeat(64);
  const releaseDirectory = path.resolve(root, generationId);
  fs.mkdirSync(releaseDirectory, { recursive: true });
  const databasePath = path.resolve(releaseDirectory, "merecross_world_v1.sqlite");
  const database = new Database(databasePath);
  database.pragma("application_id = 1296257603");
  database.exec(`
    CREATE TABLE world_release_metadata_v1 (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
    CREATE TABLE world_release_contract_v1 (
      contract_id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      schema_version TEXT NOT NULL,
      table_names_json TEXT NOT NULL
    ) WITHOUT ROWID;
    CREATE TABLE house_identity_v1 (house_id TEXT PRIMARY KEY) WITHOUT ROWID;
  `);
  const metadata = database.prepare("INSERT INTO world_release_metadata_v1 VALUES (?, ?)");
  for (const [key, value] of Object.entries({
    generation_id: generationId,
    effective_date: "1120-01-01",
    release_posture: posture,
    schema_version: "merecross_world_release_v1",
  })) metadata.run(key, value);
  database.prepare("INSERT INTO world_release_contract_v1 VALUES (?, ?, ?, ?)").run(
    "house_identity",
    "house_identity_package_v1",
    "house_identity_v1",
    '["house_identity_v1"]',
  );
  database.close();
  const artifactSha256 = sha256(databasePath);
  fs.writeFileSync(path.resolve(releaseDirectory, "SHA256SUMS.txt"), `${artifactSha256}  merecross_world_v1.sqlite\n`);
  const manifestPath = path.resolve(root, "CURRENT_MANIFEST.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    schema_version: "merecross_world_release_v1",
    compiler_revision: "test",
    generation_id: generationId,
    effective_date: "1120-01-01",
    release_posture: posture,
    immutable: true,
    source_manifest: { path: "test", sha256: "b".repeat(64) },
    artifact: {
      path: `releases/${generationId}/merecross_world_v1.sqlite`,
      sha256: artifactSha256,
    },
  }, null, 2)}\n`);
  return { manifestPath, databasePath };
}

afterEach(() => {
  for (const workspace of workspaces.splice(0)) fs.rmSync(workspace, { recursive: true, force: true });
});

describe("CourtOS admitted world-release boundary", () => {
  it("accepts only a checksum-valid admitted release with the required explicit contract", async () => {
    const release = buildRelease();
    await expect(inspectAdmittedWorldRelease(release.manifestPath, ["house_identity"]))
      .resolves.toMatchObject({
        schema_version: "courtos_admitted_world_release_boundary_v1",
        effective_date: "1120-01-01",
        contracts: [{
          contract_id: "house_identity",
          table_names: ["house_identity_v1"],
        }],
      });
  });

  it("withholds noncanonical, missing-contract, and byte-mismatched releases", async () => {
    const noncanonical = buildRelease("development_noncanonical");
    await expect(inspectAdmittedWorldRelease(noncanonical.manifestPath))
      .rejects.toThrow("world_release_withheld:release_not_admitted");

    const admitted = buildRelease();
    await expect(inspectAdmittedWorldRelease(admitted.manifestPath, ["responsibility_authority"]))
      .rejects.toThrow("world_release_withheld:required_contract_absent:responsibility_authority");
    fs.appendFileSync(admitted.databasePath, "tamper");
    await expect(inspectAdmittedWorldRelease(admitted.manifestPath))
      .rejects.toThrow("world_release_withheld:artifact_checksum_mismatch");
  });

  it("stays unconfigured until a release manifest is explicitly supplied", async () => {
    await expect(configuredAdmittedWorldRelease({})).resolves.toBeNull();
  });
});
