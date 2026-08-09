import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { CourtOsSessionContextV1 } from "../../src/courtosSessionContext";
import {
  buildCourtOsResponsibilityBrief,
  COURTOS_RESPONSIBILITY_BRIEF_KEYS,
} from "../../src/ui/responsibilityBriefPresentation";
import { responsibilityWorkspaceSource } from "../../src/ui/responsibilityWorkspaceCatalog";
import { CourtOsResponsibilityHeadsBrief } from "../../src/ui/responsibilityHeadsBrief";
import {
  compileCourtScribeResponsibilityBriefPacket,
  compileCourtScribeResponsibilityBriefPacketOrNull,
} from "../../src/ui/scribe/courtScribeResponsibilityBrief";

function session(): CourtOsSessionContextV1 {
  return {
    schema_version: "courtos_session_context_v1",
    runtime_mode: "player_runtime",
    principal: "local_player",
    selected_house_id: "t0h_test",
    player_house_id: "t0h_test",
    house_access: "player_house",
    acting_actor: { status: "house_head", person_id: "t0p_head", authority_basis: "source_resolved" },
    knowledge: {
      lens: "source_bounded_house_records",
      actor_knowledge_status: "source_resolved_controller",
      actor_specific_content: "withheld",
    },
    capabilities: {
      inspect_house_records: true,
      issue_commands: false,
      manage_assignments: true,
      access_correspondence: false,
      conduct_actor_dialogue: false,
    },
  };
}

