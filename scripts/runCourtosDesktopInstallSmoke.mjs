#!/usr/bin/env node
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { inspectMacApplication } from "./lib/courtosDesktopDistribution.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const dryRun = args.includes("--dry-run");
const launch = args.includes("--launch");
const keep = args.includes("--keep");
const expectedPosture = valueAfter("--expected-posture") ?? "human_uat_workspace_candidate_not_promotable";
const sourceApp = resolve(valueAfter("--app") ?? "/private/tmp/merecross-courtos-desktop/mac-arm64/Merecross.app");
const requestedSteamLibrary = valueAfter("--steam-library");
const cleanupRoot = !requestedSteamLibrary && !dryRun
  ? await mkdtemp(join(tmpdir(), "merecross-steam-smoke-"))
  : null;
const steamLibrary = requestedSteamLibrary
  ? resolve(requestedSteamLibrary)
  : dryRun
    ? "/private/tmp/Merecross Steam Library/steamapps/common/Merecross"
    : join(cleanupRoot, "Merecross Steam Library", "steamapps", "common", "Merecross");
const installedApp = join(steamLibrary, "Merecross.app");

if (dryRun) {
  console.log(JSON.stringify({
    schema_version: "merecross_desktop_install_smoke_plan_v1",
    source_app: sourceApp,
    expected_posture: expectedPosture,
    simulated_steam_install_folder: steamLibrary,
    installed_app: installedApp,
    operations: [
      "verify source app identity and signature",
      "copy app into a clean Steam-shaped path containing spaces",
      "verify packaged CourtOS data, map, room, and Scribe contracts",
      ...(launch ? ["run the complete first-release desktop UAT against the copied app"] : []),
      ...(keep ? ["preserve the simulated Steam library"] : ["remove the simulated Steam library"]),
    ],
  }, null, 2));
  process.exit(0);
}

try {
  await inspectMacApplication(sourceApp);
  await mkdir(steamLibrary, { recursive: true });
  await execFileAsync("ditto", ["--noextattr", sourceApp, installedApp]);
  await inspectMacApplication(installedApp);
  await execFileAsync(process.execPath, [
    join(repositoryRoot, "scripts", "verifyCourtosDesktopUatPackage.mjs"),
    "--app",
    installedApp,
    "--expected-posture",
    expectedPosture,
  ], { cwd: repositoryRoot, stdio: "inherit" });
  if (launch) {
    await execFileAsync(process.execPath, [
      join(repositoryRoot, "scripts", "runCourtosDesktopFirstReleaseUat.mjs"),
      "--app",
      installedApp,
    ], { cwd: repositoryRoot, stdio: "inherit" });
  }
  console.log(JSON.stringify({ status: "passed", installed_app: installedApp, launch_uat: launch }, null, 2));
} finally {
  if (!keep && cleanupRoot) await rm(cleanupRoot, { recursive: true, force: true });
}
