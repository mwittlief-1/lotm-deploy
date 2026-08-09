#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANOR_ID = "manor_hx_44835";
const SEAT_HEX_ID = "hx_44835";
const EXPORT_ID = "roadcote_microhex_pilot_v1";
const OUTPUT = path.join(ROOT, "data/map/mapgen_exports/roadcote_microhex_pilot_v1.json");
const MANIFEST = path.join(ROOT, "data/map/mapgen_exports/courtos_mapgen_export_manifest_v1.json");
const XMAP_SUPPORT = path.join(ROOT, "data/map/xmap_alpha_v1/map_view_support_v1.json");
const XMAP_ECONOMY = path.join(ROOT, "data/map/xmap_alpha_v1/hex_economic_profile_v1.json");
const XMAP_MANORS = path.join(ROOT, "data/map/xmap_alpha_v1/manor_units_v1.json");
const CHILD_COUNT = 217;
const MATRIX = [[9, -8], [8, 17]];
const DIRECTIONS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(file) {
  return sha256(fs.readFileSync(file));
}

function hexNumericId(q, r) {
  return q + 281 * r;
}

function hexId(q, r) {
  return `hx_${hexNumericId(q, r)}`;
}

function centerFor(q, r) {
  return {
    q: MATRIX[0][0] * q + MATRIX[0][1] * r,
    r: MATRIX[1][0] * q + MATRIX[1][1] * r,
  };
}

function localFineCoordinates() {
  const cells = [];
  for (let q = -8; q <= 8; q += 1) {
    for (let r = -8; r <= 8; r += 1) {
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 8) cells.push({ q, r });
    }
  }
  if (cells.length !== CHILD_COUNT) throw new Error(`Expected ${CHILD_COUNT} fine coordinates, got ${cells.length}.`);
  return cells.sort((left, right) => left.r - right.r || left.q - right.q);
}

function stableUnit(...parts) {
  return Number.parseInt(sha256(parts.join("|")).slice(0, 8), 16) / 0xffffffff;
}

function landcoverFor(parent, isSeat) {
  if (isSeat) return "court_and_working_yard";
  if ((parent.water_access_score ?? 0) >= 0.34) return "damp_meadow_swale";
  const options = (parent.wood_capacity ?? 0) >= 0.24
    ? ["wooded_pasture", "mixed_smallholdings", "orchard_edge"]
    : ["rich_open_fields", "tenant_ridge_and_furrow", "grazed_pasture", "mixed_smallholdings"];
  return options[Math.floor(stableUnit(parent.hex_id, "landcover") * options.length) % options.length];
}

function fineLandUse(parent, localQ, localR, isSeat) {
  const distance = Math.max(Math.abs(localQ), Math.abs(localR), Math.abs(localQ + localR));
  if (isSeat && distance <= 1) return "roadcote_court_compound";
  if (isSeat && distance <= 3) return "working_yard_and_kitchen_close";
  const wet = parent.water_access >= 0.3 && stableUnit(parent.hex_id, localQ, localR, "wet") > 0.67;
  if (wet) return "damp_meadow_swale";
  const options = parent.landcover_subtype === "grazed_pasture"
    ? ["grazed_pasture", "hay_meadow", "tenant_field"]
    : parent.landcover_subtype === "wooded_pasture"
      ? ["wooded_pasture", "coppice_edge", "tenant_field"]
      : ["tenant_ridge_and_furrow", "demesne_field", "grazed_headland", "orchard_close"];
  return options[Math.floor(stableUnit(parent.hex_id, localQ, localR, "use") * options.length) % options.length];
}

for (const required of [XMAP_SUPPORT, XMAP_ECONOMY, XMAP_MANORS, MANIFEST]) {
  if (!fs.existsSync(required)) throw new Error(`Missing Roadcote visual source: ${required}`);
}

