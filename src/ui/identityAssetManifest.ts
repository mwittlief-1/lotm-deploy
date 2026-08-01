import manifestJson from "./assets/courtosIdentityAssets.v1.json";

export const COURTOS_IDENTITY_ASSET_SCHEMA_VERSION =
  "courtos_identity_assets_v1" as const;

export interface HouseIdentityAssetEntry {
  house_id: string;
  display_name: string;
  assets: {
    shield: string;
    compact: string;
    seal: string;
    livery: string;
    banner_tab: string;
    integrated_council_room: string | null;
  };
}

export interface PersonPortraitAssetEntry {
  person_id: string;
  display_name: string;
  portrait_path: string;
}

export interface CourtOsIdentityAssetManifestV1 {
  schema_version: typeof COURTOS_IDENTITY_ASSET_SCHEMA_VERSION;
  source_status: "runtime_asset_binding_manifest";
  identity_source_ref: string;
  asset_source_ref: string;
  houses: HouseIdentityAssetEntry[];
  people: PersonPortraitAssetEntry[];
}

function requireCanonicalId(value: string, prefix: "t0h_" | "t0p_"): void {
  if (!value.startsWith(prefix)) {
    throw new Error(`CourtOS identity manifest contains a non-canonical ${prefix} identifier: ${value}`);
  }
}

function requireRuntimeAssetPath(value: string): void {
  if (!value.startsWith("/assets/") || value.includes("..")) {
    throw new Error(`CourtOS identity manifest contains an invalid runtime asset path: ${value}`);
  }
}

function validateManifest(value: unknown): CourtOsIdentityAssetManifestV1 {
  const manifest = value as CourtOsIdentityAssetManifestV1;
  if (manifest.schema_version !== COURTOS_IDENTITY_ASSET_SCHEMA_VERSION) {
    throw new Error("Unsupported CourtOS identity asset manifest schema");
  }
  if (manifest.source_status !== "runtime_asset_binding_manifest") {
    throw new Error("CourtOS identity asset manifest has not been admitted for runtime asset binding");
  }

  const houseIds = new Set<string>();
  for (const house of manifest.houses) {
    requireCanonicalId(house.house_id, "t0h_");
    if (houseIds.has(house.house_id)) {
      throw new Error(`Duplicate House identity asset binding: ${house.house_id}`);
    }
    houseIds.add(house.house_id);
    for (const path of [
      house.assets.shield,
      house.assets.compact,
      house.assets.seal,
      house.assets.livery,
      house.assets.banner_tab,
      house.assets.integrated_council_room,
    ]) {
      if (path !== null) requireRuntimeAssetPath(path);
    }
  }

  const personIds = new Set<string>();
  for (const person of manifest.people) {
    requireCanonicalId(person.person_id, "t0p_");
    if (personIds.has(person.person_id)) {
      throw new Error(`Duplicate person portrait binding: ${person.person_id}`);
    }
    personIds.add(person.person_id);
    requireRuntimeAssetPath(person.portrait_path);
  }
  return manifest;
}

export const COURTOS_IDENTITY_ASSET_MANIFEST = validateManifest(manifestJson);

const HOUSE_ASSET_INDEX = new Map(
  COURTOS_IDENTITY_ASSET_MANIFEST.houses.map((house) => [house.house_id, house]),
);
const PERSON_PORTRAIT_INDEX = new Map(
  COURTOS_IDENTITY_ASSET_MANIFEST.people.map((person) => [person.person_id, person]),
);

export function registeredHouseIdentityAssets(
  houseId: string,
): HouseIdentityAssetEntry | null {
  return HOUSE_ASSET_INDEX.get(houseId) ?? null;
}

export function registeredPersonPortrait(
  personId: string,
): PersonPortraitAssetEntry | null {
  return PERSON_PORTRAIT_INDEX.get(personId) ?? null;
}
