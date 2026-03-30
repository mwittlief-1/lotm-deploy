import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  NO_OP_STATE_MIGRATION_PLAN,
  NO_OP_STATE_MIGRATION_STEP,
  PREVIEW_LOAD_STATE_MIGRATION_PLAN,
  STATE_MIGRATION_PLAN_SCHEMA_VERSION,
  type StateMigrationPlanV1,
  runStateMigrationPlan
} from "../../src/sim/migrations";
import { RUN_STATE_SCHEMA_VERSION } from "../../src/sim/stateSchema";
import type { RunState } from "../../src/sim/types";

function loadLegacyFixture(): any {
  const fixturePath = path.resolve("tests/fixtures/v0.1.0_state_fixture.json");
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value: unknown): string {
  const helper = (node: unknown): unknown => {
    if (node === null || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(helper);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(node).sort((left, right) => left.localeCompare(right))) {
      out[key] = helper((node as Record<string, unknown>)[key]);
    }
    return out;
  };
  return JSON.stringify(helper(value));
}

describe("state migration runner", () => {
  it("executes migration steps in plan order and reports the executed ids", () => {
    const state = createNewRun("state_migration_order_v031");
    const anyState = state as RunState & { flags: Record<string, unknown> };

    const testPlan: StateMigrationPlanV1 = {
      schema_version: STATE_MIGRATION_PLAN_SCHEMA_VERSION,
      plan_id: "test_order_v1",
      description: "Exercise ordered execution with a no-op step in the middle.",
      steps: [
        {
          step_id: "append_alpha",
          description: "Append alpha to the migration trace.",
          apply: (draft) => {
            const flags = (draft.flags ?? {}) as Record<string, unknown>;
            const trace = Array.isArray(flags._migration_trace) ? [...(flags._migration_trace as string[])] : [];
            trace.push("alpha");
            flags._migration_trace = trace;
            draft.flags = flags;
          }
        },
        NO_OP_STATE_MIGRATION_STEP,
        {
          step_id: "append_omega",
          description: "Append omega to the migration trace.",
          apply: (draft) => {
            const flags = (draft.flags ?? {}) as Record<string, unknown>;
            const trace = Array.isArray(flags._migration_trace) ? [...(flags._migration_trace as string[])] : [];
            trace.push("omega");
            flags._migration_trace = trace;
            draft.flags = flags;
          }
        }
      ]
    };

    const result = runStateMigrationPlan(anyState, testPlan);

    expect(result.schema_version).toBe(STATE_MIGRATION_PLAN_SCHEMA_VERSION);
    expect(result.plan_id).toBe("test_order_v1");
    expect(result.executed_step_ids).toEqual(["append_alpha", NO_OP_STATE_MIGRATION_STEP.step_id, "append_omega"]);
    expect((anyState.flags._migration_trace as string[])).toEqual(["alpha", "omega"]);
  });

  it("supports a no-op migration plan without mutating state", () => {
    const state = createNewRun("state_migration_noop_v031");
    const before = stableStringify(state);

    const result = runStateMigrationPlan(state, NO_OP_STATE_MIGRATION_PLAN);

    expect(result.executed_step_ids).toEqual([NO_OP_STATE_MIGRATION_STEP.step_id]);
    expect(stableStringify(state)).toBe(before);
  });

  it("applies the preview-load migration plan deterministically to legacy fixtures", () => {
    const left = loadLegacyFixture();
    const right = loadLegacyFixture();

    const leftResult = runStateMigrationPlan(left as RunState, PREVIEW_LOAD_STATE_MIGRATION_PLAN);
    const rightResult = runStateMigrationPlan(right as RunState, PREVIEW_LOAD_STATE_MIGRATION_PLAN);

    expect(leftResult.executed_step_ids).toEqual(
      PREVIEW_LOAD_STATE_MIGRATION_PLAN.steps.map((step) => step.step_id)
    );
    expect(rightResult.executed_step_ids).toEqual(leftResult.executed_step_ids);
    expect((left as any).state_schema_version).toBe(RUN_STATE_SCHEMA_VERSION);
    expect((left as any).people && typeof (left as any).people === "object").toBe(true);
    expect((left as any).houses && typeof (left as any).houses === "object").toBe(true);
    expect(typeof (left as any).player_house_id).toBe("string");

    const picked = (value: any) => ({
      state_schema_version: value.state_schema_version,
      bounded_registry_manifest: value.bounded_registry_manifest,
      people: value.people,
      houses: value.houses,
      player_house_id: value.player_house_id,
      kinship_edges: value.kinship_edges,
      service_records: value.service_records,
      institutions: value.institutions
    });

    expect(stableStringify(picked(left))).toBe(stableStringify(picked(right)));
  });
});
