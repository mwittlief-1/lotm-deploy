import type {
  JourneyArrangementV1,
  JourneyCutpointV1,
  JourneyLifecycleInterruptionV1,
  JourneyReceiptV1,
  JourneyStayFactV1
} from "./journeyContracts";
import {
  admitJourneyArrangement,
  advanceJourneyRuntime,
  createJourneyRuntime,
  validateJourneyRuntime,
  type JourneyOpeningPresenceInputV1,
  type JourneyRuntimeV1
} from "./journeyLifecycle";
import {
  compareJourneyCutpoints,
  journeyCutpointDayOrdinal,
} from "./journeyTime";

export const JOURNEY_36_MONTH_REPLAY_SCHEMA_VERSION = "phase_five_journey_36_month_replay_v1" as const;
export const JOURNEY_HISTORICAL_CANDIDATE_SCHEMA_VERSION = "phase_five_journey_1117_1119_candidate_v1" as const;

export interface JourneyReplayMonthSummaryV1 {
  relative_month: number;
  world_year: number;
  month_in_year: number;
  new_receipt_ids: readonly string[];
  new_presence_event_ids: readonly string[];
  new_stay_fact_ids: readonly string[];
  new_handoff_intent_ids: readonly string[];
  active_arrangement_ids: readonly string[];
  review_required_arrangement_ids: readonly string[];
}

export interface JourneyThirtySixMonthReplayV1 {
  schema_version: typeof JOURNEY_36_MONTH_REPLAY_SCHEMA_VERSION;
  replay_id: string;
  start_year: number;
  month_count: 36;
  admitted_arrangement_ids: readonly string[];
  withheld_arrangements: readonly { journey_arrangement_id: string; reason_codes: readonly string[] }[];
  month_summaries: readonly JourneyReplayMonthSummaryV1[];
  final_runtime: JourneyRuntimeV1;
  deterministic_digest: string;
  source_refs: readonly string[];
  source_candidate_only: true;
  direct_domain_mutation: false;
  direct_resource_or_gl_mutation: false;
  direct_art_mutation: false;
}

export type JourneyHistoricalPurposeSourceStatusV1 = "immutable_known_event" | "generated_sim_receipt";

export interface JourneyHistoricalPurposeV1 {
  arrangement: JourneyArrangementV1;
  purpose_source_status: JourneyHistoricalPurposeSourceStatusV1;
  purpose_source_ref: string;
  host_acceptance_source_ref: string | null;
}

export interface JourneyHistoricalReplayInputV1 {
  replay_id: string;
  start_year: 1117;
  route_foundation_ref: string;
  opening_presence: readonly JourneyOpeningPresenceInputV1[];
  purposes: readonly JourneyHistoricalPurposeV1[];
  interruptions?: readonly JourneyLifecycleInterruptionV1[];
  source_refs: readonly string[];
}

export interface JourneyHistoricalCandidateRowV1 {
  candidate_row_id: string;
  world_year: number;
  relative_month: number;
  candidate_kind: "journey_result" | "hosting_person_days" | "domain_handoff";
  journey_arrangement_id: string;
  journey_leg_id: string | null;
  result_or_location: string;
  named_person_count: number;
  human_person_days: number | null;
  animal_days: number | null;
  source_refs: readonly string[];
  source_candidate_only: true;
}

export type JourneyHistoricalReplayCandidateResultV1 =
  | {
      status: "withheld";
      replay_id: string;
      reason_codes: readonly string[];
      source_refs: readonly string[];
    }
  | {
      status: "candidate_built";
      schema_version: typeof JOURNEY_HISTORICAL_CANDIDATE_SCHEMA_VERSION;
      replay: JourneyThirtySixMonthReplayV1;
      candidate_rows: readonly JourneyHistoricalCandidateRowV1[];
      source_refs: readonly string[];
      source_candidate_only: true;
      promotion_authority: false;
    };

