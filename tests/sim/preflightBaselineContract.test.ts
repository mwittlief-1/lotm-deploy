import { describe, expect, it } from "vitest";

import { APP_VERSION } from "../../src/version";
import {
  classifyPreflightMismatchKind,
  legacyBaselinePathForVersion,
  resolvePreflightBaselineContract
} from "../../scripts/preflightBaselineContract.mjs";

describe("preflight baseline contract", () => {
  it("uses an explicit v0.3.6 baseline contract instead of the legacy v0.2.2 fallback", () => {
    const contract = resolvePreflightBaselineContract({ appVersion: APP_VERSION });

    expect(contract).toMatchObject({
      app_version: "v0.3.6",
      baseline_relpath: "docs/qa/v0.3.6_non_perturbation_baseline_v0.3.6.json",
      contract_relpath: "docs/qa/v0.3.6_preflight_baseline_contract.json",
      contract_source: "explicit_contract",
      policy_mode: "baseline_file",
      selection_reason: "explicit_contract_baseline"
    });
  });

  it("still preserves the legacy version-map baseline lookup for older lines", () => {
    const contract = resolvePreflightBaselineContract({ appVersion: "v0.2.9" });

    expect(contract).toMatchObject({
      app_version: "v0.2.9",
      baseline_relpath: legacyBaselinePathForVersion("v0.2.9"),
      contract_relpath: null,
      contract_source: "legacy_version_map",
      policy_mode: "baseline_file",
      selection_reason: "legacy_version_map"
    });
  });

  it("classifies legacy v0.3 fallback mismatches as stale-baseline failures", () => {
    const staleContract = {
      app_version: "v0.3.6",
      contract_source: "legacy_version_map"
    };
    const explicitContract = resolvePreflightBaselineContract({ appVersion: APP_VERSION });

    expect(classifyPreflightMismatchKind(staleContract)).toBe("stale_baseline_contract");
    expect(classifyPreflightMismatchKind(explicitContract)).toBe("non_perturbation_regression");
  });
});