describe("CourtOS responsibility Scribe compiler", () => {
  it("compiles all 24 exact compact scopes without exposing brief prose", () => {
    expect(COURTOS_RESPONSIBILITY_BRIEF_KEYS).toHaveLength(24);
    for (const responsibility of COURTOS_RESPONSIBILITY_BRIEF_KEYS) {
      const source = responsibilityWorkspaceSource(responsibility);
      const brief = buildCourtOsResponsibilityBrief({
        responsibility,
        currentState: source.currentState,
        evidence: source.evidence,
        posture: source.posture,
        accountableHolderCount: 1,
        authorityScopeCount: 1,
        openingRecordCount: 2,
        priorCycleRecordCount: 1,
        headOfHouseAssigned: false,
      });
      const packet = compileCourtScribeResponsibilityBriefPacket({
        session: session(),
        projection_house_id: "t0h_test",
        authority_generation_id: "authority-generation",
        workspace_source: {
          package_id: source.packageId,
          source_digest: `digest-${responsibility}`,
          source_status: "admitted",
          source_owned: true,
        },
        authority_source: {
          responsibility_summary_id: `authority-summary-${responsibility}`,
          responsibility_demand_id: `authority-demand-${responsibility}`,
          source_authority_status: "foundation_a_uat_admitted",
          holder_person_id: "t0p_steward",
          scope_id: `scope-${responsibility}`,
        },
        effective_date: "1120-01-01",
        responsibility_id: responsibility,
        steward: { person_id: "t0p_steward", display_name: "Marta" },
        scope: {
          scope_id: `scope-${responsibility}`,
          scope_label: "The House-wide charge",
        },
        brief,
      });
      expect(packet.actor_context.responsibility_id).toBe(responsibility);
      expect(packet.run_identity.source_generation_id).toContain("authority=authority-generation");
      expect(packet.run_identity.source_generation_id).toContain(`digest=digest-${responsibility}`);
      expect(packet.claims.find((claim) => claim.fact.kind === "responsibility_scope"))
        .toMatchObject({
          claim_id: `authority-demand-${responsibility}`,
          source_ids: [
            `authority-demand-${responsibility}`,
            `scope-${responsibility}`,
          ],
          source_status: "foundation_a_uat_admitted",
          fact: { scope_id: `scope-${responsibility}` },
        });
      expect(packet.claims.find((claim) => claim.fact.kind === "accountable_person"))
        .toMatchObject({
          claim_id: `authority-summary-${responsibility}`,
          source_ids: [`authority-summary-${responsibility}`],
          source_status: "foundation_a_uat_admitted",
        });
      const serialized = JSON.stringify(packet);
      expect(serialized).not.toContain(brief.sections[0]!.body);
      expect(serialized).not.toContain("evidence_references");
      expect(serialized).not.toContain("provenance");
      expect(serialized).not.toContain("heads-brief:");
      expect(serialized).not.toContain("rendered_heads_brief");
    }
  });

  it("does not manufacture a posture claim from a HoH-held Head's Brief", () => {
    const responsibility = "household_stores_provisioning_procurement" as const;
    const source = responsibilityWorkspaceSource(responsibility);
    const brief = buildCourtOsResponsibilityBrief({
      responsibility,
      currentState: source.currentState,
      evidence: [],
      posture: "read_ready",
      accountableHolderCount: 1,
      authorityScopeCount: 1,
      openingRecordCount: 1,
      priorCycleRecordCount: 1,
      headOfHouseAssigned: true,
    });
    const packet = compileCourtScribeResponsibilityBriefPacket({
      session: session(),
      projection_house_id: "t0h_test",
      authority_generation_id: "authority-generation",
      workspace_source: {
        package_id: source.packageId,
        source_digest: "source-digest",
        source_status: "foundation_a_uat_admitted",
        source_owned: true,
      },
      authority_source: {
        responsibility_summary_id: "authority-summary-stores",
        responsibility_demand_id: "authority-demand-stores",
        source_authority_status: "foundation_a_uat_admitted",
        holder_person_id: "t0p_head",
        scope_id: `scope-${responsibility}`,
      },
      effective_date: "1120-01-01",
      responsibility_id: responsibility,
      steward: { person_id: "t0p_head", display_name: "The Head" },
      scope: { scope_id: `scope-${responsibility}`, scope_label: "The House" },
      brief,
    });
    expect(packet.claims.find((claim) => claim.fact.kind === "current_posture"))
      .toBeUndefined();
    const html = renderToStaticMarkup(React.createElement(CourtOsResponsibilityHeadsBrief, {
      brief,
      domain: "household",
      roomLabel: "Household",
      responsibilityLabel: "Household Stores",
      steward: { displayName: "The Head" },
      stewardNote: "Brings this account to the Head.",
      scribePacket: packet,
    }));
    expect(html).toContain('data-scribe-mode="fallback"');
    const scribeAccount = html.match(
      /<aside\b[^>]*data-scribe-mode="fallback"[^>]*>[\s\S]*?<\/aside>/,
    )?.[0];
    expect(scribeAccount).toBeTruthy();
    expect(scribeAccount).toContain("brings this account before the Head");
    expect(scribeAccount).not.toMatch(/settled|attention/i);
    expect(scribeAccount).not.toMatch(/loading|waiting|generating/i);
  });

  it("fails closed for missing steward/scope and for an owned source without an exact digest", () => {
    const responsibility = "adult_kin_support" as const;
    const source = responsibilityWorkspaceSource(responsibility);
    const brief = buildCourtOsResponsibilityBrief({
      responsibility,
      currentState: source.currentState,
      evidence: source.evidence,
      posture: source.posture,
      accountableHolderCount: 1,
      authorityScopeCount: 1,
      openingRecordCount: 1,
      headOfHouseAssigned: false,
    });
    const base = {
      session: session(),
      projection_house_id: "t0h_test",
      authority_generation_id: "authority-generation",
      effective_date: "1120-01-01",
      responsibility_id: responsibility,
      workspace_source: {
        package_id: source.packageId,
        source_digest: "source-digest",
        source_status: "foundation_a_uat_admitted",
        source_owned: true,
      },
      authority_source: {
        responsibility_summary_id: "authority-summary-adult-kin",
        responsibility_demand_id: "authority-demand-adult-kin",
        source_authority_status: "foundation_a_uat_admitted",
        holder_person_id: "t0p_steward",
        scope_id: `scope-${responsibility}`,
      },
      steward: { person_id: "t0p_steward", display_name: "Marta" },
      scope: { scope_id: `scope-${responsibility}`, scope_label: "The House" },
      brief,
    } as const;
    expect(compileCourtScribeResponsibilityBriefPacketOrNull({ ...base, steward: null })).toBeNull();
    expect(compileCourtScribeResponsibilityBriefPacketOrNull({ ...base, scope: null })).toBeNull();
    expect(compileCourtScribeResponsibilityBriefPacketOrNull({
      ...base,
      authority_source: null,
    })).toBeNull();
    expect(compileCourtScribeResponsibilityBriefPacketOrNull({
      ...base,
      workspace_source: null,
    })).toBeNull();
    expect(compileCourtScribeResponsibilityBriefPacketOrNull({
      ...base,
      workspace_source: {
        package_id: source.packageId,
        source_digest: null,
        source_status: "admitted",
        source_owned: true,
      },
    })).toBeNull();
  });
});
