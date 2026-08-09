import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { _electron as electron } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const configPath = path.resolve(root, valueAfter("--config") ?? "qa/desktop/first-release-uat.v1.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const dryRun = argv.includes("--dry-run");
const keepProfile = argv.includes("--keep-profile");
const appBundle = path.resolve(valueAfter("--app") ?? process.env.COURTOS_DESKTOP_APP ?? config.installed_app);
const executablePath = executableForApp(appBundle);
const runId = valueAfter("--run-id") ?? new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const artifactRoot = path.resolve(root, valueAfter("--artifacts") ?? `qa_artifacts/courtos_desktop_uat/${runId}`);
const profilePath = valueAfter("--profile")
  ? path.resolve(valueAfter("--profile"))
  : dryRun
    ? "<isolated temporary desktop profile>"
    : fs.mkdtempSync(path.join(os.tmpdir(), "merecross-desktop-uat-"));

function valueAfter(flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function executableForApp(candidate) {
  if (candidate.endsWith(".app")) {
    return path.join(candidate, "Contents", "MacOS", "Merecross");
  }
  return candidate;
}

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function writeJson(target, value) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

if (dryRun) {
  console.log(JSON.stringify({
    config: configPath,
    appBundle,
    executablePath,
    artifactRoot,
    profilePath,
    scenarios: [
      "FR-001 packaged launch and API contract",
      "FR-002 Inner Council identity and navigation",
      "FR-003 nine entry surfaces",
      "FR-004 all 24 responsibility routes",
      "FR-005 Household four-workspace data depth",
      "FR-006 Household record-detail modals",
      "FR-007 assignment draft save, reload, and discard",
      "FR-008 map portfolio and scale continuity",
      "FR-009 alternate-House denial",
      "FR-010 Steam minimum viewport and accessibility smoke",
      "FR-011 renderer error and warning gate"
    ]
  }, null, 2));
  process.exit(0);
}

expect(process.platform === "darwin", "The first-release desktop runner currently targets the macOS UAT package.");
expect(fs.existsSync(executablePath), `Desktop executable not found: ${executablePath}`);
fs.mkdirSync(artifactRoot, { recursive: true });

const results = [];
const rendererEvents = [];
let app = null;
let page = null;

async function launch() {
  app = await electron.launch({
    executablePath,
    args: [`--user-data-dir=${profilePath}`],
    timeout: 90_000,
  });
  page = await app.firstWindow({ timeout: 90_000 });
  page.setDefaultTimeout(45_000);
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      rendererEvents.push({
        at: new Date().toISOString(),
        type: message.type(),
        text: message.text(),
        url: page.url(),
      });
    }
  });
  page.on("pageerror", (error) => {
    rendererEvents.push({
      at: new Date().toISOString(),
      type: "pageerror",
      text: error.message,
      url: page.url(),
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      rendererEvents.push({
        at: new Date().toISOString(),
        type: "http",
        status: response.status(),
        text: `${response.status()} ${response.statusText()}`,
        resource_url: response.url(),
        url: page.url(),
      });
    }
  });
}

async function screenshot(name, options = {}) {
  const target = path.join(artifactRoot, "screenshots", `${name}.png`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: options.fullPage ?? false });
  return path.relative(root, target);
}

async function goto(search = "") {
  await page.goto(`merecross://app/courtos-home.html${search}`, { waitUntil: "domcontentloaded" });
}

async function waitForCouncil() {
  await page.getByRole("region", { name: "The Inner Council" }).waitFor({ state: "visible" });
}

async function returnToCouncil() {
  const currentPlace = page.getByRole("navigation", { name: "Current place" });
  const button = currentPlace.getByRole("button", { name: "Council Room" });
  if (await button.count()) await button.click();
  else await goto();
  await waitForCouncil();
}

