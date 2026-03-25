import fs from "node:fs";
import path from "node:path";

import { sha256, stableJson, stableStringify } from "./hash";

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function sanitizePathSegment(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "value";
}

export function defaultReplayOutdir(appVersion: string, mode: "single" | "batch", turns: number): string {
  return path.resolve("qa_artifacts", "seed_replay", appVersion, mode, `turns_${Math.max(1, Math.trunc(turns))}`);
}

export function runArtifactPath(outdir: string, policyId: string, seed: string): string {
  return path.join(outdir, "runs", sanitizePathSegment(policyId), `${sanitizePathSegment(seed)}.json`);
}

export function summaryArtifactPath(outdir: string): string {
  return path.join(outdir, "summary.json");
}

export function writeStableArtifact<T extends Record<string, unknown>>(filePath: string, payload: T): T & { hash: string } {
  const withHash = { ...payload, hash: sha256(stableStringify(payload)) } as T & { hash: string };
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, stableJson(withHash), "utf8");
  return withHash;
}

