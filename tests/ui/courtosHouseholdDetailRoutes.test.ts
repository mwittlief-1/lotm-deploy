import { describe, expect, it } from "vitest";

import {
  courtOsRouteFromSearch,
  courtOsSearchForRoute,
  type CourtOsRoute,
} from "../../src/ui/courtosRoute";

const details = [
  {
    responsibility: "household_stores_provisioning_procurement",
    detail: { kind: "stores_position", recordId: "stores-1" },
  },
  {
    responsibility: "adult_kin_support",
    detail: { kind: "adult_kin_subject", recordId: "kin-1" },
  },
  {
    responsibility: "education_formation",
    detail: { kind: "education_plan", recordId: "education-1" },
  },
  {
    responsibility: "household_service_care",
    detail: { kind: "health_record", recordId: "health-1" },
  },
] as const;

describe("CourtOS Household detail routes", () => {
  for (const entry of details) {
    it(`round-trips ${entry.detail.kind} inside its responsibility`, () => {
      const route: CourtOsRoute = {
        place: {
          kind: "responsibility",
          domain: "household",
          responsibility: entry.responsibility,
          scopeId: null,
        },
        detail: entry.detail,
      };
      const search = courtOsSearchForRoute("?houseId=pearwick", route);
      expect(search).toContain("houseId=pearwick");
      expect(courtOsRouteFromSearch(search)).toEqual(route);
    });
  }

  it("rejects a record detail attached to the wrong responsibility", () => {
    const route = courtOsRouteFromSearch(
      "?place=responsibility&domain=household&responsibility=adult_kin_support&detail=health_record&record=health-1",
    );
    expect(route.detail).toBeNull();
  });

  it("round-trips generic evidence and source inspections for any responsibility", () => {
    for (const recordId of ["evidence:1", "source:3"]) {
      const route: CourtOsRoute = {
        place: {
          kind: "responsibility",
          domain: "resources_finance",
          responsibility: "house_fiscal_administration",
          scopeId: null,
        },
        detail: { kind: "workspace_record", recordId },
      };
      const search = courtOsSearchForRoute("?houseId=pearwick", route);
      expect(courtOsRouteFromSearch(search)).toEqual(route);
    }
  });

  it("round-trips the selected manor fiscal scope for reload and deep-link continuity", () => {
    const route: CourtOsRoute = {
      place: {
        kind: "responsibility",
        domain: "resources_finance",
        responsibility: "manor_fiscal_administration",
        scopeId: "manor_hx_44835",
      },
      detail: null,
    };
    const search = courtOsSearchForRoute("?houseId=pearwick", route);
    expect(search).toContain("scope=manor_hx_44835");
    expect(courtOsRouteFromSearch(search)).toEqual(route);
  });

  it("rejects malformed generic workspace record identifiers", () => {
    const route = courtOsRouteFromSearch(
      "?place=responsibility&domain=resources_finance&responsibility=house_fiscal_administration&detail=workspace_record&record=source:not-an-index",
    );
    expect(route.detail).toBeNull();
  });
});
