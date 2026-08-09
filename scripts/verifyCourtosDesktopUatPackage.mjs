#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const appArgument = process.argv.indexOf("--app");
const appPath = path.resolve(
  appArgument >= 0 && process.argv[appArgument + 1]
    ? process.argv[appArgument + 1]
    : "/private/tmp/merecross-courtos-desktop/mac-arm64/Merecross.app",
);
const resources = path.join(appPath, "Contents/Resources");
const asarPath = path.join(resources, "app.asar");

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
if (runtimeManifest.build_posture !== "human_uat_workspace_candidate_not_promotable") {
  throw new Error(`Packaged CourtOS UAT posture is invalid: ${runtimeManifest.build_posture ?? "missing"}.`);
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
  `Verified CourtOS desktop UAT package: 32 rooms, one immutable Foundation A database, bundled MapGen, ${exportManifest.exports?.length ?? 0} manifest-selected exports, non-promotable workspace posture.`,
);
