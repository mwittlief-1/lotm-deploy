import { createNewRun, proposeTurn } from "../../src/sim";
import {
  applyCourtProvisioningStipends,
  buildCourtProvisioningFiscalPolicy,
  type CourtProvisioningFiscalPolicyV1,
  type CourtProvisioningStipendApplyResultV1
} from "../../src/sim/domains/economy/courtProvisioningFiscal";
import {
  buildCourtProvisioningView,
  buildCourtStipendRegistry,
  type CourtProvisioningView
} from "../../src/sim/domains/people/courtProvisioningRegistry";
import { buildPersonCardRegistry } from "../../src/sim/domains/people/personCardRegistry";
import type { RunState } from "../../src/sim/types";
import type { CourtProvisioningSurface } from "../../src/ui/courtProvisioningView";
import { buildCourtProvisioningSurface } from "../../src/ui/courtProvisioningView";

export const COURT_PROVISIONING_FIXTURE_SCENARIO_ORDER = [
  "baseline_shortfall",
  "carry_forward_overrides",
  "stipend_receipt_modes",
  "debug_registry_order"
] as const;

export type CourtProvisioningFixtureScenarioId = (typeof COURT_PROVISIONING_FIXTURE_SCENARIO_ORDER)[number];
export type CourtProvisioningFixtureTab = "player" | "debug";

export type CourtProvisioningFixtureCase = {
  initialTab: CourtProvisioningFixtureTab;
  sourceSeed: string;
  sourceTurnIndex: number;
  stipendApplyResult: CourtProvisioningStipendApplyResultV1 | null;
  surface: CourtProvisioningSurface;
};

function refreshProvisioningFiscalFields(state: RunState, view: CourtProvisioningView): CourtProvisioningFiscalPolicyV1 {
  const policy = buildCourtProvisioningFiscalPolicy(state, view);

  for (const personId of view.person_ids) {
    const provisioningEntry = view.entries_by_person_id[personId];
    const fiscalEntry = policy.entries_by_person_id[personId];
    if (!provisioningEntry || !fiscalEntry) continue;
    provisioningEntry.ration_policy = fiscalEntry.ration_policy;
    provisioningEntry.stipend_policy = fiscalEntry.stipend_policy;
    provisioningEntry.undernourishment_badges = [...fiscalEntry.undernourishment_badges];
  }

  view.fiscal_policy = policy;
  return policy;
}

function surfaceFromView(state: RunState, view: CourtProvisioningView): CourtProvisioningSurface {
  const stipendRegistry = buildCourtStipendRegistry(state, view);
  const surface = buildCourtProvisioningSurface({
    ...(state as any),
    court_provisioning_view: view,
    court_stipend_registry: stipendRegistry
  });

  if (!surface) {
    throw new Error("Expected a court provisioning surface.");
  }

  return surface;
}

function compactStipendApplyResult(result: CourtProvisioningStipendApplyResultV1 | null) {
  if (!result) return null;

  return {
    applied_stipend_keys: result.applied_stipend_keys,
    total_requested_coin: result.total_requested_coin,
    total_paid_coin: result.total_paid_coin,
    total_shortfall_coin: result.total_shortfall_coin,
    receipt_snapshots: result.receipt_snapshots.map((receipt) => ({
      category: receipt.category,
      counterparty_id: receipt.counterparty_id,
      delta: receipt.delta,
      rule_id: receipt.rule_id,
      summary: receipt.summary
    }))
  };
}

function pickRows<T extends { personId: string }>(rows: readonly T[], personIds: readonly string[]): T[] {
  return personIds
    .map((personId) => rows.find((row) => row.personId === personId) ?? null)
    .filter((row): row is T => row !== null);
}

function compactFixtureCase(scenarioId: CourtProvisioningFixtureScenarioId, fixtureCase: CourtProvisioningFixtureCase) {
  const { surface } = fixtureCase;
  const base = {
    schema_version: surface.schemaVersion,
    subtitle: surface.subtitle,
    helper_text: surface.helperText
  };

  if (scenarioId === "baseline_shortfall") {
    return {
      ...base,
      summary_cards: surface.summaryCards,
      allocation_rows: surface.allocationRows,
      focus_override_rows: pickRows(surface.overrideRows, ["p_head", "p_spouse", "p_court_steward", "p_clergy", "p_liege"]),
      focus_stipend_rows: pickRows(surface.stipendRows, ["p_head", "p_spouse", "p_court_steward", "p_clergy", "p_liege"]),
      debug_keys: surface.debugRows.map((row) => row.key),
      debug_rows: surface.debugRows
    };
  }

  if (scenarioId === "carry_forward_overrides") {
    return {
      ...base,
      summary_cards: surface.summaryCards,
      steward_override_row: surface.overrideRows.find((row) => row.personId === "p_court_steward") ?? null,
      steward_debug_entry_row: surface.debugEntryRows.find((row) => row.personId === "p_court_steward") ?? null,
      steward_debug_stipend_row: surface.debugStipendRows.find((row) => row.personId === "p_court_steward") ?? null
    };
  }

  if (scenarioId === "stipend_receipt_modes") {
    return {
      ...base,
      summary_cards: surface.summaryCards,
      receipt_stipend_rows: surface.stipendRows.filter((row) => row.appliesReceiptLabel === "Receipt applies"),
      receipt_debug_stipend_rows: surface.debugStipendRows.filter((row) => row.appliesReceiptLabel === "Yes"),
      focus_debug_rows: surface.debugRows.filter((row) =>
        ["allocation_order", "stipend_keys", "total_requested_stipend_coin"].includes(row.key)
      )
    };
  }

  return {
    ...base,
    debug_keys: surface.debugRows.map((row) => row.key),
    first_debug_rows: surface.debugRows.slice(0, 6),
    focus_debug_entry_rows: pickRows(surface.debugEntryRows, ["p_court_steward", "p_head", "p_spouse"]),
    focus_debug_stipend_rows: surface.debugStipendRows.slice(0, 4)
  };
}

