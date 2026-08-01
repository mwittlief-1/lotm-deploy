#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public/data/ready/courtos_spatial_read_model_v1.json");
const GRAPH_HOUSES = path.join(ROOT, "data/ready/world_1120_turn0/sources/graph_v1/House__c.jsonl");
const OPERATOR_CROSSWALK = path.join(
  ROOT,
  "data/ready/world_1120_turn0/sources/manor_operator_crosswalk_step4m_v1/ManorOperatorCrosswalk__c.jsonl",
);
const XMAP_MANORS = path.join(ROOT, "data/map/xmap_alpha_v1/manor_units_v1.json");
const PLACE_NAMES = path.join(
  ROOT,
  "data/naming/place_name_catalog_working_authority_v1/locked_name_catalog_combined_view_v1.csv",
);
const MAPGEN_EXPORT_MANIFEST = path.join(
  ROOT,
  "data/map/mapgen_exports/courtos_mapgen_export_manifest_v1.json",
);
const PEARWICK_DETAIL = path.join(
  ROOT,
  "data/map/mapgen_exports/pearwick_microhex_pilot_v1.json",
);

const MANOR_ID_SALT = "lotm.turn0.manor_tenure_a30_sidecar.v1";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileSha256(file) {
  return sha256(fs.readFileSync(file));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonl(file) {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some(Boolean)) rows.push(row);
  }
  const [headers = [], ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])),
  );
}

function protectedManorId(rawManorId) {
  return `t0man_${sha256(`${MANOR_ID_SALT}|Manor__c|${rawManorId}`).slice(0, 24)}`;
}

function sourcePosture(row) {
  if (row.ui_authority === true && row.runtime_authority === true) return "admitted_runtime";
  if (row.ui_authority === true) return "admitted_read_only";
  return "provisional_read_only";
}

function labelForManor(nameRow, manor) {
  return (
    nameRow?.locked_root ||
    nameRow?.locked_public_name ||
    nameRow?.public_name_before ||
    `Recorded manor at ${manor.seat_hex_id}`
  );
}

for (const required of [
  GRAPH_HOUSES,
  OPERATOR_CROSSWALK,
  XMAP_MANORS,
  PLACE_NAMES,
  MAPGEN_EXPORT_MANIFEST,
  PEARWICK_DETAIL,
]) {
  if (!fs.existsSync(required)) throw new Error(`Missing CourtOS spatial source: ${required}`);
}

const mapgenExportManifest = readJson(MAPGEN_EXPORT_MANIFEST);
if (mapgenExportManifest.schema_version !== "courtos_mapgen_export_manifest_v1") {
  throw new Error("Unsupported CourtOS MapGen export manifest schema.");
}
const pearwickExport = mapgenExportManifest.exports?.find(
  (entry) => entry.export_id === "pearwick_microhex_pilot_v1",
);
if (!pearwickExport) {
  throw new Error("CourtOS MapGen export manifest does not declare pearwick_microhex_pilot_v1.");
}
const pearwickDetailSha256 = fileSha256(PEARWICK_DETAIL);
if (pearwickDetailSha256 !== pearwickExport.sha256) {
  throw new Error(
    `CourtOS MapGen export SHA mismatch: expected ${pearwickExport.sha256}, got ${pearwickDetailSha256}.`,
  );
}

const houses = readJsonl(GRAPH_HOUSES);
const crosswalk = readJsonl(OPERATOR_CROSSWALK);
const xmap = readJson(XMAP_MANORS);
const placeNames = parseCsv(fs.readFileSync(PLACE_NAMES, "utf8"));
const houseById = new Map(houses.map((house) => [house.id, house]));
const xmapByProtectedId = new Map(
  xmap.manors.map((manor) => [protectedManorId(manor.manor_id), manor]),
);
const nameByManorId = new Map(
  placeNames
    .filter((row) => row.source_entity_kind === "manor")
    .map((row) => [row.entity_id, row]),
);

const detailedCoverage = new Map();
const detail = readJson(PEARWICK_DETAIL);
const detailedManorId = detail.target?.manor_id;
if (!detailedManorId) {
  throw new Error("CourtOS MapGen export has no target manor_id.");
}
detailedCoverage.set(detailedManorId, {
  coverage_state: "authored_one_acre_detail",
  renderer_level: "estate",
  available_levels: ["realm", "county", "estate"],
  parent_hex_count: detail.target?.macro_parent_count ?? 0,
  authored_acre_count: detail.target?.microhex_count ?? 0,
  source_sha256: pearwickDetailSha256,
  renderers: {
    realm: "merecross_realm_v1",
    county: "orchardmere_county_v1",
    estate: "pearwick_estate_pilot_v1",
  },
});

