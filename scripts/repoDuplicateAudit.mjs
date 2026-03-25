import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  ".git",
  "_archive",
  "coverage",
  "dist",
  "node_modules"
]);
const SUFFIX_RE = /^(?<base>.+) (?<n>[0-9]+)(?<ext>\.[^./]+)?$/;

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "." || entry.name === "..") continue;
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    if (!entry.isFile()) continue;
    out.push(path.join(dir, entry.name));
  }
}

function toRepoPath(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join("/");
}

function canonicalCandidate(relPath) {
  const dir = path.posix.dirname(relPath);
  const name = path.posix.basename(relPath);
  const match = name.match(SUFFIX_RE);
  if (!match?.groups?.base) return null;
  const base = match.groups.base;
  const ext = match.groups.ext ?? "";
  const canonicalName = `${base}${ext}`;
  return dir === "." ? canonicalName : `${dir}/${canonicalName}`;
}

function main() {
  const files = [];
  walk(ROOT, files);

  const repoFiles = files.map(toRepoPath).sort((a, b) => a.localeCompare(b));
  const fileSet = new Set(repoFiles);

  const duplicates = repoFiles
    .map((relPath) => {
      const canonical = canonicalCandidate(relPath);
      if (!canonical) return null;
      return {
        path: relPath,
        canonical,
        canonical_exists: fileSet.has(canonical),
        dir: path.posix.dirname(relPath)
      };
    })
    .filter(Boolean);

  const withCanonical = duplicates.filter((entry) => entry.canonical_exists);
  const withoutCanonical = duplicates.filter((entry) => !entry.canonical_exists);

  const byDir = new Map();
  for (const entry of duplicates) {
    const key = entry.dir;
    byDir.set(key, (byDir.get(key) ?? 0) + 1);
  }

  const summary = {
    total_workspace_duplicates: duplicates.length,
    canonical_conflicts: withCanonical.length,
    suffixed_without_canonical: withoutCanonical.length,
    top_dirs: [...byDir.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([dir, count]) => ({ dir, count }))
  };

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ summary, duplicates }, null, 2));
    return;
  }

  console.log(`workspace duplicates: ${summary.total_workspace_duplicates}`);
  console.log(`canonical conflicts: ${summary.canonical_conflicts}`);
  console.log(`suffixed without canonical: ${summary.suffixed_without_canonical}`);
  console.log("");
  console.log("top directories:");
  for (const row of summary.top_dirs) {
    console.log(`- ${row.dir}: ${row.count}`);
  }
  console.log("");
  console.log("sample conflicts:");
  for (const entry of withCanonical.slice(0, 25)) {
    console.log(`- ${entry.path} -> ${entry.canonical}`);
  }
}

main();
