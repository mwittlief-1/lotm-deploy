import { describe, expect, it } from "vitest";
import { createNewRun, proposeTurn } from "../../src/sim";

describe("v0.2.9 household birth registry sync", () => {
  it("writes spouse births into people registry and parent_of kinship edges", () => {
    let chosenSeed: string | null = null;

    for (let i = 1; i <= 96; i++) {
      const seed = `hh_birth_registry_${i}`;
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

    const s: any = createNewRun(chosenSeed!);
    s.flags._mods.birth_bonus = 10;
    s.flags._tuning.fertilityScale = 10;
    s.house.children = [];
    s.house.spouse.age = 28;
    s.house.spouse.traits.fertility = 5;

    const p = proposeTurn(s);
    const births = Number(p.report?.household?.births_count ?? p.report?.household?.births?.length ?? 0);
    expect(births).toBeGreaterThan(0);

    const childId = p.preview_state.house.children[p.preview_state.house.children.length - 1]?.id;
    expect(typeof childId).toBe("string");
    expect(p.preview_state.people[childId]).toBeTruthy();

    const edges: any[] = Array.isArray(p.preview_state.kinship_edges) ? p.preview_state.kinship_edges : [];
    const motherEdge = edges.some((e) => e?.kind === "parent_of" && e?.parent_id === p.preview_state.house.spouse.id && e?.child_id === childId);
    const fatherEdge = edges.some((e) => e?.kind === "parent_of" && e?.parent_id === p.preview_state.house.head.id && e?.child_id === childId);
    expect(motherEdge).toBe(true);
    expect(fatherEdge).toBe(true);

    const transitionFacts = p.preview_state.flags._dynastic_transition_facts_v1;
    expect(transitionFacts).toMatchObject({
      schema_version: "dynastic_transition_facts_v1",
      turn_index: p.preview_state.turn_index
    });
    expect(transitionFacts.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "birth",
          person_id: childId,
          source: "household_demography"
        })
      ])
    );
  });
});
