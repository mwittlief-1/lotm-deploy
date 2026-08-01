import {
  COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
  registeredHouseIdentityAssets,
} from "./identityAssetManifest";

export interface HouseHeraldryAssets {
  shield: string;
  compact: string;
  seal: string;
  livery: string;
  bannerTab: string;
}

export interface HouseIdentityAssets {
  manifestVersion: typeof COURTOS_IDENTITY_ASSET_SCHEMA_VERSION;
  status: "registered" | "missing";
  heraldry: HouseHeraldryAssets | null;
  integratedCouncilRoom: string | null;
}

const NEUTRAL_COUNCIL_ROOM =
  "/assets/council-command-room/command-surfaces/council-neutral-house-ready-v1.png";

export function houseIdentityAssets(houseId: string): HouseIdentityAssets {
  const entry = registeredHouseIdentityAssets(houseId);
  if (!entry) {
    return {
      manifestVersion: COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
      status: "missing",
      heraldry: null,
      integratedCouncilRoom: null,
    };
  }
  return {
    manifestVersion: COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
    status: "registered",
    heraldry: {
      shield: entry.assets.shield,
      compact: entry.assets.compact,
      seal: entry.assets.seal,
      livery: entry.assets.livery,
      bannerTab: entry.assets.banner_tab,
    },
    integratedCouncilRoom: entry.assets.integrated_council_room,
  };
}

export function councilRoomArtForHouse(houseId: string): string {
  return houseIdentityAssets(houseId).integratedCouncilRoom ?? NEUTRAL_COUNCIL_ROOM;
}
