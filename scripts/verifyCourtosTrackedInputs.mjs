#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const RUNTIME_MANIFEST_PATH = "config/courtos-runtime-inputs.v1.json";
const ENTRYPOINTS = [
  "vite.config.ts",
  "src/courtos-home.tsx",
  "api/courtos/1120.ts",
  "api/household/1120.ts",
  "api/council-room/1120.ts",
];
const REQUIRED_REPOSITORY_INPUTS = [
  ".gitattributes",
  ".github/workflows/ci.yml",
  ".github/workflows/courtos-release.yml",
  ".gitignore",
  ".node-version",
  "AGENTS.md",
  "courtos-home.html",
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "tsconfig.courtos.json",
  "vercel.json",
  RUNTIME_MANIFEST_PATH,
  "scripts/buildCourtosSpatialReadModelV1.mjs",
  "scripts/prepareCourtosPublic.mjs",
  "scripts/runCourtosEngineeringQa.mjs",
  "scripts/runCourtosInternalUat.mjs",
  "scripts/runCourtosTestSuite.mjs",
  "scripts/runCourtosUatBrowser.mjs",
  "scripts/runCourtosUatBrowserBroker.mjs",
  "scripts/smokeCourtosDeployment.mjs",
  "scripts/verifyCourtosVercelDeployment.mjs",
  "scripts/validateCourtosUatConfig.mjs",
  "scripts/verifyCourtosTrackedInputs.mjs",
  "scripts/verifyCourtosGeneratedArtifacts.mjs",
];
const IMPORT_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".css",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function absolute(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function repositoryFilesUnder(relativeDirectory) {
  const files = [];
  const visit = (relativePath) => {
    const target = absolute(relativePath);
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target).sort()) {
        visit(path.join(relativePath, entry));
      }
      return;
    }
    if (stat.isFile() && !relativePath.endsWith(".DS_Store")) {
      files.push(normalize(relativePath));
    }
  };
  visit(relativeDirectory);
  return files;
}

function resolveRelativeImport(importer, specifier) {
  const base = path.normalize(path.join(path.dirname(importer), specifier));
  return IMPORT_EXTENSIONS.map((extension) => `${base}${extension}`).find(
    (candidate) =>
      fs.existsSync(absolute(candidate)) && fs.statSync(absolute(candidate)).isFile(),
  );
}

function runtimeImportClosure(entrypoints) {
  const files = new Set();
  const missingImports = [];
  const queue = [...entrypoints];
  const importPattern =
    /(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g;

  while (queue.length > 0) {
    const relativePath = normalize(queue.shift());
    if (files.has(relativePath)) continue;
    files.add(relativePath);
    if (!fs.existsSync(absolute(relativePath))) continue;
    if (!/\.(?:[cm]?[jt]sx?)$/.test(relativePath)) continue;
    const source = fs.readFileSync(absolute(relativePath), "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      const resolved = resolveRelativeImport(relativePath, specifier);
      if (resolved) queue.push(resolved);
      else missingImports.push(`${relativePath} -> ${specifier}`);
    }
  }

  return { files: [...files].sort(), missingImports };
}

function runtimeAssetPaths(sourceFiles) {
  const assets = new Set();
  const assetPattern = /["'(](\/assets\/[^"')\s?]+)/g;
  for (const relativePath of sourceFiles) {
    const target = absolute(relativePath);
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) continue;
    const source = fs.readFileSync(target, "utf8");
    for (const match of source.matchAll(assetPattern)) {
      assets.add(normalize(path.join("public", match[1])));
    }
  }
  return [...assets].sort();
}

function readRuntimeManifest() {
  const manifest = JSON.parse(fs.readFileSync(absolute(RUNTIME_MANIFEST_PATH), "utf8"));
  if (manifest.schema_version !== "courtos_runtime_inputs_v1") {
    throw new Error("Unsupported CourtOS runtime input manifest schema.");
  }
  return manifest;
}

function gitTrackedFiles(paths) {
  const result = spawnSync("git", ["ls-files", "-z", "--", ...paths], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Unable to inspect tracked CourtOS inputs.");
  }
  return new Set(result.stdout.split("\0").filter(Boolean));
}

function gitAttribute(relativePath, attribute) {
  const result = spawnSync("git", ["check-attr", attribute, "--", relativePath], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 5_000,
  });
  if (result.status !== 0) return null;
  return result.stdout.trim().split(": ").at(-1) ?? null;
}

function isGitIgnored(relativePath) {
  return spawnSync("git", ["check-ignore", "-q", "--", relativePath], {
    cwd: ROOT,
    timeout: 5_000,
  }).status === 0;
}

