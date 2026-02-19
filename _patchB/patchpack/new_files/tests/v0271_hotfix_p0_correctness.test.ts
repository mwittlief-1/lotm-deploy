import { describe, it, expect } from "vitest";

// Adjust imports to match your repo's sim exports.
import { createNewRun, proposeTurn, applyDecisions } from "../src/sim";

describe("v0.2.7.1 hotfix P0 correctness", () => {
  it("ages all instantiated People/Registry persons by +3 (alive only)", () => {
    const s0: any = createNewRun("TEST_v0271_age_registry");

    // Ensure registry exists
    (s0 as any).people = (s0 as any).people ?? {};

    // Insert an extra person not in household/court
    const extraId = "p_test_extra";
    (s0 as any).people[extraId] = {
      id: extraId,
      name: "Extra",
      sex: "M",
      age: 30,
      alive: true,
      married: false,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    };

    const before: Record<string, number> = {};
    for (const [id, p] of Object.entries((s0 as any).people)) {
      if (!p || typeof p !== "object") continue;
      if ((p as any).alive === false) continue;
      if (typeof (p as any).age === "number") before[id] = (p as any).age;
    }

    // Propose + apply a no-op decision bundle (adjust to your decision schema)
    const proposal: any = proposeTurn(s0);
    const noopDecisions: any = {
      // Fill with required decision objects per your schema.
    };
    const s1: any = applyDecisions(proposal.working ?? proposal.state ?? proposal, noopDecisions);

    for (const [id, age0] of Object.entries(before)) {
      const p1 = (s1 as any).people[id];
      expect(p1).toBeTruthy();
      if ((p1 as any).alive === false) continue;
      expect((p1 as any).age).toBe(age0 + 3);
    }
  });
});
