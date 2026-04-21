import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function relpath(p) {
  return path.relative(process.cwd(), p).split(path.sep).join("/");
}

function readJsonIfPresent(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

export function sanitizeQaVersion(appVersion) {
  const value = String(appVersion || "unknown").trim();
  return (value || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
}

export function resolveQaGateVersion(repoRoot = process.cwd()) {
  const buildInfo = readJsonIfPresent(path.join(repoRoot, "docs", "BUILD_INFO.json"));
  return String(buildInfo?.app_version || "unknown");
}

export function qaEvidencePaths(appVersion, repoRoot = process.cwd()) {
  const version = sanitizeQaVersion(appVersion);
  const qaArtifacts = path.join(repoRoot, "qa_artifacts");
  return {
    legacyUat: path.join(qaArtifacts, "uat_gate.json"),
    legacyVitest: path.join(qaArtifacts, "vitest.json"),
    summary: path.join(qaArtifacts, `${version}_qa.json`),
    uat: path.join(qaArtifacts, `${version}_uat_gate.json`),
    vitest: path.join(qaArtifacts, `${version}_vitest.json`)
  };
}

function writeJson(p, payload) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, `${JSON.stringify(payload, null, 2)}\n`);
}

function copyIfPresent(from, to) {
  if (!fs.existsSync(from)) return false;
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  return true;
}

