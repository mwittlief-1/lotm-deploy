import {
  COURTOS_DOMAINS,
  COURTOS_RESPONSIBILITIES,
  courtOsResponsibilityLocation,
  type CourtOsDomainKey,
  type CourtOsResponsibilityDesignKey,
} from "./courtosInformationArchitecture";

export type CourtOsPlace =
  | { kind: "council" }
  | { kind: "house_command" }
  | { kind: "council_docket" }
  | { kind: "domain"; domain: CourtOsDomainKey }
  | {
      kind: "responsibility";
      domain: CourtOsDomainKey;
      responsibility: CourtOsResponsibilityDesignKey;
      scopeId: string | null;
    };

export type CourtOsDetail =
  | { kind: "council_person"; personId: string }
  | { kind: "command_responsibility"; responsibility: "office_post_appointments" }
  | { kind: "assignment_basis" }
  | { kind: "education_plan"; recordId: string }
  | { kind: "stores_position"; recordId: string }
  | { kind: "adult_kin_subject"; recordId: string }
  | { kind: "health_record"; recordId: string }
  | { kind: "workspace_record"; recordId: string };

export type CourtOsRoute = {
  place: CourtOsPlace;
  detail: CourtOsDetail | null;
};

export const COURTOS_INITIAL_ROUTE: CourtOsRoute = {
  place: { kind: "council" },
  detail: null,
};

const domainKeys = new Set<string>(COURTOS_DOMAINS.map((domain) => domain.key));
const responsibilityKeys = new Set<string>(
  COURTOS_RESPONSIBILITIES.map((responsibility) => responsibility.key),
);

function isDomainKey(value: string | null): value is CourtOsDomainKey {
  return Boolean(value && domainKeys.has(value));
}

function isResponsibilityKey(
  value: string | null,
): value is CourtOsResponsibilityDesignKey {
  return Boolean(value && responsibilityKeys.has(value));
}

function detailFromParams(
  params: URLSearchParams,
  place: CourtOsPlace,
): CourtOsDetail | null {
  const detail = params.get("detail");
  const recordId = params.get("record")?.trim() ?? "";
  if (detail === "council_person" && place.kind === "council" && recordId) {
    return { kind: "council_person", personId: recordId };
  }
  if (
    detail === "command_responsibility" &&
    place.kind === "house_command" &&
    params.get("responsibility") === "office_post_appointments"
  ) {
    return { kind: "command_responsibility", responsibility: "office_post_appointments" };
  }
  if (detail === "assignment_basis" && place.kind === "responsibility") {
    return { kind: "assignment_basis" };
  }
  if (
    detail === "education_plan" &&
    place.kind === "responsibility" &&
    place.responsibility === "education_formation" &&
    recordId
  ) {
    return { kind: "education_plan", recordId };
  }
  if (
    detail === "stores_position" &&
    place.kind === "responsibility" &&
    place.responsibility === "household_stores_provisioning_procurement" &&
    recordId
  ) {
    return { kind: "stores_position", recordId };
  }
  if (
    detail === "adult_kin_subject" &&
    place.kind === "responsibility" &&
    place.responsibility === "adult_kin_support" &&
    recordId
  ) {
    return { kind: "adult_kin_subject", recordId };
  }
  if (
    detail === "health_record" &&
    place.kind === "responsibility" &&
    place.responsibility === "household_service_care" &&
    recordId
  ) {
    return { kind: "health_record", recordId };
  }
  if (
    detail === "workspace_record" &&
    place.kind === "responsibility" &&
    /^(evidence|source):\d+$/.test(recordId)
  ) {
    return { kind: "workspace_record", recordId };
  }
  return null;
}

export function courtOsRouteFromSearch(search: string): CourtOsRoute {
  const params = new URLSearchParams(search);
  const placeName = params.get("place");
  let place: CourtOsPlace = { kind: "council" };

  if (placeName === "house_command") {
    place = { kind: "house_command" };
  } else if (placeName === "council_docket") {
    place = { kind: "council_docket" };
  } else if (placeName === "domain" && isDomainKey(params.get("domain"))) {
    place = { kind: "domain", domain: params.get("domain") as CourtOsDomainKey };
  } else if (
    placeName === "responsibility" &&
    isResponsibilityKey(params.get("responsibility"))
  ) {
    const responsibility = params.get(
      "responsibility",
    ) as CourtOsResponsibilityDesignKey;
    const location = courtOsResponsibilityLocation(responsibility);
    if (location.kind === "house_command") {
      place = { kind: "house_command" };
    } else {
      place = {
        kind: "responsibility",
        domain: location.domain,
        responsibility,
        scopeId: params.get("scope")?.trim() || null,
      };
    }
  }

  return { place, detail: detailFromParams(params, place) };
}

export function courtOsSearchForRoute(
  currentSearch: string,
  route: CourtOsRoute,
): string {
  const params = new URLSearchParams(currentSearch);
  for (const key of ["place", "domain", "responsibility", "scope", "detail", "record"]) {
    params.delete(key);
  }

  params.set("place", route.place.kind);
  if (route.place.kind === "domain") {
    params.set("domain", route.place.domain);
  } else if (route.place.kind === "responsibility") {
    params.set("domain", route.place.domain);
    params.set("responsibility", route.place.responsibility);
    if (route.place.scopeId) params.set("scope", route.place.scopeId);
  }

  if (route.detail) {
    params.set("detail", route.detail.kind);
    if (route.detail.kind === "council_person") {
      params.set("record", route.detail.personId);
    } else if (route.detail.kind === "command_responsibility") {
      params.set("responsibility", route.detail.responsibility);
    } else if (
      route.detail.kind === "education_plan" ||
      route.detail.kind === "stores_position" ||
      route.detail.kind === "adult_kin_subject" ||
      route.detail.kind === "health_record" ||
      route.detail.kind === "workspace_record"
    ) {
      params.set("record", route.detail.recordId);
    }
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}

export function courtOsRouteWithoutDetail(route: CourtOsRoute): CourtOsRoute {
  return route.detail ? { ...route, detail: null } : route;
}

export function courtOsDomainRoute(domain: CourtOsDomainKey): CourtOsRoute {
  return { place: { kind: "domain", domain }, detail: null };
}

export function courtOsResponsibilityRoute(input: {
  responsibility: CourtOsResponsibilityDesignKey;
  scopeId?: string | null;
}): CourtOsRoute {
  const location = courtOsResponsibilityLocation(input.responsibility);
  if (location.kind === "house_command") {
    return {
      place: { kind: "house_command" },
      detail: { kind: "command_responsibility", responsibility: "office_post_appointments" },
    };
  }
  return {
    place: {
      kind: "responsibility",
      domain: location.domain,
      responsibility: input.responsibility,
      scopeId: input.scopeId ?? null,
    },
    detail: null,
  };
}
