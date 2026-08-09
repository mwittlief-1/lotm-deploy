import fs from "node:fs";
import path from "node:path";

export const COUNCIL_ROOM_READY_PROJECTION_SCHEMA_VERSION = "council_room_ready_projection_v1" as const;
export const DEFAULT_COUNCIL_ROOM_TURN_YEAR = 1120 as const;
export const DEFAULT_COUNCIL_ROOM_HOUSE_ID = "t0h_bcae5bd911ab10f4c7fdfea0" as const;

type AuthorityFields = {
  id: string;
  object_api_name?: string;
  source_id: string;
  source_version_id?: string;
  source_row_id_sha256?: string;
  source_row_index?: number;
  source_truth_layer?: string;
  authority_status?: string;
  runtime_authority?: boolean;
  ui_authority?: boolean;
  command_authority?: boolean;
  live_mutation_authorized?: boolean;
};

export type CouncilRoomCommandStateV1 = "actionable" | "review_only" | "blocked" | "future_authorized";

export type CouncilRoomSourceRefV1 = {
  source_id: string;
  object_api_name: string;
  row_id: string;
  source_version_id?: string;
  source_row_id_sha256?: string;
  source_truth_layer?: string;
  authority_status?: string;
  runtime_authority: false;
};

type HouseRow = AuthorityFields & {
  display_name: string;
};

type CouncilBodyRow = AuthorityFields & {
  house_id: string;
  head_person_id: string;
  head_name?: string | null;
  head_age?: number | null;
  heir_person_id?: string | null;
  heir_name?: string | null;
  heir_age?: number | null;
  entity_label: string;
  house_label: string;
  council_kind: string;
  target_inner_seats: number;
  selected_inner_seats: number;
  candidate_pool_size: number;
  house_office_candidate_rows?: number | null;
  cut_rows_emitted?: number | null;
  succession_disposition?: string | null;
  regency_required?: boolean | null;
};

type CouncilSeatRow = AuthorityFields & {
  council_body_id: string;
  house_id: string;
  person_id: string;
  current_house_id?: string | null;
  seat_rank: number;
  portfolio: string;
  access_level?: string | null;
  decision_weight_band?: string | null;
  display_name: string;
  person_style?: string | null;
  age_turn0?: number | null;
  sex?: string | null;
  relationship_to_head?: string | null;
  membership_basis?: string | null;
  linked_office_titles?: string | null;
  selection_logic?: string | null;
  council_note?: string | null;
};

type CouncilAttendeeRow = AuthorityFields & {
  council_body_id: string;
  house_id: string;
  person_id: string;
  display_name: string;
  person_style?: string | null;
  age_turn0?: number | null;
  relationship_to_head?: string | null;
  current_house_label?: string | null;
  portfolios?: string | null;
  linked_office_titles?: string | null;
  availability_reason?: string | null;
  score?: number | null;
  summoned_by_default?: boolean | null;
};

type MatterSignalRow = AuthorityFields & {
  matter_family_id?: string | null;
  entity_house_id?: string | null;
  authority_holder_house_id?: string | null;
  source_label?: string | null;
  signal_kind?: string | null;
  priority_hint?: string | null;
  confidence_band?: string | null;
  entity_label?: string | null;
  affected_subject_label?: string | null;
  county?: string | null;
  route_family?: string | null;
  manor_count?: number | null;
  named_operator_slots_required?: number | null;
  named_operator_slots_unassigned?: number | null;
  selected_presenter_person_id?: string | null;
  selected_presenter_name?: string | null;
  selected_presenter_portfolio?: string | null;
  presenter_portfolio_candidates?: string[] | null;
  presenter_basis?: string | null;
  presenter_gap_flag?: string | null;
  recommended_posture_hint?: string | null;
  blocked_reason?: string | null;
};

type MatterClusterRow = AuthorityFields & {
  matter_family_id?: string | null;
  entity_house_id?: string | null;
  entity_label?: string | null;
  title?: string | null;
  one_line_summary?: string | null;
  county?: string | null;
  route_family?: string | null;
  source_signal_count?: number | null;
  route_signal_count?: number | null;
  slot_signal_count?: number | null;
  resident_coverage_signal_count?: number | null;
  max_priority_hint?: string | null;
  authorization_floor?: string | null;
  promotion_candidate?: boolean | null;
  promotion_reason?: string | null;
  selected_presenter_person_id?: string | null;
  selected_presenter_name?: string | null;
  selected_presenter_portfolio?: string | null;
  presenter_basis?: string | null;
  recommended_posture?: string | null;
  blocked_reason?: string | null;
  related_matter_signal_ids?: string[] | null;
};

