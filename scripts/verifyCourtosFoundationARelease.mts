#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Database from "better-sqlite3";

const ROOT = process.cwd();
const MANIFEST_PATH = ".courtos-generated/foundation-a/MANIFEST.json";

function sha256(path: string): string {
  return createHash("sha256")
    .update(readFileSync(resolve(ROOT, path)))
    .digest("hex");
}

function fail(message: string): never {
  throw new Error(`Foundation A release verification failed: ${message}`);
}

const manifest = JSON.parse(
  readFileSync(resolve(ROOT, MANIFEST_PATH), "utf8"),
) as {
  schema_version?: string;
  generation_id?: string;
  effective_date?: string;
  artifact?: { path?: string; sha256?: string };
  counts?: {
    sqlite_sources?: number;
    council_house_projections?: number;
    spatial_house_projections?: number;
    manor_semantic_projections?: number;
    manor_fabric_projections?: number;
  };
};

if (
  manifest.schema_version !== "merecross_foundation_a_release_v1" ||
  manifest.effective_date !== "1120-01-01" ||
  !/^[a-f0-9]{64}$/.test(manifest.generation_id ?? "") ||
  !manifest.artifact?.path ||
  !/^[a-f0-9]{64}$/.test(manifest.artifact.sha256 ?? "")
) fail("manifest contract mismatch");
if (sha256(manifest.artifact.path) !== manifest.artifact.sha256) {
  fail("artifact checksum mismatch");
}

const database = new Database(resolve(ROOT, manifest.artifact.path), {
  readonly: true,
  fileMustExist: true,
});
try {
  database.pragma("query_only=ON");
  if (database.pragma("integrity_check", { simple: true }) !== "ok") {
    fail("SQLite integrity check did not pass");
  }
  const metadata = database.prepare(
    "SELECT * FROM foundation_release_metadata_v1",
  ).get() as {
    schema_version?: string;
    generation_id?: string;
    effective_date?: string;
    read_only?: number;
    source_truth_mutation?: number;
  } | undefined;
  if (
    metadata?.schema_version !== manifest.schema_version ||
    metadata.generation_id !== manifest.generation_id ||
    metadata.effective_date !== manifest.effective_date ||
    metadata.read_only !== 1 ||
    metadata.source_truth_mutation !== 0
  ) fail("embedded release identity mismatch");
  const scalar = (table: string): number =>
    Number(
      (database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
        count: number;
      }).count,
    );
  const checks: Array<[string, number, number | undefined]> = [
    ["sources", scalar("foundation_release_source_v1"), manifest.counts?.sqlite_sources],
    ["council Houses", scalar("council_room_projection_v1"), manifest.counts?.council_house_projections],
    ["spatial Houses", scalar("spatial_house_projection_v1"), manifest.counts?.spatial_house_projections],
    ["manors", scalar("manor_semantic_projection_v1"), manifest.counts?.manor_semantic_projections],
    ["manor fabric", scalar("manor_fabric_projection_v1"), manifest.counts?.manor_fabric_projections],
  ];
  for (const [label, actual, expected] of checks) {
    if (actual !== expected || actual < 1) fail(`${label} count mismatch`);
  }
  const legacyRegistry = database.prepare(
    "SELECT name FROM sqlite_master WHERE name LIKE '%49_atom%' OR name LIKE '%atom_registry%'",
  ).all();
  if (legacyRegistry.length > 0) fail("legacy atom registry entered the release");
  console.log(
    JSON.stringify(
      {
        ok: true,
        generation_id: manifest.generation_id,
        artifact_sha256: manifest.artifact.sha256,
        counts: manifest.counts,
      },
      null,
      2,
    ),
  );
} finally {
  database.close();
}
