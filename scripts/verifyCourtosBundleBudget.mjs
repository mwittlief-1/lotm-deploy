#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetsDirectory = path.join(root, "dist", "assets");
const budgets = [
  { label: "CourtOS JavaScript", pattern: /^courtosHome-.*\.js$/, maxBytes: 450 * 1024 },
  { label: "CourtOS stylesheet", pattern: /^courtosHome-.*\.css$/, maxBytes: 100 * 1024 },
];

if (!fs.existsSync(assetsDirectory)) {
  throw new Error("CourtOS bundle budget requires a completed dist build.");
}

for (const budget of budgets) {
  const matches = fs.readdirSync(assetsDirectory).filter((name) => budget.pattern.test(name));
  if (matches.length !== 1) {
    throw new Error(`${budget.label} budget expected one bundle, found ${matches.length}.`);
  }
  const bundlePath = path.join(assetsDirectory, matches[0]);
  const bytes = fs.statSync(bundlePath).size;
  if (bytes > budget.maxBytes) {
    throw new Error(`${budget.label} is ${bytes} bytes; limit is ${budget.maxBytes} bytes.`);
  }
  console.log(`${budget.label}: ${bytes} / ${budget.maxBytes} bytes`);
}
