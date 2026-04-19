import { settleEconomyObligationCounterparty } from "../../src/sim/domains/economy/obligationRegistry";
import { applyEconomyObligationCloseTurnStage } from "../../src/sim/domains/economy/obligationEnforcement";
import { buildEconomyObligationsView } from "../../src/sim/domains/experience/obligationsView";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import { buildCourtDecisionBudgetSurface } from "../../src/ui/playScreenCourtBudget";
import {
  buildObligationsCounterpartyContract,
  type ObligationsCounterpartyContract,
  type ObligationsCounterpartyContractSection
} from "../../src/ui/playScreenObligations";

export const OBLIGATIONS_VISIBILITY_FIXTURE_SCENARIO_ORDER = [
  "split_payment_successor_rebase",
  "church_vacancy_carry"
] as const;

export type ObligationsVisibilityFixtureScenarioId = (typeof OBLIGATIONS_VISIBILITY_FIXTURE_SCENARIO_ORDER)[number];

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

function mkState(runSeed: string): RunState {
  const head = mkPerson("p_head", "Lord Rowan", "M", 40);
  const spouse = mkPerson("p_spouse", "Lady Rowan", "F", 38);
  const liege = mkPerson("p_liege", "House Liege", "M", 50);
  const clergy = mkPerson("p_clergy", "Parish Church", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: runSeed,
    turn_index: 7,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 16,
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
    throw new Error("Expected a court-decision budget surface for obligations visibility fixtures.");
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
    helper: section.helper,
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

function configureSuccessorCollectors(state: RunState): void {
  const liegeSuccessor = {
    ...mkPerson("p_liege_successor", "Lady Regent", "F", 36),
    house_id: "h_liege",
    residence_house_id: "h_liege"
  };
  const churchSuccessor = mkPerson("p_clergy_successor", "Father Aldwyn", "M", 37);

  state.locals.liege.alive = false;
  state.locals.clergy.alive = false;

  (state as any).player_house_id = "h_player";
  (state as any).people = {
    [state.house.head.id]: state.house.head,
    [state.house.spouse!.id]: state.house.spouse,
    [state.locals.liege.id]: state.locals.liege,
    [state.locals.clergy.id]: state.locals.clergy,
    [liegeSuccessor.id]: liegeSuccessor,
    [churchSuccessor.id]: churchSuccessor
  };
  (state as any).houses = {
    h_player: {
      id: "h_player",
      head_id: state.house.head.id,
      spouse_id: state.house.spouse!.id,
      child_ids: [],
      member_person_ids: [state.house.head.id, state.house.spouse!.id]
    },
    h_liege: {
      id: "h_liege",
      house_name: "House Westmarch",
      head_id: state.locals.liege.id,
      spouse_id: null,
      child_ids: [liegeSuccessor.id],
      member_person_ids: [state.locals.liege.id, liegeSuccessor.id]
    }
  };
  (state as any).institutions = {
    parish_st_cuthbert: {
      id: "parish_st_cuthbert",
      type: "parish",
      name: "St. Cuthbert Parish",
      patron_actor_id: { kind: "house", id: "h_player" },
      priest_person_id: churchSuccessor.id
    }
  };
  (state.locals as any).parish_institution_id = "parish_st_cuthbert";
}

function configureChurchVacancy(state: RunState): void {
  state.locals.clergy.alive = false;

  (state as any).player_house_id = "h_player";
  (state as any).people = {
    [state.house.head.id]: state.house.head,
    [state.house.spouse!.id]: state.house.spouse,
    [state.locals.clergy.id]: state.locals.clergy,
    [state.locals.liege.id]: state.locals.liege
  };
  (state as any).houses = {
    h_player: {
      id: "h_player",
      head_id: state.house.head.id,
      spouse_id: state.house.spouse!.id,
      child_ids: [],
      member_person_ids: [state.house.head.id, state.house.spouse!.id]
    }
  };
  (state as any).institutions = {
    parish_st_cuthbert: {
      id: "parish_st_cuthbert",
      type: "parish",
      name: "St. Cuthbert Parish",
      patron_actor_id: { kind: "house", id: "h_player" },
      priest_person_id: state.locals.clergy.id
    }
  };
  (state.locals as any).parish_institution_id = "parish_st_cuthbert";
}

function buildSplitPaymentSuccessorRebaseCase(): ObligationsCounterpartyContract {
  const state = mkState("obligations_visibility_successor_seed");
  configureSuccessorCollectors(state);
  state.manor.obligations.tax_due_coin = 6;
  state.manor.obligations.arrears.coin = 2;
  state.manor.obligations.tithe_due_bushels = 5;
  state.manor.obligations.arrears.bushels = 1;

  settleEconomyObligationCounterparty(state, {
    phase: "obligations",
    phase_sequence: 4,
    counterparty_kind: "liege",
    requested_amount: 5,
    rule_id: "obligations.visibility_fixture.liege",
    related_actor_ids: [state.house.head.id, "p_liege_successor"]
  });
  settleEconomyObligationCounterparty(state, {
    phase: "obligations",
    phase_sequence: 5,
    counterparty_kind: "church",
    requested_amount: 2,
    rule_id: "obligations.visibility_fixture.church",
    related_actor_ids: [state.house.head.id, "p_clergy_successor"]
  });
  applyEconomyObligationCloseTurnStage(state, {
    phase: "succession",
    phase_sequence: 9,
    rule_prefix: "obligations.visibility_fixture",
    related_actor_ids: [state.house.head.id, "p_liege_successor", "p_clergy_successor"]
  });

  return contractFromState(state);
}

function buildChurchVacancyCarryCase(): ObligationsCounterpartyContract {
  const state = mkState("obligations_visibility_vacancy_seed");
  configureChurchVacancy(state);
  state.manor.obligations.tithe_due_bushels = 5;
  state.manor.obligations.arrears.bushels = 3;

  applyEconomyObligationCloseTurnStage(state, {
    phase: "succession",
    phase_sequence: 9,
    rule_prefix: "obligations.visibility_fixture",
    related_actor_ids: [state.house.head.id]
  });

  return contractFromState(state);
}

export function buildObligationsVisibilityFixtureCases() {
  return {
    split_payment_successor_rebase: buildSplitPaymentSuccessorRebaseCase(),
    church_vacancy_carry: buildChurchVacancyCarryCase()
  } satisfies Record<ObligationsVisibilityFixtureScenarioId, ObligationsCounterpartyContract>;
}

export function buildObligationsVisibilityFixture(): string {
  const cases = buildObligationsVisibilityFixtureCases();

  return `${JSON.stringify(
    Object.fromEntries(
      OBLIGATIONS_VISIBILITY_FIXTURE_SCENARIO_ORDER.map((scenarioId) => [
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

export function buildObligationsVisibilityEvidencePack() {
  return {
    kind: "obligations_visibility_evidence_pack_v1",
    release: "v0.3.6",
    acceptance_id: "obligations_visibility",
    docs_entry_path: "docs/qa/obligations_visibility_evidence_pack_v0.3.6.md",
    fixture_snapshot_path: "tests/fixtures/obligations_visibility_snapshot_v0.3.6.json",
    scenario_gate_artifact_path: "qa_artifacts/playtest_ops/uat_scenario_gate.json",
    cases: [
      {
        fixture_case_id: "split_payment_successor_rebase",
        deterministic_seed_name: "obligations_visibility_successor_seed",
        expected_focus: "overview",
        live_gate_preset_ids: ["uat_arrears_enforcement"],
        live_gate_scenario_id: "uat_arrears_enforcement",
        steps: [
          "Open the obligations detail sheet and keep the overview focus active.",
          "Confirm liege and church sections both show successor collectors instead of the deceased office holders.",
          "Verify partial settlement cleared carried arrears first, then current dues rolled forward into arrears with penalty-trail receipts."
        ],
        expected_cues: [
          "Lady Regent now collects liege dues after House Liege died.",
          "Father Aldwyn now collects church dues for St. Cuthbert Parish after Parish Church died.",
          "Stage-one enforcement pressure rose"
        ]
      },
      {
        fixture_case_id: "church_vacancy_carry",
        deterministic_seed_name: "obligations_visibility_vacancy_seed",
        expected_focus: "church",
        live_gate_preset_ids: [],
        live_gate_scenario_id: null,
        steps: [
          "Open the obligations detail sheet and focus Church.",
          "Confirm the dead clergy collector rebases to the parish institution vacancy instead of staying on the deceased actor.",
          "Verify carry receipts and stage-one consequence copy still reference the vacant parish seat."
        ],
        expected_cues: [
          "St. Cuthbert Parish has no living priest; dues remain with the institution until a successor is placed.",
          "St. Cuthbert Parish (Vacant): 8 bushels in arrears.",
          "Penalty trail"
        ]
      }
    ],
    source_artifacts: [
      {
        artifact_relpath: "tests/fixtures/obligations_visibility_snapshot_v0.3.6.json",
        label: "obligations visibility fixture snapshot"
      },
      {
        artifact_relpath: "qa_artifacts/playtest_ops/uat_scenarios_v0.3.json",
        label: "uat scenario pack"
      },
      {
        artifact_relpath: "qa_artifacts/playtest_ops/uat_scenario_gate.json",
        label: "uat scenario gate"
      }
    ]
  };
}

export function serializeObligationsVisibilityEvidencePack(): string {
  return `${JSON.stringify(buildObligationsVisibilityEvidencePack(), null, 2)}\n`;
}
