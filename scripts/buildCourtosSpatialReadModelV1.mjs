#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, ".courtos-generated/courtos_spatial_read_model_v1.json");
const LEGACY_PUBLIC_OUT = path.join(
  ROOT,
  "public/data/ready/courtos_spatial_read_model_v1.json",
);
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
const ROADCOTE_DETAIL = path.join(
  ROOT,
  "data/map/mapgen_exports/roadcote_microhex_pilot_v1.json",
);
const DETAIL_EXPORTS = [
  { exportId: "pearwick_microhex_pilot_v1", file: PEARWICK_DETAIL },
  { exportId: "roadcote_microhex_pilot_v1", file: ROADCOTE_DETAIL },
];
const SPATIAL_ADMISSION = path.join(
  ROOT,
  "data/uat/courtos_spatial_house_manor_admission_v1.json",
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
  ROADCOTE_DETAIL,
  SPATIAL_ADMISSION,
]) {
  if (!fs.existsSync(required)) throw new Error(`Missing CourtOS spatial source: ${required}`);
}

const mapgenExportManifest = readJson(MAPGEN_EXPORT_MANIFEST);
if (mapgenExportManifest.schema_version !== "courtos_mapgen_export_manifest_v1") {
  throw new Error("Unsupported CourtOS MapGen export manifest schema.");
}
const verifiedDetails = DETAIL_EXPORTS.map(({ exportId, file }) => {
  const manifestEntry = mapgenExportManifest.exports?.find(
    (entry) => entry.export_id === exportId,
  );
  if (!manifestEntry) {
    throw new Error(`CourtOS MapGen export manifest does not declare ${exportId}.`);
  }
  const sourceSha256 = fileSha256(file);
  if (sourceSha256 !== manifestEntry.sha256) {
    throw new Error(
      `CourtOS MapGen export SHA mismatch for ${exportId}: expected ${manifestEntry.sha256}, got ${sourceSha256}.`,
    );
  }
  const detail = readJson(file);
  if (
    detail.schema_version !== "merecross_microhex_pilot_v1" ||
    detail.status !== "interpretive_pilot_not_source_truth" ||
    typeof detail.target?.manor_id !== "string"
  ) {
    throw new Error(`CourtOS MapGen export ${exportId} failed its interpretive visual contract.`);
  }
  return { exportId, file, manifestEntry, sourceSha256, detail };
});

const houses = readJsonl(GRAPH_HOUSES);
const crosswalk = readJsonl(OPERATOR_CROSSWALK);
const xmap = readJson(XMAP_MANORS);
const spatialAdmission = readJson(SPATIAL_ADMISSION);
const placeNames = parseCsv(fs.readFileSync(PLACE_NAMES, "utf8"));
if (
  spatialAdmission.schema_version !== "courtos_spatial_house_manor_admission_v1" ||
  spatialAdmission.disposition !== "founder_authorized_admitted" ||
  spatialAdmission.command_authority !== false ||
  spatialAdmission.source_manifest?.operator_crosswalk_sha256 !== fileSha256(OPERATOR_CROSSWALK) ||
  spatialAdmission.source_manifest?.xmap_manors_sha256 !== fileSha256(XMAP_MANORS) ||
  !Array.isArray(spatialAdmission.admitted_associations)
) {
  throw new Error("CourtOS spatial admission package failed its source or authority gate.");
}
const admissionByHouseAndManor = new Map();
for (const admission of spatialAdmission.admitted_associations) {
  if (
    !admission ||
    typeof admission.house_id !== "string" ||
    typeof admission.protected_manor_id !== "string" ||
    typeof admission.source_crosswalk_id !== "string" ||
    typeof admission.source_row_sha256 !== "string" ||
    admission.association_basis !== "named_house_operated" ||
    typeof admission.principal_seat !== "boolean"
  ) {
    throw new Error("CourtOS spatial admission package has an invalid association row.");
  }
  const key = `${admission.house_id}|${admission.protected_manor_id}`;
  if (admissionByHouseAndManor.has(key)) {
    throw new Error("CourtOS spatial admission package contains a duplicate House/manor association.");
  }
  admissionByHouseAndManor.set(key, admission);
}
const houseById = new Map(houses.map((house) => [house.id, house]));
const xmapByProtectedId = new Map(
  xmap.manors.map((manor) => [protectedManorId(manor.manor_id), manor]),
);
const xmapByManorId = new Map(
  xmap.manors.map((manor) => [manor.manor_id, manor]),
);
const nameByManorId = new Map(
  placeNames
    .filter((row) => row.source_entity_kind === "manor")
    .map((row) => [row.entity_id, row]),
);

const detailedCoverage = new Map();
const detailByManorId = new Map();
function countyRendererFor(countyId) {
  if (countyId === "c_5") return "orchardmere_county_v1";
  if (countyId === "c_11") return "glastonmere_county_v1";
  return null;
}

for (const verified of verifiedDetails) {
  const manorId = verified.detail.target.manor_id;
  if (detailByManorId.has(manorId)) {
    throw new Error(`CourtOS MapGen exports duplicate manor detail: ${manorId}.`);
  }
  detailByManorId.set(manorId, verified);
  const sourceManor = xmapByManorId.get(manorId);
  const countyRenderer = countyRendererFor(sourceManor?.county_id);
  detailedCoverage.set(manorId, {
    coverage_state: "authored_one_acre_detail",
    renderer_level: "estate",
    available_levels: countyRenderer ? ["realm", "county", "estate"] : ["realm", "estate"],
    parent_hex_count: verified.detail.target?.macro_parent_count ?? 0,
    authored_acre_count: verified.detail.target?.microhex_count ?? 0,
    source_sha256: verified.sourceSha256,
    // Detailed coverage remains source truth; the accepted MapGen renderer is
    // the presentation layer for the three available viewing distances.
    renderers: {
      realm: "merecross_realm_v1",
      ...(countyRenderer ? { county: countyRenderer } : {}),
      estate: "pearwick_estate_pilot_v1",
    },
  });
}

function asFiniteNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function uniqueStrings(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry) => typeof entry === "string" && entry.trim()))]
    : [];
}

function visualDerivationFor(manorId) {
  const verified = detailByManorId.get(manorId);
  if (!verified) return undefined;
  const { detail, manifestEntry, sourceSha256 } = verified;
  const refinement = detail.refinement ?? {};
  const artworkBrief = Array.isArray(detail.artwork_brief) ? detail.artwork_brief : [];
  const featureFamilies = uniqueStrings(artworkBrief.map((brief) => brief?.asset));
  const acreCellCount = asFiniteNonNegativeInteger(detail.target?.microhex_count);
  const acreCellsPerParent = asFiniteNonNegativeInteger(refinement.child_count_per_parent);
  const parentXmapHexCount = asFiniteNonNegativeInteger(detail.target?.macro_parent_count);
  if (acreCellCount === null || acreCellsPerParent === null || parentXmapHexCount === null) {
    throw new Error("CourtOS MapGen export has an invalid acre-cell refinement summary.");
  }
  if (detail.status !== "interpretive_pilot_not_source_truth") {
    throw new Error("CourtOS accepts only explicitly interpretive MapGen visual derivations.");
  }
  return {
    disposition: "interpretive_renderer_export",
    source_status: manifestEntry.source_status,
    parent_xmap_hex_count: parentXmapHexCount,
    // The middle LOD has a fixed renderer-only doctrine: every complete XMAP
    // parent resolves to 31 deterministic, contiguous clusters of seven fine
    // estate cells. The actual membership lives in the lazy visual-detail
    // payload; this read model intentionally exposes only the declared shape.
    parcel_cluster_count: 31,
    acre_cell_count: acreCellCount,
    acre_cells_per_parent: acreCellsPerParent,
    available_lods: ["xmap_hex", "parcel_cluster", "acre_cell"],
    feature_families: featureFamilies,
    source_sha256: sourceSha256,
  };
}

const grouped = new Map();
for (const row of crosswalk) {
  const houseId = row.normalized_local_holder_house_id || row.local_holder_house_id;
  const admission = houseId ? admissionByHouseAndManor.get(`${houseId}|${row.manor_id}`) : null;
  const manor = xmapByProtectedId.get(row.manor_id);
  if (!houseId || !admission || !manor || !houseById.has(houseId)) continue;
  if (
    row.id !== admission.source_crosswalk_id ||
    row.source_row_sha256 !== admission.source_row_sha256 ||
    row.normalized_local_holder_house_id !== houseId ||
    row.operations_closure_state !== admission.association_basis
  ) {
    throw new Error("CourtOS spatial admission row no longer matches its crosswalk source.");
  }
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
    is_principal_seat: admission.principal_seat,
    detailed_coverage: detailedCoverage.get(manor.manor_id) ?? {
      coverage_state: "macro_only",
      renderer_level: countyRendererFor(manor.county_id) ? "county" : "realm",
      available_levels: countyRendererFor(manor.county_id) ? ["realm", "county"] : ["realm"],
      renderers: countyRendererFor(manor.county_id)
        ? { realm: "merecross_realm_v1", county: countyRendererFor(manor.county_id) }
        : { realm: "merecross_realm_v1" },
    },
    visual_derivation: visualDerivationFor(manor.manor_id),
  });
  grouped.set(houseId, portfolio);
}

const portfolios = [...grouped.values()]
  .map((portfolio) => {
    const hasAdmittedAssociations = portfolio.manors.length > 0;
    if (portfolio.manors.filter((manor) => manor.is_principal_seat).length > 1) {
      throw new Error(`CourtOS spatial admission has multiple principal seats for ${portfolio.house_id}.`);
    }
    return {
      ...portfolio,
      association_posture: hasAdmittedAssociations
        ? "ui_admitted"
        : "unavailable",
      association_note: hasAdmittedAssociations
        ? "UI-admitted House-to-manor associations only."
        : "No UI-admitted House-to-manor association is available.",
      manors: portfolio.manors
        .sort((left, right) => left.display_name.localeCompare(right.display_name)),
    };
  })
  .filter((portfolio) => portfolio.manors.length > 0)
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
    mapgen_details: verifiedDetails.map((verified) => ({
      target_manor_id: verified.detail.target.manor_id,
      repository: verified.manifestEntry.source_repository,
      source_path: verified.manifestEntry.source_path,
      export_path: path.relative(ROOT, verified.file),
      export_manifest_path: path.relative(ROOT, MAPGEN_EXPORT_MANIFEST),
      sha256: verified.sourceSha256,
      source_status: verified.manifestEntry.source_status,
    })),
  },
  portfolio_count: portfolios.length,
  manor_count: portfolios.reduce((sum, portfolio) => sum + portfolio.manors.length, 0),
  portfolios,
};

fs.rmSync(LEGACY_PUBLIC_OUT, { force: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  `Built ${path.relative(ROOT, OUT)}: ${result.portfolio_count} House portfolios, ${result.manor_count} manors.`,
);
