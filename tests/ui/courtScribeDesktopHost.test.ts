import { describe, expect, it } from "vitest";

import {
  CourtScribeFiscalLocalHost,
  courtScribeRequestDigest,
  courtScribeBriefingGrammar,
  courtScribeBriefingPrompt,
  courtScribeFiscalGrammar,
  courtScribeFiscalPrompt,
  isCourtScribeFiscalBriefRequest,
  parseLastJsonObject,
} from "../../desktop/courtScribeLocalHost";
import type { CourtScribeFiscalBriefRequestV1 } from "../../src/ui/scribe/courtScribeFiscalBrief";
import type { CourtScribeBriefingPacketV1 } from "../../src/ui/scribe/courtScribeBriefingContract";

function request(): CourtScribeFiscalBriefRequestV1 {
  return {
    schema_version: "courtos_scribe_fiscal_brief_packet_v1",
    request_id: "fiscal-brief:test",
    run_identity: { source_generation_id: "test-generation", effective_date: "1120-01-01" },
    actor_context: {
      house_id: "t0h_test",
      actor_person_id: "t0p_head",
      authority_basis: "source-resolved",
      knowledge_lens: "source_bounded_house_records",
      responsibility: "house_fiscal_administration",
    },
    task: "briefing",
    style_card: { role: "house_fiscal_steward", voice: "measured_household_account" },
    confirmed: [{
      claim_id: "fiscal:steward",
      status: "confirmed",
      fact: { kind: "accountable_steward", subject_label: "Marta of Test Hall" },
      numeric_values: [],
      source_ids: ["authority:fiscal"],
      source_status: "recorded",
    }, {
      claim_id: "fiscal:position:coin",
      status: "confirmed",
      fact: { kind: "opening_position", resource_id: "coin", quantity: 560000 },
      numeric_values: [560000],
      source_ids: ["position:coin"],
      source_status: "recorded",
    }],
    reported: [{
      claim_id: "fiscal:posting:1119",
      status: "reported",
      fact: {
        kind: "prior_cycle_posting",
        resource_id: "coin",
        quantity: -3200,
        activity_year: 1119,
        flow_family: "household_regular",
        direction: "outflow",
      },
      numeric_values: [1119, -3200],
      source_ids: ["leg:1119"],
      source_status: "provisional_lookback",
    }],
    allowed_assessments: [],
    allowed_action_ids: [],
    allowed_query_kinds: [],
    disclosure_limits: {
      allow_counterparty_identity: false,
      allow_personal_financial_detail: false,
      allow_hidden_state: false,
      require_claim_citations: true,
      preserve_source_status: true,
    },
    output_budget: { min_words: 60, max_words: 180 },
  };
}

