import { describe, expect, it } from "vitest";

import type {
  EventResult,
  HouseLogEvent,
  MarriageOffer,
  Prospect,
  ProspectsLogEvent
} from "../../src/sim/types";
import {
  appliedEventEvidenceEvents,
  houseLogEvidenceEvents,
  marriageOfferEvidenceEvents,
  noteEvidenceEvents,
  phaseLogEventsFromEvidence,
  prospectsLogEvidenceEvents
} from "../../src/sim/domains/ai/evidence";

describe("ai evidence domain", () => {
  it("maps house log events into deterministic evidence and preserves log compatibility", () => {
    const houseLog: HouseLogEvent[] = [
      {
        kind: "widowed",
        turn_index: 4,
        survivor_name: "Alice",
        spouse_name: "Bob",
        survivor_id: "p_alice",
        deceased_id: "p_bob"
      },
      {
        kind: "heir_selected",
        turn_index: 4,
        heir_name: "Charles"
      },
      {
        kind: "succession",
        turn_index: 4,
        new_ruler_name: "Diana"
      }
    ];

    const evidence = houseLogEvidenceEvents(houseLog);

    expect(evidence).toEqual([
      {
        kind: "widowed",
        detail: "Widowed: Alice lost Bob.",
        category: "household",
        confidence: "known",
        subject_ids: ["p_alice", "p_bob"]
      },
      {
        kind: "heir_selected",
        detail: "Heir selected: Charles.",
        category: "succession",
        confidence: "known",
        subject_ids: undefined
      },
      {
        kind: "succession",
        detail: "Succession: Diana assumes rule.",
        category: "succession",
        confidence: "known",
        subject_ids: undefined
      }
    ]);

    expect(phaseLogEventsFromEvidence(evidence)).toEqual([
      { kind: "widowed", detail: "Widowed: Alice lost Bob." },
      { kind: "heir_selected", detail: "Heir selected: Charles." },
      { kind: "succession", detail: "Succession: Diana assumes rule." }
    ]);
  });

  it("maps prospects, events, marriage offers, and notes into typed evidence", () => {
    const prospect: Prospect = {
      id: "pr_1",
      type: "marriage",
      from_house_id: "house_red",
      to_house_id: "house_player",
      subject_person_id: "p_child",
      spouse_person_id: "p_candidate",
      summary: "Marriage alliance available.",
      requirements: [],
      costs: { coin: 8 },
      predicted_effects: { coin_delta: 4 },
      uncertainty: "likely",
      expires_turn: 6,
      actions: ["accept", "reject"]
    };
    const prospectsLog: ProspectsLogEvent[] = [
      {
        kind: "prospect_generated",
        turn_index: 2,
        type: "marriage",
        from_house_id: "house_red",
        to_house_id: "house_player",
        subject_person_id: "p_child",
        prospect_id: "pr_1",
        prospect
      },
      {
        kind: "prospects_window_built",
        turn_index: 2,
        shown_ids: ["pr_1"],
        hidden_ids: ["pr_2"]
      },
      {
        kind: "prospect_accepted",
        turn_index: 2,
        type: "marriage",
        from_house_id: "house_red",
        to_house_id: "house_player",
        subject_person_id: "p_child",
        prospect_id: "pr_1",
        effects_applied: { coin_delta: 4 }
      }
    ];
    const appliedEvents: EventResult[] = [
      {
        id: "event_security_1",
        title: "Bandits repelled",
        category: "security",
        why: { weight: 1, roll: 0.25, notes: [] },
        effects: ["Unrest falls."],
        deltas: []
      }
    ];
    const marriageOffers: MarriageOffer[] = [
      {
        house_person_id: "p_suitor",
        house_label: "House Vale",
        dowry_coin_net: 10,
        relationship_delta: { respect: 5, allegiance: 2, threat: -1 },
        liege_delta: null,
        risk_tags: []
      }
    ];

    const evidence = [
      ...prospectsLogEvidenceEvents(prospectsLog),
      ...appliedEventEvidenceEvents(appliedEvents),
      ...marriageOfferEvidenceEvents(marriageOffers),
      ...noteEvidenceEvents("labor", ["Builders shifted to fields."])
    ];

    expect(evidence).toEqual([
      {
        kind: "prospect_generated",
        detail: "Prospect generated: marriage (pr_1).",
        category: "prospects",
        confidence: "likely",
        subject_ids: ["p_candidate", "p_child"]
      },
      {
        kind: "prospects_window_built",
        detail: "Prospects window built: shown 1, hidden 1.",
        category: "prospects",
        confidence: "known",
        subject_ids: undefined
      },
      {
        kind: "prospect_accepted",
        detail: "Prospect accepted: marriage (pr_1).",
        category: "prospects",
        confidence: "known",
        subject_ids: ["p_child"]
      },
      {
        kind: "event_applied",
        detail: "Bandits repelled",
        category: "security",
        confidence: "known",
        subject_ids: undefined
      },
      {
        kind: "marriage_offer",
        detail: "House Vale (p_suitor)",
        category: "marriage",
        confidence: "known",
        subject_ids: ["p_suitor"]
      },
      {
        kind: "note",
        detail: "Builders shifted to fields.",
        category: "labor",
        confidence: "known",
        subject_ids: undefined
      }
    ]);

    expect(phaseLogEventsFromEvidence(evidence)).toEqual([
      { kind: "prospect_generated", detail: "Prospect generated: marriage (pr_1)." },
      { kind: "prospects_window_built", detail: "Prospects window built: shown 1, hidden 1." },
      { kind: "prospect_accepted", detail: "Prospect accepted: marriage (pr_1)." },
      { kind: "event_applied", detail: "Bandits repelled" },
      { kind: "marriage_offer", detail: "House Vale (p_suitor)" },
      { kind: "note", detail: "Builders shifted to fields." }
    ]);
  });
});
