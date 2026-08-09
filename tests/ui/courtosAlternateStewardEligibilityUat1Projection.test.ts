import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import {
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_DIRECTORY,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_MANIFEST_SHA256,
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_SQLITE_SHA256,
  FoundationAAlternateStewardEligibilityUat1Projection,
} from "../../src/ui/readModels/householdFoundationA/alternateStewardEligibilityUat1Projection";
import { FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION } from "../../src/ui/courtosResponsibilityAuthoritySource";

const PEARWICK_HOUSE_ID = "t0h_bcae5bd911ab10f4c7fdfea0";
const releaseDirectory = resolve(
  process.cwd(),
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_DIRECTORY,
);
const sqlitePath = resolve(
  releaseDirectory,
  "courtos_alternate_steward_eligibility_v1.sqlite",
);

describe("Foundation A UAT1 alternate-steward eligibility", () => {
  it("binds the exact immutable release and resolves real Pearwick alternatives", async () => {
    expect(
      createHash("sha256").update(readFileSync(sqlitePath)).digest("hex"),
    ).toBe(FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_SQLITE_SHA256);
    expect(createHash("sha256").update(readFileSync(
      resolve(releaseDirectory, "MANIFEST.json"),
    )).digest("hex")).toBe(
      FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_MANIFEST_SHA256,
    );
    const reader = await FoundationAAlternateStewardEligibilityUat1Projection.open();
    try {
      const rows = await reader.candidatesForHouse(PEARWICK_HOUSE_ID);
      expect(rows.length).toBe(15);
      expect(new Set(rows.map((row) => row.generation_id))).toEqual(
        new Set([FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION]),
      );
      expect(new Set(rows.map((row) => row.source_authority_generation_id))).toEqual(
        new Set([FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION]),
      );
      expect(rows.some((row) => row.person_name === "Isabel of Ridgestead")).toBe(true);
      expect(rows.every((row) => row.house_id === PEARWICK_HOUSE_ID)).toBe(true);
    } finally {
      await reader.close();
    }
  });

  it("proves realm-wide natural-key, authority, determinism, and firewall gates", () => {
    const database = new Database(sqlitePath, { readonly: true, fileMustExist: true });
    try {
      const scalar = (sql: string): number =>
        Number((database.prepare(sql).get() as { value: number }).value);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_assignment_candidate_v1")).toBe(6_755);
      expect(scalar("SELECT COUNT(DISTINCT house_id || '|' || responsibility_id || '|' || scope_id || '|' || person_id) AS value FROM responsibility_assignment_candidate_v1")).toBe(6_755);
      expect(scalar("SELECT COUNT(DISTINCT house_id) AS value FROM responsibility_assignment_candidate_v1")).toBe(435);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_assignment_candidate_v1 WHERE authority_boundary <> 'house' OR runtime_authority <> 'false' OR canon_status <> 'foundation_a_uat1_not_canon'")).toBe(0);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_assignment_candidate_v1 WHERE capacity_posture <> 'not_evaluated_not_implied' OR eligibility_bounds <> 'authority_and_custody_revalidate_before_execution'")).toBe(0);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_assignment_candidate_v1 WHERE house_id = '' OR responsibility_id = '' OR scope_id = '' OR person_id = ''")).toBe(0);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_assignment_candidate_v1 WHERE CAST(deterministic_order AS INTEGER) < 1")).toBe(0);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_assignment_candidate_v1 WHERE selector = 'house_affiliate_suitability_pool' AND evidence_kind = 'locked_inner_council_membership'")).toBe(0);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_eligibility_coverage_v1")).toBe(24);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_eligibility_coverage_v1 WHERE disposition = 'current_holder_and_head_only_no_admitted_alternate_selector_rule'")).toBe(10);
      expect(scalar("SELECT COUNT(*) AS value FROM responsibility_eligibility_coverage_v1 WHERE responsibility_id IN ('manor_stewardship','manor_fiscal_administration','security_asset_protection')")).toBe(3);
    } finally {
      database.close();
    }
  });
});