export function buildCourtProvisioningFixtureCases(): Record<
  CourtProvisioningFixtureScenarioId,
  CourtProvisioningFixtureCase
> {
  const baselineSeed = "lotm_v022_seed_001_baseline_extworld";
  const baselineState = createNewRun(baselineSeed);
  const baselineTurn = proposeTurn(baselineState);
  const baselineSurface = buildCourtProvisioningSurface(baselineTurn.preview_state);

  if (!baselineSurface) {
    throw new Error("Expected a baseline provisioning surface.");
  }

  const carryForwardSeed = "court_provisioning_prior_defaults_v035";
  const carryForwardState = createNewRun(carryForwardSeed) as RunState & {
    court_provisioning_view?: CourtProvisioningView;
  };
  const carryForwardInitialView = buildCourtProvisioningView(carryForwardState, buildPersonCardRegistry(carryForwardState));
  const carryForwardInitialRegistry = buildCourtStipendRegistry(carryForwardState, carryForwardInitialView);
  carryForwardInitialView.entries_by_person_id.p_court_steward.ration_level = "light";
  carryForwardInitialView.entries_by_person_id.p_court_steward.lodging_level = "institution";
  carryForwardState.court_provisioning_view = carryForwardInitialView;
  (carryForwardState as any).court_stipend_registry = carryForwardInitialRegistry;
  const carryForwardView = buildCourtProvisioningView(carryForwardState, buildPersonCardRegistry(carryForwardState));
  refreshProvisioningFiscalFields(carryForwardState, carryForwardView);
  const carryForwardSurface = surfaceFromView(carryForwardState, carryForwardView);

  const stipendSeed = "court_provisioning_stipend_apply_v035";
  const stipendState = createNewRun(stipendSeed);
  stipendState.turn_index = 4;
  stipendState.manor.coin = 2;
  const stipendView = buildCourtProvisioningView(stipendState, buildPersonCardRegistry(stipendState));
  stipendView.entries_by_person_id.p_child1.stipend_basis = "realm_stipend";
  stipendView.entries_by_person_id.p_court_steward.stipend_basis = "retainer_upkeep";
  const stipendPolicy = refreshProvisioningFiscalFields(stipendState, stipendView);
  const stipendSurface = surfaceFromView(stipendState, stipendView);
  const stipendApplyResult = applyCourtProvisioningStipends(stipendState, {
    phase: "events",
    phase_sequence: 4,
    policy: stipendPolicy
  });

  return {
    baseline_shortfall: {
      initialTab: "player",
      sourceSeed: baselineSeed,
      sourceTurnIndex: baselineTurn.preview_state.turn_index,
      stipendApplyResult: null,
      surface: baselineSurface
    },
    carry_forward_overrides: {
      initialTab: "player",
      sourceSeed: carryForwardSeed,
      sourceTurnIndex: carryForwardState.turn_index,
      stipendApplyResult: null,
      surface: carryForwardSurface
    },
    stipend_receipt_modes: {
      initialTab: "player",
      sourceSeed: stipendSeed,
      sourceTurnIndex: stipendState.turn_index,
      stipendApplyResult,
      surface: stipendSurface
    },
    debug_registry_order: {
      initialTab: "debug",
      sourceSeed: baselineSeed,
      sourceTurnIndex: baselineTurn.preview_state.turn_index,
      stipendApplyResult: null,
      surface: baselineSurface
    }
  };
}

export function buildCourtProvisioningFixture(): string {
  const cases = buildCourtProvisioningFixtureCases();

  return `${JSON.stringify(
    Object.fromEntries(
      COURT_PROVISIONING_FIXTURE_SCENARIO_ORDER.map((scenarioId) => [
        scenarioId,
        {
          initial_tab: cases[scenarioId].initialTab,
          source_seed: cases[scenarioId].sourceSeed,
          source_turn_index: cases[scenarioId].sourceTurnIndex,
          surface: compactFixtureCase(scenarioId, cases[scenarioId]),
          stipend_apply_result: compactStipendApplyResult(cases[scenarioId].stipendApplyResult)
        }
      ])
    ),
    null,
    2
  )}\n`;
}
