import fs from "node:fs";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const argv = process.argv.slice(2);

function valueAfter(flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function boundedNumber(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

const dryRun = argv.includes("--dry-run");
const skipEngineering = argv.includes("--skip-engineering");
const suppliedBaseUrl = valueAfter("--base-url");
const suppliedMapGenBaseUrl = valueAfter("--mapgen-base-url") ?? process.env.COURTOS_UAT_MAPGEN_BASE_URL;
const mapgenRoot = path.resolve(process.env.MAPGEN_ROOT ?? path.join(root, "..", "lotm-mapgen"));
const runId = valueAfter("--run-id") ?? `courtos-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const config = JSON.parse(fs.readFileSync(path.resolve(root, "qa/uat/uat.config.json"), "utf8"));
const scenarioCatalog = JSON.parse(
  fs.readFileSync(path.resolve(root, config.scenarioCatalog), "utf8"),
);
const artifactDir = path.resolve(root, config.artifactRoot, runId);

function assertRuntimeInputMaterialized(absolutePath, label) {
  if (process.platform !== "darwin") return;
  const result = spawnSync("stat", ["-f", "%Sf", absolutePath], { encoding: "utf8", timeout: 2_000 });
  if (result.status === 0 && result.stdout.toLowerCase().includes("dataless")) {
    throw new Error(`${label} is cloud-placeholder-only and must be materialized before UAT: ${absolutePath}`);
  }
}

function runtimeInputManifest() {
  const verifier = spawnSync("node", ["scripts/verifyCourtosTrackedInputs.mjs", "--json"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (verifier.status !== 0) {
    throw new Error(`CourtOS clean-checkout gate failed: ${verifier.stderr || verifier.stdout}`);
  }
  const trackedReport = JSON.parse(verifier.stdout);
  const generatedFiles = trackedReport.generatedArtifacts
    .map((artifact) => artifact.path)
    .filter((relativePath) => fs.existsSync(path.resolve(root, relativePath)));
  const files = [...new Set([...trackedReport.requiredTrackedInputs, ...generatedFiles])].sort();

  const hash = crypto.createHash("sha256");
  const fileHashes = {};
  for (const relativePath of files.sort()) {
    if (process.env.COURTOS_UAT_MANIFEST_DEBUG === "1") console.error(`[manifest] CourtOS ${relativePath}`);
    assertRuntimeInputMaterialized(path.resolve(root, relativePath), "CourtOS runtime input");
    const digestResult = spawnSync("shasum", ["-a", "256", path.resolve(root, relativePath)], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
    });
    if (digestResult.status !== 0 || !digestResult.stdout.trim()) {
      throw new Error(`CourtOS runtime input could not be hashed: ${relativePath}`);
    }
    const digest = digestResult.stdout.trim().split(/\s+/)[0];
    fileHashes[relativePath] = digest;
    hash.update(relativePath);
    hash.update("\0");
    hash.update(digest);
    hash.update("\0");
  }

  return { contentHash: hash.digest("hex"), files, fileHashes, untrackedInputs: [] };
}

function mapgenRuntimeInputManifest() {
  // Hash the exact executable/data/config/art seam used by the three CourtOS renderers.
  // Runtime art must be present, not merely described by an asset manifest; unrelated
  // MapGen experiments remain outside the build identity.
  const roots = [
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "public/courtos-cartography-theme.v1.js",
    "public/courtos-embedded-adapter.v1.js",
    "public/merecross-3d-prototype.html",
    "public/merecross-3d-prototype-data.js",
    "public/realm-zoom-composition-data.js",
    "public/shared-water-texture.js",
    "public/shared-land-composition.js",
    "public/orchardmere-county-viewer.html",
    "public/orchardmere-county-viewer.js",
    "public/orchardmere-county-viewer-data.js",
    "public/orchardmere-composition-surface-data.js",
    "public/pearwick-estate-pilot.html",
    "public/pearwick-estate-pilot-3d.js",
    "public/pearwick-estate-pilot-data.js",
    "public/pearwick-single-hex-assets.js",
    "public/pearwick-road-geometry.js",
    "public/vendor/three",
    "assets/microhex_art/v2_2/merecross_trunk_road_straight_edge_clean_v2_2.png",
    "public/assets/manor-pilot-v1",
    "public/assets/manor-pilot-v2",
    "public/assets/landscape-composition",
    "public/assets/pearwick/2p5d-poc-v1",
    "public/assets/pearwick/environment-v1",
    "public/assets/pearwick/hybrid-v1",
    "public/assets/pearwick/vegetation",
    "qa_artifacts/V07-PEARWICK-MICROHEX-PILOT-001/pearwick_microhex_pilot_v1.json",
  ];
  if (!fs.existsSync(mapgenRoot)) {
    throw new Error(
      `MapGen repository is unavailable at ${mapgenRoot}. Set MAPGEN_ROOT to the exact renderer source used by this UAT candidate.`,
    );
  }
  const files = [];
  const visit = (relativePath) => {
    const absolutePath = path.resolve(mapgenRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Required MapGen runtime input is missing: ${absolutePath}`);
    }
    assertRuntimeInputMaterialized(absolutePath, "MapGen runtime input");
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolutePath).sort()) visit(path.join(relativePath, entry));
      return;
    }
    if (stat.isFile() && !relativePath.endsWith(".DS_Store")) files.push(relativePath.split(path.sep).join("/"));
  };
  for (const relativePath of roots) visit(relativePath);

  const hash = crypto.createHash("sha256");
  const fileHashes = {};
  for (const relativePath of files.sort()) {
    const absolutePath = path.resolve(mapgenRoot, relativePath);
    const digestResult = spawnSync("shasum", ["-a", "256", absolutePath], {
      cwd: mapgenRoot,
      encoding: "utf8",
      timeout: 10_000,
    });
    if (digestResult.status !== 0 || !digestResult.stdout.trim()) {
      throw new Error(`MapGen runtime input could not be hashed: ${relativePath}`);
    }
    const digest = digestResult.stdout.trim().split(/\s+/)[0];
    fileHashes[relativePath] = digest;
    hash.update(relativePath);
    hash.update("\0");
    hash.update(digest);
    hash.update("\0");
  }
  const trackedResult = spawnSync("git", ["ls-files", "-z", "--", ...roots], {
    cwd: mapgenRoot,
    encoding: "utf8",
    timeout: 15_000
  });
  const tracked = new Set(trackedResult.status === 0 ? trackedResult.stdout.split("\0").filter(Boolean) : []);
  return {
    repositoryRoot: mapgenRoot,
    contentHash: hash.digest("hex"),
    files,
    fileHashes,
    untrackedInputs: files.filter((file) => !tracked.has(file))
  };
}

