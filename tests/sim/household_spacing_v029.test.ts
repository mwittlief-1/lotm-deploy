import { describe, expect, it } from "vitest";
import { createNewRun, proposeTurn } from "../../src/sim";

describe("v0.2.9 household fertility alignment", () => {
  it("respects spouse last_birth_year spacing gate in household births", () => {
    let chosenSeed: string | null = null;

    for (let i = 1; i <= 64; i++) {
      const seed = `hh_spacing_seed_${i}`;
      const s0: any = createNewRun(seed);
      s0.flags._mods.birth_bonus = 10;
      s0.flags._tuning.fertilityScale = 10;
      s0.house.children = [];
      s0.house.spouse.age = 28;
      s0.house.spouse.traits.fertility = 5;

      const p = proposeTurn(s0);
      const births = Number(p.report?.household?.births_count ?? p.report?.household?.births?.length ?? 0);
      if (births > 0) {
        chosenSeed = seed;
        break;
      }
    }

    expect(chosenSeed).toBeTruthy();

    const allow: any = createNewRun(chosenSeed!);
    allow.flags._mods.birth_bonus = 10;
    allow.flags._tuning.fertilityScale = 10;
    allow.house.children = [];
    allow.house.spouse.age = 28;
    allow.house.spouse.traits.fertility = 5;

    const blocked: any = createNewRun(chosenSeed!);
    blocked.flags._mods.birth_bonus = 10;
    blocked.flags._tuning.fertilityScale = 10;
    blocked.house.children = [];
    blocked.house.spouse.age = 28;
    blocked.house.spouse.traits.fertility = 5;
    blocked.house.spouse.last_birth_year = 1;

    const pAllow = proposeTurn(allow);
    const pBlocked = proposeTurn(blocked);

    const birthsAllow = Number(pAllow.report?.household?.births_count ?? pAllow.report?.household?.births?.length ?? 0);
    const birthsBlocked = Number(pBlocked.report?.household?.births_count ?? pBlocked.report?.household?.births?.length ?? 0);

    expect(birthsAllow).toBeGreaterThan(0);
    expect(birthsBlocked).toBe(0);
  });
});
