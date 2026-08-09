import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FoundationAResponsibilityAuthorityUat1Projection } from "../../src/ui/readModels/householdFoundationA/responsibilityAuthorityUat1Projection";
import {
  FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
  FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SQLITE_SHA256,
} from "../../src/ui/courtosResponsibilityAuthoritySource";

describe("Foundation A UAT1 24-responsibility authority projection", () => {
  it("exposes one immutable assignment-planning source identity", () => {
    expect(FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION).toMatch(
      /^phase_five_foundation_a_uat_24_responsibility_authority_admission_v1@[a-f0-9]{64}$/,
    );
    const sums = readFileSync(
      "data/genrun/phase_five_foundation_a_uat_24_responsibility_authority_admission_v1/SHA256SUMS.txt",
      "utf8",
    );
    expect(sums).toContain(
      `${FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SQLITE_SHA256}  phase_five_foundation_a_uat_24_responsibility_authority_admission_v1.sqlite`,
    );
  });
  it("returns only exact House-scoped owner/scope assignments", async () => {
    const projection = await FoundationAResponsibilityAuthorityUat1Projection.open();
    try {
      const rows = await projection.responsibilitiesForHouse(
        "t0h_bcae5bd911ab10f4c7fdfea0",
        "uatentity_2feb6d3c5a81604f9bebeb8c",
      );
      expect(rows.length).toBeGreaterThan(4);
      expect(rows.every((row) => row.holder_person_id && row.holder_display_name)).toBe(true);
      expect(rows).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source_legacy_responsibility_id:
            "courtos.responsibility.manor_stewardship",
          authority_scope_id: "manor_hx_38958",
          manor_id: "manor_hx_38958",
        }),
        expect.objectContaining({
          source_legacy_responsibility_id:
            "courtos.responsibility.education_formation",
        }),
      ]));
    } finally {
      await projection.close();
    }
  });
});
