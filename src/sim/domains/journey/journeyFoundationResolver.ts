import type {
  JourneyConditionPostureV1,
  JourneyCutpointV1,
  JourneyProfileKeyV1,
  JourneyRequestV1,
  JourneyResolvedRouteLegV1,
  JourneyResolvedStopV1,
  JourneyRoutePostureV1,
  JourneyRouteResolutionV1,
  JourneyRouteResolverV1,
} from "./journeyContracts";
import {
  compareJourneyCutpoints,
  journeyCutpointDayOrdinal,
  validJourneyCutpoint,
} from "./journeyTime";

export const JOURNEY_FOUNDATION_RESOLVER_SCHEMA_VERSION =
  "phase_five_journey_foundation_resolver_v1" as const;
export const JOURNEY_LOCATION_ANCHOR_SCHEMA_VERSION =
  "phase_five_journey_location_anchor_v1" as const;
export const JOURNEY_TRAVEL_TIME_CALIBRATION_SCHEMA_VERSION =
  "phase_five_journey_travel_time_calibration_v1" as const;

export type JourneyFoundationSourceStatusV1 =
  | "admitted_runtime_input"
  | "foundation_a_provisional"
  | "candidate_evidence_only";

export interface JourneyFoundationSourceEvidenceV1 {
  source_ref: string;
  source_status: JourneyFoundationSourceStatusV1;
  runtime_authority: boolean;
}

export type JourneyLocationAnchorStatusV1 =
  | "resolved_to_manor_graph"
  | "unresolved_missing_current_map_hex"
  | "unresolved_missing_manor_graph_link";

export type JourneyStopProviderKindV1 =
  | "controlled_house_manor"
  | "accepted_house_or_court"
  | "accepted_church_or_institution"
  | "eligible_aggregate_commercial"
  | "constrained_self_supported";

export interface JourneyLocationAnchorV1 {
  schema_version: typeof JOURNEY_LOCATION_ANCHOR_SCHEMA_VERSION;
  anchor_id: string;
  label: string;
  location_kind: string;
  feature_or_form: string | null;
  county_id: string | null;
  county_name: string | null;
  map_hex_id: string;
  routing_manor_id: string | null;
  anchor_status: JourneyLocationAnchorStatusV1;
  potential_stop_provider_kinds: readonly JourneyStopProviderKindV1[];
  source_evidence: readonly JourneyFoundationSourceEvidenceV1[];
}

export type JourneyAnchorResolutionV1 =
  | {
      status: "resolved_admitted" | "resolved_provisional";
      anchor: JourneyLocationAnchorV1;
      source_refs: readonly string[];
      reason_codes: readonly string[];
    }
  | {
      status: "withheld";
      anchor: JourneyLocationAnchorV1 | null;
      source_refs: readonly string[];
      reason_codes: readonly string[];
    };

export interface JourneyRouteEdgeV1 {
  edge_id: string;
  from_manor_id: string;
  to_manor_id: string;
  travel_cost_distance: number;
  path_hex_ids: readonly string[];
  macro_corridor_edge_ids: readonly string[];
  macro_route_tiers: readonly ("local" | "regional" | "trunk")[];
  crossing_ids: readonly string[];
  source_evidence: readonly JourneyFoundationSourceEvidenceV1[];
}

/**
 * Financial lanes are route-use evidence only. They never select a named
 * party, create a journey, supply a free carrier, or prove co-presence.
 */
export interface JourneyBackgroundTrafficEvidenceV1 {
  from_manor_id: string;
  to_manor_id: string;
  exact_financial_lane_count: number;
  annualized_transport_load: number;
  likely_modes: readonly string[];
  source_evidence: readonly JourneyFoundationSourceEvidenceV1[];
  proves_named_person_presence: false;
}

export interface JourneyTravelTimeCalibrationV1 {
  schema_version: typeof JOURNEY_TRAVEL_TIME_CALIBRATION_SCHEMA_VERSION;
  calibration_id: string;
  source_status: "admitted_runtime_input" | "foundation_a_provisional";
  runtime_authority: boolean;
  cost_units_per_day_by_profile: Readonly<Record<JourneyProfileKeyV1, number>>;
  condition_duration_multiplier: Readonly<
    Record<Exclude<JourneyConditionPostureV1, "blocked_unviable">, number>
  >;
  cutpoint_model: "thirty_day_month_opening_midmonth_closing";
  source_refs: readonly string[];
}

export interface JourneyFoundationRouteRequestV1 {
  from_anchor_id: string;
  to_anchor_id: string;
  route_posture: JourneyRoutePostureV1;
  party_profile: JourneyProfileKeyV1;
  condition_posture: JourneyConditionPostureV1;
  departure_cutpoint: JourneyCutpointV1;
  waypoint_anchor_ids?: readonly string[];
  source_refs?: readonly string[];
}

