import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Source admission bundles are intentionally immutable and can inherit Finder
 * metadata from their origin volume. macOS rejects an app signature if that
 * metadata reaches its resource tree. Remove extended attributes only from the
 * generated application output, before electron-builder applies its signature.
 */
export default async function afterPack(context) {
  if (process.platform !== "darwin") return;
  const appBundle = join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );
  // Some admitted SQLite bundles deliberately ship read-only. Builder copies
  // that mode into the generated app, so make only the generated bundle
  // owner-writable long enough to remove inherited metadata before signing.
  await execFileAsync("chmod", ["-R", "u+w", context.appOutDir]);
  await execFileAsync("xattr", ["-cr", context.appOutDir]);
  // A local UAT package has no Developer ID identity, and modifying Electron's
  // pre-signed bundle invalidates that inherited signature. Apply an ad-hoc
  // signature here so the generated `.app` remains launchable. When release
  // credentials exist, electron-builder's later signing phase replaces it.
  await execFileAsync("codesign", [
    "--force",
    "--deep",
    "--sign",
    "-",
    appBundle,
  ]);
}
