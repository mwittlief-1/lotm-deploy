import { applyEconomyObligationCloseTurnStage } from "../../src/sim/domains/economy/obligationEnforcement";
import {
  applyEconomyObligationEnterpriseSeizure,
  applyEconomyObligationForcedStorePayment
} from "../../src/sim/domains/economy/obligationTangibleBite";
import { buildEconomyObligationsView } from "../../src/sim/domains/experience/obligationsView";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import { buildCourtDecisionBudgetSurface } from "../../src/ui/playScreenCourtBudget";
import {
  buildObligationsCounterpartyContract,
  type ObligationsCounterpartyContract,
  type ObligationsCounterpartyContractSection
} from "../../src/ui/playScreenObligations";

export const OBLIGATIONS_FIXTURE_SCENARIO_ORDER = [
  "arrears_carry",
  "forced_payment",
  "seizure_preview",
  "terminal_stage_visibility"
] as const;

export type ObligationsFixtureScenarioId = (typeof OBLIGATIONS_FIXTURE_SCENARIO_ORDER)[number];

function mkPerson(id: string, name: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "Lord Rowan", "M", 40);
  const spouse = mkPerson("p_spouse", "Lady Rowan", "F", 38);
  const liege = mkPerson("p_liege", "House Liege", "M", 50);
  const clergy = mkPerson("p_clergy", "Parish Church", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "obligations_fixture_seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 20,
      meat_stores: 6,
      coin: 12,
      unrest: 12,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null
      }
    } as any,
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [],
      energy: { max: 3, available: 3 },
      heir_id: null
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: []
  };
}

function defaultCourtDecisionBudget() {
  const surface = buildCourtDecisionBudgetSurface(null, {
    court_decision_budget: {
      schema_version: "court_decision_budget_view_v0",
      limit: 6,
      spent: 0,
      remaining: 6,
      exhausted: false,
      actions: [
        { action: "gift_liege", cost: 1, spent: 0 },
        { action: "offering_church", cost: 1, spent: 0 },
        { action: "marriage_inbound", cost: 1, spent: 0 },
        { action: "marriage_scout", cost: 2, spent: 0 }
      ]
    }
  });

  if (!surface) {
    throw new Error("Expected a court-decision budget surface for obligations fixtures.");
  }

  return surface;
}

function contractFromState(state: RunState): ObligationsCounterpartyContract {
  const contract = buildObligationsCounterpartyContract({
    courtDecisionBudget: defaultCourtDecisionBudget(),
    previewState: {
      ...(state as any),
      economy_obligations_view: buildEconomyObligationsView(state)
    }
  });

  if (!contract) {
    throw new Error("Expected an obligations counterparty contract.");
  }

  return contract;
}

function compactSection(section: ObligationsCounterpartyContractSection) {
  return {
    id: section.id,
    title: section.title,
    short_title: section.shortTitle,
    settlement_status: section.settlementStatus,
    due_group: section.dueGroup,
    payment_modes: section.paymentModes,
    penalty_group: section.penaltyGroup,
    stage_rows: section.stageRows,
    tangible_bite_preview: section.tangibleBitePreview,
    terminal_risk: section.terminalRisk,
    receipt_groups: section.receiptGroups.map((group) => ({
      id: group.id,
      label: group.label,
      category_order: group.categoryOrder,
      receipt_count: group.receiptCount,
      rows: group.rows
    }))
  };
}

export function buildObligationsFixtureCases() {
  const arrearsCarry = mkState();
  arrearsCarry.manor.obligations.tax_due_coin = 7;
  arrearsCarry.manor.obligations.tithe_due_bushels = 9;
  applyEconomyObligationCloseTurnStage(arrearsCarry, {
    phase: "succession",
    phase_sequence: 9,
    rule_prefix: "obligations.close_turn",
    related_actor_ids: ["p_head", "p_liege", "p_clergy"]
  });

  const forcedPayment = mkState();
  forcedPayment.manor.bushels_stored = 14;
  forcedPayment.manor.obligations.arrears.bushels = 9;
  applyEconomyObligationForcedStorePayment(forcedPayment, {
    phase: "obligations",
    phase_sequence: 6,
    counterparty_kind: "church",
    asset: "food_stores",
    requested_amount: 2,
    cap_amount: 2,
    rule_id: "enforcement.forced_payment.church_followup",
    related_actor_ids: ["p_clergy", "p_head"]
  });

  const seizurePreview = mkState();
  seizurePreview.manor.obligations.arrears.coin = 4;

  const terminalStage = mkState();
  terminalStage.manor.obligations.arrears.coin = 6;
  terminalStage.manor.unrest = 100;

  return {
    arrears_carry: contractFromState(arrearsCarry),
    forced_payment: contractFromState(forcedPayment),
    seizure_preview: contractFromState(seizurePreview),
    terminal_stage_visibility: contractFromState(terminalStage)
  } satisfies Record<ObligationsFixtureScenarioId, ObligationsCounterpartyContract>;
}

export function buildObligationsFixture(): string {
  const cases = buildObligationsFixtureCases();

  return `${JSON.stringify(
    Object.fromEntries(
      OBLIGATIONS_FIXTURE_SCENARIO_ORDER.map((scenarioId) => [
        scenarioId,
        {
          counterparty_order: cases[scenarioId].counterpartyOrder,
          receipt_category_order: cases[scenarioId].receiptCategoryOrder,
          sections: cases[scenarioId].counterpartySections.map((section) => compactSection(section))
        }
      ])
    ),
    null,
    2
  )}\n`;
}