const support = readJson(XMAP_SUPPORT);
const economy = readJson(XMAP_ECONOMY);
const manors = readJson(XMAP_MANORS);
const target = manors.manors.find((item) => item.manor_id === MANOR_ID);
if (!target || target.seat_hex_id !== SEAT_HEX_ID || !Array.isArray(target.hex_ids)) {
  throw new Error("Roadcote XMAP manor identity is unavailable or inconsistent.");
}
const supportById = new Map(support.hexes.map((item) => [item.hex_id, item]));
const economyById = new Map(economy.hexes.map((item) => [item.hex_id, item]));
const estateHexIds = new Set(target.hex_ids);
const contextHexIds = new Set(target.hex_ids);
for (const estateHexId of estateHexIds) {
  const source = supportById.get(estateHexId);
  if (!source) throw new Error(`Roadcote estate hex is absent from XMAP support: ${estateHexId}`);
  for (const [dq, dr] of DIRECTIONS) {
    const candidate = hexId(source.q + dq, source.r + dr);
    if (supportById.get(candidate)?.tile_kind === "land") contextHexIds.add(candidate);
  }
}

const macroParents = [...contextHexIds]
  .map((id) => {
    const source = supportById.get(id);
    const economic = economyById.get(id);
    if (!source || !economic) throw new Error(`Roadcote visual context is missing XMAP evidence: ${id}`);
    const center = centerFor(source.q, source.r);
    const isEstate = estateHexIds.has(id);
    const isSeat = id === SEAT_HEX_ID;
    const landcover = landcoverFor(source, isSeat);
    // This is a stable renderer relief value, not a claim of surveyed elevation.
    const visualElevation = Math.round(590 + 26 * (source.buildability_score ?? 0.5) + 8 * stableUnit(id, "relief"));
    return {
      hex_id: id,
      q: source.q,
      r: source.r,
      center_q: center.q,
      center_r: center.r,
      terrain: source.terrain,
      approved_elevation: visualElevation,
      county_id: source.county_context_id,
      county_name: "Glastonmere",
      manor_id: source.manor_id,
      same_manor_as_target: isEstate,
      is_estate: isEstate,
      authored_context_role: isEstate ? (isSeat ? "principal_seat" : "roadcote_estate") : "neighboring_geographic_context",
      landcover_subtype: landcover,
      arable: economic.base_arable_capacity,
      pasture: economic.base_pasture_capacity,
      wood: economic.wood_capacity,
      water_access: economic.water_access_score,
      buildability: economic.buildability_score,
      settlement_suitability: economic.settlement_suitability,
    };
  })
  .sort((left, right) => left.r - right.r || left.q - right.q);

const locals = localFineCoordinates();
const microhexes = [];
for (const parent of macroParents) {
  for (const local of locals) {
    const q = parent.center_q + local.q;
    const r = parent.center_r + local.r;
    const isSeat = parent.hex_id === SEAT_HEX_ID;
    const siteFeatureIds = isSeat && local.q === 0 && local.r === 0
      ? ["site_roadcote_court_principal_seat"]
      : [];
    const landUse = fineLandUse(parent, local.q, local.r, isSeat);
    const relief = (stableUnit(parent.hex_id, local.q, local.r, "fine-relief") - 0.5) * 2.4;
    microhexes.push({
      micro_hex_id: `mh_${q}_${r}`,
      q,
      r,
      parent_hex_id: parent.hex_id,
      parent_q: parent.q,
      parent_r: parent.r,
      local_q: local.q,
      local_r: local.r,
      is_target: isSeat && local.q === 0 && local.r === 0,
      is_estate: parent.is_estate,
      neighbor_ids: DIRECTIONS.map(([dq, dr]) => `mh_${q + dq}_${r + dr}`),
      neighbor_parent_hex_ids: [],
      elevation: Number((parent.approved_elevation + relief).toFixed(3)),
      terrain_vertex_ids: [],
      corner_elevations: [],
      surface_center_elevation: Number((parent.approved_elevation + relief).toFixed(6)),
      land_use: landUse,
      evidence_class: parent.is_estate ? "interpretive_xmap_constrained_estate_fabric" : "interpretive_xmap_context_fabric",
      source_basis: "Deterministic renderer interpretation constrained by XMAP terrain, productive capacity, water access, manor extent, and seat identity; not observed condition or surveyed history.",
      boundary_edges: [],
      lcu_id: null,
      feature: null,
      linear_feature_ids: [],
      site_feature_ids: siteFeatureIds,
    });
  }
}

