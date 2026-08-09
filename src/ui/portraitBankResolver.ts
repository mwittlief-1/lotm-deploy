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
      status: "portrait_bank";
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
  if (entry) {
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

  // Every canonical person has a durable presentation portrait. Individually
  // commissioned likenesses take precedence; the approved portrait bank gives
  // the remaining graph a deterministic, age-appropriate likeness without
  // inventing biography or changing any person truth.
  const age = args.age ?? null;
  const ageBand = age !== null && age < 16
    ? "child"
    : age !== null && age < 31
      ? "young_adult"
      : age !== null && age >= 61
        ? "old_age"
        : "mature_adult";
  let hash = 2166136261;
  for (const character of personId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const baseId = String((hash >>> 0) % 6 + 1).padStart(3, "0");
  return {
    status: "portrait_bank",
    manifestVersion: COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
    personId,
    art: {
      src: `/assets/portrait-bank/proof/portrait_age_pf${baseId}_${ageBand}.png`,
      alt: `${args.label} portrait`,
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
