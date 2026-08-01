import { describe, expect, it } from "vitest";

import {
  portraitArtForPerson,
  portraitResolutionForPerson,
} from "../../src/ui/portraitBankResolver";

describe("CourtOS registered portrait resolution", () => {
  it.each([
    [
      "t0p_d46018cec3d07ea31283ceed",
      "Aethelred Black, household clerk records keeper",
      "aethelred-black__p2-m-har-tn06-ph-a__commoner-in-service-broad-pal-10.png",
    ],
    [
      "t0p_1a435b2adb59bfd7d0c79d28",
      "Ralph Woolman",
      "ralph-woolman__p2-age-ya-m-dom-029__commoner-in-service-broad-pal-10.png",
    ],
    [
      "t0p_b21c9327a2680555558e2d7c",
      "Ralph Scriven",
      "ralph-scriven__p2-m-orc-tn04-ph-c__other-noble-collateral-broad-pal-11.png",
    ],
    [
      "t0p_1a651f26b966680a3f01d361",
      "Gilbert Waxman",
      "gilbert-waxman__p2-m-har-tp06-ph-a__other-noble-collateral-broad-pal-10.png",
    ],
    [
      "t0p_4c0db3b36235e233ca0cd4d6",
      "Michael Moorbrook",
      "michael-moorbrook__p2-m-gls-tn04-ph-c-old-age__other-noble-collateral-broad-pal-05.png",
    ],
    [
      "t0p_a8bb623f1d194c7735180e29",
      "Gerard Scrivener",
      "gerard-scrivener__p2-m-gls-t0-ph-d__high-church-service-narrow-fixed.png",
    ],
    [
      "t0p_334927a7b877bbb47382f107",
      "Wulfstan Ford",
      "wulfstan-ford__p2-m-mrw-tp04-ph-d__commoner-in-service-broad-pal-10.png",
    ],
  ])("resolves canonical person %s", (personId, label, fileName) => {
    expect(portraitArtForPerson({ personId, label })?.src).toBe(
      `/assets/council-command-room/portraits/pearwick-hall/${fileName}`,
    );
  });

  it.each([
    ["t0p_8136ecf3214b14e620376ded", "Gilbert of Holtcross", "gilbert-of-holtcross.png"],
    ["t0p_e863fde465f25465614b155c", "Gunnilda of Glastonmere", "gunnilda-of-glastonmere.png"],
    ["t0p_881222dcd073c07d29428069", "Laurence of Holtcross", "laurence-of-holtcross.png"],
    ["t0p_20f876de77c2cd7589564419", "Aelfwine of Holtcross", "aelfwine-of-holtcross.png"],
    ["t0p_1743dfc4c41362870312616f", "Odo of Holtcross", "odo-of-holtcross.png"],
    ["t0p_771a6c64db4bcc590d9f4a56", "Joia of Holtcross", "joia-of-holtcross.png"],
    ["t0p_831066d46d6465c18f858649", "Gilbert Tanner", "gilbert-tanner.png"],
  ])("resolves canonical person %s", (personId, label, fileName) => {
    expect(portraitArtForPerson({ personId, label })?.src).toBe(
      `/assets/council-command-room/portraits/holtcross/${fileName}`,
    );
  });
});

describe("CourtOS portrait identity safety", () => {
  it("does not substitute a registered face when an unknown ID uses a known label", () => {
    expect(
      portraitResolutionForPerson({
        personId: "t0p_unregistered_identity",
        label: "Edmund of Pearwick Hall",
      }),
    ).toMatchObject({
      status: "missing",
      personId: "t0p_unregistered_identity",
      reason: "portrait_not_registered",
      art: null,
    });
  });

  it("does not use a label or demographic hash when the canonical ID is absent", () => {
    expect(
      portraitResolutionForPerson({
        label: "Gilbert of Holtcross",
        age: 41,
        sex: "male",
      }),
    ).toMatchObject({
      status: "missing",
      personId: null,
      reason: "missing_person_id",
      art: null,
    });
    expect(
      portraitArtForPerson({ label: "Unregistered Person", age: 41, sex: "male" }),
    ).toBeUndefined();
  });
});
