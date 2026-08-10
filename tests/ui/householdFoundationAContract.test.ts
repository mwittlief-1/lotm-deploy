import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertFoundationAHouseholdUatManifest,
  FOUNDATION_A_HOUSEHOLD_UAT_CONTRACT_ID,
} from "../../src/ui/readModels/householdFoundationA/contract";

const releaseManifestPath = resolve(
  process.cwd(),
  "data/genrun/foundation_a_household_runtime_release_v1/MANIFEST.json",
);

describe("Foundation A Household release contract", () => {
  it("accepts only the frozen module-gated release", () => {
    const manifest = JSON.parse(readFileSync(releaseManifestPath, "utf8"));
    expect(manifest.package_id).toBe(FOUNDATION_A_HOUSEHOLD_UAT_CONTRACT_ID);
    expect(() => assertFoundationAHouseholdUatManifest(manifest)).not.toThrow();
  });

  it("rejects a release that exposes unbound Stores positions", () => {
    const manifest = JSON.parse(readFileSync(releaseManifestPath, "utf8"));
    manifest.module_dispositions.stores_positions_and_custody = "runtime_admitted";
    expect(() => assertFoundationAHouseholdUatManifest(manifest)).toThrow(
      "unsafe stores_positions_and_custody disposition",
    );
  });

  it("rejects a release that turns opening Matters into history", () => {
    const manifest = JSON.parse(readFileSync(releaseManifestPath, "utf8"));
    manifest.module_dispositions.matters_opening = "runtime_admitted";
    expect(() => assertFoundationAHouseholdUatManifest(manifest)).toThrow(
      "unsafe matters_opening disposition",
    );
  });

  it("rejects Education presentation that admits raw scores or authoritative prose", () => {
    const manifest = JSON.parse(readFileSync(releaseManifestPath, "utf8"));
    manifest.module_dispositions.education_progress_presentation =
      "runtime_admitted_raw_progress";
    expect(() => assertFoundationAHouseholdUatManifest(manifest)).toThrow(
      "unsafe education_progress_presentation disposition",
    );
  });
});
