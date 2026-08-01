import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const artifactDir = process.env.COURTOS_UAT_RUN_DIR ? path.resolve(process.env.COURTOS_UAT_RUN_DIR) : null;
const commands = [
  { name: "clean-checkout-inputs", command: "node", args: ["scripts/verifyCourtosTrackedInputs.mjs"] },
  { name: "generated-artifacts", command: "node", args: ["scripts/verifyCourtosGeneratedArtifacts.mjs"] },
  { name: "courtos-public", command: "node", args: ["scripts/prepareCourtosPublic.mjs"] },
  { name: "build", command: "node", args: ["node_modules/vite/bin/vite.js", "build"], env: { COURTOS_ONLY_BUILD: "1" } },
  { name: "typecheck", command: "node", args: ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.courtos.json"] },
  { name: "preflight", command: "node", args: ["scripts/preflightNoDeps.mjs"] },
  { name: "unit-and-contract-qa", command: "node", args: ["scripts/runCourtosTestSuite.mjs"] },
  { name: "uat-package-validation", command: "node", args: ["scripts/validateCourtosUatConfig.mjs"] }
];

const startedAt = new Date().toISOString();
const results = [];

for (const check of commands) {
  const checkStarted = Date.now();
  console.log(`\n[engineering-qa] ${check.name}`);
  const result = spawnSync(check.command, check.args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...check.env }
  });
  results.push({
    name: check.name,
    command: [check.command, ...check.args].join(" "),
    status: result.status === 0 ? "pass" : "fail",
    durationMs: Date.now() - checkStarted
  });
  if (result.status !== 0) break;
}

const passed = results.length === commands.length && results.every((result) => result.status === "pass");
const report = {
  startedAt,
  completedAt: new Date().toISOString(),
  verdict: passed ? "pass" : "fail",
  checks: results
};

if (artifactDir) {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, "engineering-report.json"), JSON.stringify(report, null, 2) + "\n");
}

console.log(`\n[engineering-qa] ${passed ? "PASS" : "FAIL"}`);
process.exit(passed ? 0 : 1);