function gitBuildId(manifest, mapgenManifest) {
  const result = spawnSync("git", ["rev-parse", "--short=12", "HEAD"], { cwd: root, encoding: "utf8" });
  if (result.status === 0 && result.stdout.trim()) {
    return `${result.stdout.trim()}+courtos.${manifest.contentHash.slice(0, 12)}.mapgen.${mapgenManifest.contentHash.slice(0, 12)}`;
  }
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(root, "package.json"), "utf8"));
  return `package-${packageJson.version ?? "unknown"}+courtos.${manifest.contentHash.slice(0, 12)}.mapgen.${mapgenManifest.contentHash.slice(0, 12)}`;
}

function runSync(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: process.env, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}.`);
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForRuntime(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || (response.status >= 300 && response.status < 400)) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Runtime did not become ready at ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function readPrompt(relativePath, envelope) {
  return `${fs.readFileSync(path.resolve(root, relativePath), "utf8")}\n\n## Run envelope\n\n${JSON.stringify(envelope, null, 2)}\n`;
}

function personaPrompt(lane, envelope) {
  const scenarios = scenarioCatalog.scenarios.filter((scenario) => scenario.lane === lane.id);
  return `${fs.readFileSync(path.resolve(root, lane.persona), "utf8")}

## Execution contract

You are one bounded, independent, read-only persona lane. Do not edit repository source.
Test only the assigned scenarios against the exact runtime and build below. For visual and
interaction evidence, use this repository-owned browser driver:

node scripts/runCourtosUatBrowser.mjs --url <runtime-url> --actions-json '<json-array>' --screenshot evidence/${lane.id}/screen.png --output evidence/${lane.id}/screen.json

Supported actions are click, fill, press, select, waitFor, and wait. Prefer semantic locators
such as role/name, label, placeholder, or text. Evidence paths are relative to the supplied
report artifact directory. You may use curl and read repository/read-model source to establish
truth, but browser evidence is required for interaction or presentation conclusions.

Return one laneResults entry named ${lane.id}. First-pass P0/P1 findings must use status
"unverified" and independentlyVerified false; the separate verifier decides whether they block.
Return only JSON conforming to the UAT report schema.

## Assigned scenarios

${JSON.stringify(scenarios, null, 2)}

## Run envelope

${JSON.stringify(envelope, null, 2)}
`;
}

