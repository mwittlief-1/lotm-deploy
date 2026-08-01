import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const artifactDir = process.env.COURTOS_UAT_RUN_DIR ? path.resolve(process.env.COURTOS_UAT_RUN_DIR) : null;
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const expectedNodeMajor = Number(String(packageJson.engines?.node ?? "").match(/^(\d+)\.x$/)?.[1]);
if (!Number.isInteger(expectedNodeMajor)) {
  throw new Error("package.json engines.node must pin one major version as <major>.x.");
}
const nodeBinary = process.execPath;
const commands = [
  {
    name: "runtime-toolchain",
    command: nodeBinary,
    args: [
      "-e",
      `if (Number(process.versions.node.split(".")[0]) !== ${expectedNodeMajor}) { console.error("CourtOS engineering QA requires Node ${expectedNodeMajor}.x; received " + process.version); process.exit(1); }`,
    ],
  },
  { name: "clean-checkout-inputs", command: nodeBinary, args: ["scripts/verifyCourtosTrackedInputs.mjs"] },
  { name: "generated-artifacts", command: nodeBinary, args: ["scripts/verifyCourtosGeneratedArtifacts.mjs"] },
  { name: "courtos-public", command: nodeBinary, args: ["scripts/prepareCourtosPublic.mjs"] },
  { name: "build", command: nodeBinary, args: ["node_modules/vite/bin/vite.js", "build"], env: { COURTOS_ONLY_BUILD: "1" } },
  { name: "typecheck", command: nodeBinary, args: ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.courtos.json"] },
  { name: "preflight", command: nodeBinary, args: ["scripts/preflightNoDeps.mjs"] },
  { name: "unit-and-contract-qa", command: nodeBinary, args: ["scripts/runCourtosTestSuite.mjs"] },
  { name: "uat-package-validation", command: nodeBinary, args: ["scripts/validateCourtosUatConfig.mjs"] }
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