export interface JourneyResolvedFoundationRouteV1 {
  schema_version: typeof JOURNEY_FOUNDATION_RESOLVER_SCHEMA_VERSION;
  status: "resolved_admitted" | "resolved_provisional";
  route_plan_id: string;
  from_anchor: JourneyLocationAnchorV1;
  to_anchor: JourneyLocationAnchorV1;
  waypoint_anchors: readonly JourneyLocationAnchorV1[];
  routing_manor_path: readonly string[];
  edge_path: readonly JourneyRouteEdgeV1[];
  distance_cost: number;
  expected_travel_days: number;
  planning_day_band: Readonly<{ earliest: number; latest: number }>;
  departure_cutpoint: JourneyCutpointV1;
  expected_arrival_cutpoint: JourneyCutpointV1;
  macro_corridor_edge_ids: readonly string[];
  macro_route_tiers: readonly string[];
  crossing_ids: readonly string[];
  background_traffic_evidence: Readonly<{
    forward: JourneyBackgroundTrafficEvidenceV1 | null;
    reverse: JourneyBackgroundTrafficEvidenceV1 | null;
  }>;
  route_confidence: "low" | "medium" | "high";
  confidence_basis: readonly string[];
  source_refs: readonly string[];
  runtime_authority: boolean;
  named_person_presence_inferred_from_financial_traffic: false;
}

export interface JourneyWithheldFoundationRouteV1 {
  schema_version: typeof JOURNEY_FOUNDATION_RESOLVER_SCHEMA_VERSION;
  status: "withheld" | "blocked";
  reason_codes: readonly string[];
  source_refs: readonly string[];
  runtime_authority: false;
  named_person_presence_inferred_from_financial_traffic: false;
}

export type JourneyFoundationRouteResolutionV1 =
  | JourneyResolvedFoundationRouteV1
  | JourneyWithheldFoundationRouteV1;

export type JourneyStopAcceptanceStateV1 =
  | "accepted"
  | "refused"
  | "unknown"
  | "not_required";
export type JourneyStopCapacityStateV1 =
  | "available"
  | "unavailable"
  | "unknown"
  | "not_required";

export interface JourneyStopResolutionInputV1 {
  stop_id: string;
  location_anchor_id: string;
  provider_kind: JourneyStopProviderKindV1;
  party_profile: JourneyProfileKeyV1;
  condition_posture: JourneyConditionPostureV1;
  provider_entity_id: string | null;
  admission_ref: string | null;
  acceptance_state: JourneyStopAcceptanceStateV1;
  capacity_state: JourneyStopCapacityStateV1;
  self_supported_basis: "light" | "protected_emergency" | "martial" | null;
  source_evidence: readonly JourneyFoundationSourceEvidenceV1[];
}

export type JourneyStopResolutionV1 =
  | {
      status: "eligible_admitted" | "eligible_provisional";
      stop_id: string;
      anchor: JourneyLocationAnchorV1;
      provider_kind: JourneyStopProviderKindV1;
      provider_entity_id: string | null;
      admission_ref: string;
      reason_codes: readonly string[];
      source_refs: readonly string[];
      runtime_authority: boolean;
    }
  | {
      status: "withheld";
      stop_id: string;
      anchor: JourneyLocationAnchorV1 | null;
      provider_kind: JourneyStopProviderKindV1;
      provider_entity_id: string | null;
      admission_ref: string | null;
      reason_codes: readonly string[];
      source_refs: readonly string[];
      runtime_authority: false;
    };

export interface JourneyEdgeCostPolicyResultV1 {
  status: "usable" | "withheld" | "blocked";
  weight?: number;
  reason_code?: string;
}

export interface JourneyEdgeCostPolicyV1 {
  scoreEdge(input: Readonly<{
    edge: JourneyRouteEdgeV1;
    route_posture: JourneyRoutePostureV1;
    party_profile: JourneyProfileKeyV1;
    condition_posture: JourneyConditionPostureV1;
  }>): JourneyEdgeCostPolicyResultV1;
}

export interface JourneyFoundationResolverV1 {
  resolveAnchor(anchorId: string): JourneyAnchorResolutionV1;
  resolveRoute(input: JourneyFoundationRouteRequestV1): JourneyFoundationRouteResolutionV1;
  resolveStop(input: JourneyStopResolutionInputV1): JourneyStopResolutionV1;
  resolveLodging(input: JourneyStopResolutionInputV1): JourneyStopResolutionV1;
}

export interface JourneyRouteStopPlanInputV1 {
  stop: JourneyStopResolutionInputV1;
  arrival_cutpoint: JourneyCutpointV1;
  departure_cutpoint: JourneyCutpointV1;
}

export interface JourneyFoundationBundleV1 {
  anchors: readonly JourneyLocationAnchorV1[];
  route_edges: readonly JourneyRouteEdgeV1[];
  background_traffic_evidence: readonly JourneyBackgroundTrafficEvidenceV1[];
  travel_time_calibration: JourneyTravelTimeCalibrationV1;
}

interface Neighbor {
  to: string;
  edge: JourneyRouteEdgeV1;
}

