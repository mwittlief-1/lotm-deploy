import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  compileCourtOsManorFabricVisualFactsV1,
  type CourtOsManorFabricVisualFactsV1,
  type ManorFabricConditionState,
  type ManorFabricFacilitySourceRow,
  type ManorFabricProjectSourceRow,
  type ManorFabricSurfaceSourceRow,
  type ManorFabricXmapSource,
} from "./manorFabricVisualAdapter";

const RELEASE_DIRECTORY = "data/genrun/phase_five_manor_operations_uat1_admission_v1";
const XMAP_MANORS = "data/map/xmap_alpha_v1/manor_units_v1.json";

export type ManorFabricVisualSourcePaths = {
  releaseDirectory: string;
  xmapManorsPath: string;
};

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(message: string): never {
  throw new Error(`CourtOS manor fabric source unavailable: ${message}`);
}

function parseCsv(value: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((item) => item.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (quoted) fail("CSV input contains an unterminated quoted field");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const [header, ...body] = rows;
  if (!header || header.length === 0) return [];
  return body.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])));
}

async function verifiedReleaseFiles(releaseDirectory: string): Promise<{
  manifest: Record<string, unknown>;
  rows: Record<string, Array<Record<string, string>>>;
}> {
  const manifestPath = path.join(releaseDirectory, "MANIFEST.json");
  const checksumPath = path.join(releaseDirectory, "SHA256SUMS.txt");
  const [manifestBytes, checksumBytes] = await Promise.all([readFile(manifestPath), readFile(checksumPath)]);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Record<string, unknown>;
  if (
    manifest.package !== "phase_five_manor_operations_uat1_admission_v1" ||
    manifest.status !== "foundation_a_uat1_admitted_read_model_noncanon_runtime_boundary" ||
    manifest.effective_cutpoint !== "1120-01-01"
  ) fail("the Manor Operations package is not the admitted Foundation A UAT1 release");

  const checksums = new Map(
    checksumBytes.toString("utf8").trim().split(/\r?\n/).map((line) => {
      const match = /^([a-f0-9]{64})\s+(.+)$/.exec(line.trim());
      if (!match) fail("the Manor Operations checksum register is malformed");
      return [match[2], match[1]] as const;
    }),
  );
  const names = [
    "condition_observation_candidate_v1.csv",
    "project_reconstruction_candidate_v1.csv",
    "discrete_facility_registry_reconciled_v1.csv",
  ];
  const rows: Record<string, Array<Record<string, string>>> = {};
  for (const name of names) {
    const bytes = await readFile(path.join(releaseDirectory, name));
    if (sha256(bytes) !== checksums.get(name)) fail(`${name} does not match the release checksum`);
    rows[name] = parseCsv(bytes.toString("utf8"));
  }
  return { manifest, rows };
}

function numberValue(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(`${field} is not numeric`);
  return parsed;
}

function fieldValue(row: Record<string, string>, field: string): string {
  const value = row[field];
  if (value === undefined) fail(`required source field ${field} is absent`);
  return value;
}

function sourceRows(
  rows: Record<string, Array<Record<string, string>>>,
  name: string,
): Array<Record<string, string>> {
  const value = rows[name];
  if (!value) fail(`required source table ${name} is absent`);
  return value;
}

const CONDITION_STATES = new Set<ManorFabricConditionState>([
  "sound", "worn", "impaired", "repairing", "under_construction",
]);

type VerifiedManorFabricSources = {
  rows: Record<string, Array<Record<string, string>>>;
  xmap: { manors?: Array<Record<string, unknown>> };
};

const verifiedSourceCache = new Map<string, Promise<VerifiedManorFabricSources>>();

function verifiedManorFabricSources(paths: ManorFabricVisualSourcePaths): Promise<VerifiedManorFabricSources> {
  const cacheKey = `${paths.releaseDirectory}\u0000${paths.xmapManorsPath}`;
  let pending = verifiedSourceCache.get(cacheKey);
  if (!pending) {
    pending = Promise.all([
      verifiedReleaseFiles(paths.releaseDirectory),
      readFile(paths.xmapManorsPath),
    ]).then(([{ rows }, xmapBytes]) => ({
      rows,
      xmap: JSON.parse(xmapBytes.toString("utf8")) as VerifiedManorFabricSources["xmap"],
    }));
    verifiedSourceCache.set(cacheKey, pending);
    pending.catch(() => verifiedSourceCache.delete(cacheKey));
  }
  return pending;
}

