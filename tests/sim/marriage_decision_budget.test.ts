import { describe, expect, it } from "vitest";

import { buildCourtDelegationRegistry } from "../../src/sim/domains/court/delegationRegistry";
import {
  chargeCourtDecisionBudget,
  ensureCourtDecisionBudgetRegistry
} from "../../src/sim/domains/court/decisionBudget";
import { applyMarriageDecision } from "../../src/sim/domains/people/marriage";
import { buildMarriageWorkflowView } from "../../src/sim/domains/people/marriageWorkflowView";
import { recordPersistedOutboundMarriageOfferEntry } from "../../src/sim/domains/people/marriageOfferRegistry";
import type { MarriageWindow, Person, RunState } from "../../src/sim/types";
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
    ...(opts ?? {})
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 40, { married: true });
  const spouse = mkPerson("p_spouse", "F", 38, { married: true });
  const child = mkPerson("p_child_1", "M", 18);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);
  const candidate = mkPerson("p_cand_a", "F", 19);
  const extHead = mkPerson("p_ext_head", "M", 46);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 9,
    manor: {
      population: 24,
      farmers: 12,
      builders: 0,
      bushels_stored: 80,
      meat_stores: 6,
      coin: 12,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null
      }
    } as any,
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [child],
      energy: { max: 3, available: 3 },
      heir_id: child.id
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [child.id]: child,
      [liege.id]: liege,
      [clergy.id]: clergy,
      [candidate.id]: candidate,
      [extHead.id]: extHead
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [child.id],
        member_person_ids: [head.id, spouse.id, child.id]
      },
      h_ext_01: {
        id: "h_ext_01",
        name: "Ashford",
        tier: "Baron",
        head_id: extHead.id,
        spouse_id: null,
        child_ids: [candidate.id],
        member_person_ids: [extHead.id, candidate.id]
      }
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }]
  } as any;
}

function mkMarriageWindow(): MarriageWindow {
  return {
    eligible_child_ids: ["p_child_1"],
    offers: [
      {
        house_person_id: "p_cand_a",
        house_label: "House Ashford",
        dowry_coin_net: 3,
        relationship_delta: { respect: 6, allegiance: 4, threat: -2 },
        liege_delta: { respect: 1, threat: -1 },
        risk_tags: ["prestige", "profitable"]
      }
    ]
  };
}