interface PathResult {
  nodes: string[];
  edges: JourneyRouteEdgeV1[];
  distance: number;
  blockedReasons: string[];
  withheldReasons: string[];
}

interface HeapEntry {
  node: string;
  distance: number;
  pathKey: string;
}

class MinHeap {
  private rows: HeapEntry[] = [];

  push(row: HeapEntry): void {
    this.rows.push(row);
    let index = this.rows.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareHeap(this.rows[parent]!, row) <= 0) break;
      this.rows[index] = this.rows[parent]!;
      index = parent;
    }
    this.rows[index] = row;
  }

  pop(): HeapEntry | null {
    if (this.rows.length === 0) return null;
    const first = this.rows[0]!;
    const last = this.rows.pop()!;
    if (this.rows.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.rows.length) break;
      let child = left;
      if (right < this.rows.length && compareHeap(this.rows[right]!, this.rows[left]!) < 0) child = right;
      if (compareHeap(last, this.rows[child]!) <= 0) break;
      this.rows[index] = this.rows[child]!;
      index = child;
    }
    this.rows[index] = last;
    return first;
  }
}

function compareHeap(left: HeapEntry, right: HeapEntry): number {
  return left.distance - right.distance || left.pathKey.localeCompare(right.pathKey) || left.node.localeCompare(right.node);
}

function stableStrings(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort();
}

function allRuntimeAuthorized(evidence: readonly JourneyFoundationSourceEvidenceV1[]): boolean {
  return evidence.length > 0 && evidence.every(
    (row) => row.source_status === "admitted_runtime_input" && row.runtime_authority,
  );
}

function sourceRefs(evidence: readonly JourneyFoundationSourceEvidenceV1[]): string[] {
  return stableStrings(evidence.map((row) => row.source_ref));
}

