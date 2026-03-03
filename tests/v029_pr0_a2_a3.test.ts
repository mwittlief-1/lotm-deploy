import { describe, expect, it } from "vitest";
import { applyDecisions, createNewRun, proposeTurn } from "../src/sim";

function defaultDecisions(s: any): any {
  return {
    labor: { kind: "labor", desired_farmers: s.manor.farmers, desired_builders: s.manor.builders },
    sell: { kind: "sell", sell_bushels: 0 },
    obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
    construction: { kind: "construction", action: "none" },
    marriage: { kind: "marriage", action: "none" },
    prospects: { kind: "prospects", actions: [] }
  };
}

describe("PR0 A2/A3 stabilizers", () => {
  it("child consumption contribution is below adult contribution", () => {
    const s: any = createNewRun("pr0_child_vs_adult");
    s.house.children = [{ id: "p_child", name: "Child", sex: "M", age: 5, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } }];
    const ctx: any = proposeTurn(s);
    const b = ctx.report.court_consumption_breakdown;
    expect(b).toBeTruthy();
    expect(b.children_count).toBeGreaterThan(0);
    expect(b.adults_count).toBeGreaterThan(0);
    expect(b.children_total_bushels / b.children_count).toBeLessThan(b.adults_total_bushels / b.adults_count);
  });

  it("new run baseline has no idle peasants (all farmers)", () => {
    const s: any = createNewRun("pr0_no_idle_new");
    expect(s.manor.farmers).toBe(s.manor.population);
    expect(s.manor.builders).toBe(0);
  });

  it("default decisions keep no-idle baseline after turns", () => {
    let s: any = createNewRun("pr0_no_idle_after");
    for (let i = 0; i < 5; i++) {
      s = applyDecisions(s, defaultDecisions(s));
      expect(s.manor.farmers + s.manor.builders).toBe(s.manor.population);
      expect(s.manor.farmers).toBe(s.manor.population - s.manor.builders);
    }
  });
});
