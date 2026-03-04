import { describe, expect, it } from "vitest";
import { createNewRun, proposeTurn } from "../../src/sim";

describe("v0.2.9 annual aging integration", () => {
  it("does not double-age non-player world actors after annual demography substeps", () => {
    const s0: any = createNewRun("aging_v029_seed");
    s0.flags._tuning = {
      ...(s0.flags?._tuning ?? {}),
      mortalityScaleChild: 0,
      mortalityScaleAdult: 0,
      mortality_mult: 0,
    };

    const extHouseId = Object.keys(s0.houses).filter((hid) => hid !== s0.player_house_id).sort()[0];
    expect(extHouseId).toBeTruthy();

    const extHeadId = s0.houses[extHouseId].head_id;
    expect(typeof extHeadId).toBe("string");

    const beforeExtAge = Number(s0.people[extHeadId].age);
    const beforePlayerAge = Number(s0.house.head.age);

    const p = proposeTurn(s0);

    const afterExtAge = Number(p.preview_state.people[extHeadId].age);
    const afterPlayerAge = Number(p.preview_state.house.head.age);

    expect(afterExtAge - beforeExtAge).toBe(3);
    expect(afterPlayerAge - beforePlayerAge).toBe(3);
  });
});
