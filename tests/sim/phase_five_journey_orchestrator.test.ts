import { describe, expect, it } from "vitest";

import {
  JOURNEY_TRIGGER_REGISTRY,
  buildJourneyRequestDraft,
  type JourneyRequestDraftV1,
} from "../../src/sim/phaseFive/journeyDomainAdapter";
import {
  JOURNEY_LOCATION_ANCHOR_SCHEMA_VERSION,
  JOURNEY_TRAVEL_TIME_CALIBRATION_SCHEMA_VERSION,
  buildJourneyFoundationResolver,
  type JourneyFoundationBundleV1,
  type JourneyFoundationSourceEvidenceV1,
} from "../../src/sim/domains/journey/journeyFoundationResolver";
import {
  createJourneyRuntime,
} from "../../src/sim/domains/journey/journeyLifecycle";
import {
  JOURNEY_PROFILE_CANDIDATE_TO_CORE_PROFILE,
  createJourneyCoreOrchestrator,
  type JourneyCoreOrchestratorPortsV1,
} from "../../src/sim/domains/journey/journeyOrchestrator";
import { runJourneyThirtySixMonthReplay } from "../../src/sim/domains/journey/journeyReplay";

const admittedEvidence: JourneyFoundationSourceEvidenceV1 = {
  source_ref: "fixture:admitted-route-source",
  source_status: "admitted_runtime_input",
  runtime_authority: true,
};

const provisionalEvidence: JourneyFoundationSourceEvidenceV1 = {
  source_ref: "fixture:foundation-a-route-source",
  source_status: "foundation_a_provisional",
  runtime_authority: false,
};

function foundation(
  evidence: JourneyFoundationSourceEvidenceV1 = admittedEvidence,
) {
  const bundle: JourneyFoundationBundleV1 = {
    anchors: ["a", "b", "c"].map((key) => ({
      schema_version: JOURNEY_LOCATION_ANCHOR_SCHEMA_VERSION,
      anchor_id: `anchor:${key}`,
      label: `Place ${key.toUpperCase()}`,
      location_kind: "manor",
      feature_or_form: "manor",
      county_id: "county:test",
      county_name: "Test",
      map_hex_id: `hex:${key}`,
      routing_manor_id: `manor:${key}`,
      anchor_status: "resolved_to_manor_graph" as const,
      potential_stop_provider_kinds: ["controlled_house_manor" as const],
      source_evidence: [evidence],
    })),
    route_edges: [
      {
        edge_id: "edge:a-b",
        from_manor_id: "manor:a",
        to_manor_id: "manor:b",
        travel_cost_distance: 10,
        path_hex_ids: ["hex:a", "hex:b"],
        macro_corridor_edge_ids: [],
        macro_route_tiers: [],
        crossing_ids: [],
        source_evidence: [evidence],
      },
      {
        edge_id: "edge:b-c",
        from_manor_id: "manor:b",
        to_manor_id: "manor:c",
        travel_cost_distance: 10,
        path_hex_ids: ["hex:b", "hex:c"],
        macro_corridor_edge_ids: [],
        macro_route_tiers: [],
        crossing_ids: [],
        source_evidence: [evidence],
      },
    ],
    background_traffic_evidence: [],
    travel_time_calibration: {
      schema_version: JOURNEY_TRAVEL_TIME_CALIBRATION_SCHEMA_VERSION,
      calibration_id: "fixture:journey-time",
      source_status: evidence.runtime_authority
        ? "admitted_runtime_input"
        : "foundation_a_provisional",
      runtime_authority: evidence.runtime_authority,
      cost_units_per_day_by_profile: {
        light_personal: 35,
        small_noble_retinue: 25,
        ceremonial_progress: 18,
        household_transfer: 15,
        protected_transfer: 20,
        martial_party: 18,
      },
      condition_duration_multiplier: { normal: 1, adverse: 4 / 3 },
      cutpoint_model: "thirty_day_month_opening_midmonth_closing",
      source_refs: [evidence.source_ref],
    },
  };
  return buildJourneyFoundationResolver(bundle);
}

