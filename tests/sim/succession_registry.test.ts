import { describe, expect, it } from "vitest";

import {
  buildInheritanceClaimProspect,
  buildClaimantRegistry,
  buildSuccessionLine,
  CLAIMANT_REGISTRY_SCHEMA_VERSION,
  INHERITANCE_CLAIM_PROSPECT_METADATA_SCHEMA_VERSION,
  inheritanceClaimProspectSignature,
  inheritanceClaimProspectSignatureForSubject,
  SUCCESSION_LINE_SCHEMA_VERSION,
} from "../../src/sim/domains/people/successionRegistry";
import { buildProspectsWindowPhase } from "../../src/sim/phases/phase_prospects";
import { computeHeirId } from "../../src/sim/phases/phase_succession";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, sex: "M" | "F", age: number, opts?: Partial<Person>): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    ...(opts ?? {}),
  };
}

function mkBaseState(): RunState {
  const head = mkPerson("p_head", "M", 48, { married: true });
  const spouse = mkPerson("p_spouse", "F", 44, { married: true });
  const sonOld = mkPerson("p_son_old", "M", 20);
  const sonYoung = mkPerson("p_son_young", "M", 17);
  const daughter = mkPerson("p_daughter", "F", 16);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 4,
    manor: {
      population: 20,
      farmers: 10,
      builders: 0,
      bushels_stored: 50,
      meat_stores: 0,
      coin: 10,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null,
      },
    },
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [sonOld, sonYoung, daughter],
      energy: { max: 3, available: 3 },
      heir_id: sonOld.id,
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [sonOld.id]: sonOld,
      [sonYoung.id]: sonYoung,
      [daughter.id]: daughter,
      [liege.id]: liege,
      [clergy.id]: clergy,
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [sonOld.id, sonYoung.id, daughter.id],
        member_person_ids: [head.id, spouse.id, sonOld.id, sonYoung.id, daughter.id],
      },
    },
    player_house_id: "h_player",
    kinship_edges: [
      { kind: "spouse_of", a_id: head.id, b_id: spouse.id },
      { kind: "parent_of", parent_id: head.id, child_id: sonOld.id },
      { kind: "parent_of", parent_id: spouse.id, child_id: sonOld.id },
      { kind: "parent_of", parent_id: head.id, child_id: sonYoung.id },
      { kind: "parent_of", parent_id: spouse.id, child_id: sonYoung.id },
      { kind: "parent_of", parent_id: head.id, child_id: daughter.id },
      { kind: "parent_of", parent_id: spouse.id, child_id: daughter.id },
    ],
    game_over: null,
  };
}