type CouncilAgendaCandidateRow = AuthorityFields & {
  matter_cluster_id?: string | null;
  matter_family_id?: string | null;
  entity_house_id?: string | null;
  entity_label?: string | null;
  title?: string | null;
  one_line_summary?: string | null;
  why_now?: string | null;
  priority_hint?: string | null;
  recommended_posture?: string | null;
  source_basis?: string | null;
  confidence_visibility?: string | null;
  presenter_person_id?: string | null;
  presenter_name?: string | null;
  presenter_portfolio?: string | null;
  presenter_basis?: string | null;
  risk_consequence?: string | null;
  blocked_reason?: string | null;
  available_commands?: string[] | null;
  related_matter_signal_ids?: string[] | null;
  command_state?: string | null;
};

export type CouncilRoomPersonRefV1 = {
  entity_type: "person";
  entity_id: string;
  display_name: string;
  age_turn0?: number | null;
  sex?: string | null;
};

export type CouncilRoomHouseRefV1 = {
  entity_type: "house";
  entity_id: string;
  display_name: string;
};

export type CouncilRoomParticipantV1 = {
  participant_id: string;
  participant_kind: "inner_council_seat" | "summoned_or_available_attendee";
  person_ref: CouncilRoomPersonRefV1;
  portfolio: string;
  role_label: string;
  meta_label?: string;
  seat_rank?: number;
  score?: number | null;
  table_position: { x: number; y: number; width: number };
  state: CouncilRoomCommandStateV1;
  source_refs: CouncilRoomSourceRefV1[];
};

export type CouncilRoomAgendaItemV1 = {
  agenda_item_id: string;
  agenda_item_kind: "candidate_agenda" | "fact_cluster_agenda";
  title: string;
  status_label: string;
  source_hint: string;
  responsible_ref: CouncilRoomPersonRefV1 | null;
  responsible_label: string;
  responsible_portfolio?: string | null;
  presenter_basis?: string | null;
  consequence: string;
  command_label: string;
  state: CouncilRoomCommandStateV1;
  selected: boolean;
  priority_hint?: string | null;
  source_refs: CouncilRoomSourceRefV1[];
  related_signal_count: number;
};

export type CouncilRoomReadyProjectionV1 = {
  schema_version: typeof COUNCIL_ROOM_READY_PROJECTION_SCHEMA_VERSION;
  projection_kind: "council_room_ready_projection";
  status: "ready_source_projection_non_mutating";
  turn: {
    year: number;
    label: string;
    turn_index: number;
  };
  house_ref: CouncilRoomHouseRefV1;
  council_body: {
    council_id: string;
    council_kind: string;
    target_inner_seats: number;
    selected_inner_seats: number;
    candidate_pool_size: number;
    cut_rows_emitted: number | null;
    regency_required: boolean;
  };
  head_ref: CouncilRoomPersonRefV1;
  heir_ref: CouncilRoomPersonRefV1 | null;
  participants: CouncilRoomParticipantV1[];
  inner_council_seats: CouncilRoomParticipantV1[];
  summoned_or_available_attendees: CouncilRoomParticipantV1[];
  agenda_items: CouncilRoomAgendaItemV1[];
  agenda_generation: {
    algorithm_id: "fact_backed_council_agenda_v1";
    agenda_candidate_count: number;
    fact_cluster_count: number;
    compiled_agenda_item_count: number;
    fallback_synthesis_used: false;
    fact_cluster_preview_used: boolean;
    source_gap_flags: string[];
  };
  manifest_validation: {
    environment_id: string;
    ready_manifest_schema_version: string;
    production_adapters_must_read_manifest: boolean;
    source_boundary_status: "passed";
    promoted_source_ids: string[];
    blocked_source_zone_refs: string[];
    record_count_checks: Array<{
      object_api_name: string;
      actual_count: number;
      manifest_count: number;
      status: "passed";
    }>;
  };
  command_surface: {
    command_application_authorized: false;
    overlay_application_authorized: false;
    ledger_posting_authorized: false;
    direct_sim_mutation_authorized: false;
  };
  source_limits: string[];
};