function draft(destination = "anchor:b", hosted = false): JourneyRequestDraftV1 {
  return buildJourneyRequestDraft({
    domain_request_id: "inspection:house-1:1120",
    trigger_id: "JRN-016",
    initiating_owner_key: "courtos.responsibility.manor_stewardship",
    primary_purpose_ref: "inspection-purpose:manor-b",
    decision_owner_responsibility_instance_id: "responsibility:manor-b",
    competent_proceeding_ref: null,
    initiating_actor_id: "person:lord",
    principal_person_id: "person:lord",
    origin_location_anchor_id: "anchor:a",
    destination_location_anchor_id: destination,
    desired_window: {
      earliest_departure: { relative_month: 1, phase: "opening" },
      latest_arrival: { relative_month: 1, phase: "closing" },
    },
    return_window: {
      earliest_departure: { relative_month: 2, phase: "opening" },
      latest_arrival: { relative_month: 2, phase: "closing" },
    },
    planned_destination_stay: {
      arrival_cutpoint: { relative_month: 1, phase: "midmonth" },
      departure_cutpoint: { relative_month: 2, phase: "opening" },
    },
    route_posture: "fastest_viable",
    end_posture: "return",
    named_participant_candidates: [
      {
        person_id: "person:lord",
        party_role: "principal",
        participation_basis_ref: "decision:inspect-manor-b",
        required_or_discretionary: "required",
        authority_or_custody_ref: "authority:house-1",
        intended_arrival_disposition: "return",
      },
    ],
    authority_evidence_refs: ["authority:house-1"],
    support_basis: {
      sponsor_entity_id: "house:1",
      support_basis_ref: "support:house-1:journey",
      support_posture: "house_support",
    },
    hosting_visit_arrangement_id: hosted ? "hosting:visit:manor-b" : null,
    host_acceptance_required: hosted,
    owning_domain_command_ref: "estate.command.inspect",
    source_refs: ["fixture:inspection-purpose"],
  });
}

function oneWayDraft(args: Readonly<{
  id: string;
  origin: string;
  destination: string;
  departure_month: number;
}>): JourneyRequestDraftV1 {
  return buildJourneyRequestDraft({
    domain_request_id: args.id,
    trigger_id: "JRN-016",
    initiating_owner_key: "courtos.responsibility.manor_stewardship",
    primary_purpose_ref: `inspection-purpose:${args.destination}`,
    decision_owner_responsibility_instance_id: "responsibility:manor-circuit",
    competent_proceeding_ref: null,
    initiating_actor_id: "person:lord",
    principal_person_id: "person:lord",
    origin_location_anchor_id: args.origin,
    destination_location_anchor_id: args.destination,
    desired_window: {
      earliest_departure: {
        relative_month: args.departure_month,
        phase: "opening",
      },
      latest_arrival: {
        relative_month: args.departure_month,
        phase: "closing",
      },
    },
    return_window: null,
    planned_destination_stay: null,
    route_posture: "fastest_viable",
    end_posture: "remain",
    named_participant_candidates: [{
      person_id: "person:lord",
      party_role: "principal",
      participation_basis_ref: `decision:${args.id}`,
      required_or_discretionary: "required",
      authority_or_custody_ref: "authority:house-1",
      intended_arrival_disposition: "remain",
    }],
    authority_evidence_refs: ["authority:house-1"],
    support_basis: {
      sponsor_entity_id: "house:1",
      support_basis_ref: `support:${args.id}`,
      support_posture: "house_support",
    },
    hosting_visit_arrangement_id: null,
    host_acceptance_required: false,
    owning_domain_command_ref: "estate.command.inspect",
    source_refs: [`fixture:${args.id}`],
  });
}

function openingRuntime() {
  return createJourneyRuntime([
    {
      person_id: "person:lord",
      location_id: "anchor:a",
      evidence_refs: ["presence:person-lord:anchor-a"],
    },
  ]);
}

