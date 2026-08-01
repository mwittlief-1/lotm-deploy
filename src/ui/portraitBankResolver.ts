import {
  COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
  registeredPersonPortrait,
} from "./identityAssetManifest";

export interface PortraitArtRef {
  src: string;
  alt: string;
}

export type PortraitResolution =
  | {
      status: "registered";
      manifestVersion: typeof COURTOS_IDENTITY_ASSET_SCHEMA_VERSION;
      personId: string;
      art: PortraitArtRef;
    }
  | {
      status: "missing";
      manifestVersion: typeof COURTOS_IDENTITY_ASSET_SCHEMA_VERSION;
      personId: string | null;
      reason: "missing_person_id" | "portrait_not_registered";
      art: null;
    };

export function portraitResolutionForPerson(args: {
  personId?: string | null;
  label: string;
  age?: number | null;
  sex?: string | null;
}): PortraitResolution {
  const personId = args.personId?.trim() || null;
  if (!personId) {
    return {
      status: "missing",
      manifestVersion: COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
      personId: null,
      reason: "missing_person_id",
      art: null,
    };
  }

  const entry = registeredPersonPortrait(personId);
  if (!entry) {
    return {
      status: "missing",
      manifestVersion: COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
      personId,
      reason: "portrait_not_registered",
      art: null,
    };
  }

  return {
    status: "registered",
    manifestVersion: COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
    personId,
    art: {
      src: entry.portrait_path,
      alt: `${entry.display_name} portrait`,
    },
  };
}

export function portraitArtForPerson(args: {
  personId?: string | null;
  label: string;
  age?: number | null;
  sex?: string | null;
}): PortraitArtRef | undefined {
  return portraitResolutionForPerson(args).art ?? undefined;
}