describe("marriage decision budget costs", () => {
  it("charges more budget for scouting than for inbound acceptance", () => {
    const scoutState = mkState();
    const scoutNotes: string[] = [];

    applyMarriageDecision(
      scoutState,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "scout" } } as any,
      scoutNotes
    );

    expect(scoutState.house.energy.available).toBe(2);
    expect((scoutState.flags as any)?._mods?.marriage_quality).toBe(1.05);
    expect((scoutState as any).outbound_marriage_scouting_registry).toMatchObject({
      schema_version: "outbound_marriage_scouting_registry_v1",
      subject_person_id: "p_child_1",
      shown_candidate_ids: ["p_cand_a"],
    });
    expect(scoutNotes).toEqual(["Scouted prospects; next marriage window slightly improved."]);
    expect(ensureCourtDecisionBudgetRegistry(scoutState)).toMatchObject({
      spent: 2,
      remaining: 4,
      spent_by_action: {
        marriage_inbound: 0,
        marriage_scout: 2
      }
    });

    const acceptState = mkState();
    const acceptNotes: string[] = [];

    applyMarriageDecision(
      acceptState,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "accept", child_id: "p_child_1", offer_index: 0 } } as any,
      acceptNotes
    );

    expect(acceptState.house.energy.available).toBe(2);
    expect(acceptState.manor.coin).toBe(15);
    expect(acceptState.house.children[0]?.married).toBe(true);
    expect(acceptState.people?.p_cand_a?.married).toBe(true);
    expect(acceptNotes).toEqual(["Marriage accepted for p_child_1: dowry +3 coin."]);
    expect(ensureCourtDecisionBudgetRegistry(acceptState)).toMatchObject({
      spent: 1,
      remaining: 5,
      spent_by_action: {
        marriage_inbound: 1,
        marriage_scout: 0
      }
    });
  });

  it("charges inbound processing budget when rejecting all offers", () => {
    const state = mkState();
    const notes: string[] = [];

    applyMarriageDecision(
      state,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "reject_all" } } as any,
      notes
    );

    expect(state.house.energy.available).toBe(2);
    expect(state.manor.unrest).toBe(1);
    expect(notes).toEqual(["Rejected all offers; slight social friction (+1 unrest)."]);
    expect(ensureCourtDecisionBudgetRegistry(state)).toMatchObject({
      spent: 1,
      remaining: 5,
      spent_by_action: {
        marriage_inbound: 1,
        marriage_scout: 0
      }
    });
  });

  it("blocks scouting when one decision remains but still allows inbound acceptance", () => {
    const scoutBlocked = mkState();
    chargeCourtDecisionBudget(scoutBlocked, "gift_liege", 5);
    const scoutNotes: string[] = [];

    applyMarriageDecision(
      scoutBlocked,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "scout" } } as any,
      scoutNotes
    );

    expect(scoutBlocked.house.energy.available).toBe(3);
    expect(scoutBlocked.manor.coin).toBe(12);
    expect((scoutBlocked.flags as any)?._mods?.marriage_quality).toBeUndefined();
    expect(scoutNotes).toEqual(["No court budget for marriage scouting."]);
    expect(ensureCourtDecisionBudgetRegistry(scoutBlocked)).toMatchObject({
      spent: 5,
      remaining: 1,
      spent_by_action: {
        gift_liege: 5,
        marriage_inbound: 0,
        marriage_scout: 0
      }
    });

    const acceptAllowed = mkState();
    chargeCourtDecisionBudget(acceptAllowed, "gift_liege", 5);
    const acceptNotes: string[] = [];

    applyMarriageDecision(
      acceptAllowed,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "accept", child_id: "p_child_1", offer_index: 0 } } as any,
      acceptNotes
    );

    expect(acceptAllowed.house.energy.available).toBe(2);
    expect(acceptAllowed.manor.coin).toBe(15);
    expect(acceptAllowed.house.children[0]?.married).toBe(true);
    expect(acceptNotes).toEqual(["Marriage accepted for p_child_1: dowry +3 coin."]);
    expect(ensureCourtDecisionBudgetRegistry(acceptAllowed)).toMatchObject({
      spent: 6,
      remaining: 0,
      exhausted: true,
      spent_by_action: {
        gift_liege: 5,
        marriage_inbound: 1,
        marriage_scout: 0
      }
    });
  });

  it("lets delegated scouting use one remaining court decision", () => {
    const state = mkState();
    chargeCourtDecisionBudget(state, "gift_liege", 5);
    (state.house as any).court_delegation_registry = buildCourtDelegationRegistry([
      {
        action: "marriage_scout",
        delegated: true,
        effect: {
          budget_cost_delta: -1,
          budget_cost_floor: 0,
        },
      },
    ]);
    const notes: string[] = [];

    applyMarriageDecision(
      state,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "scout" } } as any,
      notes
    );

    expect(state.house.energy.available).toBe(2);
    expect(state.manor.coin).toBe(11);
    expect((state.flags as any)?._mods?.marriage_quality).toBe(1.05);
    expect(notes).toEqual([
      "Delegated scouting used 1 court decision.",
      "Scouted prospects; next marriage window slightly improved.",
    ]);
    expect(ensureCourtDecisionBudgetRegistry(state)).toMatchObject({
      spent: 6,
      remaining: 0,
      exhausted: true,
      spent_by_action: {
        gift_liege: 5,
        marriage_inbound: 0,
        marriage_scout: 1,
      },
    });
  });

  it("keeps delegated scouting above zero court decisions", () => {
    const state = mkState();
    chargeCourtDecisionBudget(state, "gift_liege", 5);
    (state.house as any).court_delegation_registry = buildCourtDelegationRegistry([
      {
        action: "marriage_scout",
        delegated: true,
        effect: {
          budget_cost_delta: -2,
          budget_cost_floor: 0,
        },
      },
    ]);
    const notes: string[] = [];

    applyMarriageDecision(
      state,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "scout" } } as any,
      notes
    );

    expect(notes).toEqual([
      "Delegated scouting used 1 court decision.",
      "Scouted prospects; next marriage window slightly improved.",
    ]);
    expect(ensureCourtDecisionBudgetRegistry(state)).toMatchObject({
      spent: 6,
      remaining: 0,
      exhausted: true,
      spent_by_action: {
        gift_liege: 5,
        marriage_inbound: 0,
        marriage_scout: 1,
      },
    });
  });

  it("builds marriage_workflow_view_v1 with grouped inbound and outbound state", () => {
    const state = mkState();
    const marriageWindow = mkMarriageWindow();
    const notes: string[] = [];

    applyMarriageDecision(
      state,
      { marriage_window: marriageWindow } as any,
      { marriage: { kind: "marriage", action: "scout" } } as any,
      notes
    );

    recordPersistedOutboundMarriageOfferEntry(state, {
      candidate_house_id: "h_ext_01",
      candidate_house_label: "House Ashford",
      candidate_person_id: "p_cand_a",
      created_turn: state.turn_index,
      direction: "outbound",
      dowry_coin_net: 0,
      relationship_delta: { respect: 0, allegiance: 0, threat: 0 },
      risk_tags: [],
      state: "pending",
      subject_person_id: "p_child_1"
    });

    const workflowView = buildMarriageWorkflowView(state, {
      marriage_window: marriageWindow,
      outbound_marriage_scouting_registry: (state as any).outbound_marriage_scouting_registry
    });

    expect(workflowView).toMatchObject({
      schema_version: "marriage_workflow_view_v1",
      subject_person_ids: ["p_child_1"],
      subjects_by_person_id: {
        p_child_1: {
          schema_version: "marriage_workflow_subject_v1",
          inbound_offer_count: 1,
          subject: {
            person_id: "p_child_1",
            parent_refs: expect.any(Array)
          },
          inbound_offers: [
            expect.objectContaining({
              schema_version: "marriage_workflow_inbound_offer_v1",
              offer_key: "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a",
              state: "received",
              candidate: expect.objectContaining({
                person_id: "p_cand_a",
                house_id: "h_ext_01"
              }),
              expected_effects: expect.objectContaining({
                coin_delta: 3
              }),
              decision_payloads: {
                accept: expect.objectContaining({
                  schema_version: "marriage_workflow_decision_payload_v1",
                  action: "accept_inbound_offer",
                  offer_key: "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a",
                  payload: expect.objectContaining({
                    kind: "marriage",
                    action: "accept",
                    child_id: "p_child_1",
                    offer_index: 0,
                    offer_key: "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a"
                  })
                }),
                reject: expect.objectContaining({
                  schema_version: "marriage_workflow_decision_payload_v1",
                  action: "reject_inbound_offers",
                  payload: expect.objectContaining({
                    kind: "marriage",
                    action: "reject_all",
                    offer_keys: ["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a"]
                  })
                })
              },
              resolution_outcomes: {
                accept: expect.objectContaining({
                  schema_version: "marriage_workflow_resolution_outcome_v1",
                  status: "accepted",
                  effect: "relationship_and_settlement"
                }),
                reject: expect.objectContaining({
                  schema_version: "marriage_workflow_resolution_outcome_v1",
                  status: "rejected",
                  effect: "state_only",
                  expected_effects: null
                })
              }
            })
          ],
          outbound_scouting: expect.objectContaining({
            schema_version: "marriage_workflow_outbound_scouting_v1",
            scouting_status: "available",
            candidate_ids: ["p_cand_a"],
            shown_candidate_ids: ["p_cand_a"],
            held_out_candidate_ids: [],
            shown_candidate_count: 1,
            featured_candidate: expect.objectContaining({
              person_id: "p_cand_a"
            }),
            search_results: [
              expect.objectContaining({
                schema_version: "marriage_workflow_outbound_search_result_v1",
                candidate: expect.objectContaining({
                  person_id: "p_cand_a"
                }),
                rank_group: "shown",
                rank_index: 1,
                match_ready: true
              })
            ],
            decision_payload: expect.objectContaining({
              schema_version: "marriage_workflow_decision_payload_v1",
              action: "scout_outbound_candidates",
              payload: {
                kind: "marriage",
                action: "scout",
                subject_person_id: "p_child_1"
              }
            }),
            resolution_outcome: expect.objectContaining({
              schema_version: "marriage_workflow_resolution_outcome_v1",
              action: "scout_outbound_candidates",
              status: "available"
            })
          }),
          outbound_offer_construction: expect.objectContaining({
            schema_version: "marriage_workflow_outbound_offer_construction_v1",
            offer_key: "marriage_offer:outbound:subject:p_child_1:candidate:p_cand_a",
            default_draft: expect.objectContaining({
              selected_candidate_person_id: "p_cand_a",
              offer_key: "marriage_offer:outbound:subject:p_child_1:candidate:p_cand_a",
              offer: expect.objectContaining({
                house_person_id: "p_cand_a",
                dowry_coin_net: 0,
                relationship_delta: { respect: 0, allegiance: 0, threat: 0 }
              }),
              dowry_requested_delta_by_asset: { coin: 0, food_stores: 0, meat_stores: 0 },
              dower_requested_delta_by_asset: { coin: 0, food_stores: 0, meat_stores: 0 }
            }),
            term_controls: expect.arrayContaining([
              expect.objectContaining({
                schema_version: "marriage_workflow_term_control_v1",
                label: "Respect delta",
                player_access: "editable_player_tab",
                resolver_field_path: "offer.relationship_delta.respect"
              }),
              expect.objectContaining({
                label: "Risk tags",
                player_access: "advanced_contract_only",
                resolver_field_path: "offer.risk_tags[]"
              })
            ]),
            decision_payloads: {
              send: expect.objectContaining({
                schema_version: "marriage_workflow_decision_payload_v1",
                action: "send_outbound_offer",
                offer_key: "marriage_offer:outbound:subject:p_child_1:candidate:p_cand_a"
              }),
              queue: expect.objectContaining({
                schema_version: "marriage_workflow_decision_payload_v1",
                action: "queue_outbound_offer",
                offer_key: "marriage_offer:outbound:subject:p_child_1:candidate:p_cand_a"
              })
            },
            resolution_outcomes: {
              send: expect.objectContaining({
                schema_version: "marriage_workflow_resolution_outcome_v1",
                action: "send_outbound_offer"
              }),
              queue: expect.objectContaining({
                schema_version: "marriage_workflow_resolution_outcome_v1",
                status: "queued",
                effect: "state_only"
              })
            }
          }),
          latest_outbound_offer: expect.objectContaining({
            schema_version: "marriage_workflow_latest_offer_v1",
            offer_key: "marriage_offer:outbound:subject:p_child_1:candidate:p_cand_a",
            state: "pending",
            candidate: expect.objectContaining({
              person_id: "p_cand_a"
            }),
            resolution_outcome: expect.objectContaining({
              schema_version: "marriage_workflow_resolution_outcome_v1",
              status: "pending",
              effect: "state_only"
            })
          })
        }
      }
    });
    expect(notes).toEqual(["Scouted prospects; next marriage window slightly improved."]);
    expect(state.relationships).toEqual([]);
    expect(state.house.children[0]?.married).toBe(false);
    expect(state.people?.p_cand_a?.married).toBe(false);
  });

  it("reports accepted, rejected, and no-effect outbound workflow outcomes without UI-side proposal state", () => {
    const acceptedState = mkState();
    recordPersistedOutboundMarriageOfferEntry(acceptedState, {
      candidate_house_id: "h_ext_01",
      candidate_house_label: "House Ashford",
      candidate_person_id: "p_cand_a",
      created_turn: acceptedState.turn_index,
      direction: "outbound",
      dowry_coin_net: -2,
      relationship_delta: { respect: 4, allegiance: 3, threat: -1 },
      risk_tags: ["prestige"],
      state: "accepted",
      subject_person_id: "p_child_1"
    });

    const acceptedView = buildMarriageWorkflowView(acceptedState, {
      marriage_window: { eligible_child_ids: ["p_child_1"], offers: [] }
    });
    expect(acceptedView.subjects_by_person_id.p_child_1?.latest_outbound_offer?.resolution_outcome).toMatchObject({
      schema_version: "marriage_workflow_resolution_outcome_v1",
      action: "send_outbound_offer",
      status: "accepted",
      effect: "relationship_and_settlement",
      expected_effects: expect.objectContaining({
        coin_delta: -2,
        relationship_delta: { respect: 4, allegiance: 3, threat: -1 }
      })
    });

    const rejectedState = mkState();
    recordPersistedOutboundMarriageOfferEntry(rejectedState, {
      candidate_house_id: "h_ext_01",
      candidate_house_label: "House Ashford",
      candidate_person_id: "p_cand_a",
      created_turn: rejectedState.turn_index,
      direction: "outbound",
      dowry_coin_net: 0,
      relationship_delta: { respect: 0, allegiance: 0, threat: 0 },
      risk_tags: [],
      state: "rejected",
      subject_person_id: "p_child_1"
    });

    const rejectedView = buildMarriageWorkflowView(rejectedState, {
      marriage_window: { eligible_child_ids: ["p_child_1"], offers: [] }
    });
    expect(rejectedView.subjects_by_person_id.p_child_1?.latest_outbound_offer?.resolution_outcome).toMatchObject({
      schema_version: "marriage_workflow_resolution_outcome_v1",
      action: "send_outbound_offer",
      status: "rejected",
      effect: "no_effect",
      expected_effects: null,
      summary: expect.stringContaining("no relationship or settlement effects")
    });
    expect(rejectedView.subjects_by_person_id.p_child_1?.outbound_scouting).toMatchObject({
      schema_version: "marriage_workflow_outbound_scouting_v1",
      scouting_status: "empty",
      decision_payload: expect.objectContaining({
        action: "scout_outbound_candidates"
      }),
      resolution_outcome: expect.objectContaining({
        status: "no_effect",
        effect: "no_effect"
      })
    });
  });
});
