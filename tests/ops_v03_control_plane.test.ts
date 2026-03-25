import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cwd = "/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy";

function runRubyJson(script: string) {
  return JSON.parse(execFileSync("ruby", [script, "--json"], { cwd, encoding: "utf8" }));
}

describe("ops v0.3 control plane", () => {
  it("validates the imported backlog state", () => {
    const payload = runRubyJson("scripts/opsV03Validate.rb");

    expect(payload.ok).toBe(true);
    expect(payload.summary.current_task_id).toBe("V03-R0-001-T01");
    expect(payload.summary.active_claims).toEqual({});
  });

  it("reports lane-parallel scheduler dry-run state", () => {
    const payload = runRubyJson("scripts/opsV03SchedulerDryRun.rb");

    expect(payload.first_ready_by_lane["codex/v0.3-lane-tooling-qa"]).toBe("V03-R0-001-T01");
    expect(payload.first_ready_by_lane["codex/v0.3-lane-social-mechanics"]).toBe("V03-R0-002-T01");
    expect(payload.first_ready_by_lane["codex/v0.3-lane-engine-core"]).toBeUndefined();
    expect(payload.first_ready_by_lane["codex/v0.3-lane-ui-experience"]).toBeUndefined();
    expect(payload.first_claimable_by_lane["codex/v0.3-lane-economy-fiscal"]).toBeUndefined();
    expect(payload.first_claimable_by_lane["codex/v0.3-lane-engine-core"]).toBeUndefined();
    expect(payload.first_claimable_by_lane["codex/v0.3-lane-ui-experience"]).toBeUndefined();
    expect(payload.first_claimable_by_lane["codex/v0.3-lane-world-topology"]).toBeUndefined();
    expect(payload.current_task_id_expected).toBe("V03-R0-001-T01");
  });

  it("shows no immediate ready-task rebases", () => {
    const payload = runRubyJson("scripts/opsV03RebaseDryRun.rb");

    const immediate = payload.ready_tasks.filter((task: { task_id: string }) =>
      [
        "V03-R0-001-T01",
        "V03-R0-002-T01",
        "V03-R0-005-T01"
      ].includes(task.task_id)
    );

    expect(immediate.map((task: { task_id: string }) => task.task_id)).toEqual([
      "V03-R0-001-T01",
      "V03-R0-002-T01",
      "V03-R0-005-T01"
    ]);
    expect(immediate.every((task: { should_rebase: boolean }) => task.should_rebase === false)).toBe(true);
  });
});