type CouncilReadyDataset = {
  houses: HouseRow[];
  councilBodies: CouncilBodyRow[];
  councilSeats: CouncilSeatRow[];
  attendees: CouncilAttendeeRow[];
  matterClusters: MatterClusterRow[];
  matterSignals: MatterSignalRow[];
  agendaCandidates: CouncilAgendaCandidateRow[];
};

type CouncilRoomReadyIndexV1 = {
  schema_version: "council_room_ready_index_v1";
  environment_id: "world_1120_turn0";
  status: "promoted_ready_read_model_projection_non_runtime";
  projection_only_not_source_truth: true;
  read_model_only: true;
  runtime_authority: false;
  command_authority: false;
  live_mutation_authorized: false;
  manifest_validation: CouncilRoomReadyProjectionV1["manifest_validation"];
  dataset: CouncilReadyDataset;
};

const COUNCIL_ROOM_READY_INDEX_PATH = path.resolve(
  process.env.COURTOS_DATA_ROOT || process.cwd(),
  "data/ready/world_1120_turn0/readmodels/council_room_ready_index_v1/council_room_ready_index_v1.json",
);
const councilRoomReadyIndex = JSON.parse(
  fs.readFileSync(COUNCIL_ROOM_READY_INDEX_PATH, "utf8"),
) as CouncilRoomReadyIndexV1;
const dataset: CouncilReadyDataset = councilRoomReadyIndex.dataset;

function validateReadySourceBoundary(): CouncilRoomReadyProjectionV1["manifest_validation"] {
  if (
    councilRoomReadyIndex.schema_version !== "council_room_ready_index_v1" ||
    councilRoomReadyIndex.environment_id !== "world_1120_turn0" ||
    councilRoomReadyIndex.status !== "promoted_ready_read_model_projection_non_runtime"
  ) {
    throw new Error("Council Room ready index is not the promoted world_1120_turn0 projection");
  }
  if (
    !councilRoomReadyIndex.projection_only_not_source_truth ||
    !councilRoomReadyIndex.read_model_only ||
    councilRoomReadyIndex.runtime_authority ||
    councilRoomReadyIndex.command_authority ||
    councilRoomReadyIndex.live_mutation_authorized
  ) {
    throw new Error("Council Room ready index unexpectedly has source-truth or runtime authority");
  }
  if (councilRoomReadyIndex.manifest_validation.source_boundary_status !== "passed") {
    throw new Error("Council Room ready index source-boundary validation is not passed");
  }
  return councilRoomReadyIndex.manifest_validation;
}

function indexById<T extends { id: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

function required<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`Missing required Council Room ready row: ${label}`);
  return value;
}

function sourceRef(row: AuthorityFields): CouncilRoomSourceRefV1 {
  return {
    source_id: row.source_id,
    object_api_name: row.object_api_name ?? "Unknown",
    row_id: row.id,
    source_version_id: row.source_version_id,
    source_row_id_sha256: row.source_row_id_sha256,
    source_truth_layer: row.source_truth_layer,
    authority_status: row.authority_status,
    runtime_authority: false
  };
}

function personRefFromFields(personId: string, displayName?: string | null, age?: number | null, sex?: string | null): CouncilRoomPersonRefV1 {
  return {
    entity_type: "person",
    entity_id: personId,
    display_name: displayName ?? personId,
    age_turn0: age ?? null,
    sex: sex ?? null
  };
}

function commandStateFromSource(value: string | null | undefined): CouncilRoomCommandStateV1 {
  if (value === "actionable") return "actionable";
  if (value === "future_authorized") return "future_authorized";
  if (value === "blocked" || value === "preview_blocked") return "blocked";
  return "review_only";
}

function priorityRank(value: string | null | undefined): number {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "critical") return 0;
  if (normalized === "blocker") return 1;
  if (normalized === "high") return 2;
  if (normalized === "normal") return 3;
  if (normalized === "low") return 4;
  if (normalized === "routine") return 5;
  return 6;
}

function statusLabelForCluster(row: MatterClusterRow): string {
  if (row.promotion_candidate) return "Review required";
  if (row.promotion_reason === "routine_cluster_not_promoted") return "Routine report";
  return row.authorization_floor ?? "Fact preview";
}

function clusterCommandState(row: MatterClusterRow): CouncilRoomCommandStateV1 {
  if (row.promotion_candidate) return "blocked";
  return "review_only";
}