async function runBounded(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function consume() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => consume()),
  );
  return results;
}

function runCodexLane({ name, prompt, schemaPath, outputPath }) {
  const eventPath = path.join(artifactDir, `${name}.events.jsonl`);
  const errorPath = path.join(artifactDir, `${name}.stderr.log`);
  const laneTempDir = path.join(artifactDir, "agent-tmp", name);
  fs.mkdirSync(laneTempDir, { recursive: true });
  const timeoutMs = Number(process.env.COURTOS_UAT_AGENT_TIMEOUT_MS ?? 2_700_000);

  return new Promise((resolve) => {
    const child = spawn(
      "codex",
      [
        "exec",
        "--ephemeral",
        "--ignore-user-config",
        "--ignore-rules",
        "--config",
        'default_permissions="courtos-uat-readonly"',
        "--config",
        'permissions.courtos-uat-readonly.extends=":read-only"',
        "--config",
        "permissions.courtos-uat-readonly.network.enabled=true",
        "--config",
        'permissions.courtos-uat-readonly.network.domains={ "127.0.0.1" = "allow", "localhost" = "allow" }',
        "--config",
        "features.network_proxy.enabled=true",
        "--config",
        'permissions.courtos-uat-readonly.filesystem.:tmpdir="write"',
        "--config",
        'permissions.courtos-uat-readonly.filesystem.:slash_tmp="write"',
        "--config",
        `permissions.courtos-uat-readonly.filesystem.${artifactDir}="write"`,
        "--json",
        "--output-schema",
        path.resolve(root, schemaPath),
        "--output-last-message",
        outputPath,
        "--cd",
        root,
        "-"
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          TMPDIR: laneTempDir,
          COURTOS_UAT_ARTIFACT_DIR: artifactDir,
          COURTOS_UAT_BROWSER_TEMP_DIR: path.join(laneTempDir, "browser"),
          COURTOS_UAT_BROWSER_BROKER_URL: browserBrokerUrl,
          COURTOS_UAT_BROWSER_BROKER_TOKEN: browserBrokerToken,
        },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    const eventStream = fs.createWriteStream(eventPath);
    const errorStream = fs.createWriteStream(errorPath);
    child.stdout.pipe(eventStream);
    child.stderr.pipe(errorStream);
    child.stdin.end(prompt);

    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.once("close", (code) => {
      clearTimeout(timer);
      eventStream.end();
      errorStream.end();
      resolve({ name, code: code ?? 1, outputPath, eventPath, errorPath });
    });
  });
}

function parseReport(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  const normalized = raw.startsWith("```")
    ? raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : raw;
  return JSON.parse(normalized);
}

function requiredLaneIds() {
  return config.lanes.filter((lane) => lane.required).map((lane) => lane.id);
}

function computePromotion({ engineering, uat, architecture, buildId }) {
  const blockers = [
    ...uat.findings
      .filter((finding) => ["P0", "P1"].includes(finding.severity) && finding.status === "verified")
      .map((finding) => finding.id),
    ...architecture.findings.filter((finding) => ["P0", "P1"].includes(finding.severity)).map((finding) => finding.id)
  ];
  const returnedLanes = new Set(uat.laneResults.filter((lane) => lane.status !== "incomplete").map((lane) => lane.lane));
  const allRequiredLanes = requiredLaneIds().every((laneId) => returnedLanes.has(laneId));
  const promoted =
    engineering === "pass" &&
    uat.verdict === "pass" &&
    architecture.verdict === "pass" &&
    allRequiredLanes &&
    blockers.length === 0;

  return {
    runId,
    buildId,
    createdAt: new Date().toISOString(),
    engineering,
    uat: uat.verdict,
    architecture: architecture.verdict,
    blockingFindingIds: [...new Set(blockers)],
    promotedToHumanPlaytest: promoted
  };
}

if (dryRun) {
  const runtimeInputs = runtimeInputManifest();
  const mapgenRuntimeInputs = mapgenRuntimeInputManifest();
  const buildId = gitBuildId(runtimeInputs, mapgenRuntimeInputs);
  runSync("node", ["scripts/validateCourtosUatConfig.mjs"]);
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        runId,
        buildId,
        engineeringGate: skipEngineering ? "skipped by explicit flag" : "node scripts/runCourtosEngineeringQa.mjs",
        runtime: suppliedBaseUrl ?? "built Vite preview on an available local port",
        mapgenRuntime: suppliedMapGenBaseUrl ?? `managed preview from ${mapgenRoot}`,
        parallelIndependentLanes: ["persona_swarm", "production_architecture"],
        verificationLane: "independent_verifier_after_persona_reports",
        adjudicationLane: "uat_orchestrator_after_verification",
        personaLanes: requiredLaneIds(),
        scenarioCount: JSON.parse(fs.readFileSync(path.resolve(root, config.scenarioCatalog), "utf8")).scenarios.length,
        runtimeInputCount: runtimeInputs.files.length,
        untrackedRuntimeInputCount: runtimeInputs.untrackedInputs.length,
        mapgenRuntimeInputCount: mapgenRuntimeInputs.files.length,
        untrackedMapgenRuntimeInputCount: mapgenRuntimeInputs.untrackedInputs.length,
        artifactDir
      },
      null,
      2
    )
  );
  process.exit(0);
}