function genericPacket(): CourtScribeBriefingPacketV1 {
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
    presentation_context: "responsibility_briefing",
    style_card: { role: "responsibility_steward", cadence: "measured", register: "household_account" },
    claims: [{
      claim_id: "person:claim",
      status: "confirmed",
      fact: { kind: "accountable_person", person_id: "t0p_steward", display_name: "Marta" },
      source_ids: ["authority:secret-source"],
      source_status: "admitted",
    }, {
      claim_id: "scope:claim",
      status: "confirmed",
      fact: { kind: "responsibility_scope", scope_id: "scope:test", scope_label: "Test Hall" },
      source_ids: ["scope:secret-source"],
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

describe("CourtOS Scribe native fiscal host boundary", () => {
  it("keys cached selections by the complete bounded packet, not request ID alone", () => {
    const first = request();
    const altered = structuredClone(first) as CourtScribeFiscalBriefRequestV1 & {
      confirmed: CourtScribeFiscalBriefRequestV1["confirmed"][number][];
    };
    const current = altered.confirmed[1]!;
    altered.confirmed[1] = {
      ...current,
      fact: { ...current.fact, quantity: 559999 },
      numeric_values: [559999],
    };
    expect(first.request_id).toBe(altered.request_id);
    expect(courtScribeRequestDigest(first)).not.toBe(courtScribeRequestDigest(altered));
  });

  it("reports an unavailable install and fails closed without spawning a model", async () => {
    const host = new CourtScribeFiscalLocalHost({
      root: "/not-installed",
      model_path: "",
      executable_path: "",
      server_path: "",
      available: false,
      reason: "native_scribe_model_missing",
    });
    expect(await host.warm()).toBe(false);
    expect(await host.fiscalBrief(request())).toBeNull();
    expect(host.status()).toMatchObject({
      phase: "unavailable",
      model_verified: null,
      last_request_outcome: "withheld",
    });
    host.dispose();
    expect(host.status().phase).toBe("disposed");
  });

  it("contains missing-file admission I/O as an unavailable deterministic fallback", async () => {
    const host = new CourtScribeFiscalLocalHost({
      root: "/not-installed",
      model_path: "/not-installed/model.gguf",
      executable_path: "/not-installed/llama-cli",
      server_path: "/not-installed/llama-server",
      available: true,
      reason: null,
    });
    await expect(host.warm()).resolves.toBe(false);
    expect(host.status()).toMatchObject({
      phase: "unavailable",
      model_verified: false,
      last_failure_reason: "native_scribe_admission_io_failed",
    });
    host.dispose();
  });

  it("contains a native child spawn error instead of emitting an unhandled error", async () => {
    const host = new CourtScribeFiscalLocalHost({
      root: "/not-installed",
      model_path: "/not-installed/model.gguf",
      executable_path: "/not-installed/llama-cli",
      server_path: "/not-installed/llama-server",
      available: true,
      reason: null,
    });
    // Admission is already independently covered above. This test advances the
    // host to the process boundary so Node's asynchronous ENOENT `error` event
    // exercises the production containment listener.
    (host as unknown as { modelAdmitted: boolean }).modelAdmitted = true;
    await expect(host.warm()).resolves.toBe(false);
    expect(host.status()).toMatchObject({
      phase: "unavailable",
      backend: null,
      last_failure_reason: "native_scribe_cpu_spawn_failed",
    });
    host.dispose();
  });

  it("accepts only the current structured fiscal packet", () => {
    expect(isCourtScribeFiscalBriefRequest(request())).toBe(true);

    const staleStatementPacket = structuredClone(request()) as Record<string, unknown>;
    const claims = staleStatementPacket.confirmed as Array<Record<string, unknown>>;
    claims[0] = {
      claim_id: "fiscal:steward",
      status: "confirmed",
      statement: "Marta is steward",
      numeric_values: [],
      source_ids: ["authority:fiscal"],
    };
    expect(isCourtScribeFiscalBriefRequest(staleStatementPacket)).toBe(false);
  });

  it("rejects untyped fact fields before they become a local-model prompt", () => {
    const withCounterparty = structuredClone(request()) as Record<string, unknown>;
    const claims = withCounterparty.reported as Array<Record<string, unknown>>;
    claims[0] = {
      ...claims[0],
      fact: { ...(claims[0]?.fact as Record<string, unknown>), counterparty_label: "Hidden Counterparty" },
    };
    expect(isCourtScribeFiscalBriefRequest(withCounterparty)).toBe(false);
  });

  it("refuses candidate facts before they can enter the model selection packet", () => {
    const withCandidate = structuredClone(request()) as Record<string, unknown>;
    const claims = withCandidate.confirmed as Array<Record<string, unknown>>;
    claims[1] = { ...claims[1], status: "candidate" };
    expect(isCourtScribeFiscalBriefRequest(withCandidate)).toBe(false);
  });

  it("uses short aliases in the native selection prompt and keeps full source IDs outside it", () => {
    const packet = request();
    const grammar = courtScribeFiscalGrammar(packet);
    const prompt = courtScribeFiscalPrompt(packet);
    expect(grammar).toContain('\\"c1\\"');
    expect(grammar).toContain('\\"c3\\"');
    expect(grammar).not.toContain("fiscal:steward");
    expect(prompt).toContain('"alias":"c1"');
    expect(prompt).not.toContain("fiscal:steward");
    expect(prompt).not.toContain('"source_status":"recorded"');
    expect(prompt).not.toContain('"statement"');
    expect(prompt).not.toContain("Hidden Counterparty");
  });

  it("omits the optional posting grammar when no admitted posting is available", () => {
    const packet = { ...request(), reported: [] };
    const grammar = courtScribeFiscalGrammar(packet);
    expect(grammar).not.toContain("posting-clause ::=");
    expect(grammar).not.toContain("prior_cycle_posting_record");
  });

  it("extracts the enclosing typed response rather than an inner clause object", () => {
    const output = 'model preamble {"clauses":[{"kind":"steward_record","claim_id":"fiscal:steward"},{"kind":"opening_position_record","claim_id":"fiscal:position:coin"}]}';
    expect(parseLastJsonObject(output)).toEqual({
      clauses: [
        { kind: "steward_record", claim_id: "fiscal:steward" },
        { kind: "opening_position_record", claim_id: "fiscal:position:coin" },
      ],
    });
  });

  it("builds a compact generic responsibility selector without source IDs or prose", () => {
    const grammar = courtScribeBriefingGrammar(genericPacket());
    const prompt = courtScribeBriefingPrompt(genericPacket());
    expect(grammar).toContain('\\"s\\"');
    expect(grammar).toContain('\\"o\\"');
    expect(prompt).toContain('"alias":"c1"');
    expect(prompt).not.toContain("person:claim");
    expect(prompt).not.toContain("secret-source");
    expect(prompt).not.toContain('"prose"');
    expect(parseLastJsonObject('{"s":"c1","o":"c2"}')).toEqual({
      s: "c1", o: "c2",
    });
  });
});