function compareStable(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(compareStable);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => compareStable(left, right))
        .map(([key, child]) => [key, stableValue(child)])
    );
  }
  return value;
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function digest(value: unknown): string {
  return `fnv1a32:${fnv1a32(JSON.stringify(stableValue(value)))}`;
}

function monthClose(relativeMonth: number): JourneyCutpointV1 {
  return { relative_month: relativeMonth, phase: "closing" };
}

function worldYear(startYear: number, relativeMonth: number): number {
  return startYear + Math.floor((relativeMonth - 1) / 12);
}

function monthInYear(relativeMonth: number): number {
  return ((relativeMonth - 1) % 12) + 1;
}

function activeArrangements(runtime: JourneyRuntimeV1): string[] {
  return Object.values(runtime.runtime_by_arrangement_id)
    .filter((row) => ["planned", "in_transit", "at_stop", "at_destination"].includes(row.status))
    .map((row) => row.journey_arrangement_id)
    .sort(compareStable);
}

function reviewArrangements(runtime: JourneyRuntimeV1): string[] {
  return Object.values(runtime.runtime_by_arrangement_id)
    .filter((row) => row.status === "needs_review" || row.status === "failed")
    .map((row) => row.journey_arrangement_id)
    .sort(compareStable);
}

export function runJourneyThirtySixMonthReplay(args: {
  replay_id: string;
  start_year: number;
  opening_presence: readonly JourneyOpeningPresenceInputV1[];
  arrangements: readonly JourneyArrangementV1[];
  interruptions?: readonly JourneyLifecycleInterruptionV1[];
  source_refs: readonly string[];
}): JourneyThirtySixMonthReplayV1 {
  let runtime = createJourneyRuntime(args.opening_presence);
  const withheld: Array<{ journey_arrangement_id: string; reason_codes: readonly string[] }> = [];
  const admittedIds: string[] = [];
  const orderedArrangements = [...args.arrangements].sort((left, right) => {
    const leftDeparture = left.legs[0]?.departure_cutpoint.relative_month ?? 99;
    const rightDeparture = right.legs[0]?.departure_cutpoint.relative_month ?? 99;
    return leftDeparture - rightDeparture || compareStable(left.journey_arrangement_id, right.journey_arrangement_id);
  });
  for (const arrangement of orderedArrangements) {
    const admission = admitJourneyArrangement(runtime, arrangement);
    if (admission.status === "withheld") {
      withheld.push({ journey_arrangement_id: arrangement.journey_arrangement_id, reason_codes: admission.reason_codes });
      continue;
    }
    runtime = admission.runtime;
    admittedIds.push(arrangement.journey_arrangement_id);
  }

  const summaries: JourneyReplayMonthSummaryV1[] = [];
  for (let relativeMonth = 1; relativeMonth <= 36; relativeMonth += 1) {
    const before = runtime.presence_ledger;
    const target = monthClose(relativeMonth);
    const activeInterruptions = (args.interruptions ?? []).filter(
      (interruption) =>
        compareJourneyCutpoints(
          interruption.effective_cutpoint,
          runtime.current_cutpoint,
        ) >= 0 &&
        compareJourneyCutpoints(interruption.effective_cutpoint, target) <= 0,
    );
    runtime = advanceJourneyRuntime(runtime, target, activeInterruptions);
    summaries.push({
      relative_month: relativeMonth,
      world_year: worldYear(args.start_year, relativeMonth),
      month_in_year: monthInYear(relativeMonth),
      new_receipt_ids: runtime.presence_ledger.receipts.slice(before.receipts.length).map((row) => row.journey_receipt_id),
      new_presence_event_ids: runtime.presence_ledger.presence_events.slice(before.presence_events.length).map((row) => row.event_id),
      new_stay_fact_ids: runtime.presence_ledger.stay_facts.slice(before.stay_facts.length).map((row) => row.stay_fact_id),
      new_handoff_intent_ids: runtime.presence_ledger.domain_handoff_intents
        .slice(before.domain_handoff_intents.length)
        .map((row) => row.handoff_id),
      active_arrangement_ids: activeArrangements(runtime),
      review_required_arrangement_ids: reviewArrangements(runtime)
    });
  }
  const validationFailures = validateJourneyRuntime(runtime);
  if (validationFailures.length > 0) throw new Error(`journey_replay_runtime_invalid:${validationFailures.join("|")}`);
  const digestInput = {
    replay_id: args.replay_id,
    start_year: args.start_year,
    admitted_arrangement_ids: admittedIds,
    withheld_arrangements: withheld,
    month_summaries: summaries,
    receipts: runtime.presence_ledger.receipts,
    stay_facts: runtime.presence_ledger.stay_facts,
    domain_handoff_intents: runtime.presence_ledger.domain_handoff_intents
  };
  return {
    schema_version: JOURNEY_36_MONTH_REPLAY_SCHEMA_VERSION,
    replay_id: args.replay_id,
    start_year: args.start_year,
    month_count: 36,
    admitted_arrangement_ids: admittedIds,
    withheld_arrangements: withheld,
    month_summaries: summaries,
    final_runtime: runtime,
    deterministic_digest: digest(digestInput),
    source_refs: stableUnique(args.source_refs),
    source_candidate_only: true,
    direct_domain_mutation: false,
    direct_resource_or_gl_mutation: false,
    direct_art_mutation: false
  };
}

