import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const cwd = process.cwd();
const createdDirs = [];

function makeFixtureDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "ops-v03-intake-audit-"));
  createdDirs.push(dir);
  mkdirSync(path.join(dir, "ops", "v0.3", "progress", "runs"), { recursive: true });
  return dir;
}

function writeFixtureFiles(dir, { backlogTaskBody, reportBody }) {
  const backlogPath = path.join(dir, "backlog.yaml");
  const runtimeContractPath = path.join(dir, "runtime-contract.yaml");
  const reportPath = path.join(dir, "ops", "v0.3", "progress", "runs", "V03-R6-999-T01.md");

  writeFileSync(backlogPath, `version: 2\ntasks:\n  - id: V03-R6-999-T01\n${backlogTaskBody}`);
  writeFileSync(runtimeContractPath, `version: 1\ncontrol_plane_rules:\n  lane_acceptance:\n    intake_audit_required: true\n    require_completed_for_acceptance: true\n    task_packet_fields:\n      - exact_deliverables\n      - definition_of_done\n      - required_test_updates\n      - stop_rules\n      - handoff_requirements\n    allowed_delivery_states:\n      - completed\n      - blocked\n      - advanced_not_claimable\n    required_report_metadata:\n      - Task ID\n      - Branch\n      - Commit\n    required_report_sections:\n      - Delivery state\n      - Task evidence\n      - Handoff\n    required_report_fields:\n      Delivery state:\n        - state\n        - summary\n      Task evidence:\n        - changed_files\n        - contracts_or_surfaces\n        - tests_run\n      Handoff:\n        - next_task_hint\n        - do_not_advance\n        - blockers\n`);
  writeFileSync(reportPath, reportBody);

  return { backlogPath, runtimeContractPath };
}

function runAudit(args) {
  return spawnSync("ruby", ["scripts/opsV03IntakeAudit.rb", "--json", ...args], {
    cwd,
    encoding: "utf8"
  });
}

afterEach(() => {
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop(), { recursive: true, force: true });
  }
});

describe("ops v0.3 intake audit", () => {
  it("passes a completed handoff packet with the required report structure", () => {
    const dir = makeFixtureDir();
    const reportBody = `# Run Log

**Run ID:** demo-run
**Task ID:** V03-R6-999-T01
**Date:** 2026-04-18
**Branch:** codex/v0.3-lane-social-mechanics
**Commit:** abc123
**PR URL:**
**PR Status:**

## Delivery state
- state: completed
- summary: Shipped the contract and updated the player-facing surface.

## Task evidence
- changed_files:
  - src/sim/domains/people/knownHouseSummaries.ts
  - tests/sim/bounded_snapshot_contract.test.ts
- contracts_or_surfaces:
  - house_dossier_summary_v2
- tests_run:
  - npm exec vitest run tests/sim/bounded_snapshot_contract.test.ts

## Handoff
- next_task_hint:
  - V03-R6-007-T01
- do_not_advance:
  - do not start downstream dossier work until accepted
- blockers:
  - none
`;
    const { backlogPath, runtimeContractPath } = writeFixtureFiles(dir, {
      backlogTaskBody: `    exact_deliverables:\n      - ship the v2 contract\n    definition_of_done:\n      - bounded snapshot exposes standing and delta separately\n    required_test_updates:\n      - extend the bounded snapshot contract test\n    stop_rules:\n      - do not start the next task until accepted\n    handoff_requirements:\n      - include changed files and focused test output\n    handoff:\n      report_path: ops/v0.3/progress/runs/V03-R6-999-T01.md\n`,
      reportBody
    });

    const result = runAudit([
      "--task", "V03-R6-999-T01",
      "--root", dir,
      "--backlog", backlogPath,
      "--runtime-contract", runtimeContractPath,
      "--require-completed"
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.claimable).toBe(true);
    expect(payload.delivery_state).toBe("completed");
  });

  it("allows a structurally valid blocked handoff without marking it claimable", () => {
    const dir = makeFixtureDir();
    const reportBody = `# Run Log

**Run ID:** demo-run
**Task ID:** V03-R6-999-T01
**Date:** 2026-04-18
**Branch:** codex/v0.3-lane-economy-fiscal
**Commit:** def456
**PR URL:**
**PR Status:**

## Delivery state
- state: blocked
- summary: Progress landed, but successor rebasing still needs one more fixture.

## Task evidence
- changed_files:
  - src/sim/domains/experience/obligationsView.ts
- contracts_or_surfaces:
  - economy_obligations_view_v2
- tests_run:
  - npm exec vitest run tests/sim/obligations_view.test.ts

## Handoff
- next_task_hint:
  - finish the rebasing fixture and rerun the focused test
- do_not_advance:
  - do not begin V03-R6-003-T01 until this task is accepted
- blockers:
  - missing clergy vacancy fixture
`;
    const { backlogPath, runtimeContractPath } = writeFixtureFiles(dir, {
      backlogTaskBody: `    exact_deliverables:\n      - ship successor-or-vacancy rebasing\n    definition_of_done:\n      - the view exposes truthful collector labels\n    required_test_updates:\n      - extend obligations view tests with successor and vacancy cases\n    stop_rules:\n      - do not start the next task until accepted\n    handoff_requirements:\n      - include the focused test output\n    handoff:\n      report_path: ops/v0.3/progress/runs/V03-R6-999-T01.md\n`,
      reportBody
    });

    const result = runAudit([
      "--task", "V03-R6-999-T01",
      "--root", dir,
      "--backlog", backlogPath,
      "--runtime-contract", runtimeContractPath
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.claimable).toBe(false);
    expect(payload.delivery_state).toBe("blocked");
    expect(payload.warnings[0]).toContain("structurally valid but not claimable");
  });

  it("fails when the task packet is incomplete even if a report exists", () => {
    const dir = makeFixtureDir();
    const reportBody = `# Run Log

**Run ID:** demo-run
**Task ID:** V03-R6-999-T01
**Date:** 2026-04-18
**Branch:** codex/v0.3-lane-social-mechanics
**Commit:** ghi789
**PR URL:**
**PR Status:**

## Delivery state
- state: completed
- summary: Tried to hand back the task.

## Task evidence
- changed_files:
  - src/ui/panels/KnownHousesPanel.tsx
- contracts_or_surfaces:
  - dossier surface wiring
- tests_run:
  - npm exec vitest run tests/sim/known_house_snapshot_fields.test.ts

## Handoff
- next_task_hint:
  - V03-R6-007-T01
- do_not_advance:
  - do not start downstream work until accepted
- blockers:
  - none
`;
    const { backlogPath, runtimeContractPath } = writeFixtureFiles(dir, {
      backlogTaskBody: `    exact_deliverables:\n      - ship the v2 contract\n    required_test_updates:\n      - extend the bounded snapshot contract test\n    stop_rules:\n      - do not start the next task until accepted\n    handoff_requirements:\n      - include changed files and focused test output\n    handoff:\n      report_path: ops/v0.3/progress/runs/V03-R6-999-T01.md\n`,
      reportBody
    });

    const result = runAudit([
      "--task", "V03-R6-999-T01",
      "--root", dir,
      "--backlog", backlogPath,
      "--runtime-contract", runtimeContractPath,
      "--require-completed"
    ]);

    expect(result.status).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(false);
    expect(payload.errors.some((error) => error.includes("missing or empty task packet field definition_of_done"))).toBe(true);
  });
});
