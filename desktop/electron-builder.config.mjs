import { resolve } from "node:path";
import { existsSync } from "node:fs";

const desktopRoot = import.meta.dirname;
const payloadRoot = existsSync(resolve(desktopRoot, "payload"))
  ? resolve(desktopRoot, "payload")
  : resolve(desktopRoot, "..");
const macTargets = process.env.COURTOS_DESKTOP_TARGETS
  ? process.env.COURTOS_DESKTOP_TARGETS.split(",").map((target) => target.trim()).filter(Boolean)
  : ["dmg", "zip"];
const distributionMode = process.env.COURTOS_DESKTOP_DISTRIBUTION_MODE ?? "local_uat";
const distributionModes = new Set(["local_uat", "steam_internal", "external_alpha", "release"]);
if (!distributionModes.has(distributionMode)) {
  throw new Error(`Unknown CourtOS desktop distribution mode: ${distributionMode}`);
}
const externalDistribution = distributionMode !== "local_uat";
const externalMacIcon = resolve(desktopRoot, "build/icon.icns");
if (externalDistribution && !existsSync(externalMacIcon)) {
  throw new Error(`External CourtOS packaging requires the branded macOS icon: ${externalMacIcon}`);
}

export default {
  appId: "com.vytis.merecross",
  productName: "Merecross",
  protocols: [
    {
      name: "Merecross application protocol",
      schemes: ["merecross"],
    },
  ],
  afterPack: "./afterPack.mjs",
  electronLanguages: ["en-US"],
  directories: {
    // Local Documents/Cloud volumes may attach Finder metadata to an .app,
    // invalidating its ad-hoc signature. The default UAT output stays on the
    // local temporary volume; CI/release packaging can provide its own path.
    output: process.env.COURTOS_DESKTOP_OUTPUT
      ? resolve(process.env.COURTOS_DESKTOP_OUTPUT)
      : "/private/tmp/merecross-courtos-desktop",
  },
  files: ["dist/**"],
  extraResources: [
    {
      from: resolve(payloadRoot, "data/map/mapgen_exports"),
      to: "data/map/mapgen_exports",
    },
    {
      from: resolve(payloadRoot, ".courtos-generated/foundation-a"),
      to: ".courtos-generated/foundation-a",
    },
    // Offline macOS-arm64 UAT Scribe assets. The host verifies the model hash.
    {
      from: resolve(payloadRoot, "poc/local-slm-financial-narrative-v1/local-runtime/llama-b10099"),
      to: "courtos-scribe/local-runtime/llama-b10099",
    },
    {
      from: resolve(payloadRoot, "poc/local-slm-financial-narrative-v1/local-models/Qwen3-4B-Instruct-Q4_K_M.gguf"),
      to: "courtos-scribe/local-models/Qwen3-4B-Instruct-Q4_K_M.gguf",
    },
    {
      from: resolve(payloadRoot, "poc/local-slm-financial-narrative-v1/model-manifest.json"),
      to: "courtos-scribe/model-manifest.json",
    },
  ],
  asarUnpack: ["**/*.node", "**/*.sqlite", "**/*.dylib"],
  mac: {
    category: "public.app-category.games",
    target: macTargets,
    icon: externalDistribution ? externalMacIcon : undefined,
    identity: externalDistribution ? undefined : null,
    hardenedRuntime: externalDistribution,
    gatekeeperAssess: false,
    entitlements: externalDistribution ? resolve(desktopRoot, "entitlements.mac.plist") : undefined,
    entitlementsInherit: externalDistribution ? resolve(desktopRoot, "entitlements.mac.plist") : undefined,
    notarize: externalDistribution,
  },
  win: {
    target: process.env.COURTOS_DESKTOP_WINDOWS_TARGETS
      ? process.env.COURTOS_DESKTOP_WINDOWS_TARGETS.split(",").map((target) => target.trim()).filter(Boolean)
      : ["nsis"],
  },
  linux: { target: ["AppImage"] },
};