function participantState(row: CouncilSeatRow | CouncilAttendeeRow): CouncilRoomCommandStateV1 {
  if ("access_level" in row && row.access_level === "inner") return "actionable";
  return "review_only";
}

const seatPositions = [
  { x: 50, y: 24, width: 15 },
  { x: 63, y: 37, width: 14 },
  { x: 55, y: 44, width: 14 },
  { x: 37, y: 37, width: 14 },
  { x: 43, y: 47, width: 13 },
  { x: 57, y: 47, width: 13 },
  { x: 70, y: 43, width: 12 },
  { x: 30, y: 43, width: 12 },
  { x: 58, y: 29, width: 12 },
  { x: 42, y: 29, width: 12 }
];

const attendeePositions = [
  { x: 26, y: 27, width: 12 },
  { x: 74, y: 27, width: 12 },
  { x: 26, y: 56, width: 12 },
  { x: 74, y: 56, width: 12 },
  { x: 50, y: 64, width: 12 },
  { x: 50, y: 16, width: 12 }
];

function seatToParticipant(row: CouncilSeatRow, index: number): CouncilRoomParticipantV1 {
  return {
    participant_id: row.id,
    participant_kind: "inner_council_seat",
    person_ref: personRefFromFields(row.person_id, row.display_name, row.age_turn0, row.sex),
    portfolio: row.portfolio,
    role_label: row.linked_office_titles || row.relationship_to_head || row.portfolio,
    meta_label: [row.membership_basis, row.decision_weight_band].filter(Boolean).join(" / "),
    seat_rank: row.seat_rank,
    table_position: seatPositions[index % seatPositions.length] ?? seatPositions[0]!,
    state: participantState(row),
    source_refs: [sourceRef(row)]
  };
}

function attendeeToParticipant(row: CouncilAttendeeRow, index: number): CouncilRoomParticipantV1 {
  return {
    participant_id: row.id,
    participant_kind: "summoned_or_available_attendee",
    person_ref: personRefFromFields(row.person_id, row.display_name, row.age_turn0, null),
    portfolio: row.portfolios ?? "summoned_attendee",
    role_label: row.linked_office_titles || row.relationship_to_head || "Available attendee",
    meta_label: row.availability_reason ?? undefined,
    score: row.score ?? null,
    table_position:
      attendeePositions[index % attendeePositions.length] ?? attendeePositions[0]!,
    state: "review_only",
    source_refs: [sourceRef(row)]
  };
}

function findPresenter(args: {
  participants: readonly CouncilRoomParticipantV1[];
  personId?: string | null;
  personName?: string | null;
  portfolio?: string | null;
  basis?: string | null;
  fallbackHeadId: string;
}): { ref: CouncilRoomPersonRefV1; label: string; basis: string } {
  if (args.personId) {
    const participant = args.participants.find((entry) => entry.person_ref.entity_id === args.personId);
    const ref = participant?.person_ref ?? personRefFromFields(args.personId, args.personName);
    return { ref, label: ref.display_name, basis: args.basis ?? "selected_presenter_person_id" };
  }

  if (args.portfolio) {
    const exact = args.participants.find((participant) => participant.portfolio === args.portfolio);
    if (exact) return { ref: exact.person_ref, label: exact.person_ref.display_name, basis: "portfolio_match" };
  }

  const head = args.participants.find((participant) => participant.portfolio === "headship");
  if (head) return { ref: head.person_ref, label: head.person_ref.display_name, basis: "headship_fallback" };

  const ref = personRefFromFields(args.fallbackHeadId, "House head");
  return { ref, label: ref.display_name, basis: "head_person_fallback" };
}

