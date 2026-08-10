#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import Database from "better-sqlite3";

const ROOT = process.cwd();
const COMPILER_REVISION = "foundation-a-household-education-reports-2026-08-10.1";
const RUNTIME_MANIFEST_PATH =
  "data/genrun/foundation_a_household_runtime_release_v1/MANIFEST.json";
const UAT1_MANIFEST_PATH =
  "data/genrun/foundation_a_household_uat1_release_v1/MANIFEST.json";
const TARGET_DISPOSITION =
  "runtime_admitted_provisional_fuzzy_report_no_raw_score_or_prose";

function fail(message) {
  throw new Error(`Household Education report release failed: ${message}`);
}

function json(relativePath) {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), "utf8"));
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(relativePath) {
  return sha256Bytes(readFileSync(resolve(ROOT, relativePath)));
}

function assertArtifact(manifest, label) {
  if (!manifest?.artifact?.path || !/^[a-f0-9]{64}$/.test(manifest.artifact.sha256 ?? "")) {
    fail(`${label} has no checksum-pinned SQLite artifact`);
  }
  if (!existsSync(resolve(ROOT, manifest.artifact.path))) {
    fail(`${label} SQLite is missing: ${manifest.artifact.path}`);
  }
  if (sha256File(manifest.artifact.path) !== manifest.artifact.sha256) {
    fail(`${label} SQLite SHA mismatch`);
  }
}

const runtime = json(RUNTIME_MANIFEST_PATH);
if (
  runtime.package_id !== "foundation_a_household_runtime_release_v1" ||
  runtime.schema_version !== "foundation_a_household_runtime_release_v1" ||
  runtime.release_status !== "runtime_admitted_foundation_a_uat" ||
  runtime.effective_date !== "1120-01-01"
) {
  fail("the input Household runtime release is not the admitted January 1120 package");
}
assertArtifact(runtime, "Household runtime release");

if (runtime.module_dispositions?.education_progress_presentation === TARGET_DISPOSITION) {
  console.log(JSON.stringify({ status: "reused", generation_id: runtime.generation_id }, null, 2));
  process.exit(0);
}
if (
  runtime.module_dispositions?.education_progress_presentation !==
  "withheld_pending_knowledge_safe_report_projection"
) {
  fail("the existing Education presentation disposition is not an eligible predecessor");
}

const uat1 = json(UAT1_MANIFEST_PATH);
if (
  uat1.package_id !== "foundation_a_household_uat1_release_v1" ||
  uat1.schema_version !== "foundation_a_household_uat1_release_v1" ||
  uat1.effective_date !== "1120-01-01" ||
  uat1.module_dispositions?.education_progress_reports !==
    "provisional_admitted_foundation_a_uat1_fuzzy_only"
) {
  fail("the UAT1 package does not admit the bounded fuzzy Education report projection");
}
assertArtifact(uat1, "Household UAT1 release");

const runtimeManifestSha256 = sha256File(RUNTIME_MANIFEST_PATH);
const uat1ManifestSha256 = sha256File(UAT1_MANIFEST_PATH);
const generationId = sha256Bytes(
  JSON.stringify({
    compiler_revision: COMPILER_REVISION,
    effective_date: "1120-01-01",
    runtime_manifest_sha256: runtimeManifestSha256,
    runtime_sqlite_sha256: runtime.artifact.sha256,
    uat1_manifest_sha256: uat1ManifestSha256,
    uat1_sqlite_sha256: uat1.artifact.sha256,
  }),
);
const outputDirectory = resolve(
  ROOT,
  `data/genrun/foundation_a_household_runtime_release_v1/generations/${generationId}`,
);
const outputRelativePath =
  `data/genrun/foundation_a_household_runtime_release_v1/generations/${generationId}/` +
  "foundation_a_household_runtime_release_v1.sqlite";
const outputPath = resolve(ROOT, outputRelativePath);
const temporaryPath = `${outputPath}.tmp`;
mkdirSync(outputDirectory, { recursive: true });
copyFileSync(resolve(ROOT, runtime.artifact.path), temporaryPath);

