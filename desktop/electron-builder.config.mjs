import { resolve } from "node:path";
import { existsSync } from "node:fs";

const desktopRoot = import.meta.dirname;
const payloadRoot = existsSync(resolve(desktopRoot, "payload"))
  ? resolve(desktopRoot, "payload")
  : resolve(desktopRoot, "..");
const macTargets = process.env.COURTOS_DESKTOP_TARGETS
  ? process.env.COURTOS_DESKTOP_TARGETS.split(",").map((target) => target.trim()).filter(Boolean)
  : ["dmg", "zip"];

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
  },
  win: { target: ["nsis"] },
  linux: { target: ["AppImage"] },
};
