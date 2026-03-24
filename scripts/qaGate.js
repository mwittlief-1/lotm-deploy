import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function runOrExit(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
}

const QA_ARTIFACTS = path.resolve("qa_artifacts");
ensureDir(QA_ARTIFACTS);

const vitestBin = path.resolve("node_modules/.bin/vitest");

if (fs.existsSync(vitestBin)) {
  const outFile = path.join(QA_ARTIFACTS, "vitest.json");
  const res = spawnSync(vitestBin, ["run", "--reporter=json", `--outputFile=${outFile}`], { stdio: "inherit" });

  // Fail if 0 tests discovered (best-effort parse)
  if (res.status === 0) {
    try {
      const payload = JSON.parse(fs.readFileSync(outFile, "utf8"));
      const numTests = payload?.numTotalTests ?? 0;
      if (!numTests) {
        console.error("QA FAIL: Vitest discovered 0 tests.");
        process.exit(1);
      }
    } catch {}
  }

  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
  runOrExit(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), path.resolve("scripts/uatGate.ts")]);
  process.exit(0);
}

console.warn("Vitest not found (node_modules missing). Running no-deps QA gate...");
const node = process.execPath;
const gate = path.resolve("scripts/qaNoDeps.mjs");
runOrExit(node, [gate]);
runOrExit(node, [path.resolve("node_modules/tsx/dist/cli.mjs"), path.resolve("scripts/uatGate.ts")]);
process.exit(0);