const result = {
  schema_version: "merecross_microhex_pilot_v1",
  version: "001",
  status: "interpretive_pilot_not_source_truth",
  target: {
    label: "Roadcote Court estate",
    hex_id: SEAT_HEX_ID,
    q: supportById.get(SEAT_HEX_ID).q,
    r: supportById.get(SEAT_HEX_ID).r,
    manor_id: MANOR_ID,
    active_manor_id: target.vnext_source_manor_id,
    county_id: target.county_id,
    county_name: "Glastonmere",
    terrain: supportById.get(SEAT_HEX_ID).terrain,
    landcover_subtype: "court_and_working_yard",
    approved_elevation: macroParents.find((item) => item.hex_id === SEAT_HEX_ID).approved_elevation,
    acreage_model: CHILD_COUNT,
    legal_estate_hex_ids: [...estateHexIds].sort(),
    legal_estate_hex_count: estateHexIds.size,
    macro_parent_count: macroParents.length,
    microhex_count: microhexes.length,
  },
  refinement: {
    child_count_per_parent: CHILD_COUNT,
    matrix: MATRIX,
    determinant: CHILD_COUNT,
    rule: "Fine-cell ownership is the deterministic radius-eight fundamental domain around each transformed XMAP center.",
  },
  source_evidence: {
    status: "xmap_constrained_interpretive_visual",
    source_files: [XMAP_SUPPORT, XMAP_ECONOMY, XMAP_MANORS].map((file) => ({
      path: path.relative(ROOT, file),
      sha256: sha256File(file),
    })),
    world_truth: false,
    runtime_authority: false,
    command_authority: false,
  },
  macro_parents: macroParents,
  microhexes,
  artwork_brief: [
    { asset: "Roadcote Court compound", role: "principal-seat marker", content: "court, working yard, service ranges, and close", variants: "data-bound site mark pending dedicated art" },
    { asset: "Glastonmere open-field family", role: "dominant estate fabric", content: "ridge-and-furrow, demesne fields, tenant strips", variants: "renderer tone variants" },
    { asset: "Pasture and damp meadow", role: "water-access transition", content: "grazed pasture, hay meadow, damp swale", variants: "renderer tone variants" },
    { asset: "Estate boundary kit", role: "legal-estate distinction", content: "interpretive field and close boundaries", variants: "future art layer" },
    { asset: "Orchard and working close", role: "seat infield", content: "orchard close, kitchen close, working yard", variants: "renderer tone variants" }
  ],
};

if (result.target.legal_estate_hex_count !== 9 || result.target.microhex_count !== macroParents.length * CHILD_COUNT) {
  throw new Error("Roadcote visual export failed its deterministic extent invariant.");
}
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
const manifest = readJson(MANIFEST);
const entry = {
  export_id: EXPORT_ID,
  path: path.relative(ROOT, OUTPUT),
  target_manor_id: MANOR_ID,
  sha256: sha256File(OUTPUT),
  source_repository: "lotm-deploy",
  source_path: "scripts/buildRoadcoteSpatialVisualExportV1.mjs",
  source_status: "versioned_renderer_export",
  runtime_use: "read_only_estate_detail_coverage",
  authority: { world_truth: false, runtime_authority: false, command_authority: false },
};
manifest.exports = [...manifest.exports.filter((item) => item.export_id !== EXPORT_ID), entry]
  .sort((left, right) => left.export_id.localeCompare(right.export_id));
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${path.relative(ROOT, OUTPUT)}: ${macroParents.length} XMAP parents, ${microhexes.length} fine cells, SHA ${entry.sha256}.`);
