#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const appArgument = process.argv.indexOf("--app");
const postureArgument = argv.indexOf("--expected-posture");
const expectedPosture = postureArgument >= 0
  ? argv[postureArgument + 1]
  : "human_uat_workspace_candidate_not_promotable";
if (!new Set([
  "human_uat_workspace_candidate_not_promotable",
  "clean_checkout_production_candidate",
]).has(expectedPosture)) {
  throw new Error(`Unsupported packaged CourtOS posture: ${expectedPosture}`);
}
const appPath = path.resolve(
  appArgument >= 0 && process.argv[appArgument + 1]
    ? process.argv[appArgument + 1]
    : "/private/tmp/merecross-courtos-desktop/mac-arm64/Merecross.app",
);
const resources = path.join(appPath, "Contents/Resources");
const asarPath = path.join(resources, "app.asar");

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

if (!fs.existsSync(asarPath)) throw new Error(`Packaged CourtOS app is missing app.asar: ${asarPath}`);

const stagedAsarBinary = "/private/tmp/merecross-courtos-desktop-staging/node_modules/.bin/asar";
const asarBinary = fs.existsSync(stagedAsarBinary)
  ? stagedAsarBinary
  : path.join(root, "desktop/node_modules/.bin/asar");
const listResult = spawnSync(asarBinary, ["list", asarPath], { encoding: "utf8" });
if (listResult.status !== 0) throw new Error(listResult.stderr || "Unable to inspect app.asar.");
const archivePaths = listResult.stdout.split(/\r?\n/).filter(Boolean);
console.log(`Inspecting ${archivePaths.length} packaged asar paths.`);
const roomPaths = archivePaths.filter((entry) =>
  /^\/dist\/renderer\/assets\/courtos\/rooms\/.+\.jpg$/.test(entry),
);
if (roomPaths.length !== 32) {
  throw new Error(`Packaged CourtOS room closure expected 32 assets; found ${roomPaths.length}.`);
}

const extractionRoot = fs.mkdtempSync(path.join(os.tmpdir(), "courtos-uat-package-"));
const extractResult = spawnSync(
  asarBinary,
  ["extract-file", asarPath, "dist/renderer/.well-known/courtos-runtime-v1.json"],
  { cwd: extractionRoot, encoding: "utf8" },
);
if (extractResult.status !== 0) {
  throw new Error(extractResult.stderr || "Unable to extract the CourtOS runtime manifest.");
}
const runtimeManifest = JSON.parse(
  fs.readFileSync(path.join(extractionRoot, "courtos-runtime-v1.json"), "utf8"),
);
fs.rmSync(extractionRoot, { recursive: true, force: true });
console.log("Verified packaged CourtOS runtime posture and bundled MapGen declaration.");
if (runtimeManifest.build_posture !== expectedPosture) {
  throw new Error(
    `Packaged CourtOS posture is invalid: expected ${expectedPosture}, received ${runtimeManifest.build_posture ?? "missing"}.`,
  );
}
if (runtimeManifest.mapgen?.status !== "bundled" || runtimeManifest.mapgen?.base_url !== "./") {
  throw new Error("Packaged CourtOS UAT must use its bundled MapGen runtime.");
}

for (const required of [
  ".courtos-generated/foundation-a/MANIFEST.json",
  ".courtos-generated/foundation-a/CURRENT",
  "data/map/mapgen_exports/courtos_mapgen_export_manifest_v1.json",
]) {
  if (!fs.existsSync(path.join(resources, required))) {
    throw new Error(`Packaged CourtOS runtime input is missing: ${required}`);
  }
}
console.log("Verified required packaged CourtOS release roots.");

