#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright-core";

const argv = process.argv.slice(2);

function valueAfter(flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function boundedNumber(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function requireLocalUrl(rawUrl) {
  if (!rawUrl) throw new Error("--url is required.");
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("CourtOS UAT browser accepts only local HTTP preview URLs.");
  }
  return url.toString();
}

function artifactPath(rawPath, label) {
  if (!rawPath) return null;
  const artifactRoot = process.env.COURTOS_UAT_ARTIFACT_DIR;
  if (!artifactRoot) throw new Error(`${label} requires COURTOS_UAT_ARTIFACT_DIR.`);
  const root = path.resolve(artifactRoot);
  const target = path.resolve(root, rawPath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} must remain inside the UAT artifact directory.`);
  }
  return target;
}

function parseActions() {
  const raw = valueAfter("--actions-json") ?? "[]";
  const actions = JSON.parse(raw);
  if (!Array.isArray(actions)) throw new Error("--actions-json must contain an array.");
  if (actions.length > 40) throw new Error("A browser probe may contain at most 40 actions.");
  return actions;
}

function locatorFor(page, action) {
  if (action.selector) return page.locator(String(action.selector));
  if (action.role && action.name !== undefined) {
    return page.getByRole(String(action.role), {
      name: action.name instanceof RegExp ? action.name : String(action.name),
      exact: action.exact === true,
    });
  }
  if (action.label) return page.getByLabel(String(action.label), { exact: action.exact === true });
  if (action.placeholder) {
    return page.getByPlaceholder(String(action.placeholder), { exact: action.exact === true });
  }
  if (action.text) return page.getByText(String(action.text), { exact: action.exact === true });
  throw new Error(`Action ${String(action.type)} requires a selector or semantic locator.`);
}

async function executeAction(page, action) {
  const timeout = boundedNumber(action.timeoutMs, 5_000, 100, 15_000);
  switch (action.type) {
    case "click":
      await locatorFor(page, action).first().click({ timeout });
      return;
    case "fill":
      await locatorFor(page, action).first().fill(String(action.value ?? ""), { timeout });
      return;
    case "press":
      await locatorFor(page, action).first().press(String(action.key), { timeout });
      return;
    case "select":
      await locatorFor(page, action).first().selectOption(
        action.value !== undefined ? String(action.value) : { label: String(action.optionLabel) },
        { timeout },
      );
      return;
    case "waitFor":
      await locatorFor(page, action).first().waitFor({
        state: action.state ?? "visible",
        timeout,
      });
      return;
    case "wait":
      await page.waitForTimeout(boundedNumber(action.ms, 250, 0, 5_000));
      return;
    case "goBack":
      await page.goBack({ waitUntil: "domcontentloaded", timeout });
      return;
    case "goForward":
      await page.goForward({ waitUntil: "domcontentloaded", timeout });
      return;
    default:
      throw new Error(`Unsupported browser action: ${String(action.type)}`);
  }
}

const url = requireLocalUrl(valueAfter("--url"));
const actions = parseActions();
const screenshotPath = artifactPath(valueAfter("--screenshot"), "--screenshot");
const outputPath = artifactPath(valueAfter("--output"), "--output");
const viewport = {
  width: boundedNumber(valueAfter("--width"), 1440, 320, 3840),
  height: boundedNumber(valueAfter("--height"), 1000, 240, 2160),
};
const consoleEvents = [];
const pageErrors = [];
const failedRequests = [];
const responseErrors = [];

async function forwardToBroker() {
  const brokerUrl = process.env.COURTOS_UAT_BROWSER_BROKER_URL;
  if (!brokerUrl) return false;
  const brokerToken = process.env.COURTOS_UAT_BROWSER_BROKER_TOKEN;
  if (!brokerToken) throw new Error("Browser broker URL requires COURTOS_UAT_BROWSER_BROKER_TOKEN.");
  const response = await fetch(brokerUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${brokerToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url,
      actions,
      screenshot: valueAfter("--screenshot") ?? null,
      output: valueAfter("--output") ?? null,
      width: viewport.width,
      height: viewport.height,
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`CourtOS UAT browser broker returned HTTP ${response.status}: ${body}`);
  process.stdout.write(body.endsWith("\n") ? body : `${body}\n`);
  return true;
}

if (await forwardToBroker()) process.exit(0);

const browserTempRoot = path.resolve(
  process.env.COURTOS_UAT_BROWSER_TEMP_DIR ??
    path.join(process.env.COURTOS_UAT_ARTIFACT_DIR ?? process.env.TMPDIR ?? "/tmp", "browser-temp"),
);
fs.mkdirSync(browserTempRoot, { recursive: true });

const configuredExecutablePath =
  process.env.COURTOS_UAT_BROWSER_EXECUTABLE_PATH?.trim() || undefined;
const context = await chromium.launchPersistentContext(
  path.join(browserTempRoot, `profile-${process.pid}`),
  {
    ...(configuredExecutablePath
      ? { executablePath: configuredExecutablePath }
      : { channel: process.env.COURTOS_UAT_BROWSER_CHANNEL ?? "chrome" }),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    viewport,
  },
);

try {
  const page = context.pages()[0] ?? (await context.newPage());
  page.on("console", (message) => {
    consoleEvents.push({ type: message.type(), text: message.text().slice(0, 2_000) });
  });
  page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 4_000)));
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown" });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) responseErrors.push({ url: response.url(), status: response.status() });
  });

  const navigation = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  for (const action of actions) await executeAction(page, action);
  await page.waitForTimeout(150);

  if (screenshotPath) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }

  const controls = await page.locator("button, a, input, select, textarea, [role]").evaluateAll((nodes) =>
    nodes.slice(0, 250).map((node) => ({
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute("role"),
      text: (node.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
      ariaLabel: node.getAttribute("aria-label"),
      disabled: "disabled" in node ? Boolean(node.disabled) : node.getAttribute("aria-disabled") === "true",
    })),
  );
  const focused = await page.evaluate(() => {
    const node = document.activeElement;
    if (!(node instanceof HTMLElement)) return null;
    return {
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute("role"),
      text: (node.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
      ariaLabel: node.getAttribute("aria-label"),
    };
  });
  const frames = await Promise.all(
    page.frames().map(async (frame) => ({
      url: frame.url(),
      title: await frame.title().catch(() => ""),
    })),
  );
  const result = {
    schema_version: "courtos_uat_browser_evidence_v1",
    requestedUrl: url,
    finalUrl: page.url(),
    httpStatus: navigation?.status() ?? null,
    title: await page.title(),
    viewport,
    actions,
    visibleText: (await page.locator("body").innerText()).slice(0, 60_000),
    controls,
    focused,
    frames,
    consoleEvents,
    pageErrors,
    failedRequests,
    responseErrors,
    screenshotPath,
  };
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, serialized);
  }
  process.stdout.write(serialized);
} finally {
  await context.close();
}
