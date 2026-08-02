import { describe, expect, it } from "vitest";

import { buildFoundationAJourneyResolver } from "../../src/sim/domains/journey/journeyFoundationSourceAdapter.node";
import { createJourneyRuntime } from "../../src/sim/domains/journey/journeyLifecycle";
import {
  createJourneyCoreOrchestrator,
  type JourneyCoreOrchestratorPortsV1,
} from "../../src/sim/domains/journey/journeyOrchestrator";
import {
  buildJourneyHistoricalReplayCandidate,
  runJourneyThirtySixMonthReplay,
} from "../../src/sim/domains/journey/journeyReplay";
import {
  buildJourneyRequestDraft,
  type JourneyDomainRequestV1,
} from "../../src/sim/phaseFive/journeyDomainAdapter";

function domainRequest(routePosture: JourneyDomainRequestV1["route_posture"] = "fastest_viable"):
JourneyDomainRequestV1 {
  return {
    domain_request_id: `inspection:foundation-a:${routePosture}`,
    trigger_id: "JRN-016",
    initiating_owner_key: "courtos.responsibility.manor_stewardship",
    primary_purpose_ref: "manor-inspection:foundation-a",
    decision_owner_responsibility_instance_id: "responsibility:manor-stewardship:test",
    competent_proceeding_ref: null,
    initiating_actor_id: "person:inspector",
    principal_person_id: "person:inspector",
    origin_location_anchor_id: "manor_hx_22639",
    destination_location_anchor_id: "manor_hx_22640",
    desired_window: {
      earliest_departure: { relative_month: 1, phase: "opening" },
      latest_arrival: { relative_month: 1, phase: "closing" },
    },
    return_window: {
      earliest_departure: { relative_month: 1, phase: "closing" },
      latest_arrival: { relative_month: 2, phase: "midmonth" },
    },
    planned_destination_stay: {
      arrival_cutpoint: { relative_month: 1, phase: "midmonth" },
      departure_cutpoint: { relative_month: 1, phase: "closing" },
    },
    route_posture: routePosture,
    end_posture: "return",
    named_participant_candidates: [{
      person_id: "person:inspector",
      party_role: "principal",
      participation_basis_ref: "decision:inspect:test",
      required_or_discretionary: "required",
      authority_or_custody_ref: null,
      intended_arrival_disposition: "return",
    }],
    authority_evidence_refs: ["authority:responsibility-owner:test"],
    support_basis: {
      sponsor_entity_id: "house:test",
      support_basis_ref: "support:house:test",
      support_posture: "house_support",
    },
    host_acceptance_required: false,
    hosting_visit_arrangement_id: null,
    hosting_entity_id: null,
    owning_domain_command_ref: "command:manor-inspection:test",
    source_refs: ["fixture:manor-inspection-request"],
  };
}