async function scenario(id, title, body) {
  const started = Date.now();
  const evidence = [];
  try {
    await body(evidence);
    results.push({ id, title, status: "pass", duration_ms: Date.now() - started, evidence });
    console.log(`PASS ${id} ${title}`);
  } catch (error) {
    const failureShot = page ? await screenshot(`${id.toLowerCase()}-failure`, { fullPage: true }).catch(() => null) : null;
    if (failureShot) evidence.push(failureShot);
    results.push({
      id,
      title,
      status: "fail",
      duration_ms: Date.now() - started,
      evidence,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`FAIL ${id} ${title}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

try {
  await launch();

  await scenario("FR-001", "Packaged launch and API contract", async (evidence) => {
    await waitForCouncil();
    expect((await page.title()).includes("Merecross"), `Unexpected window title: ${await page.title()}`);
    expect(page.url().startsWith("merecross://app/"), `Unexpected renderer origin: ${page.url()}`);
    expect(await page.getByRole("alert").count() === 0, "The packaged client opened on an error surface.");

    const projection = await page.evaluate(async (houseId) => {
      const courtResponse = await fetch(`/api/courtos/1120?houseId=${encodeURIComponent(houseId)}`);
      const courtPayload = await courtResponse.json();
      if (!courtResponse.ok || !courtPayload.ok) return { error: courtPayload.error ?? courtResponse.status };
      const householdEntityId = courtPayload.data.selected_entity.entity_id;
      const householdResponse = await fetch(`/api/household/1120?${new URLSearchParams({ householdEntityId, houseId })}`);
      const householdPayload = await householdResponse.json();
      const councilResponse = await fetch(`/api/council-room/1120?houseId=${encodeURIComponent(houseId)}`);
      const councilPayload = await councilResponse.json();
      const spatialResponse = await fetch(`/api/spatial/1120?houseId=${encodeURIComponent(houseId)}`);
      const spatialPayload = await spatialResponse.json();
      return { courtPayload, householdPayload, councilPayload, spatialPayload };
    }, config.player_house.house_id);
    expect(!projection.error, `Packaged API failed: ${JSON.stringify(projection.error)}`);
    expect(projection.householdPayload.ok === true, "Household API did not return an admitted projection.");
    expect(projection.councilPayload.ok === true, "Council API did not return a projection.");
    expect(projection.spatialPayload.ok === true, "Spatial API did not return a projection.");
    const household = projection.householdPayload.data;
    const expected = config.expected_projection;
    expect(household.contract.effective_date === expected.effective_date, "Household effective date drifted from the release contract.");
    for (const field of [
      "membership_context", "responsibility_summary", "stores_positions",
      "economic_activity_lookback", "adult_kin_roster", "education_plans",
      "education_cycle_reports", "health_roster", "health_cycle_reports",
    ]) {
      expect(household[field].length === expected[field], `${field}: expected ${expected[field]}, received ${household[field].length}`);
    }
    expect(household.matters.length === expected.opening_matters, "Opening Household Matters must remain honestly empty.");
    const councilCount = projection.councilPayload.data.inner_council_seats.length;
    expect(councilCount === expected.council_seats, `Expected ${expected.council_seats} Inner Council seats, received ${councilCount}`);
    expect(projection.spatialPayload.data.portfolio.manors.length === expected.manors, `Expected ${expected.manors} manors in the Pearwick portfolio.`);
    const apiEvidence = path.join(artifactRoot, "api-contract.json");
    writeJson(apiEvidence, {
      house: projection.courtPayload.data.selected_entity,
      context: projection.courtPayload.context,
      household_contract: household.contract,
      counts: Object.fromEntries(Object.keys(expected).map((key) => [key,
        key === "opening_matters" ? household.matters.length
          : key === "council_seats" ? councilCount
            : key === "manors" ? projection.spatialPayload.data.portfolio.manors.length
              : Array.isArray(household[key]) ? household[key].length : expected[key]
      ])),
    });
    evidence.push(path.relative(root, apiEvidence), await screenshot("fr-001-launch"));
  });

  await scenario("FR-002", "Inner Council identity and navigation", async (evidence) => {
    await goto();
    await waitForCouncil();
    await page.getByText(config.player_house.house_name, { exact: false }).first().waitFor();
    expect(await page.locator(".uat-council-person").count() === config.expected_projection.council_seats, "Inner Council seat count does not match the release contract.");
    expect(await page.locator(".uat-council-domain-objects > button").count() === config.domains.length, "Council must expose exactly eight operational rooms.");
    await page.getByRole("button", { name: /House Command/ }).waitFor();
    await page.getByRole("button", { name: /Council Docket/ }).waitFor();
    evidence.push(await screenshot("fr-002-inner-council"));
  });

  await scenario("FR-003", "Nine entry surfaces", async (evidence) => {
    await goto();
    await waitForCouncil();
    evidence.push(await screenshot("fr-003-00-council"));
    await page.getByRole("button", { name: /House Command/ }).click();
    await page.getByRole("region", { name: "House Command" }).waitFor();
    evidence.push(await screenshot("fr-003-01-house-command"));
    for (const [index, domain] of config.domains.entries()) {
      await returnToCouncil();
      await page.locator(`[data-domain="${domain.key}"]`).click();
      await page.getByRole("region", { name: domain.surface }).waitFor();
      expect((await page.locator(".uat-venue").getAttribute("data-room-tone")) !== null, `${domain.label} has no visual room token.`);
      evidence.push(await screenshot(`fr-003-${String(index + 2).padStart(2, "0")}-${slug(domain.key)}`));
    }
  });

  await scenario("FR-004", "All 24 responsibility routes", async (evidence) => {
    const failures = [];
    for (const responsibility of config.responsibilities) {
      if (responsibility.domain === "house_command") {
        await goto("?place=house_command");
        await page.getByRole("region", { name: "House Command" }).waitFor();
        const present = await page.getByRole("button", { name: /Open Office Appointments/ }).count();
        if (!present) failures.push(`${responsibility.key}: missing from House Command`);
        continue;
      }
      const search = `?place=responsibility&domain=${encodeURIComponent(responsibility.domain)}&responsibility=${encodeURIComponent(responsibility.key)}`;
      await goto(search);
      const workspace = page.locator(`[data-responsibility="${responsibility.runtime_key ?? responsibility.key}"]`);
      const manorWorkspace = responsibility.key === "manor_stewardship"
        ? page.getByRole("region", { name: "Manor Stewardship" })
        : null;
      const visible = manorWorkspace
        ? await manorWorkspace.waitFor({ state: "visible" }).then(() => true).catch(() => false)
        : await workspace.waitFor({ state: "visible" }).then(() => true).catch(() => false);
      if (!visible) failures.push(`${responsibility.key}: no responsibility workspace`);
    }
    expect(failures.length === 0, `Responsibility depth failures: ${failures.join("; ")}`);
    evidence.push(await screenshot("fr-004-final-responsibility"));
  });

  await scenario("FR-005", "Household four-workspace data depth", async (evidence) => {
    await goto("?place=domain&domain=household");
    await page.getByRole("region", { name: "The Household Solar" }).waitFor();
    expect(await page.locator(".uat-responsibility-marker").count() === 4, "Household Solar must expose four responsibilities.");
    const checks = [
      { key: "stores", routeKey: "household_stores_provisioning_procurement", record: ".uat-record-table button", minimum: 1 },
      { key: "adult_kin", routeKey: "adult_kin_support", record: ".uat-record-table button", minimum: 1 },
      { key: "education", routeKey: "education_formation", record: ".uat-learner-ledger button", minimum: 1 },
      { key: "service_care", routeKey: "household_service_care", record: ".uat-record-table button", minimum: 1 },
    ];
    for (const item of checks) {
      await goto(`?place=responsibility&domain=household&responsibility=${item.routeKey}`);
      await page.locator(`[data-responsibility="${item.key}"]`).waitFor();
      const count = await page.locator(item.record).count();
      expect(count >= item.minimum, `${item.key} has no player-readable records.`);
      await page.getByRole("button", { name: "Review assignment basis" }).waitFor();
      evidence.push(await screenshot(`fr-005-${slug(item.key)}`));
    }
  });

  await scenario("FR-006", "Household record-detail modals", async (evidence) => {
    const cases = [
      { key: "household_stores_provisioning_procurement", selector: "button[aria-label^='Inspect '], .uat-record-table button", term: "Prior-cycle evidence" },
      { key: "adult_kin_support", selector: "button[aria-label^='Inspect support record']", term: "Why this remains Household work" },
      { key: "education_formation", selector: ".uat-learner-ledger button", term: "Responsible party" },
      { key: "household_service_care", selector: "button[aria-label^='Inspect care record']", term: "Course since last report" },
    ];
    for (const item of cases) {
      await goto(`?place=responsibility&domain=household&responsibility=${item.key}`);
      const record = page.locator(item.selector).first();
      await record.waitFor();
      await record.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await dialog.getByText(item.term, { exact: false }).waitFor();
      expect(await dialog.getByRole("button", { name: "Close record" }).count() === 1, "Record dialog has no accessible close control.");
      evidence.push(await screenshot(`fr-006-${slug(item.key)}-detail`));
      await dialog.getByRole("button", { name: "Close record" }).click();
      await dialog.waitFor({ state: "hidden" });
    }
  });

  await scenario("FR-007", "Assignment draft save, reload, and discard", async (evidence) => {
    await goto("?place=responsibility&domain=household&responsibility=adult_kin_support&detail=assignment_basis");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const editor = dialog.getByRole("region", { name: "Assignment planning draft" });
    const select = editor.getByLabel("Proposed principal");
    expect(await select.isEnabled(), "Head-of-House assignment planning is not enabled.");
    const options = await select.locator("option").count();
    expect(options >= 2, "Assignment planning needs at least two eligible Council principals for this test.");
    await select.selectOption({ index: 1 });
    await editor.getByRole("button", { name: "Save planning draft" }).click();
    await editor.getByText(/Draft v1 saved .*1120–1122/).waitFor();
    evidence.push(await screenshot("fr-007-assignment-saved"));

    await page.reload({ waitUntil: "domcontentloaded" });
    const reloaded = page.getByRole("dialog").getByRole("region", { name: "Assignment planning draft" });
    await reloaded.getByText(/Draft v1 saved .*1120–1122/).waitFor();
    evidence.push(await screenshot("fr-007-assignment-reloaded"));
    await reloaded.getByRole("button", { name: "Discard saved draft" }).click();
    await reloaded.getByText(/Draft v1 saved/).waitFor({ state: "hidden" });
  });

  await scenario("FR-008", "Map portfolio and scale continuity", async (evidence) => {
    await goto("?place=domain&domain=estate_holdings");
    const estate = page.getByRole("region", { name: "Estate and Holdings" });
    await estate.waitFor();
    await estate.getByText("Roadcote Court", { exact: false }).first().waitFor();
    expect(await estate.locator(".uat-spatial-manor-list button").count() === config.expected_projection.manors, "Map portfolio does not expose both Pearwick manors.");
    evidence.push(await screenshot("fr-008-realm"));
    const county = estate.getByRole("button", { name: "County", exact: true });
    if (await county.isEnabled()) {
      await county.click();
      await page.waitForTimeout(1200);
      evidence.push(await screenshot("fr-008-county"));
    }
    const manor = estate.getByRole("button", { name: "Manor", exact: true });
    expect(await manor.isEnabled(), "Roadcote Court has no admitted Manor-scale view.");
    await manor.click();
    await page.waitForTimeout(1200);
    evidence.push(await screenshot("fr-008-manor"));
    await estate.getByRole("button", { name: "Open Manor Stewardship" }).click();
    await page.getByRole("region", { name: "Manor Stewardship" }).waitFor();
    await page.getByRole("heading", { name: "Roadcote Court" }).waitFor();
    evidence.push(await screenshot("fr-008-manor-stewardship"));
  });

  await scenario("FR-009", "Alternate-House denial", async (evidence) => {
    await goto("?houseId=t0h_not_the_player_house");
    const blocked = page.getByRole("status");
    await blocked.getByText("The House record needs more context").waitFor();
    await blocked.getByText("COURTOS_HOUSE_ACCESS_DENIED").waitFor();
    expect(await page.getByRole("region", { name: "The Inner Council" }).count() === 0, "Denied House leaked the Council surface.");
    evidence.push(await screenshot("fr-009-house-denied"));
  });

  await scenario("FR-010", "Steam minimum viewport and accessibility smoke", async (evidence) => {
    const minimum = config.steam_viewports.find((item) => item.name === "minimum");
    await page.setViewportSize({ width: minimum.width, height: minimum.height });
    await goto();
    await waitForCouncil();
    const councilOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(councilOverflow <= 1, `Council has ${councilOverflow}px horizontal overflow at 1280×720.`);
    await page.keyboard.press("Tab");
    expect(await page.locator(":focus").count() === 1, "Keyboard focus is not visible in the document.");
    evidence.push(await screenshot("fr-010-council-1280x720"));
    await page.locator('[data-domain="household"]').click();
    await page.getByRole("region", { name: "The Household Solar" }).waitFor();
    const householdOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(householdOverflow <= 1, `Household has ${householdOverflow}px horizontal overflow at 1280×720.`);
    evidence.push(await screenshot("fr-010-household-1280x720"));
  });

  await scenario("FR-011", "Renderer error and warning gate", async (evidence) => {
    const unexpected = rendererEvents.filter((event) =>
      !(/Failed to load resource/.test(event.text) && event.type === "error") &&
      !/DevTools/.test(event.text) &&
      !(event.type === "http" && event.status === 403 && /t0h_not_the_player_house/.test(event.resource_url ?? "")),
    );
    const eventPath = path.join(artifactRoot, "renderer-events.json");
    writeJson(eventPath, rendererEvents);
    evidence.push(path.relative(root, eventPath));
    expect(unexpected.length === 0, `Unexpected renderer events: ${unexpected.map((event) => event.text).join(" | ")}`);
  });
} finally {
  if (app) await app.close().catch(() => undefined);
  if (!keepProfile && !valueAfter("--profile")) fs.rmSync(profilePath, { recursive: true, force: true });
}

const report = {
  schema_version: config.schema_version,
  release_name: config.release_name,
  run_id: runId,
  executed_at: new Date().toISOString(),
  app_bundle: appBundle,
  executable_path: executablePath,
  config_path: path.relative(root, configPath),
  platform: `${process.platform}-${process.arch}`,
  result: results.some((item) => item.status === "fail") ? "fail" : "pass",
  counts: {
    passed: results.filter((item) => item.status === "pass").length,
    failed: results.filter((item) => item.status === "fail").length,
    total: results.length,
  },
  scenarios: results,
};
writeJson(path.join(artifactRoot, "report.json"), report);
console.log(`\nDesktop UAT ${report.result.toUpperCase()}: ${report.counts.passed}/${report.counts.total} passed`);
console.log(`Report: ${path.join(artifactRoot, "report.json")}`);
process.exitCode = report.result === "pass" ? 0 : 1;
