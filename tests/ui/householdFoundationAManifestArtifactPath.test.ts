import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveManifestArtifactPath } from "../../src/ui/readModels/householdFoundationA/manifestArtifactPath";

describe("Foundation A manifest artifact resolution", () => {
  it("resolves repository-root data artifacts from the packaged Resources root", () => {
    const manifestPath = path.join(
      "/Applications/Merecross.app/Contents/Resources",
      "data/genrun/foundation_a_household_uat1_release_v1/MANIFEST.json",
    );
    expect(
      resolveManifestArtifactPath(
        manifestPath,
        "data/genrun/foundation_a_household_uat1_release_v1/generations/abc/foundation.sqlite",
      ),
    ).toBe(
      "/Applications/Merecross.app/Contents/Resources/data/genrun/foundation_a_household_uat1_release_v1/generations/abc/foundation.sqlite",
    );
  });

  it("fails closed when a repository-root artifact is paired with a manifest outside data", () => {
    expect(() =>
      resolveManifestArtifactPath(
        "/private/tmp/MANIFEST.json",
        "data/genrun/foundation.sqlite",
      ),
    ).toThrow("not located beneath a data root");
  });
});
