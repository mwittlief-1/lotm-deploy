#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createNewRun } from "../src/sim/state";
import { proposeTurn, applyDecisions } from "../src/sim/turn";
import { decide, canonicalizePolicyId } from "../src/sim/policies";
import { allHouseMemberIds, resolveCurrentHouseHeadId } from "../src/sim/actors";
import { getLivingSpouse } from "../src/sim/kinship";
import type { Person, RunState, TurnDecisions } from "../src/sim/types";

type GateFailure = {
  name: string;
  seed?: string;
  turn?: number;
  detail: string;
};

type GateReport = {
  gate: "uat_gate_v1";
  started_at: string;
  completed_at?: string;
  failed: number;
  passed: number;
  failures: GateFailure[];
  notes: string[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function positiveEnvInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function pushFailure(report: GateReport, failure: GateFailure): void {
  report.failed += 1;
  report.failures.push(failure);
}

function pushPass(report: GateReport, note: string): void {
  report.passed += 1;
  report.notes.push(note);
}

function playerHouseIdForState(state: RunState): string {
  const anyState: any = state as any;
  return typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
}

function livingPlayerChildren(state: RunState): Person[] {
  return state.house.children.filter((c) => c.alive);
}

function runPolicyTurn(state: RunState): RunState {
  const policy = canonicalizePolicyId("prudent-builder");
  const ctx = proposeTurn(state);
  const decisions: TurnDecisions = decide(policy, state, ctx);
  if ((ctx.prospects_window?.prospects?.length ?? 0) > 0) {
    (decisions as any).prospects = { kind: "prospects", actions: [] };
  }
  return applyDecisions(state, decisions);
}

function checkFounderTurnZero(report: GateReport): void {
  const seeds = ["gate_founder_1", "gate_founder_2", "gate_founder_3", "gate_founder_4", "gate_founder_5"];
  let ok = true;
  for (const seed of seeds) {
    const state = createNewRun(seed);
    const ctx = proposeTurn(state);
    if (ctx.preview_state.house.head.id !== "p_head" || !ctx.preview_state.house.head.alive) {
      ok = false;
      pushFailure(report, {
        name: "founder_turn_zero_survival",
        seed,
        turn: 0,
        detail: `expected living founder p_head in preview, got ${ctx.preview_state.house.head.id}`,
      });
    }
  }
  if (ok) pushPass(report, "founder_turn_zero_survival");
}

function checkSuccessionMarriageWindow(report: GateReport): void {
  const state = createNewRun("gate_succession_marriage");
  (state as any).people.p_head.alive = false;
  state.house.head.alive = false;
  const ctx = proposeTurn(state);
  const subjectIds = ctx.marriage_window?.eligible_child_ids ?? [];
  if (ctx.preview_state.house.head.id !== "p_child1" || !subjectIds.includes("p_child1") || (ctx.marriage_window?.offers.length ?? 0) === 0) {
    pushFailure(report, {
      name: "succession_head_marriage_window",
      turn: 0,
      detail: `expected new head p_child1 to receive offers, got head=${ctx.preview_state.house.head.id} subjects=${JSON.stringify(subjectIds)}`,
    });
    return;
  }

  const decisions: any = decide(canonicalizePolicyId("prudent-builder"), state, ctx);
  decisions.marriage = {
    kind: "marriage",
    action: "accept",
    child_id: "p_child1",
    offer_index: 0,
  };
  decisions.prospects = { kind: "prospects", actions: [] };
  const next = applyDecisions(state, decisions);
  if (!next.house.spouse || next.house.spouse_status !== "spouse" || next.house.head.married !== true) {
    pushFailure(report, {
      name: "succession_head_marriage_window",
      turn: 0,
      detail: "expected accepted head marriage to populate spouse slot and married state",
    });
    return;
  }

  pushPass(report, "succession_head_marriage_window");
}

function checkBranchDescendantHeir(report: GateReport): void {
  const state = createNewRun("gate_branch_descendant");
  const anyState: any = state as any;
  const people: Record<string, any> = anyState.people;
  const playerHouseId = playerHouseIdForState(state);
  const houseRec: any = anyState.houses[playerHouseId];

  people.p_child1.alive = false;
  people.p_child2.alive = false;
  const child1 = state.house.children.find((c) => c.id === "p_child1");
  const child2 = state.house.children.find((c) => c.id === "p_child2");
  if (child1) child1.alive = false;
  if (child2) child2.alive = false;

  const anne: Person = {
    id: "p_branch_anne",
    name: "Anne",
    sex: "F",
    age: 23,
    birth_year: 4,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    house_id: playerHouseId,
    residence_house_id: playerHouseId,
  };
  const robert: Person = {
    id: "p_branch_robert",
    name: "Robert",
    sex: "M",
    age: 20,
    birth_year: 7,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    house_id: playerHouseId,
    residence_house_id: playerHouseId,
  };

  people[anne.id] = anne;
  people[robert.id] = robert;
  if (!Array.isArray(houseRec.member_person_ids)) houseRec.member_person_ids = [];
  if (!houseRec.member_person_ids.includes(anne.id)) houseRec.member_person_ids.push(anne.id);
  if (!houseRec.member_person_ids.includes(robert.id)) houseRec.member_person_ids.push(robert.id);
  anyState.kinship_edges.push({ kind: "parent_of", parent_id: "p_child2", child_id: anne.id });
  anyState.kinship_edges.push({ kind: "parent_of", parent_id: "p_child2", child_id: robert.id });

  const ctx = proposeTurn(state);
  if (ctx.preview_state.house.heir_id !== anne.id) {
    pushFailure(report, {
      name: "branch_descendant_heir",
      turn: 0,
      detail: `expected heir ${anne.id}, got ${ctx.preview_state.house.heir_id ?? "null"}`,
    });
    return;
  }

  const courtIds = new Set((ctx.report.court_roster?.rows ?? []).map((row) => row.person_id));
  if (!courtIds.has(anne.id)) {
    pushFailure(report, {
      name: "resident_heir_visible_at_court",
      turn: 0,
      detail: `expected resident heir ${anne.id} in court roster`,
    });
    return;
  }

  pushPass(report, "branch_descendant_heir");
  pushPass(report, "resident_heir_visible_at_court");
}

function checkMultiSeedSmoke(report: GateReport): void {
  const seeds = ["gate_smoke_1", "gate_smoke_2", "gate_smoke_3", "gate_smoke_4", "gate_smoke_5", "gate_smoke_6"]
    .slice(0, positiveEnvInt("UAT_GATE_SMOKE_SEED_LIMIT", 4));
  const turns = positiveEnvInt("UAT_GATE_SMOKE_TURNS", 12);
  let sawPlayerInfant = false;
  let sawWorldInfant = false;

  for (const seed of seeds) {
    let state = createNewRun(seed);
    const lastAges = new Map<string, number>();
    const rejectedInheritanceClaims = new Set<string>();

    for (let i = 0; i < turns && !state.game_over; i++) {
      const ctx = proposeTurn(state);
      const decisions: any = decide(canonicalizePolicyId("prudent-builder"), state, ctx);
      const prospectActions: Array<{ prospect_id: string; action: "accept" | "reject" }> = [];

      for (const prospect of ctx.prospects_window?.prospects ?? []) {
        if (prospect.type === "inheritance_claim" && prospect.subject_person_id) {
          const sig = `inheritance_claim:${prospect.subject_person_id}`;
          if (rejectedInheritanceClaims.has(sig)) {
            pushFailure(report, {
              name: "inheritance_claim_repeat",
              seed,
              turn: state.turn_index,
              detail: `duplicate inheritance claim for ${sig}`,
            });
          }
          rejectedInheritanceClaims.add(sig);
          prospectActions.push({ prospect_id: prospect.id, action: "reject" });
        }
      }
      decisions.prospects = { kind: "prospects", actions: prospectActions };
      state = applyDecisions(state, decisions);

      const pHouseId = playerHouseIdForState(state);
      for (const hid of Object.keys(((state as any).houses ?? {}) as Record<string, unknown>).sort()) {
        const livingMembers = allHouseMemberIds(state, hid).filter((pid) => {
          const p = (state as any).people?.[pid];
          return p && p.alive;
        });
        if (livingMembers.length > 0 && !resolveCurrentHouseHeadId(state, hid)) {
          pushFailure(report, {
            name: "dead_head_with_living_members",
            seed,
            turn: state.turn_index,
            detail: `house ${hid} has living members but no current live head`,
          });
        }
      }

      for (const pid of allHouseMemberIds(state, pHouseId)) {
        const p = (state as any).people?.[pid];
        if (!p || !p.alive) continue;
        const prev = lastAges.get(pid);
        if (prev != null && p.age - prev !== 3) {
          pushFailure(report, {
            name: "player_age_drift",
            seed,
            turn: state.turn_index,
            detail: `${pid} age delta ${p.age - prev}`,
          });
        }
        lastAges.set(pid, p.age);
      }

      const head = state.house.head;
      const headSpouseId = getLivingSpouse(state as any, head.id);
      if (head.married === true && state.house.spouse_status !== "widow" && !headSpouseId) {
        pushFailure(report, {
          name: "head_married_without_spouse",
          seed,
          turn: state.turn_index,
          detail: `head ${head.id} marked married with no living spouse`,
        });
      }

      if (state.locals.liege?.id && state.locals.clergy?.id && state.locals.liege.id === state.locals.clergy.id) {
        pushFailure(report, {
          name: "locals_actor_collapse",
          seed,
          turn: state.turn_index,
          detail: `liege and clergy both resolve to ${state.locals.liege.id}`,
        });
      }

      if (livingPlayerChildren(state).length > 0 && !state.house.heir_id) {
        pushFailure(report, {
          name: "missing_heir_apparent",
          seed,
          turn: state.turn_index,
          detail: `living children=${livingPlayerChildren(state).length} but heir_id is null`,
        });
      }

      if (livingPlayerChildren(state).some((c) => c.age > 0 && c.age < 3)) sawPlayerInfant = true;
      const people: Record<string, Person> = ((state as any).people ?? {}) as Record<string, Person>;
      if (Object.values(people).some((p) => p.alive && p.house_id !== pHouseId && p.age > 0 && p.age < 3)) sawWorldInfant = true;
    }
  }

  if (!sawPlayerInfant) {
    pushFailure(report, {
      name: "player_infant_age_distribution",
      detail: "no player-house infant with age 1 or 2 observed across smoke seeds",
    });
  } else {
    pushPass(report, "player_infant_age_distribution");
  }

  if (!sawWorldInfant) {
    pushFailure(report, {
      name: "world_infant_age_distribution",
      detail: "no world infant with age 1 or 2 observed across smoke seeds",
    });
  } else {
    pushPass(report, "world_infant_age_distribution");
  }

  if (!report.failures.some((f) => f.name === "dead_head_with_living_members")) pushPass(report, "dead_head_with_living_members");
  if (!report.failures.some((f) => f.name === "player_age_drift")) pushPass(report, "player_age_drift");
  if (!report.failures.some((f) => f.name === "head_married_without_spouse")) pushPass(report, "head_married_without_spouse");
  if (!report.failures.some((f) => f.name === "locals_actor_collapse")) pushPass(report, "locals_actor_collapse");
  if (!report.failures.some((f) => f.name === "missing_heir_apparent")) pushPass(report, "missing_heir_apparent");
  if (!report.failures.some((f) => f.name === "inheritance_claim_repeat")) pushPass(report, "inheritance_claim_repeat");
}

function main(): void {
  const report: GateReport = {
    gate: "uat_gate_v1",
    started_at: nowIso(),
    failed: 0,
    passed: 0,
    failures: [],
    notes: [],
  };

  checkFounderTurnZero(report);
  checkSuccessionMarriageWindow(report);
  checkBranchDescendantHeir(report);
  checkMultiSeedSmoke(report);

  report.completed_at = nowIso();

  const outDir = path.resolve("qa_artifacts");
  ensureDir(outDir);
  const outPath = path.join(outDir, "uat_gate.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  if (report.failed > 0) {
    console.error(`UAT gate failed with ${report.failed} failure(s). See ${outPath}`);
    process.exit(1);
  }

  console.log(`UAT gate passed. Wrote ${outPath}`);
}

main();
