import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cwd = process.cwd();
const closeoutPath = path.join(cwd, "qa_artifacts/playtest_ops/v0.3.6/release_closeout.json");

function readJson(relpath) {
  return JSON.parse(fs.readFileSync(path.join(cwd, relpath), "utf8"));
}

describe("v0.3.6 release closeout", () => {
  it("maps all UAT stories to accepted covered evidence", () => {
    const closeout = readJson("qa_artifacts/playtest_ops/v0.3.6/release_closeout.json");
    expect(closeout.kind).toBe("v0.3.6_release_story_closeout_v1");
    expect(closeout.release).toBe("v0.3.6");
    expect(closeout.status).toBe("release_close_ready");
    expect(closeout.story_totals).toEqual({
      total: 45,
      covered: 45,
      partially_covered: 0,
      unstarted: 0
    });

    expect(closeout.story_coverage).toHaveLength(45);
    expect(closeout.story_coverage.map((entry) => entry.story_id)).toEqual(
      Array.from({ length: 45 }, (_, index) => `US-${String(index + 1).padStart(2, "0")}`)
    );
    expect(closeout.story_coverage.every((entry) => entry.status === "covered")).toBe(true);
    expect(closeout.story_coverage.every((entry) => entry.tasks.length > 0)).toBe(true);
  });

  it("records clean gate evidence and committed reviewer entry points", () => {
    const closeout = JSON.parse(fs.readFileSync(closeoutPath, "utf8"));
    const gate = closeout.gate_evidence;

    expect(gate.qa.status).toBe("pass");
    expect(gate.qa.vitest_suites).toBeGreaterThan(0);
    expect(gate.qa.vitest_tests).toBeGreaterThan(0);
    expect(gate.qa.uat_gate_failed).toBe(0);
    expect(fs.existsSync(path.join(cwd, gate.qa.artifact_relpath))).toBe(true);
    expect(fs.existsSync(path.join(cwd, gate.qa.uat_gate_relpath))).toBe(true);

    expect(gate.preflight.status).toBe("pass");
    expect(gate.preflight.test3_mismatches).toBe(0);
    expect(fs.existsSync(path.join(cwd, gate.preflight.artifact_relpath))).toBe(true);
    expect(fs.existsSync(path.join(cwd, gate.preflight.baseline_contract_relpath))).toBe(true);

    expect(gate.seed_replay_batch_twice.status).toBe("pass");
    expect(gate.seed_replay_batch_twice.run1_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(gate.seed_replay_batch_twice.run1_hash).toBe(gate.seed_replay_batch_twice.run2_hash);

    for (const relpath of Object.values(closeout.checklist_sources)) {
      expect(fs.existsSync(path.join(cwd, relpath))).toBe(true);
    }
    expect(closeout.final_blockers).toEqual([]);
  });

  it("keeps the human-readable closeout doc pointed at the JSON packet", () => {
    const doc = fs.readFileSync(path.join(cwd, "docs/qa/v0.3.6_release_closeout.md"), "utf8");
    expect(doc).toContain("45 covered / 0 partially covered / 0 unstarted");
    expect(doc).toContain("qa_artifacts/playtest_ops/v0.3.6/release_closeout.json");
    expect(doc).toContain("490f2fb2f7842cdf1eead8a6a9a1b8617871b0b550909d2e0c139a7dff2ecf5b");
  });
});
