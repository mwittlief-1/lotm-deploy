import { describe, expect, it } from "vitest";

import type { CourtOsSessionContextV1 } from "../../src/courtosSessionContext";
import {
  compileCourtScribeFiscalBriefRequest,
  deterministicCourtScribeFiscalBrief,
  renderCourtScribeFiscalClausePlan,
  resolveCourtScribeFiscalBrief,
  validateCourtScribeFiscalBriefResponse,
} from "../../src/ui/scribe/courtScribeFiscalBrief";
import type { Household1120ReadOnlyProjection } from "../../src/ui/readModels/household1120/types";

const HOUSE_ID = "t0h_test_house";
const ACTOR_ID = "t0p_test_head";

function session(): CourtOsSessionContextV1 {
  return {
    schema_version: "courtos_session_context_v1",
    runtime_mode: "player_runtime",
    principal: "local_player",
    selected_house_id: HOUSE_ID,
    player_house_id: HOUSE_ID,
    house_access: "player_house",
    acting_actor: {
      status: "house_head",
      person_id: ACTOR_ID,
      authority_basis: "foundation_a_uat1_succession_head_identity_plus_player_session",
    },
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

function projection(): Household1120ReadOnlyProjection {
  const boundary = {
    effective_date: "1120-01-01",
    source_authority_status: "uat_read_only",
    runtime_authority: 0,
    disclosure_posture: "house_scoped",
  } as const;
  return {
    schema_version: "foundation_a_household_uat1_release_v1",
    contract: {
      generation_id: "fiscal-test-generation",
      effective_date: "1120-01-01",
      sqlite_sha256: "test",
      sqlite_integrity: "ok",
      runtime_authority: false,
    },
    query: { household_entity_id: "household:test", house_id: HOUSE_ID },
    membership_context: [],
    responsibility_summary: [{
      ...boundary,
      responsibility_summary_id: "authority:fiscal",
      responsibility_demand_id: "demand:fiscal",
      demand_entity_id: "household:test",
      demand_entity_label: "Test Hall",
      responsibility_id: "house_fiscal_administration",
      responsibility_label: "House Fiscal Administration",
      source_legacy_responsibility_id: "courtos.responsibility.house_fiscal_administration",
      source_legacy_responsibility_label: "House Fiscal Administration",
      demand_state: "current",
      coverage_state: "covered",
      holder_person_id: "t0p_test_steward",
      holder_display_name: "Marta of Test Hall",
      authority_posture: "recorded",
    }],
    stores_positions: [{
      ...boundary,
      stores_position_id: "position:coin",
      household_entity_id: "household:test",
      resource_id: "coin",
      quantity_integer: 560000,
      position_state: "recorded",
      custody_id: "custody:test",
      capacity_id: null,
      availability_posture: "available",
      source_effective_date: "1120-01-01",
      projection_generation_id: "fiscal-test-generation",
      position_kind: "house_position",
    }, {
      ...boundary,
      stores_position_id: "position:food",
      household_entity_id: "household:test",
      resource_id: "food",
      quantity_integer: 63363,
      position_state: "recorded",
      custody_id: "custody:food",
      capacity_id: null,
      availability_posture: "available",
      source_effective_date: "1120-01-01",
      projection_generation_id: "fiscal-test-generation",
      position_kind: "house_position",
    }],
    stores_history: [],
    supply_routes: [],
    adult_kin_roster: [],
    adult_kin_arrangements: [],
    education_plans: [],
    education_cycle_reports: [],
    health_roster: [],
    health_cycle_reports: [],
    care_arrangements: [],
    economic_activity_lookback: [{
      ...boundary,
      activity_id: "lookback:coin:1119",
      source_economic_leg_id: "leg:coin:1119",
      activity_year: 1119,
      effective_date: "1119-12-31",
      resource_id: "coin",
      flow_family: "household_regular",
      regularity: "regular",
      direction: "outflow",
      signed_amount: -3200,
      counterparty_entity_id: "hidden-counterparty-id",
      counterparty_label: "Hidden Counterparty",
      temporal_basis: "annual_regular_posting",
      evidence_status: "founder_approved_provisional_economic_lookback",
    }],
    protected_person_dossiers: [],
    matters: [],
    provenance: [],
  };
}

describe("CourtOS Scribe fiscal briefing boundary", () => {
  function clausePlan(request: ReturnType<typeof compileCourtScribeFiscalBriefRequest>) {
    return {
      clauses: [{
        kind: "steward_record" as const,
        claim_id: request.confirmed[0]?.claim_id ?? "",
      }, {
        kind: "opening_position_record" as const,
        claim_id: request.confirmed[1]?.claim_id ?? "",
      }, {
        kind: "prior_cycle_posting_record" as const,
        claim_id: request.reported[0]?.claim_id ?? "",
      }],
    } as const;
  }

  it("compiles a compact House/actor-scoped structured packet without counterparty, prose, or raw projection fields", () => {
    const request = compileCourtScribeFiscalBriefRequest({ projection: projection(), session: session() });

    expect(request.actor_context).toMatchObject({
      house_id: HOUSE_ID,
      actor_person_id: ACTOR_ID,
      responsibility: "house_fiscal_administration",
    });
    expect(request.confirmed).toHaveLength(3);
    expect(request.reported).toHaveLength(1);
    expect(JSON.stringify(request)).not.toContain("Hidden Counterparty");
    expect(JSON.stringify(request)).not.toContain("counterparty_entity_id");
    expect(JSON.stringify(request)).not.toContain("stores_positions");
    expect(JSON.stringify(request)).not.toContain('"statement"');
    expect(request.confirmed[0]?.fact).toEqual({
      kind: "accountable_steward",
      subject_label: "Marta of Test Hall",
    });
    expect(request.confirmed[1]?.fact).toMatchObject({
      kind: "opening_position",
      resource_id: "coin",
      quantity: 560000,
    });
    expect(request.reported[0]?.fact).toMatchObject({
      kind: "prior_cycle_posting",
      resource_id: "coin",
      quantity: -3200,
      activity_year: 1119,
    });
    expect(request.allowed_action_ids).toEqual([]);
    expect(request.allowed_query_kinds).toEqual([]);
  });

  it("fails closed when the House projection and actor session differ", () => {
    const otherSession = { ...session(), selected_house_id: "t0h_other_house" };
    expect(() => compileCourtScribeFiscalBriefRequest({ projection: projection(), session: otherSession }))
      .toThrow("projection House does not match");
  });

  it("rejects malformed, extra-key, candidate, and claim/clause-mismatched plans", () => {
    const request = compileCourtScribeFiscalBriefRequest({ projection: projection(), session: session() });
    expect(validateCourtScribeFiscalBriefResponse(request, {
      clauses: [{ kind: "opening_position_record", claim_id: request.confirmed[0]?.claim_id ?? "" }, {
        kind: "steward_record", claim_id: request.confirmed[1]?.claim_id ?? "" },
      ],
    })).toEqual({
      ok: false,
      reason: "claim or clause mismatch",
    });
    expect(validateCourtScribeFiscalBriefResponse(request, {
      clauses: [{ kind: "steward_record", claim_id: request.confirmed[0]?.claim_id ?? "" }],
    })).toEqual({
      ok: false,
      reason: "clause count",
    });
  });

  it("cannot admit counterparty, arbitrary entity, number, or world-effect prose because response has no prose field", () => {
    const request = compileCourtScribeFiscalBriefRequest({ projection: projection(), session: session() });
    const hostile = {
      ...clausePlan(request),
      prose: "Hidden Counterparty received 560,000 coin from quiet harrowdale keeper",
    };
    expect(validateCourtScribeFiscalBriefResponse(request, hostile as never)).toEqual({
      ok: false,
      reason: "malformed response envelope",
    });
    const hostileClause = {
      clauses: clausePlan(request).clauses.map((clause, index) => index === 0
        ? { ...clause, prose: "Hidden Counterparty received 560,000 coin" }
        : clause),
    };
    expect(validateCourtScribeFiscalBriefResponse(request, hostileClause as never)).toEqual({
      ok: false,
      reason: "malformed clause",
    });
  });

  it("renders only validated typed plans and falls back to deterministic typed clauses", async () => {
    const request = compileCourtScribeFiscalBriefRequest({ projection: projection(), session: session() });
    const generated = await resolveCourtScribeFiscalBrief({
      request,
      adapter: {
        async brief() {
          return clausePlan(request);
        },
      },
    });
    expect(generated.mode).toBe("generated");
    expect(generated.prose).toContain("Marta of Test Hall is the recorded House fiscal steward.");
    expect(generated.prose).toContain("opening House position records 560,000 coin.");
    expect(generated.prose).toContain("posting of -3,200 coin.");
    expect(generated.prose).not.toMatch(/received|paid|transferred|settled|purchased|delivered/i);

    const fallback = deterministicCourtScribeFiscalBrief(request);
    expect(fallback.mode).toBe("fallback");
    expect(fallback.prose).toContain("Marta of Test Hall");
    expect(fallback.cited_claim_ids).toContain("fiscal:position:position:coin");
  });

  it("renders a classified prior-cycle entry as a neutral record, never an asserted economic event", () => {
    const source = projection();
    source.stores_positions[0] = {
      ...source.stores_positions[0]!,
      resource_id: "building_materials",
    };
    source.economic_activity_lookback[0] = {
      ...source.economic_activity_lookback[0]!,
      flow_family: "tax_collection",
    };
    const request = compileCourtScribeFiscalBriefRequest({ projection: source, session: session() });
    const rendered = renderCourtScribeFiscalClausePlan(request, clausePlan(request).clauses);
    expect(rendered).toContain("opening House position records 560,000 building materials");
    expect(rendered).toContain("recorded 1119 outflow posting of -3,200 coin");
    expect(rendered).not.toContain("tax collection");
    expect(rendered).not.toMatch(/received|paid|collected|settled|delivered/i);
  });
});
