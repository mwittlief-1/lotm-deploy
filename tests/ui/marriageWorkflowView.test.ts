import { describe, expect, it } from "vitest";

import { buildMarriageWorkflowSurface } from "../../src/ui/marriageWorkflowView";

function personRef(personId: string, personName: string, houseId: string) {
  return {
    person_id: personId,
    person_name: personName,
    house_id: houseId,
    house_name: houseId === "h_player" ? "Player" : "Ashford",
    parent_refs: [],
  };
}

function decisionPayload(action: string, payload: Record<string, unknown>, offerKey: string | null = null) {
  return {
    schema_version: "marriage_workflow_decision_payload_v1",
    action_id: `action:${action}`,
    action,
    label: action,
    subject_person_id: "p_child_1",
    candidate_person_id: action.includes("outbound") || action.includes("accept") ? "p_cand_a" : null,
    offer_key: offerKey,
    enabled: true,
    disabled_reason: null,
    payload,
  };
}

describe("marriageWorkflowView", () => {
  it("reads action outcomes and offer terms from the canonical workflow contract", () => {
    const candidate = personRef("p_cand_a", "Cedric", "h_ext_01");
    const subject = personRef("p_child_1", "Alice", "h_player");
    const inboundOfferKey = "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a";
    const outboundOfferKey = "marriage_offer:outbound:subject:p_child_1:candidate:p_cand_a";
    const acceptPayload = decisionPayload(
      "accept_inbound_offer",
      { kind: "marriage", action: "accept", child_id: "p_child_1", offer_index: 0, offer_key: inboundOfferKey },
      inboundOfferKey
    );
    const rejectPayload = decisionPayload(
      "reject_inbound_offers",
      { kind: "marriage", action: "reject_all", subject_person_id: "p_child_1", offer_keys: [inboundOfferKey] },
      null
    );
    const scoutPayload = decisionPayload(
      "scout_outbound_candidates",
      { kind: "marriage", action: "scout", subject_person_id: "p_child_1" },
      null
    );
    const sendPayload = decisionPayload(
      "send_outbound_offer",
      { kind: "marriage", action: "send_outbound_offer", subject_person_id: "p_child_1", candidate_person_id: "p_cand_a", offer_key: outboundOfferKey },
      outboundOfferKey
    );
    const queuePayload = decisionPayload(
      "queue_outbound_offer",
      { kind: "marriage", action: "queue_outbound_offer", subject_person_id: "p_child_1", candidate_person_id: "p_cand_a", offer_key: outboundOfferKey },
      outboundOfferKey
    );
    const previewState = {
      marriage_workflow_view: {
        schema_version: "marriage_workflow_view_v1",
        turn_index: 12,
        subject_person_ids: ["p_child_1"],
        subjects_by_person_id: {
          p_child_1: {
            schema_version: "marriage_workflow_subject_v1",
            subject,
            inbound_offer_count: 1,
            inbound_offers: [
              {
                schema_version: "marriage_workflow_inbound_offer_v1",
                entry_id: "inbound:p_child_1:p_cand_a:0",
                offer_index: 0,
                offer_key: inboundOfferKey,
                state: "received",
                candidate,
                expected_effects: {
                  coin_delta: 3,
                  relationship_delta: { allegiance: 4, respect: 6, threat: -2 },
                  liege_delta: null,
                  risk_tags: [],
                },
                decision_payloads: {
                  accept: acceptPayload,
                  reject: rejectPayload,
                },
                resolution_outcomes: {
                  accept: {
                    schema_version: "marriage_workflow_resolution_outcome_v1",
                    outcome_id: "accept",
                    action: "accept_inbound_offer",
                    status: "accepted",
                    effect: "relationship_and_settlement",
                    subject_person_id: "p_child_1",
                    candidate_person_id: "p_cand_a",
                    offer_key: inboundOfferKey,
                    expected_effects: null,
                    blocked_reason: null,
                    summary: "Accept contract outcome.",
                  },
                  reject: {
                    schema_version: "marriage_workflow_resolution_outcome_v1",
                    outcome_id: "reject",
                    action: "reject_inbound_offers",
                    status: "rejected",
                    effect: "state_only",
                    subject_person_id: "p_child_1",
                    candidate_person_id: null,
                    offer_key: inboundOfferKey,
                    expected_effects: null,
                    blocked_reason: null,
                    summary: "Reject contract outcome.",
                  },
                },
              },
            ],
            outbound_scouting: {
              schema_version: "marriage_workflow_outbound_scouting_v1",
              scouting_status: "available",
              candidate_ids: ["p_cand_a"],
              shown_candidate_ids: ["p_cand_a"],
              held_out_candidate_ids: [],
              shown_candidate_count: 1,
              held_out_candidate_count: 0,
              total_candidates_considered: 1,
              featured_candidate: candidate,
              search_results: [],
              decision_payload: scoutPayload,
              resolution_outcome: {},
            },
            outbound_offer_construction: {
              schema_version: "marriage_workflow_outbound_offer_construction_v1",
              offer_key: outboundOfferKey,
              subject_person_id: "p_child_1",
              candidate,
              default_draft: {},
              term_controls: [
                {
                  schema_version: "marriage_workflow_term_control_v1",
                  draft_field_path: "default_draft.offer.dowry_coin_net",
                  resolver_field_path: "offer.dowry_coin_net",
                  label: "Dowry coin",
                  player_access: "editable_player_tab",
                  helper_text: "Editable.",
                },
                {
                  schema_version: "marriage_workflow_term_control_v1",
                  draft_field_path: "default_draft.offer.risk_tags",
                  resolver_field_path: "offer.risk_tags[]",
                  label: "Risk tags",
                  player_access: "advanced_contract_only",
                  helper_text: "Locked.",
                },
              ],
              decision_payloads: {
                send: sendPayload,
                queue: queuePayload,
              },
              resolution_outcomes: {
                send: {
                  schema_version: "marriage_workflow_resolution_outcome_v1",
                  outcome_id: "send",
                  action: "send_outbound_offer",
                  status: "rejected",
                  effect: "no_effect",
                  subject_person_id: "p_child_1",
                  candidate_person_id: "p_cand_a",
                  offer_key: outboundOfferKey,
                  expected_effects: null,
                  blocked_reason: null,
                  summary: "Send contract outcome.",
                },
              },
            },
            latest_outbound_offer: {
              schema_version: "marriage_workflow_latest_offer_v1",
              offer_key: outboundOfferKey,
              state: "rejected",
              candidate,
              expected_effects: {
                coin_delta: 0,
                relationship_delta: { allegiance: 0, respect: 0, threat: 0 },
                liege_delta: null,
                risk_tags: [],
              },
              resolution_outcome: {
                schema_version: "marriage_workflow_resolution_outcome_v1",
                outcome_id: "latest",
                action: "send_outbound_offer",
                status: "rejected",
                effect: "no_effect",
                subject_person_id: "p_child_1",
                candidate_person_id: "p_cand_a",
                offer_key: outboundOfferKey,
                expected_effects: null,
                blocked_reason: null,
                summary: "Latest contract outcome.",
              },
            },
          },
        },
      },
    };

    const surface = buildMarriageWorkflowSurface(previewState as any);
    const workflow = surface?.subjects[0];

    expect(workflow?.inboundOffers[0]?.acceptDecisionPayload).toBe(acceptPayload);
    expect(workflow?.inboundOffers[0]?.rejectDecisionPayload).toBe(rejectPayload);
    expect(workflow?.scoutDecisionPayload).toBe(scoutPayload);
    expect(workflow?.sendOutboundOfferPayload).toBe(sendPayload);
    expect(workflow?.queueOutboundOfferPayload).toBe(queuePayload);
    expect(workflow?.inboundOffers[0]?.rejectOutcomeSummary).toBe("Reject contract outcome.");
    expect(workflow?.outboundSendOutcomeSummary).toBe("If you send now: Rejected preview. Send contract outcome.");
    expect(workflow?.outboundTermSummary).toBe(
      "Editable on player tab: dowry coin. Locked on the normal path: risk tags."
    );
    expect(workflow?.latestOfferSummary).toBe("Post-submit state: Latest contract outcome.");
  });
});
