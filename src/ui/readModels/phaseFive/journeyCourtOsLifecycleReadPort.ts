import type {
  JourneyArrangementRuntimeRowV1,
  JourneyRuntimeV1,
} from "../../../sim/domains/journey/journeyLifecycle";
import {
  CURRENT_COURTOS_RESPONSIBILITY_KEYS,
  getJourneyTriggerDefinition,
  type CurrentCourtOsResponsibilityKeyV1,
  type JourneyTriggerIdV1,
} from "../../../sim/phaseFive/journeyDomainAdapter";
import {
  courtOsResponsibility,
  type CourtOsResponsibilityDesignKey,
} from "../../courtosInformationArchitecture";
import {
  courtOsResponsibilityRoute,
  courtOsSearchForRoute,
} from "../../courtosRoute";
import type {
  JourneyCourtOsEntitlementV1,
  JourneyCourtOsLifecycleReadPortV1,
  JourneyCourtOsViewerContextV1,
  JourneyDisplayRefV1,
  JourneyDomainCommandLinkV1,
  JourneyLifecycleProjectionInputV1,
  JourneyLifecycleStatusV1,
  JourneyMatterProjectionInputV1,
  JourneyReportProjectionInputV1,
} from "./journeyCourtOsReadModel";

export const JOURNEY_COURTOS_LIFECYCLE_READ_PORT_SCHEMA_VERSION =
  "phase_five_journey_courtos_lifecycle_read_port_v1" as const;

export interface JourneyCourtOsRuntimeSourceV1 {
  runtime: Readonly<JourneyRuntimeV1>;
  calendar_epoch: {
    opening_year: number;
    opening_month: number;
  };
  source_refs: readonly string[];
  runtime_authority: true;
}

/**
 * This binding is supplied by the purpose-owning domain when a Journey is
 * admitted.  House ownership and business scope are never inferred from the
 * principal's residence, the sponsor string, or Inner Council membership.
 */
export interface JourneyCourtOsHouseScopeBindingV1 {
  journey_arrangement_id: string;
  acting_house_id: string;
  owning_scope_id: string | null;
  source_refs: readonly string[];
  runtime_authority: true;
}

export interface JourneyCourtOsLifecycleAuthorityBindingV1 {
  journey_arrangement_id: string;
  trigger_source_status: "admitted_runtime_input";
  party_source_status: "admitted_runtime_input";
  route_source_status: "admitted_runtime_input";
  support_source_status: "admitted_runtime_input";
  source_refs: readonly string[];
  runtime_authority: true;
}

export interface JourneyCourtOsDomainActionIntentV1 {
  command_id: string;
  command_kind: Exclude<JourneyDomainCommandLinkV1["command_kind"], "open_owning_workspace">;
  label: string;
  enabled: boolean;
  withheld_reason: string | null;
}

export interface JourneyCourtOsKnowledgeProjectionV1 {
  schema_version: "phase_five_journey_courtos_knowledge_projection_v1";
  journey_arrangement_id: string;
  viewer_person_id: string;
  acting_house_id: string;
  as_of_cutpoint_id: string;
  entitlement: JourneyCourtOsEntitlementV1;
  knowledge_posture: JourneyLifecycleProjectionInputV1["knowledge_posture"];
  primary_purpose_label: string;
  principal: JourneyDisplayRefV1;
  origin: JourneyDisplayRefV1;
  destination: JourneyDisplayRefV1;
  named_party: readonly JourneyDisplayRefV1[];
  route_posture_label: string;
  end_posture_label: string;
  aggregate_party_summary: string | null;
  absence_and_coverage_summary: string | null;
  schedule_effect_summary: string | null;
  last_known_location_label: string | null;
  report: JourneyReportProjectionInputV1 | null;
  matters: readonly JourneyMatterProjectionInputV1[];
  domain_action_intents: readonly JourneyCourtOsDomainActionIntentV1[];
  source_status: "runtime_receipt" | "admitted_read_model";
  source_refs: readonly string[];
  runtime_authority: true;
}