const database = new Database(temporaryPath);
try {
  database.pragma("journal_mode = DELETE");
  database.pragma("foreign_keys = ON");
  const escapedUatPath = resolve(ROOT, uat1.artifact.path).replaceAll("'", "''");
  database.exec(`ATTACH DATABASE '${escapedUatPath}' AS uat1`);
  database.transaction(() => {
    database.exec(`
      CREATE TABLE ro_household_education_cycle_report_v1 (
        cycle_report_id TEXT PRIMARY KEY,
        education_assignment_id TEXT NOT NULL UNIQUE,
        learner_person_id TEXT NOT NULL,
        house_id TEXT NOT NULL,
        responsible_party_person_id TEXT,
        provider_person_id TEXT,
        cycle_year INTEGER NOT NULL CHECK (cycle_year = 1119),
        report_delivery_route TEXT NOT NULL,
        report_state TEXT NOT NULL,
        progress_interpretation TEXT NOT NULL,
        progress_course_interpretation TEXT NOT NULL,
        annual_receipt_count INTEGER NOT NULL CHECK (annual_receipt_count BETWEEN 0 AND 3),
        assignment_continuity_basis TEXT NOT NULL,
        effective_date TEXT NOT NULL CHECK (effective_date = '1120-01-01'),
        source_status TEXT NOT NULL,
        runtime_authority INTEGER NOT NULL CHECK (runtime_authority = 0),
        disclosure_posture TEXT NOT NULL
      );

      INSERT INTO ro_household_education_cycle_report_v1
      SELECT
        id,
        education_assignment_id,
        learner_person_id,
        learner_house_id,
        responsible_party_person_id,
        provider_person_id,
        1119,
        report_delivery_route,
        report_state,
        progress_interpretation,
        progress_course_interpretation,
        annual_receipt_count,
        assignment_continuity_basis,
        '1120-01-01',
        assertion_status,
        0,
        disclosure_posture
      FROM uat1.household_education_cycle_report_uat1_v1;

      CREATE INDEX idx_household_education_cycle_report_house_v1
        ON ro_household_education_cycle_report_v1 (house_id, learner_person_id);

      UPDATE release_metadata_v1
      SET metadata_value='provisional_fuzzy_report_no_raw_score_or_prose'
      WHERE metadata_key='raw_education_progress_player_presentation';

      UPDATE release_metadata_v1
      SET metadata_value='${generationId}'
      WHERE metadata_key='generation_id';

      UPDATE release_module_disposition_v1
      SET
        release_status='${TARGET_DISPOSITION}',
        consumer_rule='Expose only the structured responsible-party interpretation and delivery route. No raw score, generated prose, observed-history claim, or runtime formation effect is admitted.',
        source_path='${uat1.artifact.path.replaceAll("'", "''")}',
        source_sha256='${uat1.artifact.sha256}'
      WHERE module_key='education_progress_presentation';
    `);
  })();

  const mismatches = database.prepare(`
    SELECT COUNT(*) AS count
    FROM ro_household_education_arrangement_v1 arrangement
    LEFT JOIN ro_household_education_cycle_report_v1 report
      ON report.education_assignment_id=arrangement.education_assignment_id
      AND report.learner_person_id=arrangement.learner_person_id
      AND report.house_id=arrangement.house_id
    WHERE report.cycle_report_id IS NULL
  `).get().count;
  const orphans = database.prepare(`
    SELECT COUNT(*) AS count
    FROM ro_household_education_cycle_report_v1 report
    LEFT JOIN ro_household_education_arrangement_v1 arrangement
      ON arrangement.education_assignment_id=report.education_assignment_id
      AND arrangement.learner_person_id=report.learner_person_id
      AND arrangement.house_id=report.house_id
    WHERE arrangement.education_assignment_id IS NULL
  `).get().count;
  const reportCount = database
    .prepare("SELECT COUNT(*) AS count FROM ro_household_education_cycle_report_v1")
    .get().count;
  const arrangementCount = database
    .prepare("SELECT COUNT(*) AS count FROM ro_household_education_arrangement_v1")
    .get().count;
  if (mismatches !== 0 || orphans !== 0 || reportCount !== arrangementCount) {
    fail(
      `Education report binding is incomplete: ${mismatches} missing, ${orphans} orphaned, ` +
        `${reportCount}/${arrangementCount} rows`,
    );
  }
  const unsafe = database.prepare(`
    SELECT COUNT(*) AS count
    FROM ro_household_education_cycle_report_v1
    WHERE disclosure_posture <> 'provisional_uat1_fuzzy_report_no_raw_score_or_prose'
      OR source_status <> 'foundation_a_uat1_provisional_backcast_not_observed_history'
      OR runtime_authority <> 0
  `).get().count;
  if (unsafe !== 0) fail(`${unsafe} Education reports violate the UAT1 disclosure boundary`);

  database.exec("DETACH DATABASE uat1");
  database.exec("VACUUM");
} finally {
  database.close();
}
renameSync(temporaryPath, outputPath);

const outputSha256 = sha256File(outputRelativePath);
const manifest = {
  ...runtime,
  generation_id: generationId,
  source_inputs: [
    ...runtime.source_inputs,
    {
      role: "household_uat1_education_report_manifest",
      path: UAT1_MANIFEST_PATH,
      sha256: uat1ManifestSha256,
    },
    {
      role: "household_uat1_education_report_sqlite",
      path: uat1.artifact.path,
      sha256: uat1.artifact.sha256,
    },
  ],
  module_dispositions: {
    ...runtime.module_dispositions,
    education_arrangements: "runtime_admitted_with_provisional_fuzzy_cycle_reports",
    education_progress_presentation: TARGET_DISPOSITION,
  },
  counts: {
    ...runtime.counts,
    ro_household_education_cycle_report_v1:
      runtime.counts.ro_household_education_arrangement_v1,
  },
  assertions: {
    ...runtime.assertions,
    raw_progress_absent: true,
    education_fuzzy_cycle_reports_complete: true,
    authoritative_player_prose_absent: true,
  },
  artifact: { path: outputRelativePath, sha256: outputSha256 },
};

const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
const temporaryManifest = resolve(ROOT, `${RUNTIME_MANIFEST_PATH}.tmp`);
writeFileSync(temporaryManifest, manifestText);
renameSync(temporaryManifest, resolve(ROOT, RUNTIME_MANIFEST_PATH));

console.log(
  JSON.stringify(
    {
      status: "built",
      generation_id: generationId,
      artifact: { path: outputRelativePath, sha256: outputSha256 },
      education_cycle_reports: manifest.counts.ro_household_education_cycle_report_v1,
    },
    null,
    2,
  ),
);