function historicalInputFailures(input: JourneyHistoricalReplayInputV1): string[] {
  const failures: string[] = [];
  if (input.start_year !== 1117) failures.push("historical_replay_must_start_1117");
  if (!input.replay_id.trim()) failures.push("missing_replay_id");
  if (!input.route_foundation_ref.trim()) failures.push("missing_route_foundation_ref");
  if (input.opening_presence.length === 0) failures.push("missing_1117_opening_presence");
  if (input.purposes.length === 0) failures.push("no_admitted_historical_journey_purposes");
  if (input.source_refs.length === 0) failures.push("missing_historical_source_refs");
  for (const purpose of input.purposes) {
    if (!purpose.purpose_source_ref.trim()) failures.push(`missing_purpose_source_ref:${purpose.arrangement.journey_arrangement_id}`);
    if (purpose.arrangement.hosting_visit_arrangement_id && !purpose.host_acceptance_source_ref) {
      failures.push(`missing_host_acceptance_source_ref:${purpose.arrangement.journey_arrangement_id}`);
    }
    if (purpose.arrangement.source_refs.length === 0) failures.push(`missing_arrangement_source_refs:${purpose.arrangement.journey_arrangement_id}`);
  }
  return stableUnique(failures);
}

function candidateRows(
  replay: JourneyThirtySixMonthReplayV1,
  purposeByArrangement: ReadonlyMap<string, JourneyHistoricalPurposeV1>
): JourneyHistoricalCandidateRowV1[] {
  const rows: JourneyHistoricalCandidateRowV1[] = [];
  for (const receipt of replay.final_runtime.presence_ledger.receipts) {
    const purpose = purposeByArrangement.get(receipt.journey_arrangement_id)!;
    rows.push({
      candidate_row_id: `historical-journey-row:${receipt.journey_receipt_id}`,
      world_year: worldYear(replay.start_year, receipt.cutpoint.relative_month),
      relative_month: receipt.cutpoint.relative_month,
      candidate_kind: "journey_result",
      journey_arrangement_id: receipt.journey_arrangement_id,
      journey_leg_id: receipt.journey_leg_id,
      result_or_location: receipt.result_code,
      named_person_count: receipt.named_person_ids.length,
      human_person_days: null,
      animal_days: null,
      source_refs: stableUnique([
        ...receipt.source_refs,
        purpose.purpose_source_ref,
        ...(purpose.host_acceptance_source_ref ? [purpose.host_acceptance_source_ref] : [])
      ]),
      source_candidate_only: true
    });
  }
  for (const stay of replay.final_runtime.presence_ledger.stay_facts) {
    const purpose = purposeByArrangement.get(stay.journey_arrangement_id)!;
    const days = Math.max(
      1,
      journeyCutpointDayOrdinal(stay.departure_cutpoint) -
        journeyCutpointDayOrdinal(stay.arrival_cutpoint),
    );
    rows.push({
      candidate_row_id: `historical-journey-row:${stay.stay_fact_id}`,
      world_year: worldYear(replay.start_year, stay.arrival_cutpoint.relative_month),
      relative_month: stay.arrival_cutpoint.relative_month,
      candidate_kind: "hosting_person_days",
      journey_arrangement_id: stay.journey_arrangement_id,
      journey_leg_id: stay.journey_leg_id,
      result_or_location: stay.location_id,
      named_person_count: stay.named_person_count,
      human_person_days: (stay.named_person_count + stay.aggregate_service_person_count) * days,
      animal_days: stay.animal_count * days,
      source_refs: stableUnique([
        ...stay.source_refs,
        purpose.purpose_source_ref,
        ...(purpose.host_acceptance_source_ref ? [purpose.host_acceptance_source_ref] : [])
      ]),
      source_candidate_only: true
    });
  }
  for (const handoff of replay.final_runtime.presence_ledger.domain_handoff_intents) {
    const purpose = purposeByArrangement.get(handoff.journey_arrangement_id)!;
    const receipt = replay.final_runtime.presence_ledger.receipts.find((row) =>
      row.domain_handoff_intent_refs.includes(handoff.handoff_id)
    ) as JourneyReceiptV1 | undefined;
    rows.push({
      candidate_row_id: `historical-journey-row:${handoff.handoff_id}`,
      world_year: worldYear(replay.start_year, receipt?.cutpoint.relative_month ?? 1),
      relative_month: receipt?.cutpoint.relative_month ?? 1,
      candidate_kind: "domain_handoff",
      journey_arrangement_id: handoff.journey_arrangement_id,
      journey_leg_id: handoff.journey_leg_id,
      result_or_location: `${handoff.disposition}:${handoff.arrived_location_id}`,
      named_person_count: 1,
      human_person_days: null,
      animal_days: null,
      source_refs: stableUnique([...handoff.source_refs, purpose.purpose_source_ref]),
      source_candidate_only: true
    });
  }
  return rows.sort((left, right) => compareStable(left.candidate_row_id, right.candidate_row_id));
}