function hasCandidateOnly(evidence: readonly JourneyFoundationSourceEvidenceV1[]): boolean {
  return evidence.some((row) => row.source_status === "candidate_evidence_only");
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function phaseDay(phase: JourneyCutpointV1["phase"]): number {
  if (phase === "opening") return 1;
  if (phase === "midmonth") return 15;
  return 30;
}

export function addJourneyDaysToCutpoint(
  departure: JourneyCutpointV1,
  days: number,
): JourneyCutpointV1 {
  if (!Number.isInteger(departure.relative_month) || departure.relative_month < 1) {
    throw new Error("departure relative_month must be a positive integer");
  }
  if (!Number.isInteger(days) || days < 0) throw new Error("travel days must be a non-negative integer");
  const absoluteDay = (departure.relative_month - 1) * 30 + phaseDay(departure.phase) + days;
  const relativeMonth = Math.floor((absoluteDay - 1) / 30) + 1;
  const dayOfMonth = ((absoluteDay - 1) % 30) + 1;
  const phase = dayOfMonth <= 1 ? "opening" : dayOfMonth <= 15 ? "midmonth" : "closing";
  return { relative_month: relativeMonth, phase };
}

function defaultPolicy(): JourneyEdgeCostPolicyV1 {
  return {
    scoreEdge(input): JourneyEdgeCostPolicyResultV1 {
      if (hasCandidateOnly(input.edge.source_evidence)) {
        return { status: "withheld", reason_code: "route_edge_candidate_evidence_only" };
      }
      if (input.route_posture === "safest_viable") {
        return { status: "withheld", reason_code: "safety_weight_not_supplied" };
      }
      if (input.route_posture === "lowest_support_burden") {
        return { status: "withheld", reason_code: "stop_support_weight_not_supplied" };
      }
      return { status: "usable", weight: input.edge.travel_cost_distance };
    },
  };
}

function stopPotentialAllows(
  anchor: JourneyLocationAnchorV1,
  providerKind: JourneyStopProviderKindV1,
): boolean {
  return providerKind === "constrained_self_supported" ||
    anchor.potential_stop_provider_kinds.includes(providerKind);
}

function resolveStopReasons(
  input: JourneyStopResolutionInputV1,
  anchor: JourneyLocationAnchorV1,
): string[] {
  const reasons: string[] = [];
  if (!input.stop_id.trim()) reasons.push("missing_stop_id");
  if (!input.admission_ref?.trim()) reasons.push("missing_stop_admission_ref");
  if (hasCandidateOnly(input.source_evidence)) reasons.push("stop_source_candidate_evidence_only");
  if (!stopPotentialAllows(anchor, input.provider_kind)) reasons.push("provider_kind_not_supported_at_anchor");
  if (input.condition_posture === "blocked_unviable") reasons.push("route_condition_blocked_unviable");

  if (input.provider_kind === "controlled_house_manor") {
    if (input.acceptance_state !== "accepted") reasons.push("house_controlled_access_not_accepted");
    if (input.capacity_state !== "available") reasons.push("house_controlled_lodging_capacity_not_available");
  } else if (input.provider_kind === "accepted_house_or_court") {
    if (input.acceptance_state === "refused") reasons.push("house_or_court_host_refused");
    else if (input.acceptance_state !== "accepted") reasons.push("house_or_court_host_acceptance_missing");
    if (input.capacity_state !== "available") reasons.push("house_or_court_capacity_not_available");
  } else if (input.provider_kind === "accepted_church_or_institution") {
    if (input.acceptance_state === "refused") reasons.push("church_or_institution_refused");
    else if (input.acceptance_state !== "accepted") reasons.push("church_or_institution_acceptance_missing");
    if (input.capacity_state !== "available") reasons.push("church_or_institution_capacity_not_available");
  } else if (input.provider_kind === "eligible_aggregate_commercial") {
    if (!input.provider_entity_id?.trim()) reasons.push("commercial_provider_entity_missing");
    if (input.acceptance_state !== "accepted") reasons.push("commercial_service_acceptance_missing");
    if (input.capacity_state !== "available") reasons.push("commercial_service_capacity_not_available");
  } else {
    const allowedProfile = input.party_profile === "light_personal" ||
      input.party_profile === "protected_transfer" || input.party_profile === "martial_party";
    if (!allowedProfile) reasons.push("party_profile_not_eligible_for_self_supported_stop");
    if (!input.self_supported_basis) reasons.push("self_supported_basis_missing");
    if (input.self_supported_basis === "light" && input.party_profile !== "light_personal") {
      reasons.push("light_self_support_requires_light_personal_profile");
    }
    if (input.self_supported_basis === "protected_emergency" && input.party_profile !== "protected_transfer") {
      reasons.push("protected_self_support_requires_protected_transfer_profile");
    }
    if (input.self_supported_basis === "martial" && input.party_profile !== "martial_party") {
      reasons.push("martial_self_support_requires_martial_party_profile");
    }
  }
  return stableStrings(reasons);
}

export function buildJourneyFoundationResolver(
  bundle: JourneyFoundationBundleV1,
  edgeCostPolicy: JourneyEdgeCostPolicyV1 = defaultPolicy(),
): JourneyFoundationResolverV1 {
  const anchors = new Map<string, JourneyLocationAnchorV1>();
  for (const anchor of bundle.anchors) {
    if (anchors.has(anchor.anchor_id)) throw new Error(`duplicate Journey anchor ${anchor.anchor_id}`);
    anchors.set(anchor.anchor_id, anchor);
  }

  const adjacency = new Map<string, Neighbor[]>();
  for (const edge of bundle.route_edges) {
    if (!Number.isFinite(edge.travel_cost_distance) || edge.travel_cost_distance <= 0) {
      throw new Error(`${edge.edge_id} has invalid travel_cost_distance`);
    }
    const left = adjacency.get(edge.from_manor_id) ?? [];
    left.push({ to: edge.to_manor_id, edge });
    adjacency.set(edge.from_manor_id, left);
    const right = adjacency.get(edge.to_manor_id) ?? [];
    right.push({ to: edge.from_manor_id, edge });
    adjacency.set(edge.to_manor_id, right);
  }
  for (const neighbors of adjacency.values()) {
    neighbors.sort((left, right) => left.to.localeCompare(right.to) || left.edge.edge_id.localeCompare(right.edge.edge_id));
  }

  const traffic = new Map<string, JourneyBackgroundTrafficEvidenceV1>();
  for (const row of bundle.background_traffic_evidence) {
    traffic.set(`${row.from_manor_id}->${row.to_manor_id}`, row);
  }

  function resolveAnchor(anchorId: string): JourneyAnchorResolutionV1 {
    const cleaned = anchorId.trim();
    const anchor = anchors.get(cleaned) ?? null;
    if (!anchor) {
      return { status: "withheld", anchor: null, source_refs: [], reason_codes: ["unknown_location_anchor"] };
    }
    const refs = sourceRefs(anchor.source_evidence);
    const reasons: string[] = [];
    if (anchor.anchor_status === "unresolved_missing_current_map_hex") reasons.push("location_hex_missing_from_current_map");
    if (anchor.anchor_status === "unresolved_missing_manor_graph_link") reasons.push("location_missing_manor_graph_link");
    if (!anchor.routing_manor_id) reasons.push("location_not_route_ready");
    if (hasCandidateOnly(anchor.source_evidence)) reasons.push("location_source_candidate_evidence_only");
    if (reasons.length > 0) {
      return { status: "withheld", anchor, source_refs: refs, reason_codes: stableStrings(reasons) };
    }
    return {
      status: allRuntimeAuthorized(anchor.source_evidence) ? "resolved_admitted" : "resolved_provisional",
      anchor,
      source_refs: refs,
      reason_codes: [],
    };
  }

  function shortestPath(
    from: string,
    to: string,
    request: JourneyFoundationRouteRequestV1,
  ): PathResult {
    if (from === to) return { nodes: [from], edges: [], distance: 0, blockedReasons: [], withheldReasons: [] };
    const heap = new MinHeap();
    const distances = new Map<string, number>([[from, 0]]);
    const pathKeys = new Map<string, string>([[from, ""]]);
    const previous = new Map<string, { node: string; edge: JourneyRouteEdgeV1 }>();
    const blockedReasons = new Set<string>();
    const withheldReasons = new Set<string>();
    heap.push({ node: from, distance: 0, pathKey: "" });

    while (true) {
      const current = heap.pop();
      if (!current) break;
      if (current.distance !== distances.get(current.node) || current.pathKey !== pathKeys.get(current.node)) continue;
      if (current.node === to) break;
      for (const neighbor of adjacency.get(current.node) ?? []) {
        const score = edgeCostPolicy.scoreEdge({
          edge: neighbor.edge,
          route_posture: request.route_posture,
          party_profile: request.party_profile,
          condition_posture: request.condition_posture,
        });
        if (score.status !== "usable" || !Number.isFinite(score.weight) || (score.weight ?? 0) <= 0) {
          if (score.status === "blocked") blockedReasons.add(score.reason_code ?? "route_edge_blocked");
          else withheldReasons.add(score.reason_code ?? "route_edge_weight_withheld");
          continue;
        }
        const nextDistance = current.distance + score.weight!;
        const nextPathKey = `${current.pathKey}|${neighbor.edge.edge_id}`;
        const knownDistance = distances.get(neighbor.to);
        const knownPathKey = pathKeys.get(neighbor.to);
        const better = knownDistance === undefined || nextDistance < knownDistance - 1e-9 ||
          (Math.abs(nextDistance - knownDistance) <= 1e-9 && nextPathKey < (knownPathKey ?? "~"));
        if (!better) continue;
        distances.set(neighbor.to, nextDistance);
        pathKeys.set(neighbor.to, nextPathKey);
        previous.set(neighbor.to, { node: current.node, edge: neighbor.edge });
        heap.push({ node: neighbor.to, distance: nextDistance, pathKey: nextPathKey });
      }
    }

    if (!distances.has(to)) {
      return {
        nodes: [],
        edges: [],
        distance: Number.POSITIVE_INFINITY,
        blockedReasons: stableStrings([...blockedReasons]),
        withheldReasons: stableStrings([...withheldReasons]),
      };
    }
    const nodes = [to];
    const edges: JourneyRouteEdgeV1[] = [];
    let cursor = to;
    while (cursor !== from) {
      const step = previous.get(cursor);
      if (!step) throw new Error(`Journey route reconstruction failed at ${cursor}`);
      nodes.push(step.node);
      edges.push(step.edge);
      cursor = step.node;
    }
    nodes.reverse();
    edges.reverse();
    return { nodes, edges, distance: distances.get(to)!, blockedReasons: [], withheldReasons: [] };
  }

  function resolveRoute(input: JourneyFoundationRouteRequestV1): JourneyFoundationRouteResolutionV1 {
    const requestedRefs = stableStrings(input.source_refs ?? []);
    if (input.condition_posture === "blocked_unviable") {
      return withheldRoute("blocked", ["route_condition_blocked_unviable"], requestedRefs);
    }
    if (input.route_posture === "domain_required" && !(input.waypoint_anchor_ids?.length)) {
      return withheldRoute("withheld", ["domain_required_route_needs_waypoint_anchor"], requestedRefs);
    }
    const endpoints = [input.from_anchor_id, ...(input.waypoint_anchor_ids ?? []), input.to_anchor_id];
    const resolutions = endpoints.map(resolveAnchor);
    const anchorReasons = stableStrings(resolutions.flatMap((row) => row.reason_codes));
    const resolvedAnchors = resolutions.flatMap((row) => row.anchor ? [row.anchor] : []);
    const anchorRefs = stableStrings(resolutions.flatMap((row) => row.source_refs));
    if (anchorReasons.length > 0 || resolvedAnchors.length !== endpoints.length) {
      return withheldRoute("withheld", anchorReasons.length ? anchorReasons : ["location_anchor_resolution_failed"], [...requestedRefs, ...anchorRefs]);
    }
    const fromAnchor = resolvedAnchors[0]!;
    const toAnchor = resolvedAnchors[resolvedAnchors.length - 1]!;
    const allNodes: string[] = [];
    const allEdges: JourneyRouteEdgeV1[] = [];
    let distance = 0;
    for (let index = 0; index < resolvedAnchors.length - 1; index += 1) {
      const left = resolvedAnchors[index]!.routing_manor_id!;
      const right = resolvedAnchors[index + 1]!.routing_manor_id!;
      const segment = shortestPath(left, right, input);
      if (segment.nodes.length === 0) {
        const blocked = segment.blockedReasons.length > 0;
        const reasons = blocked
          ? segment.blockedReasons
          : segment.withheldReasons.length > 0
            ? segment.withheldReasons
            : ["no_connected_route_path"];
        return withheldRoute(blocked ? "blocked" : "withheld", reasons, [...requestedRefs, ...anchorRefs]);
      }
      allNodes.push(...(index === 0 ? segment.nodes : segment.nodes.slice(1)));
      allEdges.push(...segment.edges);
      distance += segment.distance;
    }

    const rate = bundle.travel_time_calibration.cost_units_per_day_by_profile[input.party_profile];
    const multiplier = bundle.travel_time_calibration.condition_duration_multiplier[input.condition_posture];
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(multiplier) || multiplier <= 0) {
      return withheldRoute("withheld", ["travel_time_calibration_missing_or_invalid"], [...requestedRefs, ...anchorRefs]);
    }
    const expectedDays = distance === 0 ? 0 : Math.max(1, Math.ceil((distance / rate) * multiplier));
    const earliest = expectedDays === 0 ? 0 : Math.max(1, Math.floor(expectedDays * 0.85));
    const latest = expectedDays === 0 ? 0 : Math.max(expectedDays, Math.ceil(expectedDays * 1.2));
    const edgeEvidence = allEdges.flatMap((edge) => edge.source_evidence);
    const allEvidence = [...resolvedAnchors.flatMap((anchor) => anchor.source_evidence), ...edgeEvidence];
    const runtimeAuthority = allRuntimeAuthorized(allEvidence) &&
      bundle.travel_time_calibration.source_status === "admitted_runtime_input" &&
      bundle.travel_time_calibration.runtime_authority;
    const macroIds = stableStrings(allEdges.flatMap((edge) => edge.macro_corridor_edge_ids));
    const tiers = stableStrings(allEdges.flatMap((edge) => edge.macro_route_tiers));
    const crossings = stableStrings(allEdges.flatMap((edge) => edge.crossing_ids));
    const forwardTraffic = traffic.get(`${fromAnchor.routing_manor_id}->${toAnchor.routing_manor_id}`) ?? null;
    const reverseTraffic = traffic.get(`${toAnchor.routing_manor_id}->${fromAnchor.routing_manor_id}`) ?? null;
    const trafficRich = Boolean(forwardTraffic || reverseTraffic);
    const confidence = runtimeAuthority ? "high" : macroIds.length > 0 || trafficRich ? "medium" : "low";
    const refs = stableStrings([
      ...requestedRefs,
      ...anchorRefs,
      ...sourceRefs(edgeEvidence),
      ...bundle.travel_time_calibration.source_refs,
      ...sourceRefs(forwardTraffic?.source_evidence ?? []),
      ...sourceRefs(reverseTraffic?.source_evidence ?? []),
    ]);
    const pathKey = `${fromAnchor.anchor_id}|${toAnchor.anchor_id}|${allEdges.map((edge) => edge.edge_id).join("|")}|${input.party_profile}|${input.condition_posture}`;
    return {
      schema_version: JOURNEY_FOUNDATION_RESOLVER_SCHEMA_VERSION,
      status: runtimeAuthority ? "resolved_admitted" : "resolved_provisional",
      route_plan_id: `journey:route:${fnv1a(pathKey)}`,
      from_anchor: fromAnchor,
      to_anchor: toAnchor,
      waypoint_anchors: resolvedAnchors.slice(1, -1),
      routing_manor_path: allNodes,
      edge_path: allEdges,
      distance_cost: Number(distance.toFixed(4)),
      expected_travel_days: expectedDays,
      planning_day_band: { earliest, latest },
      departure_cutpoint: { ...input.departure_cutpoint },
      expected_arrival_cutpoint: addJourneyDaysToCutpoint(input.departure_cutpoint, expectedDays),
      macro_corridor_edge_ids: macroIds,
      macro_route_tiers: tiers,
      crossing_ids: crossings,
      background_traffic_evidence: { forward: forwardTraffic, reverse: reverseTraffic },
      route_confidence: confidence,
      confidence_basis: stableStrings([
        runtimeAuthority ? "all_path_inputs_admitted" : "foundation_a_provisional_path_spine",
        macroIds.length ? "macro_corridor_overlay_present" : "macro_corridor_overlay_absent",
        crossings.length ? "crossing_evidence_present" : null,
        trafficRich ? "background_financial_lane_evidence_present_without_named_presence_inference" : null,
      ]),
      source_refs: refs,
      runtime_authority: runtimeAuthority,
      named_person_presence_inferred_from_financial_traffic: false,
    };
  }

  function resolveStop(input: JourneyStopResolutionInputV1): JourneyStopResolutionV1 {
    const anchorResolution = resolveAnchor(input.location_anchor_id);
    const anchor = anchorResolution.anchor;
    const refs = stableStrings([...anchorResolution.source_refs, ...sourceRefs(input.source_evidence)]);
    if (!anchor || anchorResolution.status === "withheld") {
      return {
        status: "withheld",
        stop_id: input.stop_id,
        anchor,
        provider_kind: input.provider_kind,
        provider_entity_id: input.provider_entity_id,
        admission_ref: input.admission_ref,
        reason_codes: stableStrings([...anchorResolution.reason_codes, "stop_location_not_route_ready"]),
        source_refs: refs,
        runtime_authority: false,
      };
    }
    const reasons = resolveStopReasons(input, anchor);
    if (reasons.length > 0) {
      return {
        status: "withheld",
        stop_id: input.stop_id,
        anchor,
        provider_kind: input.provider_kind,
        provider_entity_id: input.provider_entity_id,
        admission_ref: input.admission_ref,
        reason_codes: reasons,
        source_refs: refs,
        runtime_authority: false,
      };
    }
    const runtimeAuthority = anchorResolution.status === "resolved_admitted" && allRuntimeAuthorized(input.source_evidence);
    return {
      status: runtimeAuthority ? "eligible_admitted" : "eligible_provisional",
      stop_id: input.stop_id,
      anchor,
      provider_kind: input.provider_kind,
      provider_entity_id: input.provider_entity_id,
      admission_ref: input.admission_ref!,
      reason_codes: [],
      source_refs: refs,
      runtime_authority: runtimeAuthority,
    };
  }

  return {
    resolveAnchor,
    resolveRoute,
    resolveStop,
    resolveLodging: resolveStop,
  };
}

