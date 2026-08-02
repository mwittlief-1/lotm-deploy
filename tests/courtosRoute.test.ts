import { describe, expect, it } from "vitest";

import {
  COURTOS_INITIAL_ROUTE,
  courtOsResponsibilityRoute,
  courtOsRouteFromSearch,
  courtOsRouteWithoutDetail,
  courtOsSearchForRoute,
} from "../src/ui/courtosRoute";

describe("CourtOS typed route", () => {
  it("falls back safely when a route is unknown", () => {
    expect(courtOsRouteFromSearch("?houseId=house-1&place=elsewhere")).toEqual(
      COURTOS_INITIAL_ROUTE,
    );
  });

  it("serializes an unknown route back to an honest Council URL", () => {
    const invalid =
      "?houseId=house-1&place=responsibility&domain=household&responsibility=not_a_real_responsibility";
    expect(
      courtOsSearchForRoute(invalid, courtOsRouteFromSearch(invalid)),
    ).toBe("?houseId=house-1&place=council");
  });

  it("preserves House selection while serializing a responsibility scope", () => {
    const route = courtOsResponsibilityRoute({
      responsibility: "manor_stewardship",
      scopeId: "manor-7",
    });
    const search = courtOsSearchForRoute("?houseId=house-1", route);
    expect(search).toContain("houseId=house-1");
    expect(courtOsRouteFromSearch(search)).toEqual(route);
  });

  it("routes Office & Post Appointments to House Command", () => {
    expect(
      courtOsResponsibilityRoute({ responsibility: "office_post_appointments" }),
    ).toEqual({ place: { kind: "house_command" }, detail: null });
  });

  it("round-trips an entitled education detail without inventing another surface", () => {
    const route = {
      ...courtOsResponsibilityRoute({ responsibility: "education_formation" }),
      detail: { kind: "education_plan" as const, recordId: "plan-9" },
    };
    const search = courtOsSearchForRoute("?houseId=house-1", route);
    expect(courtOsRouteFromSearch(search)).toEqual(route);
    expect(courtOsRouteWithoutDetail(route)).toEqual({
      ...route,
      detail: null,
    });
  });

  it("rejects a detail that is incompatible with its place", () => {
    expect(
      courtOsRouteFromSearch(
        "?houseId=house-1&place=domain&domain=household&detail=education_plan&record=plan-1",
      ),
    ).toEqual({ place: { kind: "domain", domain: "household" }, detail: null });
  });
});
