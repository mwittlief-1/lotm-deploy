#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const MANIFEST_PATH = path.resolve(ROOT, "config/courtos-runtime-inputs.v1.json");
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

if (manifest.schema_version !== "courtos_runtime_inputs_v1") {
  throw new Error("Unsupported CourtOS runtime input manifest schema.");
}

function sha256File(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.resolve(ROOT, relativePath)))
    .digest("hex");
}

function runBuilder(builder) {
  const result = spawnSync("node", [builder], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`CourtOS generated-artifact builder failed: ${builder}`);
  }
}

for (const artifact of manifest.generated_artifacts) {
  runBuilder(artifact.builder);
  if (!fs.existsSync(path.resolve(ROOT, artifact.path))) {
    throw new Error(`CourtOS builder did not create ${artifact.path}.`);
  }
  const firstSha256 = sha256File(artifact.path);
  runBuilder(artifact.builder);
  const secondSha256 = sha256File(artifact.path);
  if (firstSha256 !== secondSha256) {
    throw new Error(
      `CourtOS generated artifact is not deterministic: ${artifact.path} ` +
        `produced ${firstSha256}, then ${secondSha256}.`,
    );
  }
  console.log(
    `CourtOS generated artifact verified: ${artifact.path} (${secondSha256}).`,
  );
}