function agendaFromCandidate(
  row: CouncilAgendaCandidateRow,
  args: {
    participants: readonly CouncilRoomParticipantV1[];
    signalById: Map<string, MatterSignalRow>;
    clusterById: Map<string, MatterClusterRow>;
    headPersonId: string;
    selected: boolean;
  }
): CouncilRoomAgendaItemV1 {
  const presenter = findPresenter({
    participants: args.participants,
    personId: row.presenter_person_id,
    personName: row.presenter_name,
    portfolio: row.presenter_portfolio,
    basis: row.presenter_basis,
    fallbackHeadId: args.headPersonId
  });
  const relatedSignals = (row.related_matter_signal_ids ?? []).map((id) => args.signalById.get(id)).filter((entry): entry is MatterSignalRow => Boolean(entry));
  const cluster = row.matter_cluster_id ? args.clusterById.get(row.matter_cluster_id) : null;
  return {
    agenda_item_id: row.id,
    agenda_item_kind: "candidate_agenda",
    title: row.title ?? "Council agenda candidate",
    status_label: row.confidence_visibility ?? row.command_state ?? "Agenda candidate",
    source_hint: row.source_basis ?? "CouncilAgendaCandidate__c",
    responsible_ref: presenter.ref,
    responsible_label: presenter.label,
    responsible_portfolio: row.presenter_portfolio,
    presenter_basis: presenter.basis,
    consequence: row.risk_consequence ?? row.one_line_summary ?? "Candidate is promoted for council review.",
    command_label: row.available_commands && row.available_commands.length > 0 ? row.available_commands[0] ?? "Inspect" : "Inspect candidate",
    state: commandStateFromSource(row.command_state),
    selected: args.selected,
    priority_hint: row.priority_hint,
    source_refs: [sourceRef(row), ...(cluster ? [sourceRef(cluster)] : []), ...relatedSignals.map(sourceRef)],
    related_signal_count: relatedSignals.length
  };
}

function agendaFromCluster(
  row: MatterClusterRow,
  args: {
    participants: readonly CouncilRoomParticipantV1[];
    signalById: Map<string, MatterSignalRow>;
    headPersonId: string;
    selected: boolean;
  }
): CouncilRoomAgendaItemV1 {
  const relatedSignals = (row.related_matter_signal_ids ?? []).map((id) => args.signalById.get(id)).filter((entry): entry is MatterSignalRow => Boolean(entry));
  const firstSignal = relatedSignals[0];
  const presenter = findPresenter({
    participants: args.participants,
    personId: row.selected_presenter_person_id ?? firstSignal?.selected_presenter_person_id,
    personName: row.selected_presenter_name ?? firstSignal?.selected_presenter_name,
    portfolio: row.selected_presenter_portfolio ?? firstSignal?.selected_presenter_portfolio,
    basis: row.presenter_basis ?? firstSignal?.presenter_basis,
    fallbackHeadId: args.headPersonId
  });
  const signalCount = relatedSignals.length || row.source_signal_count || 0;
  return {
    agenda_item_id: `fact_agenda:${row.id}`,
    agenda_item_kind: "fact_cluster_agenda",
    title: row.title ?? "Council fact requires review",
    status_label: statusLabelForCluster(row),
    source_hint: `${signalCount} MatterSignal fact${signalCount === 1 ? "" : "s"} / ${row.authorization_floor ?? "source preview"}`,
    responsible_ref: presenter.ref,
    responsible_label: presenter.label,
    responsible_portfolio: row.selected_presenter_portfolio ?? firstSignal?.selected_presenter_portfolio,
    presenter_basis: presenter.basis,
    consequence: row.blocked_reason ?? row.one_line_summary ?? "Fact cluster is visible for council review.",
    command_label: row.promotion_candidate ? "Review blocked fact" : "Inspect fact",
    state: clusterCommandState(row),
    selected: args.selected,
    priority_hint: row.max_priority_hint,
    source_refs: [sourceRef(row), ...relatedSignals.map(sourceRef)],
    related_signal_count: signalCount
  };
}

function sortAgenda(left: CouncilRoomAgendaItemV1, right: CouncilRoomAgendaItemV1): number {
  return (
    priorityRank(left.priority_hint) - priorityRank(right.priority_hint) ||
    left.agenda_item_kind.localeCompare(right.agenda_item_kind) ||
    left.agenda_item_id.localeCompare(right.agenda_item_id)
  );
}

