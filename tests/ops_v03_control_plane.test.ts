import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cwd = process.cwd();

function runRubyJson(script: string) {
  return JSON.parse(execFileSync("ruby", [script, "--json"], { cwd, encoding: "utf8" }));
}

describe("ops v0.3 control plane", () => {
  it("validates the imported backlog state", () => {
    const payload = runRubyJson("scripts/opsV03Validate.rb");

    expect(payload.ok).toBe(true);
    expect(typeof payload.summary.current_task_id).toBe("string");
    expect(payload.summary.active_claims).toBeTypeOf("object");
  });

  it("reports lane-parallel scheduler dry-run state", () => {
    const validated = runRubyJson("scripts/opsV03Validate.rb");
    const payload = runRubyJson("scripts/opsV03SchedulerDryRun.rb");

    expect(payload.active_claims).toEqual(validated.summary.active_claims);
    expect(payload.first_ready_by_lane).toEqual(validated.summary.first_ready_by_lane);
    expect(payload.first_claimable_by_lane).toEqual(validated.summary.first_claimable_by_lane);
    expect(payload.first_ready_by_lane["codex/v0.3-lane-world-topology"]).toBeUndefined();
    expect(payload.first_claimable_by_lane["codex/v0.3-lane-world-topology"]).toBeUndefined();

    for (const lane of Object.keys(payload.active_claims)) {
      expect(payload.first_claimable_by_lane[lane]).toBeUndefined();
    }

    expect(payload.current_task_id_expected).toBe(validated.summary.current_task_id);
  });

  it("shows no immediate ready-task rebases", () => {
    const payload = runRubyJson("scripts/opsV03RebaseDryRun.rb");
    expect(Array.isArray(payload.ready_tasks)).toBe(true);
    expect(payload.ready_tasks.every((task: { should_rebase: boolean }) => task.should_rebase === false)).toBe(true);
    expect(
      payload.ready_tasks.every((task: { reason: string }) => typeof task.reason === "string" && task.reason.length > 0)
    ).toBe(true);
  });
});
