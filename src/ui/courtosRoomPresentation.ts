import {
  courtOsDomain,
  type CourtOsDomainKey,
  type CourtOsRoomPresentationVariant,
} from "./courtosInformationArchitecture";

export type CourtOsRoomPresentationResolution =
  | {
      posture: "available";
      domain: CourtOsDomainKey;
      variant: CourtOsRoomPresentationVariant;
      /** Safe CSS values derived only from a validated authored variant. */
      backgroundStyle: {
        backgroundImage: string;
        backgroundPosition: string;
        backgroundRepeat: "no-repeat";
        backgroundSize: "cover";
      };
    }
  | {
      posture: "withheld";
      domain: CourtOsDomainKey;
      requestedVariantKey: string | null;
      reason:
        | "room_has_no_authored_variant"
        | "unknown_room_variant"
        | "invalid_room_variant";
    };

const SAFE_VARIANT_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_FIXTURE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_LOCAL_ART = /^\/assets\/[a-zA-Z0-9._~!$&'()+,;=:@%/-]+$/;
const SAFE_FOCAL_POINT = /^(?:100|\d{1,2})% (?:100|\d{1,2})%$/;

function isSafeLocalArt(path: string): boolean {
  return (
    SAFE_LOCAL_ART.test(path) &&
    !path.includes("..") &&
    !path.includes("\\") &&
    !path.startsWith("//")
  );
}

export function isValidCourtOsRoomPresentationVariant(
  domainKey: CourtOsDomainKey,
  variant: CourtOsRoomPresentationVariant,
): boolean {
  const domain = courtOsDomain(domainKey);
  if (!SAFE_VARIANT_KEY.test(variant.key) || !isSafeLocalArt(variant.art)) return false;
  if (variant.background.fit !== "cover" || variant.background.repeat !== "no-repeat") return false;
  if (!SAFE_FOCAL_POINT.test(variant.background.focalPoint)) return false;
  if (!variant.anchorMap.trim()) return false;

  const expected = new Set(domain.responsibilities.map(({ key }) => key));
  const found = new Set<string>();
  const fixtures = new Set<string>();
  for (const setting of variant.settings) {
    if (!expected.has(setting.responsibility)) return false;
    if (found.has(setting.responsibility)) return false;
    if (!SAFE_FIXTURE_KEY.test(setting.fixture) || fixtures.has(setting.fixture)) return false;
    if (!isSafeLocalArt(setting.art)) return false;
    if (setting.focalPoint && !SAFE_FOCAL_POINT.test(setting.focalPoint)) return false;
    found.add(setting.responsibility);
    fixtures.add(setting.fixture);
  }
  return found.size === expected.size;
}

export type CourtOsResponsibilityPresentationResolution =
  | {
      posture: "available";
      domain: CourtOsDomainKey;
      responsibility: CourtOsRoomPresentationVariant["settings"][number]["responsibility"];
      variant: CourtOsRoomPresentationVariant;
      setting: CourtOsRoomPresentationVariant["settings"][number];
      backgroundStyle: {
        backgroundImage: string;
        backgroundPosition: string;
        backgroundRepeat: "no-repeat";
        backgroundSize: "cover";
      };
    }
  | {
      posture: "withheld";
      domain: CourtOsDomainKey;
      responsibility: CourtOsRoomPresentationVariant["settings"][number]["responsibility"];
      reason: "room_presentation_unavailable" | "responsibility_setting_unavailable";
    };

/** Resolves the dedicated enclosed setting for a responsibility. */
export function resolveCourtOsResponsibilityPresentation(
  domainKey: CourtOsDomainKey,
  responsibility: CourtOsRoomPresentationVariant["settings"][number]["responsibility"],
  requestedVariantKey?: string,
): CourtOsResponsibilityPresentationResolution {
  const room = resolveCourtOsRoomPresentation(domainKey, requestedVariantKey);
  if (room.posture !== "available") {
    return { posture: "withheld", domain: domainKey, responsibility, reason: "room_presentation_unavailable" };
  }
  const setting = room.variant.settings.find((candidate) => candidate.responsibility === responsibility);
  if (!setting || !isSafeLocalArt(setting.art)) {
    return { posture: "withheld", domain: domainKey, responsibility, reason: "responsibility_setting_unavailable" };
  }
  return {
    posture: "available",
    domain: domainKey,
    responsibility,
    variant: room.variant,
    setting,
    backgroundStyle: {
      backgroundImage: `url(${JSON.stringify(setting.art)})`,
      backgroundPosition: setting.focalPoint ?? room.variant.background.focalPoint,
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
    },
  };
}

/**
 * Selects an authored room presentation without consulting House identity.
 * An explicit stale/unknown key fails closed instead of silently changing the
 * venue underneath a saved UI route. Omit the key to select the domain default.
 */
export function resolveCourtOsRoomPresentation(
  domainKey: CourtOsDomainKey,
  requestedVariantKey?: string,
): CourtOsRoomPresentationResolution {
  const domain = courtOsDomain(domainKey);
  const requested = requestedVariantKey ?? domain.presentationVariants[0]?.key;
  if (!requested) {
    return {
      posture: "withheld",
      domain: domainKey,
      requestedVariantKey: null,
      reason: "room_has_no_authored_variant",
    };
  }
  const variant = domain.presentationVariants.find(({ key }) => key === requested);
  if (!variant) {
    return {
      posture: "withheld",
      domain: domainKey,
      requestedVariantKey: requested,
      reason: "unknown_room_variant",
    };
  }
  if (!isValidCourtOsRoomPresentationVariant(domainKey, variant)) {
    return {
      posture: "withheld",
      domain: domainKey,
      requestedVariantKey: requested,
      reason: "invalid_room_variant",
    };
  }
  return {
    posture: "available",
    domain: domainKey,
    variant,
    backgroundStyle: {
      backgroundImage: `url(${JSON.stringify(variant.art)})`,
      backgroundPosition: variant.background.focalPoint,
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
    },
  };
}
