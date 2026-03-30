import { syncHouseRegistryCurrentHeads } from "./actors";
import { ensureCourtOfficers } from "./court";
import { ensurePeopleFirst } from "./peopleFirst";
import { ensureStateSchemaScaffold } from "./stateSchema";
import { ensureEconomyRegistryPlaceholder, ensurePortfolioRegistryPlaceholder } from "./stateRegistryPlaceholders";
import type { RunState } from "./types";
import { ensureExternalHousesSeed_v0_2_2 } from "./worldgen";

export const STATE_MIGRATION_PLAN_SCHEMA_VERSION = "state_migration_plan_v1" as const;

export interface StateMigrationStepV1 {
  step_id: string;
  description: string;
  apply: (state: RunState) => void;
}

export interface StateMigrationPlanV1 {
  schema_version: typeof STATE_MIGRATION_PLAN_SCHEMA_VERSION;
  plan_id: string;
  description: string;
  steps: readonly StateMigrationStepV1[];
}

export interface StateMigrationRunResultV1 {
  schema_version: typeof STATE_MIGRATION_PLAN_SCHEMA_VERSION;
  plan_id: string;
  executed_step_ids: string[];
}

function defineStateMigrationStep(
  step_id: string,
  description: string,
  apply: (state: RunState) => void
): StateMigrationStepV1 {
  return { step_id, description, apply };
}

function defineStateMigrationPlan(
  plan_id: string,
  description: string,
  steps: readonly StateMigrationStepV1[]
): StateMigrationPlanV1 {
  return {
    schema_version: STATE_MIGRATION_PLAN_SCHEMA_VERSION,
    plan_id,
    description,
    steps
  };
}

export const NO_OP_STATE_MIGRATION_STEP = defineStateMigrationStep(
  "noop_state_migration",
  "Reserved no-op step for future additive migration plans.",
  () => {}
);

export const STATE_SCHEMA_SCAFFOLD_MIGRATION_STEP = defineStateMigrationStep(
  "state_schema_scaffold_v0_3_1",
  "Ensure explicit state schema metadata and the bounded registry manifest exist.",
  (state) => {
    ensureStateSchemaScaffold(state);
  }
);

export const PEOPLE_FIRST_MIGRATION_STEP = defineStateMigrationStep(
  "people_first_v0_2_1",
  "Ensure the People-First registries and canonical player-house pointers exist.",
  (state) => {
    ensurePeopleFirst(state);
  }
);

export const ECONOMY_PLACEHOLDER_MIGRATION_STEP = defineStateMigrationStep(
  "economy_placeholder_v0_3_1",
  "Ensure the tracked manor economy surface and placeholder registry scaffold exist.",
  (state) => {
    ensureEconomyRegistryPlaceholder(state);
  }
);

export const PORTFOLIO_PLACEHOLDER_MIGRATION_STEP = defineStateMigrationStep(
  "portfolio_placeholder_v0_3_1",
  "Ensure the additive empty portfolio registry scaffold exists.",
  (state) => {
    ensurePortfolioRegistryPlaceholder(state);
  }
);

export const EXTERNAL_HOUSES_MIGRATION_STEP = defineStateMigrationStep(
  "external_houses_v0_2_2",
  "Seed or refresh the deterministic external-house registries.",
  (state) => {
    ensureExternalHousesSeed_v0_2_2(state);
  }
);

export const HOUSE_REGISTRY_HEADS_MIGRATION_STEP = defineStateMigrationStep(
  "house_registry_current_heads_v0_2_2",
  "Resync current house head and spouse pointers from the canonical registries.",
  (state) => {
    syncHouseRegistryCurrentHeads(state);
  }
);

export const COURT_OFFICERS_MIGRATION_STEP = defineStateMigrationStep(
  "court_officers_v0_2_4",
  "Ensure deterministic court-officer and service-record scaffolds are present.",
  (state) => {
    ensureCourtOfficers(state);
  }
);

export const NO_OP_STATE_MIGRATION_PLAN = defineStateMigrationPlan(
  "noop_state_plan_v1",
  "Execute a single no-op migration step without mutating state.",
  [NO_OP_STATE_MIGRATION_STEP]
);

export const CREATE_NEW_RUN_STATE_MIGRATION_PLAN = defineStateMigrationPlan(
  "create_new_run_state_v1",
  "Apply the additive post-construction registry scaffolds for freshly created runs.",
  [
    STATE_SCHEMA_SCAFFOLD_MIGRATION_STEP,
    ECONOMY_PLACEHOLDER_MIGRATION_STEP,
    PORTFOLIO_PLACEHOLDER_MIGRATION_STEP,
    PEOPLE_FIRST_MIGRATION_STEP,
    EXTERNAL_HOUSES_MIGRATION_STEP,
    COURT_OFFICERS_MIGRATION_STEP,
    PEOPLE_FIRST_MIGRATION_STEP
  ]
);

export const PREVIEW_LOAD_STATE_MIGRATION_PLAN = defineStateMigrationPlan(
  "preview_load_state_v1",
  "Apply additive registry migrations before turn preview generation.",
  [
    STATE_SCHEMA_SCAFFOLD_MIGRATION_STEP,
    ECONOMY_PLACEHOLDER_MIGRATION_STEP,
    PORTFOLIO_PLACEHOLDER_MIGRATION_STEP,
    PEOPLE_FIRST_MIGRATION_STEP,
    EXTERNAL_HOUSES_MIGRATION_STEP,
    HOUSE_REGISTRY_HEADS_MIGRATION_STEP,
    COURT_OFFICERS_MIGRATION_STEP
  ]
);

export const LEGACY_APPLY_INPUT_STATE_MIGRATION_PLAN = defineStateMigrationPlan(
  "legacy_apply_input_state_v1",
  "Apply the minimum additive migration set needed before legacy states can be snapshotted for applyDecisions().",
  [
    STATE_SCHEMA_SCAFFOLD_MIGRATION_STEP,
    ECONOMY_PLACEHOLDER_MIGRATION_STEP,
    PORTFOLIO_PLACEHOLDER_MIGRATION_STEP,
    PEOPLE_FIRST_MIGRATION_STEP
  ]
);

export function runStateMigrationPlan(state: RunState, plan: StateMigrationPlanV1): StateMigrationRunResultV1 {
  const executed_step_ids: string[] = [];
  for (const step of plan.steps) {
    step.apply(state);
    executed_step_ids.push(step.step_id);
  }
  return {
    schema_version: STATE_MIGRATION_PLAN_SCHEMA_VERSION,
    plan_id: plan.plan_id,
    executed_step_ids
  };
}