function ports(args: {
  routeEvidence?: JourneyFoundationSourceEvidenceV1;
  triggerStatus?: "admitted_runtime_input" | "development_candidate";
  partyStatus?: "resolved_admitted" | "resolved_provisional";
  allowCandidateTrigger?: boolean;
  allowProvisionalRoute?: boolean;
  allowProvisionalParty?: boolean;
  allowProvisionalSupport?: boolean;
  hostAcceptanceStatus?: "accepted" | "withheld";
  hostAcceptanceIdentity?: string;
  supportStatus?: "resolved_admitted" | "resolved_provisional" | "withheld";
  supportDefect?: "arrangement" | "sponsor" | "legs" | "reservation" | "provenance";
  supportFinalizationStatus?: "finalized" | "withheld";
  supportFinalizationDefect?: "arrangement" | "reservation" | "closure" | "reference" | "provenance";
  routeStopStatus?: "accepted" | "unknown";
} = {}): JourneyCoreOrchestratorPortsV1 {
  const triggerStatus = args.triggerStatus ?? "admitted_runtime_input";
  const partyStatus = args.partyStatus ?? "resolved_admitted";
  return {
    foundation_resolver: foundation(args.routeEvidence ?? admittedEvidence),
    trigger_admission: {
      resolveTriggerAdmission(input) {
        return {
          status: triggerStatus,
          trigger_id: input.trigger_id,
          admission_ref: `trigger-admission:${input.trigger_id}`,
          source_refs: ["fixture:trigger-admission"],
        };
      },
    },
    party_calibration: {
      resolvePartyCalibrationEvidence({ draft: input }) {
        return {
          status: partyStatus,
          sponsor_entity_id: input.support_basis.sponsor_entity_id,
          house_posture: "baronial",
          means_band: "ordinary",
          season: "winter",
          armed_posture: "ordinary_escort",
          source_refs: ["fixture:rank-means-season-security"],
        };
      },
    },
    named_person_evidence: {
      resolveNamedPersonEvidence({ candidate, runtime_presence }) {
        return {
          status: partyStatus,
          person_id: candidate.person_id,
          origin_presence_ref: runtime_presence.evidence_refs[0]!,
          origin_residence_ref: "residence:person-lord:anchor-a",
          absence_impact_refs: ["responsibility:house-command"],
          source_refs: ["fixture:person-state", ...runtime_presence.evidence_refs],
        };
      },
    },
    host_acceptance_authority: {
      verifyHostAcceptance({ draft: hostDraft, hosting_visit_arrangement_id }) {
        if (args.hostAcceptanceStatus === "withheld") {
          return {
            status: "withheld",
            hosting_visit_arrangement_id,
            reason_codes: ["host_has_not_accepted_visit"],
            source_refs: ["fixture:host-authority"],
          };
        }
        return {
          status: "accepted",
          hosting_visit_arrangement_id:
            args.hostAcceptanceIdentity ?? hosting_visit_arrangement_id,
          host_entity_id: "house:host",
          destination_location_anchor_id: hostDraft.destination_location_anchor_id,
          accepted_principal_person_id: hostDraft.principal_person_id,
          accepted_named_person_ids: hostDraft.named_participant_candidates.map(
            (candidate) => candidate.person_id,
          ),
          accepted_desired_window: hostDraft.desired_window,
          accepted_destination_stay: hostDraft.planned_destination_stay,
          capacity_state: "available",
          acceptance_authority_ref: "host-acceptance:manor-b",
          source_refs: ["fixture:host-authority"],
        };
      },
    },
    predeparture_support_authority: {
      reservePredepartureSupport({ arrangement }) {
        if (args.supportStatus === "withheld") {
          return {
            status: "withheld",
            journey_arrangement_id: arrangement.journey_arrangement_id,
            reason_codes: ["house_support_not_available"],
            source_refs: ["fixture:support-authority"],
          };
        }
        return {
          status: args.supportStatus ?? "resolved_admitted",
          journey_arrangement_id: args.supportDefect === "arrangement"
            ? "journey:arrangement:wrong"
            : arrangement.journey_arrangement_id,
          sponsor_and_support_basis_ref: args.supportDefect === "sponsor"
            ? "support:wrong"
            : arrangement.sponsor_and_support_basis_ref,
          covered_leg_ids: args.supportDefect === "legs"
            ? []
            : arrangement.legs.map((leg) => leg.route_leg_id),
          support_reservation_ref: args.supportDefect === "reservation"
            ? ""
            : `support-reservation:${arrangement.journey_arrangement_id}`,
          source_refs: args.supportDefect === "provenance"
            ? []
            : ["fixture:support-authority"],
        };
      },
      finalizePredepartureSupport({
        arrangement,
        support_reservation_ref,
        closure_kind,
      }) {
        if (args.supportFinalizationStatus === "withheld") {
          return {
            status: "withheld",
            journey_arrangement_id: arrangement.journey_arrangement_id,
            support_reservation_ref,
            closure_kind,
            reason_codes: ["support_release_not_confirmed"],
            source_refs: ["fixture:support-finalization"],
          };
        }
        return {
          status: "finalized",
          journey_arrangement_id: args.supportFinalizationDefect === "arrangement"
            ? "journey:arrangement:wrong"
            : arrangement.journey_arrangement_id,
          support_reservation_ref: args.supportFinalizationDefect === "reservation"
            ? "support-reservation:wrong"
            : support_reservation_ref,
          closure_kind: args.supportFinalizationDefect === "closure"
            ? closure_kind === "settled_completed"
              ? "released_terminal"
              : "settled_completed"
            : closure_kind,
          support_closure_ref:
            args.supportFinalizationDefect === "reference"
              ? ""
              : `support-closure:${arrangement.journey_arrangement_id}:${closure_kind}`,
          source_refs: args.supportFinalizationDefect === "provenance"
            ? []
            : ["fixture:support-finalization"],
        };
      },
    },
    stops_for_resolved_route: args.routeStopStatus
      ? ({ request }) => request.origin_location_id === "anchor:a" &&
          request.destination_location_id === "anchor:c"
        ? [{
            stop: {
              stop_id: "stop:anchor-b",
              location_anchor_id: "anchor:b",
              provider_kind: "controlled_house_manor",
              party_profile: request.profile_key,
              condition_posture: "normal",
              provider_entity_id: "house:1",
              admission_ref: "stop-admission:anchor-b",
              acceptance_state: args.routeStopStatus,
              capacity_state: args.routeStopStatus === "accepted"
                ? "available"
                : "unknown",
              self_supported_basis: null,
              source_evidence: [args.routeEvidence ?? admittedEvidence],
            },
            arrival_cutpoint: { relative_month: 1, phase: "midmonth" },
            departure_cutpoint: { relative_month: 1, phase: "midmonth" },
          }]
        : []
      : undefined,
    source_policy: {
      policy_id: "journey-source-policy:test",
      allow_cpo_candidate_triggers: args.allowCandidateTrigger ?? false,
      allow_foundation_a_provisional_routes: args.allowProvisionalRoute ?? false,
      allow_development_party_evidence: args.allowProvisionalParty ?? false,
      allow_development_support_evidence: args.allowProvisionalSupport ?? false,
      source_refs: ["fixture:source-policy"],
    },
  };
}

