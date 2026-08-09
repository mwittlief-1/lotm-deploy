#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const requestedRoot = process.argv[process.argv.indexOf("--root") + 1];
if (!requestedRoot || requestedRoot === "--root") {
  throw new Error("Usage: verifyCourtosRoomAssets.mjs --root <public-root>");
}
const publicRoot = path.resolve(repositoryRoot, requestedRoot);
const sources = [
  "src/ui/courtosInformationArchitecture.ts",
  "src/ui/householdUatModel.ts",
  "src/ui/panels/HouseholdVerticalSlice.tsx",
];
const pattern = /["'](\/assets\/courtos\/rooms\/[^"']+\.jpg)["']/g;
const assets = new Set();
for (const sourcePath of sources) {
  const source = fs.readFileSync(path.resolve(repositoryRoot, sourcePath), "utf8");
  for (const match of source.matchAll(pattern)) assets.add(match[1]);
}
if (assets.size !== 32) {
  throw new Error(`CourtOS room asset closure expected 32 assets, found ${assets.size}.`);
}
for (const asset of [...assets].sort()) {
  const target = path.resolve(publicRoot, asset.slice(1));
  if (!fs.existsSync(target)) throw new Error(`CourtOS room asset is missing: ${target}`);
  const size = fs.statSync(target).size;
  const handle = fs.openSync(target, "r");
  const signature = Buffer.alloc(2);
  fs.readSync(handle, signature, 0, 2, 0);
  fs.closeSync(handle);
  if (size < 10_000 || signature[0] !== 0xff || signature[1] !== 0xd8) {
    throw new Error(`CourtOS room asset is not a materialized JPEG: ${target}`);
  }
}
console.log(`Verified ${assets.size} CourtOS room assets under ${publicRoot}.`);
