import { describe, expect, it } from "vitest";

import {
  COURTOS_DOMAINS,
  COURTOS_RESPONSIBILITIES,
  courtOsDomainForResponsibility,
  courtOsResponsibilityLocation,
} from "../src/ui/courtosInformationArchitecture";

describe("CourtOS information architecture", () => {
  it("exposes the authoritative operational rooms in their player-facing order", () => {
    expect(COURTOS_DOMAINS.map((domain) => domain.label)).toEqual([
      "Household",
      "Marriage & Dynasty",
      "Estate & Holdings",
      "Resources & Finance",
      "Records & Correspondence",
      "Security & Readiness",
      "Court & Relations",
      "Church",
    ]);
  });

  it("owns the complete current 24-responsibility design registry exactly once", () => {
    const keys = COURTOS_RESPONSIBILITIES.map((responsibility) => responsibility.key);
    expect(keys).toHaveLength(24);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("office_post_appointments");
  });

  it("keeps Office & Post Appointments in House Command", () => {
    expect(courtOsResponsibilityLocation("office_post_appointments")).toEqual({
      kind: "house_command",
    });
    expect(() => courtOsDomainForResponsibility("office_post_appointments")).toThrow(
      /House Command/,
    );
  });

  it("places Manor Stewardship within Estate & Holdings", () => {
    expect(courtOsDomainForResponsibility("manor_stewardship").key).toBe(
      "estate_holdings",
    );
  });

  it("uses Household Service & Care as the Household responsibility", () => {
    const household = COURTOS_DOMAINS.find((domain) => domain.key === "household");
    expect(
      household?.responsibilities.map((responsibility) => responsibility.label),
    ).toContain("Household Service & Care");
    expect(
      household?.responsibilities.map((responsibility) => responsibility.label),
    ).not.toContain("Health & Care");
  });
});