const foundationManifest = JSON.parse(
  fs.readFileSync(
    path.join(resources, ".courtos-generated/foundation-a/MANIFEST.json"),
    "utf8",
  ),
);
if (
  foundationManifest.schema_version !== "merecross_foundation_a_release_v1" ||
  foundationManifest.boundary?.raw_source_runtime_traversal_required !== false ||
  foundationManifest.boundary?.immutable_current_state !== true ||
  !foundationManifest.artifact?.path ||
  !/^[a-f0-9]{64}$/.test(foundationManifest.artifact.sha256 ?? "")
) {
  throw new Error("Packaged Foundation A manifest failed its runtime boundary.");
}
const foundationPath = path.join(resources, foundationManifest.artifact.path);
const foundationBytes = fs.readFileSync(foundationPath);
if (foundationBytes.subarray(0, 16).toString("binary") !== "SQLite format 3\u0000") {
  throw new Error("Packaged Foundation A artifact is not SQLite.");
}
if (
  createHash("sha256").update(foundationBytes).digest("hex") !==
  foundationManifest.artifact.sha256
) {
  throw new Error("Packaged Foundation A SQLite checksum mismatch.");
}
for (const forbidden of ["data/uat", "data/genrun", "data/ready", "data/map/xmap_alpha_v1"]) {
  if (fs.existsSync(path.join(resources, forbidden))) {
    throw new Error(`Packaged CourtOS retained a raw runtime source root: ${forbidden}`);
  }
}
console.log("Verified unified immutable SQLite and absence of legacy runtime fan-out.");

const expectedScribeManifest = JSON.parse(
  fs.readFileSync(path.join(root, "config/courtos-scribe-native-assets.v1.json"), "utf8"),
);
const packagedScribeManifestPath = path.join(resources, "courtos-scribe/model-manifest.json");
if (!fs.existsSync(packagedScribeManifestPath)) {
  throw new Error("Packaged CourtOS native Scribe manifest is missing.");
}
const packagedScribeManifest = JSON.parse(
  fs.readFileSync(packagedScribeManifestPath, "utf8"),
);
if (JSON.stringify(packagedScribeManifest) !== JSON.stringify(expectedScribeManifest)) {
  throw new Error("Packaged CourtOS native Scribe manifest does not match the tracked build contract.");
}
const scribeRoot = path.join(resources, "courtos-scribe");
const scribeModelPath = path.join(
  scribeRoot,
  "local-models",
  packagedScribeManifest.modelFile,
);
const scribeRuntimeRoot = path.join(
  scribeRoot,
  "local-runtime",
  packagedScribeManifest.runtime.directory,
);
const scribeCliPath = path.join(scribeRuntimeRoot, packagedScribeManifest.runtime.binaryPath);
const scribeServerPath = path.join(scribeRuntimeRoot, packagedScribeManifest.runtime.serverPath);
const modelStats = fs.statSync(scribeModelPath);
if (modelStats.size !== packagedScribeManifest.expectedDiskBytes) {
  throw new Error(
    `Packaged CourtOS Scribe model size mismatch: expected ${packagedScribeManifest.expectedDiskBytes}, got ${modelStats.size}.`,
  );
}
for (const [label, filePath, expectedSha256] of [
  ["model", scribeModelPath, packagedScribeManifest.expectedSha256],
  ["CLI", scribeCliPath, packagedScribeManifest.runtime.binarySha256],
  ["server", scribeServerPath, packagedScribeManifest.runtime.serverSha256],
]) {
  const stats = fs.statSync(filePath);
  if (label !== "model" && (stats.mode & 0o111) === 0) {
    throw new Error(`Packaged CourtOS Scribe ${label} is not executable.`);
  }
  const actualSha256 = await sha256File(filePath);
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `Packaged CourtOS Scribe ${label} SHA-256 mismatch: expected ${expectedSha256}, got ${actualSha256}.`,
    );
  }
}
console.log("Verified offline native Scribe model, CLI, server, byte size, executable modes, and SHA-256 identities.");

const exportManifest = JSON.parse(
  fs.readFileSync(
    path.join(resources, "data/map/mapgen_exports/courtos_mapgen_export_manifest_v1.json"),
    "utf8",
  ),
);
for (const entry of exportManifest.exports ?? []) {
  if (!entry.path || !fs.existsSync(path.join(resources, entry.path))) {
    throw new Error(`Packaged CourtOS MapGen export is missing: ${entry.path ?? "undeclared"}`);
  }
}

console.log(
  `Verified CourtOS desktop package: 32 rooms, one immutable Foundation A database, bundled MapGen, ${exportManifest.exports?.length ?? 0} manifest-selected exports, pinned offline Scribe, ${expectedPosture}.`,
);
