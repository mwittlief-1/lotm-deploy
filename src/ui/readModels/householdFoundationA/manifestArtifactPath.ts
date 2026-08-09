import { basename, dirname, isAbsolute, resolve, sep } from "node:path";

/**
 * Foundation A manifests name their immutable artifact from the repository
 * root (for example `data/genrun/...`).  In Electron, `process.cwd()` is not
 * the application resource root, so resolve that form from the manifest's
 * enclosing `data/` tree instead.
 */
export function resolveManifestArtifactPath(
  manifestPath: string,
  artifactPath: string,
): string {
  if (!artifactPath || typeof artifactPath !== "string") {
    throw new Error("Foundation A manifest artifact path is required.");
  }
  if (isAbsolute(artifactPath)) return artifactPath;
  if (!artifactPath.startsWith("data/")) {
    return resolve(dirname(manifestPath), artifactPath);
  }

  let cursor = dirname(manifestPath);
  while (basename(cursor) !== "data") {
    const parent = dirname(cursor);
    if (parent === cursor) {
      throw new Error("Foundation A manifest is not located beneath a data root.");
    }
    cursor = parent;
  }
  const resourceRoot = dirname(cursor);
  const resolved = resolve(resourceRoot, artifactPath);
  const dataRoot = `${resolve(resourceRoot, "data")}${sep}`;
  if (!resolved.startsWith(dataRoot)) {
    throw new Error("Foundation A manifest artifact path escapes its data root.");
  }
  return resolved;
}
