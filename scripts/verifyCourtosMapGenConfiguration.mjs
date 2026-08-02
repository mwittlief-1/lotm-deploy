#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function verifiedMapGenBaseUrl(value) {
  const raw = value?.trim();
  if (!raw) {
    throw new Error("VITE_MAPGEN_BASE_URL is required for a production CourtOS build.");
  }
  const url = new URL(raw);
  if (url.protocol !== "https:") {
    throw new Error("VITE_MAPGEN_BASE_URL must use HTTPS in production.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("VITE_MAPGEN_BASE_URL must not contain credentials, query, or fragment data.");
  }
  if (url.pathname !== "/") {
    throw new Error("VITE_MAPGEN_BASE_URL must name the MapGen origin root.");
  }
  return url;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const url = verifiedMapGenBaseUrl(process.env.VITE_MAPGEN_BASE_URL);
  process.stdout.write(
    `${JSON.stringify({
      schema_version: "courtos_mapgen_production_configuration_v1",
      mapgen_origin: url.origin,
      verdict: "pass",
    })}\n`,
  );
}
