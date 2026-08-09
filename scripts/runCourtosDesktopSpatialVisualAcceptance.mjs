import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { _electron as electron } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(path.join(root, "qa/desktop/first-release-uat.v1.json"), "utf8"));
const developmentMode = argv.includes("--dev");
const appBundle = developmentMode
  ? path.join(root, "desktop/node_modules/electron/dist/Electron.app")
  : path.resolve(valueAfter("--app") ?? process.env.COURTOS_DESKTOP_APP ?? config.installed_app);
const executablePath = appBundle.endsWith(".app")
  ? path.join(appBundle, "Contents", "MacOS", developmentMode ? "Electron" : "Merecross")
  : appBundle;
const runId = valueAfter("--run-id") ?? new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const artifactRoot = path.resolve(root, valueAfter("--artifacts") ?? `qa_artifacts/courtos_desktop_spatial/${runId}`);
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), "merecross-spatial-acceptance-"));
const requiredRoadcoteFabric = [
  "estate-core",
  "working-yard",
  "storage",
  "livestock-yard",
  "stables",
  "field-system",
  "commons",
  "pasture",
  "woodland",
  "fortification-works",
];

function valueAfter(flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function visible(locator) {
  return locator.count().then(async (count) => count > 0 && locator.first().isVisible()).catch(() => false);
}

async function rendererDocument(page) {
  for (const frame of page.frames()) {
    const scene = frame.locator("[data-courtos-spatial-scene]");
    if (await visible(scene)) return { frame, scene: scene.first() };
  }
  const outer = page.locator("[data-courtos-spatial-scene]");
  if (await visible(outer)) return { frame: page.mainFrame(), scene: outer.first() };
  throw new Error("No visible [data-courtos-spatial-scene] acceptance surface was found.");
}

async function assertThreeDimensionalScene(page, expectedLevel) {
  const diagnostic = page.locator(".uat-spatial-native-canvas");
  expect(!(await visible(diagnostic)), "Flat SVG diagnostic .uat-spatial-native-canvas is visible in the packaged player.");

  const { frame, scene } = await rendererDocument(page);
  const level = await scene.getAttribute("data-spatial-level");
  expect(level === expectedLevel, `Expected ${expectedLevel} spatial level, received ${level ?? "no level telemetry"}.`);
  expect(
    (await scene.getAttribute("data-camera-projection")) === "perspective",
    `${expectedLevel}: camera must report data-camera-projection=\"perspective\".`,
  );
  const perspective = Number(await scene.getAttribute("data-camera-perspective-deg"));
  expect(Number.isFinite(perspective) && perspective > 0 && perspective < 180, `${expectedLevel}: camera perspective is not nonzero and finite.`);
  const relief = Number(await scene.getAttribute("data-terrain-relief"));
  expect(Number.isFinite(relief) && relief > 0, `${expectedLevel}: terrain relief must be nonzero.`);

  const canvas = scene.locator("canvas").first();
  expect(await visible(canvas), `${expectedLevel}: no visible renderer canvas exists.`);
  const webgl = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) return { live: false, width: 0, height: 0 };
    const context = element.getContext("webgl2") ?? element.getContext("webgl");
    return {
      live: Boolean(context && !context.isContextLost()),
      width: element.width,
      height: element.height,
    };
  });
  expect(webgl.live, `${expectedLevel}: visible canvas has no live WebGL context.`);
  expect(webgl.width > 1 && webgl.height > 1, `${expectedLevel}: WebGL drawing buffer has zero area.`);

  const polygons = scene.locator("svg polygon");
  expect(await polygons.count() === 0, `${expectedLevel}: scene still contains flat SVG polygon geometry.`);
  return { frame, scene, perspective, relief, webgl };
}

async function waitForLevel(page, level) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (await visible(frame.locator(
        `[data-courtos-spatial-scene][data-spatial-level="${level}"][data-spatial-transitioning="false"]`,
      ))) return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`Timed out waiting for renderer telemetry at ${level} scale.`);
}

expect(process.platform === "darwin", "The packaged spatial acceptance runner currently targets macOS.");
expect(fs.existsSync(executablePath), `Desktop executable not found: ${executablePath}`);
fs.mkdirSync(artifactRoot, { recursive: true });

let app;
let page;
const evidence = { appBundle, executablePath, developmentMode, levels: {}, timingsMs: {}, roadcoteFabric: [] };

