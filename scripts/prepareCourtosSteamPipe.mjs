#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import {
  channelContract,
  inspectMacApplication,
  loadDistributionConfig,
  platformContract,
  renderSteamAppVdf,
  renderSteamDepotVdf,
  sha256File,
} from "./lib/courtosDesktopDistribution.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const preview = args.includes("--preview");
const platformKey = valueAfter("--platform") ?? "macos-arm64";
const channelName = valueAfter("--channel") ?? "steam_internal";
const appPath = resolve(valueAfter("--app") ?? "/private/tmp/merecross-courtos-desktop/mac-arm64/Merecross.app");
const outputRoot = resolve(valueAfter("--output") ?? "/private/tmp/merecross-steampipe/5084580");

const { config } = await loadDistributionConfig(repositoryRoot);
const platform = platformContract(config, platformKey);
const channel = channelContract(config, channelName);
if (platformKey !== "macos-arm64") {
  throw new Error(`SteamPipe preparation for ${platformKey} is blocked: ${platform.blocking_dependencies.join(", ")}`);
}
if (basename(appPath) !== platform.artifact_name) {
  throw new Error(`Steam content must expose ${platform.artifact_name} at the install root.`);
}

const application = await inspectMacApplication(appPath, {
  requireNotarized: channel.notarization_required && !preview,
});
const uploadEligible = channel.steam_upload_allowed && application.notarized && application.ticket_stapled;
if (!preview && !uploadEligible) {
  throw new Error("Steam upload preparation fails closed until the app is Developer ID signed, notarized, and stapled.");
}

const contentRoot = dirname(appPath);
const buildOutput = join(outputRoot, "build-output");
const depotVdfPath = join(outputRoot, `depot_build_${platform.steam.depot_id}.vdf`);
const appVdfPath = join(outputRoot, `app_build_${config.product.steam_app_id}.vdf`);
await mkdir(buildOutput, { recursive: true });

const depotVdf = renderSteamDepotVdf({
  depotId: platform.steam.depot_id,
  contentRoot,
});
const appVdf = renderSteamAppVdf({
  appId: config.product.steam_app_id,
  description: `Merecross ${platformKey} ${channelName} ${application.version}`,
  buildOutput,
  depotId: platform.steam.depot_id,
  depotVdfPath,
  preview: preview || !uploadEligible,
});
await writeFile(depotVdfPath, depotVdf);
await writeFile(appVdfPath, appVdf);

const manifest = {
  schema_version: "merecross_steampipe_preparation_v1",
  generated_at: new Date().toISOString(),
  status: uploadEligible ? "upload_eligible_not_uploaded" : "preview_only_not_upload_eligible",
  channel: channelName,
  platform: platformKey,
  steam_app_id: config.product.steam_app_id,
  steam_depot_id: platform.steam.depot_id,
  install_folder: config.product.install_folder,
  content_root: contentRoot,
  artifact: application,
  launch_option: {
    executable: platform.executable_relative_path,
    launch_type: platform.steam.launch_type,
    operating_system: platform.steam.operating_system,
  },
  vdf: {
    app_build: appVdfPath,
    app_build_sha256: await sha256File(appVdfPath),
    depot_build: depotVdfPath,
    depot_build_sha256: await sha256File(depotVdfPath),
    set_live_present: false,
  },
  safety: {
    steamcmd_invoked: false,
    uploaded: false,
    branch_promoted: false,
    credentials_recorded: false,
  },
};
const manifestPath = join(outputRoot, "MANIFEST.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: manifestPath, ...manifest }, null, 2));
