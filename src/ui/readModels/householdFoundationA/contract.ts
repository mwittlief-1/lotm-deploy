/**
 * Public validation surface for the frozen Foundation A Household release.
 * Candidate packages and pre-release module overlays are intentionally not
 * accepted here.
 */
export const FOUNDATION_A_HOUSEHOLD_UAT_CONTRACT_ID =
  "foundation_a_household_runtime_release_v1" as const;

export interface FoundationAHouseholdUatManifestV1 {
  package_id: typeof FOUNDATION_A_HOUSEHOLD_UAT_CONTRACT_ID;
  schema_version: typeof FOUNDATION_A_HOUSEHOLD_UAT_CONTRACT_ID;
  generation_id: string;
  effective_date: "1120-01-01";
  release_status: "runtime_admitted_foundation_a_uat";
  artifact: { path: string; sha256: string };
  module_dispositions: Record<string, string>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Rejects anything other than the frozen module-gated runtime release. */
export function assertFoundationAHouseholdUatManifest(
  value: unknown,
): asserts value is FoundationAHouseholdUatManifestV1 {
  if (!isObject(value)) throw new Error("Foundation A Household release manifest must be an object.");
  if (
    value.package_id !== FOUNDATION_A_HOUSEHOLD_UAT_CONTRACT_ID ||
    value.schema_version !== FOUNDATION_A_HOUSEHOLD_UAT_CONTRACT_ID ||
    value.effective_date !== "1120-01-01" ||
    value.release_status !== "runtime_admitted_foundation_a_uat" ||
    typeof value.generation_id !== "string" ||
    !value.generation_id
  ) throw new Error("Unsupported Foundation A Household release manifest.");
  if (!isObject(value.artifact) || typeof value.artifact.path !== "string" || !/^[a-f0-9]{64}$/.test(String(value.artifact.sha256))) {
    throw new Error("Foundation A Household release requires a hash-pinned artifact.");
  }
  if (!isObject(value.module_dispositions)) {
    throw new Error("Foundation A Household release requires module dispositions.");
  }
  const dispositions = value.module_dispositions;
  const required: Record<string, string> = {
    membership: "runtime_admitted",
    adult_kin: "runtime_admitted_resolved_rows_only",
    service_care: "runtime_admitted_courtos_house_scope_only",
    education_arrangements: "runtime_admitted_without_progress_presentation",
    education_progress_presentation: "withheld_pending_knowledge_safe_report_projection",
    stores_positions_and_custody: "runtime_admitted_static_uat_bound_house_and_manor_rows",
    economic_activity_1117_1119: "runtime_admitted_founder_approved_provisional_evidence",
    matters_opening: "empty_at_opening",
  };
  for (const [key, expected] of Object.entries(required)) {
    if (dispositions[key] !== expected) {
      throw new Error(`Foundation A Household release has an unsafe ${key} disposition.`);
    }
  }
}
