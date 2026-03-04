import { describe, it, expect } from "vitest";
import { createNewRun, proposeTurn } from "../../src/sim";

describe("v0.2.9 heir law fallback", () => {
  it("uses nearest male-line relative (brother) when no living children", () => {
    const s0: any = createNewRun("TEST_HEIR_FALLBACK_BROTHER");

    // No living children.
    for (const c of s0.house.children) c.alive = false;

    // Add father + brother in registry/kinship (brother not in house.children).
    const fatherId = "p_test_father";
    const brotherId = "p_test_brother";
    s0.people[fatherId] = {
      id: fatherId,
      name: "Father Test",
      sex: "M",
      age: 62,
      alive: true,
      married: true,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
    };
    s0.people[brotherId] = {
      id: brotherId,
      name: "Brother Test",
      sex: "M",
      age: 28,
      alive: true,
      married: false,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
    };

    s0.kinship_edges = s0.kinship_edges ?? [];
    s0.kinship_edges.push({ kind: "parent_of", parent_id: fatherId, child_id: s0.house.head.id });
    s0.kinship_edges.push({ kind: "parent_of", parent_id: fatherId, child_id: brotherId });

    // Force succession now.
    s0.house.head.alive = false;

    const ctx: any = proposeTurn(s0);
    const s1: any = ctx.preview_state;

    expect(s1.house.head.id).toBe(brotherId);
    expect(s1.house.heir_id).not.toBe(s0.house.head.id);
  });
});