export function buildJourneyHistoricalReplayCandidate(
  input: JourneyHistoricalReplayInputV1
): JourneyHistoricalReplayCandidateResultV1 {
  const failures = historicalInputFailures(input);
  if (failures.length > 0) {
    return {
      status: "withheld",
      replay_id: input.replay_id,
      reason_codes: failures,
      source_refs: stableUnique(input.source_refs)
    };
  }
  const replay = runJourneyThirtySixMonthReplay({
    replay_id: input.replay_id,
    start_year: input.start_year,
    opening_presence: input.opening_presence,
    arrangements: input.purposes.map((row) => row.arrangement),
    interruptions: input.interruptions,
    source_refs: stableUnique([...input.source_refs, input.route_foundation_ref])
  });
  if (replay.withheld_arrangements.length > 0) {
    return {
      status: "withheld",
      replay_id: input.replay_id,
      reason_codes: replay.withheld_arrangements.flatMap((row) =>
        row.reason_codes.map((code) => `${row.journey_arrangement_id}:${code}`)
      ),
      source_refs: stableUnique(input.source_refs)
    };
  }
  const purposeByArrangement = new Map(
    input.purposes.map((row) => [row.arrangement.journey_arrangement_id, row] as const)
  );
  return {
    status: "candidate_built",
    schema_version: JOURNEY_HISTORICAL_CANDIDATE_SCHEMA_VERSION,
    replay,
    candidate_rows: candidateRows(replay, purposeByArrangement),
    source_refs: stableUnique([
      ...input.source_refs,
      input.route_foundation_ref,
      ...input.purposes.flatMap((row) => [
        row.purpose_source_ref,
        ...(row.host_acceptance_source_ref ? [row.host_acceptance_source_ref] : [])
      ])
    ]),
    source_candidate_only: true,
    promotion_authority: false
  };
}
