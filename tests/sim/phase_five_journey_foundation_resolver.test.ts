import { describe, expect, it } from "vitest";

import {
  JOURNEY_LOCATION_ANCHOR_SCHEMA_VERSION,
  JOURNEY_TRAVEL_TIME_CALIBRATION_SCHEMA_VERSION,
  adaptJourneyFoundationToRouteResolver,
  addJourneyDaysToCutpoint,
  buildJourneyFoundationResolver,
  type JourneyFoundationBundleV1,
  type JourneyFoundationSourceEvidenceV1,
  type JourneyLocationAnchorV1,
} from "../../src/sim/domains/journey/journeyFoundationResolver";
import { JOURNEY_REQUEST_SCHEMA_VERSION, type JourneyRequestV1 } from "../../src/sim/domains/journey/journeyContracts";
import { loadFoundationAJourneySources } from "../../src/sim/domains/journey/journeyFoundationSourceAdapter.node";

const admitted: JourneyFoundationSourceEvidenceV1 = {
  source_ref: "fixture:admitted",
  source_status: "admitted_runtime_input",
  runtime_authority: true,
};
const provisional: JourneyFoundationSourceEvidenceV1 = {
  source_ref: "fixture:foundation-a",
  source_status: "foundation_a_provisional",
  runtime_authority: false,
};

function anchor(
  anchorId: string,
  manorId: string,
  evidence: JourneyFoundationSourceEvidenceV1 = admitted,
): JourneyLocationAnchorV1 {
  return {
    schema_version: JOURNEY_LOCATION_ANCHOR_SCHEMA_VERSION,
    anchor_id: anchorId,
    label: anchorId,
    location_kind: "manor",
    feature_or_form: "manor",
    county_id: "c_test",
    county_name: "Test",
    map_hex_id: `hx_${anchorId}`,
    routing_manor_id: manorId,
    anchor_status: "resolved_to_manor_graph",
    potential_stop_provider_kinds: ["controlled_house_manor"],
    source_evidence: [evidence],
  };
}

