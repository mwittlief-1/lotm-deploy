import { describe, expect, it } from "vitest";
import { createNewRun, applyDecisions, proposeTurn } from "../../src/sim";

describe("v0.2.9 fertility anomaly guard", () => {
  it("does not produce births with maternal age >=45 when birth_year is tracked", () => {
    for (let seed = 1; seed <= 24; seed++) {
      let state: any = createNewRun(`fertility_guard_${seed}`);

      for (let t = 0; t < 10; t++) {
        const before = new Set(Object.keys(state.people ?? {}));
        const ctx = proposeTurn(state);
        const next: any = ctx.preview_state;

        for (const [pid, child] of Object.entries(next.people ?? {})) {
          if (before.has(pid)) continue;

          const kin: any[] = Array.isArray(next.kinship_edges) ? next.kinship_edges : [];
          const moms = kin
            .filter((e) => e?.kind === "parent_of" && e?.child_id === pid)
            .map((e) => next.people?.[e.parent_id])
            .filter((p) => p && p.sex === "F");
          const mom = moms[0];
          if (!mom) continue;

          const mBirthYear = typeof (mom as any).birth_year === "number" ? Math.trunc((mom as any).birth_year) : null;
          const cBirthYear = typeof (child as any).birth_year === "number" ? Math.trunc((child as any).birth_year) : null;
          if (mBirthYear !== null && cBirthYear !== null) {
            const maternalAgeAtBirth = cBirthYear - mBirthYear;
            expect(maternalAgeAtBirth).toBeLessThan(45);
          }
        }

        state = applyDecisions(next, {
          labor: { kind: "labor", desired_farmers: next.manor.farmers, desired_builders: next.manor.builders },
          sell: { kind: "sell", sell_bushels: 0 },
          obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
          construction: { kind: "construction", action: "none" },
          marriage: { kind: "marriage", action: "none" },
          prospects: { kind: "prospects", actions: [] },
        } as any);
      }
    }
  });
});
