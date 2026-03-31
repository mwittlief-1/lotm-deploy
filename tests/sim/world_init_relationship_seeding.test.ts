import { describe, expect, it } from "vitest";

import { ensurePeopleFirst } from "../../src/sim/peopleFirst";
import { createNewRun } from "../../src/sim/state";
import {
  ensureRelationshipEdge,
  getRelationshipSeedProfile,
  resolveRelationshipSeedProfileForIds,
} from "../../src/sim/domains/people/relationshipEngine";
import { ensureExternalHousesSeed_v0_2_8 } from "../../src/sim/worldgen";

function edge(state: any, fromId: string, toId: string) {
  return state.relationships.find((entry: any) => entry.from_id === fromId && entry.to_id === toId) ?? null;
}

describe("world-init relationship seeding", () => {
  it("seeds liege and church edges from distinct non-uniform profiles at create-new-run time", () => {
    const state = createNewRun("V03_R0_005_T03_START_RELATIONSHIPS");
    const headId = state.house.head.id;

    expect(edge(state, headId, state.locals.liege.id)).toMatchObject(
      getRelationshipSeedProfile("player_head_to_liege").target
    );
    expect(edge(state, state.locals.liege.id, headId)).toMatchObject(
      getRelationshipSeedProfile("liege_to_player_head").target
    );
    expect(edge(state, headId, state.locals.clergy.id)).toMatchObject(
      getRelationshipSeedProfile("player_head_to_church").target
    );
    expect(edge(state, state.locals.clergy.id, headId)).toMatchObject(
      getRelationshipSeedProfile("church_to_player_head").target
    );

    expect(edge(state, headId, state.locals.liege.id)).not.toEqual(edge(state, headId, state.locals.clergy.id));
  });

  it("starts the player with a deterministic positive and negative mix of local-house ties", () => {
    const state = createNewRun("V03_R0_005_T03_LOCAL_MIX");
    const headId = state.house.head.id;

    expect(edge(state, headId, "p_noble1")).toMatchObject(
      getRelationshipSeedProfile("player_head_to_local_house_strained").target
    );
    expect(edge(state, headId, "p_noble2")).toMatchObject(
      getRelationshipSeedProfile("player_head_to_local_house_favored").target
    );
    expect(edge(state, "p_noble1", headId)).toMatchObject(
      getRelationshipSeedProfile("local_house_strained_to_player_head").target
    );
    expect(edge(state, "p_noble2", headId)).toMatchObject(
      getRelationshipSeedProfile("local_house_favored_to_player_head").target
    );
  });

  it("extends the same deterministic local-house profiles to external house heads during worldgen", () => {
    const state = createNewRun("V03_R0_005_T03_WORLDGEN_MIX");
    ensurePeopleFirst(state);
    ensureExternalHousesSeed_v0_2_8(state);

    const headId = state.house.head.id;
    const favoredHeadId = "p_ext_02_head";
    const strainedHeadId = "p_ext_01_head";

    expect(edge(state, headId, favoredHeadId)).toMatchObject(
      getRelationshipSeedProfile("player_head_to_local_house_favored").target
    );
    expect(edge(state, headId, strainedHeadId)).toMatchObject(
      getRelationshipSeedProfile("player_head_to_local_house_strained").target
    );
  });

  it("limits seeded profiles to turn-zero world-init edges", () => {
    const state = createNewRun("V03_R0_005_T03_TURN_GUARD");
    state.turn_index = 1;
    state.relationships = [];

    const profile = resolveRelationshipSeedProfileForIds(state, state.house.head.id, state.locals.liege.id);
    const seeded = ensureRelationshipEdge(state, state.house.head.id, state.locals.liege.id);

    expect(profile).toBeNull();
    expect(seeded).toMatchObject({ allegiance: 50, respect: 50, threat: 20 });
  });
});
