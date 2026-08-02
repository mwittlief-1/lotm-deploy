import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.resolve(root, "qa/uat/uat.config.json");
const errors = [];
let validatedScenarioCount = 0;

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${label} is not readable JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function requireFile(relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    errors.push(`${label} must be a non-empty relative path.`);
    return null;
  }
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(root + path.sep)) {
    errors.push(`${label} escapes the repository: ${relativePath}`);
    return null;
  }
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${label} does not exist: ${relativePath}`);
    return null;
  }
  return absolutePath;
}

const config = readJson(configPath, "UAT config");
const playerContext = readJson(
  path.resolve(root, "config/courtos-player-context.v1.json"),
  "CourtOS player context",
);

if (config) {
  const humanPlaytest = config.humanPlaytest ?? {};
  const targetPlatform = config.targetPlatform ?? {};
  if (targetPlatform.name !== "Steam desktop") {
    errors.push("Phase V UAT target platform must be Steam desktop.");
  }
  if (targetPlatform.mobileInScope !== false) {
    errors.push("Phase V UAT must explicitly exclude mobile.");
  }
  if (targetPlatform.minimumViewport?.width !== 1280 || targetPlatform.minimumViewport?.height !== 720) {
    errors.push("Steam desktop minimum viewport must be 1280x720.");
  }
  if (targetPlatform.referenceViewport?.width !== 1920 || targetPlatform.referenceViewport?.height !== 1080) {
    errors.push("Steam desktop reference viewport must be 1920x1080.");
  }
  if (humanPlaytest.principal !== "local_player") {
    errors.push("Human playtest principal must be local_player for the single-player UAT runtime.");
  }
  if (humanPlaytest.entitlement !== "house_controller") {
    errors.push("Human playtest entitlement must be house_controller.");
  }
  if (typeof humanPlaytest.houseId !== "string" || !humanPlaytest.houseId.trim()) {
    errors.push("Human playtest must declare a non-empty source House id.");
  }
  if (typeof humanPlaytest.houseName !== "string" || !humanPlaytest.houseName.trim()) {
    errors.push("Human playtest must declare a non-empty source House name.");
  }
  if (typeof humanPlaytest.entry !== "string" || !humanPlaytest.entry.startsWith(config.runtimeEntry)) {
    errors.push("Human playtest entry must extend the configured CourtOS runtime entry.");
  } else {
    const entry = new URL(humanPlaytest.entry, "http://courtos.invalid");
    if (entry.searchParams.get("houseId") !== humanPlaytest.houseId) {
      errors.push("Human playtest entry House selector must match humanPlaytest.houseId.");
    }
  }
  if (playerContext) {
    if (playerContext.schema_version !== "courtos_player_context_v1") {
      errors.push("CourtOS player context schema must be courtos_player_context_v1.");
    }
    if (playerContext.principal !== humanPlaytest.principal) {
      errors.push("UAT principal must match the versioned CourtOS player context.");
    }
    if (playerContext.entitlement !== humanPlaytest.entitlement) {
      errors.push("UAT entitlement must match the versioned CourtOS player context.");
    }
    if (playerContext.house_id !== humanPlaytest.houseId) {
      errors.push("UAT House id must match the versioned CourtOS player context.");
    }
  }

  const laneIds = new Set();
  const lanes = Array.isArray(config.lanes) ? config.lanes : [];
  if (lanes.length < 6) errors.push("UAT config must define at least six persona lanes.");

  for (const lane of lanes) {
    if (!lane || typeof lane.id !== "string" || !lane.id.trim()) {
      errors.push("Every persona lane must have a non-empty id.");
      continue;
    }
    if (laneIds.has(lane.id)) errors.push(`Duplicate persona lane id: ${lane.id}`);
    laneIds.add(lane.id);
    if (lane.required !== true) errors.push(`Core persona lane ${lane.id} must be required.`);
    requireFile(lane.persona, `Persona file for ${lane.id}`);
  }

  const architectureLane = Array.isArray(config.independentLanes)
    ? config.independentLanes.find((lane) => lane?.id === "production_architecture")
    : undefined;
  if (!architectureLane || architectureLane.required !== true) {
    errors.push("A required independent production_architecture lane is mandatory.");
  } else {
    requireFile(architectureLane.prompt, "Production architecture prompt");
  }

  const scenarioPath = requireFile(config.scenarioCatalog, "Scenario catalog");
  const reportSchemaPath = requireFile(config.reportSchema, "UAT report schema");
  const architectureSchemaPath = requireFile(config.architectureSchema, "Architecture report schema");
  requireFile("qa/uat/schemas/promotion-report.schema.json", "Promotion report schema");
  requireFile("qa/uat/prompts/orchestrator.md", "UAT Orchestrator prompt");
  const architectureChecksPath = requireFile("qa/uat/architecture-checks.json", "Architecture check catalog");
  if (architectureChecksPath) {
    const architectureChecks = readJson(architectureChecksPath, "Architecture check catalog");
    const checks = Array.isArray(architectureChecks?.checks) ? architectureChecks.checks : [];
    if (checks.length < 12) errors.push("Architecture review must define at least 12 production-readiness checks.");
    const checkIds = new Set();
    for (const check of checks) {
      if (!/^ARCH-[0-9]{3}$/.test(check?.id ?? "")) errors.push(`Invalid architecture check id: ${check?.id ?? "missing"}`);
      if (checkIds.has(check.id)) errors.push(`Duplicate architecture check id: ${check.id}`);
      checkIds.add(check.id);
      if (typeof check.requirement !== "string" || !check.requirement.trim()) {
        errors.push(`Architecture check ${check.id} must declare a requirement.`);
      }
    }
  }

  if (reportSchemaPath) readJson(reportSchemaPath, "UAT report schema");
  if (architectureSchemaPath) readJson(architectureSchemaPath, "Architecture report schema");

  if (scenarioPath) {
    const catalog = readJson(scenarioPath, "Scenario catalog");
    const scenarios = Array.isArray(catalog?.scenarios) ? catalog.scenarios : [];
    validatedScenarioCount = scenarios.length;
    if (scenarios.length < 20) errors.push("The V1 UAT catalog must contain at least 20 scenarios.");
    const scenarioIds = new Set();
    const coveredLanes = new Set();
    for (const scenario of scenarios) {
      if (!scenario || typeof scenario.id !== "string" || !scenario.id.trim()) {
        errors.push("Every scenario must have a non-empty id.");
        continue;
      }
      if (scenarioIds.has(scenario.id)) errors.push(`Duplicate scenario id: ${scenario.id}`);
      scenarioIds.add(scenario.id);
      if (!laneIds.has(scenario.lane)) errors.push(`Scenario ${scenario.id} references unknown lane ${scenario.lane}.`);
      coveredLanes.add(scenario.lane);
      if (!scenario.houseSelector || typeof scenario.houseSelector.strategy !== "string") {
        errors.push(`Scenario ${scenario.id} must use a source-driven House selector.`);
      }
      if (!Array.isArray(scenario.invariants) || scenario.invariants.length === 0) {
        errors.push(`Scenario ${scenario.id} must declare at least one invariant.`);
      }
      if (!Array.isArray(scenario.evidenceRequired) || scenario.evidenceRequired.length === 0) {
        errors.push(`Scenario ${scenario.id} must declare required evidence.`);
      }
    }
    for (const laneId of laneIds) {
      if (!coveredLanes.has(laneId)) errors.push(`Required lane ${laneId} has no scenarios.`);
    }
    for (const id of catalog?.fixedRegressionIds ?? []) {
      if (!scenarioIds.has(id)) errors.push(`Fixed regression id ${id} does not exist in the scenario catalog.`);
    }
  }

  const promotion = config.promotion ?? {};
  if (promotion.requireEngineeringPass !== true) errors.push("Promotion must require the engineering gate.");
  if (promotion.requireUatPass !== true) errors.push("Promotion must require the UAT verdict.");
  if (promotion.requireArchitecturePass !== true) errors.push("Promotion must require the architecture verdict.");
  for (const severity of ["P0", "P1"]) {
    if (!promotion.blockSeverities?.includes(severity)) errors.push(`${severity} must block human-playtest promotion.`);
    if (!promotion.requireIndependentVerification?.includes(severity)) {
      errors.push(`${severity} must require independent verification.`);
    }
  }
}

if (errors.length > 0) {
  console.error("CourtOS UAT configuration is invalid:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `CourtOS UAT configuration valid: ${config?.lanes?.length ?? 0} persona lanes, ` +
    `${config?.independentLanes?.length ?? 0} independent architecture lane, ` +
    `${validatedScenarioCount} scenarios.`,
);
