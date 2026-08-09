import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const desktopRoot = import.meta.dirname;
const repositoryRoot = resolve(desktopRoot, "..");
const stageRoot = process.env.COURTOS_DESKTOP_STAGING_ROOT
  ? resolve(process.env.COURTOS_DESKTOP_STAGING_ROOT)
  : "/private/tmp/merecross-courtos-desktop-staging";

async function replaceFrom(source, destination) {
  await rm(destination, { recursive: true, force: true });
  await mkdir(dirname(destination), { recursive: true });
  // Node's fs.cp may receive an indefinitely pending read from the local File
  // Provider volume that hosts this repository. ditto is the native macOS
  // copy path and explicitly drops the metadata that would invalidate an app
  // signature. Non-macOS CI retains the standard Node path.
  if (process.platform === "darwin") {
    try {
      await execFileAsync("ditto", ["--noextattr", source, destination]);
      return;
    } catch (error) {
      // Sandboxed UAT builders can allow ordinary filesystem writes while
      // denying `ditto` at the same destination. Fall back to the portable
      // copier; the generated app is still normalized by `afterPack` before
      // electron-builder applies its ad-hoc signature.
      if (error?.code !== 1 || !String(error?.stderr ?? "").includes("Operation not permitted")) {
        throw error;
      }
    }
  }
  await cp(source, destination, { recursive: true, force: true });
}

await mkdir(stageRoot, { recursive: true });

const dataOnly = process.env.COURTOS_DESKTOP_STAGE_DATA_ONLY === "1";
if (!dataOnly) {
  for (const name of [
    "package.json",
    "package-lock.json",
    "electron-builder.config.mjs",
    "afterPack.mjs",
  ]) {
    await cp(resolve(desktopRoot, name), resolve(stageRoot, name), { force: true });
  }

  // Never stage a prior Electron output directory. `desktop/dist` also contains
  // renderer/main build products, so select only those inputs rather than
  // recursively copying a stale mac-arm64 application back into a new package.
  await rm(resolve(stageRoot, "dist"), { recursive: true, force: true });
  await mkdir(resolve(stageRoot, "dist"), { recursive: true });
  await replaceFrom(resolve(desktopRoot, "dist/renderer"), resolve(stageRoot, "dist/renderer"));
  await replaceFrom(resolve(desktopRoot, "dist/assets"), resolve(stageRoot, "dist/assets"));
  await replaceFrom(resolve(desktopRoot, "dist/main.mjs"), resolve(stageRoot, "dist/main.mjs"));
  await replaceFrom(resolve(desktopRoot, "dist/preload.cjs"), resolve(stageRoot, "dist/preload.cjs"));
  // These surfaces are selected by runtime IA data and therefore are not all
  // discoverable by Vite's static public-asset closure. Package the exact
  // production set beside the renderer rather than allowing a silent 404.
  for (const asset of [
    "atlas-table.png",
    "council-table.png",
    "family-tree.png",
    "orders-board.png",
  ]) {
    await replaceFrom(
      resolve(repositoryRoot, `public/assets/council-command-room/command-surfaces/${asset}`),
      resolve(stageRoot, `dist/renderer/assets/council-command-room/command-surfaces/${asset}`),
    );
  }
  await replaceFrom(
    resolve(repositoryRoot, "public/assets/mapgen-manor-v2"),
    resolve(stageRoot, "dist/renderer/assets/mapgen-manor-v2"),
  );
  await replaceFrom(
    resolve(repositoryRoot, "public/assets/mapgen-landscape"),
    resolve(stageRoot, "dist/renderer/assets/mapgen-landscape"),
  );
}
// Package the checksum-pinned export catalog as one unit. Runtime selection is
// manifest-driven; the desktop adapter never names a House or manor export.
await replaceFrom(
  resolve(repositoryRoot, "data/map/mapgen_exports"),
  resolve(stageRoot, "payload/data/map/mapgen_exports"),
);
// A local build directory can retain superseded immutable generations for
// diagnostics. A shipped app receives only the generation named by the
// verified top-level manifest; copying the whole cache previously added almost
// a gigabyte of stale SQLite to the package.
const foundationSourceRoot = resolve(
  repositoryRoot,
  ".courtos-generated/foundation-a",
);
const foundationDestinationRoot = resolve(
  stageRoot,
  "payload/.courtos-generated/foundation-a",
);
const foundationManifest = JSON.parse(
  await readFile(resolve(foundationSourceRoot, "MANIFEST.json"), "utf8"),
);
if (
  foundationManifest.schema_version !== "merecross_foundation_a_release_v1" ||
  !/^[a-f0-9]{64}$/.test(foundationManifest.generation_id ?? "") ||
  typeof foundationManifest.artifact?.path !== "string"
) {
  throw new Error("Foundation A package staging requires a verified release manifest.");
}
const expectedArtifactPath =
  `.courtos-generated/foundation-a/generations/${foundationManifest.generation_id}/` +
  "merecross_foundation_a_v1.sqlite";
if (foundationManifest.artifact.path !== expectedArtifactPath) {
  throw new Error("Foundation A package artifact path escaped its generation.");
}
await mkdir(
  resolve(foundationDestinationRoot, "generations", foundationManifest.generation_id),
  { recursive: true },
);
for (const relativePath of [
  "CURRENT",
  "MANIFEST.json",
  `generations/${foundationManifest.generation_id}/MANIFEST.json`,
  `generations/${foundationManifest.generation_id}/merecross_foundation_a_v1.sqlite`,
]) {
  await replaceFrom(
    resolve(foundationSourceRoot, relativePath),
    resolve(foundationDestinationRoot, relativePath),
  );
}
if (dataOnly || process.env.COURTOS_DESKTOP_STAGE_CORE_ONLY === "1") {
  console.log(`Desktop core package workspace staged at ${stageRoot}`);
  process.exit(0);
}
// The pilot's native runtime and pinned local model are explicit package
// inputs, never downloaded by the desktop app at launch.
await replaceFrom(
  resolve(repositoryRoot, "poc/local-slm-financial-narrative-v1/local-runtime/llama-b10099"),
  resolve(stageRoot, "payload/poc/local-slm-financial-narrative-v1/local-runtime/llama-b10099"),
);
await replaceFrom(
  resolve(repositoryRoot, "poc/local-slm-financial-narrative-v1/local-models/Qwen3-4B-Instruct-Q4_K_M.gguf"),
  resolve(stageRoot, "payload/poc/local-slm-financial-narrative-v1/local-models/Qwen3-4B-Instruct-Q4_K_M.gguf"),
);
await replaceFrom(
  resolve(repositoryRoot, "poc/local-slm-financial-narrative-v1/model-manifest.json"),
  resolve(stageRoot, "payload/poc/local-slm-financial-narrative-v1/model-manifest.json"),
);

console.log(`Desktop package workspace staged at ${stageRoot}`);