function bundle(evidence: JourneyFoundationSourceEvidenceV1 = admitted): JourneyFoundationBundleV1 {
  return {
    anchors: [anchor("place_a", "manor_a", evidence), anchor("place_b", "manor_b", evidence), anchor("place_c", "manor_c", evidence)],
    route_edges: [
      {
        edge_id: "edge_a_b",
        from_manor_id: "manor_a",
        to_manor_id: "manor_b",
        travel_cost_distance: 10,
        path_hex_ids: ["hx_a", "hx_b"],
        macro_corridor_edge_ids: [],
        macro_route_tiers: [],
        crossing_ids: [],
        source_evidence: [evidence],
      },
      {
        edge_id: "edge_b_c",
        from_manor_id: "manor_b",
        to_manor_id: "manor_c",
        travel_cost_distance: 10,
        path_hex_ids: ["hx_b", "hx_c"],
        macro_corridor_edge_ids: ["corridor_test"],
        macro_route_tiers: ["regional"],
        crossing_ids: ["crossing_test"],
        source_evidence: [evidence],
      },
      {
        edge_id: "edge_a_c",
        from_manor_id: "manor_a",
        to_manor_id: "manor_c",
        travel_cost_distance: 30,
        path_hex_ids: ["hx_a", "hx_c"],
        macro_corridor_edge_ids: [],
        macro_route_tiers: [],
        crossing_ids: [],
        source_evidence: [evidence],
      },
    ],
    background_traffic_evidence: [{
      from_manor_id: "manor_a",
      to_manor_id: "manor_c",
      exact_financial_lane_count: 4,
      annualized_transport_load: 12,
      likely_modes: ["road_cart"],
      source_evidence: [{
        source_ref: "fixture:financial-lane",
        source_status: "candidate_evidence_only",
        runtime_authority: false,
      }],
      proves_named_person_presence: false,
    }],
    travel_time_calibration: {
      schema_version: JOURNEY_TRAVEL_TIME_CALIBRATION_SCHEMA_VERSION,
      calibration_id: "fixture:calibration",
      source_status: evidence.source_status === "admitted_runtime_input" ? "admitted_runtime_input" : "foundation_a_provisional",
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
}

function routeRequest() {
  return {
    from_anchor_id: "place_a",
    to_anchor_id: "place_c",
    route_posture: "fastest_viable" as const,
    party_profile: "small_noble_retinue" as const,
    condition_posture: "normal" as const,
    departure_cutpoint: { relative_month: 2, phase: "opening" as const },
    source_refs: ["fixture:request"],
  };
}

describe("Phase Five Journey Foundation resolver", () => {
  it("selects the deterministic least-cost path and computes a source-aware cutpoint", () => {
    const resolver = buildJourneyFoundationResolver(bundle());
    const result = resolver.resolveRoute(routeRequest());

    expect(result.status).toBe("resolved_admitted");
    if (result.status !== "resolved_admitted") throw new Error("expected admitted route");
    expect(result.routing_manor_path).toEqual(["manor_a", "manor_b", "manor_c"]);
    expect(result.edge_path.map((row) => row.edge_id)).toEqual(["edge_a_b", "edge_b_c"]);
    expect(result.distance_cost).toBe(20);
    expect(result.expected_travel_days).toBe(1);
    expect(result.expected_arrival_cutpoint).toEqual({ relative_month: 2, phase: "midmonth" });
    expect(result.crossing_ids).toEqual(["crossing_test"]);
    expect(result.route_confidence).toBe("high");
    expect(result.runtime_authority).toBe(true);
  });

  it("keeps freight evidence informational and never manufactures named presence", () => {
    const resolver = buildJourneyFoundationResolver(bundle());
    const result = resolver.resolveRoute(routeRequest());

    if (!("route_plan_id" in result)) throw new Error("expected resolved route");
    expect(result.background_traffic_evidence.forward).toMatchObject({
      exact_financial_lane_count: 4,
      proves_named_person_presence: false,
    });
    expect(result.named_person_presence_inferred_from_financial_traffic).toBe(false);
    expect(result.edge_path.map((row) => row.edge_id)).toEqual(["edge_a_b", "edge_b_c"]);
  });

  it("labels the same path provisional when the Foundation A source is not promoted", () => {
    const resolver = buildJourneyFoundationResolver(bundle(provisional));
    const result = resolver.resolveRoute(routeRequest());

    expect(result).toMatchObject({
      status: "resolved_provisional",
      runtime_authority: false,
      named_person_presence_inferred_from_financial_traffic: false,
    });
  });

  it("withholds unsupported route postures instead of pretending cost means safety or support", () => {
    const resolver = buildJourneyFoundationResolver(bundle());
    const safest = resolver.resolveRoute({ ...routeRequest(), route_posture: "safest_viable" });
    const support = resolver.resolveRoute({ ...routeRequest(), route_posture: "lowest_support_burden" });

    expect(safest).toMatchObject({ status: "withheld", reason_codes: ["safety_weight_not_supplied"] });
    expect(support).toMatchObject({ status: "withheld", reason_codes: ["stop_support_weight_not_supplied"] });
  });

  it("requires exact waypoints for a domain-required route and blocks a declared unviable condition", () => {
    const resolver = buildJourneyFoundationResolver(bundle());
    const noWaypoint = resolver.resolveRoute({ ...routeRequest(), route_posture: "domain_required" });
    const viaB = resolver.resolveRoute({
      ...routeRequest(),
      route_posture: "domain_required",
      waypoint_anchor_ids: ["place_b"],
    });
    const blocked = resolver.resolveRoute({ ...routeRequest(), condition_posture: "blocked_unviable" });

    expect(noWaypoint).toMatchObject({ status: "withheld", reason_codes: ["domain_required_route_needs_waypoint_anchor"] });
    expect(viaB.status).toBe("resolved_admitted");
    expect(blocked).toMatchObject({ status: "blocked", reason_codes: ["route_condition_blocked_unviable"] });
  });

  it("withholds unresolved locations rather than snapping them to a nearby manor", () => {
    const unresolved = {
      ...anchor("place_gap", "manor_a"),
      routing_manor_id: null,
      anchor_status: "unresolved_missing_manor_graph_link" as const,
    };
    const source = bundle();
    const resolver = buildJourneyFoundationResolver({ ...source, anchors: [...source.anchors, unresolved] });

    expect(resolver.resolveAnchor("place_gap")).toMatchObject({
      status: "withheld",
      reason_codes: ["location_missing_manor_graph_link", "location_not_route_ready"],
    });
  });

  it("enforces access, acceptance, capacity, and constrained self-support at lodging", () => {
    const resolver = buildJourneyFoundationResolver(bundle());
    const accepted = resolver.resolveLodging({
      stop_id: "stop_a",
      location_anchor_id: "place_a",
      provider_kind: "controlled_house_manor",
      party_profile: "small_noble_retinue",
      condition_posture: "normal",
      provider_entity_id: "house_a",
      admission_ref: "access:house_a",
      acceptance_state: "accepted",
      capacity_state: "available",
      self_supported_basis: null,
      source_evidence: [admitted],
    });
    const unknown = resolver.resolveStop({
      stop_id: "stop_a",
      location_anchor_id: "place_a",
      provider_kind: "controlled_house_manor",
      party_profile: "small_noble_retinue",
      condition_posture: "normal",
      provider_entity_id: "house_a",
      admission_ref: "access:house_a",
      acceptance_state: "unknown",
      capacity_state: "unknown",
      self_supported_basis: null,
      source_evidence: [admitted],
    });
    const ceremonialCamp = resolver.resolveStop({
      stop_id: "camp_a",
      location_anchor_id: "place_a",
      provider_kind: "constrained_self_supported",
      party_profile: "ceremonial_progress",
      condition_posture: "normal",
      provider_entity_id: null,
      admission_ref: "self-support:declared",
      acceptance_state: "not_required",
      capacity_state: "not_required",
      self_supported_basis: "light",
      source_evidence: [admitted],
    });

    expect(accepted).toMatchObject({ status: "eligible_admitted", runtime_authority: true });
    expect(unknown).toMatchObject({
      status: "withheld",
      reason_codes: ["house_controlled_access_not_accepted", "house_controlled_lodging_capacity_not_available"],
    });
    expect(ceremonialCamp.status).toBe("withheld");
    expect(ceremonialCamp.reason_codes).toContain("party_profile_not_eligible_for_self_supported_stop");
  });

  it("adapts the richer foundation response to the shared Journey route interface", () => {
    const resolver = adaptJourneyFoundationToRouteResolver(buildJourneyFoundationResolver(bundle()));
    const request: JourneyRequestV1 = {
      schema_version: JOURNEY_REQUEST_SCHEMA_VERSION,
      journey_request_id: "journey_request_1",
      trigger_id: "JRN-016",
      movement_class: "named_journey",
      owning_domain: "courtos.responsibility.manor_stewardship",
      primary_purpose_ref: "inspection:1",
      initiating_actor_id: "person:lord",
      decision_owner_responsibility_instance_id: "responsibility:inspection",
      competent_proceeding_ref: null,
      principal_person_id: "person:lord",
      origin_location_id: "place_a",
      destination_location_id: "place_c",
      desired_window: {
        earliest_departure: { relative_month: 2, phase: "opening" },
        latest_arrival: { relative_month: 2, phase: "closing" },
      },
      return_window: null,
      planned_destination_stay: null,
      route_posture: "fastest_viable",
      return_or_end_posture: "return",
      profile_key: "small_noble_retinue",
      named_party: [],
      aggregate_calibration: {
        profile_key: "small_noble_retinue",
        house_posture: "baronial",
        means_band: "ordinary",
        season: "spring",
        armed_posture: "ordinary_escort",
        named_party_count: 1,
        source_refs: ["fixture:party"],
      },
      authority_evidence_refs: ["authority:1"],
      sponsor_and_support_basis_ref: "support:house",
      hosting_visit_arrangement_id: null,
      hosting_entity_id: null,
      host_acceptance_required: false,
      source_refs: ["fixture:request"],
    };

    const result = resolver.resolveNamedJourneyRoute(request);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") throw new Error("expected resolved shared route");
    expect(result.legs[0]).toMatchObject({
      from_location_id: "place_a",
      to_location_id: "place_c",
      distance_cost: 20,
      expected_travel_days: 1,
      source_status: "admitted",
      crossing_access_right_refs: [],
    });
    expect(result.legs[0]!.source_refs).toContain(
      "crossing_evidence:crossing_test",
    );
  });

  it("resolves injected stop and lodging evidence into the actual route leg and fails closed when admission is absent", () => {
    const foundation = buildJourneyFoundationResolver(bundle());
    const request: JourneyRequestV1 = {
      schema_version: JOURNEY_REQUEST_SCHEMA_VERSION,
      journey_request_id: "journey_request_stop_1",
      trigger_id: "JRN-016",
      movement_class: "named_journey",
      owning_domain: "courtos.responsibility.manor_stewardship",
      primary_purpose_ref: "inspection:stop:1",
      initiating_actor_id: "person:lord",
      decision_owner_responsibility_instance_id: "responsibility:inspection",
      competent_proceeding_ref: null,
      principal_person_id: "person:lord",
      origin_location_id: "place_a",
      destination_location_id: "place_c",
      desired_window: {
        earliest_departure: { relative_month: 2, phase: "opening" },
        latest_arrival: { relative_month: 2, phase: "closing" },
      },
      return_window: null,
      planned_destination_stay: null,
      route_posture: "fastest_viable",
      return_or_end_posture: "remain",
      profile_key: "small_noble_retinue",
      named_party: [],
      aggregate_calibration: {
        profile_key: "small_noble_retinue",
        house_posture: "baronial",
        means_band: "ordinary",
        season: "spring",
        armed_posture: "ordinary_escort",
        named_party_count: 1,
        source_refs: ["fixture:party"],
      },
      authority_evidence_refs: ["authority:1"],
      sponsor_and_support_basis_ref: "support:house",
      hosting_visit_arrangement_id: null,
      hosting_entity_id: null,
      host_acceptance_required: false,
      source_refs: ["fixture:request"],
    };
    const stopPlan = (acceptance_state: "accepted" | "unknown") => ({
      stop: {
        stop_id: "stop:place-b",
        location_anchor_id: "place_b",
        provider_kind: "controlled_house_manor" as const,
        party_profile: "small_noble_retinue" as const,
        condition_posture: "normal" as const,
        provider_entity_id: "house:b",
        admission_ref: "admission:house-b",
        acceptance_state,
        capacity_state: acceptance_state === "accepted" ? "available" as const : "unknown" as const,
        self_supported_basis: null,
        source_evidence: [admitted],
      },
      arrival_cutpoint: { relative_month: 2, phase: "opening" as const },
      departure_cutpoint: { relative_month: 2, phase: "opening" as const },
    });
    const accepted = adaptJourneyFoundationToRouteResolver(foundation, {
      stopsForResolvedRoute: () => [stopPlan("accepted")],
    }).resolveNamedJourneyRoute(request);
    expect(accepted).toMatchObject({
      status: "resolved",
      legs: [{
        source_status: "admitted",
        planned_stops: [{
          stop_id: "stop:place-b",
          location_id: "place_b",
          host_entity_id: "house:b",
          admission_ref: "admission:house-b",
        }],
      }],
    });

    const withheld = adaptJourneyFoundationToRouteResolver(foundation, {
      stopsForResolvedRoute: () => [stopPlan("unknown")],
    }).resolveNamedJourneyRoute(request);
    expect(withheld).toMatchObject({
      status: "withheld",
      reason_codes: [
        "stop:stop:place-b:house_controlled_access_not_accepted",
        "stop:stop:place-b:house_controlled_lodging_capacity_not_available",
      ],
    });

    const profileMismatch = adaptJourneyFoundationToRouteResolver(foundation, {
      stopsForResolvedRoute: () => [{
        ...stopPlan("accepted"),
        stop: {
          ...stopPlan("accepted").stop,
          party_profile: "light_personal" as const,
        },
      }],
    }).resolveNamedJourneyRoute(request);
    expect(profileMismatch).toMatchObject({
      status: "withheld",
      reason_codes: ["stop:stop:place-b:party_profile_mismatch"],
    });

    const conditionMismatch = adaptJourneyFoundationToRouteResolver(foundation, {
      conditionForRequest: () => "adverse",
      stopsForResolvedRoute: () => [stopPlan("accepted")],
    }).resolveNamedJourneyRoute(request);
    expect(conditionMismatch).toMatchObject({
      status: "withheld",
      reason_codes: ["stop:stop:place-b:condition_posture_mismatch"],
    });

    const impossibleSchedule = adaptJourneyFoundationToRouteResolver(foundation, {
      stopsForResolvedRoute: () => [{
        ...stopPlan("accepted"),
        departure_cutpoint: { relative_month: 2, phase: "midmonth" as const },
      }],
    }).resolveNamedJourneyRoute(request);
    expect(impossibleSchedule).toMatchObject({
      status: "withheld",
      reason_codes: ["planned_stop_time_exceeds_resolved_route_schedule"],
    });

    const repeatedPathPosition = adaptJourneyFoundationToRouteResolver(foundation, {
      stopsForResolvedRoute: () => [
        stopPlan("accepted"),
        {
          ...stopPlan("accepted"),
          stop: {
            ...stopPlan("accepted").stop,
            stop_id: "stop:place-b:second",
            admission_ref: "admission:house-b:second",
          },
        },
      ],
    }).resolveNamedJourneyRoute(request);
    expect(repeatedPathPosition).toMatchObject({
      status: "withheld",
      reason_codes: [
        "stop:stop:place-b:second:stop_not_in_resolved_route_order",
      ],
    });

    const longRouteSource = bundle();
    const placeD = anchor("place_d", "manor_d");
    const longRoute = buildJourneyFoundationResolver({
      ...longRouteSource,
      anchors: [...longRouteSource.anchors, placeD],
      route_edges: [
        ...longRouteSource.route_edges
          .filter((edge) => edge.edge_id !== "edge_a_c")
          .map((edge) => ({ ...edge, travel_cost_distance: 300 })),
        {
          edge_id: "edge_c_d",
          from_manor_id: "manor_c",
          to_manor_id: "manor_d",
          travel_cost_distance: 300,
          path_hex_ids: ["hx_place_c", "hx_place_d"],
          macro_corridor_edge_ids: [],
          macro_route_tiers: [],
          crossing_ids: [],
          source_evidence: [admitted],
        },
      ],
    });
    const outOfChronologicalOrder = adaptJourneyFoundationToRouteResolver(
      longRoute,
      {
        stopsForResolvedRoute: () => [
          {
            ...stopPlan("accepted"),
            arrival_cutpoint: { relative_month: 2, phase: "closing" },
            departure_cutpoint: { relative_month: 2, phase: "closing" },
          },
          {
            stop: {
              ...stopPlan("accepted").stop,
              stop_id: "stop:place-c",
              location_anchor_id: "place_c",
              provider_entity_id: "house:c",
              admission_ref: "admission:house-c",
            },
            arrival_cutpoint: { relative_month: 2, phase: "midmonth" },
            departure_cutpoint: { relative_month: 2, phase: "midmonth" },
          },
        ],
      },
    ).resolveNamedJourneyRoute({
      ...request,
      destination_location_id: "place_d",
    });
    expect(outOfChronologicalOrder).toMatchObject({
      status: "withheld",
      reason_codes: [
        "stop:stop:place-c:stop_chronology_conflicts_with_route_order",
      ],
    });
  });

  it("uses deterministic thirty-day monthly cutpoint bands", () => {
    expect(addJourneyDaysToCutpoint({ relative_month: 1, phase: "closing" }, 2)).toEqual({
      relative_month: 2,
      phase: "midmonth",
    });
    expect(addJourneyDaysToCutpoint({ relative_month: 4, phase: "opening" }, 0)).toEqual({
      relative_month: 4,
      phase: "opening",
    });
  });
});

describe("Foundation A Journey source adapter", () => {
  it("loads the current connected path spine without promoting unresolved anchors", () => {
    const loaded = loadFoundationAJourneySources();

    expect(loaded.audit).toMatchObject({
      place_name_rows: 2494,
      unique_location_anchors: 2482,
      duplicate_name_rows_deduplicated: 12,
      route_ready_location_anchors: 2371,
      unresolved_missing_current_map_hex: 87,
      unresolved_missing_manor_graph_link: 24,
      manor_count: 1250,
      route_edge_count: 3488,
      route_graph_component_count: 1,
      macro_corridor_edge_count: 229,
      route_edges_with_macro_overlay: 514,
      crossing_count: 56,
      route_edges_with_crossing_evidence: 88,
      exact_financial_lane_rows: 13841,
      exact_financial_lane_rows_with_route_ready_endpoints: 13841,
      financial_lane_rows_with_unresolved_endpoints: 0,
      background_traffic_directed_pair_count: 3928,
      financial_lanes_create_named_person_presence: false,
      runtime_authority: false,
      source_status: "foundation_a_provisional_readiness",
    });
  });

  it("resolves actual manors provisionally and withholds a stale off-map institution anchor", () => {
    const loaded = loadFoundationAJourneySources();
    const resolver = buildJourneyFoundationResolver(loaded.bundle);
    const adjacent = resolver.resolveRoute({
      from_anchor_id: "manor_hx_22639",
      to_anchor_id: "manor_hx_22640",
      route_posture: "fastest_viable",
      party_profile: "small_noble_retinue",
      condition_posture: "normal",
      departure_cutpoint: { relative_month: 1, phase: "opening" },
    });

    expect(adjacent).toMatchObject({
      status: "resolved_provisional",
      distance_cost: 1.3333,
      expected_travel_days: 1,
      runtime_authority: false,
      named_person_presence_inferred_from_financial_traffic: false,
    });
    expect(resolver.resolveAnchor("church_stl_10")).toMatchObject({
      status: "withheld",
      reason_codes: ["location_hex_missing_from_current_map", "location_not_route_ready"],
    });
  });

  it("attaches exact freight evidence without using it as a named-route source", () => {
    const loaded = loadFoundationAJourneySources();
    const traffic = loaded.bundle.background_traffic_evidence[0]!;
    const resolver = buildJourneyFoundationResolver(loaded.bundle);
    const route = resolver.resolveRoute({
      from_anchor_id: traffic.from_manor_id,
      to_anchor_id: traffic.to_manor_id,
      route_posture: "fastest_viable",
      party_profile: "light_personal",
      condition_posture: "normal",
      departure_cutpoint: { relative_month: 1, phase: "opening" },
    });

    expect(route.status).toBe("resolved_provisional");
    if (!("route_plan_id" in route)) throw new Error("expected Foundation A route");
    expect(route.background_traffic_evidence.forward?.exact_financial_lane_count).toBeGreaterThan(0);
    expect(route.background_traffic_evidence.forward?.proves_named_person_presence).toBe(false);
    expect(route.named_person_presence_inferred_from_financial_traffic).toBe(false);
  });
});
