import { BUILD_INFO } from "../buildInfo";
import { APP_VERSION } from "../version";
import { SIM_VERSION } from "./version";
import type { RunProvenanceV1, RunState } from "./types";

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function buildRunProvenanceV1(state?: RunState | null): RunProvenanceV1 {
  const runAppVersion =
    state && typeof state.app_version === "string" && state.app_version.trim().length > 0
      ? state.app_version.trim()
      : APP_VERSION;
  const buildInfoAppVersion = normalizeOptionalString(BUILD_INFO.app_version);

  return {
    schema_version: "run_provenance_v1",
    ui_app_version: APP_VERSION,
    run_app_version: runAppVersion,
    build_info_app_version: buildInfoAppVersion,
    sim_version: state?.version ?? SIM_VERSION,
    code_fingerprint: normalizeOptionalString(BUILD_INFO.code_fingerprint),
    build_time_utc: normalizeOptionalString(BUILD_INFO.build_time_utc),
    created_at_utc: normalizeOptionalString(BUILD_INFO.created_at_utc),
    version_match:
      buildInfoAppVersion === null
        ? runAppVersion === APP_VERSION
        : buildInfoAppVersion === runAppVersion && APP_VERSION === runAppVersion,
    notes: normalizeOptionalString(BUILD_INFO.notes)
  };
}
