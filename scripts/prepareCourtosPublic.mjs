#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { verifiedMapGenBaseUrl } from "./verifyCourtosMapGenConfiguration.mjs";
import mapGenContract from "../config/courtos-mapgen-runtime-contract.v1.json" with { type: "json" };

const ROOT = process.cwd();
const TARGET_ROOT = path.resolve(ROOT, ".courtos-public");
const verifier = spawnSync(
  process.execPath,
  ["scripts/verifyCourtosTrackedInputs.mjs", "--json"],
  { cwd: ROOT, encoding: "utf8", timeout: 60_000 },
);

if (verifier.status !== 0) {
  throw new Error(`CourtOS public preparation requires a passing input gate: ${verifier.stderr}`);
}

const report = JSON.parse(verifier.stdout);
const publicInputs = [...report.runtimeAssets];

for (const artifact of report.generatedArtifacts) {
  const source = path.resolve(ROOT, artifact.path);
  if (!fs.existsSync(source)) {
    throw new Error(`CourtOS generated runtime input is missing: ${artifact.path}`);
  }
}

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

const configuredMapGenBaseUrl = process.env.VITE_MAPGEN_BASE_URL?.trim();
if (process.env.COURTOS_PRODUCTION_BUILD === "1" && !configuredMapGenBaseUrl) {
  throw new Error("A production CourtOS public build requires VITE_MAPGEN_BASE_URL.");
}
const mapGenBaseUrl = configuredMapGenBaseUrl
  ? verifiedMapGenBaseUrl(configuredMapGenBaseUrl)
  : null;
const manifestDirectory = path.resolve(TARGET_ROOT, ".well-known");
fs.mkdirSync(manifestDirectory, { recursive: true });
fs.writeFileSync(
  path.join(manifestDirectory, "courtos-runtime-v1.json"),
  `${JSON.stringify(
    {
      schema_version: "courtos_runtime_manifest_v1",
      mapgen: mapGenBaseUrl
        ? {
            status: "configured",
            base_url: mapGenBaseUrl.toString(),
            contract: mapGenContract,
          }
        : {
            status: "not_configured",
            base_url: null,
            contract: mapGenContract,
          },
    },
    null,
    2,
  )}\n`,
);

console.log(`Prepared ${publicInputs.length} CourtOS public runtime assets in .courtos-public/.`);
