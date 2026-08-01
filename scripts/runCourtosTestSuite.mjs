#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.resolve(ROOT, "qa/uat/courtos-test-files.json"), "utf8"),
);

if (manifest.schema_version !== "courtos_test_file_manifest_v1") {
  throw new Error("Unsupported CourtOS test-file manifest schema.");
}

for (const relativePath of manifest.files) {
  if (!fs.existsSync(path.resolve(ROOT, relativePath))) {
    throw new Error(`CourtOS test file is missing: ${relativePath}`);
  }
}

const result = spawnSync(
  "node",
  ["node_modules/vitest/vitest.mjs", "run", ...manifest.files],
  { cwd: ROOT, stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
