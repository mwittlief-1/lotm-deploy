import fs from "node:fs";
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { applyDecisions, createNewRun, proposeTurn } from "../src/sim";

function d(state: any): any {
  return {
    labor: { kind: "labor", desired_farmers: state.manor.farmers, desired_builders: state.manor.builders },
    sell: { kind: "sell", sell_bushels: 0 },
    obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
    construction: { kind: "construction", action: "none" },
    marriage: { kind: "marriage", action: "none" },
    prospects: { kind: "prospects", actions: [] }
  };
}

describe("v0.2.9 lock hardening", () => {
  it("no births when mother is 45+", () => {
    let s: any = createNewRun("lock_birth_45");
    s.house.spouse.age = 46;
    s.house.spouse.traits.fertility = 5;
    s.flags._tuning.fertility_mult = 20;
    const before = s.house.children.length;
    for (let i = 0; i < 10; i++) s = applyDecisions(s, d(s));
    expect(s.house.children.length).toBe(before);
  });

  it("birth spacing for mother is at least 2 years", () => {
    let s: any = createNewRun("lock_spacing");
    s.house.spouse.age = 24;
    s.house.spouse.traits.fertility = 5;
    s.flags._tuning.fertility_mult = 12;
    for (let i = 0; i < 14; i++) {
      proposeTurn(s);
      s = applyDecisions(s, d(s));
    }
    const birthYears = (s.house.children ?? [])
      .map((c: any) => String(c.id))
      .filter((id: string) => id.startsWith("p_child_"))
      .map((id: string) => {
        const m = id.match(/^p_child_(\d+)_(\d+)_/);
        if (!m) return null;
        return Number(m[1]) * 3 + Number(m[2]);
      })
      .filter((x: any): x is number => typeof x === "number" && Number.isFinite(x))
      .sort((a: number, b: number) => a - b);

    for (let i = 1; i < birthYears.length; i++) {
      expect(birthYears[i]! - birthYears[i - 1]!).toBeGreaterThanOrEqual(2);
    }
  });

  it("child consumption weight remains below adult contribution", () => {
    const s: any = createNewRun("lock_cons_weights");
    s.house.children = [{ id: "p_c", name: "Child", sex: "M", age: 5, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } }];
    const ctx: any = proposeTurn(s);
    const b = ctx.report.court_consumption_breakdown;
    expect(b).toBeTruthy();
    expect(b.children_count).toBeGreaterThan(0);
    expect(b.adults_count).toBeGreaterThan(0);
    expect(b.children_total_bushels / b.children_count).toBeLessThan(b.adults_total_bushels / b.adults_count);
  });

  it("spouse exclusivity keeps one spouse_of edge per person", () => {
    const s: any = createNewRun("lock_spouse_excl");
    const child = s.house.children[0];
    child.sex = "M";
    child.age = 18;
    child.alive = true;
    child.married = false;
    s.kinship_edges = s.kinship_edges ?? [];
    s.kinship_edges.push({ kind: "spouse_of", a_id: child.id, b_id: "p_old_a" });
    s.kinship_edges.push({ kind: "spouse_of", a_id: child.id, b_id: "p_old_b" });

    s.people = s.people ?? {};
    s.houses = s.houses ?? {};
    s.people.p_new = { id: "p_new", name: "New", sex: "F", age: 19, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } };
    s.people.p_h = { id: "p_h", name: "H", sex: "M", age: 40, alive: true, married: true, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } };
    s.houses.h_noble_zz = { id: "h_noble_zz", name: "zz", tier: "Knight", holdings_count: 1, head_id: "p_h", spouse_id: null, child_ids: ["p_new"] };

    const ctx: any = proposeTurn(s);
    const m = ctx.prospects_window?.prospects?.find((p: any) => p.type === "marriage");
    expect(m).toBeTruthy();
    const s2: any = applyDecisions(s, { ...d(s), prospects: { kind: "prospects", actions: [{ prospect_id: m.id, action: "accept" }] } });
    const edges = (s2.kinship_edges ?? []).filter((e: any) => e.kind === "spouse_of" && (e.a_id === child.id || e.b_id === child.id));
    expect(edges.length).toBe(1);
  });

  it("demography batch scripts are deterministic (same hashes twice)", () => {
    execSync("pnpm -s demography:batch:cohort", { stdio: "pipe" });
    execSync("pnpm -s demography:batch:sim", { stdio: "pipe" });
    const c1 = fs.readFileSync("qa_artifacts/demography_batch/cohort_hash.txt", "utf8").trim();
    const s1 = fs.readFileSync("qa_artifacts/demography_batch/sim_hash.txt", "utf8").trim();

    execSync("pnpm -s demography:batch:cohort", { stdio: "pipe" });
    execSync("pnpm -s demography:batch:sim", { stdio: "pipe" });
    const c2 = fs.readFileSync("qa_artifacts/demography_batch/cohort_hash.txt", "utf8").trim();
    const s2 = fs.readFileSync("qa_artifacts/demography_batch/sim_hash.txt", "utf8").trim();

    expect(c1).toBe(c2);
    expect(s1).toBe(s2);

    const cohort = JSON.parse(fs.readFileSync("qa_artifacts/demography_batch/cohort_summary.json", "utf8"));
    const totalOver100 = (cohort.rows ?? []).reduce((acc: number, r: any) => acc + Number(r.over100 ?? 0), 0);
    expect(totalOver100).toBeLessThanOrEqual(2);
  }, 120000);
});
