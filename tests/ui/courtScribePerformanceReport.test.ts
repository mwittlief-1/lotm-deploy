import { describe, expect, it } from "vitest";

import {
  verifyCourtosScribePerformanceReport,
} from "../../scripts/verifyCourtosScribePerformanceReport.mjs";

function acceptedReport() {
  return {
    schema_version: "courtos_scribe_performance_report_v1",
    install: { available: true, reason: null },
    warm: { ok: true, elapsed_ms: 39837.2 },
    responsibility: { generated: true, elapsed_ms: 1653.4 },
    responsibility_cached: { generated: true, elapsed_ms: 0.1 },
    responsibility_resident: { generated: true, elapsed_ms: 718 },
    runtime: {
      backend: "cpu",
      model_verified: true,
      resident_primed: true,
    },
  };
}

describe("CourtOS packaged Scribe performance report", () => {
  it("accepts the measured packaged-runtime latency envelope", () => {
    expect(verifyCourtosScribePerformanceReport(acceptedReport())).toMatchObject({
      status: "accepted",
      backend: "cpu",
      metrics_ms: {
        cold_warm: 39837.2,
        responsibility_first: 1653.4,
        responsibility_cached: 0.1,
        responsibility_resident: 718,
      },
    });
  });

  it("fails closed when generation is unavailable or interactive latency regresses", () => {
    expect(() => verifyCourtosScribePerformanceReport({
      ...acceptedReport(),
      responsibility: { generated: false, elapsed_ms: 1653.4 },
    })).toThrow("did not return a generated briefing");

    expect(() => verifyCourtosScribePerformanceReport({
      ...acceptedReport(),
      responsibility_resident: { generated: true, elapsed_ms: 6001 },
    })).toThrow("exceeds 6000ms");
  });
});
