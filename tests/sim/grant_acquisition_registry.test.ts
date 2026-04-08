import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  ACQUISITION_PROSPECTS_WINDOW_SCHEMA_VERSION,
  GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION,
  GRANT_ELIGIBILITY_SCHEMA_VERSION,
  GRANT_PROSPECT_METADATA_SCHEMA_VERSION,
  GRANT_SOURCE_ENTRY_SCHEMA_VERSION,
  GRANT_SOURCE_ORIGIN_TYPES,
  GRANT_SOURCE_REGISTRY_SCHEMA_VERSION,
  buildAcquisitionProspectsWindow,
  buildGrantEligibilityAssessment,
  buildGrantProspect,
  buildGrantSourceRegistry,
  serializeAcquisitionProspectsWindow,
  serializeGrantSourceRegistry,
} from "../../src/sim/domains/people/grantAcquisitionRegistry";

function setLiegeView(state: any, values: { allegiance: number; respect: number; threat: number }) {
  state.relationships = (state.relationships ?? []).filter(
    (edge: any) => !(edge?.from_id === state.locals.liege.id && edge?.to_id === state.house.head.id)
  );
  state.relationships.push({
    from_id: state.locals.liege.id,
    to_id: state.house.head.id,
    allegiance: values.allegiance,
    respect: values.respect,
    threat: values.threat,
  });
}

function openInheritanceClaimWindow(state: any) {
  const spouseId = state.house.spouse?.id ?? null;
  const childIds = (state.house.children ?? []).map((child: any) => child.id);
  state.house.children = [];
  state.house.heir_id = null;
  state.house.spouse = undefined;
  state.house.spouse_status = undefined;
  state.house.head.married = false;
  if (spouseId && state.people?.[spouseId]) {
    state.people[spouseId].married = false;
  }
  if (state.people?.[state.house.head.id]) {
    state.people[state.house.head.id].married = false;
  }
  state.kinship_edges = (state.kinship_edges ?? []).filter(
    (edge: any) =>
      !(
        edge?.kind === "parent_of" &&
        (edge?.parent_id === state.house.head.id || edge?.parent_id === spouseId) &&
        childIds.includes(edge?.child_id)
      )
  );
}

describe("grant acquisition registry", () => {
  it("locks the source origin inventory and deterministic registry serialization", () => {
    const one = buildGrantSourceRegistry(createNewRun("grant_registry_contract_v032"));
    const two = buildGrantSourceRegistry(createNewRun("grant_registry_contract_v032"));

    expect(GRANT_SOURCE_ORIGIN_TYPES).toEqual(["liege_demesne", "dispossessed_pool"]);
    expect(one.schema_version).toBe(GRANT_SOURCE_REGISTRY_SCHEMA_VERSION);
    expect(one.source_entry_ids.length).toBeGreaterThan(0);
    expect(one.liege_demesne_entry_ids.length).toBeGreaterThan(0);
    expect(one.dispossessed_entry_ids.length).toBeGreaterThan(0);
    expect(
      one.source_entry_ids.every((entryId) => one.entries_by_id[entryId]?.manor_id !== one.anchor_manor_id)
    ).toBe(true);
    expect(serializeGrantSourceRegistry(one)).toBe(serializeGrantSourceRegistry(two));

    const firstEntry = one.entries_by_id[one.source_entry_ids[0]!];
    expect(firstEntry).toMatchObject({
      schema_version: GRANT_SOURCE_ENTRY_SCHEMA_VERSION,
      sponsor_ref_id: "p_liege",
      dossier_summary: {
        schema_version: GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION,
        kinship_summary: "none",
      },
    });
  });

  it("gates grant eligibility on liege favor, ledger tolerance, and portfolio capacity", () => {
    const baseline = buildGrantEligibilityAssessment(createNewRun("grant_eligibility_baseline_v032"));
    expect(baseline).toMatchObject({
      schema_version: GRANT_ELIGIBILITY_SCHEMA_VERSION,
      eligible: true,
      capacity_band: "open",
    });

    const lowFavorState = createNewRun("grant_eligibility_low_favor_v032");
    setLiegeView(lowFavorState as any, { allegiance: 40, respect: 41, threat: 30 });
    expect(buildGrantEligibilityAssessment(lowFavorState).blockers).toContain("liege_favor_below_threshold");

    const arrearsState = createNewRun("grant_eligibility_arrears_v032");
    arrearsState.manor.obligations.arrears.coin = 30;
    expect(buildGrantEligibilityAssessment(arrearsState).blockers).toContain("arrears_above_tolerance");

    const capacityState = createNewRun("grant_eligibility_capacity_v032");
    (capacityState.portfolio as any).positions = [
      "portfolio:player_portfolio:manor:west_hall",
      "portfolio:player_portfolio:manor:east_fen",
    ];
    const capped = buildGrantEligibilityAssessment(capacityState);
    expect(capped.current_manor_count).toBe(3);
    expect(capped.blockers).toContain("portfolio_at_capacity");
    expect(capped.capacity_band).toBe("at_capacity");
  });

  it("builds bounded grant prospects with hidden source and eligibility metadata", () => {
    const state = createNewRun("grant_prospect_contract_v032");
    const grant = buildGrantProspect(state) as any;

    expect(grant).toBeTruthy();
    expect(grant).toMatchObject({
      type: "grant",
      summary: "Grant offer",
      predicted_effects: {
        coin_delta: expect.any(Number),
      },
    });
    expect(grant.grant_metadata_schema_version).toBe(GRANT_PROSPECT_METADATA_SCHEMA_VERSION);
    expect(grant.dossier_summary).toMatchObject({
      schema_version: GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION,
      kinship_summary: "none",
    });
    expect(grant.eligibility).toMatchObject({
      schema_version: GRANT_ELIGIBILITY_SCHEMA_VERSION,
      eligible: true,
    });
  });

  it("shares a deterministic bounded ordering across marriage, grant, and inheritance acquisition prospects", () => {
    const state = createNewRun("acquisition_window_contract_v032");
    openInheritanceClaimWindow(state as any);
    const same = createNewRun("acquisition_window_contract_v032");
    openInheritanceClaimWindow(same as any);

    const one = buildAcquisitionProspectsWindow(state);
    const two = buildAcquisitionProspectsWindow(same);

    expect(one.schema_version).toBe(ACQUISITION_PROSPECTS_WINDOW_SCHEMA_VERSION);
    expect(one.prospects.map((prospect) => prospect.type)).toEqual(["marriage", "grant", "inheritance_claim"]);
    expect(one.shown_ids).toEqual(one.prospect_ids);
    expect(one.hidden_ids).toEqual([]);
    expect(serializeAcquisitionProspectsWindow(one)).toBe(serializeAcquisitionProspectsWindow(two));
  });
});
