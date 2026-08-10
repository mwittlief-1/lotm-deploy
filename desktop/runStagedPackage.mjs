#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const stageRoot = process.env.COURTOS_DESKTOP_STAGING_ROOT
  ? resolve(process.env.COURTOS_DESKTOP_STAGING_ROOT)
  : "/private/tmp/merecross-courtos-desktop-staging";
const mode = process.argv[2] ?? "package";
if (!new Set(["package", "dir"]).has(mode)) {
  throw new Error(`Unknown staged desktop package mode: ${mode}`);
}

for (const args of [
  ["install", "--no-audit", "--no-fund"],
  ["run", mode === "dir" ? "package:dir:staged" : "package:staged"],
]) {
  const result = spawnSync("npm", args, {
    cwd: stageRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