describe("Phase Five Journey core profile seam", () => {
  it("maps every registered named-Journey purpose profile without creating another person taxonomy", () => {
    const namedCandidates = new Set(
      Object.values(JOURNEY_TRIGGER_REGISTRY)
        .filter((row) => row.movement_class === "named_journey")
        .map((row) => row.aggregate_profile_candidate),
    );
    expect([...namedCandidates].filter(
      (candidate) => !JOURNEY_PROFILE_CANDIDATE_TO_CORE_PROFILE[candidate],
    )).toEqual([]);
    expect(new Set(Object.values(JOURNEY_PROFILE_CANDIDATE_TO_CORE_PROFILE))).toEqual(
      new Set([
        "light_personal",
        "small_noble_retinue",
        "ceremonial_progress",
        "household_transfer",
        "protected_transfer",
        "martial_party",
      ]),
    );
  });
});

describe("Phase Five Journey core orchestration", () => {
  it("carries an admitted planned stop through the core and withholds an unaccepted one", () => {
    const accepted = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ routeStopStatus: "accepted" }),
    });
    expect(accepted.submitJourneyRequestDraft(draft("anchor:c"))).toMatchObject({
      submission_status: "accepted_for_resolution",
    });
    expect(accepted.readLifecycleRecords()[0]!.arrangement.legs[0]!.planned_stops).toEqual([
      expect.objectContaining({
        stop_id: "stop:anchor-b",
        location_id: "anchor:b",
        admission_ref: "stop-admission:anchor-b",
      }),
    ]);

    const withheld = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ routeStopStatus: "unknown" }),
    }).submitJourneyRequestDraft(draft("anchor:c"));
    expect(withheld).toMatchObject({
      submission_status: "withheld",
      journey_arrangement_id: null,
      reason_codes: expect.arrayContaining([
        "stop:stop:anchor-b:house_controlled_access_not_accepted",
        "stop:stop:anchor-b:house_controlled_lodging_capacity_not_available",
      ]),
    });
  });

  it("admits a future B-to-C leg from an authoritative A-to-B presence commitment", () => {
    const orchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    const first = orchestrator.submitJourneyRequestDraft(oneWayDraft({
      id: "inspection:circuit:a-b",
      origin: "anchor:a",
      destination: "anchor:b",
      departure_month: 1,
    }));
    const second = orchestrator.submitJourneyRequestDraft(oneWayDraft({
      id: "inspection:circuit:b-c",
      origin: "anchor:b",
      destination: "anchor:c",
      departure_month: 2,
    }));

    expect(first).toMatchObject({
      submission_status: "accepted_for_resolution",
      runtime_authority: true,
    });
    expect(second).toMatchObject({
      submission_status: "accepted_for_resolution",
      runtime_authority: true,
    });
    const secondRequest = orchestrator.readLifecycleRecords()
      .find((row) => row.journey_request_draft_id.includes("b-c"))!.request;
    expect(secondRequest.named_party[0]!.origin_presence_ref).toContain(
      "journey-presence-reservation:",
    );
    orchestrator.advanceTo({ relative_month: 2, phase: "closing" });
    expect(orchestrator.readRuntime().presence_ledger.people_by_id["person:lord"]).toMatchObject({
      status: "at_location",
      location_id: "anchor:c",
    });
  });

  it("withholds a future origin that is backed only by a non-authoritative development journey", () => {
    const orchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({
        routeEvidence: provisionalEvidence,
        triggerStatus: "development_candidate",
        partyStatus: "resolved_provisional",
        allowCandidateTrigger: true,
        allowProvisionalRoute: true,
        allowProvisionalParty: true,
        allowProvisionalSupport: true,
        supportStatus: "resolved_provisional",
      }),
    });
    expect(orchestrator.submitJourneyRequestDraft(oneWayDraft({
      id: "inspection:provisional:a-b",
      origin: "anchor:a",
      destination: "anchor:b",
      departure_month: 1,
    }))).toMatchObject({ submission_status: "accepted_for_resolution", runtime_authority: false });
    expect(orchestrator.submitJourneyRequestDraft(oneWayDraft({
      id: "inspection:provisional:b-c",
      origin: "anchor:b",
      destination: "anchor:c",
      departure_month: 2,
    }))).toMatchObject({
      submission_status: "withheld",
      reason_codes: ["named_person_not_at_exact_origin:person:lord"],
    });
  });

  it("converts, calibrates, resolves and admits an exact source-backed journey", () => {
    const orchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    const receipt = orchestrator.submitJourneyRequestDraft(draft());

    expect(receipt).toMatchObject({
      submission_status: "accepted_for_resolution",
      journey_request_id: "journey:request:inspection:house-1:1120",
      journey_arrangement_id: expect.stringContaining("journey-arrangement:"),
      journey_lifecycle_record_id: "journey:lifecycle:journey:request:inspection:house-1:1120",
      lifecycle_source_status: "admitted_runtime_input",
      trigger_source_status: "admitted_runtime_input",
      party_source_status: "admitted_runtime_input",
      route_source_status: "admitted_runtime_input",
      support_source_status: "admitted_runtime_input",
      runtime_authority: true,
      direct_domain_mutation: false,
      direct_resource_or_gl_mutation: false,
      direct_art_mutation: false,
    });
    const records = orchestrator.readLifecycleRecords();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      lifecycle_status: "planned",
      support_source_status: "admitted_runtime_input",
      runtime_authority: true,
      request: {
        profile_key: "small_noble_retinue",
        named_party: [{ person_id: "person:lord" }],
      },
      arrangement: {
        destination_stay_leg_id: expect.stringContaining(":leg:01"),
        direct_domain_mutation: false,
        direct_resource_or_gl_mutation: false,
        direct_art_mutation: false,
      },
    });
    const aggregate = records[0]!.arrangement.legs[0]!.aggregate_party;
    expect(aggregate).toMatchObject({
      ordinary_attendant_count: 3,
      guard_rank_and_file_count: 4,
      riding_animal_count: 1,
      pack_animal_count: 4,
    });
    expect(JSON.stringify(records[0]!.arrangement.legs[0]!.aggregate_party)).not.toContain("person:");
    expect(Object.keys(orchestrator.readRuntime().arrangements_by_id)).toEqual([
      receipt.journey_arrangement_id,
    ]);
    expect(receipt.source_refs).toContain(
      `support-reservation:${receipt.journey_arrangement_id}`,
    );
    expect(records[0]!.arrangement.source_refs).toContain(
      `support-reservation:${receipt.journey_arrangement_id}`,
    );
  });

  it("allows Foundation A only under explicit development policy and keeps it non-authoritative", () => {
    const orchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({
        routeEvidence: provisionalEvidence,
        triggerStatus: "development_candidate",
        partyStatus: "resolved_provisional",
        allowCandidateTrigger: true,
        allowProvisionalRoute: true,
        allowProvisionalParty: true,
        allowProvisionalSupport: true,
        supportStatus: "resolved_provisional",
      }),
    });
    const receipt = orchestrator.submitJourneyRequestDraft(draft());

    expect(receipt).toMatchObject({
      submission_status: "accepted_for_resolution",
      lifecycle_source_status: "development_provisional",
      trigger_source_status: "development_candidate",
      party_source_status: "development_provisional",
      route_source_status: "development_provisional",
      support_source_status: "development_provisional",
      runtime_authority: false,
    });
    expect(orchestrator.readLifecycleRecords()[0]).toMatchObject({
      lifecycle_source_status: "development_provisional",
      runtime_authority: false,
    });
  });

  it("fails closed on candidate triggers and provisional routes in production posture", () => {
    const triggerWithheld = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ triggerStatus: "development_candidate" }),
    }).submitJourneyRequestDraft(draft());
    expect(triggerWithheld).toMatchObject({
      submission_status: "withheld",
      journey_arrangement_id: null,
      journey_lifecycle_record_id: null,
      runtime_authority: false,
      reason_codes: ["trigger_not_admitted_for_runtime"],
    });

    const routeWithheld = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ routeEvidence: provisionalEvidence }),
    }).submitJourneyRequestDraft(draft());
    expect(routeWithheld).toMatchObject({
      submission_status: "withheld",
      journey_arrangement_id: null,
      journey_lifecycle_record_id: null,
      reason_codes: ["location_anchor_not_admitted_for_runtime"],
    });

    const supportWithheld = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ supportStatus: "resolved_provisional" }),
    }).submitJourneyRequestDraft(draft());
    expect(supportWithheld).toMatchObject({
      submission_status: "withheld",
      journey_arrangement_id: null,
      support_source_status: "development_provisional",
      reason_codes: ["predeparture_support_not_admitted_for_runtime"],
      runtime_authority: false,
    });
  });

  it("requires competent host-authority verification instead of trusting a nonempty arrangement id", () => {
    const withheld = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ hostAcceptanceStatus: "withheld" }),
    }).submitJourneyRequestDraft(draft("anchor:b", true));
    expect(withheld).toMatchObject({
      submission_status: "withheld",
      reason_codes: ["host_has_not_accepted_visit"],
      journey_arrangement_id: null,
    });

    const mismatched = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ hostAcceptanceIdentity: "hosting:visit:somewhere-else" }),
    }).submitJourneyRequestDraft(draft("anchor:b", true));
    expect(mismatched).toMatchObject({
      submission_status: "rejected",
      reason_codes: ["host_acceptance_identity_mismatch"],
      journey_arrangement_id: null,
    });

    const acceptedOrchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    expect(acceptedOrchestrator.submitJourneyRequestDraft(draft("anchor:b", true)).submission_status)
      .toBe("accepted_for_resolution");
    expect(acceptedOrchestrator.readLifecycleRecords()[0]!.request.authority_evidence_refs)
      .toContain("host-acceptance:manor-b");
    acceptedOrchestrator.advanceTo({ relative_month: 2, phase: "opening" });
    expect(acceptedOrchestrator.readRuntime().presence_ledger.stay_facts[0]).toMatchObject({
      provider_kind: "journey_destination",
      host_entity_id: "house:host",
      admission_ref: "hosting:visit:manor-b",
    });
  });

  it("settles support on completion, releases it on terminal resolution, and fails closed on bad closure evidence", () => {
    const completed = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    completed.submitJourneyRequestDraft(draft());
    completed.advanceTo({ relative_month: 2, phase: "closing" });
    expect(completed.readLifecycleRecords()[0]).toMatchObject({
      support_closure_ref: expect.stringContaining(":settled_completed"),
    });

    const terminal = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    terminal.submitJourneyRequestDraft(draft());
    const terminalRecord = terminal.readLifecycleRecords()[0]!;
    const terminalLegId = terminalRecord.arrangement.legs[0]!.route_leg_id;
    terminal.advanceTo({ relative_month: 1, phase: "midmonth" }, [{
      journey_arrangement_id: terminalRecord.journey_arrangement_id,
      journey_leg_id: terminalLegId,
      result_code: "route_blocked",
      effective_cutpoint: { relative_month: 1, phase: "midmonth" },
      reason_codes: ["bridge_closed"],
      source_refs: ["route-state:bridge-closed"],
    }]);
    terminal.resolveInterruption({
      journey_arrangement_id: terminalRecord.journey_arrangement_id,
      journey_leg_id: terminalLegId,
      resolution_kind: "supersede",
      effective_cutpoint: { relative_month: 1, phase: "midmonth" },
      terminal_presence_disposition: {
        location_id: "anchor:a",
        evidence_ref: "presence-recovery:origin",
        source_refs: ["gate-witness:anchor-a"],
      },
      authority_evidence_refs: ["authority:manor-stewardship"],
      reason_codes: ["replacement_route_required"],
      source_refs: ["decision:supersede-journey"],
    });
    expect(terminal.readLifecycleRecords()[0]).toMatchObject({
      support_closure_ref: expect.stringContaining(":released_terminal"),
    });

    const withheldClosure = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ supportFinalizationStatus: "withheld" }),
    });
    withheldClosure.submitJourneyRequestDraft(draft());
    expect(() => withheldClosure.advanceTo({ relative_month: 2, phase: "closing" }))
      .toThrow("journey_predeparture_support_finalization_withheld:support_release_not_confirmed");
    expect(withheldClosure.readLifecycleRecords()[0]!.support_closure_ref).toBeNull();
    expect(withheldClosure.readRuntime().current_cutpoint).toEqual({
      relative_month: 1,
      phase: "opening",
    });

    const mismatchedClosure = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ supportFinalizationDefect: "arrangement" }),
    });
    mismatchedClosure.submitJourneyRequestDraft(draft());
    expect(() => mismatchedClosure.advanceTo({ relative_month: 2, phase: "closing" }))
      .toThrow("journey_predeparture_support_finalization_mismatch");
    expect(mismatchedClosure.readLifecycleRecords()[0]!.support_closure_ref).toBeNull();
  });

  it("reserves presence only after exact, source-backed predeparture support is accepted", () => {
    const supportWithheld = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports({ supportStatus: "withheld" }),
    });
    expect(supportWithheld.submitJourneyRequestDraft(draft())).toMatchObject({
      submission_status: "withheld",
      reason_codes: ["house_support_not_available"],
      support_source_status: null,
      journey_arrangement_id: null,
    });
    expect(supportWithheld.readLifecycleRecords()).toEqual([]);
    expect(supportWithheld.readRuntime().presence_ledger.reservations).toEqual([]);

    const expectedDefects = {
      arrangement: "predeparture_support_arrangement_mismatch",
      sponsor: "predeparture_support_sponsor_basis_mismatch",
      legs: "predeparture_support_leg_coverage_mismatch",
      reservation: "predeparture_support_reservation_ref_missing",
      provenance: "predeparture_support_provenance_missing",
    } as const;
    for (const [defect, reason] of Object.entries(expectedDefects)) {
      const orchestrator = createJourneyCoreOrchestrator({
        opening_runtime: openingRuntime(),
        ports: ports({
          supportDefect: defect as keyof typeof expectedDefects,
        }),
      });
      const receipt = orchestrator.submitJourneyRequestDraft(draft());
      expect(receipt.reason_codes).toContain(reason);
      expect(receipt.journey_arrangement_id).toBeNull();
      expect(orchestrator.readLifecycleRecords()).toEqual([]);
      expect(orchestrator.readRuntime().presence_ledger.reservations).toEqual([]);
    }
  });

  it("rejects a hand-built draft that breaches the untouched-envelope boundaries", () => {
    const malformed = {
      ...draft(),
      boundaries: { ...draft().boundaries, route_selected: true },
    } as unknown as JourneyRequestDraftV1;
    const orchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    const receipt = orchestrator.submitJourneyRequestDraft(malformed);

    expect(receipt).toMatchObject({
      submission_status: "rejected",
      journey_request_id: null,
      journey_arrangement_id: null,
      journey_lifecycle_record_id: null,
      reason_codes: expect.arrayContaining([
        "draft_boundary_contract_breached",
        "draft_envelope_not_canonical",
      ]),
    });
    expect(orchestrator.readLifecycleRecords()).toEqual([]);
    expect(orchestrator.readRuntime().presence_ledger.reservations).toEqual([]);
  });

  it("withholds a candidate who is not an exact named person at the source-backed origin", () => {
    const orchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    const trulyCanonicalMissing = buildJourneyRequestDraft({
      domain_request_id: "inspection:missing:1120",
      trigger_id: "JRN-016",
      initiating_owner_key: "courtos.responsibility.manor_stewardship",
      primary_purpose_ref: "inspection-purpose:missing",
      decision_owner_responsibility_instance_id: "responsibility:manor-b",
      competent_proceeding_ref: null,
      initiating_actor_id: "person:invented",
      principal_person_id: "person:invented",
      origin_location_anchor_id: "anchor:a",
      destination_location_anchor_id: "anchor:b",
      desired_window: draft().desired_window,
      return_window: draft().return_window,
      planned_destination_stay: draft().planned_destination_stay,
      route_posture: "fastest_viable",
      end_posture: "return",
      named_participant_candidates: [{
        person_id: "person:invented",
        party_role: "principal",
        participation_basis_ref: "decision:missing",
        required_or_discretionary: "required",
        authority_or_custody_ref: "authority:house-1",
        intended_arrival_disposition: "return",
      }],
      authority_evidence_refs: ["authority:house-1"],
      support_basis: draft().support_basis,
      owning_domain_command_ref: "estate.command.inspect",
      source_refs: ["fixture:missing-person-purpose"],
    });
    const withheld = orchestrator.submitJourneyRequestDraft(trulyCanonicalMissing);
    expect(withheld).toMatchObject({
      submission_status: "withheld",
      journey_arrangement_id: null,
      journey_lifecycle_record_id: null,
      reason_codes: ["named_person_not_in_presence_ledger:person:invented"],
    });
  });

  it("replays an admitted draft idempotently and rejects conflicting reuse of its identity", () => {
    const orchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    const input = draft();
    const accepted = orchestrator.submitJourneyRequestDraft(input);
    const replay = orchestrator.submitJourneyRequestDraft(input);
    expect(replay).toMatchObject({
      submission_status: "idempotent",
      journey_request_id: accepted.journey_request_id,
      journey_arrangement_id: accepted.journey_arrangement_id,
      journey_lifecycle_record_id: accepted.journey_lifecycle_record_id,
      reason_codes: ["exact_draft_already_admitted"],
    });
    expect(orchestrator.readRuntime().presence_ledger.reservations).toHaveLength(1);

    const conflicting = orchestrator.submitJourneyRequestDraft(draft("anchor:c"));
    expect(conflicting).toMatchObject({
      submission_status: "rejected",
      journey_request_id: null,
      journey_arrangement_id: null,
      journey_lifecycle_record_id: null,
      reason_codes: ["draft_id_reused_with_different_payload"],
    });
  });

  it("rehydrates lifecycle authority, support closure, future state, and draft idempotency", () => {
    const original = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    const input = draft();
    const accepted = original.submitJourneyRequestDraft(input);
    const snapshot = original.exportState(["persistence:journey-state:001"]);

    const restored = createJourneyCoreOrchestrator({
      opening_runtime: snapshot.runtime,
      rehydrated_state: snapshot,
      ports: ports(),
    });
    expect(restored.submitJourneyRequestDraft(input)).toMatchObject({
      submission_status: "idempotent",
      journey_arrangement_id: accepted.journey_arrangement_id,
      reason_codes: ["exact_draft_already_admitted"],
    });
    restored.advanceTo({ relative_month: 2, phase: "closing" });
    expect(restored.readLifecycleRecords()[0]).toMatchObject({
      support_closure_ref: expect.stringContaining(":settled_completed"),
    });
    const closedSnapshot = restored.exportState([
      "persistence:journey-state:closed",
    ]);
    expect(() => createJourneyCoreOrchestrator({
      opening_runtime: closedSnapshot.runtime,
      rehydrated_state: closedSnapshot,
      ports: ports(),
    })).not.toThrow();

    expect(() => createJourneyCoreOrchestrator({
      opening_runtime: {
        ...snapshot.runtime,
        current_cutpoint: { relative_month: 2, phase: "opening" },
      },
      rehydrated_state: snapshot,
      ports: ports(),
    })).toThrow("journey_orchestrator_state_runtime_mismatch");
  });

  it("feeds the admitted arrangement into a deterministic 36-month replay without domain, GL, or ART writes", () => {
    const orchestrator = createJourneyCoreOrchestrator({
      opening_runtime: openingRuntime(),
      ports: ports(),
    });
    orchestrator.submitJourneyRequestDraft(draft());
    const arrangement = orchestrator.readLifecycleRecords()[0]!.arrangement;
    const replayInput = {
      replay_id: "journey-replay:orchestrator-fixture",
      start_year: 1120,
      opening_presence: [{
        person_id: "person:lord",
        location_id: "anchor:a",
        evidence_refs: ["presence:person-lord:anchor-a"],
      }],
      arrangements: [arrangement],
      source_refs: ["fixture:orchestrator-replay"],
    } as const;

    const first = runJourneyThirtySixMonthReplay(replayInput);
    const second = runJourneyThirtySixMonthReplay(replayInput);
    expect(second.deterministic_digest).toBe(first.deterministic_digest);
    expect(first.admitted_arrangement_ids).toEqual([arrangement.journey_arrangement_id]);
    expect(first.withheld_arrangements).toEqual([]);
    expect(first.final_runtime.presence_ledger.people_by_id["person:lord"]).toMatchObject({
      status: "at_location",
      location_id: "anchor:a",
    });
    expect(first.final_runtime.presence_ledger.receipts.map((row) => row.result_code)).toEqual(
      expect.arrayContaining(["in_transit", "arrived", "returned"]),
    );
    expect(first).toMatchObject({
      source_candidate_only: true,
      direct_domain_mutation: false,
      direct_resource_or_gl_mutation: false,
      direct_art_mutation: false,
    });
  });
});
