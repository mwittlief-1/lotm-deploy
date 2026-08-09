import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * Resolves an application URL only inside the packaged renderer root.
 * `startsWith(root)` is insufficient because a sibling such as
 * `renderer-private` shares the same string prefix.
 */
export function safeRendererAssetPath(rendererRoot: string, url: URL): string | null {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const requestedPath = decodedPath.replace(/^\/+/, "") || "courtos-home.html";
  const candidate = resolve(rendererRoot, requestedPath);
  const containment = relative(rendererRoot, candidate);
  if (
    containment === ".." ||
    containment.startsWith(`..${sep}`) ||
    isAbsolute(containment)
  ) return null;
  return candidate;
}
