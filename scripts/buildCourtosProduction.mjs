#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}.`);
  }
}

run(
  process.execPath,
  ["scripts/verifyCourtosMapGenConfiguration.mjs"],
  { COURTOS_NATIVE_MAPGEN: "1" },
);
run(process.execPath, ["scripts/buildCourtosSpatialReadModelV1.mjs"]);
run(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "scripts/buildCourtosFoundationARelease.mts"],
);
run(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "scripts/verifyCourtosFoundationARelease.mts"],
);
run(process.execPath, ["scripts/verifyCourtosGeneratedArtifacts.mjs"]);
run(
  process.execPath,
  ["scripts/prepareCourtosPublic.mjs"],
  { COURTOS_PRODUCTION_BUILD: "1" },
);
run(process.execPath, ["scripts/verifyCourtosRoomAssets.mjs", "--root", ".courtos-public"]);
run(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build"],
  { COURTOS_ONLY_BUILD: "1", COURTOS_PRODUCTION_BUILD: "1" },
);
run(process.execPath, ["scripts/verifyCourtosBundleBudget.mjs"]);
