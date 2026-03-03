import { describe, expect, it } from "vitest";

import { createNewRun } from "../src/sim/state";
import { applyDecisions, createDefaultDecisions, proposeTurn } from "../src/sim/turn";

function setupSingleMarriageCandidate(seed: string | number) {
  const state: any = createNewRun(seed);
  state.manor.coin = 250;

  const anyState: any = state as any;
  const playerHouseId: string = anyState.player_house_id ?? "h_player";

  const child = state.house.children[0];
  child.age = 17;
  child.sex = "M";
  child.alive = true;
  child.married = false;
  for (let i = 1; i < state.house.children.length; i++) {
    state.house.children[i].age = 10;
    state.house.children[i].married = false;
    state.house.children[i].alive = true;
  }

  const extHeadId = "p_pr1_ext_head";
  const extBrideId = "p_pr1_ext_bride";
  const extHouseId = "h_noble_pr1_ext";

  anyState.people = anyState.people ?? {};
  anyState.people[extHeadId] = {
    id: extHeadId,
    name: "Odo Ext",
    sex: "M",
    age: 40,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
  };
  anyState.people[extBrideId] = {
    id: extBrideId,
    name: "Ada Ext",
    sex: "F",
    age: 18,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
  };

  const playerHouse = anyState.houses[playerHouseId];
  anyState.houses = {
    [playerHouseId]: playerHouse,
    [extHouseId]: {
      id: extHouseId,
      name: "Ext",
      tier: "Knight",
      holdings_count: 1,
      head_id: extHeadId,
      spouse_id: null,
      child_ids: [extBrideId]
    }
  };

  return { state, subjectId: child.id, spouseId: extBrideId };
}

function marriageProspect(ctx: any): any {
  return (ctx?.prospects_window?.prospects ?? []).find((p: any) => p?.type === "marriage") ?? null;
}

describe("v0.2.9 PR1 marriage correctness", () => {
  it("reject writes non-empty effects_applied receipt", () => {
    const { state } = setupSingleMarriageCandidate("TEST_PR1_REJECT_RECEIPT");
    const ctx = proposeTurn(state);
    const m = marriageProspect(ctx);
    expect(m).toBeTruthy();

    const decisions: any = createDefaultDecisions();
    decisions.prospects = { kind: "prospects", actions: [{ prospect_id: m.id, action: "reject", prospect_i: 0 }] };

    const next = applyDecisions(state, decisions);
    const entry = (next.log?.[next.log.length - 1] as any)?.report?.prospects_log?.find((e: any) => e.kind === "prospect_rejected");
    expect(entry).toBeTruthy();
    expect(entry.effects_applied).toBeTruthy();
    expect(Array.isArray(entry.effects_applied.relationship_deltas)).toBe(true);
    expect(entry.effects_applied.relationship_deltas.length).toBeGreaterThan(0);
    expect(entry.effects_applied.cooldown_turns).toBe(8);
  });

  it("cooldown blocks re-offer for N turns", () => {
    let { state } = setupSingleMarriageCandidate("TEST_PR1_COOLDOWN");
    let ctx = proposeTurn(state);
    const m = marriageProspect(ctx);
    expect(m).toBeTruthy();
    const rejectedSpouseId: string = m.spouse_person_id;

    const reject: any = createDefaultDecisions();
    reject.prospects = { kind: "prospects", actions: [{ prospect_id: m.id, action: "reject", prospect_i: 0 }] };
    state = applyDecisions(state, reject);

    for (let i = 0; i < 8; i++) {
      ctx = proposeTurn(state);
      const offered = (ctx?.prospects_window?.prospects ?? [])
        .filter((p: any) => p?.type === "marriage")
        .some((p: any) => p.spouse_person_id === rejectedSpouseId);
      expect(offered).toBe(false);
      state = applyDecisions(state, createDefaultDecisions());
    }
  });

  it("accept sets married=true on both and writes spouse_of", () => {
    const { state, subjectId } = setupSingleMarriageCandidate("TEST_PR1_ACCEPT_MARRIED");
    const ctx = proposeTurn(state);
    const m = marriageProspect(ctx);
    expect(m).toBeTruthy();
    const spouseId: string = m.spouse_person_id;

    const accept: any = createDefaultDecisions();
    accept.prospects = { kind: "prospects", actions: [{ prospect_id: m.id, action: "accept", prospect_i: 0 }] };

    const next: any = applyDecisions(state, accept);
    expect(next.people?.[subjectId]?.married).toBe(true);
    expect(next.people?.[spouseId]?.married).toBe(true);

    const spouseEdge = (next.kinship_edges ?? []).find(
      (e: any) => e?.kind === "spouse_of" && ((e.a_id === subjectId && e.b_id === spouseId) || (e.a_id === spouseId && e.b_id === subjectId))
    );
    expect(spouseEdge).toBeTruthy();
  });

  it("once married, spouse is not offered again", () => {
    let { state } = setupSingleMarriageCandidate("TEST_PR1_EXCLUSIVITY");
    const ctx = proposeTurn(state);
    const m = marriageProspect(ctx);
    expect(m).toBeTruthy();
    const spouseId: string = m.spouse_person_id;

    const accept: any = createDefaultDecisions();
    accept.prospects = { kind: "prospects", actions: [{ prospect_id: m.id, action: "accept", prospect_i: 0 }] };
    state = applyDecisions(state, accept);

    const ctx2 = proposeTurn(state);
    const offeredAgain = (ctx2?.prospects_window?.prospects ?? [])
      .filter((p: any) => p?.type === "marriage")
      .some((p: any) => p.spouse_person_id === spouseId);
    expect(offeredAgain).toBe(false);
  });

  it("report always includes prospects_log array", () => {
    const state = createNewRun("TEST_PR1_REPORT_ARRAY");
    const ctx = proposeTurn(state);
    expect(Array.isArray((ctx.report as any).prospects_log)).toBe(true);

    const next = applyDecisions(state, createDefaultDecisions());
    const last = next.log?.[next.log.length - 1] as any;
    expect(Array.isArray(last?.report?.prospects_log)).toBe(true);
  });
});