export function buildCouncilRoomReadyProjection(input: {
  houseId: string;
  turnYear?: number;
}): CouncilRoomReadyProjectionV1 {
  const turnYear = input.turnYear ?? DEFAULT_COUNCIL_ROOM_TURN_YEAR;
  const manifestValidation = validateReadySourceBoundary();
  const houseById = indexById(dataset.houses);
  const signalById = indexById(dataset.matterSignals);
  const clusterById = indexById(dataset.matterClusters);

  const house = required(houseById.get(input.houseId), `House__c ${input.houseId}`);
  const councilBody = required(
    dataset.councilBodies.find((row) => row.house_id === input.houseId && row.council_kind === "house_council"),
    `CouncilBody__c for ${input.houseId}`
  );

  const seats = dataset.councilSeats
    .filter((row) => row.house_id === input.houseId && row.council_body_id === councilBody.id)
    .sort((left, right) => left.seat_rank - right.seat_rank || left.id.localeCompare(right.id))
    .map((row, index) => seatToParticipant(row, index));

  const attendees = dataset.attendees
    .filter((row) => row.house_id === input.houseId && row.council_body_id === councilBody.id)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0) || left.id.localeCompare(right.id))
    .map((row, index) => attendeeToParticipant(row, index));

  const participants = [...seats, ...attendees];
  const headFromSeat = participants.find((participant) => participant.person_ref.entity_id === councilBody.head_person_id)?.person_ref;
  const headRef = headFromSeat ?? personRefFromFields(councilBody.head_person_id, councilBody.head_name, councilBody.head_age);
  const heirRef = councilBody.heir_person_id
    ? personRefFromFields(councilBody.heir_person_id, councilBody.heir_name, councilBody.heir_age)
    : null;
  const candidateRows = dataset.agendaCandidates
    .filter((row) => row.entity_house_id === input.houseId)
    .sort((left, right) => priorityRank(left.priority_hint) - priorityRank(right.priority_hint) || (left.source_row_index ?? 0) - (right.source_row_index ?? 0) || left.id.localeCompare(right.id));
  const candidateClusterIds = new Set(candidateRows.map((row) => row.matter_cluster_id).filter((id): id is string => Boolean(id)));
  const clusterRows = dataset.matterClusters
    .filter((row) => row.entity_house_id === input.houseId && !candidateClusterIds.has(row.id))
    .sort((left, right) => priorityRank(left.max_priority_hint) - priorityRank(right.max_priority_hint) || (left.source_row_index ?? 0) - (right.source_row_index ?? 0) || left.id.localeCompare(right.id));

  const agendaItems = [
    ...candidateRows.map((row, index) =>
      agendaFromCandidate(row, {
        participants,
        signalById,
        clusterById,
        headPersonId: councilBody.head_person_id,
        selected: index === 0
      })
    ),
    ...clusterRows.map((row, index) =>
      agendaFromCluster(row, {
        participants,
        signalById,
        headPersonId: councilBody.head_person_id,
        selected: candidateRows.length === 0 && index === 0
      })
    )
  ].sort(sortAgenda).map((item, index) => ({ ...item, selected: index === 0 }));

  return {
    schema_version: COUNCIL_ROOM_READY_PROJECTION_SCHEMA_VERSION,
    projection_kind: "council_room_ready_projection",
    status: "ready_source_projection_non_mutating",
    turn: {
      year: turnYear,
      label: "First Council",
      turn_index: 1
    },
    house_ref: {
      entity_type: "house",
      entity_id: house.id,
      display_name: house.display_name
    },
    council_body: {
      council_id: councilBody.id,
      council_kind: councilBody.council_kind,
      target_inner_seats: councilBody.target_inner_seats,
      selected_inner_seats: councilBody.selected_inner_seats,
      candidate_pool_size: councilBody.candidate_pool_size,
      cut_rows_emitted: councilBody.cut_rows_emitted ?? null,
      regency_required: councilBody.regency_required === true
    },
    head_ref: headRef,
    heir_ref: heirRef,
    participants,
    inner_council_seats: seats,
    summoned_or_available_attendees: attendees,
    agenda_items: agendaItems,
    agenda_generation: {
      algorithm_id: "fact_backed_council_agenda_v1",
      agenda_candidate_count: candidateRows.length,
      fact_cluster_count: clusterRows.length,
      compiled_agenda_item_count: agendaItems.length,
      fallback_synthesis_used: false,
      fact_cluster_preview_used: clusterRows.length > 0,
      source_gap_flags: agendaItems.length === 0 ? ["no_promoted_agenda_candidates_or_fact_clusters_for_house"] : []
    },
    manifest_validation: manifestValidation,
    command_surface: {
      command_application_authorized: false,
      overlay_application_authorized: false,
      ledger_posting_authorized: false,
      direct_sim_mutation_authorized: false
    },
    source_limits: [
      "Council Room projection reads only data/ready source bundles.",
      "Fact-cluster agenda items are preview/review rows, not runtime commands.",
      "No command application, runtime overlay, ledger posting, office mutation, or turn advance is authorized."
    ]
  };
}
