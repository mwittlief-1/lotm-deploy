import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  applyCourtProvisioningStipends,
  buildCourtProvisioningFiscalPolicy,
  COURT_PROVISIONING_FISCAL_POLICY_SCHEMA_VERSION,
  COURT_PROVISIONING_STIPEND_APPLY_RESULT_SCHEMA_VERSION
} from "../../src/sim/domains/economy/courtProvisioningFiscal";
import { buildPersonCardRegistry } from "../../src/sim/domains/people/personCardRegistry";
import { buildCourtProvisioningView, buildCourtStipendRegistry } from "../../src/sim/domains/people/courtProvisioningRegistry";

function refreshProvisioningFiscalFields(state: ReturnType<typeof createNewRun>, view: ReturnType<typeof buildCourtProvisioningView>) {
  const policy = buildCourtProvisioningFiscalPolicy(state, view);
  for (const personId of view.person_ids) {
    const provisioningEntry = view.entries_by_person_id[personId]!;
    const fiscalEntry = policy.entries_by_person_id[personId]!;
    provisioningEntry.ration_policy = fiscalEntry.ration_policy;
    provisioningEntry.stipend_policy = fiscalEntry.stipend_policy;
    provisioningEntry.undernourishment_badges = [...fiscalEntry.undernourishment_badges];
  }
  view.fiscal_policy = policy;
  return policy;
}

describe("court provisioning fiscal policy", () => {
  it("builds deterministic ration policy outputs and placeholder undernourishment badges", () => {
    const state = createNewRun("court_provisioning_fiscal_policy_v035");
    state.manor.bushels_stored = 8;
    (state.manor as any).meat_stores = 2;

    const view = buildCourtProvisioningView(state, buildPersonCardRegistry(state));
    const stipendRegistry = buildCourtStipendRegistry(state, view);

    expect(view.fiscal_policy).toMatchObject({
      schema_version: COURT_PROVISIONING_FISCAL_POLICY_SCHEMA_VERSION,
      person_ids: ["p_child1", "p_child2", "p_clergy", "p_court_steward", "p_head", "p_liege", "p_spouse"],
      allocation_order: ["p_head", "p_spouse", "p_child1", "p_child2", "p_court_steward", "p_clergy", "p_liege"],
      total_requested_food_units: 12,
      total_requested_meat_units: 2,
      total_allocated_food_units: 8,
      total_allocated_meat_units: 2,
      total_requested_stipend_coin: 0,
      at_risk_person_ids: ["p_child2", "p_court_steward"]
    });
    expect(view.entries_by_person_id.p_head).toMatchObject({
      ration_policy: {
        requested_food_units: 3,
        requested_meat_units: 1,
        allocated_food_units: 3,
        allocated_meat_units: 1,
        status: "covered"
      },
      undernourishment_badges: []
    });
    expect(view.entries_by_person_id.p_child2).toMatchObject({
      ration_policy: {
        requested_food_units: 2,
        allocated_food_units: 0,
        food_shortfall_units: 2,
        status: "shortfall"
      },
      undernourishment_badges: ["undernourishment_risk"]
    });
    expect(stipendRegistry.total_requested_coin).toBe(0);
    expect(stipendRegistry.entries_by_key["stipend:p_head"]).toMatchObject({
      stipend_amount: 0,
      receipt_category: "expense.household_admin"
    });
  });

  it("applies stipend placeholders through canonical coin receipts in stable stipend-key order", () => {
    const state = createNewRun("court_provisioning_stipend_apply_v035");
    state.turn_index = 4;
    state.manor.coin = 2;

    const view = buildCourtProvisioningView(state, buildPersonCardRegistry(state));
    view.entries_by_person_id.p_child1!.stipend_basis = "realm_stipend";
    view.entries_by_person_id.p_court_steward!.stipend_basis = "retainer_upkeep";
    const policy = refreshProvisioningFiscalFields(state, view);
    const stipendRegistry = buildCourtStipendRegistry(state, view);
    const result = applyCourtProvisioningStipends(state, {
      phase: "events",
      phase_sequence: 4,
      policy
    });

    expect(stipendRegistry.total_requested_coin).toBe(3);
    expect(stipendRegistry.entries_by_key["stipend:p_child1"]).toMatchObject({
      stipend_amount: 2,
      rule_id: "court.provisioning.stipend.realm_stipend.p_child1"
    });
    expect(stipendRegistry.entries_by_key["stipend:p_court_steward"]).toMatchObject({
      stipend_amount: 1,
      rule_id: "court.provisioning.stipend.retainer_upkeep.p_court_steward"
    });
    expect(result).toMatchObject({
      schema_version: COURT_PROVISIONING_STIPEND_APPLY_RESULT_SCHEMA_VERSION,
      applied_stipend_keys: ["stipend:p_child1", "stipend:p_court_steward"],
      total_requested_coin: 3,
      total_paid_coin: 2,
      total_shortfall_coin: 1
    });
    expect(result.applied_entries_by_key).toEqual({
      "stipend:p_child1": {
        stipend_key: "stipend:p_child1",
        person_id: "p_child1",
        requested_coin: 2,
        paid_coin: 2,
        shortfall_coin: 0,
        rule_id: "court.provisioning.stipend.realm_stipend.p_child1"
      },
      "stipend:p_court_steward": {
        stipend_key: "stipend:p_court_steward",
        person_id: "p_court_steward",
        requested_coin: 1,
        paid_coin: 0,
        shortfall_coin: 1,
        rule_id: "court.provisioning.stipend.retainer_upkeep.p_court_steward"
      }
    });
    expect(result.receipt_snapshots.map((receipt) => ({
      category: receipt.category,
      counterparty_id: receipt.counterparty_id,
      asset: receipt.asset,
      delta: receipt.delta,
      rule_id: receipt.rule_id
    }))).toEqual([
      {
        category: "expense.household_admin",
        counterparty_id: "stipend:p_child1",
        asset: "coin",
        delta: -2,
        rule_id: "court.provisioning.stipend.realm_stipend.p_child1"
      }
    ]);
    expect(state.manor.coin).toBe(0);
  });
});