fs.mkdirSync(artifactDir, { recursive: true });
let preview;
let mapgenPreview;
let browserBroker;
let browserBrokerUrl;
let browserBrokerToken;
let engineering = skipEngineering ? "skipped" : "fail";
let runtimeInputs = null;
let mapgenRuntimeInputs = null;
let buildId = "unresolved";

try {
  let mapgenBaseUrl = suppliedMapGenBaseUrl;
  if (!mapgenBaseUrl) {
    if (!fs.existsSync(path.join(mapgenRoot, "node_modules/vite/bin/vite.js"))) {
      throw new Error(`MapGen runtime dependencies are unavailable at ${mapgenRoot}. Supply --mapgen-base-url or MAPGEN_ROOT.`);
    }
    runSync("node", ["node_modules/vite/bin/vite.js", "build"], { cwd: mapgenRoot });
    const mapgenPort = await availablePort();
    mapgenBaseUrl = `http://127.0.0.1:${mapgenPort}`;
    mapgenPreview = spawn(
      "node",
      ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(mapgenPort), "--strictPort"],
      {
        cwd: mapgenRoot,
        env: process.env,
        stdio: ["ignore", fs.openSync(path.join(artifactDir, "mapgen-preview.stdout.log"), "a"), fs.openSync(path.join(artifactDir, "mapgen-preview.stderr.log"), "a")]
      }
    );
  }
  await waitForRuntime(new URL("/merecross-3d-prototype.html", mapgenBaseUrl).toString());
  const runtimeEnvironment = {
    ...process.env,
    MAPGEN_ROOT: mapgenRoot,
    VITE_MAPGEN_BASE_URL: mapgenBaseUrl,
  };
  if (!skipEngineering) {
    runSync("node", ["scripts/runCourtosEngineeringQa.mjs"], {
      env: { ...runtimeEnvironment, COURTOS_UAT_RUN_DIR: artifactDir }
    });
    engineering = "pass";
  } else {
    runSync("node", ["scripts/validateCourtosUatConfig.mjs"]);
  }

  // Engineering QA may regenerate the spatial projection. Build identity must
  // be computed from the exact bytes that the preview and agent lanes receive.
  runtimeInputs = runtimeInputManifest();
  mapgenRuntimeInputs = mapgenRuntimeInputManifest();
  buildId = gitBuildId(runtimeInputs, mapgenRuntimeInputs);
  if (runtimeInputs.untrackedInputs.length > 0) {
    throw new Error(
      `CourtOS clean-checkout gate failed: ${runtimeInputs.untrackedInputs.length} runtime inputs are not tracked.`,
    );
  }
  if (mapgenRuntimeInputs.untrackedInputs.length > 0) {
    throw new Error(
      `MapGen clean-checkout gate failed: ${mapgenRuntimeInputs.untrackedInputs.length} runtime inputs are not tracked.`,
    );
  }
  fs.writeFileSync(
    path.join(artifactDir, "run-manifest.json"),
    JSON.stringify({
      runId,
      buildId,
      startedAt: new Date().toISOString(),
      suppliedBaseUrl: suppliedBaseUrl ?? null,
      suppliedMapGenBaseUrl: suppliedMapGenBaseUrl ?? null,
      runtimeInputs,
      mapgenRuntimeInputs,
    }, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(artifactDir, "runtime-configuration.json"),
    JSON.stringify({
      mapgenBaseUrl,
      mapgenMode: suppliedMapGenBaseUrl ? "supplied" : "managed_preview",
      mapgenContentHash: mapgenRuntimeInputs.contentHash,
      mapgenRuntimeInputCount: mapgenRuntimeInputs.files.length,
      untrackedMapgenRuntimeInputCount: mapgenRuntimeInputs.untrackedInputs.length,
    }, null, 2) + "\n",
  );

  let runtimeUrl = suppliedBaseUrl;
  if (!runtimeUrl) {
    const port = await availablePort();
    runtimeUrl = `http://127.0.0.1:${port}${config.runtimeEntry}`;
    preview = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
      cwd: root,
      env: runtimeEnvironment,
      stdio: ["ignore", fs.openSync(path.join(artifactDir, "preview.stdout.log"), "a"), fs.openSync(path.join(artifactDir, "preview.stderr.log"), "a")]
    });
  }
  await waitForRuntime(runtimeUrl);

  const browserBrokerPort = await availablePort();
  browserBrokerUrl = `http://127.0.0.1:${browserBrokerPort}/probe`;
  browserBrokerToken = crypto.randomBytes(32).toString("hex");
  browserBroker = spawn(
    "node",
    ["scripts/runCourtosUatBrowserBroker.mjs", "--host", "127.0.0.1", "--port", String(browserBrokerPort)],
    {
      cwd: root,
      env: {
        ...process.env,
        COURTOS_UAT_ARTIFACT_DIR: artifactDir,
        COURTOS_UAT_BROWSER_BROKER_TOKEN: browserBrokerToken,
      },
      stdio: [
        "ignore",
        fs.openSync(path.join(artifactDir, "browser-broker.stdout.log"), "a"),
        fs.openSync(path.join(artifactDir, "browser-broker.stderr.log"), "a"),
      ],
    },
  );
  await waitForRuntime(`http://127.0.0.1:${browserBrokerPort}/health`);

  const envelope = {
    runId,
    buildId,
    runtimeUrl,
    mapgenBaseUrl,
    mapgenBuildId: mapgenRuntimeInputs.contentHash,
    repositoryRoot: root,
    configPath: "qa/uat/uat.config.json",
    scenarioCatalog: config.scenarioCatalog,
    requiredPersonaLanes: requiredLaneIds(),
    reportArtifactDirectory: artifactDir,
    repositoryMutationAllowed: false
  };

  const uatOutput = path.join(artifactDir, "uat-report.json");
  const architectureOutput = path.join(artifactDir, "architecture-report.json");
  const architecturePromise = runCodexLane({
    name: "production-architecture",
    prompt: readPrompt("qa/uat/prompts/architecture-review.md", envelope),
    schemaPath: config.architectureSchema,
    outputPath: architectureOutput,
  });
  console.log(
    `[internal-uat] Running ${config.lanes.length} persona agents and Production Architecture Review in parallel for ${runtimeUrl}`,
  );
  const personaConcurrency = boundedNumber(
    process.env.COURTOS_UAT_PERSONA_CONCURRENCY,
    3,
    1,
    config.lanes.length,
  );
  const personaRuns = await runBounded(
    config.lanes,
    personaConcurrency,
    async (lane) => {
      const outputPath = path.join(artifactDir, `persona-${lane.id}.json`);
      return runCodexLane({
        name: `persona-${lane.id}`,
        prompt: personaPrompt(lane, envelope),
        schemaPath: config.reportSchema,
        outputPath,
      });
    },
  );
  const failedPersonaRuns = personaRuns.filter((run) => run.code !== 0);
  if (failedPersonaRuns.length > 0) {
    await architecturePromise;
    throw new Error(
      `Persona agent failure: ${failedPersonaRuns.map((run) => `${run.name}=${run.code}`).join(", ")}. Inspect ${artifactDir}.`,
    );
  }

  const personaReports = personaRuns.map((run) => ({
    path: run.outputPath,
    report: parseReport(run.outputPath),
  }));
  const verificationCandidates = personaReports.flatMap(({ report }) =>
    report.findings.filter(
      (finding) =>
        ["P0", "P1"].includes(finding.severity) ||
        (finding.severity === "P2" && (finding.requiresHumanJudgment || !finding.reproducible)),
    ),
  );
  const verifierOutput = path.join(artifactDir, "independent-verifier.json");
  let verifierRun = { name: "independent-verifier", code: 0, outputPath: verifierOutput };
  if (verificationCandidates.length > 0) {
    console.log(
      `[internal-uat] Independently verifying ${verificationCandidates.length} candidate blocking/intermittent finding(s).`,
    );
    verifierRun = await runCodexLane({
      name: "independent-verifier",
      prompt: readPrompt("qa/uat/prompts/verifier.md", {
        ...envelope,
        personaReportPaths: personaReports.map(({ path: reportPath }) => reportPath),
        verificationCandidates,
      }),
      schemaPath: config.reportSchema,
      outputPath: verifierOutput,
    });
  } else {
    fs.writeFileSync(
      verifierOutput,
      JSON.stringify(
        {
          runId,
          buildId,
          runtimeUrl,
          verdict: "pass",
          summary: "No P0/P1 or intermittent/subjective P2 findings required independent replay.",
          laneResults: [
            {
              lane: "independent_verifier",
              status: "pass",
              scenarioIds: [],
              evidenceSummary: "No candidate findings were submitted for verification.",
            },
          ],
          findings: [],
        },
        null,
        2,
      ) + "\n",
    );
  }
  if (verifierRun.code !== 0) {
    await architecturePromise;
    throw new Error(`Independent verifier failure: ${verifierRun.code}. Inspect ${artifactDir}.`);
  }

  console.log("[internal-uat] Adjudicating persona and verifier reports.");
  const uatRun = await runCodexLane({
    name: "uat-orchestrator",
    prompt: readPrompt("qa/uat/prompts/orchestrator.md", {
      ...envelope,
      personaReportPaths: personaReports.map(({ path: reportPath }) => reportPath),
      verifierReportPath: verifierOutput,
    }),
    schemaPath: config.reportSchema,
    outputPath: uatOutput,
  });
  const architectureRun = await architecturePromise;
  if (uatRun.code !== 0 || architectureRun.code !== 0) {
    throw new Error(
      `Agent lane failure: UAT=${uatRun.code}, architecture=${architectureRun.code}. Inspect ${artifactDir}.`,
    );
  }

  const uat = parseReport(uatOutput);
  const architecture = parseReport(architectureOutput);
  const promotion = computePromotion({ engineering, uat, architecture, buildId });
  fs.writeFileSync(path.join(artifactDir, "promotion-report.json"), JSON.stringify(promotion, null, 2) + "\n");

  console.log(JSON.stringify(promotion, null, 2));
  process.exitCode = promotion.promotedToHumanPlaytest ? 0 : 2;
} catch (error) {
  const failure = {
    runId,
    buildId,
    createdAt: new Date().toISOString(),
    engineering,
    uat: "incomplete",
    architecture: "incomplete",
    blockingFindingIds: ["INTERNAL_UAT_EXECUTION_FAILURE"],
    promotedToHumanPlaytest: false,
    error: error instanceof Error ? error.message : String(error)
  };
  fs.writeFileSync(path.join(artifactDir, "execution-failure.json"), JSON.stringify(failure, null, 2) + "\n");
  console.error(failure.error);
  process.exitCode = 1;
} finally {
  if (preview && !preview.killed) preview.kill("SIGTERM");
  if (mapgenPreview && !mapgenPreview.killed) mapgenPreview.kill("SIGTERM");
  if (browserBroker && !browserBroker.killed) browserBroker.kill("SIGTERM");
}