try {
  app = await electron.launch({
    executablePath,
    args: [
      ...(developmentMode ? [path.join(root, "desktop")] : []),
      `--user-data-dir=${profilePath}`,
    ],
    timeout: 90_000,
  });
  page = await app.firstWindow({ timeout: 90_000 });
  page.setDefaultTimeout(45_000);
  await page.goto("merecross://app/courtos-home.html?place=domain&domain=estate_holdings", { waitUntil: "domcontentloaded" });
  const estate = page.getByRole("region", { name: "Estate and Holdings" });
  await estate.waitFor({ state: "visible" });
  const roadcote = estate.locator(".uat-spatial-manor-list button").filter({ hasText: "Roadcote Court" });
  expect(await roadcote.count() === 1, "Roadcote Court is not uniquely selectable in the estate portfolio.");
  const realmStarted = performance.now();
  await roadcote.click();

  await waitForLevel(page, "realm");
  evidence.timingsMs.realmCold = Number((performance.now() - realmStarted).toFixed(1));
  evidence.levels.realm = await assertThreeDimensionalScene(page, "realm");
  const persistentCanvas = await evidence.levels.realm.scene.locator("canvas").first().elementHandle();
  await page.screenshot({ path: path.join(artifactRoot, "realm.png") });

  const countyButton = estate.getByRole("button", { name: "County", exact: true });
  expect(await countyButton.isEnabled(), "Roadcote County scale is unavailable; realm/county/manor continuity is broken.");
  const countyStarted = performance.now();
  await countyButton.click();
  expect(await persistentCanvas.evaluate((element) => element.isConnected), "Realm canvas was removed during County descent.");
  await waitForLevel(page, "county");
  evidence.timingsMs.realmToCounty = Number((performance.now() - countyStarted).toFixed(1));
  evidence.levels.county = await assertThreeDimensionalScene(page, "county");
  await page.screenshot({ path: path.join(artifactRoot, "county.png") });

  const manorButton = estate.getByRole("button", { name: "Manor", exact: true });
  expect(await manorButton.isEnabled(), "Roadcote Manor scale is unavailable; realm/county/manor continuity is broken.");
  const manorStarted = performance.now();
  await manorButton.click();
  expect(await persistentCanvas.evaluate((element) => element.isConnected), "County canvas was removed during Manor descent.");
  await waitForLevel(page, "manor");
  evidence.timingsMs.countyToManor = Number((performance.now() - manorStarted).toFixed(1));
  const manorScene = await assertThreeDimensionalScene(page, "manor");
  evidence.levels.manor = manorScene;

  const manorName = await manorScene.scene.getAttribute("data-manor-name");
  expect(manorName === "Roadcote Court", `Manor descent lost Roadcote continuity (received ${manorName ?? "no manor name"}).`);
  const estateParentCount = Number(await manorScene.scene.getAttribute("data-estate-parent-count"));
  expect(estateParentCount === 9, `Roadcote Manor must render its whole 9-parent admitted estate, not a single 217-cell seat island (received ${estateParentCount || "no estate extent"}).`);
  const contextParentCount = Number(await manorScene.scene.getAttribute("data-context-parent-count"));
  const totalExportCellCount = Number(await manorScene.scene.getAttribute("data-total-export-cell-count"));
  expect(contextParentCount === 23, `Roadcote export provenance must retain 23 context parents separately from its 9 estate parents.`);
  expect(totalExportCellCount === 4_991, `Roadcote export provenance must retain the 4,991-cell total separately from rendered estate extent.`);
  const fabric = (await manorScene.scene.getAttribute("data-manor-fabric") ?? "").split(/\s+/).filter(Boolean);
  for (const marker of requiredRoadcoteFabric) {
    expect(fabric.includes(marker), `Roadcote 3D scene does not report rendered manor-fabric marker: ${marker}.`);
  }
  evidence.roadcoteFabric = fabric;
  evidence.roadcoteExtent = { estateParentCount, contextParentCount, totalExportCellCount };
  await page.screenshot({ path: path.join(artifactRoot, "roadcote-manor.png") });

  const countyRepeatStarted = performance.now();
  await countyButton.click();
  await waitForLevel(page, "county");
  evidence.timingsMs.manorToCountyWarm = Number((performance.now() - countyRepeatStarted).toFixed(1));
  const manorRepeatStarted = performance.now();
  await manorButton.click();
  await waitForLevel(page, "manor");
  evidence.timingsMs.countyToManorWarm = Number((performance.now() - manorRepeatStarted).toFixed(1));

  fs.writeFileSync(path.join(artifactRoot, "acceptance.json"), `${JSON.stringify(evidence, (key, value) => {
    if (key === "frame" || key === "scene") return undefined;
    return value;
  }, 2)}\n`);
  console.log(`PASS CourtOS packaged spatial visual acceptance (${artifactRoot})`);
} catch (error) {
  if (page) await page.screenshot({ path: path.join(artifactRoot, "failure.png"), fullPage: true }).catch(() => {});
  console.error(`FAIL CourtOS packaged spatial visual acceptance: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (app) await app.close().catch(() => {});
  fs.rmSync(profilePath, { recursive: true, force: true });
}
