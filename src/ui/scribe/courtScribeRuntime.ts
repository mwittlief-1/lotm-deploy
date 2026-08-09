export type CourtScribeRuntimeBackendV1 = "metal" | "cpu";

export type CourtScribeRuntimePhaseV1 =
  | "cold"
  | "verifying"
  | "starting"
  | "warming"
  | "ready"
  | "unavailable"
  | "disposed";

/**
 * Fact-free operational telemetry safe for desktop diagnostics. It never
 * carries a prompt, claim, person, House, receipt, Matter, or rendered prose.
 */
export interface CourtScribeRuntimeTelemetryV1 {
  schema_version: "courtos_scribe_runtime_telemetry_v1";
  phase: CourtScribeRuntimePhaseV1;
  backend: CourtScribeRuntimeBackendV1 | null;
  model_verified: boolean | null;
  resident_primed: boolean;
  cache_entries: number;
  verification_ms: number | null;
  startup_ms: number | null;
  prime_ms: number | null;
  last_request_ms: number | null;
  last_request_outcome: "generated" | "cache_hit" | "withheld" | null;
  last_failure_reason: string | null;
}
