import { describe, it, expect } from "vitest";
import { createNewRun } from "../../src/sim";
import { courtConsumptionBushels_v0_2_4 } from "../../src/sim/court";

describe("court consumption age weights", () => {
  it("children consume less than adults", () => {
    const s: any = createNewRun("TEST_WEIGHTS");
    s.people[s.house.children[0].id].age = 2;
    const child = courtConsumptionBushels_v0_2_4(s, 12, 1).court_consumption_bushels;
    s.people[s.house.children[0].id].age = 20;
    const adult = courtConsumptionBushels_v0_2_4(s, 12, 1).court_consumption_bushels;
    expect(child).toBeLessThan(adult);
  });
});