function makeOrchestrator() {
  const foundation = buildFoundationAJourneyResolver();
  const ports: JourneyCoreOrchestratorPortsV1 = {
    foundation_resolver: foundation.resolver,
    source_policy: {
      policy_id: "fixture:journey-development-policy",
      allow_cpo_candidate_triggers: true,
      allow_foundation_a_provisional_routes: true,
      allow_development_party_evidence: true,
      allow_development_support_evidence: true,
      source_refs: ["fixture:source-policy"],
    },
    trigger_admission: {
      resolveTriggerAdmission(draft) {
        return {
          status: "development_candidate",
          trigger_id: draft.trigger_id,
          admission_ref: `fixture:trigger-admission:${draft.trigger_id}`,
          source_refs: ["fixture:trigger-registry-admission"],
        };
      },
    },
    party_calibration: {
      resolvePartyCalibrationEvidence({ draft }) {
        return {
          status: "resolved_admitted",
          sponsor_entity_id: draft.support_basis.sponsor_entity_id,
          house_posture: "baronial",
          means_band: "ordinary",
          season: "spring",
          armed_posture: "ordinary_escort",
          source_refs: ["fixture:aggregate-context"],
        };
      },
    },
    named_person_evidence: {
      resolveNamedPersonEvidence({ candidate, runtime_presence }) {
        return {
          status: "resolved_admitted",
          person_id: candidate.person_id,
          origin_presence_ref: runtime_presence.evidence_refs[0]!,
          origin_residence_ref: "fixture:residence:inspector:manor_hx_22639",
          absence_impact_refs: ["responsibility:manor-stewardship:test"],
          source_refs: ["fixture:person-context"],
        };
      },
    },
    host_acceptance_authority: {
      verifyHostAcceptance({ draft, hosting_visit_arrangement_id }) {
        return {
          status: "accepted",
          hosting_visit_arrangement_id,
          host_entity_id: "house:fixture-host",
          destination_location_anchor_id: draft.destination_location_anchor_id,
          accepted_principal_person_id: draft.principal_person_id,
          accepted_named_person_ids: draft.named_participant_candidates.map(
            (candidate) => candidate.person_id,
          ),
          accepted_desired_window: draft.desired_window,
          accepted_destination_stay: draft.planned_destination_stay,
          capacity_state: "available",
          acceptance_authority_ref: `fixture:host-acceptance:${hosting_visit_arrangement_id}`,
          source_refs: ["fixture:host-authority"],
        };
      },
    },
    predeparture_support_authority: {
      reservePredepartureSupport({ arrangement }) {
        return {
          status: "resolved_admitted",
          journey_arrangement_id: arrangement.journey_arrangement_id,
          sponsor_and_support_basis_ref: arrangement.sponsor_and_support_basis_ref,
          covered_leg_ids: arrangement.legs.map((leg) => leg.route_leg_id),
          support_reservation_ref: `fixture:support-reservation:${arrangement.journey_arrangement_id}`,
          source_refs: ["fixture:support-authority"],
        };
      },
      finalizePredepartureSupport({
        arrangement,
        support_reservation_ref,
        closure_kind,
      }) {
        return {
          status: "finalized",
          journey_arrangement_id: arrangement.journey_arrangement_id,
          support_reservation_ref,
          closure_kind,
          support_closure_ref:
            `fixture:support-closure:${arrangement.journey_arrangement_id}:${closure_kind}`,
          source_refs: ["fixture:support-finalization"],
        };
      },
    },
  };
  return {
    foundation,
    orchestrator: createJourneyCoreOrchestrator({
      opening_runtime: createJourneyRuntime([{
        person_id: "person:inspector",
        location_id: "manor_hx_22639",
        evidence_refs: ["fixture:presence:inspector:manor_hx_22639"],
      }]),
      ports,
    }),
  };
}

describe("Phase Five Journey end-to-end orchestration", () => {
  it("takes a purpose-owned manor-inspection draft through Foundation A, presence and return receipts", () => {
    const { foundation, orchestrator } = makeOrchestrator();
    const draft = buildJourneyRequestDraft(domainRequest());
    const accepted = orchestrator.submitJourneyRequestDraft(draft);

    expect(foundation.audit.route_graph_component_count).toBe(1);
    expect(accepted).toMatchObject({
      submission_status: "accepted_for_resolution",
      journey_request_id: "journey:request:inspection:foundation-a:fastest_viable",
      lifecycle_source_status: "development_provisional",
      runtime_authority: false,
    });
    expect(orchestrator.submitJourneyRequestDraft(draft).submission_status).toBe("idempotent");

    const arrangement = Object.values(orchestrator.readRuntime().arrangements_by_id)[0]!;
    expect(arrangement.legs).toHaveLength(2);
    expect(arrangement.legs.every((leg) => leg.source_status === "foundation_a_provisional")).toBe(true);
    expect(arrangement.direct_domain_mutation).toBe(false);

    const complete = orchestrator.advanceTo({ relative_month: 2, phase: "midmonth" });
    expect(complete.runtime_by_arrangement_id[arrangement.journey_arrangement_id]?.status).toBe("completed");
    expect(complete.presence_ledger.people_by_id["person:inspector"]).toMatchObject({
      status: "at_location",
      location_id: "manor_hx_22639",
    });
    expect(complete.presence_ledger.receipts.map((row) => row.result_code)).toEqual(
      expect.arrayContaining(["in_transit", "arrived", "returned"]),
    );
    expect(complete.presence_ledger.receipts.every((row) =>
      row.source_refs.includes(
        `fixture:support-reservation:${arrangement.journey_arrangement_id}`,
      )
    )).toBe(true);
  });

  it("fails closed when the selected route posture lacks an admitted weighting policy", () => {
    const { orchestrator } = makeOrchestrator();
    const result = orchestrator.submitJourneyRequestDraft(
      buildJourneyRequestDraft(domainRequest("safest_viable")),
    );
    expect(result.submission_status).toBe("withheld");
    expect(result.reason_codes).toContain("safety_weight_not_supplied");
    expect(Object.keys(orchestrator.readRuntime().arrangements_by_id)).toHaveLength(0);
  });

});

