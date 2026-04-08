import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  clearRuntimeDomainEvidence,
  readRuntimeDomainEvidence
} from "../../src/sim/domains/ai/evidence";
import {
  carryEconomyObligationCounterpartyIntoArrears,
  settleEconomyObligationCounterparty
} from "../../src/sim/domains/economy/obligationRegistry";
import { applyEconomyObligationStageOnePenalties } from "../../src/sim/domains/economy/obligationEnforcement";
import { buildGrantAcquisitionExperienceSurfaces } from "../../src/sim/domains/people/grantAcquisitionRegistry";
import { applyMarriageDecision } from "../../src/sim/domains/people/marriage";
import type { MarriageOffer, MarriageWindow, Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, name: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "Lord Rowan", "M", 40);
  const child = mkPerson("p_child", "Edwin", "M", 18);
  const suitor = mkPerson("p_suitor", "Ada", "F", 19);
  const liege = mkPerson("p_liege", "House Liege", "M", 50);
  const clergy = mkPerson("p_clergy", "Parish Church", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 20,
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
    },
    house: {
      head,
      children: [child],
      energy: { max: 3, available: 3 }
    },
    locals: {
      liege,
      clergy,
      nobles: []
    },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [child.id]: child,
      [suitor.id]: suitor,
      [liege.id]: liege,
      [clergy.id]: clergy
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: null,
        child_ids: [child.id]
      }
    },
    player_house_id: "h_player"
  } as RunState;
}

function mkMarriageWindow(): MarriageWindow {
  const offer: MarriageOffer = {
    house_person_id: "p_suitor",
    house_label: "House Vale",
    dowry_coin_net: 4,
    relationship_delta: { respect: 3, allegiance: 2, threat: -1 },
    liege_delta: null,
    risk_tags: []
  };

  return {
    eligible_child_ids: ["p_child"],
    offers: [offer]
  };
}

describe("runtime domain evidence emitters", () => {
  it("records marriage flow evidence without touching replay-visible phase output", () => {
    const state = mkState();

    applyMarriageDecision(
      state,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "reject_all" } } as any,
      []
    );

    expect(readRuntimeDomainEvidence(state)).toEqual({
      schema_version: "domain_evidence_log_v1",
      entries: [
        {
          phase: "marriage",
          events: [
            {
              kind: "marriage_rejected_all",
              detail: "Rejected all offers; slight social friction (+1 unrest).",
              category: "marriage",
              confidence: "known",
              subject_ids: ["p_child", "p_head", "p_suitor"]
            }
          ]
        }
      ]
    });
  });

  it("records obligation settlement, carry, and enforcement evidence deterministically", () => {
    const state = mkState();
    state.manor.obligations.tax_due_coin = 5;
    state.manor.obligations.tithe_due_bushels = 4;

    settleEconomyObligationCounterparty(state, {
      phase: "obligations",
      phase_sequence: 1,
      counterparty_kind: "liege",
      requested_amount: 3,
      payment_mode: "coin",
      rule_id: "obligations.liege_due_settlement",
      related_actor_ids: [state.house.head.id, state.locals.liege.id]
    });
    carryEconomyObligationCounterpartyIntoArrears(state, {
      phase: "succession",
      phase_sequence: 2,
      counterparty_kind: "church",
      rule_id: "obligations.close_turn.church_arrears_carry",
      related_actor_ids: [state.house.head.id, state.locals.clergy.id]
    });
    applyEconomyObligationStageOnePenalties(state);

    expect(readRuntimeDomainEvidence(state)).toEqual({
      schema_version: "domain_evidence_log_v1",
      entries: [
        {
          phase: "obligations",
          events: [
            {
              kind: "obligation_settlement_applied",
              detail: "House Liege: settled 3 via coin.",
              category: "obligations",
              confidence: "known",
              subject_ids: ["p_head", "p_liege"]
            },
            {
              kind: "obligation_arrears_carried",
              detail: "Parish Church: carried 4 into arrears.",
              category: "obligations",
              confidence: "known",
              subject_ids: ["p_clergy", "p_head"]
            },
            {
              kind: "obligation_enforcement_arrears",
              detail: "Stage-one enforcement pressure rose for Parish Church because arrears remain open after carry.",
              category: "obligations",
              confidence: "known",
              subject_ids: ["p_clergy", "p_head"]
            },
            {
              kind: "obligation_enforcement_clear",
              detail: "Stage-one enforcement stayed favorable for House Liege because arrears are clear after carry.",
              category: "obligations",
              confidence: "known",
              subject_ids: ["p_head", "p_liege"]
            }
          ]
        }
      ]
    });
  });

  it("records bounded grant evidence once even when grant surfaces are rebuilt", () => {
    const state = createNewRun("grant_acquisition_preview_surface_v032");
    clearRuntimeDomainEvidence(state);

    buildGrantAcquisitionExperienceSurfaces(state);
    buildGrantAcquisitionExperienceSurfaces(state);

    expect(readRuntimeDomainEvidence(state)).toEqual({
      schema_version: "domain_evidence_log_v1",
      entries: [
        {
          phase: "prospects",
          events: [
            {
              kind: "grant_eligibility_open",
              detail: "Grant eligibility open for bounded acquisition review.",
              category: "prospects",
              confidence: "known",
              subject_ids: ["p_head", "p_liege"]
            },
            {
              kind: "grant_prospect_available",
              detail: expect.stringMatching(/^Grant prospect available: acq_grant:/),
              category: "prospects",
              confidence: "likely",
              subject_ids: ["p_head", "p_liege"]
            }
          ]
        }
      ]
    });
  });

  it("resets runtime domain evidence when the turn advances", () => {
    const state = mkState();

    applyMarriageDecision(
      state,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "reject_all" } } as any,
      []
    );
    expect(readRuntimeDomainEvidence(state).entries).toHaveLength(1);

    state.turn_index += 1;

    expect(readRuntimeDomainEvidence(state)).toEqual({
      schema_version: "domain_evidence_log_v1",
      entries: []
    });
  });
});
