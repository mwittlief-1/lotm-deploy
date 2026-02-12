import { describe, it, expect } from "vitest";
import { GOLDEN_SEEDS_V009 } from "../src/content/goldenSeeds";
import { createNewRun, proposeTurn, applyDecisions } from "../src/sim";
import { decide } from "../src/sim/policies";

function runDeterministic(seed: string, policy: "prudent-builder" | "builder-forward", turns: number): string {
  let s = createNewRun(seed);
  for (let i = 0; i < turns; i++) {
    const ctx = proposeTurn(s);
    const d = decide(policy, s, ctx);
    s = applyDecisions(s, d);
    if (s.game_over) break;
  }
  return JSON.stringify(s.log);
}

describe("golden seeds (v0.0.9)", () => {
  it("golden seeds are deterministic for 15 turns under prudent-builder", () => {
    for (const g of GOLDEN_SEEDS_V009) {
      const a = runDeterministic(g.seed, "prudent-builder", 15);
      const b = runDeterministic(g.seed, "prudent-builder", 15);
      expect(a).toEqual(b);
    }
  });

  it("golden seeds are deterministic for 15 turns under builder-forward", () => {
    for (const g of GOLDEN_SEEDS_V009) {
      const a = runDeterministic(g.seed, "builder-forward", 15);
      const b = runDeterministic(g.seed, "builder-forward", 15);
      expect(a).toEqual(b);
    }
  });
});
