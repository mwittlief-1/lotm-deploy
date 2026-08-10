#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  directoryBytes,
  loadDistributionConfig,
} from "./lib/courtosDesktopDistribution.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const appPath = resolve(valueAfter("--app") ?? "/private/tmp/merecross-courtos-desktop/mac-arm64/Merecross.app");
if (!existsSync(appPath)) throw new Error(`Desktop size audit cannot find ${appPath}`);

const { config } = await loadDistributionConfig(repositoryRoot);
const resources = join(appPath, "Contents", "Resources");
const familyPaths = {
  scribe_model: join(resources, "courtos-scribe", "local-models"),
  scribe_runtime: join(resources, "courtos-scribe", "local-runtime"),
  foundation_a: join(resources, ".courtos-generated", "foundation-a"),
  map_data: join(resources, "data", "map"),
  application_asar: join(resources, "app.asar"),
  asar_unpacked: join(resources, "app.asar.unpacked"),
};
const families = {};
for (const [name, familyPath] of Object.entries(familyPaths)) {
  if (!existsSync(familyPath)) {
    families[name] = { path: familyPath, bytes: 0, missing: true };
    continue;
  }
  const stats = await stat(familyPath);
  families[name] = {
    path: familyPath,
    bytes: stats.isDirectory() ? await directoryBytes(familyPath) : stats.size,
    missing: false,
  };
}
const totalBytes = await directoryBytes(appPath);
const budget = config.size_budgets_bytes.macos_app_bundle;
const findings = [];
if (totalBytes > budget) findings.push(`macOS app exceeds byte budget by ${totalBytes - budget}`);
if (families.application_asar.bytes > config.size_budgets_bytes.application_asar) {
  findings.push("application asar exceeds its byte budget");
}
if (families.foundation_a.bytes > config.size_budgets_bytes.foundation_a_sqlite) {
  findings.push("Foundation A payload exceeds its byte budget");
}
if (families.scribe_model.bytes > config.size_budgets_bytes.scribe_model) {
  findings.push("Scribe model exceeds its byte budget");
}

const resourceChildren = [];
for (const entry of await readdir(resources, { withFileTypes: true })) {
  const entryPath = join(resources, entry.name);
  resourceChildren.push({
    name: entry.name,
    bytes: entry.isDirectory() ? await directoryBytes(entryPath) : (await stat(entryPath)).size,
  });
}
resourceChildren.sort((a, b) => b.bytes - a.bytes);
const report = {
  schema_version: "merecross_desktop_size_audit_v1",
  status: findings.length === 0 ? "within_budget" : "budget_exceeded",
  app_path: appPath,
  total_bytes: totalBytes,
  budget_bytes: budget,
  families,
  largest_resource_children: resourceChildren.slice(0, 12),
  findings,
  interpretation: "The pinned local SLM and immutable Foundation A database are production payloads, not duplicate build outputs.",
};
console.log(JSON.stringify(report, null, 2));
if (findings.length > 0) process.exitCode = 2;