async function sha256File(relativePath) {
  const hash = crypto.createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(absolute(relativePath));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function isUnmaterializedLfsPointer(relativePath) {
  if (fs.statSync(absolute(relativePath)).size > 512) return false;
  const handle = fs.openSync(absolute(relativePath), "r");
  const buffer = Buffer.alloc(160);
  const bytes = fs.readSync(handle, buffer, 0, buffer.length, 0);
  fs.closeSync(handle);
  return buffer.subarray(0, bytes).toString("utf8").startsWith(
    "version https://git-lfs.github.com/spec/v1",
  );
}

const manifest = readRuntimeManifest();
const closure = runtimeImportClosure(ENTRYPOINTS);
const preflightClosure = runtimeImportClosure([
  "dist_batch/src/sim/index.js",
  "dist_batch/src/sim/policies.js",
  "dist_batch/src/version.js",
]);
const importedRuntimeAssets = runtimeAssetPaths(closure.files);
const qaPackageFiles = repositoryFilesUnder("qa/uat");
const testManifest = JSON.parse(
  fs.readFileSync(absolute("qa/uat/courtos-test-files.json"), "utf8"),
);
if (testManifest.schema_version !== "courtos_test_file_manifest_v1") {
  throw new Error("Unsupported CourtOS test-file manifest schema.");
}
const testClosure = runtimeImportClosure(testManifest.files);
const testSupportFiles = testManifest.support_files ?? [];
const preflightInputs = [
  "scripts/preflightNoDeps.mjs",
  "docs/BUILD_INFO.json",
  "docs/schemas/prospects_window_v1.schema.json",
  "docs/qa/v0.2.3_non_perturbation_baseline_v0.2.2.json",
  "docs/qa/v0.2.4_non_perturbation_baseline_v0.2.4.json",
  "docs/qa/v0.2.5_non_perturbation_baseline_v0.2.5.json",
  "docs/qa/v0.2.6_non_perturbation_baseline_v0.2.6.json",
  "docs/qa/v0.2.6.2_non_perturbation_baseline_v0.2.6.2.json",
  "docs/qa/v0.2.7.1_non_perturbation_baseline_v0.2.7.1.json",
  "docs/qa/v0.2.9_non_perturbation_baseline_v0.2.9.json",
  ...preflightClosure.files,
];
const pinnedInputs = manifest.pinned_inputs.map((input) => input.path);
const requiredTrackedInputs = [
  ...new Set([
    ...REQUIRED_REPOSITORY_INPUTS,
    ...closure.files,
    ...importedRuntimeAssets,
    ...qaPackageFiles,
    ...testClosure.files,
    ...testSupportFiles,
    ...preflightInputs,
    ...pinnedInputs,
  ]),
].sort();

const errors = [];
for (const missingImport of closure.missingImports) {
  errors.push(`Unresolved runtime import: ${missingImport}`);
}
for (const missingImport of preflightClosure.missingImports) {
  errors.push(`Unresolved preflight import: ${missingImport}`);
}
for (const missingImport of testClosure.missingImports) {
  errors.push(`Unresolved CourtOS test import: ${missingImport}`);
}

const missingFiles = requiredTrackedInputs.filter(
  (relativePath) => !fs.existsSync(absolute(relativePath)),
);
for (const relativePath of missingFiles) {
  errors.push(`Missing runtime input: ${relativePath}`);
}

const materializedInputs = requiredTrackedInputs.filter(
  (relativePath) => fs.existsSync(absolute(relativePath)),
);
const tracked = gitTrackedFiles(materializedInputs);
for (const relativePath of materializedInputs) {
  if (!tracked.has(relativePath)) errors.push(`Untracked runtime input: ${relativePath}`);
  if (fs.statSync(absolute(relativePath)).size === 0) {
    errors.push(`Empty runtime input: ${relativePath}`);
  } else if (isUnmaterializedLfsPointer(relativePath)) {
    errors.push(`Unmaterialized Git LFS runtime input: ${relativePath}`);
  }
}

for (const input of manifest.pinned_inputs) {
  if (!fs.existsSync(absolute(input.path))) continue;
  const actualSha256 = await sha256File(input.path);
  if (actualSha256 !== input.sha256) {
    errors.push(
      `Pinned input SHA mismatch: ${input.path} expected ${input.sha256}, got ${actualSha256}`,
    );
  }
  if (input.storage === "git_lfs" && gitAttribute(input.path, "filter") !== "lfs") {
    errors.push(`Pinned input is not configured for Git LFS: ${input.path}`);
  }
}

for (const relativePath of importedRuntimeAssets) {
  if (gitAttribute(relativePath, "filter") !== "lfs") {
    errors.push(`Production art is not configured for Git LFS: ${relativePath}`);
  }
}

for (const artifact of manifest.generated_artifacts) {
  if (!isGitIgnored(artifact.path)) {
    errors.push(`Generated artifact is not ignored: ${artifact.path}`);
  }
  if (gitTrackedFiles([artifact.path]).has(artifact.path)) {
    errors.push(`Generated artifact must not be tracked: ${artifact.path}`);
  }
  if (!tracked.has(artifact.builder) && !requiredTrackedInputs.includes(artifact.builder)) {
    errors.push(`Generated artifact builder is not part of the runtime gate: ${artifact.builder}`);
  }
}

if (errors.length > 0) {
  console.error(`CourtOS clean-checkout gate failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const report = {
  schema_version: "courtos_tracked_input_report_v1",
  requiredTrackedInputs,
  transitiveImportCount: closure.files.length,
  runtimeArtAssetCount: importedRuntimeAssets.length,
  runtimeAssets: importedRuntimeAssets,
  pinnedInputCount: manifest.pinned_inputs.length,
  generatedArtifacts: manifest.generated_artifacts,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report));
} else {
  console.log(
    `CourtOS clean-checkout gate passed: ${requiredTrackedInputs.length} tracked runtime inputs, ` +
      `${closure.files.length} transitive code imports, ${importedRuntimeAssets.length} runtime art assets, ` +
      `${manifest.pinned_inputs.length} checksum-pinned data inputs, and ` +
      `${manifest.generated_artifacts.length} reproducible generated artifact(s).`,
  );
}
