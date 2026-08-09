import { describe, expect, it } from "vitest";

import {
  deterministicCourtScribeBriefingPlan,
  isCourtScribeBriefingPacket,
  renderCourtScribeBriefingPlan,
  resolveCourtScribeBriefing,
  validateCourtScribeBriefingPlan,
  type CourtScribeBriefingPacketV1,
} from "../../src/ui/scribe/courtScribeBriefingContract";

function packet(
  presentationContext: CourtScribeBriefingPacketV1["presentation_context"] = "responsibility_briefing",
): CourtScribeBriefingPacketV1 {
  return {
    schema_version: "courtos_scribe_briefing_packet_v1",
    request_id: "brief:test",
    run_identity: { source_generation_id: "test", effective_date: "1120-01-01" },
    actor_context: {
      house_id: "t0h_test",
      actor_person_id: "t0p_head",
      authority_basis: "source_resolved",
      knowledge_lens: "source_bounded_house_records",
      responsibility_id: "household_stores_provisioning_procurement",
    },
    presentation_context: presentationContext,
    style_card: {
      role: presentationContext === "council_matter_review" ? "council_adviser" : "responsibility_steward",
      cadence: "measured",
      register: presentationContext === "council_matter_review" ? "council_review" : "household_account",
    },
    claims: [{
      claim_id: "speaker",
      status: "confirmed",
      fact: { kind: "accountable_person", person_id: "t0p_steward", display_name: "Marta" },
      source_ids: ["authority:1"],
      source_status: "admitted",
    }, {
      claim_id: "scope",
      status: "confirmed",
      fact: { kind: "responsibility_scope", scope_id: "household:test", scope_label: "Test Hall" },
      source_ids: ["scope:1"],
      source_status: "admitted",
    }, {
      claim_id: "posture",
      status: "reported",
      fact: { kind: "current_posture", posture: "watch" },
      source_ids: ["report:1"],
      source_status: "reported",
    }, {
      claim_id: "matter",
      status: "reported",
      fact: {
        kind: "matter_record",
        matter_id: "matter:1",
        matter_label: "Stores review",
        urgency: "notable",
        lifecycle_state: "open",
      },
      source_ids: ["matter:1"],
      source_status: "admitted",
    }],
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

describe("CourtOS reusable Scribe briefing contract", () => {
  it("builds and validates a responsibility plan from cited typed facts only", () => {
    const input = packet();
    const plan = deterministicCourtScribeBriefingPlan(input);
    expect(validateCourtScribeBriefingPlan(input, plan)).toEqual({ ok: true });
    expect(plan.clauses.map((clause) => clause.kind)).toEqual([
      "speaker_record", "scope_record", "posture_record",
    ]);
    expect(isCourtScribeBriefingPacket(input)).toBe(true);
    expect(renderCourtScribeBriefingPlan(input, plan)).toContain(
      "Marta brings this account before the Head",
    );
  });

  it("requires a Matter only in the Council/Matter presentation context", () => {
    const council = packet("council_matter_review");
    expect(validateCourtScribeBriefingPlan(
      council,
      deterministicCourtScribeBriefingPlan(council),
    )).toEqual({ ok: true });
    const responsibility = packet();
    expect(validateCourtScribeBriefingPlan(responsibility, {
      clauses: [{ kind: "speaker_record", claim_id: "speaker", variant: "plain" }, {
        kind: "scope_record", claim_id: "scope", variant: "plain",
      }, {
        kind: "matter_record", claim_id: "matter", variant: "plain",
      }],
    })).toEqual({ ok: false, reason: "matter clause outside Council review" });
  });

  it("rejects prose, extra fields, unknown claims, and kind mismatches", () => {
    const input = packet();
    expect(validateCourtScribeBriefingPlan(input, {
      clauses: [{ kind: "speaker_record", claim_id: "speaker", variant: "plain" }, {
        kind: "scope_record", claim_id: "scope", variant: "plain", prose: "Invented prose",
      } as never],
    })).toEqual({ ok: false, reason: "malformed clause" });
    expect(validateCourtScribeBriefingPlan(input, {
      clauses: [{ kind: "speaker_record", claim_id: "scope", variant: "plain" }, {
        kind: "scope_record", claim_id: "speaker", variant: "plain",
      }],
    })).toEqual({ ok: false, reason: "claim or clause mismatch" });
  });

  it("uses only a validated model plan and otherwise renders the typed fallback", async () => {
    const input = packet("council_matter_review");
    const selected = deterministicCourtScribeBriefingPlan(input);
    const generated = await resolveCourtScribeBriefing({
      packet: input,
      adapter: { async brief() { return selected; } },
    });
    expect(generated.mode).toBe("generated");
    expect(generated.prose).toContain("Council docket names Stores review");
    expect(generated.cited_claim_ids).toContain("matter");

    const fallback = await resolveCourtScribeBriefing({
      packet: input,
      adapter: { async brief() { return { clauses: [] }; } },
    });
    expect(fallback.mode).toBe("fallback");
    expect(fallback.prose).not.toContain("Invented prose");
  });

  it("rejects raw character traits and arbitrary prompt/prose keys at the native packet gate", () => {
    const hostile = structuredClone(packet()) as Record<string, unknown>;
    hostile.prompt = "Speak freely";
    expect(isCourtScribeBriefingPacket(hostile)).toBe(false);
    const traitPacket = structuredClone(packet()) as Record<string, unknown>;
    traitPacket.character_traits = { ambition: 99 };
    expect(isCourtScribeBriefingPacket(traitPacket)).toBe(false);
  });
});