const grouped = new Map();
for (const row of crosswalk) {
  const houseId = row.normalized_local_holder_house_id || row.local_holder_house_id;
  const manor = xmapByProtectedId.get(row.manor_id);
  if (!houseId || !manor || !houseById.has(houseId)) continue;
  const house = houseById.get(houseId);
  const name = nameByManorId.get(manor.manor_id);
  const portfolio = grouped.get(houseId) || {
    house_id: houseId,
    house_name: house.display_name,
    house_style: house.public_style,
    house_root: house.public_style_root,
    manors: [],
  };
  portfolio.manors.push({
    manor_id: manor.manor_id,
    protected_manor_id: row.manor_id,
    display_name: labelForManor(name, manor),
    county_id: manor.county_id,
    county_name: name?.county_name || null,
    seat_hex_id: manor.seat_hex_id,
    seat_q: Number.parseInt(manor.seat_hex_id.replace("hx_", ""), 10) % 281,
    seat_r: Math.floor(Number.parseInt(manor.seat_hex_id.replace("hx_", ""), 10) / 281),
    hex_count: manor.hex_count,
    estimated_peasant_households: manor.estimated_peasant_households,
    holding_type: manor.holding_type,
    manor_size_class: manor.manor_size_class,
    operation_state: row.operations_closure_state,
    operator_state: row.local_operator_state,
    operator_resolution_status: row.operator_resolution_status,
    principal_operator_person_ids: row.exact_manor_office_holder_person_ids ?? [],
    source_posture: sourcePosture(row),
    source_status: row.source_status,
    ui_authority: row.ui_authority === true,
    runtime_authority: row.runtime_authority === true,
    command_authority: row.command_authority === true,
    detailed_coverage: detailedCoverage.get(manor.manor_id) ?? {
      coverage_state: "macro_only",
      renderer_level: manor.county_id === "c_5" ? "county" : "realm",
      available_levels: manor.county_id === "c_5" ? ["realm", "county"] : ["realm"],
      renderers: manor.county_id === "c_5"
        ? { realm: "merecross_realm_v1", county: "orchardmere_county_v1" }
        : { realm: "merecross_realm_v1" },
    },
  });
  grouped.set(houseId, portfolio);
}

const portfolios = [...grouped.values()]
  .map((portfolio) => {
    const admittedManors = portfolio.manors.filter((manor) => manor.ui_authority === true);
    const hasAdmittedAssociations = admittedManors.length > 0;
    return {
      ...portfolio,
      association_posture: hasAdmittedAssociations
        ? "ui_admitted"
        : "provisional_operator_crosswalk",
      association_note: hasAdmittedAssociations
        ? "UI-admitted House-to-manor associations only."
        : "Provisional operator crosswalk associations; not an assignment or tenure lock.",
      manors: (hasAdmittedAssociations ? admittedManors : portfolio.manors).sort((left, right) =>
        left.display_name.localeCompare(right.display_name),
      ),
    };
  })
  .sort((left, right) => left.house_name.localeCompare(right.house_name));

const result = {
  schema_version: "courtos_spatial_read_model_v1",
  effective_date: "1120-01-01",
  generated_at: "deterministic_from_sources",
  read_only: true,
  command_authority: false,
  sources: {
    protected_houses: {
      path: path.relative(ROOT, GRAPH_HOUSES),
      sha256: fileSha256(GRAPH_HOUSES),
    },
    manor_operator_crosswalk: {
      path: path.relative(ROOT, OPERATOR_CROSSWALK),
      sha256: fileSha256(OPERATOR_CROSSWALK),
      authority_note: "Rows retain their source posture; candidate rows are not promoted.",
    },
    xmap_manors: {
      path: path.relative(ROOT, XMAP_MANORS),
      sha256: fileSha256(XMAP_MANORS),
    },
    visible_place_names: {
      path: path.relative(ROOT, PLACE_NAMES),
      sha256: fileSha256(PLACE_NAMES),
    },
    mapgen_detail: {
      repository: pearwickExport.source_repository,
      source_path: pearwickExport.source_path,
      export_path: path.relative(ROOT, PEARWICK_DETAIL),
      export_manifest_path: path.relative(ROOT, MAPGEN_EXPORT_MANIFEST),
      sha256: pearwickDetailSha256,
      source_status: pearwickExport.source_status,
    },
  },
  portfolio_count: portfolios.length,
  manor_count: portfolios.reduce((sum, portfolio) => sum + portfolio.manors.length, 0),
  portfolios,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  `Built ${path.relative(ROOT, OUT)}: ${result.portfolio_count} House portfolios, ${result.manor_count} manors.`,
);