function withheldRoute(
  status: "withheld" | "blocked",
  reasons: readonly string[],
  refs: readonly string[],
): JourneyWithheldFoundationRouteV1 {
  return {
    schema_version: JOURNEY_FOUNDATION_RESOLVER_SCHEMA_VERSION,
    status,
    reason_codes: stableStrings(reasons),
    source_refs: stableStrings(refs),
    runtime_authority: false,
    named_person_presence_inferred_from_financial_traffic: false,
  };
}

export function adaptJourneyFoundationToRouteResolver(
  foundation: JourneyFoundationResolverV1,
  options: Readonly<{
    conditionForRequest?: (request: Readonly<JourneyRequestV1>) => JourneyConditionPostureV1;
    waypointsForRequest?: (request: Readonly<JourneyRequestV1>) => readonly string[];
    stopsForResolvedRoute?: (
      request: Readonly<JourneyRequestV1>,
      route: Readonly<JourneyResolvedFoundationRouteV1>,
    ) => readonly JourneyRouteStopPlanInputV1[];
  }> = {},
): JourneyRouteResolverV1 {
  return {
    resolveNamedJourneyRoute(request: Readonly<JourneyRequestV1>): JourneyRouteResolutionV1 {
      const conditionPosture = options.conditionForRequest?.(request) ?? "normal";
      const resolution = foundation.resolveRoute({
        from_anchor_id: request.origin_location_id,
        to_anchor_id: request.destination_location_id,
        route_posture: request.route_posture,
        party_profile: request.profile_key,
        condition_posture: conditionPosture,
        departure_cutpoint: request.desired_window.earliest_departure,
        waypoint_anchor_ids: options.waypointsForRequest?.(request) ?? [],
        source_refs: request.source_refs,
      });
      if (!("route_plan_id" in resolution)) {
        return {
          status: "withheld",
          reason_codes: stableStrings([
            ...(resolution.status === "blocked" ? ["route_blocked"] : []),
            ...resolution.reason_codes,
          ]),
          source_refs: resolution.source_refs,
        };
      }
      const plannedStops: JourneyResolvedStopV1[] = [];
      const stopRefs: string[] = [];
      let allStopsRuntimeAuthorized = true;
      let priorStopPathIndex = -1;
      let priorStopDepartureCutpoint: JourneyCutpointV1 | null = null;
      let totalStopDays = 0;
      for (const plan of options.stopsForResolvedRoute?.(request, resolution) ?? []) {
        const suppliedStopRefs = sourceRefs(plan.stop.source_evidence);
        const contractFailures: string[] = [];
        if (plan.stop.party_profile !== request.profile_key) {
          contractFailures.push("party_profile_mismatch");
        }
        if (plan.stop.condition_posture !== conditionPosture) {
          contractFailures.push("condition_posture_mismatch");
        }
        if (!validJourneyCutpoint(plan.arrival_cutpoint) ||
            !validJourneyCutpoint(plan.departure_cutpoint)) {
          contractFailures.push("invalid_stop_cutpoint");
        } else {
          if (compareJourneyCutpoints(
            plan.arrival_cutpoint,
            plan.departure_cutpoint,
          ) > 0) {
            contractFailures.push("stop_time_reversed");
          }
          if (compareJourneyCutpoints(
            plan.arrival_cutpoint,
            resolution.departure_cutpoint,
          ) < 0) {
            contractFailures.push("stop_arrives_before_route_departure");
          }
          if (compareJourneyCutpoints(
            plan.departure_cutpoint,
            resolution.expected_arrival_cutpoint,
          ) > 0) {
            contractFailures.push("stop_departs_after_route_arrival");
          }
        }
        if (contractFailures.length > 0) {
          return {
            status: "withheld",
            reason_codes: stableStrings(contractFailures.map(
              (code) => `stop:${plan.stop.stop_id}:${code}`,
            )),
            source_refs: stableStrings([
              ...resolution.source_refs,
              ...suppliedStopRefs,
            ]),
          };
        }
        const stopResolution = foundation.resolveLodging(plan.stop);
        stopRefs.push(...stopResolution.source_refs);
        if (stopResolution.status === "withheld" || !stopResolution.anchor) {
          return {
            status: "withheld",
            reason_codes: stableStrings(
              stopResolution.reason_codes.map(
                (code) => `stop:${plan.stop.stop_id}:${code}`,
              ),
            ),
            source_refs: stableStrings([...resolution.source_refs, ...stopResolution.source_refs]),
          };
        }
        const stopPathIndex = stopResolution.anchor.routing_manor_id
          ? resolution.routing_manor_path.indexOf(
              stopResolution.anchor.routing_manor_id,
            )
          : -1;
        if (stopPathIndex <= 0 ||
            stopPathIndex >= resolution.routing_manor_path.length - 1) {
          return {
            status: "withheld",
            reason_codes: [`stop:${plan.stop.stop_id}:stop_not_on_resolved_route_interior`],
            source_refs: stableStrings([...resolution.source_refs, ...stopResolution.source_refs]),
          };
        }
        if (stopPathIndex <= priorStopPathIndex) {
          return {
            status: "withheld",
            reason_codes: [`stop:${plan.stop.stop_id}:stop_not_in_resolved_route_order`],
            source_refs: stableStrings([...resolution.source_refs, ...stopResolution.source_refs]),
          };
        }
        if (priorStopDepartureCutpoint && compareJourneyCutpoints(
          plan.arrival_cutpoint,
          priorStopDepartureCutpoint,
        ) < 0) {
          return {
            status: "withheld",
            reason_codes: [
              `stop:${plan.stop.stop_id}:stop_chronology_conflicts_with_route_order`,
            ],
            source_refs: stableStrings([
              ...resolution.source_refs,
              ...stopResolution.source_refs,
            ]),
          };
        }
        priorStopPathIndex = stopPathIndex;
        priorStopDepartureCutpoint = { ...plan.departure_cutpoint };
        totalStopDays += Math.max(
          0,
          journeyCutpointDayOrdinal(plan.departure_cutpoint) -
            journeyCutpointDayOrdinal(plan.arrival_cutpoint),
        );
        allStopsRuntimeAuthorized =
          allStopsRuntimeAuthorized && stopResolution.runtime_authority;
        plannedStops.push({
          stop_id: stopResolution.stop_id,
          location_id: stopResolution.anchor.anchor_id,
          provider_kind: stopResolution.provider_kind,
          admission_ref: stopResolution.admission_ref,
          arrival_cutpoint: { ...plan.arrival_cutpoint },
          departure_cutpoint: { ...plan.departure_cutpoint },
          host_entity_id: stopResolution.provider_entity_id,
          source_refs: stopResolution.source_refs,
        });
      }
      const leg: JourneyResolvedRouteLegV1 = {
        route_leg_id: `${resolution.route_plan_id}:leg:1`,
        sequence_no: 1,
        from_location_id: request.origin_location_id,
        to_location_id: request.destination_location_id,
        selected_route_path_ref: resolution.route_plan_id,
        // A mapped crossing is evidence that the route traverses a feature; it
        // is not itself proof of a toll, ferry, franchise, or access right.
        // Exact right references must arrive through a later admitted rights
        // resolver before Journey may emit a toll/ferry support demand.
        crossing_access_right_refs: [],
          planned_stops: plannedStops,
        condition_posture: conditionPosture,
        departure_cutpoint: resolution.departure_cutpoint,
        arrival_cutpoint: resolution.expected_arrival_cutpoint,
        distance_cost: resolution.distance_cost,
        expected_travel_days: resolution.expected_travel_days,
        source_status:
          resolution.status === "resolved_admitted" && allStopsRuntimeAuthorized
            ? "admitted"
            : "foundation_a_provisional",
        source_refs: stableStrings([
          ...resolution.source_refs,
          ...resolution.crossing_ids.map((id) => `crossing_evidence:${id}`),
          ...stopRefs,
        ]),
      };
      const availableElapsedDays = Math.max(
        0,
        journeyCutpointDayOrdinal(leg.arrival_cutpoint) -
          journeyCutpointDayOrdinal(leg.departure_cutpoint),
      );
      if (leg.expected_travel_days + totalStopDays > availableElapsedDays) {
        return {
          status: "withheld",
          reason_codes: ["planned_stop_time_exceeds_resolved_route_schedule"],
          source_refs: leg.source_refs,
        };
      }
      return {
        status: "resolved",
        route_plan_id: resolution.route_plan_id,
        legs: [leg],
        source_refs: stableStrings([
          ...resolution.source_refs,
          ...resolution.crossing_ids.map((id) => `crossing_evidence:${id}`),
          ...stopRefs,
        ]),
      };
    },
  };
}
