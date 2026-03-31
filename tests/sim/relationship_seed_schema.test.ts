import { describe, expect, it } from "vitest";

import {
  applyRelationshipDelta,
  getRelationshipSeedProfile,
  getRelationshipSeedProfileKey,
  listRelationshipSeedProfiles,
  RELATIONSHIP_SEED_PROFILE_KEYS,
  RELATIONSHIP_SEED_SCHEMA_VERSION,
} from "../../src/sim/domains/people/relationshipEngine";

describe("relationship seed schema", () => {
  it("lists canonical seed profiles in stable order", () => {
    const profiles = listRelationshipSeedProfiles();

    expect(profiles.map((profile) => profile.profile_key)).toEqual([...RELATIONSHIP_SEED_PROFILE_KEYS]);
    expect(profiles.every((profile) => profile.schema_version === RELATIONSHIP_SEED_SCHEMA_VERSION)).toBe(true);
  });

  it("maps family and direction pairs onto stable profile keys", () => {
    expect(
      getRelationshipSeedProfileKey({
        family: "liege",
        direction: "player_to_counterparty",
      })
    ).toBe("player_head_to_liege");
    expect(
      getRelationshipSeedProfileKey({
        family: "church",
        direction: "counterparty_to_player",
      })
    ).toBe("church_to_player_head");
    expect(
      getRelationshipSeedProfileKey({
        family: "local_house",
        direction: "player_to_counterparty",
        local_stance: "favored",
      })
    ).toBe("player_head_to_local_house_favored");
    expect(
      getRelationshipSeedProfileKey({
        family: "local_house",
        direction: "counterparty_to_player",
        local_stance: "strained",
      })
    ).toBe("local_house_strained_to_player_head");
  });

  it("defines non-uniform liege, church, and local-house targets", () => {
    const liege = getRelationshipSeedProfile("player_head_to_liege");
    const church = getRelationshipSeedProfile("player_head_to_church");
    const localFavored = getRelationshipSeedProfile("player_head_to_local_house_favored");
    const localStrained = getRelationshipSeedProfile("player_head_to_local_house_strained");

    expect(liege.target).toEqual({ allegiance: 68, respect: 60, threat: 14 });
    expect(church.target).toEqual({ allegiance: 54, respect: 62, threat: 12 });
    expect(localFavored.target).toEqual({ allegiance: 57, respect: 56, threat: 16 });
    expect(localStrained.target).toEqual({ allegiance: 41, respect: 45, threat: 27 });

    expect(church.target).not.toEqual(liege.target);
    expect(localFavored.target.allegiance).toBeGreaterThan(localStrained.target.allegiance);
    expect(localFavored.target.threat).toBeLessThan(localStrained.target.threat);
  });

  it("keeps seed deltas compatible with applyRelationshipDelta", () => {
    const profiles = listRelationshipSeedProfiles();

    for (const profile of profiles) {
      const state = { relationships: [] } as any;
      const edge = applyRelationshipDelta(
        state,
        `from:${profile.profile_key}`,
        `to:${profile.profile_key}`,
        profile.delta,
        profile.profile_key
      );

      expect(edge).toMatchObject(profile.target);
    }
  });
});
