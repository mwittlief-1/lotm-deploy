#!/usr/bin/env node
import { resolve } from "node:path";

import { loadDistributionConfig, platformContract } from "./lib/courtosDesktopDistribution.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const { config } = await loadDistributionConfig(repositoryRoot);
const platform = platformContract(config, "windows-x64");
const report = {
  schema_version: "merecross_windows_packaging_readiness_v1",
  status: platform.blocking_dependencies.length === 0 ? "ready" : "blocked",
  platform: "windows-x64",
  shared_product_identity: {
    product_name: config.product.name,
    bundle_id: config.product.bundle_id,
    steam_app_id: config.product.steam_app_id,
    install_folder: config.product.install_folder,
  },
  artifact: {
    executable: platform.artifact_name,
    architecture: platform.architecture,
    steam_depot_id: platform.steam.depot_id,
    steam_launch_operating_system: platform.steam.operating_system,
  },
  blocking_dependencies: platform.blocking_dependencies,
  doctrine: "Build from the shared source on a Windows x64 runner; never transform the macOS binary.",
};
console.log(JSON.stringify(report, null, 2));
if (report.status !== "ready") process.exitCode = 2;
