import { describe, it, expect } from "vitest";
import { createNewRun, proposeTurn, applyDecisions } from "../../src/sim";

describe("marriage alliance house deltas", () => {
  it("accepting a marriage prospect applies House↔House deltas and writes a receipt line", () => {
    const s0: any = createNewRun("TEST_MARRIAGE_ALLIANCE");
    const child = s0.house.children[0];
    child.age = 16;
    child.alive = true;
    child.married = false;

    const ctx: any = proposeTurn(s0);
    const pw: any = ctx.prospects_window;
    expect(pw).toBeTruthy();

    const marriage = (pw.prospects ?? []).find((p: any) => p?.type === "marriage");
    expect(marriage).toBeTruthy();

    const fromHouse = String(marriage.from_house_id || "");
    const toHouse = String(marriage.to_house_id || "");
    expect(fromHouse.length).toBeGreaterThan(0);
    expect(toHouse.length).toBeGreaterThan(0);

    const before = (ctx.preview_state.relationships ?? []).find((e: any) => e.from_id === toHouse && e.to_id === fromHouse) ?? null;

    const next = applyDecisions(s0, {
      labor: { kind: "labor", desired_farmers: s0.manor.farmers, desired_builders: s0.manor.builders },
      sell: { kind: "sell", sell_bushels: 0 },
      obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
      construction: { kind: "construction", action: "none" },
      marriage: { kind: "marriage", action: "none" },
      prospects: { kind: "prospects", actions: [{ prospect_id: marriage.id, action: "accept" }] }
    } as any);

    const rep: any = next.log[next.log.length - 1]?.report;
    const accepted = (rep?.prospects_log ?? []).find((e: any) => e?.kind === "prospect_accepted" && e?.prospect_id === marriage.id);
    expect(accepted).toBeTruthy();
    expect(typeof accepted?.effects_applied?.receipt_line).toBe("string");
    expect(String(accepted.effects_applied.receipt_line)).toContain("Marriage alliance with House");

    const after = (next.relationships ?? []).find((e: any) => e.from_id === toHouse && e.to_id === fromHouse) ?? null;
    expect(after).toBeTruthy();
    if (before) {
      expect(after.allegiance).toBeGreaterThanOrEqual(before.allegiance);
      expect(after.respect).toBeGreaterThanOrEqual(before.respect);
    }
  });
});
