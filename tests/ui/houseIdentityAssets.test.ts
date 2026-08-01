import { describe, expect, it } from "vitest";

import {
  councilRoomArtForHouse,
  houseIdentityAssets,
} from "../../src/ui/houseIdentityAssets";

describe("CourtOS House identity asset resolution", () => {
  it("resolves reviewed House assets by canonical House ID", () => {
    expect(houseIdentityAssets("t0h_bcae5bd911ab10f4c7fdfea0")).toMatchObject({
      manifestVersion: "courtos_identity_assets_v1",
      status: "registered",
      heraldry: {
        shield: "/assets/heraldry/house-pearwick-hall/shield.png",
        compact: "/assets/heraldry/house-pearwick-hall/compact.png",
      },
      integratedCouncilRoom:
        "/assets/council-command-room/command-surfaces/council-pearwick-hall-integrated-v2.png",
    });
  });

  it("fails closed to a neutral room without inventing heraldry for an unregistered House", () => {
    expect(houseIdentityAssets("t0h_unregistered_house")).toEqual({
      manifestVersion: "courtos_identity_assets_v1",
      status: "missing",
      heraldry: null,
      integratedCouncilRoom: null,
    });
    expect(councilRoomArtForHouse("t0h_unregistered_house")).toBe(
      "/assets/council-command-room/command-surfaces/council-neutral-house-ready-v1.png",
    );
  });
});
