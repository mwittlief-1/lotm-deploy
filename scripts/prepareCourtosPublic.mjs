#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { verifiedMapGenBaseUrl } from "./verifyCourtosMapGenConfiguration.mjs";
import mapGenContract from "../config/courtos-mapgen-runtime-contract.v1.json" with { type: "json" };
import bundledMapGenInputs from "../config/courtos-bundled-mapgen-inputs.v1.json" with { type: "json" };

const ROOT = process.cwd();
const TARGET_ROOT = path.resolve(ROOT, ".courtos-public");
// The tracked-input verifier walks the complete transitive CourtOS code, test,
// data, and production-art seam. On a cold desktop checkout, materializing and
// hashing those inputs can legitimately exceed one minute.
const COURTOS_INPUT_GATE_TIMEOUT_MS = 600_000;
const uatWorkspaceBuild = process.env.COURTOS_UAT_WORKSPACE_BUILD === "1";
const verifier = spawnSync(
  process.execPath,
  [
    "scripts/verifyCourtosTrackedInputs.mjs",
    "--json",
    ...(uatWorkspaceBuild ? ["--allow-untracked-workspace-inputs"] : []),
  ],
  { cwd: ROOT, encoding: "utf8", timeout: COURTOS_INPUT_GATE_TIMEOUT_MS },
);

if (verifier.status !== 0) {
  throw new Error(`CourtOS public preparation requires a passing input gate: ${verifier.stderr}`);
}

const report = JSON.parse(verifier.stdout);
const publicInputs = [...report.runtimeAssets];

if (bundledMapGenInputs.schema_version !== "courtos_bundled_mapgen_inputs_v1") {
  throw new Error("Unsupported bundled MapGen input schema.");
}

function filesBelow(relativeDirectory) {
  const absoluteDirectory = path.resolve(ROOT, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) {
    throw new Error(`Bundled MapGen runtime directory is missing: ${relativeDirectory}`);
  }
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.posix.join(relativeDirectory, entry.name);
    return entry.isDirectory() ? filesBelow(child) : [child];
  });
}

publicInputs.push(
  ...bundledMapGenInputs.entries,
  ...bundledMapGenInputs.directories.flatMap(filesBelow),
);

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
const mapGenBaseUrl = configuredMapGenBaseUrl
  ? verifiedMapGenBaseUrl(configuredMapGenBaseUrl, {
      allowLoopbackHttp: process.env.COURTOS_PRODUCTION_BUILD !== "1",
    })
  : null;
const manifestDirectory = path.resolve(TARGET_ROOT, ".well-known");
fs.mkdirSync(manifestDirectory, { recursive: true });
fs.writeFileSync(
  path.join(manifestDirectory, "courtos-runtime-v1.json"),
  `${JSON.stringify(
    {
      schema_version: "courtos_runtime_manifest_v1",
      build_posture: uatWorkspaceBuild
        ? "human_uat_workspace_candidate_not_promotable"
        : "clean_checkout_production_candidate",
      mapgen: mapGenBaseUrl
        ? {
            status: "configured",
            base_url: mapGenBaseUrl.toString(),
            contract: mapGenContract,
          }
        : {
            status: "bundled",
            base_url: "./",
            contract: mapGenContract,
          },
    },
    null,
    2,
  )}\n`,
);

console.log(`Prepared ${publicInputs.length} CourtOS public runtime assets in .courtos-public/.`);
