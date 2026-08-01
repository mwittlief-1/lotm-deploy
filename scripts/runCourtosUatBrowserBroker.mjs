#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const argv = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

const host = valueAfter("--host") ?? "127.0.0.1";
const port = Number(valueAfter("--port"));
const artifactRoot = path.resolve(process.env.COURTOS_UAT_ARTIFACT_DIR ?? "");
const token = process.env.COURTOS_UAT_BROWSER_BROKER_TOKEN;
const driverPath = path.resolve(process.cwd(), "scripts/runCourtosUatBrowser.mjs");
const activeChildren = new Set();
let activeRequests = 0;
const browserQueue = [];

if (host !== "127.0.0.1") throw new Error("CourtOS UAT browser broker must bind to 127.0.0.1.");
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("--port must be a valid TCP port.");
if (!token || token.length < 32) throw new Error("COURTOS_UAT_BROWSER_BROKER_TOKEN must contain at least 32 characters.");
if (!process.env.COURTOS_UAT_ARTIFACT_DIR) throw new Error("COURTOS_UAT_ARTIFACT_DIR is required.");
fs.mkdirSync(artifactRoot, { recursive: true });

function respond(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 256 * 1024) throw new Error("Browser broker request exceeds 256 KiB.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function runDriver(payload) {
  const args = [driverPath, "--url", String(payload.url ?? "")];
  if (payload.actions !== undefined) args.push("--actions-json", JSON.stringify(payload.actions));
  if (payload.screenshot) args.push("--screenshot", String(payload.screenshot));
  if (payload.output) args.push("--output", String(payload.output));
  if (payload.width) args.push("--width", String(payload.width));
  if (payload.height) args.push("--height", String(payload.height));

  return new Promise((resolve) => {
    const environment = { ...process.env };
    delete environment.COURTOS_UAT_BROWSER_BROKER_URL;
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    activeChildren.add(child);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      if (stdout.length < 5_000_000) stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 1_000_000) stderr += chunk.toString();
    });
    const timeout = setTimeout(() => child.kill("SIGTERM"), 90_000);
    child.once("close", (code) => {
      clearTimeout(timeout);
      activeChildren.delete(child);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function acquireBrowserSlot() {
  if (activeRequests >= 4) {
    await new Promise((resolve) => browserQueue.push(resolve));
  }
  activeRequests += 1;
}

function releaseBrowserSlot() {
  activeRequests -= 1;
  const next = browserQueue.shift();
  if (next) next();
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    respond(response, 200, "ok\n");
    return;
  }
  if (request.method !== "POST" || request.url !== "/probe") {
    respond(response, 404, "not found\n");
    return;
  }
  if (request.headers.authorization !== `Bearer ${token}`) {
    respond(response, 401, "unauthorized\n");
    return;
  }
  await acquireBrowserSlot();
  try {
    const payload = await readJson(request);
    const result = await runDriver(payload);
    if (result.code !== 0) {
      respond(response, 500, result.stderr || result.stdout || "browser driver failed\n");
      return;
    }
    JSON.parse(result.stdout);
    respond(response, 200, result.stdout, "application/json; charset=utf-8");
  } catch (error) {
    respond(response, 400, `${error instanceof Error ? error.message : String(error)}\n`);
  } finally {
    releaseBrowserSlot();
  }
});

server.listen(port, host, () => {
  process.stdout.write(`CourtOS UAT browser broker listening at http://${host}:${port}\n`);
});

function shutdown() {
  for (const child of activeChildren) child.kill("SIGTERM");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
