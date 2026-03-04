import { describe, expect, it } from "vitest";
import { createNewRun, proposeTurn } from "../../src/sim";

describe("v0.2.9 locals honesty", () => {
  it("marks missing local slots as vacant", () => {
    const s0: any = createNewRun("locals_vacant_seed");
    s0.locals.liege = { id: "missing_liege", name: "Missing Liege" };
    delete s0.people.missing_liege;

    const p = proposeTurn(s0);
    expect(p.preview_state.locals.liege.alive).toBe(false);
    expect(String(p.preview_state.locals.liege.name)).toContain("Vacant");
  });

  it("surfaces deceased locals from the registry", () => {
    const s0: any = createNewRun("locals_deceased_seed");
    const clergyId = s0.locals?.clergy?.id;
    expect(typeof clergyId).toBe("string");
    s0.people[clergyId].alive = false;

    const p = proposeTurn(s0);
    expect(p.preview_state.locals.clergy.id).toBe(clergyId);
    expect(p.preview_state.locals.clergy.alive).toBe(false);
  });
});
