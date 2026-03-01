import { describe, expect, it } from "vitest";

import { applyDecisions, createNewRun, proposeTurn } from "../src/sim";

function defaultDecisions(state: any, prospectActions: any[] = []): any {
  return {
    labor: { kind: "labor", desired_farmers: state.manor.farmers, desired_builders: state.manor.builders },
    sell: { kind: "sell", sell_bushels: 0 },
    obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
    construction: { kind: "construction", action: "none" },
    marriage: { kind: "marriage", action: "none" },
    prospects: { kind: "prospects", actions: prospectActions }
  };
}

function blockExternalMarriagePool(state: any): void {
  const houses = state.houses ?? {};
  const people = state.people ?? {};
  const playerHouseId = state.player_house_id ?? "h_player";
  for (const hid of Object.keys(houses)) {
    if (hid === playerHouseId) continue;
    const h: any = houses[hid];
    const ids = [h?.head_id, h?.spouse_id, ...(Array.isArray(h?.child_ids) ? h.child_ids : [])].filter(Boolean);
    for (const id of ids) {
      if (!people[id]) continue;
      people[id].married = true;
    }
  }
}

function injectExternalHouse(state: any, opts: { houseId: string; head: any; spouse?: any; children?: any[] }) {
  state.people = state.people ?? {};
  state.houses = state.houses ?? {};

  state.people[opts.head.id] = opts.head;
  if (opts.spouse) state.people[opts.spouse.id] = opts.spouse;
  for (const c of opts.children ?? []) state.people[c.id] = c;

  state.houses[opts.houseId] = {
    id: opts.houseId,
    name: opts.houseId,
    tier: "Knight",
    holdings_count: 1,
    head_id: opts.head.id,
    spouse_id: opts.spouse?.id ?? null,
    child_ids: (opts.children ?? []).map((c) => c.id)
  };
}

describe("v0.2.9 UAT fixes", () => {
  it("marriage reject is sticky for cooldown turns and returns after expiry", () => {
    let s: any = createNewRun("TEST_v029_reject_sticky");
    blockExternalMarriagePool(s);

    const subject = s.house.children[0];
    subject.sex = "M";
    subject.age = 18;
    subject.alive = true;
    subject.married = false;

    injectExternalHouse(s, {
      houseId: "h_noble_00_reject",
      head: { id: "p_ext_reject_head", name: "Head", sex: "M", age: 46, alive: true, married: true, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } },
      children: [
        { id: "p_ext_reject_spouse", name: "Spouse", sex: "F", age: 19, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } }
      ]
    });

    const ctx0: any = proposeTurn(s);
    const marriage0 = ctx0.prospects_window?.prospects?.find((p: any) => p.type === "marriage");
    expect(marriage0).toBeTruthy();

    s = applyDecisions(s, defaultDecisions(s, [{ prospect_id: marriage0.id, action: "reject" }]));

    for (let i = 0; i < 7; i++) {
      const ctx: any = proposeTurn(s);
      const marriage = ctx.prospects_window?.prospects?.find((p: any) => p.type === "marriage") ?? null;
      expect(marriage).toBeNull();
      s = applyDecisions(s, defaultDecisions(s));
    }

    const cooldowns = s.flags?._marriage_reject_cooldowns ?? {};
    expect(cooldowns[`${subject.id}::p_ext_reject_spouse`]).toBeGreaterThanOrEqual(s.turn_index);
  });

  it("reject writes relationship delta receipt in prospects log", () => {
    let s: any = createNewRun("TEST_v029_reject_receipt");
    blockExternalMarriagePool(s);
    const subject = s.house.children[0];
    subject.sex = "M";
    subject.age = 18;
    subject.alive = true;
    subject.married = false;

    injectExternalHouse(s, {
      houseId: "h_noble_00_receipt",
      head: { id: "p_ext_receipt_head", name: "Head", sex: "M", age: 44, alive: true, married: true, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } },
      children: [
        { id: "p_ext_receipt_spouse", name: "Spouse", sex: "F", age: 20, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } }
      ]
    });

    const ctx0: any = proposeTurn(s);
    const marriage0 = ctx0.prospects_window.prospects.find((p: any) => p.type === "marriage");
    s = applyDecisions(s, defaultDecisions(s, [{ prospect_id: marriage0.id, action: "reject" }]));

    const latest = s.log[s.log.length - 1]?.report?.prospects_log ?? [];
    const rejected = latest.find((e: any) => e.kind === "prospect_rejected" && e.prospect_id === marriage0.id);
    expect(rejected).toBeTruthy();
    expect(Array.isArray(rejected.effects_applied?.relationship_deltas)).toBe(true);
    expect(rejected.effects_applied.relationship_deltas.length).toBeGreaterThan(0);
  });

  it("spouse selection never uses external house head as spouse candidate", () => {
    const s: any = createNewRun("TEST_v029_no_head_spouse");
    blockExternalMarriagePool(s);
    const subject = s.house.children[0];
    subject.sex = "M";
    subject.age = 18;
    subject.alive = true;
    subject.married = false;

    injectExternalHouse(s, {
      houseId: "h_noble_00_head_blocked",
      head: { id: "p_ext_head_candidate", name: "Head Candidate", sex: "F", age: 22, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } },
      children: [
        { id: "p_ext_valid_child", name: "Valid Child", sex: "F", age: 18, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } }
      ]
    });

    const ctx: any = proposeTurn(s);
    const marriage = ctx.prospects_window?.prospects?.find((p: any) => p.type === "marriage");
    expect(marriage).toBeTruthy();
    expect(marriage.spouse_person_id).toBe("p_ext_valid_child");
    expect(marriage.spouse_person_id).not.toBe("p_ext_head_candidate");
  });

  it("birth age offsets break strict multiples-of-3 age buckets", () => {
    let s: any = createNewRun("TEST_v029_age_offsets");
    s.house.spouse.age = 22;
    s.house.spouse.traits.fertility = 5;
    s.flags._tuning.fertility_mult = 8;

    for (let i = 0; i < 12; i++) s = applyDecisions(s, defaultDecisions(s));

    const remainders = s.house.children.map((c: any) => ((c.age % 3) + 3) % 3);
    expect(remainders.some((r: number) => r !== 0)).toBe(true);
  });

  it("maternal age 45+ yields zero births", () => {
    let s: any = createNewRun("TEST_v029_maternal_stop");
    s.house.spouse.age = 45;
    s.house.spouse.traits.fertility = 5;
    s.flags._tuning.fertility_mult = 20;

    const before = s.house.children.length;
    for (let i = 0; i < 8; i++) s = applyDecisions(s, defaultDecisions(s));
    expect(s.house.children.length).toBe(before);
  });

  it("court consumption applies lower child weight than adult", () => {
    const s: any = createNewRun("TEST_v029_consumption_weight");
    s.house.children = [
      { id: "p_child_weight", name: "Child", sex: "M", age: 8, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } }
    ];

    const ctx: any = proposeTurn(s);
    const b = ctx.report.court_consumption_breakdown;
    expect(b).toBeTruthy();
    expect(b.children_count).toBeGreaterThan(0);
    expect(b.adults_count).toBeGreaterThan(0);
    expect(b.children_rate_bushels_per_turn / b.children_count).toBeLessThan(b.adults_rate_bushels_per_turn / b.adults_count);
  });
});