export interface JourneyCourtOsKnowledgeGatewayV1 {
  /** Null means the viewer is not entitled even to the Journey's existence. */
  readJourneyKnowledge(input: Readonly<{
    viewer_context: JourneyCourtOsViewerContextV1;
    journey_arrangement_id: string;
    acting_house_id: string;
  }>): JourneyCourtOsKnowledgeProjectionV1 | null;
}

export interface JourneyCourtOsLifecycleReadPortSourceV1 {
  schema_version: typeof JOURNEY_COURTOS_LIFECYCLE_READ_PORT_SCHEMA_VERSION;
  runtime_source: JourneyCourtOsRuntimeSourceV1;
  lifecycle_authority_bindings: readonly JourneyCourtOsLifecycleAuthorityBindingV1[];
  house_scope_bindings: readonly JourneyCourtOsHouseScopeBindingV1[];
  knowledge_gateway: JourneyCourtOsKnowledgeGatewayV1;
}

type WorkspacePlacement = {
  workspace_ref: string;
  workspace_label: string;
  command_owner_ref: string;
  responsibility_key: CurrentCourtOsResponsibilityKeyV1 | null;
};

function clean(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field}_required`);
  return value.trim();
}

function stableStrings(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort();
}

function isCurrentResponsibilityKey(value: string): value is CurrentCourtOsResponsibilityKeyV1 {
  return (CURRENT_COURTOS_RESPONSIBILITY_KEYS as readonly string[]).includes(value);
}

function designKey(value: CurrentCourtOsResponsibilityKeyV1): CourtOsResponsibilityDesignKey {
  const unprefixed = value.replace(/^courtos\.responsibility\./u, "");
  return courtOsResponsibility(unprefixed as CourtOsResponsibilityDesignKey).key;
}

export function journeyCourtOsWorkspacePlacement(input: {
  trigger_id: JourneyTriggerIdV1;
  owning_scope_id: string | null;
}): WorkspacePlacement {
  const trigger = getJourneyTriggerDefinition(input.trigger_id);
  if (isCurrentResponsibilityKey(trigger.decision_owner_key)) {
    const key = designKey(trigger.decision_owner_key);
    const route = courtOsResponsibilityRoute({
      responsibility: key,
      scopeId: input.owning_scope_id,
    });
    return {
      workspace_ref: courtOsSearchForRoute("", route),
      workspace_label: courtOsResponsibility(key).label,
      command_owner_ref: trigger.decision_owner_key,
      responsibility_key: trigger.decision_owner_key,
    };
  }
  return {
    workspace_ref: courtOsSearchForRoute("", {
      place: { kind: "house_command" },
      detail: null,
    }),
    workspace_label: "House Command",
    command_owner_ref: trigger.decision_owner_key,
    responsibility_key: null,
  };
}

function destinationLegSequence(arrangement: JourneyRuntimeV1["arrangements_by_id"][string]): number {
  if (arrangement.destination_stay_leg_id) {
    return arrangement.legs.find((leg) => leg.route_leg_id === arrangement.destination_stay_leg_id)?.sequence_no ?? 1;
  }
  return arrangement.legs.at(-1)?.sequence_no ?? 1;
}

function lifecycleStatus(
  arrangement: JourneyRuntimeV1["arrangements_by_id"][string],
  runtime: JourneyArrangementRuntimeRowV1,
): { status: JourneyLifecycleStatusV1; label: string } {
  const activeSequence = runtime.active_leg_id
    ? arrangement.legs.find((leg) => leg.route_leg_id === runtime.active_leg_id)?.sequence_no ?? 1
    : 1;
  const returning = arrangement.return_or_end_posture === "return" &&
    activeSequence > destinationLegSequence(arrangement);
  switch (runtime.status) {
    case "planned": return { status: "scheduled", label: "Scheduled" };
    case "in_transit": return returning
      ? { status: "returning", label: "Returning" }
      : { status: "in_transit", label: "On the road" };
    case "at_stop": return returning
      ? { status: "returning", label: "Stopped on the return road" }
      : { status: "in_transit", label: "Stopped en route" };
    case "at_destination": return { status: "at_destination", label: "At the destination" };
    case "needs_review": return { status: "needs_review", label: "Needs review" };
    case "completed": return { status: "completed", label: "Completed" };
    case "cancelled": return { status: "cancelled", label: "Cancelled" };
    case "superseded": return { status: "superseded", label: "Superseded" };
    case "failed": return { status: "failed", label: "Failed" };
  }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function absoluteMonth(
  relativeMonth: number,
  epoch: JourneyCourtOsRuntimeSourceV1["calendar_epoch"],
): number {
  return epoch.opening_year * 12 + (epoch.opening_month - 1) + (relativeMonth - 1);
}

function cutpointLabel(
  cutpoint: { relative_month: number; phase: string } | null | undefined,
  epoch: JourneyCourtOsRuntimeSourceV1["calendar_epoch"],
): string | null {
  if (!cutpoint) return null;
  const month = absoluteMonth(cutpoint.relative_month, epoch);
  const year = Math.floor(month / 12);
  const monthInYear = month % 12;
  return `${MONTH_NAMES[monthInYear]} ${year} · ${cutpoint.phase}`;
}

function openWorkspaceCommand(placement: WorkspacePlacement): JourneyDomainCommandLinkV1 {
  return {
    command_id: `courtos.open-owning-workspace:${placement.command_owner_ref}`,
    command_kind: "open_owning_workspace",
    command_owner_ref: placement.command_owner_ref,
    label: `Open ${placement.workspace_label}`,
    enabled: true,
    withheld_reason: null,
  };
}

function domainCommands(
  placement: WorkspacePlacement,
  knowledge: JourneyCourtOsKnowledgeProjectionV1,
): JourneyDomainCommandLinkV1[] {
  if (!knowledge.entitlement.domain_actions_visible) return [];
  return [
    openWorkspaceCommand(placement),
    ...knowledge.domain_action_intents.map((intent) => ({
      ...intent,
      command_owner_ref: placement.command_owner_ref,
    })),
  ].sort((left, right) => left.command_id.localeCompare(right.command_id));
}

function validateKnowledge(input: {
  knowledge: JourneyCourtOsKnowledgeProjectionV1;
  viewer: JourneyCourtOsViewerContextV1;
  arrangementId: string;
  houseId: string;
}): boolean {
  const { knowledge, viewer } = input;
  if (
    knowledge.journey_arrangement_id !== input.arrangementId ||
    knowledge.viewer_person_id !== viewer.viewer_person_id ||
    knowledge.acting_house_id !== input.houseId ||
    knowledge.as_of_cutpoint_id !== viewer.as_of_cutpoint_id ||
    knowledge.runtime_authority !== true
  ) {
    throw new Error(`journey_knowledge_scope_mismatch:${input.arrangementId}`);
  }
  return knowledge.entitlement.governance_visible;
}

export function createJourneyCourtOsLifecycleReadPort(
  source: JourneyCourtOsLifecycleReadPortSourceV1,
): JourneyCourtOsLifecycleReadPortV1 {
  if (source.schema_version !== JOURNEY_COURTOS_LIFECYCLE_READ_PORT_SCHEMA_VERSION) {
    throw new Error("unsupported_journey_courtos_lifecycle_read_port_schema");
  }
  if (source.runtime_source.runtime_authority !== true) {
    throw new Error("journey_courtos_requires_runtime_authoritative_source");
  }
  if (!Number.isInteger(source.runtime_source.calendar_epoch.opening_year) ||
      !Number.isInteger(source.runtime_source.calendar_epoch.opening_month) ||
      source.runtime_source.calendar_epoch.opening_month < 1 ||
      source.runtime_source.calendar_epoch.opening_month > 12) {
    throw new Error("journey_courtos_requires_valid_calendar_epoch");
  }
  const lifecycleAuthorityByArrangement = new Map<
    string,
    JourneyCourtOsLifecycleAuthorityBindingV1
  >();
  for (const binding of source.lifecycle_authority_bindings) {
    const arrangementId = clean(
      binding.journey_arrangement_id,
      "journey_arrangement_id",
    );
    if (lifecycleAuthorityByArrangement.has(arrangementId)) {
      throw new Error(`duplicate_journey_lifecycle_authority:${arrangementId}`);
    }
    const arrangement = source.runtime_source.runtime.arrangements_by_id[arrangementId];
    if (!arrangement) {
      throw new Error(`journey_lifecycle_authority_missing_arrangement:${arrangementId}`);
    }
    if (binding.runtime_authority !== true || binding.source_refs.length === 0 ||
        binding.trigger_source_status !== "admitted_runtime_input" ||
        binding.party_source_status !== "admitted_runtime_input" ||
        binding.route_source_status !== "admitted_runtime_input" ||
        binding.support_source_status !== "admitted_runtime_input" ||
        arrangement.legs.some((leg) => leg.source_status !== "admitted")) {
      throw new Error(`journey_lifecycle_authority_not_admitted:${arrangementId}`);
    }
    lifecycleAuthorityByArrangement.set(arrangementId, binding);
  }
  const bindingsByArrangement = new Map<string, JourneyCourtOsHouseScopeBindingV1>();
  for (const binding of source.house_scope_bindings) {
    const arrangementId = clean(binding.journey_arrangement_id, "journey_arrangement_id");
    clean(binding.acting_house_id, "acting_house_id");
    if (binding.runtime_authority !== true) throw new Error(`journey_house_scope_not_authoritative:${arrangementId}`);
    if (!lifecycleAuthorityByArrangement.has(arrangementId)) {
      throw new Error(`journey_house_scope_without_lifecycle_authority:${arrangementId}`);
    }
    if (bindingsByArrangement.has(arrangementId)) throw new Error(`duplicate_journey_house_scope:${arrangementId}`);
    bindingsByArrangement.set(arrangementId, binding);
  }

  return {
    readJourneyLifecycleForCourtOs(viewerContext) {
      const viewer: JourneyCourtOsViewerContextV1 = {
        viewer_person_id: clean(viewerContext.viewer_person_id, "viewer_person_id"),
        acting_house_id: clean(viewerContext.acting_house_id, "acting_house_id"),
        as_of_cutpoint_id: clean(viewerContext.as_of_cutpoint_id, "as_of_cutpoint_id"),
        development_uat_provenance_enabled: viewerContext.development_uat_provenance_enabled,
      };
      const runtime = source.runtime_source.runtime;
      const rows: JourneyLifecycleProjectionInputV1[] = [];
      for (const [arrangementId, binding] of [...bindingsByArrangement.entries()].sort()) {
        // House filtering occurs before Knowledge is queried. This prevents a
        // viewer from learning that another House has a Journey at all.
        if (binding.acting_house_id !== viewer.acting_house_id) continue;
        const arrangement = runtime.arrangements_by_id[arrangementId];
        const arrangementRuntime = runtime.runtime_by_arrangement_id[arrangementId];
        if (!arrangement || !arrangementRuntime ||
            !lifecycleAuthorityByArrangement.has(arrangementId)) continue;
        const knowledge = source.knowledge_gateway.readJourneyKnowledge({
          viewer_context: viewer,
          journey_arrangement_id: arrangementId,
          acting_house_id: binding.acting_house_id,
        });
        if (!knowledge || !validateKnowledge({
          knowledge,
          viewer,
          arrangementId,
          houseId: binding.acting_house_id,
        })) continue;

        const trigger = getJourneyTriggerDefinition(arrangement.trigger_id as JourneyTriggerIdV1);
        const placement = journeyCourtOsWorkspacePlacement({
          trigger_id: trigger.trigger_id,
          owning_scope_id: binding.owning_scope_id,
        });
        const sortedLegs = [...arrangement.legs].sort((left, right) => left.sequence_no - right.sequence_no);
        const firstLeg = sortedLegs[0];
        const lastLeg = sortedLegs[sortedLegs.length - 1];
        if (!firstLeg || !lastLeg) continue;
        const destinationLeg = arrangement.destination_stay_leg_id
          ? sortedLegs.find((leg) => leg.route_leg_id === arrangement.destination_stay_leg_id) ?? firstLeg
          : lastLeg;
        const hasReturnLeg = arrangement.return_or_end_posture === "return" &&
          lastLeg.sequence_no > destinationLeg.sequence_no;
        const status = lifecycleStatus(arrangement, arrangementRuntime);
        const principalPresence = runtime.presence_ledger.people_by_id[arrangement.principal_person_id];
        const receipts = runtime.presence_ledger.receipts.filter(
          (receipt) => receipt.journey_arrangement_id === arrangementId,
        );
        const commands = domainCommands(placement, knowledge);
        rows.push({
          journey_record_id: `journey-record:${arrangementId}`,
          journey_request_id: arrangement.journey_request_id,
          journey_arrangement_id: arrangementId,
          trigger_id: trigger.trigger_id,
          primary_purpose_ref: arrangement.primary_purpose_ref,
          primary_purpose_label: knowledge.primary_purpose_label,
          owning_domain_ref: placement.command_owner_ref,
          owning_responsibility_key: placement.responsibility_key,
          decision_owner_responsibility_instance_id: arrangement.decision_owner_responsibility_instance_id,
          competent_proceeding_ref: arrangement.competent_proceeding_ref,
          owning_workspace_ref: placement.workspace_ref,
          owning_workspace_label: placement.workspace_label,
          acting_house_id: binding.acting_house_id,
          principal: knowledge.principal,
          origin: knowledge.origin,
          destination: knowledge.destination,
          departure_window_label: cutpointLabel(firstLeg.departure_cutpoint, source.runtime_source.calendar_epoch) ?? "Departure not known",
          departure_absolute_month: absoluteMonth(
            firstLeg.departure_cutpoint.relative_month,
            source.runtime_source.calendar_epoch,
          ),
          expected_arrival_label: cutpointLabel(
            destinationLeg.arrival_cutpoint,
            source.runtime_source.calendar_epoch,
          ),
          return_window_label: hasReturnLeg
            ? `${cutpointLabel(lastLeg.departure_cutpoint, source.runtime_source.calendar_epoch)} to ${cutpointLabel(lastLeg.arrival_cutpoint, source.runtime_source.calendar_epoch)}`
            : null,
          planned_stay_label: arrangement.planned_destination_stay
            ? `${cutpointLabel(arrangement.planned_destination_stay.arrival_cutpoint, source.runtime_source.calendar_epoch)} to ${cutpointLabel(arrangement.planned_destination_stay.departure_cutpoint, source.runtime_source.calendar_epoch)}`
            : null,
          route_posture_label: knowledge.route_posture_label,
          end_posture_label: knowledge.end_posture_label,
          lifecycle_status: status.status,
          status_label: status.label,
          last_known_location_label: knowledge.entitlement.operational_visible
            ? knowledge.last_known_location_label ?? (principalPresence?.location_id === knowledge.destination.id
              ? knowledge.destination.label
              : principalPresence?.location_id === knowledge.origin.id
                ? knowledge.origin.label
                : null)
            : null,
          named_party: knowledge.named_party,
          aggregate_party_summary: knowledge.aggregate_party_summary,
          absence_and_coverage_summary: knowledge.absence_and_coverage_summary,
          schedule_effect_summary: knowledge.schedule_effect_summary,
          knowledge_posture: knowledge.knowledge_posture,
          report: knowledge.report,
          matters: knowledge.matters.map((matter) => ({
            ...matter,
            command_links: matter.command_links.map((command) => ({
              ...command,
              command_owner_ref: placement.command_owner_ref,
            })),
          })),
          command_links: commands,
          entitlement: knowledge.entitlement,
          source_status: knowledge.source_status,
          runtime_authority: true,
          source_refs: stableStrings([
            ...source.runtime_source.source_refs,
            ...arrangement.source_refs,
            ...binding.source_refs,
            ...knowledge.source_refs,
            ...receipts.map((receipt) => receipt.journey_receipt_id),
          ]),
        });
      }
      return rows;
    },
  };
}
