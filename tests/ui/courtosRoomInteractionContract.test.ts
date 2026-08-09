import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  COURTOS_DOMAINS,
  type CourtOsRoomPresentationVariant,
} from "../../src/ui/courtosInformationArchitecture";
import {
  isValidCourtOsRoomPresentationVariant,
  resolveCourtOsRoomPresentation,
} from "../../src/ui/courtosRoomPresentation";

describe("CourtOS operational room interaction contract", () => {
  it("keeps all eight rooms on the place to responsibility navigation spine", () => {
    expect(COURTOS_DOMAINS).toHaveLength(8);
    expect(
      COURTOS_DOMAINS.every(
        (domain) => domain.interactionPattern === "place_responsibility",
      ),
    ).toBe(true);
    expect(COURTOS_DOMAINS.flatMap((domain) => domain.responsibilities)).toHaveLength(23);
  });

  it("gives every room a complete, non-tiled authored spatial composition", () => {
    const defaultArt = new Set<string>();
    const compositions = new Set<string>();
    for (const domain of COURTOS_DOMAINS) {
      expect(domain.presentationVariants.length).toBeGreaterThan(0);
      for (const variant of domain.presentationVariants) {
        expect(variant.key).toBeTruthy();
        expect(variant.art).toBeTruthy();
        expect(variant.anchorMap).toBeTruthy();
        expect(variant.background).toMatchObject({ fit: "cover", repeat: "no-repeat" });
        expect(isValidCourtOsRoomPresentationVariant(domain.key, variant)).toBe(true);
        expect(existsSync(resolve("public", variant.art.replace(/^\/assets\//, "assets/")))).toBe(true);
        expect(variant.settings.map(({ responsibility }) => responsibility).sort()).toEqual(
          domain.responsibilities.map(({ key }) => key).sort(),
        );
        for (const setting of variant.settings) {
          expect(setting.art).toMatch(/^\/assets\/courtos\/rooms\//);
          expect(existsSync(resolve("public", setting.art.replace(/^\/assets\//, "assets/")))).toBe(true);
        }
      }
      const resolved = resolveCourtOsRoomPresentation(domain.key);
      expect(resolved.posture).toBe("available");
      if (resolved.posture !== "available") continue;
      expect(resolved.backgroundStyle.backgroundRepeat).toBe("no-repeat");
      expect(resolved.backgroundStyle.backgroundSize).toBe("cover");
      expect(defaultArt.has(resolved.variant.art)).toBe(false);
      defaultArt.add(resolved.variant.art);
      compositions.add(resolved.variant.composition);
    }
    expect(defaultArt).toHaveLength(8);
    expect(compositions).toHaveLength(8);
    expect(new Set(COURTOS_DOMAINS.flatMap((domain) => domain.presentationVariants.flatMap((variant) => variant.settings.map(({ art }) => art))))).toHaveLength(23);
  });

  it("fails closed for stale and structurally invalid variants", () => {
    expect(resolveCourtOsRoomPresentation("household", "retired-hallway-v0")).toEqual({
      posture: "withheld",
      domain: "household",
      requestedVariantKey: "retired-hallway-v0",
      reason: "unknown_room_variant",
    });

    const household = COURTOS_DOMAINS[0];
    if (!household) throw new Error("Household domain fixture is unavailable");
    const invalid = {
      ...household.presentationVariants[0],
      settings: household.presentationVariants[0]?.settings.slice(1) ?? [],
    } as CourtOsRoomPresentationVariant;
    expect(isValidCourtOsRoomPresentationVariant("household", invalid)).toBe(false);
  });
});
