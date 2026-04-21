import fs from "node:fs";
import path from "node:path";

function normalizeVersion(appVersion) {
  const value = String(appVersion ?? "").trim();
  if (!value) return "";
  return value.startsWith("v") ? value : `v${value}`;
}

export function legacyBaselinePathForVersion(appVersion) {
  const v = normalizeVersion(appVersion);
  if (v.startsWith("v0.2.9")) return "docs/qa/v0.2.9_non_perturbation_baseline_v0.2.9.json";
  if (v.startsWith("v0.2.7.1") || v.startsWith("v0.2.7.2")) return "docs/qa/v0.2.7.1_non_perturbation_baseline_v0.2.7.1.json";
  if (v.startsWith("v0.2.7") || v.startsWith("v0.2.6.2")) return "docs/qa/v0.2.6.2_non_perturbation_baseline_v0.2.6.2.json";
  if (v.startsWith("v0.2.6")) return "docs/qa/v0.2.6_non_perturbation_baseline_v0.2.6.json";
  if (v.startsWith("v0.2.5")) return "docs/qa/v0.2.5_non_perturbation_baseline_v0.2.5.json";
  if (v.startsWith("v0.2.4")) return "docs/qa/v0.2.4_non_perturbation_baseline_v0.2.4.json";
  return "docs/qa/v0.2.3_non_perturbation_baseline_v0.2.2.json";
}

function explicitContractPathForVersion(appVersion) {
  const v = normalizeVersion(appVersion);
  if (v.startsWith("v0.3.")) return `docs/qa/${v}_preflight_baseline_contract.json`;
  return null;
}

function readJsonIfExists(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

export function resolvePreflightBaselineContract({ appVersion, repoRoot = process.cwd() } = {}) {
  const normalizedVersion = normalizeVersion(appVersion);
  const explicitContractRelpath = explicitContractPathForVersion(normalizedVersion);

  if (explicitContractRelpath) {
    const explicitContractAbsPath = path.resolve(repoRoot, explicitContractRelpath);
    const contractPayload = readJsonIfExists(explicitContractAbsPath);

    if (contractPayload) {
      const policyMode = contractPayload.policy_mode === "no_baseline" ? "no_baseline" : "baseline_file";
      const baselineRelpath =
        typeof contractPayload.baseline_relpath === "string" && contractPayload.baseline_relpath.trim().length > 0
          ? contractPayload.baseline_relpath.trim()
          : null;

      return {
        app_version: normalizedVersion,
        baseline_exists: Boolean(baselineRelpath && fs.existsSync(path.resolve(repoRoot, baselineRelpath))),
        baseline_relpath: baselineRelpath,
        contract_relpath: explicitContractRelpath,
        contract_source: "explicit_contract",
        legacy_fallback_relpath: legacyBaselinePathForVersion(normalizedVersion),
        policy_mode: policyMode,
        selection_reason: policyMode === "baseline_file" ? "explicit_contract_baseline" : "explicit_no_baseline_policy"
      };
    }

    return {
      app_version: normalizedVersion,
      baseline_exists: false,
      baseline_relpath: null,
      contract_relpath: explicitContractRelpath,
      contract_source: "missing_explicit_contract",
      legacy_fallback_relpath: legacyBaselinePathForVersion(normalizedVersion),
      policy_mode: "no_baseline",
      selection_reason: "missing_explicit_contract_for_v0_3_line"
    };
  }

  const legacyBaselineRelpath = legacyBaselinePathForVersion(normalizedVersion);
  return {
    app_version: normalizedVersion,
    baseline_exists: fs.existsSync(path.resolve(repoRoot, legacyBaselineRelpath)),
    baseline_relpath: legacyBaselineRelpath,
    contract_relpath: null,
    contract_source: "legacy_version_map",
    legacy_fallback_relpath: legacyBaselineRelpath,
    policy_mode: "baseline_file",
    selection_reason: "legacy_version_map"
  };
}

export function classifyPreflightMismatchKind(contract) {
  if (!contract) return "non_perturbation_regression";
  if (contract.contract_source === "legacy_version_map" && String(contract.app_version ?? "").startsWith("v0.3.")) {
    return "stale_baseline_contract";
  }
  return "non_perturbation_regression";
}
