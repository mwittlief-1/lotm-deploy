#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const TARGET_ROOT = path.resolve(ROOT, ".courtos-public");
const verifier = spawnSync(
  "node",
  ["scripts/verifyCourtosTrackedInputs.mjs", "--json"],
  { cwd: ROOT, encoding: "utf8", timeout: 60_000 },
);

if (verifier.status !== 0) {
  throw new Error(`CourtOS public preparation requires a passing input gate: ${verifier.stderr}`);
}

const report = JSON.parse(verifier.stdout);
const publicInputs = [
  ...report.runtimeAssets,
  ...report.generatedArtifacts.map((artifact) => artifact.path),
];

fs.rmSync(TARGET_ROOT, { recursive: true, force: true });
for (const relativePath of [...new Set(publicInputs)].sort()) {
  if (!relativePath.startsWith("public/")) {
    throw new Error(`CourtOS public input is outside public/: ${relativePath}`);
  }
  const source = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`CourtOS public input is missing: ${relativePath}`);
  }
  const destination = path.resolve(TARGET_ROOT, relativePath.slice("public/".length));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  try {
    fs.linkSync(source, destination);
  } catch {
    fs.copyFileSync(source, destination);
  }
}

console.log(`Prepared ${publicInputs.length} CourtOS public runtime assets in .courtos-public/.`);
