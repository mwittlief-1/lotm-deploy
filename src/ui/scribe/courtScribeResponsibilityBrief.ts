import type { CourtOsSessionContextV1 } from "../../courtosSessionContext";
import type { CourtOsResponsibilityBriefV1 } from "../responsibilityBriefPresentation";
import {
  COURT_SCRIBE_BRIEFING_PACKET_VERSION,
  type CourtScribeBriefingPacketV1,
} from "./courtScribeBriefingContract";

export interface CourtScribeResponsibilityBriefCompilerInputV1 {
  session: CourtOsSessionContextV1;
  projection_house_id: string;
  authority_generation_id: string;
  workspace_source?: {
    package_id: string;
    source_digest: string | null;
    source_status: string | null;
    source_owned: boolean;
  } | null;
  authority_source: {
    responsibility_summary_id: string;
    responsibility_demand_id: string;
    source_authority_status: string;
    holder_person_id: string | null;
    scope_id: string | null;
  } | null;
  effective_date: string;
  responsibility_id: string;
  steward: { person_id: string; display_name: string } | null;
  scope: { scope_id: string; scope_label: string } | null;
  brief: CourtOsResponsibilityBriefV1;
}

function withheld(message: string): never {
  throw new Error(`CourtOS Scribe responsibility brief withheld: ${message}`);
}

/**
 * Compiles only the facts already approved for the rendered Head's Brief.
 * Workspace rows, evidence/provenance, hidden state, and authored section body
 * prose never cross this boundary.
 */
export function compileCourtScribeResponsibilityBriefPacket(
  input: CourtScribeResponsibilityBriefCompilerInputV1,
): CourtScribeBriefingPacketV1 {
  const { session } = input;
  if (session.selected_house_id !== input.projection_house_id) {
    return withheld("projection House does not match the active session");
  }
  if (session.acting_actor.status !== "house_head" || !session.acting_actor.person_id) {
    return withheld("no source-resolved acting Head may receive this account");
  }
  if (!session.capabilities.inspect_house_records) {
    return withheld("House record inspection is not permitted");
  }
  if (!input.steward?.person_id || !input.steward.display_name) {
    return withheld("no named accountable steward is recorded");
  }
  if (!input.scope?.scope_id || !input.scope.scope_label) {
    return withheld("no exact responsibility scope is recorded");
  }
  if (input.brief.responsibility !== input.responsibility_id) {
    return withheld("rendered brief and responsibility do not agree");
  }
  if (!input.workspace_source?.source_owned || !input.workspace_source.source_digest) {
    return withheld("workspace has no exact owned source binding");
  }
  if (!input.authority_source?.responsibility_summary_id ||
    !input.authority_source.responsibility_demand_id ||
    !input.authority_source.source_authority_status) {
    return withheld("responsibility has no exact compact authority source binding");
  }
  if (input.authority_source.responsibility_summary_id ===
    input.authority_source.responsibility_demand_id) {
    return withheld("compact authority claim identities are not distinct");
  }
  if (input.authority_source.holder_person_id !== input.steward.person_id) {
    return withheld("steward does not match the exact compact authority row");
  }
  if (input.authority_source.scope_id !== input.scope.scope_id) {
    return withheld("scope does not match the exact compact authority row");
  }
  const sourceGenerationId = [
    `authority=${input.authority_generation_id}`,
    `workspace=${input.workspace_source.package_id}`,
    `digest=${input.workspace_source.source_digest}`,
    `status=${input.workspace_source.source_status ?? "unknown"}`,
  ].join("|");
  const authorityStatus = input.authority_source.source_authority_status;
  // Only claims carried by the admitted compact authority row enter the
  // generic selector. Head's-Brief posture and prior-cycle prose are derived
  // presentation and therefore remain outside the model packet until their
  // owning projections supply exact record identifiers.
  const claims: CourtScribeBriefingPacketV1["claims"] = [{
    claim_id: input.authority_source.responsibility_summary_id,
    status: "confirmed",
    fact: {
      kind: "accountable_person",
      person_id: input.steward.person_id,
      display_name: input.steward.display_name,
    },
    source_ids: [input.authority_source.responsibility_summary_id],
    source_status: authorityStatus,
  }, {
    claim_id: input.authority_source.responsibility_demand_id,
    status: "confirmed",
    fact: {
      kind: "responsibility_scope",
      scope_id: input.scope.scope_id,
      scope_label: input.scope.scope_label,
    },
    source_ids: [
      input.authority_source.responsibility_demand_id,
      input.scope.scope_id,
    ],
    source_status: authorityStatus,
  }];
  return {
    schema_version: COURT_SCRIBE_BRIEFING_PACKET_VERSION,
    request_id: [
      "responsibility-brief",
      input.projection_house_id,
      session.acting_actor.person_id,
      input.responsibility_id,
      input.scope.scope_id,
      sourceGenerationId,
      input.effective_date,
    ].join(":"),
    run_identity: {
      source_generation_id: sourceGenerationId,
      effective_date: input.effective_date,
    },
    actor_context: {
      house_id: input.projection_house_id,
      actor_person_id: session.acting_actor.person_id,
      authority_basis: session.acting_actor.authority_basis,
      knowledge_lens: session.knowledge.lens,
      responsibility_id: input.responsibility_id,
    },
    presentation_context: "responsibility_briefing",
    style_card: {
      role: "responsibility_steward",
      cadence: "measured",
      register: "household_account",
    },
    claims,
    disclosure_limits: {
      allow_hidden_state: false,
      allow_raw_character_traits: false,
      allow_unadmitted_personal_detail: false,
      require_claim_citations: true,
      preserve_source_status: true,
    },
    output_budget: { max_clauses: 5 },
  };
}

export function compileCourtScribeResponsibilityBriefPacketOrNull(
  input: CourtScribeResponsibilityBriefCompilerInputV1,
): CourtScribeBriefingPacketV1 | null {
  try {
    return compileCourtScribeResponsibilityBriefPacket(input);
  } catch {
    return null;
  }
}