function unlinkIfPresent(p) {
  try {
    fs.unlinkSync(p);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function buildStartedReport(appVersion, paths) {
  return {
    gate: "qa_gate_v1",
    app_version: appVersion,
    started_at: new Date().toISOString(),
    completed_at: null,
    ok: false,
    status: "running",
    evidence: {
      summary_relpath: relpath(paths.summary),
      uat_gate_relpath: relpath(paths.uat),
      vitest_relpath: relpath(paths.vitest)
    },
    legacy_paths_refreshed: {
      uat_gate_relpath: relpath(paths.legacyUat),
      vitest_relpath: relpath(paths.legacyVitest)
    },
    vitest: null,
    uat_gate: null
  };
}

function finalizeReport(report, paths, status, extra = {}) {
  const next = {
    ...report,
    ...extra,
    completed_at: new Date().toISOString(),
    ok: status === "pass",
    status
  };
  writeJson(paths.summary, next);
  return next;
}

function run(cmd, args) {
  return spawnSync(cmd, args, { stdio: "inherit" });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseVitestResult(vitestPath) {
  const payload = readJsonIfPresent(vitestPath);
  const numTotalTests = Number(payload?.numTotalTests ?? 0);
  const numFailedTests = Number(payload?.numFailedTests ?? 0);
  const numPassedTests = Number(payload?.numPassedTests ?? 0);
  const numTotalTestSuites = Number(payload?.numTotalTestSuites ?? 0);
  const numFailedTestSuites = Number(payload?.numFailedTestSuites ?? 0);
  return {
    num_failed_test_suites: numFailedTestSuites,
    num_failed_tests: numFailedTests,
    num_passed_tests: numPassedTests,
    num_total_test_suites: numTotalTestSuites,
    num_total_tests: numTotalTests,
    success: Boolean(payload?.success)
  };
}

function isSuccessfulVitestResult(vitest) {
  return Boolean(
    vitest &&
      vitest.success &&
      vitest.num_total_tests > 0 &&
      vitest.num_failed_tests === 0 &&
      vitest.num_failed_test_suites === 0
  );
}

function positiveEnvInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function terminateChild(child) {
  if (!child.pid) return;
  try {
    if (process.platform !== "win32") {
      process.kill(-child.pid, "SIGTERM");
      return;
    }
  } catch {
    // Fall through to killing just the child process.
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // The process may already have exited.
  }
}

async function runVitestWithJsonEscape(cmd, args, vitestPath) {
  const maxMs = positiveEnvInt("QA_VITEST_MAX_MS", 60 * 60 * 1000);
  const jsonGraceMs = positiveEnvInt("QA_VITEST_JSON_GRACE_MS", 5 * 1000);
  const child = spawn(cmd, args, {
    detached: process.platform !== "win32",
    stdio: "inherit"
  });

  let exitStatus = null;
  let exitSignal = null;
  const exited = new Promise((resolve) => {
    child.on("exit", (status, signal) => {
      exitStatus = status;
      exitSignal = signal;
      resolve("exit");
    });
  });

  const startedAt = Date.now();
  let successSeenAt = null;

  while (true) {
    const marker = await Promise.race([exited, sleep(1000).then(() => "tick")]);
    const vitest = fs.existsSync(vitestPath) ? parseVitestResult(vitestPath) : null;

    if (marker === "exit") {
      return {
        status: exitStatus,
        signal: exitSignal,
        vitest,
        escaped_after_success_json: false
      };
    }

    if (isSuccessfulVitestResult(vitest)) {
      if (successSeenAt === null) successSeenAt = Date.now();
      if (Date.now() - successSeenAt >= jsonGraceMs) {
        console.warn(
          `QA WARN: Vitest wrote a successful JSON report but did not exit after ${jsonGraceMs}ms; continuing with versioned evidence.`
        );
        terminateChild(child);
        await Promise.race([exited, sleep(5000)]);
        return {
          status: 0,
          signal: "JSON_SUCCESS_ESCAPE",
          vitest,
          escaped_after_success_json: true
        };
      }
    }

    if (Date.now() - startedAt >= maxMs) {
      terminateChild(child);
      await Promise.race([exited, sleep(5000)]);
      return {
        status: 124,
        signal: "QA_VITEST_MAX_MS",
        vitest,
        escaped_after_success_json: false
      };
    }
  }
}

function parseUatResult(uatPath) {
  const payload = readJsonIfPresent(uatPath);
  return {
    failed: Number(payload?.failed ?? 0),
    passed: Number(payload?.passed ?? 0),
    success: Number(payload?.failed ?? 1) === 0
  };
}

export async function main() {
  const repoRoot = process.cwd();
  const appVersion = resolveQaGateVersion(repoRoot);
  const paths = qaEvidencePaths(appVersion, repoRoot);
  ensureDir(path.join(repoRoot, "qa_artifacts"));

  let report = buildStartedReport(appVersion, paths);
  writeJson(paths.summary, report);

  const vitestBin = path.resolve("node_modules/.bin/vitest");
  const tsxBin = path.resolve("node_modules/tsx/dist/cli.mjs");

  if (fs.existsSync(vitestBin)) {
    unlinkIfPresent(paths.vitest);
    const vitestArgs = [
      "run",
      "--poolOptions.threads.minThreads=1",
      "--poolOptions.threads.maxThreads=4",
      "--reporter=default",
      "--reporter=json",
      `--outputFile.json=${paths.vitest}`
    ];
    const res = await runVitestWithJsonEscape(vitestBin, vitestArgs, paths.vitest);
    const vitest = res.vitest ?? (fs.existsSync(paths.vitest) ? parseVitestResult(paths.vitest) : null);

    if ((res.status ?? 1) !== 0) {
      finalizeReport(report, paths, "vitest_failed", {
        failure: `vitest exited with status ${res.status ?? 1}`,
        vitest
      });
      process.exit(res.status ?? 1);
    }

    if (!vitest || vitest.num_total_tests <= 0) {
      console.error("QA FAIL: Vitest discovered 0 tests.");
      finalizeReport(report, paths, "vitest_failed", {
        failure: "Vitest discovered 0 tests.",
        vitest
      });
      process.exit(1);
    }

    copyIfPresent(paths.vitest, paths.legacyVitest);
    report = finalizeReport(report, paths, "uat_running", {
      vitest,
      vitest_exit: res.escaped_after_success_json
        ? {
            escaped_after_success_json: true,
            signal: res.signal
          }
        : undefined
    });

    const uatRes = run(process.execPath, [tsxBin, path.resolve("scripts/uatGate.ts")]);
    copyIfPresent(paths.legacyUat, paths.uat);
    const uatGate = parseUatResult(paths.uat);

    if ((uatRes.status ?? 1) !== 0 || !uatGate.success) {
      finalizeReport(report, paths, "uat_failed", {
        failure: `uatGate exited with status ${uatRes.status ?? 1}`,
        uat_gate: uatGate
      });
      process.exit(uatRes.status ?? 1);
    }

    finalizeReport(report, paths, "pass", { uat_gate: uatGate });
    console.log(`QA gate passed. Evidence: ${relpath(paths.summary)}`);
    process.exit(0);
  }

  console.warn("Vitest not found (node_modules missing). Running no-deps QA gate...");
  const gate = path.resolve("scripts/qaNoDeps.mjs");
  const noDepsRes = run(process.execPath, [gate]);
  if ((noDepsRes.status ?? 1) !== 0) {
    finalizeReport(report, paths, "no_deps_failed", {
      failure: `qaNoDeps exited with status ${noDepsRes.status ?? 1}`
    });
    process.exit(noDepsRes.status ?? 1);
  }
  report = finalizeReport(report, paths, "uat_running");
  const uatRes = run(process.execPath, [tsxBin, path.resolve("scripts/uatGate.ts")]);
  copyIfPresent(paths.legacyUat, paths.uat);
  const uatGate = parseUatResult(paths.uat);
  if ((uatRes.status ?? 1) !== 0 || !uatGate.success) {
    finalizeReport(report, paths, "uat_failed", {
      failure: `uatGate exited with status ${uatRes.status ?? 1}`,
      uat_gate: uatGate
    });
    process.exit(uatRes.status ?? 1);
  }
  finalizeReport(report, paths, "pass", { uat_gate: uatGate });
  console.log(`QA gate passed. Evidence: ${relpath(paths.summary)}`);
  process.exit(0);
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
