#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const targetRoot = path.resolve(root, ".courtos-public");
const sources = [
  "src/ui/courtosInformationArchitecture.ts",
  "src/ui/householdUatModel.ts",
  "src/ui/panels/HouseholdVerticalSlice.tsx",
];
const pattern = /["'](\/assets\/courtos\/rooms\/[^"']+\.jpg)["']/g;
const assets = new Set();
for (const sourcePath of sources) {
  const source = fs.readFileSync(path.resolve(root, sourcePath), "utf8");
  for (const match of source.matchAll(pattern)) assets.add(match[1]);
}
if (assets.size !== 32) throw new Error(`Expected 32 CourtOS room assets; found ${assets.size}.`);
const targetDirectory = path.resolve(targetRoot, "assets/courtos/rooms");
fs.rmSync(targetDirectory, { recursive: true, force: true });
for (const asset of [...assets].sort()) {
  const source = path.resolve(root, `public${asset}`);
  const destination = path.resolve(targetRoot, asset.slice(1));
  if (!fs.existsSync(source)) throw new Error(`Missing CourtOS room asset: ${source}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  try {
    fs.linkSync(source, destination);
  } catch {
    fs.copyFileSync(source, destination);
  }
}
console.log(`Staged ${assets.size} CourtOS room assets in .courtos-public/.`);
