#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  channelContract,
  inspectMacApplication,
  loadDistributionConfig,
  platformContract,
} from "./lib/courtosDesktopDistribution.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const platformKey = valueAfter("--platform") ?? "macos-arm64";
const channelName = valueAfter("--channel") ?? "local_uat";
const outputPath = valueAfter("--output");
const appPath = resolve(valueAfter("--app") ?? "/private/tmp/merecross-courtos-desktop/mac-arm64/Merecross.app");

const { config, absolutePath: configPath } = await loadDistributionConfig(repositoryRoot);
const platform = platformContract(config, platformKey);
const channel = channelContract(config, channelName);

if (platformKey !== "macos-arm64") {
  const result = {
    schema_version: "merecross_desktop_distribution_verification_v1",
    status: "blocked",
    platform: platformKey,
    channel: channelName,
    blocking_dependencies: platform.blocking_dependencies,
    steam_depot_id: platform.steam.depot_id,
    config_path: configPath,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = 2;
} else {
  const application = await inspectMacApplication(appPath, {
    requireNotarized: channel.notarization_required,
  });
  const result = {
    schema_version: "merecross_desktop_distribution_verification_v1",
    status: "verified",
    platform: platformKey,
    channel: channelName,
    config_path: configPath,
    steam_app_id: config.product.steam_app_id,
    steam_depot_id: platform.steam.depot_id,
    steam_launch_executable: platform.executable_relative_path,
    application,
    upload_eligible: channel.steam_upload_allowed && application.notarized && application.ticket_stapled,
  };
  if (outputPath) {
    const absoluteOutput = resolve(outputPath);
    await mkdir(dirname(absoluteOutput), { recursive: true });
    await writeFile(absoluteOutput, `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify(result, null, 2));
}