describe("Phase Five Journey deterministic replay and historical firewall", () => {
  it("replays the same admitted arrangement for 36 months with an identical digest", () => {
    const { orchestrator } = makeOrchestrator();
    orchestrator.submitJourneyRequestDraft(buildJourneyRequestDraft(domainRequest()));
    const arrangement = Object.values(orchestrator.readRuntime().arrangements_by_id)[0]!;
    const input = {
      replay_id: "replay:fixture:36-month",
      start_year: 1120,
      opening_presence: [{
        person_id: "person:inspector",
        location_id: "manor_hx_22639",
        evidence_refs: ["fixture:opening-presence"],
      }],
      arrangements: [arrangement],
      source_refs: ["fixture:replay-input"],
    } as const;
    const first = runJourneyThirtySixMonthReplay(input);
    const second = runJourneyThirtySixMonthReplay(input);

    expect(first.month_summaries).toHaveLength(36);
    expect(first.deterministic_digest).toBe(second.deterministic_digest);
    expect(first.admitted_arrangement_ids).toEqual([arrangement.journey_arrangement_id]);
    expect(first.final_runtime.runtime_by_arrangement_id[arrangement.journey_arrangement_id]?.status).toBe("completed");
    expect(first.direct_domain_mutation).toBe(false);
    expect(first.direct_resource_or_gl_mutation).toBe(false);
    expect(first.direct_art_mutation).toBe(false);
  });

  it("processes a source-backed interruption once and carries review posture through later months", () => {
    const { orchestrator } = makeOrchestrator();
    orchestrator.submitJourneyRequestDraft(buildJourneyRequestDraft(domainRequest()));
    const arrangement = Object.values(orchestrator.readRuntime().arrangements_by_id)[0]!;
    const leg = arrangement.legs[0]!;
    const replay = runJourneyThirtySixMonthReplay({
      replay_id: "replay:fixture:interrupted",
      start_year: 1120,
      opening_presence: [{
        person_id: "person:inspector",
        location_id: "manor_hx_22639",
        evidence_refs: ["fixture:opening-presence"],
      }],
      arrangements: [arrangement],
      interruptions: [{
        journey_arrangement_id: arrangement.journey_arrangement_id,
        journey_leg_id: leg.route_leg_id,
        result_code: "route_blocked",
        effective_cutpoint: { relative_month: 1, phase: "midmonth" },
        reason_codes: ["crossing_closed"],
        source_refs: ["route-condition:crossing-closed"],
      }],
      source_refs: ["fixture:interrupted-replay"],
    });

    expect(replay.final_runtime.runtime_by_arrangement_id[
      arrangement.journey_arrangement_id
    ]?.status).toBe("needs_review");
    expect(replay.final_runtime.presence_ledger.receipts.filter(
      (row) => row.result_code === "route_blocked",
    )).toHaveLength(1);
    expect(replay.month_summaries[1]!.review_required_arrangement_ids).toContain(
      arrangement.journey_arrangement_id,
    );
    expect(replay.month_summaries.at(-1)!.review_required_arrangement_ids).toContain(
      arrangement.journey_arrangement_id,
    );
  });

  it("withholds 1117–1119 history when exact opening presence and purpose receipts do not exist", () => {
    const result = buildJourneyHistoricalReplayCandidate({
      replay_id: "history:1117-1119:withheld",
      start_year: 1117,
      route_foundation_ref: "foundation-a:route-spine",
      opening_presence: [],
      purposes: [],
      source_refs: ["audit:historical-source-gap"],
    });

    expect(result).toMatchObject({
      status: "withheld",
      reason_codes: [
        "missing_1117_opening_presence",
        "no_admitted_historical_journey_purposes",
      ],
    });
  });
});
