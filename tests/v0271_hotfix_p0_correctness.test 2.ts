import { describe, it, expect } from "vitest";

import { createNewRun, applyDecisions } from "../src/sim";

describe("v0.2.7.1 hotfix P0 correctness", () => {
  it("ages all instantiated People/Registry persons by +3 (alive only)", () => {
    const s0: any = createNewRun("TEST_v0271_age_registry");

    // Ensure registry exists
    s0.people = s0.people ?? {};

    // Insert an extra person not in household/court
    const extraId = "p_test_extra";
    s0.people[extraId] = {
      id: extraId,
      name: "Extra",
      sex: "M",
      age: 30,
      alive: true,
      married: false,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
    };

    const before: Record<string, number> = {};
    for (const [id, p] of Object.entries(s0.people)) {
      if (!p || typeof p !== "object") continue;
      if ((p as any).alive === false) continue;
      if (typeof (p as any).age === "number") before[id] = (p as any).age;
    }

    const decisions: any = {
      labor: { kind: "labor", desired_farmers: s0.manor.farmers, desired_builders: s0.manor.builders },
      sell: { kind: "sell", sell_bushels: 0 },
      obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
      construction: { kind: "construction", action: "none" },
      marriage: { kind: "marriage", action: "none" },
      prospects: { kind: "prospects", actions: [] }
    };

    const s1: any = applyDecisions(s0, decisions);

    for (const [id, age0] of Object.entries(before)) {
      const p1 = s1.people?.[id];
      expect(p1).toBeTruthy();
      if ((p1 as any).alive === false) continue;
      expect((p1 as any).age).toBe(age0 + 3);
    }
  });
});