/** Loads one manor only after the admitted UAT1 files pass their frozen SHA register. */
export async function loadFoundationAManorFabricVisualFactsV1({
  manorId,
  paths = {
    releaseDirectory: path.resolve(RELEASE_DIRECTORY),
    xmapManorsPath: path.resolve(XMAP_MANORS),
  },
}: {
  manorId: string;
  paths?: ManorFabricVisualSourcePaths;
}): Promise<CourtOsManorFabricVisualFactsV1> {
  const { rows, xmap } = await verifiedManorFabricSources(paths);
  const manor = xmap.manors?.find((item) => item.manor_id === manorId);
  if (!manor) fail(`manor ${manorId} is absent from XMAP`);

  const allRawSurfaces = sourceRows(rows, "condition_observation_candidate_v1.csv")
    .filter((row) => fieldValue(row, "manor_id") === manorId);
  const withheldSurfaces = allRawSurfaces
    .filter((row) => !CONDITION_STATES.has(row.condition_state as ManorFabricConditionState))
    .map((row) => ({
      asset_surface_id: fieldValue(row, "asset_surface_id"),
      surface_key: fieldValue(row, "surface_key"),
      surface_name: fieldValue(row, "surface_name"),
    }));
  const rawSurfaces = allRawSurfaces.filter((row) => CONDITION_STATES.has(row.condition_state as ManorFabricConditionState));
  const surfaces: ManorFabricSurfaceSourceRow[] = rawSurfaces.map((row) => {
    return {
      condition_observation_id: fieldValue(row, "condition_observation_id"),
      asset_surface_id: fieldValue(row, "asset_surface_id"),
      manor_id: fieldValue(row, "manor_id"),
      manor_label: fieldValue(row, "manor_label"),
      county_id: fieldValue(row, "county_id"),
      county_label: fieldValue(row, "county_label"),
      governing_actor_id: fieldValue(row, "governing_actor_id"),
      governing_actor_name: fieldValue(row, "governing_actor_name"),
      surface_key: fieldValue(row, "surface_key"),
      surface_name: fieldValue(row, "surface_name"),
      condition_kind: fieldValue(row, "condition_kind"),
      condition_state: fieldValue(row, "condition_state") as ManorFabricConditionState,
      observation_cutpoint: fieldValue(row, "observation_cutpoint"),
      project_ids: row.project_ids ? row.project_ids.split("|").filter(Boolean) : [],
      source_status: fieldValue(row, "source_status"),
      confidence: fieldValue(row, "confidence"),
      uat1_display_state: fieldValue(row, "uat1_display_state"),
    };
  });
  const projects: ManorFabricProjectSourceRow[] = sourceRows(rows, "project_reconstruction_candidate_v1.csv")
    .filter((row) => fieldValue(row, "manor_id") === manorId)
    .map((row) => ({
      project_id: fieldValue(row, "project_id"),
      manor_id: fieldValue(row, "manor_id"),
      asset_surface_id: fieldValue(row, "asset_surface_id"),
      surface_key: fieldValue(row, "surface_key"),
      surface_name: fieldValue(row, "surface_name"),
      project_kind: fieldValue(row, "project_kind"),
      action_class: fieldValue(row, "action_class"),
      start_year: numberValue(fieldValue(row, "start_year"), "start_year"),
      expected_completion_year: numberValue(fieldValue(row, "expected_completion_year"), "expected_completion_year"),
      percent_complete_1120_candidate: numberValue(fieldValue(row, "percent_complete_1120_candidate"), "percent_complete_1120_candidate"),
      state_1120_candidate: fieldValue(row, "state_1120_candidate"),
      source_status: fieldValue(row, "source_status"),
      uat1_display_state: fieldValue(row, "uat1_display_state"),
    }));
  const facilities: ManorFabricFacilitySourceRow[] = sourceRows(rows, "discrete_facility_registry_reconciled_v1.csv")
    .filter((row) => fieldValue(row, "parent_manor_id") === manorId)
    .map((row) => ({
      facility_id: fieldValue(row, "facility_id"),
      facility_kind: fieldValue(row, "facility_kind"),
      facility_type: fieldValue(row, "facility_type"),
      parent_manor_id: fieldValue(row, "parent_manor_id"),
      parent_asset_surface_id: fieldValue(row, "parent_asset_surface_id"),
      parent_surface_key: fieldValue(row, "parent_surface_key"),
      operational_state: fieldValue(row, "operational_state"),
      fortification_posture: fieldValue(row, "fortification_posture"),
      condition_fact_state: fieldValue(row, "condition_fact_state"),
      source_status: fieldValue(row, "source_status"),
    }));

  const requiredStrings = ["manor_id", "county_id", "seat_hex_id", "holding_type", "manor_size_class", "seat_archetype"] as const;
  if (requiredStrings.some((key) => typeof manor[key] !== "string")) fail("XMAP manor fields are incomplete");
  if (!Array.isArray(manor.hex_ids) || manor.hex_ids.some((value) => typeof value !== "string")) fail("XMAP manor extent is incomplete");
  const xmapSource: ManorFabricXmapSource = {
    manor_id: manor.manor_id as string,
    county_id: manor.county_id as string,
    seat_hex_id: manor.seat_hex_id as string,
    hex_ids: manor.hex_ids as string[],
    holding_type: manor.holding_type as string,
    manor_size_class: manor.manor_size_class as string,
    seat_archetype: manor.seat_archetype as string,
    is_seat_complex: Boolean(manor.is_seat_complex),
    estimated_peasant_households: Number(manor.estimated_peasant_households),
    avg_buildability_score: Number(manor.avg_buildability_score),
    avg_water_access_score: Number(manor.avg_water_access_score),
    defensibility_score: Number(manor.defensibility_score),
    route_access_score: Number(manor.route_access_score),
    total_net_productive_capacity: Number(manor.total_net_productive_capacity),
  };

  return compileCourtOsManorFabricVisualFactsV1({
    xmap: xmapSource,
    surfaces,
    projects,
    facilities,
    withheldSurfaces,
    manorOperationsRelease: path.join(paths.releaseDirectory, "MANIFEST.json"),
    xmapSource: paths.xmapManorsPath,
  });
}
