#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export const COURTOS_SCRIBE_PERFORMANCE_LIMITS_V1 = Object.freeze({
  warm_elapsed_ms: 60_000,
  responsibility_first_elapsed_ms: 6_000,
  responsibility_resident_elapsed_ms: 6_000,
  responsibility_cached_elapsed_ms: 50,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireGeneratedMetric(report, key, limitKey) {
  const metric = report[key];
  assert(metric && typeof metric === "object", `Missing ${key} performance metric.`);
  assert(metric.generated === true, `${key} did not return a generated briefing.`);
  assert(Number.isFinite(metric.elapsed_ms), `${key} elapsed_ms is not numeric.`);
  const limit = COURTOS_SCRIBE_PERFORMANCE_LIMITS_V1[limitKey];
  assert(metric.elapsed_ms <= limit, `${key} latency ${metric.elapsed_ms}ms exceeds ${limit}ms.`);
  return metric.elapsed_ms;
}

export function verifyCourtosScribePerformanceReport(report) {
  assert(report && typeof report === "object", "Scribe performance report is missing.");
  assert(
    report.schema_version === "courtos_scribe_performance_report_v1",
    "Unsupported Scribe performance report schema.",
  );
  assert(!report.failure, `Scribe performance harness failed: ${report.failure}`);
  assert(report.install?.available === true, "Packaged Scribe install is unavailable.");
  assert(report.warm?.ok === true, "Packaged Scribe warmup did not complete.");
  assert(Number.isFinite(report.warm?.elapsed_ms), "Scribe warm elapsed_ms is not numeric.");
  assert(
    report.warm.elapsed_ms <= COURTOS_SCRIBE_PERFORMANCE_LIMITS_V1.warm_elapsed_ms,
    `Scribe warm latency ${report.warm.elapsed_ms}ms exceeds ${COURTOS_SCRIBE_PERFORMANCE_LIMITS_V1.warm_elapsed_ms}ms.`,
  );
  assert(report.runtime?.model_verified === true, "Packaged Scribe model identity is unverified.");
  assert(report.runtime?.resident_primed === true, "Packaged Scribe runtime was not resident-primed.");
  assert(
    report.runtime?.backend === "cpu" || report.runtime?.backend === "metal",
    "Packaged Scribe runtime did not report an accepted local backend.",
  );

  const responsibilityFirst = requireGeneratedMetric(
    report,
    "responsibility",
    "responsibility_first_elapsed_ms",
  );
  const responsibilityResident = requireGeneratedMetric(
    report,
    "responsibility_resident",
    "responsibility_resident_elapsed_ms",
  );
  const responsibilityCached = requireGeneratedMetric(
    report,
    "responsibility_cached",
    "responsibility_cached_elapsed_ms",
  );

  return {
    schema_version: "courtos_scribe_performance_verification_v1",
    status: "accepted",
    backend: report.runtime.backend,
    metrics_ms: {
      cold_warm: report.warm.elapsed_ms,
      responsibility_first: responsibilityFirst,
      responsibility_resident: responsibilityResident,
      responsibility_cached: responsibilityCached,
    },
    limits_ms: COURTOS_SCRIBE_PERFORMANCE_LIMITS_V1,
  };
}

export function readCourtosScribePerformanceReport(reportPath) {
  const records = fs.readFileSync(reportPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSON on line ${index + 1}: ${error.message}`);
      }
    });
  const report = [...records].reverse().find(
    (record) => record?.label === "harness:complete"
      && record?.schema_version === "courtos_scribe_performance_report_v1",
  );
  assert(report, "No completed CourtOS Scribe performance report was found.");
  return report;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === path.resolve(new URL(import.meta.url).pathname)) {
  const reportPath = process.argv[2];
  if (!reportPath) {
    console.error("Usage: node scripts/verifyCourtosScribePerformanceReport.mjs <performance-report.jsonl>");
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(
      verifyCourtosScribePerformanceReport(readCourtosScribePerformanceReport(reportPath)),
      null,
      2,
    ));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