describe("succession registry schema", () => {
  it("builds a deterministic male-preference descendant line", () => {
    const state = mkBaseState();
    const grandson = mkPerson("p_grandson", "M", 2);
    state.people![grandson.id] = grandson;
    state.house.children[0]!.age = 20;
    state.kinship_edges!.push({ kind: "parent_of", parent_id: "p_son_old", child_id: grandson.id });

    const line = buildSuccessionLine(state);

    expect(line.schema_version).toBe(SUCCESSION_LINE_SCHEMA_VERSION);
    expect(line.entries.map((entry) => entry.person_id)).toEqual([
      "p_son_old",
      "p_grandson",
      "p_son_young",
      "p_daughter",
    ]);
    expect(line.entries.map((entry) => entry.relation_group)).toEqual([
      "son_branch",
      "son_branch",
      "son_branch",
      "daughter_branch",
    ]);
  });

  it("mirrors the current collateral male-line fallback order", () => {
    const state = mkBaseState();
    for (const child of state.house.children) child.alive = false;

    const father = mkPerson("p_father", "M", 70);
    const brother = mkPerson("p_brother", "M", 28);
    const nephew = mkPerson("p_nephew", "M", 16);

    state.people![father.id] = father;
    state.people![brother.id] = brother;
    state.people![nephew.id] = nephew;
    state.kinship_edges!.push({ kind: "parent_of", parent_id: father.id, child_id: state.house.head.id });
    state.kinship_edges!.push({ kind: "parent_of", parent_id: father.id, child_id: brother.id });
    state.kinship_edges!.push({ kind: "parent_of", parent_id: brother.id, child_id: nephew.id });

    const line = buildSuccessionLine(state, { min_age: 15 });

    expect(line.entries.map((entry) => entry.person_id)).toEqual(["p_brother", "p_nephew"]);
    expect(line.entries.every((entry) => entry.basis_kind === "collateral_male_line")).toBe(true);
    expect(line.entries[0]?.ancestor_id).toBe("p_father");
  });

  it("records current-heir blocking and adult positions in the claimant registry", () => {
    const state = mkBaseState();
    state.house.children[1]!.age = 12;

    const registry = buildClaimantRegistry(state, { limit: 4 });

    expect(registry.schema_version).toBe(CLAIMANT_REGISTRY_SCHEMA_VERSION);
    expect(registry.current_heir_id).toBe("p_son_old");
    expect(registry.adult_successor_id).toBe("p_son_old");
    expect(registry.claim_window_open).toBe(false);
    expect(registry.entries[0]).toMatchObject({
      claimant_person_id: "p_son_old",
      succession_position: 1,
      adult_succession_position: 1,
      blocked_by_current_heir: false,
      adult_eligible: true,
    });
    expect(registry.entries.find((entry) => entry.claimant_person_id === "p_son_young")).toMatchObject({
      succession_position: 2,
      adult_succession_position: null,
      blocked_by_current_heir: true,
      adult_eligible: false,
    });
  });

  it("falls back to adult household members when no kinship line exists", () => {
    const state = mkBaseState();
    state.house.heir_id = null;
    state.house.children = [];
    state.kinship_edges = [{ kind: "spouse_of", a_id: state.house.head.id, b_id: state.house.spouse!.id }];

    const cousin = mkPerson("p_cousin", "M", 26);
    state.people![cousin.id] = cousin;
    state.houses!.h_player.member_person_ids.push(cousin.id);

    const line = buildSuccessionLine(state);
    const registry = buildClaimantRegistry(state);

    expect(line.entries).toEqual([]);
    expect(registry.claim_window_open).toBe(true);
    expect(registry.adult_successor_id).toBe("p_spouse");
    expect(registry.entries[0]).toMatchObject({
      claimant_person_id: "p_spouse",
      succession_position: null,
      adult_succession_position: null,
      basis_kind: "household_member_fallback",
      relation_group: "fallback_household",
    });
  });

  it("builds the current placeholder inheritance claim prospect from the domain seam", () => {
    const state = mkBaseState();
    state.house.heir_id = null;
    state.house.children = [];
    state.kinship_edges = [{ kind: "spouse_of", a_id: state.house.head.id, b_id: state.house.spouse!.id }];
    state.houses!.h_player.child_ids = [];
    state.houses!.h_player.member_person_ids = [state.house.head.id, state.house.spouse!.id];

    const cousinA = mkPerson("p_cousin_a", "M", 28);
    const cousinB = mkPerson("p_cousin_b", "F", 25);
    const cousinC = mkPerson("p_cousin_c", "M", 22);
    state.people![cousinA.id] = cousinA;
    state.people![cousinB.id] = cousinB;
    state.people![cousinC.id] = cousinC;
    state.houses!.h_player.member_person_ids.push(cousinA.id, cousinB.id, cousinC.id);

    const prospect = buildInheritanceClaimProspect(state, {
      prospect_id: "pros_inheritance_claim_test",
      from_house_id: "h_sponsor",
      to_house_id: "h_player",
      expires_turn: state.turn_index + 2,
      heir_id: null,
      preview_limit: 2,
    });

    expect(prospect).toMatchObject({
      id: "pros_inheritance_claim_test",
      type: "inheritance_claim",
      from_house_id: "h_sponsor",
      to_house_id: "h_player",
      subject_person_id: "p_head",
      summary: "Inheritance claim",
      uncertainty: "possible",
      expires_turn: state.turn_index + 2,
      actions: ["accept", "reject"],
      claim_metadata_schema_version: INHERITANCE_CLAIM_PROSPECT_METADATA_SCHEMA_VERSION,
      claimant_person_id: "p_spouse",
      claimant_succession_position: null,
      claimant_adult_succession_position: null,
      claimant_basis_kind: "household_member_fallback",
      claimant_relation_group: "fallback_household",
      target_house_id: "h_player",
      target_head_person_id: "p_head",
      target_current_heir_id: null,
      target_adult_successor_id: "p_spouse",
      claim_window_open: true,
      target_line_overflow_count: 2,
    });
    expect(prospect?.requirements).toEqual([]);
    expect((prospect as any)?.target_line_entries).toEqual([
      {
        claimant_person_id: "p_spouse",
        succession_position: null,
        adult_succession_position: null,
        basis_kind: "household_member_fallback",
        relation_group: "fallback_household",
        blocked_by_current_heir: false,
        adult_eligible: true,
      },
      {
        claimant_person_id: "p_cousin_a",
        succession_position: null,
        adult_succession_position: null,
        basis_kind: "household_member_fallback",
        relation_group: "fallback_household",
        blocked_by_current_heir: false,
        adult_eligible: true,
      }
    ]);
    expect(prospect?.predicted_effects.flags_set).toEqual(["inheritance_claim_active"]);
  });

  it("routes bounded inheritance claim metadata through the prospects window without adding court-trial mechanics", () => {
    const state = mkBaseState();
    state.house.heir_id = null;
    state.house.children = [];
    state.kinship_edges = [{ kind: "spouse_of", a_id: state.house.head.id, b_id: state.house.spouse!.id }];
    state.houses!.h_player.child_ids = [];
    state.houses!.h_player.member_person_ids = [state.house.head.id, state.house.spouse!.id];

    const prospectLog: any[] = [];
    const window = buildProspectsWindowPhase(state, null, prospectLog, { computeHeirId });
    const claim = window.prospects.find((entry) => entry.type === "inheritance_claim") as any;

    expect(claim).toMatchObject({
      type: "inheritance_claim",
      subject_person_id: "p_head",
      claimant_person_id: "p_spouse",
      claim_window_open: true,
      target_current_heir_id: null,
      target_adult_successor_id: "p_spouse",
      summary: "Inheritance claim",
      requirements: [],
      actions: ["accept", "reject"],
      costs: {},
      predicted_effects: { flags_set: ["inheritance_claim_active"] }
    });
    expect(Array.isArray(claim?.predicted_effects?.relationship_deltas)).toBe(false);
    expect(window.prospects.filter((entry) => entry.type === "inheritance_claim")).toHaveLength(1);
  });

  it("keeps inheritance claim signatures deterministic and head-scoped", () => {
    const state = mkBaseState();

    expect(inheritanceClaimProspectSignature(state)).toBe("inheritance_claim:p_head");
    expect(inheritanceClaimProspectSignatureForSubject("p_other")).toBe("inheritance_claim:p_other");
  });
});
