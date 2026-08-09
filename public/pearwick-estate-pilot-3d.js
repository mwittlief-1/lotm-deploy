import * as THREE from "three";
import { OrbitControls } from "./vendor/three/OrbitControls.js";

const query = new URLSearchParams(window.location.search);
const requestedManorId = query.get("manorId");
const isRoadcote = requestedManorId === "manor_hx_44835";
const sourceData = isRoadcote ? window.ROADCOTE_MICROHEX_PILOT : window.PEARWICK_MICROHEX_PILOT;
const roadcoteLandUsePresentation = {
  demesne_field: "demesne_open_fields",
  tenant_ridge_and_furrow: "tenant_strip_fields",
  tenant_field: "tenant_strip_fields",
  grazed_headland: "pasture_meadow",
  grazed_pasture: "pasture_meadow",
  hay_meadow: "pasture_meadow",
  orchard_close: "orchard_kitchen_garden",
  working_yard_and_kitchen_close: "service_yard",
  roadcote_court_compound: "estate_house",
  damp_meadow_swale: "damp_meadow_swale",
};
const data = isRoadcote
  ? {
      ...sourceData,
      microhexes: sourceData.microhexes.map((cell) => ({
        ...cell,
        source_land_use: cell.land_use,
        land_use: roadcoteLandUsePresentation[cell.land_use] || cell.land_use,
      })),
      interpretation: sourceData.interpretation || {
        field_systems: [],
        local_routes: [],
        route_transition_features: [],
        context_site_features: [],
        tenant_holdings: [],
      },
    }
  : sourceData;
const RoadGeometry = window.PearwickRoadGeometry;
const singleHexAssetContract = isRoadcote
  ? window.ROADCOTE_SINGLE_HEX_ASSETS
  : window.PEARWICK_SINGLE_HEX_ASSETS;
if (!data?.microhexes?.length) throw new Error("Estate pilot data is unavailable.");
if (!RoadGeometry) throw new Error("Pearwick road geometry is unavailable.");
const locked2p5d = query.get("mode") === "2p5d";
const embeddedViewer = query.get("embedded") === "1";
const courtOsViewer = query.get("courtos") === "1";
const configuredParentOrigin = (() => {
  const value = query.get("parentOrigin");
  if (!value) return window.location.origin;
  try { return new URL(value).origin; } catch { return window.location.origin; }
})();
const cartographyTheme = window.MERECROSS_CARTOGRAPHY_THEME_V1?.resolve?.(query.get("theme"));
const visualTheme = cartographyTheme?.visual ?? {};
const environmentTheme = visualTheme.environment ?? {};
const lightingTheme = visualTheme.lighting ?? {};
const materialTheme = visualTheme.material ?? {};
const waterTheme = visualTheme.water ?? {};
const routeTheme = visualTheme.routes ?? {};
const labelTheme = visualTheme.labels ?? {};
document.body.classList.toggle("locked-2p5d", locked2p5d);
document.body.classList.toggle("embedded-viewer", embeddedViewer);
document.body.classList.toggle("courtos-viewer", courtOsViewer);
const lockedCameraDirection = new THREE.Vector3(6.4, 7.9, 8.5).normalize();

const canvas = document.getElementById("scene");
const loading = document.getElementById("loading");
const status = document.getElementById("status");
const inspector = document.getElementById("inspector");
const verticalScale = document.getElementById("vertical-scale");
const verticalScaleValue = document.getElementById("vertical-scale-value");
const showContext = document.getElementById("show-context");
const showRoads = document.getElementById("show-roads");
const showBoundaries = document.getElementById("show-boundaries");
const showVegetation = document.getElementById("show-vegetation");
const useEnvironmentArt = document.getElementById("use-environment-art");
const showTenantHoldings = document.getElementById("show-tenant-holdings");
const showLandRights = document.getElementById("show-land-rights");
const showAcreGrid = document.getElementById("show-acre-grid");

const SQRT3 = Math.sqrt(3);
const HEX_RADIUS = 1;
const HEIGHT_UNIT = 0.38;
const TERRAIN_SUBDIVISIONS = 4;
const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const edgeCorners = data.terrain_surface?.edge_corner_indices || [[5, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
const directionNames = ["east", "northeast", "northwest", "west", "southwest", "southeast"];

const landColors = {
  tenant_strip_fields: 0x7f7442,
  demesne_open_fields: 0x97874b,
  dry_ridge_fields: 0x79623a,
  pasture_meadow: 0x536b3b,
  damp_meadow_swale: 0x3f6650,
  boundary_hedge_copse: 0x243d29,
  orchard_kitchen_garden: 0x496238,
  farm_lane: 0x6d5237,
  service_yard: 0x6d5a42,
  estate_house: 0x66513d,
  pond_well: 0x355f68,
  village_lane_green: 0x6f7148,
  village_communal_core: 0x756047,
  village_toft_croft: 0x70613f,
  village_garden_margin: 0x526443,
  context_open_fields: 0x7f7b49,
  context_pasture: 0x526443,
  context_dry_fields: 0x6b5e3f,
  context_hedge_copse: 0x2d4931,
};
const landLabels = {
  tenant_strip_fields: "tenant strip fields",
  demesne_open_fields: "demesne open fields",
  dry_ridge_fields: "dry ridge fields",
  pasture_meadow: "pasture / hay meadow",
  damp_meadow_swale: "damp meadow / seasonal swale",
  boundary_hedge_copse: "boundary hedge / copse",
  orchard_kitchen_garden: "orchard / kitchen garden",
  farm_lane: "farm lane",
  service_yard: "hall service yard",
  estate_house: "Pearwick Hall",
  pond_well: "managed pond / well",
  village_lane_green: "village lane / green",
  village_communal_core: "village communal core",
  village_toft_croft: "village toft / croft fabric",
  village_garden_margin: "village garden / drainage margin",
  context_open_fields: "neighboring open fields",
  context_pasture: "neighboring pasture",
  context_dry_fields: "neighboring dry fields",
  context_hedge_copse: "neighboring hedge / copse",
};

function world(q, r) {
  return { x: SQRT3 * (q + r / 2), z: 1.5 * r };
}
function axialFromWorld(x, z) {
  const r = z / 1.5;
  return { q: x / SQRT3 - r / 2, r };
}
function roundAxial(q, r) {
  let x = Math.round(q);
  let z = Math.round(r);
  let y = Math.round(-q - r);
  const dx = Math.abs(x - q);
  const dz = Math.abs(z - r);
  const dy = Math.abs(y + q + r);
  if (dx > dy && dx > dz) x = -y - z;
  else if (dy > dz) y = -x - z;
  else z = -x - y;
  return { q: x, r: z };
}
function corners(center, radius = HEX_RADIUS) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = THREE.MathUtils.degToRad(-30 - index * 60);
    return { x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius };
  });
}
function surfaceCenterElevation(row) {
  return Number.isFinite(row.surface_center_elevation) ? row.surface_center_elevation : row.elevation;
}
function surfaceCornerElevations(row) {
  return Array.isArray(row.corner_elevations) && row.corner_elevations.length === 6
    ? row.corner_elevations
    : Array(6).fill(surfaceCenterElevation(row));
}
function barycentric(point, a, b, c) {
  const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  if (Math.abs(denominator) < 1e-9) return null;
  const wa = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / denominator;
  const wb = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / denominator;
  return { a: wa, b: wb, c: 1 - wa - wb };
}
function hash(x, z, salt = 0) {
  const value = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}
function smoothNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, ux), THREE.MathUtils.lerp(c, d, ux), uz);
}
function fractalNoise(x, z) {
  return smoothNoise(x, z) * 0.58 + smoothNoise(x * 2.03 + 13.2, z * 2.03 - 7.8) * 0.29
    + smoothNoise(x * 4.11 - 2.4, z * 4.11 + 9.1) * 0.13;
}

const targetParent = data.macro_parents.find((parent) => parent.hex_id === data.target.hex_id);
const originWorld = world(targetParent.center_q, targetParent.center_r);
const baseElevation = data.target.approved_elevation;
const rows = data.microhexes.map((row) => ({ ...row, world: world(row.q, row.r) }));
const rowsById = new Map(rows.map((row) => [row.micro_hex_id, row]));
const rowsByCoordinate = new Map(rows.map((row) => [`${row.q},${row.r}`, row]));
const targetRows = rows.filter((row) => row.is_target);
const estateRows = rows.filter((row) => row.is_estate);
const contextRows = rows.filter((row) => !row.is_estate);

function terrainElevationAt(x, z) {
  const axial = axialFromWorld(x, z);
  const rounded = roundAxial(axial.q, axial.r);
  const row = rowsByCoordinate.get(`${rounded.q},${rounded.r}`);
  if (!row) {
    let nearest = rows[0];
    let distance = Infinity;
    for (const candidate of rows) {
      const candidateDistance = Math.hypot(candidate.world.x - x, candidate.world.z - z);
      if (candidateDistance < distance) {
        nearest = candidate;
        distance = candidateDistance;
      }
    }
    return surfaceCenterElevation(nearest);
  }
  const worldCorners = corners(row.world);
  const cornerElevations = surfaceCornerElevations(row);
  for (let index = 0; index < 6; index += 1) {
    const next = (index + 1) % 6;
    const weights = barycentric({ x, z }, row.world, worldCorners[index], worldCorners[next]);
    if (!weights || Math.min(weights.a, weights.b, weights.c) < -0.001) continue;
    return surfaceCenterElevation(row) * weights.a + cornerElevations[index] * weights.b + cornerElevations[next] * weights.c;
  }
  return surfaceCenterElevation(row);
}
function localPosition(x, z, elevation, lift = 0) {
  return new THREE.Vector3(x - originWorld.x, (elevation - baseElevation) * HEIGHT_UNIT + lift, z - originWorld.z);
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = lightingTheme.exposure ?? 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(environmentTheme.void ?? "#34352e");
scene.fog = new THREE.FogExp2(environmentTheme.fog ?? "#68695c", 0.0088);
const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, 0.1, 520);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.screenSpacePanning = false;
controls.minDistance = 5;
controls.maxDistance = 340;
controls.minPolarAngle = 0.38;
controls.maxPolarAngle = 1.28;
controls.zoomToCursor = true;
if (locked2p5d) {
  controls.enableRotate = false;
  controls.screenSpacePanning = true;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.PAN;
}

const landscape = new THREE.Group();
scene.add(landscape);
const targetLayer = new THREE.Group();
const contextLayer = new THREE.Group();
const roadTargetLayer = new THREE.Group();
const roadEstateLayer = new THREE.Group();
const roadContextLayer = new THREE.Group();
const drainageLayer = new THREE.Group();
const boundaryLayer = new THREE.Group();
const vegetationTargetLayer = new THREE.Group();
const vegetationContextLayer = new THREE.Group();
const environmentTreeTargetLayer = new THREE.Group();
const environmentTreeContextLayer = new THREE.Group();
const environmentLowVegetationTargetLayer = new THREE.Group();
const environmentLowVegetationContextLayer = new THREE.Group();
const groundDetailLayer = new THREE.Group();
const groundDetailTargetLayer = new THREE.Group();
const groundDetailContextLayer = new THREE.Group();
const tenantStripTargetLayer = new THREE.Group();
const tenantStripContextLayer = new THREE.Group();
const tenantHoldingLayer = new THREE.Group();
const fieldSystemLayer = new THREE.Group();
const landRightsLayer = new THREE.Group();
const villageResidenceLayer = new THREE.Group();
const fieldActivityLayer = new THREE.Group();
const managedWaterLayer = new THREE.Group();
const proceduralGroundPatchLayer = new THREE.Group();
const environmentGroundPatchLayer = new THREE.Group();
const proceduralGroundPatchContextLayer = new THREE.Group();
const environmentGroundPatchContextLayer = new THREE.Group();
const proceduralClutterLayer = new THREE.Group();
const environmentClutterLayer = new THREE.Group();
const proceduralBoundaryArtLayer = new THREE.Group();
const environmentBoundaryArtLayer = new THREE.Group();
const structureLayer = new THREE.Group();
const contextStructureLayer = new THREE.Group();
const acreGridLayer = new THREE.Group();
landscape.add(
  targetLayer,
  contextLayer,
  groundDetailTargetLayer,
  groundDetailContextLayer,
  tenantStripTargetLayer,
  tenantStripContextLayer,
  fieldSystemLayer,
  tenantHoldingLayer,
  landRightsLayer,
  villageResidenceLayer,
  fieldActivityLayer,
  roadTargetLayer,
  roadEstateLayer,
  roadContextLayer,
  drainageLayer,
  boundaryLayer,
  vegetationTargetLayer,
  vegetationContextLayer,
  environmentTreeTargetLayer,
  environmentTreeContextLayer,
  environmentLowVegetationTargetLayer,
  environmentLowVegetationContextLayer,
  structureLayer,
  contextStructureLayer,
  managedWaterLayer,
  acreGridLayer,
);
groundDetailLayer.add(
  proceduralGroundPatchLayer,
  environmentGroundPatchLayer,
);
groundDetailTargetLayer.add(groundDetailLayer, proceduralClutterLayer, environmentClutterLayer);
groundDetailContextLayer.add(proceduralGroundPatchContextLayer, environmentGroundPatchContextLayer);
boundaryLayer.add(proceduralBoundaryArtLayer, environmentBoundaryArtLayer);

const ambient = new THREE.HemisphereLight(
  lightingTheme.hemisphereSky ?? "#cbbf9f",
  lightingTheme.hemisphereGround ?? "#35382f",
  lightingTheme.hemisphereIntensity ?? 1.32,
);
scene.add(ambient);
const sun = new THREE.DirectionalLight(
  lightingTheme.sun ?? "#d9bd88",
  lightingTheme.sunIntensity ?? 2.05,
);
sun.position.set(-38, 52, -30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -48;
sun.shadow.camera.right = 48;
sun.shadow.camera.top = 48;
sun.shadow.camera.bottom = -48;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 115;
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.052;
scene.add(sun);
const fillLight = new THREE.DirectionalLight(
  lightingTheme.fill ?? "#7d8c87",
  lightingTheme.fillIntensity ?? 0.24,
);
fillLight.position.set(30, 16, 28);
scene.add(fillLight);

function makeSky() {
  const geometry = new THREE.SphereGeometry(700, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(environmentTheme.skyTop ?? "#4f5d59") },
      horizonColor: { value: new THREE.Color(environmentTheme.horizon ?? "#7d7b68") },
      bottomColor: { value: new THREE.Color(environmentTheme.groundMist ?? "#9b8f72") },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorld = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      void main() {
        float h = normalize(vWorld).y;
        vec3 color = h > 0.0
          ? mix(horizonColor, topColor, smoothstep(0.0, 0.72, h))
          : mix(horizonColor, bottomColor, smoothstep(0.0, -0.35, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}
scene.add(makeSky());

function makeNoiseTexture(base = [188, 187, 156], contrast = 34, seed = 0) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  const image = context.createImageData(512, 512);
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 1) {
      const coarse = fractalNoise((x + seed * 17) / 47, (y - seed * 23) / 47);
      const grain = hash(x, y, seed);
      const value = (coarse - 0.5) * contrast + (grain - 0.5) * contrast * 0.28;
      const index = (y * 512 + x) * 4;
      image.data[index] = THREE.MathUtils.clamp(base[0] + value, 0, 255);
      image.data[index + 1] = THREE.MathUtils.clamp(base[1] + value, 0, 255);
      image.data[index + 2] = THREE.MathUtils.clamp(base[2] + value * 0.7, 0, 255);
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeReliefTexture(seed = 0) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  const image = context.createImageData(512, 512);
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 1) {
      const broad = fractalNoise((x + seed * 11) / 31, (y - seed * 7) / 31);
      const fine = hash(x, y, seed + 29);
      const root = Math.abs(Math.sin((x + broad * 18) * 0.19) * Math.cos((y - broad * 14) * 0.16));
      const value = THREE.MathUtils.clamp(112 + broad * 72 + fine * 31 + root * 18, 0, 255);
      const index = (y * 512 + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeIrregularAlphaTexture(seed = 0) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  const image = context.createImageData(256, 256);
  for (let y = 0; y < 256; y += 1) {
    for (let x = 0; x < 256; x += 1) {
      const dx = (x - 127.5) / 127.5;
      const dy = (y - 127.5) / 127.5;
      const radial = Math.hypot(dx, dy);
      const edgeNoise = fractalNoise((x + seed * 17) / 38, (y - seed * 13) / 38);
      const alpha = THREE.MathUtils.clamp((1.04 - radial + (edgeNoise - 0.5) * 0.34) * 4.2, 0, 1);
      const index = (y * 256 + x) * 4;
      image.data[index] = 255;
      image.data[index + 1] = 255;
      image.data[index + 2] = 255;
      image.data[index + 3] = Math.round(alpha * 255);
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function makeFoliageTexture(seed = 0) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  const image = context.createImageData(256, 256);
  for (let y = 0; y < 256; y += 1) {
    for (let x = 0; x < 256; x += 1) {
      const broad = fractalNoise((x + seed * 13) / 22, (y - seed * 9) / 22);
      const fleck = hash(x, y, seed + 37);
      const highlight = fleck > 0.86 ? 34 : (fleck < 0.12 ? -28 : 0);
      const index = (y * 256 + x) * 4;
      image.data[index] = THREE.MathUtils.clamp(188 + (broad - 0.5) * 62 + highlight, 0, 255);
      image.data[index + 1] = THREE.MathUtils.clamp(205 + (broad - 0.5) * 70 + highlight, 0, 255);
      image.data[index + 2] = THREE.MathUtils.clamp(174 + (broad - 0.5) * 48 + highlight * 0.6, 0, 255);
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1.7);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const terrainTexture = makeNoiseTexture([214, 209, 187], 38, 5);
terrainTexture.repeat.set(10, 10);
const terrainReliefTexture = makeReliefTexture(7);
terrainReliefTexture.repeat.set(13, 13);
const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  map: terrainTexture,
  bumpMap: terrainReliefTexture,
  bumpScale: 0.095,
  roughness: materialTheme.terrainRoughness ?? 0.95,
  metalness: 0,
  side: THREE.DoubleSide,
});
const foliageTexture = makeFoliageTexture(19);
const artTextureLoader = new THREE.TextureLoader();

function loadArtTexture(path, repeat = null) {
  const texture = artTextureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

const oakPilotTextures = [1, 2, 3, 4].map((index) => (
  loadArtTexture(`/assets/mapgen-landscape/vegetation/oak/english-oak-oblique-v2-${index}.png`)
));
const villageDwellingTexture = loadArtTexture("/assets/mapgen-manor-v2/sprites/civic/02-outer-close-dwellings.png");
const minorManorTexture = loadArtTexture("/assets/mapgen-manor-v2/sprites/rural/00-modest-lower-noble-hall.png");
const orchardTreeTextures = [1, 2, 3, 4].map((index) => (
  loadArtTexture(`/assets/mapgen-landscape/vegetation/orchard/orchard-apple-v1-${index}.png`)
));
const hedgerowTextures = [1, 2, 3, 4].map((index) => (
  loadArtTexture(`/assets/mapgen-landscape/vegetation/hedgerow/hedgerow-shrub-v1-${index}.png`)
));
const groundcoverTextures = [1, 2, 3, 4].map((index) => (
  loadArtTexture(`/assets/mapgen-landscape/vegetation/groundcover/groundcover-v1-${index}.png`)
));
const clutterTextures = [1, 2, 3, 4].map((index) => (
  loadArtTexture(`/assets/mapgen-landscape/vegetation/rural-clutter/rural-clutter-v1-${index}.png`)
));
const singleHexAssetTextures = new Map(
  (singleHexAssetContract?.assets || []).map((asset) => [
    asset.asset_id,
    loadArtTexture(asset.art_path),
  ]),
);
const pearwickHallArtTexture = singleHexAssetTextures.get("pearwick_hall_solar_001")
  || loadArtTexture("/assets/mapgen-manor-v2/sprites/lesserLord/00-pearwick-great-hall-and-solar.png");
const environmentMaterialTextures = {
  pasture: loadArtTexture("/assets/mapgen-landscape/materials/pasture-meadow-v1-1024.jpg", [2.6, 2.6]),
  arable: loadArtTexture("/assets/mapgen-landscape/materials/worked-arable-v1-1024.jpg", [2.4, 2.4]),
  damp: loadArtTexture("/assets/mapgen-landscape/materials/damp-swale-v1-1024.jpg", [2.5, 2.5]),
  copse: loadArtTexture("/assets/mapgen-landscape/materials/copse-floor-v1-1024.jpg", [2.5, 2.5]),
  yard: loadArtTexture("/assets/mapgen-landscape/materials/estate-yard-v1-1024.jpg", [2.7, 2.7]),
  dry: loadArtTexture("/assets/mapgen-landscape/materials/dry-ridge-v1-1024.jpg", [2.5, 2.5]),
  wood: loadArtTexture("/assets/mapgen-landscape/materials/weathered-oak-v1-1024.jpg", [2.2, 1.2]),
  stone: loadArtTexture("/assets/mapgen-landscape/materials/fieldstone-v1-1024.jpg", [2.4, 1.7]),
};
const oakShadowTexture = makeIrregularAlphaTexture(84);

const cornerColorContributions = new Map();
for (const row of rows) {
  const color = new THREE.Color(landColors[row.land_use] ?? 0x7f805f);
  for (const vertexId of row.terrain_vertex_ids || []) {
    if (!cornerColorContributions.has(vertexId)) cornerColorContributions.set(vertexId, []);
    cornerColorContributions.get(vertexId).push(color);
  }
}
const cornerColors = new Map();
for (const [vertexId, values] of cornerColorContributions) {
  const color = new THREE.Color();
  for (const value of values) color.add(value);
  color.multiplyScalar(1 / values.length);
  cornerColors.set(vertexId, color);
}

function buildTerrainMesh(sourceRows, name) {
  const vertexMap = new Map();
  const vertices = [];
  const colorSums = [];
  const colorCounts = [];
  const indices = [];
  const uvs = [];

  function vertexIndex(x, z, elevation, color) {
    const visualElevation = elevation + (fractalNoise(x * 1.35, z * 1.35) - 0.5) * 0.075;
    const position = localPosition(x, z, visualElevation);
    const key = `${position.x.toFixed(5)},${position.z.toFixed(5)}`;
    let index = vertexMap.get(key);
    if (index === undefined) {
      index = vertices.length / 3;
      vertexMap.set(key, index);
      vertices.push(position.x, position.y, position.z);
      uvs.push(position.x / 8, position.z / 8);
      colorSums.push(color.r, color.g, color.b);
      colorCounts.push(1);
    } else {
      colorSums[index * 3] += color.r;
      colorSums[index * 3 + 1] += color.g;
      colorSums[index * 3 + 2] += color.b;
      colorCounts[index] += 1;
    }
    return index;
  }

  for (const row of sourceRows) {
    const center = row.world;
    const worldCorners = corners(center);
    const elevations = surfaceCornerElevations(row);
    const centerElevation = surfaceCenterElevation(row);
    const centerColor = new THREE.Color(landColors[row.land_use] ?? 0x7f805f);
    const ids = row.terrain_vertex_ids || [];
    for (let wedge = 0; wedge < 6; wedge += 1) {
      const next = (wedge + 1) % 6;
      const colorB = cornerColors.get(ids[wedge]) || centerColor;
      const colorC = cornerColors.get(ids[next]) || centerColor;
      const wedgeIndices = new Map();
      for (let i = 0; i <= TERRAIN_SUBDIVISIONS; i += 1) {
        for (let j = 0; j <= TERRAIN_SUBDIVISIONS - i; j += 1) {
          const wb = i / TERRAIN_SUBDIVISIONS;
          const wc = j / TERRAIN_SUBDIVISIONS;
          const wa = 1 - wb - wc;
          const x = center.x * wa + worldCorners[wedge].x * wb + worldCorners[next].x * wc;
          const z = center.z * wa + worldCorners[wedge].z * wb + worldCorners[next].z * wc;
          const elevation = centerElevation * wa + elevations[wedge] * wb + elevations[next] * wc;
          const color = centerColor.clone().multiplyScalar(wa).add(colorB.clone().multiplyScalar(wb)).add(colorC.clone().multiplyScalar(wc));
          const mottling = 0.88 + fractalNoise(x * 0.8, z * 0.8) * 0.19;
          color.multiplyScalar(mottling);
          wedgeIndices.set(`${i},${j}`, vertexIndex(x, z, elevation, color));
        }
      }
      for (let i = 0; i < TERRAIN_SUBDIVISIONS; i += 1) {
        for (let j = 0; j < TERRAIN_SUBDIVISIONS - i; j += 1) {
          const a = wedgeIndices.get(`${i},${j}`);
          const b = wedgeIndices.get(`${i + 1},${j}`);
          const c = wedgeIndices.get(`${i},${j + 1}`);
          indices.push(a, c, b);
          if (i + j <= TERRAIN_SUBDIVISIONS - 2) {
            const d = wedgeIndices.get(`${i + 1},${j + 1}`);
            indices.push(b, c, d);
          }
        }
      }
    }
  }
  const colors = [];
  for (let index = 0; index < colorCounts.length; index += 1) {
    colors.push(
      colorSums[index * 3] / colorCounts[index],
      colorSums[index * 3 + 1] / colorCounts[index],
      colorSums[index * 3 + 2] / colorCounts[index],
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, terrainMaterial);
  mesh.name = name;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

const targetTerrain = buildTerrainMesh(estateRows, "estate-terrain");
const contextTerrain = buildTerrainMesh(contextRows, "context-terrain");
targetLayer.add(targetTerrain);
contextLayer.add(contextTerrain);
const terrainMeshes = [targetTerrain, contextTerrain];

const elevationMinimum = Math.min(...rows.flatMap((row) => [surfaceCenterElevation(row), ...surfaceCornerElevations(row)]));
const underlayTexture = makeNoiseTexture([102, 104, 76], 28, 9);
underlayTexture.repeat.set(18, 18);
const underlay = new THREE.Mesh(
  new THREE.PlaneGeometry(380, 380, 1, 1),
  new THREE.MeshStandardMaterial({ map: underlayTexture, color: 0x62684e, roughness: 1 }),
);
underlay.rotation.x = -Math.PI / 2;
underlay.position.y = (elevationMinimum - baseElevation) * HEIGHT_UNIT - 0.45;
underlay.receiveShadow = true;
landscape.add(underlay);

function buildTerrainSkirt(sourceRows) {
  const positions = [];
  const indices = [];
  const bottomY = underlay.position.y + 0.02;
  const sourceIds = new Set(sourceRows.map((row) => row.micro_hex_id));
  for (const row of sourceRows) {
    const worldCorners = corners(row.world);
    const elevations = surfaceCornerElevations(row);
    for (let edge = 0; edge < 6; edge += 1) {
      const neighborId = row.neighbor_ids?.[edge];
      if (neighborId && sourceIds.has(neighborId)) continue;
      const [aIndex, bIndex] = edgeCorners[edge];
      const a = worldCorners[aIndex];
      const b = worldCorners[bIndex];
      const aElevation = elevations[aIndex] + (fractalNoise(a.x * 1.35, a.z * 1.35) - 0.5) * 0.075;
      const bElevation = elevations[bIndex] + (fractalNoise(b.x * 1.35, b.z * 1.35) - 0.5) * 0.075;
      const topA = localPosition(a.x, a.z, aElevation);
      const topB = localPosition(b.x, b.z, bElevation);
      const offset = positions.length / 3;
      positions.push(
        topA.x, topA.y, topA.z,
        topB.x, topB.y, topB.z,
        topA.x, bottomY, topA.z,
        topB.x, bottomY, topB.z,
      );
      indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const skirt = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x555a42, roughness: 1, side: THREE.DoubleSide }),
  );
  skirt.receiveShadow = true;
  return skirt;
}
const targetTerrainSkirt = buildTerrainSkirt(estateRows);
const loadedTerrainSkirt = buildTerrainSkirt(rows);
targetLayer.add(targetTerrainSkirt);
contextLayer.add(loadedTerrainSkirt);

function addGroundMaterialPatches(sourceRows, isTarget) {
  const alphaMap = makeIrregularAlphaTexture(isTarget ? 17 : 23);
  const patchFamilies = [
    {
      key: "worked-earth",
      match: (row) => /(tenant_strip_fields|demesne_open_fields|dry_ridge_fields|context_open_fields|context_dry_fields)/.test(row.land_use),
      color: 0x6d5030,
      opacity: isTarget ? 0.12 : 0.065,
      count: isTarget ? 4 : 2,
    },
    {
      key: "lush-sward",
      match: (row) => /(pasture|meadow|orchard|village_garden_margin|village_lane_green)/.test(row.land_use),
      color: 0x315335,
      opacity: isTarget ? 0.14 : 0.075,
      count: isTarget ? 3 : 1,
    },
    {
      key: "damp-ground",
      match: (row) => /(damp_meadow_swale|pond_well)/.test(row.land_use),
      color: 0x294b43,
      opacity: isTarget ? 0.21 : 0.12,
      count: isTarget ? 4 : 2,
    },
    {
      key: "yard-wear",
      match: (row) => /(service_yard|estate_house|farm_lane|village_communal_core|village_toft_croft)/.test(row.land_use),
      color: 0x5b452f,
      opacity: 0.26,
      count: 4,
    },
  ];
  const geometry = new THREE.CircleGeometry(0.66, 14);
  const dummy = new THREE.Object3D();
  for (const family of patchFamilies) {
    const placements = [];
    for (const row of sourceRows) {
      if (!family.match(row)) continue;
      for (let index = 0; index < family.count; index += 1) {
        const angle = hash(row.q, row.r, 140 + index) * Math.PI * 2;
        const radius = Math.sqrt(hash(row.r, row.q, 150 + index)) * 0.66;
        placements.push({
          x: row.world.x + Math.cos(angle) * radius,
          z: row.world.z + Math.sin(angle) * radius,
          rotation: hash(row.q + index, row.r, 160) * Math.PI,
          sx: 0.20 + hash(row.r, row.q + index, 164) * 0.34,
          sz: 0.14 + hash(row.q, row.r + index, 166) * 0.28,
        });
      }
    }
    if (!placements.length) continue;
    const material = new THREE.MeshStandardMaterial({
      color: family.color,
      alphaMap,
      transparent: true,
      opacity: family.opacity,
      roughness: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const patches = new THREE.InstancedMesh(geometry, material, placements.length);
    patches.name = `${isTarget ? "target" : "context"}-${family.key}-patches`;
    placements.forEach((placement, index) => {
      const point = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z), 0.009);
      dummy.position.copy(point);
      dummy.rotation.set(-Math.PI / 2, 0, placement.rotation);
      dummy.scale.set(placement.sx, placement.sz, 1);
      dummy.updateMatrix();
      patches.setMatrixAt(index, dummy.matrix);
    });
    patches.receiveShadow = true;
    (isTarget ? proceduralGroundPatchLayer : proceduralGroundPatchContextLayer).add(patches);
  }
}
addGroundMaterialPatches(estateRows, true);
addGroundMaterialPatches(contextRows, false);

function addEnvironmentGroundPatches(sourceRows, isTarget) {
  const alphaMap = makeIrregularAlphaTexture(isTarget ? 117 : 123);
  const families = [
    {
      key: "arable",
      match: (row) => /(tenant_strip_fields|demesne_open_fields|context_open_fields)/.test(row.land_use),
      texture: environmentMaterialTextures.arable,
      tint: 0xe3dac5,
    },
    {
      key: "dry",
      match: (row) => /(dry_ridge_fields|context_dry_fields)/.test(row.land_use),
      texture: environmentMaterialTextures.dry,
      tint: 0xdfd8c7,
    },
    {
      key: "pasture",
      match: (row) => /(pasture_meadow|context_pasture|village_garden_margin|village_lane_green)/.test(row.land_use),
      texture: environmentMaterialTextures.pasture,
      tint: 0xd4d9bd,
    },
    {
      key: "damp",
      match: (row) => /(damp_meadow_swale|pond_well)/.test(row.land_use),
      texture: environmentMaterialTextures.damp,
      tint: 0xc5d0bf,
    },
    {
      key: "copse",
      match: (row) => /(boundary_hedge_copse|context_hedge_copse)/.test(row.land_use),
      texture: environmentMaterialTextures.copse,
      tint: 0xc9c9b8,
    },
    {
      key: "orchard",
      match: (row) => row.land_use === "orchard_kitchen_garden",
      texture: environmentMaterialTextures.pasture,
      tint: 0xc7d0b2,
    },
    {
      key: "yard",
      match: (row) => /(service_yard|estate_house|farm_lane|village_communal_core|village_toft_croft)/.test(row.land_use),
      texture: environmentMaterialTextures.yard,
      tint: 0xd7cbb7,
    },
  ];
  const geometry = new THREE.CircleGeometry(1.88, 28);
  const dummy = new THREE.Object3D();
  for (const family of families) {
    const placements = [];
    for (const row of sourceRows) {
      if (!family.match(row)) continue;
      const count = 1;
      for (let index = 0; index < count; index += 1) {
        const angle = hash(row.q, row.r, 271 + index) * Math.PI * 2;
        const radius = Math.sqrt(hash(row.r, row.q, 278 + index)) * 0.09;
        placements.push({
          x: row.world.x + Math.cos(angle) * radius,
          z: row.world.z + Math.sin(angle) * radius,
          rotation: hash(row.q + index, row.r, 281) * Math.PI * 2,
          scale: 0.94 + hash(row.r, row.q + index, 284) * 0.16,
        });
      }
    }
    if (!placements.length) continue;
    const material = new THREE.MeshStandardMaterial({
      map: family.texture,
      alphaMap,
      color: family.tint,
      transparent: true,
      opacity: isTarget ? 0.18 : 0.14,
      roughness: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const patches = new THREE.InstancedMesh(geometry, material, placements.length);
    placements.forEach((placement, index) => {
      const point = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z), 0.012);
      dummy.position.copy(point);
      dummy.rotation.set(-Math.PI / 2, 0, placement.rotation);
      dummy.scale.setScalar(placement.scale);
      dummy.updateMatrix();
      patches.setMatrixAt(index, dummy.matrix);
    });
    patches.receiveShadow = true;
    patches.frustumCulled = false;
    (isTarget ? environmentGroundPatchLayer : environmentGroundPatchContextLayer).add(patches);
  }
}
addEnvironmentGroundPatches(estateRows, true);
addEnvironmentGroundPatches(contextRows, false);

function tenantFieldAngle(row) {
  if (Number.isFinite(row.field_system_number)) {
    const system = row.field_system_number;
    const orientation = (system - 1) % 3;
    return orientation * Math.PI / 3 + (hash(system, 0, 611) - 0.5) * 0.08;
  }
  const blockQ = Math.floor((row.local_q + 9) / 4);
  const blockR = Math.floor((row.local_r + 9) / 4);
  const orientation = Math.abs(blockQ + blockR * 2) % 3;
  return orientation * Math.PI / 3 + (hash(blockQ, blockR, 611) - 0.5) * 0.10;
}

function addTenantStripFabric(sourceRows, destinationLayer) {
  const tenantRows = sourceRows.filter((row) => row.land_use === "tenant_strip_fields");
  const tenantIds = new Set(tenantRows.map((row) => row.micro_hex_id));
  const furrowPlacements = [];
  const balkSegments = [];

  for (const row of tenantRows) {
    const angle = tenantFieldAngle(row);
    const perpendicular = { x: -Math.sin(angle), z: Math.cos(angle) };
    for (const offset of [-0.23, 0, 0.23]) {
      furrowPlacements.push({
        x: row.world.x + perpendicular.x * offset,
        z: row.world.z + perpendicular.z * offset,
        angle,
        scale: 0.90 + hash(row.q, row.r, 617 + Math.round((offset + 0.23) * 10)) * 0.15,
      });
    }

    const worldCorners = corners(row.world, 0.91);
    for (let edge = 0; edge < 6; edge += 1) {
      const neighborId = row.neighbor_ids?.[edge];
      const neighbor = neighborId ? rowsById.get(neighborId) : null;
      if (neighborId && tenantIds.has(neighborId)) {
        if (row.micro_hex_id > neighborId) continue;
        if (Math.abs(tenantFieldAngle(neighbor) - angle) < 0.18) continue;
      }
      const [aIndex, bIndex] = edgeCorners[edge];
      const a = worldCorners[aIndex];
      const b = worldCorners[bIndex];
      balkSegments.push({ a, b });
    }
  }

  const furrowMaterial = new THREE.MeshBasicMaterial({
    color: 0x4f3824,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const furrows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1.38, 0.035),
    furrowMaterial,
    furrowPlacements.length,
  );
  const dummy = new THREE.Object3D();
  furrowPlacements.forEach((placement, index) => {
    dummy.position.copy(localPosition(
      placement.x,
      placement.z,
      terrainElevationAt(placement.x, placement.z),
      0.022,
    ));
    dummy.rotation.set(-Math.PI / 2, 0, placement.angle);
    dummy.scale.set(placement.scale, 1, 1);
    dummy.updateMatrix();
    furrows.setMatrixAt(index, dummy.matrix);
  });
  furrows.name = "tenant strip ridge and furrow";
  furrows.frustumCulled = false;
  destinationLayer.add(furrows);

  const balkMaterial = new THREE.MeshBasicMaterial({
    color: 0x65704a,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -6,
  });
  for (const { a, b } of balkSegments) {
    const midpoint = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const balk = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.hypot(dx, dz), 0.055),
      balkMaterial,
    );
    balk.position.copy(localPosition(
      midpoint.x,
      midpoint.z,
      terrainElevationAt(midpoint.x, midpoint.z),
      0.025,
    ));
    balk.rotation.set(-Math.PI / 2, 0, Math.atan2(dz, dx));
    balk.renderOrder = 3;
    destinationLayer.add(balk);
  }
}
addTenantStripFabric(estateRows, tenantStripTargetLayer);
addTenantStripFabric(contextRows, tenantStripContextLayer);

function addFieldTenureVisualization() {
  const geometry = new THREE.PlaneGeometry(1.48, 1.12);
  const alphaMap = makeIrregularAlphaTexture(619);
  const treatments = [
    {
      name: "tenant strip field working",
      match: (row) => row.land_use === "tenant_strip_fields",
      colors: [0x8a7443, 0x765f37, 0x9a8047],
      opacity: 0.12,
      scaleX: 0.90,
      scaleZ: 0.70,
    },
    {
      name: "demesne field working",
      match: (row) => row.land_use === "demesne_open_fields",
      colors: [0xa0874e, 0x8c7040, 0xaa9156],
      opacity: 0.16,
      scaleX: 1.02,
      scaleZ: 0.90,
    },
    {
      name: "dry ridge cultivation",
      match: (row) => row.land_use === "dry_ridge_fields",
      colors: [0x836a3f, 0x735b37],
      opacity: 0.11,
      scaleX: 0.96,
      scaleZ: 0.78,
    },
  ];
  const dummy = new THREE.Object3D();
  for (const treatment of treatments) {
    const treatmentRows = estateRows.filter(treatment.match);
    for (const [colorIndex, color] of treatment.colors.entries()) {
      const placements = treatmentRows.filter((row) => (
        Math.floor(hash(row.q, row.r, 621) * treatment.colors.length) === colorIndex
      ));
      if (!placements.length) continue;
      const material = new THREE.MeshStandardMaterial({
        color,
        alphaMap,
        transparent: true,
        opacity: treatment.opacity,
        roughness: 1,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
      const patches = new THREE.InstancedMesh(geometry, material, placements.length);
      patches.name = treatment.name;
      placements.forEach((row, index) => {
        dummy.position.copy(localPosition(
          row.world.x,
          row.world.z,
          terrainElevationAt(row.world.x, row.world.z),
          0.015,
        ));
        dummy.rotation.set(-Math.PI / 2, 0, tenantFieldAngle(row));
        dummy.scale.set(
          treatment.scaleX * (0.92 + hash(row.q, row.r, 625) * 0.14),
          treatment.scaleZ * (0.90 + hash(row.r, row.q, 627) * 0.18),
          1,
        );
        dummy.updateMatrix();
        patches.setMatrixAt(index, dummy.matrix);
      });
      patches.frustumCulled = false;
      patches.renderOrder = 3;
      tenantHoldingLayer.add(patches);
    }
  }
}
addFieldTenureVisualization();

function addFieldSystemVisualization() {
  const palette = [0x8d7747, 0x75673f, 0x9a8550, 0x6f7044, 0x92724a, 0x7d8350];
  for (const fieldSystem of data.interpretation?.field_systems || []) {
    const systemRows = fieldSystem.micro_hex_ids.map((id) => rowsById.get(id)).filter(Boolean);
    if (!systemRows.length) continue;
    const positions = [];
    const indices = [];
    for (const row of systemRows) {
      const center = localPosition(
        row.world.x,
        row.world.z,
        terrainElevationAt(row.world.x, row.world.z),
        0.006,
      );
      const rowCorners = corners(row.world, 0.98).map((corner) => localPosition(
        corner.x,
        corner.z,
        terrainElevationAt(corner.x, corner.z),
        0.006,
      ));
      const offset = positions.length / 3;
      positions.push(center.x, center.y, center.z);
      for (const corner of rowCorners) positions.push(corner.x, corner.y, corner.z);
      for (let index = 0; index < 6; index += 1) {
        indices.push(offset, offset + 1 + index, offset + 1 + ((index + 1) % 6));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: palette[(fieldSystem.field_system_number - 1) % palette.length],
        transparent: true,
        opacity: 0.075,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    );
    mesh.name = `field system ${String(fieldSystem.field_system_number).padStart(2, "0")}`;
    mesh.renderOrder = 2;
    fieldSystemLayer.add(mesh);
  }
}
addFieldSystemVisualization();

function addLandRightsVisualization() {
  const geometry = new THREE.PlaneGeometry(1.54, 1.18);
  const alphaMap = makeIrregularAlphaTexture(631);
  const treatments = [
    { kind: "tenant_hay_meadow_allotment", color: 0x7f8852, opacity: 0.10, texture: environmentMaterialTextures.pasture },
    { kind: "common_grazing", color: 0x60784e, opacity: 0.18, texture: environmentMaterialTextures.pasture },
    { kind: "common_hay_and_aftermath", color: 0x657957, opacity: 0.14, texture: environmentMaterialTextures.pasture },
    { kind: "common_estovers", color: 0x455b40, opacity: 0.16, texture: environmentMaterialTextures.copse },
  ];
  const dummy = new THREE.Object3D();
  for (const treatment of treatments) {
    const rightRows = estateRows.filter((row) => row.use_right_kind === treatment.kind);
    if (!rightRows.length) continue;
    const material = new THREE.MeshStandardMaterial({
      map: treatment.texture,
      alphaMap,
      color: treatment.color,
      transparent: true,
      opacity: treatment.opacity,
      roughness: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const patches = new THREE.InstancedMesh(geometry, material, rightRows.length);
    patches.name = treatment.kind.replaceAll("_", " ");
    rightRows.forEach((row, index) => {
      dummy.position.copy(localPosition(
        row.world.x,
        row.world.z,
        terrainElevationAt(row.world.x, row.world.z),
        0.014,
      ));
      dummy.rotation.set(-Math.PI / 2, 0, hash(row.q, row.r, 637) * Math.PI);
      dummy.scale.set(
        0.94 + hash(row.q, row.r, 641) * 0.16,
        0.88 + hash(row.r, row.q, 643) * 0.18,
        1,
      );
      dummy.updateMatrix();
      patches.setMatrixAt(index, dummy.matrix);
    });
    patches.frustumCulled = false;
    patches.renderOrder = 2;
    landRightsLayer.add(patches);
  }
}
addLandRightsVisualization();

function addFieldWorkers() {
  const isWorkedField = (row) => /(tenant_strip_fields|demesne_open_fields|dry_ridge_fields)/.test(row.land_use);
  const targetCandidates = targetRows
    .filter(isWorkedField)
    .sort((a, b) => hash(b.q, b.r, 647) - hash(a.q, a.r, 647))
    .slice(0, 6);
  const estateCandidates = estateRows
    .filter((row) => !row.is_target && isWorkedField(row))
    .sort((a, b) => hash(b.q, b.r, 653) - hash(a.q, a.r, 653))
    .slice(0, 10);
  const placements = [...targetCandidates, ...estateCandidates];
  const clothing = [
    new THREE.MeshStandardMaterial({ color: 0x5a5140, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x59604a, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x69503b, roughness: 1 }),
  ];
  const skin = new THREE.MeshStandardMaterial({ color: 0xb58b68, roughness: 1 });
  const straw = new THREE.MeshStandardMaterial({ color: 0x9a7d45, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b402a, roughness: 1 });
  for (const [index, row] of placements.entries()) {
    const angle = tenantFieldAngle(row);
    const across = { x: -Math.sin(angle), z: Math.cos(angle) };
    const along = { x: Math.cos(angle), z: Math.sin(angle) };
    const x = row.world.x + across.x * (hash(row.q, row.r, 659) - 0.5) * 0.86
      + along.x * (hash(row.r, row.q, 661) - 0.5) * 0.62;
    const z = row.world.z + across.z * (hash(row.q, row.r, 659) - 0.5) * 0.86
      + along.z * (hash(row.r, row.q, 661) - 0.5) * 0.62;
    const base = localPosition(x, z, terrainElevationAt(x, z), 0.01);
    const scale = 0.82 + hash(row.q, row.r, 663) * 0.24;
    const worker = new THREE.Group();
    worker.name = "field worker";
    worker.position.copy(base);
    worker.rotation.y = angle + (hash(row.q, row.r, 667) - 0.5) * 0.5;
    worker.scale.setScalar(scale);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.065, 0.18, 7),
      clothing[index % clothing.length],
    );
    body.position.y = 0.12;
    body.rotation.z = index % 3 === 0 ? 0.18 : 0;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.043, 7, 5), skin);
    head.position.set(index % 3 === 0 ? 0.025 : 0, 0.245, 0);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.071, 0.071, 0.012, 10), straw);
    brim.position.copy(head.position).add(new THREE.Vector3(0, 0.044, 0));
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.050, 0.038, 9), straw);
    crown.position.copy(brim.position).add(new THREE.Vector3(0, 0.023, 0));
    const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.34, 5), wood);
    tool.position.set(0.085, 0.13, 0);
    tool.rotation.z = index % 3 === 0 ? 1.05 : 0.58;
    for (const mesh of [body, head, brim, crown, tool]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      worker.add(mesh);
    }
    fieldActivityLayer.add(worker);
  }
}
addFieldWorkers();

function addManagedWaterFeature() {
  const row = targetRows.find((candidate) => candidate.land_use === "pond_well");
  if (!row) return;
  const elevation = terrainElevationAt(row.world.x, row.world.z);
  const base = localPosition(row.world.x, row.world.z, elevation, 0.032);
  const sharedWaterCanvas = window.MERECROSS_SHARED_WATER?.createCanvas?.(512);
  const sharedWaterTexture = sharedWaterCanvas ? new THREE.CanvasTexture(sharedWaterCanvas) : null;
  if (sharedWaterTexture) {
    sharedWaterTexture.colorSpace = THREE.SRGBColorSpace;
    sharedWaterTexture.wrapS = THREE.RepeatWrapping;
    sharedWaterTexture.wrapT = THREE.RepeatWrapping;
    sharedWaterTexture.repeat.set(1.25, 1.25);
    sharedWaterTexture.generateMipmaps = false;
    sharedWaterTexture.minFilter = THREE.LinearFilter;
    sharedWaterTexture.magFilter = THREE.LinearFilter;
  }
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 32),
    new THREE.MeshStandardMaterial({
      color: waterTheme.deep ?? "#465f61",
      map: sharedWaterTexture,
      roughness: 0.82,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  water.name = "managed pond water";
  water.position.copy(base);
  water.rotation.x = -Math.PI / 2;
  water.scale.set(1.18, 0.76, 1);
  water.renderOrder = 8;
  managedWaterLayer.add(water);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.055, 6, 28),
    new THREE.MeshStandardMaterial({
      map: environmentMaterialTextures.stone,
      bumpMap: environmentMaterialTextures.stone,
      bumpScale: 0.025,
      color: 0x746d59,
      roughness: 1,
    }),
  );
  rim.name = "pond stone and earth rim";
  rim.position.copy(base);
  rim.position.y += 0.018;
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.18, 0.76, 1);
  rim.castShadow = true;
  rim.receiveShadow = true;
  managedWaterLayer.add(rim);

  const wellBase = base.clone().add(new THREE.Vector3(0.44, 0.05, -0.24));
  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.15, 0.16, 12, 1, true),
    new THREE.MeshStandardMaterial({
      map: environmentMaterialTextures.stone,
      bumpMap: environmentMaterialTextures.stone,
      bumpScale: 0.03,
      color: 0x827966,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  well.name = "low stone wellhead";
  well.position.copy(wellBase);
  well.castShadow = true;
  well.receiveShadow = true;
  managedWaterLayer.add(well);
}
addManagedWaterFeature();

function makeRoadTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  context.fillStyle = "#aa8d68";
  context.fillRect(0, 0, 256, 512);
  const image = context.getImageData(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 256; x += 1) {
      const index = (y * 256 + x) * 4;
      const coarse = fractalNoise(x / 28, y / 54);
      const pebble = hash(x, y, 23);
      const edge = Math.pow(Math.abs(x / 128 - 1), 2);
      const value = (coarse - 0.5) * 30 + (pebble > 0.985 ? 24 : 0) - edge * 12;
      image.data[index] = THREE.MathUtils.clamp(image.data[index] + value, 0, 255);
      image.data[index + 1] = THREE.MathUtils.clamp(image.data[index + 1] + value * 0.83, 0, 255);
      image.data[index + 2] = THREE.MathUtils.clamp(image.data[index + 2] + value * 0.55, 0, 255);
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
const roadTexture = makeRoadTexture();
const roadReliefTexture = makeReliefTexture(31);
roadReliefTexture.repeat.set(2, 7);
const roadMaterials = {
  manor_road: new THREE.MeshStandardMaterial({ map: roadTexture, bumpMap: roadReliefTexture, bumpScale: 0.075, color: routeTheme.bed ?? "#806343", roughness: 0.99, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  manor_link_road: new THREE.MeshStandardMaterial({ map: roadTexture, bumpMap: roadReliefTexture, bumpScale: 0.055, color: routeTheme.bed ?? "#806343", roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  manor_drive: new THREE.MeshStandardMaterial({ map: roadTexture, bumpMap: roadReliefTexture, bumpScale: 0.06, color: routeTheme.bed ?? "#806343", roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  farm_track: new THREE.MeshStandardMaterial({ map: roadTexture, bumpMap: roadReliefTexture, bumpScale: 0.045, color: routeTheme.bed ?? "#806343", roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  footpath: new THREE.MeshStandardMaterial({ map: roadTexture, color: routeTheme.wear ?? "#a28760", roughness: 1, transparent: true, opacity: 0.54, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
};
const vergeMaterial = new THREE.MeshStandardMaterial({ map: terrainTexture, color: routeTheme.verge ?? "#4c4938", roughness: 1, transparent: true, opacity: 0.72, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const rutMaterial = new THREE.MeshStandardMaterial({ color: 0x4c3828, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
const roadStyles = {
  manor_road: { width: 0.31, verge: 0.14, spacing: 0.11, crown: 0.022, rutDepth: 0.012, tension: 0.54, simplify: 1.35 },
  manor_link_road: { width: 0.23, verge: 0.10, spacing: 0.10, crown: 0.016, rutDepth: 0.010, tension: 0.52, simplify: 0.52 },
  manor_drive: { width: 0.21, verge: 0.09, spacing: 0.09, crown: 0.015, rutDepth: 0.010, tension: 0.48, simplify: 0.18 },
  farm_track: { width: 0.13, verge: 0.055, spacing: 0.08, crown: 0.009, rutDepth: 0.011, tension: 0.5, simplify: 0.16 },
  footpath: { width: 0.065, verge: 0.024, spacing: 0.07, crown: 0.004, rutDepth: 0.002, tension: 0.52, simplify: 0.14 },
};
function sampleSmoothedGrade(centerline) {
  const raw = centerline.map((point) => terrainElevationAt(point.x, point.y));
  const smoothed = raw.map((value, index) => {
    if (index === 0 || index === raw.length - 1) return value;
    let weight = 0;
    let total = 0;
    for (let offset = -4; offset <= 4; offset += 1) {
      const sampleIndex = THREE.MathUtils.clamp(index + offset, 0, raw.length - 1);
      const sampleWeight = 5 - Math.abs(offset);
      total += raw[sampleIndex] * sampleWeight;
      weight += sampleWeight;
    }
    return total / weight;
  });
  return (distance) => {
    if (distance <= centerline[0].distance) return smoothed[0];
    if (distance >= centerline.at(-1).distance) return smoothed.at(-1);
    let low = 0;
    let high = centerline.length - 1;
    while (low + 1 < high) {
      const middle = (low + high) >> 1;
      if (centerline[middle].distance <= distance) low = middle;
      else high = middle;
    }
    const t = (distance - centerline[low].distance) / (centerline[high].distance - centerline[low].distance);
    return THREE.MathUtils.lerp(smoothed[low], smoothed[high], t);
  };
}
function roadMeshToThree(mesh, material, name) {
  if (!mesh?.positions?.length || !mesh.indices?.length) return null;
  const positions = [];
  for (let index = 0; index < mesh.positions.length; index += 3) {
    const position = localPosition(mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]);
    positions.push(position.x, position.y, position.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(mesh.uvs, 2));
  geometry.setIndex(mesh.indices);
  geometry.computeVertexNormals();
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}
function buildRoadDeck(centerline, style, desiredGrade, material, name, lateralShift = 0, rawLift = 0.13) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index < centerline.length; index += 1) {
    const previous = centerline[Math.max(0, index - 1)];
    const next = centerline[Math.min(centerline.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.y - previous.y;
    const length = Math.max(1e-6, Math.hypot(dx, dz));
    const normalX = -dz / length;
    const normalZ = dx / length;
    const elevation = desiredGrade(centerline[index].distance) + rawLift;
    for (const side of [-1, 1]) {
      const lateral = lateralShift + style.width * 0.46 * side;
      const x = centerline[index].x + normalX * lateral;
      const z = centerline[index].y + normalZ * lateral;
      const point = localPosition(x, z, elevation);
      positions.push(point.x, point.y, point.z);
      uvs.push(centerline[index].distance / 1.2, side < 0 ? 0 : 1);
    }
    if (index < centerline.length - 1) {
      const a = index * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, c, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const deck = new THREE.Mesh(geometry, material);
  deck.name = name;
  deck.castShadow = true;
  deck.receiveShadow = true;
  deck.renderOrder = 4;
  return deck;
}
function splitRouteByScope(route) {
  const segments = [];
  let current = null;
  for (const id of route.micro_hex_ids) {
    const row = rowsById.get(id);
    if (!row) continue;
    const scope = row.is_target ? "focus" : row.is_estate ? "estate" : "context";
    if (!current || current.scope !== scope) {
      current = { scope, rows: [] };
      segments.push(current);
    }
    current.rows.push(row);
  }
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const previous = segments[index - 1];
    const next = segments[index + 1];
    if (previous) segment.rows.unshift(previous.rows.at(-1));
    if (next) segment.rows.push(next.rows[0]);
  }
  return segments.filter((segment) => segment.rows.length >= 2);
}
function pointLineDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 1e-9) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = THREE.MathUtils.clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}
function simplifyRoutePoints(points, tolerance) {
  if (points.length <= 2) return points;
  let furthestIndex = -1;
  let furthestDistance = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointLineDistance(points[index], points[0], points.at(-1));
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }
  if (furthestDistance <= tolerance) return [points[0], points.at(-1)];
  const left = simplifyRoutePoints(points.slice(0, furthestIndex + 1), tolerance);
  const right = simplifyRoutePoints(points.slice(furthestIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}
function softenRoutePoints(points, iterations = 2) {
  let result = points.map((point) => ({ ...point }));
  for (let pass = 0; pass < iterations; pass += 1) {
    const next = [result[0]];
    for (let index = 0; index < result.length - 1; index += 1) {
      const a = result[index];
      const b = result[index + 1];
      next.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 },
      );
    }
    next.push(result.at(-1));
    result = next;
  }
  return result;
}
function buildRouteSegment(route, segment, segmentIndex) {
  const style = roadStyles[route.feature_kind] || roadStyles.footpath;
  const simplifiedPoints = simplifyRoutePoints(
    segment.rows.map((row) => ({ x: row.world.x, y: row.world.z })),
    style.simplify,
  );
  const authoredPoints = softenRoutePoints(simplifiedPoints, route.feature_kind === "manor_road" ? 3 : 2);
  const centerline = RoadGeometry.sampleCenterline(
    authoredPoints,
    { spacing: style.spacing, tension: style.tension, samplesPerSegment: 7, smooth: false },
  );
  const desiredGrade = sampleSmoothedGrade(centerline);
  const vertexElevationOffset = (context) => Number.isFinite(context.terrainElevation)
    ? THREE.MathUtils.clamp(desiredGrade(context.distance) - context.terrainElevation, -0.12, 0.12)
    : 0;
  const vergeElevationOffset = (context) => {
    if (!Number.isFinite(context.terrainElevation)) return 0;
    const terrainDifference = THREE.MathUtils.clamp(desiredGrade(context.distance) - context.terrainElevation, -0.12, 0.12);
    const lateralFromRoad = Math.max(0, Math.abs(context.lateralOffset) - style.width / 2);
    const blend = THREE.MathUtils.clamp(lateralFromRoad / Math.max(style.verge, 0.001), 0, 1);
    return terrainDifference * (1 - blend);
  };
  const junctionPoint = rowsById.get("mh_519_3788")?.world;
  const containsJunction = segment.rows.some((row) => row.micro_hex_id === "mh_519_3788");
  const road = RoadGeometry.constructRoadMesh({
    centerline,
    elevationSampler: (x, z) => terrainElevationAt(x, z),
    roadWidth: style.width,
    vergeWidth: style.verge,
    crownHeight: style.crown,
    rutDepth: style.rutDepth,
    surfaceOffset: 0.075,
    vergeOffset: 0.015,
    vertexElevationOffset,
    vergeElevationOffset,
    textureRepeatDistance: 1.25,
    cap: route.feature_kind === "manor_road" ? "butt" : "round",
    junctions: route.feature_kind === "manor_road" && containsJunction && junctionPoint
      ? [{ id: "estate-gate", point: { x: junctionPoint.x, y: junctionPoint.z }, radius: style.width * 0.78 }]
      : [],
  });
  const report = RoadGeometry.validateMeshContinuity(road, { maxSegmentLength: style.spacing * 1.25, maxAbsoluteGrade: 0.85 });
  if (!report.valid) throw new Error(`${route.feature_id} segment ${segmentIndex}: ${report.errors.join("; ")}`);
  const group = new THREE.Group();
  group.name = `${route.feature_id}-${segmentIndex}`;
  for (const [surfaceName, material] of [
    ["leftVerge", vergeMaterial],
    ["rightVerge", vergeMaterial],
    ["road", roadMaterials[route.feature_kind] || roadMaterials.footpath],
    ["caps", roadMaterials[route.feature_kind] || roadMaterials.footpath],
    ["junctions", roadMaterials[route.feature_kind] || roadMaterials.footpath],
  ]) {
    const mesh = roadMeshToThree(road.surfaces[surfaceName], material, `${route.feature_id}-${surfaceName}`);
    if (mesh) group.add(mesh);
  }
  if (["manor_road", "manor_link_road", "manor_drive"].includes(route.feature_kind)) {
    group.add(buildRoadDeck(
      centerline,
      style,
      desiredGrade,
      roadMaterials[route.feature_kind],
      `${route.feature_id}-visible-deck`,
    ));
    const rutStyle = { ...style, width: Math.max(0.018, style.width * 0.055) };
    const rutOffset = style.width * 0.21;
    group.add(buildRoadDeck(centerline, rutStyle, desiredGrade, rutMaterial, `${route.feature_id}-left-wheel-rut`, -rutOffset, 0.137));
    group.add(buildRoadDeck(centerline, rutStyle, desiredGrade, rutMaterial, `${route.feature_id}-right-wheel-rut`, rutOffset, 0.137));
  }
  return group;
}

function buildDrainageSegment(route, segment, segmentIndex) {
  const authoredPoints = softenRoutePoints(
    segment.rows.map((row) => ({ x: row.world.x, y: row.world.z })),
    2,
  );
  const centerline = RoadGeometry.sampleCenterline(
    authoredPoints,
    { spacing: 0.12, tension: 0.48, samplesPerSegment: 6, smooth: false },
  );
  const ditchPoints = centerline.map((point) => localPosition(
    point.x,
    point.y,
    terrainElevationAt(point.x, point.y),
    0.018,
  ));
  const group = new THREE.Group();
  group.name = `${route.feature_id}-${segmentIndex}`;
  const ditch = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ditchPoints), Math.max(12, ditchPoints.length * 2), 0.072, 6, false),
    new THREE.MeshStandardMaterial({
      color: 0x493d2e,
      roughness: 1,
      transparent: true,
      opacity: 0.72,
    }),
  );
  ditch.name = "seasonal drainage grip earth";
  ditch.receiveShadow = true;
  group.add(ditch);
  const waterPoints = ditchPoints.map((point) => point.clone().add(new THREE.Vector3(0, 0.034, 0)));
  const water = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(waterPoints), Math.max(12, waterPoints.length * 2), 0.023, 6, false),
    new THREE.MeshPhysicalMaterial({
      color: 0x486b68,
      roughness: 0.28,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      clearcoat: 0.4,
    }),
  );
  water.name = "seasonal water glint";
  water.renderOrder = 6;
  group.add(water);
  return group;
}

for (const route of data.interpretation?.local_routes || []) {
  splitRouteByScope(route).forEach((segment, index) => {
    if (route.feature_kind === "drainage_grip") {
      drainageLayer.add(buildDrainageSegment(route, segment, index));
      return;
    }
    const mesh = buildRouteSegment(route, segment, index);
    const destination = segment.scope === "focus"
      ? roadTargetLayer
      : segment.scope === "estate"
        ? roadEstateLayer
        : roadContextLayer;
    destination.add(mesh);
  });
}

function buildFieldFurrows(sourceRows, color, opacity) {
  const positions = [];
  for (const row of sourceRows) {
    if (!/(fields|open_fields)/.test(row.land_use) || hash(row.q, row.r, 41) < 0.08) continue;
    const angle = Number.isFinite(row.field_system_number)
      ? tenantFieldAngle(row)
      : ((row.parent_hex_id.charCodeAt(row.parent_hex_id.length - 1) % 3) * Math.PI / 3)
        + (hash(row.q, row.r, 42) - 0.5) * 0.15;
    const tangent = { x: Math.cos(angle), z: Math.sin(angle) };
    const normal = { x: -tangent.z, z: tangent.x };
    for (const lateral of [-0.52, -0.31, -0.10, 0.10, 0.31, 0.52]) {
      let previous = null;
      for (let step = 0; step <= 8; step += 1) {
        const along = THREE.MathUtils.lerp(-0.74, 0.74, step / 8);
        const wiggle = Math.sin(step * 1.37 + hash(row.q, row.r, 43) * 6) * 0.018;
        const x = row.world.x + tangent.x * along + normal.x * (lateral + wiggle);
        const z = row.world.z + tangent.z * along + normal.z * (lateral + wiggle);
        const point = localPosition(x, z, terrainElevationAt(x, z), 0.012);
        if (previous) positions.push(previous.x, previous.y, previous.z, point.x, point.y, point.z);
        previous = point;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return new THREE.LineSegments(geometry, material);
}
groundDetailTargetLayer.add(buildFieldFurrows(estateRows, 0x3f2f1d, 0.42));
groundDetailContextLayer.add(buildFieldFurrows(contextRows, 0x4a3d28, 0.28));

function addFieldCropWashes(sourceRows, isTarget) {
  const families = [
    { color: 0xb18a3e, opacity: isTarget ? 0.19 : 0.09 },
    { color: 0x704a2d, opacity: isTarget ? 0.15 : 0.07 },
    { color: 0x5f713d, opacity: isTarget ? 0.14 : 0.065 },
  ];
  const geometry = new THREE.PlaneGeometry(1.38, 1.04);
  const alphaMap = makeIrregularAlphaTexture(isTarget ? 251 : 257);
  const dummy = new THREE.Object3D();
  families.forEach((family, familyIndex) => {
    const placements = [];
    for (const row of sourceRows) {
      if (!/(fields|open_fields)/.test(row.land_use)) continue;
      if (Math.floor(hash(row.q, row.r, 259) * families.length) !== familyIndex) continue;
      const angle = Number.isFinite(row.field_system_number)
        ? tenantFieldAngle(row)
        : ((row.parent_hex_id.charCodeAt(row.parent_hex_id.length - 1) % 3) * Math.PI / 3)
          + (hash(row.q, row.r, 261) - 0.5) * 0.12;
      placements.push({
        x: row.world.x,
        z: row.world.z,
        angle,
        sx: 0.78 + hash(row.q, row.r, 263) * 0.26,
        sz: 0.66 + hash(row.r, row.q, 269) * 0.28,
      });
    }
    if (!placements.length) return;
    const material = new THREE.MeshStandardMaterial({
      color: family.color,
      alphaMap,
      transparent: true,
      opacity: family.opacity,
      roughness: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    const washes = new THREE.InstancedMesh(geometry, material, placements.length);
    placements.forEach((placement, index) => {
      const point = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z), 0.011);
      dummy.position.copy(point);
      dummy.rotation.set(-Math.PI / 2, 0, placement.angle);
      dummy.scale.set(placement.sx, placement.sz, 1);
      dummy.updateMatrix();
      washes.setMatrixAt(index, dummy.matrix);
    });
    washes.receiveShadow = true;
    (isTarget ? groundDetailTargetLayer : groundDetailContextLayer).add(washes);
  });
}
addFieldCropWashes(estateRows, true);
addFieldCropWashes(contextRows, false);

function makeGrassTuftGeometry() {
  const positions = [];
  const indices = [];
  for (let blade = 0; blade < 5; blade += 1) {
    const angle = blade / 5 * Math.PI * 2;
    const radius = blade % 2 ? 0.025 : 0.045;
    const baseX = Math.cos(angle) * radius;
    const baseZ = Math.sin(angle) * radius;
    const sideX = Math.cos(angle + Math.PI / 2) * 0.018;
    const sideZ = Math.sin(angle + Math.PI / 2) * 0.018;
    const offset = positions.length / 3;
    positions.push(
      baseX - sideX, 0, baseZ - sideZ,
      baseX + sideX, 0, baseZ + sideZ,
      baseX + Math.cos(angle) * 0.025, 0.19 + blade * 0.008, baseZ + Math.sin(angle) * 0.025,
    );
    indices.push(offset, offset + 1, offset + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createInstancedVegetation(sourceRows, target) {
  const treePlacements = [];
  const shrubPlacements = [];
  const grassPlacements = [];
  const cropPlacements = [];
  const fruitPlacements = [];
  for (const row of sourceRows) {
    const wooded = /(hedge_copse|orchard)/.test(row.land_use);
    const pasture = /(pasture|meadow)/.test(row.land_use);
    const arable = /(fields|open_fields)/.test(row.land_use);
    if (wooded) {
      const count = /orchard/.test(row.land_use)
        ? (target ? 4 : 2)
        : (target ? 4 : 2) + Math.floor(hash(row.q, row.r, 51) * (target ? 4 : 2));
      for (let index = 0; index < count; index += 1) {
        const orchard = /orchard/.test(row.land_use);
        const angle = orchard
          ? (index / Math.max(1, count) * Math.PI * 2 + hash(row.q, row.r, 52) * 0.3)
          : hash(row.q, row.r, 52 + index) * Math.PI * 2;
        const radius = orchard
          ? 0.28 + (index % 2) * 0.26
          : Math.sqrt(hash(row.r, row.q, 62 + index)) * 0.74;
        const placement = {
          x: row.world.x + Math.cos(angle) * radius,
          z: row.world.z + Math.sin(angle) * radius,
          scale: (orchard ? 0.64 : 0.76) + hash(row.q + index, row.r, 71) * (orchard ? 0.28 : 0.74),
          tint: hash(row.q, row.r + index, 72),
          orchard,
        };
        treePlacements.push(placement);
        if (orchard && target) {
          for (let fruitIndex = 0; fruitIndex < 3; fruitIndex += 1) {
            fruitPlacements.push({
              x: placement.x + (hash(row.q + index, row.r, 73 + fruitIndex) - 0.5) * 0.38 * placement.scale,
              z: placement.z + (hash(row.r, row.q + index, 76 + fruitIndex) - 0.5) * 0.34 * placement.scale,
              scale: placement.scale,
              height: 0.56 + hash(row.q, row.r + index, 79 + fruitIndex) * 0.22,
            });
          }
        }
      }
    }
    if (pasture) {
      const commonGround = /(common_grazing|common_hay_and_aftermath)/.test(row.use_right_kind || "");
      const count = target ? (commonGround ? 14 : 11) : 4;
      for (let index = 0; index < count; index += 1) {
        const angle = hash(row.q, row.r, 82 + index) * Math.PI * 2;
        const radius = Math.sqrt(hash(row.r, row.q, 88 + index)) * 0.72;
        grassPlacements.push({
          x: row.world.x + Math.cos(angle) * radius,
          z: row.world.z + Math.sin(angle) * radius,
          scale: 0.65 + hash(row.q + index, row.r, 91) * 0.8,
          kind: row.land_use === "damp_meadow_swale" ? "wetland" : "meadow",
        });
      }
    }
    if (arable && hash(row.q, row.r, 93) > 0.24) {
      const demesne = row.land_use === "demesne_open_fields";
      const count = target ? (demesne ? 7 : 5) : 2;
      for (let index = 0; index < count; index += 1) {
        const angle = hash(row.q, row.r, 94 + index) * Math.PI * 2;
        const radius = Math.sqrt(hash(row.r, row.q, 97 + index)) * 0.7;
        cropPlacements.push({
          x: row.world.x + Math.cos(angle) * radius,
          z: row.world.z + Math.sin(angle) * radius,
          scale: 0.65 + hash(row.q + index, row.r, 99) * 0.7,
          kind: "crop",
        });
      }
    }
    if (/boundary_hedge_copse/.test(row.land_use)) {
      shrubPlacements.push({
        x: row.world.x,
        z: row.world.z,
        scale: 0.75 + hash(row.q, row.r, 96) * 0.45,
        kind: "shrub",
      });
    }
  }
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  if (treePlacements.length) {
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.042, 0.072, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x4f3827, roughness: 1 }),
      treePlacements.length,
    );
    const canopy = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.31, 8, 6),
      new THREE.MeshStandardMaterial({ map: foliageTexture, bumpMap: terrainReliefTexture, bumpScale: 0.055, color: 0xffffff, roughness: 0.92, vertexColors: true, emissive: 0x355536, emissiveIntensity: 0.48 }),
      treePlacements.length,
    );
    const upperCanopy = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.23, 8, 6),
      new THREE.MeshStandardMaterial({ map: foliageTexture, bumpMap: terrainReliefTexture, bumpScale: 0.055, color: 0xffffff, roughness: 0.93, vertexColors: true, emissive: 0x355536, emissiveIntensity: 0.48 }),
      treePlacements.length,
    );
    const sideCanopy = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.20, 7, 5),
      new THREE.MeshStandardMaterial({ map: foliageTexture, bumpMap: terrainReliefTexture, bumpScale: 0.055, color: 0xffffff, roughness: 0.95, vertexColors: true, emissive: 0x355536, emissiveIntensity: 0.48 }),
      treePlacements.length,
    );
    treePlacements.forEach((placement, index) => {
      const elevation = terrainElevationAt(placement.x, placement.z);
      const base = localPosition(placement.x, placement.z, elevation);
      dummy.position.set(base.x, base.y + 0.24 * placement.scale, base.z);
      dummy.rotation.y = placement.tint * Math.PI * 2;
      dummy.scale.set(placement.scale, placement.scale, placement.scale);
      dummy.updateMatrix();
      trunk.setMatrixAt(index, dummy.matrix);
      dummy.position.y = base.y + 0.62 * placement.scale;
      dummy.scale.set(placement.scale * 1.12, placement.scale * (0.82 + placement.tint * 0.20), placement.scale * 0.96);
      dummy.updateMatrix();
      canopy.setMatrixAt(index, dummy.matrix);
      const canopyColor = new THREE.Color().setHSL(0.275 + placement.tint * 0.045, 0.42, 0.48 + placement.tint * 0.10);
      canopy.setColorAt(index, canopyColor);
      dummy.position.set(
        base.x + (placement.tint - 0.5) * 0.18 * placement.scale,
        base.y + 0.86 * placement.scale,
        base.z + (hash(placement.x, placement.z, 76) - 0.5) * 0.15 * placement.scale,
      );
      dummy.scale.set(placement.scale * 0.88, placement.scale * 0.78, placement.scale * 0.86);
      dummy.updateMatrix();
      upperCanopy.setMatrixAt(index, dummy.matrix);
      upperCanopy.setColorAt(index, canopyColor.clone().offsetHSL(0.01, 0.02, 0.035));
      dummy.position.set(
        base.x + (hash(placement.x, placement.z, 77) - 0.5) * 0.30 * placement.scale,
        base.y + 0.57 * placement.scale,
        base.z + (placement.tint - 0.5) * 0.27 * placement.scale,
      );
      dummy.scale.set(placement.scale * 0.88, placement.scale * 0.66, placement.scale * 0.80);
      dummy.updateMatrix();
      sideCanopy.setMatrixAt(index, dummy.matrix);
      sideCanopy.setColorAt(index, canopyColor.clone().offsetHSL(-0.01, 0.015, -0.025));
    });
    trunk.castShadow = canopy.castShadow = upperCanopy.castShadow = sideCanopy.castShadow = target;
    trunk.receiveShadow = canopy.receiveShadow = upperCanopy.receiveShadow = sideCanopy.receiveShadow = true;
    group.add(trunk, canopy, upperCanopy, sideCanopy);
    group.userData.treeMeshes = [trunk, canopy, upperCanopy, sideCanopy];
  }
  if (shrubPlacements.length) {
    const shrubs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.18, 7, 5),
      new THREE.MeshStandardMaterial({ color: 0x3c603b, roughness: 1 }),
      shrubPlacements.length,
    );
    shrubPlacements.forEach((placement, index) => {
      const base = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z));
      dummy.position.set(base.x, base.y + 0.12, base.z);
      dummy.rotation.set(hash(placement.x, placement.z) * 0.3, hash(placement.z, placement.x) * Math.PI * 2, 0);
      dummy.scale.set(placement.scale * 1.25, placement.scale * 0.75, placement.scale);
      dummy.updateMatrix();
      shrubs.setMatrixAt(index, dummy.matrix);
    });
    shrubs.castShadow = target;
    shrubs.receiveShadow = true;
    group.add(shrubs);
    group.userData.shrubMeshes = [shrubs];
  }
  if (grassPlacements.length) {
    const grass = new THREE.InstancedMesh(
      makeGrassTuftGeometry(),
      new THREE.MeshStandardMaterial({ color: 0x71834b, roughness: 1, side: THREE.DoubleSide }),
      grassPlacements.length,
    );
    grassPlacements.forEach((placement, index) => {
      const base = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z));
      dummy.position.set(base.x, base.y + 0.085 * placement.scale, base.z);
      dummy.rotation.y = hash(placement.x, placement.z, 101) * Math.PI * 2;
      dummy.scale.set(placement.scale, placement.scale, placement.scale);
      dummy.updateMatrix();
      grass.setMatrixAt(index, dummy.matrix);
    });
    grass.castShadow = false;
    grass.receiveShadow = true;
    group.add(grass);
    group.userData.groundMeshes = [...(group.userData.groundMeshes || []), grass];
  }
  if (cropPlacements.length) {
    const crops = new THREE.InstancedMesh(
      makeGrassTuftGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xa18b47, roughness: 1, side: THREE.DoubleSide }),
      cropPlacements.length,
    );
    cropPlacements.forEach((placement, index) => {
      const base = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z));
      dummy.position.set(base.x, base.y + 0.075 * placement.scale, base.z);
      dummy.rotation.y = hash(placement.x, placement.z, 103) * Math.PI * 2;
      dummy.scale.set(placement.scale, placement.scale, placement.scale);
      dummy.updateMatrix();
      crops.setMatrixAt(index, dummy.matrix);
    });
    crops.receiveShadow = true;
    group.add(crops);
    group.userData.groundMeshes = [...(group.userData.groundMeshes || []), crops];
  }
  if (fruitPlacements.length) {
    const fruit = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.026, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0x9f3f28, roughness: 0.8 }),
      fruitPlacements.length,
    );
    fruitPlacements.forEach((placement, index) => {
      const base = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z));
      dummy.position.set(base.x, base.y + placement.height * placement.scale, base.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(placement.scale);
      dummy.updateMatrix();
      fruit.setMatrixAt(index, dummy.matrix);
    });
    fruit.castShadow = true;
    group.add(fruit);
    group.userData.fruitMeshes = [fruit];
  }
  group.userData.treePlacements = treePlacements;
  group.userData.shrubPlacements = shrubPlacements;
  group.userData.groundcoverPlacements = [...grassPlacements, ...cropPlacements];
  return group;
}

const oakPilotRowIds = new Set(["mh_516_3786", "mh_519_3789"]);
const oakPilotRows = targetRows.filter((row) => oakPilotRowIds.has(row.micro_hex_id));
const targetVegetationCore = createInstancedVegetation(
  estateRows.filter((row) => !oakPilotRowIds.has(row.micro_hex_id)),
  true,
);
const proceduralOakPilot = createInstancedVegetation(oakPilotRows, true);
vegetationTargetLayer.add(targetVegetationCore, proceduralOakPilot);
const contextVegetation = createInstancedVegetation(contextRows, true);
vegetationContextLayer.add(contextVegetation);

const environmentBillboards = [];

function addBillboardFamily(parent, placements, textures, options) {
  if (!placements.length) return;
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  planeGeometry.translate(0, 0.5, 0);
  for (let variant = 0; variant < textures.length; variant += 1) {
    const variantPlacements = placements
      .filter((placement) => Math.floor(hash(placement.x, placement.z, options.seed) * textures.length) === variant);
    if (!variantPlacements.length) continue;
    const material = new THREE.MeshBasicMaterial({
      map: textures[variant],
      color: options.color,
      alphaTest: options.alphaTest ?? 0.16,
      side: THREE.DoubleSide,
      depthWrite: true,
      fog: true,
      toneMapped: true,
    });
    const mesh = new THREE.InstancedMesh(planeGeometry, material, variantPlacements.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = options.castShadow ?? false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = options.renderOrder ?? 3;
    parent.add(mesh);
    environmentBillboards.push({
      mesh,
      placements: variantPlacements,
      size: options.size,
      lift: options.lift ?? 0.01,
      mirrorSeed: options.seed + 19,
    });
  }
}

function addTreeShadows(parent, placements, opacity = 0.28) {
  if (!placements.length) return;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: oakShadowTexture,
    color: 0x182016,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const shadows = new THREE.InstancedMesh(geometry, material, placements.length);
  const dummy = new THREE.Object3D();
  placements.forEach((placement, index) => {
    const base = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z), 0.016);
    dummy.position.copy(base);
    dummy.rotation.set(-Math.PI / 2, 0, hash(placement.x, placement.z, 323) * Math.PI);
    const factor = placement.orchard ? 0.78 : 1;
    dummy.scale.set(1.25 * placement.scale * factor, 0.70 * placement.scale * factor, 1);
    dummy.updateMatrix();
    shadows.setMatrixAt(index, dummy.matrix);
  });
  shadows.receiveShadow = true;
  shadows.frustumCulled = false;
  parent.add(shadows);
}

function addEnvironmentVegetationArt(parent, vegetationGroups, isTarget) {
  const trees = vegetationGroups.flatMap((group) => group.userData.treePlacements || []);
  const shrubs = vegetationGroups
    .flatMap((group) => group.userData.shrubPlacements || [])
    .filter((placement) => hash(placement.x, placement.z, 347) > (isTarget ? 0.28 : 0.46));
  const groundcover = vegetationGroups.flatMap((group) => group.userData.groundcoverPlacements || []);
  const oaks = trees.filter((placement) => !placement.orchard);
  const orchard = trees.filter((placement) => placement.orchard);
  addBillboardFamily(parent, oaks, oakPilotTextures, {
    seed: 311,
    color: 0xe9f0d8,
    castShadow: isTarget,
    size: (placement) => {
      const height = (1.50 + placement.tint * 0.18) * placement.scale;
      return { width: height * (0.78 + hash(placement.x, placement.z, 319) * 0.12), height };
    },
  });
  addBillboardFamily(parent, orchard, orchardTreeTextures, {
    seed: 337,
    color: 0xe0edca,
    castShadow: isTarget,
    size: (placement) => {
      const height = (1.05 + placement.tint * 0.12) * placement.scale;
      return { width: height * (0.92 + hash(placement.x, placement.z, 341) * 0.12), height };
    },
  });
  addBillboardFamily(parent, shrubs, hedgerowTextures.slice(2), {
    seed: 349,
    color: 0xdcebc8,
    castShadow: isTarget,
    alphaTest: 0.12,
    size: (placement) => ({
      width: 0.72 * placement.scale,
      height: 0.46 * placement.scale,
    }),
  });
  const lowFamilies = [
    { kind: "meadow", texture: groundcoverTextures[0], width: 0.36, height: 0.30 },
    { kind: "crop", texture: groundcoverTextures[1], width: 0.29, height: 0.31 },
    { kind: "wetland", texture: groundcoverTextures[2], width: 0.40, height: 0.44 },
  ];
  for (const [index, family] of lowFamilies.entries()) {
    const density = family.kind === "wetland" ? 0.42 : (family.kind === "meadow" ? 0.26 : 0.15);
    const placements = groundcover.filter((placement) => (
      placement.kind === family.kind && hash(placement.x, placement.z, 357 + index) < density
    ));
    addBillboardFamily(parent, placements, [family.texture], {
      seed: 361 + index,
      color: family.kind === "crop" ? 0xf0dfb1 : 0xe3edce,
      alphaTest: 0.10,
      lift: 0.006,
      renderOrder: 2,
      size: (placement) => ({
        width: family.width * placement.scale,
        height: family.height * placement.scale,
      }),
    });
  }
  addTreeShadows(parent, trees, isTarget ? 0.28 : 0.18);
}

addEnvironmentVegetationArt(environmentTreeTargetLayer, [targetVegetationCore, proceduralOakPilot], true);
addEnvironmentVegetationArt(environmentTreeContextLayer, [contextVegetation], true);

function updateEnvironmentBillboards() {
  const dummy = new THREE.Object3D();
  for (const { mesh, placements, size, lift, mirrorSeed } of environmentBillboards) {
    placements.forEach((placement, index) => {
      const base = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z), lift);
      const yaw = Math.atan2(camera.position.x - base.x, camera.position.z - base.z);
      const dimensions = size(placement);
      dummy.position.copy(base);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(
        hash(placement.x, placement.z, mirrorSeed) > 0.5 ? -dimensions.width : dimensions.width,
        dimensions.height,
        1,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

function addEnvironmentalClutter() {
  const rockPlacements = [];
  const hayPlacements = [];
  const flowerPlacements = [];
  for (const row of rows) {
    const target = row.is_target;
    const arable = /(fields|open_fields|dry_ridge)/.test(row.land_use);
    const yard = /(service_yard|estate_house)/.test(row.land_use);
    const route = row.linear_feature_ids?.length;
    const rockCount = target ? (route ? 3 : (hash(row.q, row.r, 181) > 0.46 ? 1 : 0)) : (hash(row.q, row.r, 181) > 0.83 ? 1 : 0);
    for (let index = 0; index < rockCount; index += 1) {
      const angle = hash(row.q, row.r, 182 + index) * Math.PI * 2;
      const radius = 0.24 + hash(row.r, row.q, 189 + index) * 0.54;
      rockPlacements.push({
        x: row.world.x + Math.cos(angle) * radius,
        z: row.world.z + Math.sin(angle) * radius,
        scale: 0.52 + hash(row.q + index, row.r, 193) * 0.78,
      });
    }
    if (target && (yard || (arable && hash(row.q, row.r, 197) > 0.92))) {
      hayPlacements.push({
        x: row.world.x + (hash(row.q, row.r, 198) - 0.5) * 0.68,
        z: row.world.z + (hash(row.r, row.q, 199) - 0.5) * 0.68,
        rotation: hash(row.q, row.r, 200) * Math.PI,
        scale: yard ? 0.78 : 0.64,
      });
    }
    if (target && /(pasture_meadow|damp_meadow_swale|orchard_kitchen_garden)/.test(row.land_use)) {
      const count = row.land_use === "orchard_kitchen_garden" ? 3 : 2;
      for (let index = 0; index < count; index += 1) {
        flowerPlacements.push({
          x: row.world.x + (hash(row.q, row.r, 204 + index) - 0.5) * 1.32,
          z: row.world.z + (hash(row.r, row.q, 209 + index) - 0.5) * 1.18,
          tint: hash(row.q + index, row.r, 214),
          scale: 0.72 + hash(row.q, row.r, 216 + index) * 0.48,
        });
      }
    }
  }
  if (rockPlacements.length) {
    const rocks = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.055, 0),
      new THREE.MeshStandardMaterial({ color: 0x6d6856, roughness: 1 }),
      rockPlacements.length,
    );
    const dummy = new THREE.Object3D();
    rockPlacements.forEach((placement, index) => {
      const point = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z), 0.015);
      dummy.position.copy(point);
      dummy.rotation.set(
        hash(placement.x, placement.z, 201) * 0.5,
        hash(placement.z, placement.x, 202) * Math.PI,
        hash(placement.x, placement.z, 203) * 0.35,
      );
      dummy.scale.set(placement.scale * 1.25, placement.scale * 0.65, placement.scale);
      dummy.updateMatrix();
      rocks.setMatrixAt(index, dummy.matrix);
    });
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    proceduralClutterLayer.add(rocks);
  }
  if (hayPlacements.length) {
    const hay = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.20, 10),
      new THREE.MeshStandardMaterial({ color: 0xb38c43, roughness: 1 }),
      hayPlacements.length,
    );
    const dummy = new THREE.Object3D();
    hayPlacements.forEach((placement, index) => {
      const point = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z), 0.02);
      dummy.position.set(point.x, point.y + 0.09 * placement.scale, point.z);
      dummy.rotation.set(Math.PI / 2, placement.rotation, 0);
      dummy.scale.setScalar(placement.scale);
      dummy.updateMatrix();
      hay.setMatrixAt(index, dummy.matrix);
    });
    hay.castShadow = true;
    hay.receiveShadow = true;
    proceduralClutterLayer.add(hay);
  }
  if (flowerPlacements.length) {
    const flowers = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.018, 5, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.82 }),
      flowerPlacements.length,
    );
    const dummy = new THREE.Object3D();
    flowerPlacements.forEach((placement, index) => {
      const point = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z), 0.05);
      dummy.position.copy(point);
      dummy.scale.setScalar(0.8 + placement.tint * 0.65);
      dummy.updateMatrix();
      flowers.setMatrixAt(index, dummy.matrix);
      flowers.setColorAt(index, placement.tint > 0.62 ? new THREE.Color(0xd9ad4a) : new THREE.Color(0xe2dac0));
    });
    proceduralClutterLayer.add(flowers);
  }
  return { rockPlacements, hayPlacements, flowerPlacements };
}
const proceduralClutter = addEnvironmentalClutter();

addBillboardFamily(environmentClutterLayer, proceduralClutter.hayPlacements, [clutterTextures[0]], {
  seed: 373,
  color: 0xf0dfbb,
  castShadow: true,
  alphaTest: 0.11,
  size: (placement) => ({
    width: 0.50 * placement.scale,
    height: 0.43 * placement.scale,
  }),
});
addBillboardFamily(
  environmentClutterLayer,
  proceduralClutter.rockPlacements.filter((placement) => hash(placement.x, placement.z, 377) > 0.68),
  [clutterTextures[1]],
  {
  seed: 379,
  color: 0xd7d2c2,
  castShadow: true,
  alphaTest: 0.11,
  size: (placement) => ({
    width: 0.34 * placement.scale,
    height: 0.25 * placement.scale,
  }),
  },
);
addBillboardFamily(environmentClutterLayer, proceduralClutter.flowerPlacements, [groundcoverTextures[3]], {
  seed: 383,
  color: 0xe1e9ce,
  alphaTest: 0.10,
  lift: 0.005,
  size: (placement) => ({
    width: 0.46 * placement.scale,
    height: 0.36 * placement.scale,
  }),
});

function addBoundaryFurniture() {
  const linePositions = [];
  const hedgePlacements = [];
  const ditchSegments = [];
  const parentLinePositions = [];
  const seenParentEdges = new Set();
  for (const row of rows) {
    const worldCorners = corners(row.world);
    const elevations = surfaceCornerElevations(row);
    for (let edge = 0; edge < 6; edge += 1) {
      const neighborParent = row.neighbor_parent_hex_ids?.[edge];
      if (neighborParent !== row.parent_hex_id) {
        const key = [row.parent_hex_id, neighborParent || "outside", row.micro_hex_id, edge].join(":");
        if (!seenParentEdges.has(key)) {
          const [aIndex, bIndex] = edgeCorners[edge];
          const a = localPosition(worldCorners[aIndex].x, worldCorners[aIndex].z, elevations[aIndex], 0.022);
          const b = localPosition(worldCorners[bIndex].x, worldCorners[bIndex].z, elevations[bIndex], 0.022);
          parentLinePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
          seenParentEdges.add(key);
        }
      }
    }
    for (const boundary of row.boundary_edges || []) {
      if (boundary.edge_surface !== "hedge_bank_with_ditch") continue;
      const [aIndex, bIndex] = edgeCorners[boundary.edge];
      const a = worldCorners[aIndex];
      const b = worldCorners[bIndex];
      const aPoint = localPosition(a.x, a.z, elevations[aIndex], 0.018);
      const bPoint = localPosition(b.x, b.z, elevations[bIndex], 0.018);
      linePositions.push(aPoint.x, aPoint.y - 0.018, aPoint.z, bPoint.x, bPoint.y - 0.018, bPoint.z);
      ditchSegments.push({ a, b });
      for (let step = 0; step <= 4; step += 1) {
        const t = step / 4;
        hedgePlacements.push({
          x: THREE.MathUtils.lerp(a.x, b.x, t),
          z: THREE.MathUtils.lerp(a.z, b.z, t),
          scale: 0.74 + hash(row.q + step, row.r, boundary.edge) * 0.45,
        });
      }
    }
  }
  const ditchGeometry = new THREE.BufferGeometry();
  ditchGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  boundaryLayer.add(new THREE.LineSegments(
    ditchGeometry,
    new THREE.LineBasicMaterial({ color: 0x2b291d, transparent: true, opacity: 0.75 }),
  ));
  const parentGeometry = new THREE.BufferGeometry();
  parentGeometry.setAttribute("position", new THREE.Float32BufferAttribute(parentLinePositions, 3));
  boundaryLayer.add(new THREE.LineSegments(
    parentGeometry,
    new THREE.LineBasicMaterial({ color: 0x5d5540, transparent: true, opacity: 0.055 }),
  ));
  if (hedgePlacements.length) {
    const hedges = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.16, 7, 5),
      new THREE.MeshStandardMaterial({ color: 0x365b37, roughness: 1 }),
      hedgePlacements.length,
    );
    const dummy = new THREE.Object3D();
    hedgePlacements.forEach((placement, index) => {
      const point = localPosition(placement.x, placement.z, terrainElevationAt(placement.x, placement.z));
      dummy.position.set(point.x, point.y + 0.105, point.z);
      dummy.rotation.y = hash(placement.x, placement.z, 113) * Math.PI;
      dummy.scale.set(placement.scale * 1.42, placement.scale * 0.68, placement.scale * 0.94);
      dummy.updateMatrix();
      hedges.setMatrixAt(index, dummy.matrix);
    });
    hedges.castShadow = true;
    hedges.receiveShadow = true;
    proceduralBoundaryArtLayer.add(hedges);
  }
  return { hedgePlacements, ditchSegments };
}
const boundaryFurniture = addBoundaryFurniture();

addBillboardFamily(environmentBoundaryArtLayer, boundaryFurniture.hedgePlacements, hedgerowTextures.slice(0, 2), {
  seed: 389,
  color: 0xdce9cc,
  castShadow: true,
  alphaTest: 0.10,
  size: (placement) => ({
    width: 0.74 * placement.scale,
    height: 0.39 * placement.scale,
  }),
});

if (boundaryFurniture.ditchSegments.length) {
  const ditchMaterial = new THREE.MeshStandardMaterial({
    map: environmentMaterialTextures.damp,
    color: 0x687a63,
    roughness: 1,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const ditches = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 0.13),
    ditchMaterial,
    boundaryFurniture.ditchSegments.length,
  );
  const dummy = new THREE.Object3D();
  boundaryFurniture.ditchSegments.forEach((segment, index) => {
    const centerX = (segment.a.x + segment.b.x) / 2;
    const centerZ = (segment.a.z + segment.b.z) / 2;
    const length = Math.hypot(segment.b.x - segment.a.x, segment.b.z - segment.a.z);
    const point = localPosition(centerX, centerZ, terrainElevationAt(centerX, centerZ), 0.010);
    dummy.position.copy(point);
    dummy.rotation.set(-Math.PI / 2, 0, -Math.atan2(segment.b.z - segment.a.z, segment.b.x - segment.a.x));
    dummy.scale.set(length * 1.05, 1, 1);
    dummy.updateMatrix();
    ditches.setMatrixAt(index, dummy.matrix);
  });
  ditches.receiveShadow = true;
  environmentBoundaryArtLayer.add(ditches);
}

function addWorkingFences() {
  const segments = [];
  const seen = new Set();
  for (const row of estateRows) {
    const managed = /(orchard_kitchen_garden|service_yard|estate_house)/.test(row.land_use);
    if (!managed) continue;
    const worldCorners = corners(row.world);
    for (let edge = 0; edge < 6; edge += 1) {
      const neighborId = row.neighbor_ids?.[edge];
      const neighbor = rowsById.get(neighborId);
      if (neighbor && /(orchard_kitchen_garden|service_yard|estate_house)/.test(neighbor.land_use)) continue;
      const key = [row.micro_hex_id, neighborId || `edge-${edge}`].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const [aIndex, bIndex] = edgeCorners[edge];
      const a = worldCorners[aIndex];
      const b = worldCorners[bIndex];
      segments.push({ a, b });
    }
  }
  if (!segments.length) return;
  const railMaterial = new THREE.MeshStandardMaterial({
    map: environmentMaterialTextures.wood,
    bumpMap: environmentMaterialTextures.wood,
    bumpScale: 0.025,
    color: 0x8a765b,
    roughness: 1,
  });
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.025, 0.028), railMaterial, segments.length * 2);
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.024, 0.032, 0.29, 6), railMaterial, segments.length * 2);
  const dummy = new THREE.Object3D();
  segments.forEach((segment, index) => {
    const centerX = (segment.a.x + segment.b.x) / 2;
    const centerZ = (segment.a.z + segment.b.z) / 2;
    const length = Math.hypot(segment.b.x - segment.a.x, segment.b.z - segment.a.z);
    const rotation = -Math.atan2(segment.b.z - segment.a.z, segment.b.x - segment.a.x);
    const elevation = terrainElevationAt(centerX, centerZ);
    const center = localPosition(centerX, centerZ, elevation, 0.02);
    for (let railIndex = 0; railIndex < 2; railIndex += 1) {
      dummy.position.set(center.x, center.y + 0.11 + railIndex * 0.10, center.z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.set(length * 0.94, 1, 1);
      dummy.updateMatrix();
      rails.setMatrixAt(index * 2 + railIndex, dummy.matrix);
    }
    for (const [postIndex, endpoint] of [segment.a, segment.b].entries()) {
      const point = localPosition(endpoint.x, endpoint.z, terrainElevationAt(endpoint.x, endpoint.z), 0.02);
      dummy.position.set(point.x, point.y + 0.145, point.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(index * 2 + postIndex, dummy.matrix);
    }
  });
  rails.castShadow = posts.castShadow = true;
  rails.receiveShadow = posts.receiveShadow = true;
  environmentBoundaryArtLayer.add(rails, posts);
}
addWorkingFences();

function buildAcreGrid() {
  const positions = [];
  const seen = new Set();
  for (const row of estateRows) {
    const worldCorners = corners(row.world);
    const elevations = surfaceCornerElevations(row);
    for (let edge = 0; edge < 6; edge += 1) {
      const [aIndex, bIndex] = edgeCorners[edge];
      const a = worldCorners[aIndex];
      const b = worldCorners[bIndex];
      const key = [
        `${Math.min(a.x, b.x).toFixed(4)},${Math.min(a.z, b.z).toFixed(4)}`,
        `${Math.max(a.x, b.x).toFixed(4)},${Math.max(a.z, b.z).toFixed(4)}`,
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const ap = localPosition(a.x, a.z, elevations[aIndex], 0.028);
      const bp = localPosition(b.x, b.z, elevations[bIndex], 0.028);
      positions.push(ap.x, ap.y, ap.z, bp.x, bp.y, bp.z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xd6d0ad, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  acreGridLayer.add(lines);
}
buildAcreGrid();
acreGridLayer.visible = false;

function gableRoofGeometry(width, depth, height) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, w, 0, d, -w, 0, d,
    0, height, -d, 0, height, d,
  ]);
  const indices = [
    0, 1, 4, 3, 5, 2,
    0, 4, 5, 0, 5, 3,
    1, 2, 5, 1, 5, 4,
    0, 3, 2, 0, 2, 1,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function makeLabelSprite(text) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext("2d");
  context.font = "500 42px Georgia";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 8;
  context.strokeStyle = "rgba(20,24,20,.82)";
  context.strokeText(text, 256, 64);
  context.fillStyle = "#f0ead7";
  context.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(3.5, 0.875, 1);
  return sprite;
}
function addEstateStructures() {
  const houseRow = targetRows.find((row) => row.land_use === "estate_house");
  if (!houseRow) return;
  const point = localPosition(houseRow.world.x, houseRow.world.z, terrainElevationAt(houseRow.world.x, houseRow.world.z), 0.025);
  const estate = new THREE.Group();
  estate.position.copy(point);
  estate.rotation.y = -0.31;
  estate.name = "Pearwick Hall compound";

  const stoneTexture = makeNoiseTexture([172, 162, 137], 44, 211);
  stoneTexture.repeat.set(2.8, 2.8);
  const roofTexture = makeNoiseTexture([114, 72, 47], 42, 223);
  roofTexture.repeat.set(3.4, 2.2);
  const stoneRelief = makeReliefTexture(227);
  stoneRelief.repeat.set(3, 3);
  const stoneMaterial = new THREE.MeshStandardMaterial({
    map: stoneTexture,
    bumpMap: stoneRelief,
    bumpScale: 0.055,
    color: 0xb2a382,
    roughness: 0.96,
  });
  const darkStoneMaterial = new THREE.MeshStandardMaterial({
    map: stoneTexture,
    bumpMap: stoneRelief,
    bumpScale: 0.05,
    color: 0x756c59,
    roughness: 0.98,
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    map: roofTexture,
    bumpMap: stoneRelief,
    bumpScale: 0.035,
    color: 0x8b5038,
    roughness: 0.91,
  });
  const timberMaterial = new THREE.MeshStandardMaterial({ color: 0x67472f, roughness: 1 });
  const plasterMaterial = new THREE.MeshStandardMaterial({ color: 0xc8bc9b, roughness: 0.98 });
  const yardMaterial = new THREE.MeshStandardMaterial({
    map: environmentMaterialTextures.yard,
    bumpMap: environmentMaterialTextures.yard,
    bumpScale: 0.032,
    color: 0xb39c78,
    roughness: 1,
  });
  const wallArtMaterial = new THREE.MeshStandardMaterial({
    map: environmentMaterialTextures.stone,
    bumpMap: environmentMaterialTextures.stone,
    bumpScale: 0.035,
    color: 0xb5ad98,
    roughness: 1,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x4c3b28,
    emissive: 0xffad54,
    emissiveIntensity: 0.42,
    roughness: 0.42,
  });

  function addBox(size, position, material, parent = estate, rotationY = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function addRoof(size, position, parent = estate, material = roofMaterial, rotationY = 0) {
    const mesh = new THREE.Mesh(gableRoofGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const yard = new THREE.Mesh(new THREE.CircleGeometry(1.46, 48), yardMaterial);
  yard.rotation.x = -Math.PI / 2;
  yard.position.y = 0.016;
  yard.receiveShadow = true;
  estate.add(yard);

  addBox([1.28, 0.63, 0.58], [0.02, 0.335, -0.04], stoneMaterial);
  addRoof([1.42, 0.72, 0.38], [0.02, 0.65, -0.04]);
  addBox([0.52, 0.49, 0.50], [-0.45, 0.265, 0.42], plasterMaterial);
  addRoof([0.62, 0.60, 0.29], [-0.45, 0.51, 0.42]);
  addBox([0.44, 0.42, 0.42], [0.56, 0.23, 0.38], stoneMaterial);
  addRoof([0.53, 0.52, 0.25], [0.56, 0.44, 0.38]);

  for (const x of [-0.42, -0.12, 0.18, 0.48]) {
    for (const y of [0.24, 0.47]) addBox([0.09, 0.12, 0.025], [x, y, -0.339], glassMaterial);
  }
  addBox([1.18, 0.035, 0.035], [0.02, 0.365, -0.355], timberMaterial);
  for (const x of [-0.54, -0.27, 0.30, 0.58]) {
    addBox([0.035, 0.55, 0.035], [x, 0.32, -0.355], timberMaterial);
  }
  for (const x of [-0.28, 0.30]) {
    addBox([0.27, 0.18, 0.20], [x, 0.66, -0.18], plasterMaterial);
    addRoof([0.33, 0.29, 0.18], [x, 0.75, -0.18], estate, roofMaterial, Math.PI / 2);
    addBox([0.075, 0.085, 0.018], [x, 0.67, -0.289], glassMaterial);
  }
  for (const x of [-0.19, 0.23]) {
    addBox([0.038, 0.13, 0.032], [x, 0.88, -0.09], darkStoneMaterial);
    addBox([0.095, 0.25, 0.095], [x, 0.83, -0.09], darkStoneMaterial);
  }
  addBox([0.17, 0.30, 0.035], [0.02, 0.17, -0.347], timberMaterial);
  addBox([0.29, 0.035, 0.14], [0.02, 0.035, -0.42], darkStoneMaterial);

  const barnMaterial = new THREE.MeshStandardMaterial({ color: 0x8a603d, roughness: 1 });
  addBox([0.88, 0.45, 0.48], [0.63, 0.245, 0.92], barnMaterial);
  addRoof([1.00, 0.59, 0.31], [0.63, 0.47, 0.92], estate, timberMaterial);
  addBox([0.20, 0.31, 0.028], [0.63, 0.17, 0.675], timberMaterial);
  addBox([0.62, 0.34, 0.38], [-0.75, 0.19, 0.88], timberMaterial, estate, 0.06);
  addRoof([0.72, 0.48, 0.25], [-0.75, 0.36, 0.88], estate, roofMaterial, 0.06);

  const wallMaterial = wallArtMaterial;
  addBox([2.68, 0.15, 0.10], [0, 0.085, 1.37], wallMaterial);
  addBox([2.68, 0.15, 0.10], [0, 0.085, -1.37], wallMaterial);
  addBox([0.10, 0.15, 2.74], [-1.34, 0.085, 0], wallMaterial);
  addBox([0.10, 0.15, 0.96], [1.34, 0.085, 0.88], wallMaterial);
  addBox([0.10, 0.15, 0.96], [1.34, 0.085, -0.88], wallMaterial);
  for (const side of [-1, 1]) {
    addBox([0.12, 0.34, 0.12], [1.34, 0.18, side * 0.31], wallMaterial);
  }

  const gardenMaterial = new THREE.MeshStandardMaterial({
    map: environmentMaterialTextures.arable,
    bumpMap: environmentMaterialTextures.arable,
    bumpScale: 0.025,
    color: 0x8f7351,
    roughness: 1,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x496d31, roughness: 1 });
  for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
    for (let column = 0; column < 3; column += 1) {
      const x = -0.98 + column * 0.26;
      const z = -0.82 + rowIndex * 0.29;
      addBox([0.20, 0.025, 0.23], [x, 0.028, z], gardenMaterial);
      for (const offset of [-0.05, 0.05]) {
        const plant = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), leafMaterial);
        plant.position.set(x + offset, 0.07, z);
        plant.castShadow = true;
        estate.add(plant);
      }
    }
  }
  for (let index = 0; index < 8; index += 1) {
    const stack = addBox(
      [0.13 + hash(index, 1, 241) * 0.06, 0.09, 0.16],
      [0.78 + (index % 3) * 0.14, 0.07 + Math.floor(index / 3) * 0.065, -0.84 + Math.floor(index / 3) * 0.13],
      new THREE.MeshStandardMaterial({ color: 0x9c7a3b, roughness: 1 }),
    );
    stack.rotation.y = hash(index, 2, 242) * 0.25;
  }

  const smokeMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9b6a8,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    roughness: 1,
  });
  for (let index = 0; index < 4; index += 1) {
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.08 + index * 0.025, 7, 5), smokeMaterial);
    smoke.position.set(0.23 + index * 0.045, 1.05 + index * 0.16, -0.09 - index * 0.03);
    smoke.scale.set(1.2, 0.8, 1);
    estate.add(smoke);
  }

  structureLayer.add(estate);

  const pondRow = targetRows.find((row) => row.land_use === "pond_well");
  if (pondRow) {
    const pondPoint = localPosition(pondRow.world.x, pondRow.world.z, terrainElevationAt(pondRow.world.x, pondRow.world.z), 0.025);
    const bank = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.075, 8, 40),
      new THREE.MeshStandardMaterial({
        map: environmentMaterialTextures.stone,
        bumpMap: environmentMaterialTextures.stone,
        bumpScale: 0.025,
        color: 0x7f8468,
        roughness: 1,
      }),
    );
    bank.rotation.x = Math.PI / 2;
    bank.position.copy(pondPoint);
    bank.castShadow = true;
    bank.receiveShadow = true;
    structureLayer.add(bank);
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(0.39, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x315e63,
        roughness: 0.16,
        metalness: 0,
        transmission: 0.12,
        transparent: true,
        opacity: 0.91,
        clearcoat: 0.72,
        clearcoatRoughness: 0.18,
      }),
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.copy(pondPoint);
    pond.position.y += 0.008;
    pond.receiveShadow = true;
    structureLayer.add(pond);

    const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x667640, roughness: 1, side: THREE.DoubleSide });
    for (let index = 0; index < 26; index += 1) {
      const angle = index / 26 * Math.PI * 2 + hash(index, 3, 245) * 0.24;
      const radius = 0.39 + hash(index, 4, 246) * 0.10;
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.20 + hash(index, 5, 247) * 0.18, 4), reedMaterial);
      reed.position.set(
        pondPoint.x + Math.cos(angle) * radius,
        pondPoint.y + 0.09,
        pondPoint.z + Math.sin(angle) * radius,
      );
      reed.castShadow = true;
      structureLayer.add(reed);
    }
  }
}
addEstateStructures();

function addLockedCameraHallArt() {
  if (!locked2p5d) return;
  const estateMesh = structureLayer.getObjectByName("Pearwick Hall compound");
  if (estateMesh) estateMesh.visible = false;
  const row = targetRows.find((candidate) => candidate.land_use === "estate_house");
  if (!row) return;

  const base = localPosition(
    row.world.x,
    row.world.z,
    terrainElevationAt(row.world.x, row.world.z),
    0.006,
  );

  const foundation = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 48),
    new THREE.MeshStandardMaterial({
      map: environmentMaterialTextures.yard,
      bumpMap: environmentMaterialTextures.yard,
      alphaMap: oakShadowTexture,
      bumpScale: 0.022,
      color: 0xa08b68,
      roughness: 1,
      transparent: true,
      opacity: 0.54,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  foundation.position.copy(base);
  foundation.rotation.x = -Math.PI / 2;
  foundation.rotation.z = -0.31;
  foundation.scale.set(0.91, 0.52, 1);
  foundation.renderOrder = 3;
  structureLayer.add(foundation);

  function addContactShadow(width, depth, opacity, lift) {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({
        map: oakShadowTexture,
        color: 0x11140e,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
    );
    shadow.position.copy(base);
    shadow.position.y += lift;
    shadow.rotation.x = -Math.PI / 2;
    shadow.rotation.z = -0.31;
    shadow.renderOrder = 4;
    structureLayer.add(shadow);
  }
  addContactShadow(1.34, 0.62, 0.17, 0.004);
  addContactShadow(0.92, 0.31, 0.43, 0.007);

  const hallMaterial = new THREE.SpriteMaterial({
    map: pearwickHallArtTexture,
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.08,
    depthTest: true,
    depthWrite: true,
    toneMapped: true,
    fog: true,
  });
  const hallSprite = new THREE.Sprite(hallMaterial);
  hallSprite.name = "Pearwick Hall one-acre art";
  // The art already includes its own stone court and hedge.  Anchor above the
  // transparent-image bottom so those painted foreground elements overlap the
  // terrain instead of reading as a card hovering over it.
  hallSprite.center.set(0.5, 0.112);
  hallSprite.position.copy(base);
  hallSprite.position.y += 0.006;
  hallSprite.scale.set(1.62, 1.62 * (358 / 390), 1);
  hallSprite.renderOrder = 8;
  hallSprite.userData = {
    asset_id: "pearwick_hall_solar_001",
    asset_label: "Pearwick Hall and solar",
    improvement_family: "IE-001",
    footprint_micro_hex_ids: [row.micro_hex_id],
    footprint_acres: 1,
    anchor_micro_hex_id: row.micro_hex_id,
  };
  structureLayer.add(hallSprite);

  // A pair of low foundation shrubs crosses the painted/terrain seam at the
  // near corners.  This small occlusion is the visual equivalent of grass and
  // planting growing up against real masonry; it also keeps the asset from
  // reading as a cut-out placed on top of the landscape.
  const towardCamera = lockedCameraDirection.clone();
  towardCamera.y = 0;
  towardCamera.normalize();
  const screenRight = new THREE.Vector3(towardCamera.z, 0, -towardCamera.x);
  [-0.47, 0.47].forEach((side, index) => {
    const shrubMaterial = new THREE.SpriteMaterial({
      map: hedgerowTextures[2 + index],
      color: 0xd7e5c3,
      transparent: true,
      alphaTest: 0.12,
      depthTest: true,
      depthWrite: true,
      toneMapped: true,
      fog: true,
    });
    const shrub = new THREE.Sprite(shrubMaterial);
    shrub.name = "Pearwick Hall foundation planting";
    shrub.center.set(0.5, 0.12);
    shrub.position.copy(base)
      .addScaledVector(towardCamera, 0.19)
      .addScaledVector(screenRight, side);
    shrub.position.y += 0.018;
    shrub.scale.set(0.42, 0.27, 1);
    shrub.renderOrder = 9;
    shrub.userData = {
      anchor_micro_hex_id: row.micro_hex_id,
      decorative: true,
    };
    structureLayer.add(shrub);
  });
}
addLockedCameraHallArt();

function addLockedCameraSingleHexAssets() {
  if (!locked2p5d || !singleHexAssetContract?.assets?.length) return;
  const towardCamera = lockedCameraDirection.clone();
  towardCamera.y = 0;
  towardCamera.normalize();
  const screenRight = new THREE.Vector3(towardCamera.z, 0, -towardCamera.x);

  for (const asset of singleHexAssetContract.assets) {
    if (asset.kind === "principal_house") continue;
    const row = rowsById.get(asset.anchor_micro_hex_id);
    const texture = singleHexAssetTextures.get(asset.asset_id);
    if (!row || !texture) continue;

    const base = localPosition(
      row.world.x,
      row.world.z,
      terrainElevationAt(row.world.x, row.world.z),
      0.006,
    );
    base
      .addScaledVector(screenRight, asset.offset_right || 0)
      .addScaledVector(towardCamera, asset.offset_toward_camera || 0);

    if (!["garden", "route_furniture"].includes(asset.kind)) {
      const apron = new THREE.Mesh(
        new THREE.CircleGeometry(0.63 * Math.min(asset.scale, 1.15), 40),
        new THREE.MeshStandardMaterial({
          map: environmentMaterialTextures.yard,
          bumpMap: environmentMaterialTextures.yard,
          alphaMap: oakShadowTexture,
          bumpScale: 0.018,
          color: asset.kind === "livestock" ? 0x967d59 : 0x9e8967,
          roughness: 1,
          transparent: true,
          opacity: asset.kind === "yard_furniture" ? 0.16 : 0.24,
          depthWrite: false,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        }),
      );
      apron.position.copy(base);
      apron.rotation.x = -Math.PI / 2;
      apron.rotation.z = -0.31;
      apron.scale.set(1, 0.58, 1);
      apron.renderOrder = 3;
      structureLayer.add(apron);
    }

    if (["service_building", "storage", "livestock", "administration"].includes(asset.kind)) {
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.64 * asset.scale, 0.22 * asset.scale),
        new THREE.MeshBasicMaterial({
          map: oakShadowTexture,
          color: 0x11140e,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        }),
      );
      shadow.position.copy(base);
      shadow.position.y += 0.004;
      shadow.rotation.x = -Math.PI / 2;
      shadow.rotation.z = -0.31;
      shadow.renderOrder = 4;
      structureLayer.add(shadow);
    }

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.08,
      depthTest: true,
      depthWrite: true,
      toneMapped: true,
      fog: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = asset.label;
    const groundingBoost = {
      garden: 0.025,
      route_furniture: 0.035,
      yard_furniture: 0.035,
      service_building: 0.045,
      storage: 0.045,
      livestock: 0.045,
      administration: 0.045,
    }[asset.kind] || 0.035;
    sprite.center.set(0.5, (asset.center_y ?? 0.08) + groundingBoost);
    sprite.position.copy(base);
    sprite.position.y += 0.002;
    sprite.scale.set(asset.scale, asset.scale * 0.78, 1);
    sprite.renderOrder = asset.kind === "yard_furniture" ? 10 : 8;
    sprite.userData = {
      asset_id: asset.asset_id,
      asset_label: asset.label,
      improvement_family: asset.improvement_family,
      footprint_acres: asset.footprint_acres,
      anchor_micro_hex_id: asset.anchor_micro_hex_id,
      source_note: asset.source_note || "",
    };
    structureLayer.add(sprite);
  }
}
addLockedCameraSingleHexAssets();

function addAuthoredContextSites() {
  const contextSites = data.interpretation?.context_site_features || [];
  const villageSite = contextSites.find((site) => site.feature_kind === "village_lcu");
  const villageRows = rows
    .filter((row) => row.parent_hex_id === villageSite?.parent_hex_id)
    .filter((row) => /(village_toft_croft|village_communal_core)/.test(row.land_use))
    .sort((a, b) => hash(b.q, b.r, 901) - hash(a.q, a.r, 901))
    .slice(0, 22);

  function addGroundedContextSprite({
    row,
    texture,
    label,
    assetId,
    scale,
    centerY = 0.10,
    improvementFamily = "native_settlement_fabric",
  }) {
    const base = localPosition(
      row.world.x,
      row.world.z,
      terrainElevationAt(row.world.x, row.world.z),
      0.005,
    );
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(scale * 0.64, scale * 0.23),
      new THREE.MeshBasicMaterial({
        map: oakShadowTexture,
        color: 0x11140e,
        transparent: true,
        opacity: 0.19,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
    );
    shadow.position.copy(base);
    shadow.position.y += 0.004;
    shadow.rotation.x = -Math.PI / 2;
    shadow.rotation.z = -0.31;
    shadow.renderOrder = 4;
    contextStructureLayer.add(shadow);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.08,
      depthTest: true,
      depthWrite: true,
      toneMapped: true,
      fog: true,
    }));
    sprite.name = label;
    sprite.center.set(0.5, centerY);
    sprite.position.copy(base);
    sprite.position.y += 0.003;
    sprite.scale.set(scale, scale * 0.74, 1);
    sprite.renderOrder = 8;
    sprite.userData = {
      asset_id: assetId,
      asset_label: label,
      improvement_family: improvementFamily,
      footprint_acres: 1,
      anchor_micro_hex_id: row.micro_hex_id,
      source_note: "Authored local-context fabric; not an accepted improvement instance.",
    };
    contextStructureLayer.add(sprite);
  }

  function addContextSiteLabel(site, subtitle) {
    // CourtOS exposes place identity in its own selected-place chrome. Keeping
    // permanent camera-facing plates in the scene makes them read as giant
    // billboards at estate scale and allows them to occlude the actual Hall.
    if (courtOsViewer) return;
    const row = rowsById.get(site.micro_hex_id);
    if (!row) return;
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 768;
    labelCanvas.height = 184;
    const labelContext = labelCanvas.getContext("2d");
    labelContext.fillStyle = labelTheme.surface ?? "rgba(31, 25, 18, 0.88)";
    labelContext.strokeStyle = labelTheme.rule ?? "#9f7d43";
    labelContext.lineWidth = 5;
    labelContext.fillRect(8, 8, 752, 168);
    labelContext.strokeRect(8, 8, 752, 168);
    labelContext.fillStyle = labelTheme.placeInk ?? "#ded2b4";
    labelContext.font = site.feature_kind === "route_relationship"
      ? "700 47px Georgia, serif"
      : "700 54px Georgia, serif";
    labelContext.textAlign = "center";
    labelContext.fillText(site.label, 384, 76);
    labelContext.fillStyle = labelTheme.metadataInk ?? "#aaa18b";
    labelContext.font = "500 31px system-ui, sans-serif";
    labelContext.fillText(subtitle, 384, 128);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    labelTexture.minFilter = THREE.LinearFilter;
    labelTexture.magFilter = THREE.LinearFilter;
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      fog: true,
    }));
    const base = localPosition(
      row.world.x,
      row.world.z,
      terrainElevationAt(row.world.x, row.world.z),
      0.42,
    );
    if (site.feature_kind === "minor_manor_seat") base.y += 1.35;
    labelSprite.position.copy(base);
    labelSprite.scale.set(
      site.feature_kind === "focus_manor_seat" ? 6.1
        : site.feature_kind === "village_lcu" ? 5.5
          : site.feature_kind === "route_relationship" ? 3.9
            : 4.6,
      site.feature_kind === "route_relationship" ? 0.94 : 1.34,
      1,
    );
    labelSprite.renderOrder = 30;
    labelSprite.userData = {
      asset_id: site.feature_id,
      asset_label: site.label,
      improvement_family: site.feature_kind === "village_lcu"
        ? "native_settlement_fabric"
        : "native_manor_seat",
      footprint_acres: site.feature_kind === "village_lcu" ? 73 : 1,
      anchor_micro_hex_id: site.micro_hex_id,
      source_note: site.feature_kind === "village_lcu"
        ? "Source-candidate LCU anchor with an authored 73-acre settlement footprint."
        : site.feature_kind === "focus_manor_seat"
          ? "XMAP focus manor seat and six-hex legal estate."
          : site.feature_kind === "route_relationship"
            ? "Authored route relationship between Pearwick Hall and its shared village."
          : "XMAP manor seat represented in the authored local context.",
    };
    contextStructureLayer.add(labelSprite);
  }

  villageRows.forEach((row, index) => addGroundedContextSprite({
    row,
    texture: villageDwellingTexture,
    label: "Pearwick village dwelling cluster",
    assetId: `pearwick_village_cluster_${String(index + 1).padStart(2, "0")}`,
    scale: 0.56 + hash(row.q, row.r, 907) * 0.12,
    centerY: 0.095,
  }));

  for (const site of contextSites.filter((entry) => entry.feature_kind === "minor_manor_seat")) {
    const row = rowsById.get(site.micro_hex_id);
    if (!row) continue;
    addGroundedContextSprite({
      row,
      texture: minorManorTexture,
      label: site.label,
      assetId: site.feature_id,
      scale: 1.02,
      centerY: 0.105,
      improvementFamily: "native_manor_seat",
    });
  }

  for (const site of contextSites) {
    addContextSiteLabel(
      site,
      site.feature_kind === "village_lcu"
        ? `${site.household_capacity_reference} households · 30 Hall crofts`
        : site.feature_kind === "focus_manor_seat"
          ? `${site.estate_hex_count} hexes · ${site.estate_acreage_reference.toLocaleString()} acres`
          : "nearby manor seat",
    );
  }

  const hallVillageRoad = data.interpretation?.local_routes
    ?.find((route) => route.feature_id === "pearwick_manor_road_001");
  const relationshipId = hallVillageRoad?.micro_hex_ids?.[
    Math.floor(hallVillageRoad.micro_hex_ids.length * 0.67)
  ];
  const relationshipRow = rowsById.get(relationshipId);
  if (relationshipRow) {
    addContextSiteLabel({
      feature_id: "pearwick_hall_village_relationship_001",
      feature_kind: "route_relationship",
      label: "Hall–village road",
      micro_hex_id: relationshipRow.micro_hex_id,
    }, "residence ↔ estate work");
  }
}
addAuthoredContextSites();

function addGateMarkers() {
  const gateMaterial = new THREE.MeshStandardMaterial({
    map: environmentMaterialTextures.wood,
    bumpMap: environmentMaterialTextures.wood,
    bumpScale: 0.025,
    color: 0x958164,
    roughness: 0.98,
  });
  for (const record of data.interpretation?.route_transition_features || []) {
    const row = rowsById.get(record.estate_micro_hex_id);
    const to = rowsById.get(record.context_micro_hex_id);
    if (!row || !to) continue;
    const x = (row.world.x + to.world.x) / 2;
    const z = (row.world.z + to.world.z) / 2;
    const point = localPosition(x, z, terrainElevationAt(x, z));
    const dx = to.world.x - row.world.x;
    const dz = to.world.z - row.world.z;
    const length = Math.hypot(dx, dz);
    const normal = { x: -dz / length, z: dx / length };
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.48, 7), gateMaterial);
      post.name = `${record.label} post`;
      post.position.set(point.x + normal.x * 0.25 * side, point.y + 0.24, point.z + normal.z * 0.25 * side);
      post.castShadow = true;
      boundaryLayer.add(post);
    }
    for (const height of [0.18, 0.34]) {
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.035, 0.035), gateMaterial);
      crossbar.name = `${record.label} rail`;
      crossbar.position.set(point.x, point.y + height, point.z);
      crossbar.rotation.y = Math.atan2(normal.z, normal.x);
      crossbar.castShadow = true;
      boundaryLayer.add(crossbar);
    }
    const apron = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 16),
      new THREE.MeshBasicMaterial({
        color: 0x67513a,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    apron.name = `${record.label} worn apron`;
    apron.position.copy(point);
    apron.position.y += 0.014;
    apron.rotation.x = -Math.PI / 2;
    apron.scale.set(1.45, 0.72, 1);
    boundaryLayer.add(apron);
  }
}
addGateMarkers();

const selectionMaterial = new THREE.LineBasicMaterial({ color: 0xffe7a0, transparent: true, opacity: 0.95, depthTest: false });
let selectionOutline = null;
function buildSelectionOutline(row) {
  const worldCorners = corners(row.world, 0.91);
  const positions = [];
  for (let index = 0; index <= 6; index += 1) {
    const corner = worldCorners[index % 6];
    const elevation = terrainElevationAt(corner.x, corner.z);
    const point = localPosition(corner.x, corner.z, elevation, 0.075);
    positions.push(point.x, point.y, point.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const outline = new THREE.Line(geometry, selectionMaterial);
  outline.renderOrder = 20;
  return outline;
}
function selectRow(row) {
  if (selectionOutline) {
    landscape.remove(selectionOutline);
    selectionOutline.traverse((object) => object.geometry?.dispose());
  }
  if (!row) return;
  selectionOutline = new THREE.Group();
  const selectedRows = [row];
  for (const selectedRow of selectedRows) selectionOutline.add(buildSelectionOutline(selectedRow));
  landscape.add(selectionOutline);
  const routes = row.linear_feature_ids?.length ? `\nRoutes: ${row.linear_feature_ids.join(", ")}` : "";
  const edges = row.boundary_edges?.filter((edge) => edge.edge_surface).map((edge) => `${directionNames[edge.edge]} ${edge.edge_surface}`).join(", ");
  const holding = row.tenant_holding_id
    ? data.interpretation?.tenant_holdings?.find((candidate) => candidate.tenant_holding_id === row.tenant_holding_id)
    : null;
  const holdingDetail = holding
    ? `\nTenant holding ${String(holding.tenant_holding_number).padStart(2, "0")} · ${holding.arable_acres_in_loaded_estate} estate arable acres · ${row.tenant_holding_acres_in_parent} in this parent\nDispersed open-field strips across ${Object.keys(holding.acres_by_parent_hex).length} estate hex${Object.keys(holding.acres_by_parent_hex).length === 1 ? "" : "es"}; common pasture/meadow not exclusively divided.`
    : "";
  inspector.innerHTML = `<strong>${row.micro_hex_id} · (${row.q}, ${row.r})</strong>
${landLabels[row.land_use] || row.land_use.replaceAll("_", " ")}
Surface elevation ${surfaceCenterElevation(row).toFixed(2)} · parent ${row.parent_hex_id}${holdingDetail}${routes}${edges ? `\nEdges: ${edges}` : ""}
${row.evidence_class}`;
}

function selectAsset(object) {
  const row = rowsById.get(object.userData.anchor_micro_hex_id);
  if (row) selectRow(row);
  const family = singleHexAssetContract?.improvement_basis?.[object.userData.improvement_family];
  const acreage = Number(object.userData.footprint_acres || 0);
  const nativeLabel = String(object.userData.improvement_family || "").startsWith("native_")
    ? "Native local fabric"
    : "Native estate fabric";
  inspector.innerHTML = `<strong>${object.userData.asset_label}</strong>
${nativeLabel}${family ? ` · ${family.label}` : ""}
Anchor ${object.userData.anchor_micro_hex_id}${acreage ? ` · ${acreage.toFixed(acreage < 1 ? 2 : 0)} acre${acreage === 1 ? "" : "s"}` : ""}
IE surface family ${object.userData.improvement_family || "not assigned"} · not an accepted improvement instance
${object.userData.source_note || "Pearwick single-hex asset contract"}`;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;
canvas.addEventListener("pointerdown", (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", (event) => {
  if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) {
    pointerDown = null;
    return;
  }
  pointer.x = event.clientX / canvas.clientWidth * 2 - 1;
  pointer.y = -(event.clientY / canvas.clientHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const assetHit = raycaster
    .intersectObjects([...structureLayer.children, ...contextStructureLayer.children], true)
    .find((intersection) => intersection.object.userData.asset_id);
  if (assetHit) {
    selectAsset(assetHit.object);
    pointerDown = null;
    return;
  }
  const visibleTerrain = terrainMeshes.filter((mesh) => mesh.visible && mesh.parent.visible);
  const hit = raycaster.intersectObjects(visibleTerrain, false)[0];
  if (hit) {
    const local = landscape.worldToLocal(hit.point.clone());
    const axial = axialFromWorld(local.x + originWorld.x, local.z + originWorld.z);
    const rounded = roundAxial(axial.q, axial.r);
    selectRow(rowsByCoordinate.get(`${rounded.q},${rounded.r}`));
  }
  pointerDown = null;
});

const houseRow = targetRows.find((row) => row.land_use === "estate_house");
const housePoint = houseRow
  ? localPosition(houseRow.world.x, houseRow.world.z, terrainElevationAt(houseRow.world.x, houseRow.world.z))
  : new THREE.Vector3();
const targetCenterWorld = targetRows.reduce(
  (sum, row) => ({ x: sum.x + row.world.x, z: sum.z + row.world.z }),
  { x: 0, z: 0 },
);
targetCenterWorld.x /= targetRows.length;
targetCenterWorld.z /= targetRows.length;
const singleHexPoint = localPosition(
  targetCenterWorld.x,
  targetCenterWorld.z,
  terrainElevationAt(targetCenterWorld.x, targetCenterWorld.z),
);
const estateCenterWorld = estateRows.reduce(
  (sum, row) => ({ x: sum.x + row.world.x, z: sum.z + row.world.z }),
  { x: 0, z: 0 },
);
estateCenterWorld.x /= estateRows.length;
estateCenterWorld.z /= estateRows.length;
const estatePoint = localPosition(
  estateCenterWorld.x,
  estateCenterWorld.z,
  terrainElevationAt(estateCenterWorld.x, estateCenterWorld.z),
);
const estateRadius = estateRows.reduce(
  (radius, row) => Math.max(
    radius,
    Math.hypot(row.world.x - estateCenterWorld.x, row.world.z - estateCenterWorld.z),
  ),
  0,
) + 1.4;
const loadedContextBounds = rows.reduce(
  (bounds, row) => ({
    minX: Math.min(bounds.minX, row.world.x),
    maxX: Math.max(bounds.maxX, row.world.x),
    minZ: Math.min(bounds.minZ, row.world.z),
    maxZ: Math.max(bounds.maxZ, row.world.z),
  }),
  { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
);
// Bias the midpoint slightly toward the eastern LCU corridor so the fixed
// inspector panel does not cover Pearwick village and the adjacent manor seat.
const loadedContextCenterWorld = {
  x: (loadedContextBounds.minX + loadedContextBounds.maxX) / 2 + 8,
  z: (loadedContextBounds.minZ + loadedContextBounds.maxZ) / 2,
};
const loadedContextPoint = localPosition(
  loadedContextCenterWorld.x,
  loadedContextCenterWorld.z,
  terrainElevationAt(loadedContextCenterWorld.x, loadedContextCenterWorld.z),
);
const loadedContextRadius = rows.reduce(
  (radius, row) => Math.max(
    radius,
    Math.hypot(
      row.world.x - loadedContextCenterWorld.x,
      row.world.z - loadedContextCenterWorld.z,
    ),
  ),
  0,
) + 1.4;
function animateCamera(destination, target, duration = 850) {
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();
  function step(now) {
    const t = THREE.MathUtils.clamp((now - startTime) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(startPosition, destination, eased);
    controls.target.lerpVectors(startTarget, target, eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function setViewPressed(activeId) {
  for (const id of ["view-context", "view-estate", "view-house"]) {
    document.getElementById(id)?.setAttribute("aria-pressed", String(id === activeId));
  }
}
let activeView = "context";
function houseView(immediate = false) {
  activeView = "house";
  scene.fog.density = 0.0088;
  setViewPressed("view-house");
  updateVisibility();
  const target = housePoint.clone().add(new THREE.Vector3(0, 0.35, 0));
  const destination = locked2p5d
    ? target.clone().add(lockedCameraDirection.clone().multiplyScalar(13.25))
    : target.clone().add(new THREE.Vector3(6.4, 7.9, 8.5));
  if (immediate) {
    camera.position.copy(destination);
    controls.target.copy(target);
  } else animateCamera(destination, target);
}
function singleHexView(immediate = false) {
  activeView = "house";
  scene.fog.density = 0.0088;
  setViewPressed("view-house");
  updateVisibility();
  const target = singleHexPoint.clone().add(new THREE.Vector3(0, -0.35, 0));
  const destination = target.clone().add(lockedCameraDirection.clone().multiplyScalar(31));
  if (immediate) {
    camera.position.copy(destination);
    controls.target.copy(target);
  } else animateCamera(destination, target, 950);
}
function estateView(immediate = false) {
  activeView = "estate";
  scene.fog.density = 0.0058;
  setViewPressed("view-estate");
  showContext.checked = false;
  updateVisibility();
  const target = estatePoint.clone().add(new THREE.Vector3(0, -0.55, 0));
  const framingDistance = estateRadius
    / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    * 0.72;
  const destination = target.clone().add(lockedCameraDirection.clone().multiplyScalar(framingDistance));
  if (immediate) {
    camera.position.copy(destination);
    controls.target.copy(target);
  } else animateCamera(destination, target, 950);
  status.textContent = `Six legal manor hexes · 30 holdings · 311 arable + 90 meadow acres · shared commons`;
}
function contextView(immediate = false) {
  activeView = "context";
  scene.fog.density = 0.0042;
  setViewPressed("view-context");
  showContext.checked = true;
  updateVisibility();
  const target = loadedContextPoint.clone().add(new THREE.Vector3(0, -0.65, 0));
  const framingDistance = loadedContextRadius
    / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    * 0.76;
  const destination = locked2p5d
    ? target.clone().add(lockedCameraDirection.clone().multiplyScalar(framingDistance))
    : new THREE.Vector3(35, 39, 46);
  if (immediate) {
    camera.position.copy(destination);
    controls.target.copy(target);
  } else animateCamera(destination, target, 1000);
  status.textContent = `${data.macro_parents.length} parent hexes · Pearwick Hall, 130-household village, neighboring manors, and continuous roads`;
}
function oakPilotView() {
  const placements = proceduralOakPilot.userData.treePlacements || [];
  if (!placements.length) return;
  const placement = placements[0];
  const target = localPosition(
    placement.x,
    placement.z,
    terrainElevationAt(placement.x, placement.z),
    0.78,
  );
  const destination = locked2p5d
    ? target.clone().add(lockedCameraDirection.clone().multiplyScalar(5.8))
    : target.clone().add(new THREE.Vector3(3.15, 2.45, 3.75));
  animateCamera(destination, target, 850);
}
document.getElementById("view-context").addEventListener("click", () => contextView());
document.getElementById("view-estate").addEventListener("click", () => estateView());
document.getElementById("view-house").addEventListener("click", () => {
  showContext.checked = false;
  singleHexView();
  status.textContent = `${targetRows.length} acres · tenant strips, demesne fields, meadow, and quieter common ground`;
});
if (locked2p5d) {
  document.querySelector(".title strong").textContent = "Pearwick Hall — one continuous 3D estate";
  document.querySelector(".help").textContent = "Drag to pan · scroll to zoom · click a minihex or estate asset";
  verticalScale.value = "1";
  verticalScale.disabled = true;
}
if (locked2p5d) contextView(true);
else houseView(true);

function updateVisibility() {
  const artEnabled = useEnvironmentArt.checked;
  contextLayer.visible = showContext.checked;
  targetTerrainSkirt.visible = !showContext.checked;
  groundDetailContextLayer.visible = showContext.checked;
  tenantStripContextLayer.visible = showContext.checked;
  contextStructureLayer.visible = showContext.checked;
  roadContextLayer.visible = showContext.checked && showRoads.checked;
  // The house camera can still see beyond the 217-acre focus parent. Keep all
  // six-hex estate road segments visible so roads follow visible terrain
  // instead of disappearing at an administrative minihex-view boundary.
  roadEstateLayer.visible = showRoads.checked;
  vegetationContextLayer.visible = showContext.checked && showVegetation.checked;
  roadTargetLayer.visible = showRoads.checked;
  tenantHoldingLayer.visible = showTenantHoldings.checked;
  fieldSystemLayer.visible = showTenantHoldings.checked;
  landRightsLayer.visible = showLandRights.checked;
  villageResidenceLayer.visible = showContext.checked && showLandRights.checked;
  fieldActivityLayer.visible = showTenantHoldings.checked && showVegetation.checked;
  drainageLayer.visible = showRoads.checked;
  managedWaterLayer.visible = true;
  boundaryLayer.visible = showBoundaries.checked;
  vegetationTargetLayer.visible = showVegetation.checked;
  environmentTreeTargetLayer.visible = showVegetation.checked && artEnabled;
  environmentTreeContextLayer.visible = showContext.checked && showVegetation.checked && artEnabled;
  environmentGroundPatchLayer.visible = artEnabled;
  environmentGroundPatchContextLayer.visible = showContext.checked && artEnabled;
  environmentClutterLayer.visible = showVegetation.checked && artEnabled;
  environmentBoundaryArtLayer.visible = showBoundaries.checked && artEnabled;
  proceduralGroundPatchLayer.visible = !artEnabled;
  proceduralGroundPatchContextLayer.visible = showContext.checked && !artEnabled;
  proceduralClutterLayer.visible = showVegetation.checked && !artEnabled;
  proceduralBoundaryArtLayer.visible = showBoundaries.checked && !artEnabled;
  for (const group of [targetVegetationCore, proceduralOakPilot, contextVegetation]) {
    for (const mesh of [
      ...(group.userData.treeMeshes || []),
      ...(group.userData.shrubMeshes || []),
      ...(group.userData.groundMeshes || []),
      ...(group.userData.fruitMeshes || []),
    ]) {
      mesh.visible = !artEnabled;
    }
  }
  acreGridLayer.visible = showAcreGrid.checked;
}
for (const control of [showContext, showRoads, showBoundaries, showVegetation, useEnvironmentArt, showTenantHoldings, showLandRights, showAcreGrid]) {
  control.addEventListener("change", updateVisibility);
}
verticalScale.addEventListener("input", () => {
  const value = Number(verticalScale.value);
  landscape.scale.y = value;
  verticalScaleValue.value = `${value.toFixed(2)}×`;
});
updateVisibility();

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}
window.addEventListener("resize", resize);

status.textContent = locked2p5d
  ? `${data.macro_parents.length} parent hexes · Pearwick Hall, shared village, neighboring manors, and continuous roads`
  : `${rows.length.toLocaleString()} one-acre cells · high-fidelity environment art · authored estate fabric`;
loading.classList.add("is-ready");
window.setTimeout(() => loading.remove(), 650);

let viewerActive = true;
let firstUsableFrameAnnounced = false;
function renderFrame() {
  resize();
  controls.update();
  updateEnvironmentBillboards();
  renderer.render(scene, camera);
  if (!firstUsableFrameAnnounced) {
    firstUsableFrameAnnounced = true;
    window.MERECROSS_EMBEDDED_ADAPTER_V1?.rendererReady?.({ rendererKey: "pearwick_estate_pilot_v1" });
  }
}
function setViewerActive(active) {
  if (active === viewerActive) return;
  viewerActive = active;
  renderer.setAnimationLoop(viewerActive ? renderFrame : null);
  if (viewerActive) renderFrame();
}
renderer.setAnimationLoop(renderFrame);

window.addEventListener("message", (event) => {
  if (!embeddedViewer || event.source !== window.parent || event.origin !== configuredParentOrigin) return;
  if (event.data?.type === "merecross:viewer-active") {
    const nextActive = event.data.active ?? event.data.viewerActive;
    if (typeof nextActive === "boolean") setViewerActive(nextActive);
  }
});

if (embeddedViewer && window.parent !== window) {
  window.parent.postMessage({
    type: "merecross:focus",
    version: 1,
    source: "estate",
    level: "estate",
    focus: {
      manorId: data.target.active_manor_id || data.target.manor_id,
      legacyManorId: data.target.manor_id || null,
      hexId: data.target.hex_id,
      q: data.target.q,
      r: data.target.r,
      countyId: data.target.county_id || null,
      countyName: data.target.county_name || null,
      label: data.target.label || "Pearwick Hall"
    }
  }, configuredParentOrigin);
}

window.__PEARWICK_3D__ = {
  renderer,
  scene,
  camera,
  controls,
  terrainMeshes,
  landscape,
  metrics: {
    cells: rows.length,
    terrainTriangles: targetTerrain.geometry.index.count / 3 + contextTerrain.geometry.index.count / 3,
    roadMeshes: roadTargetLayer.children.length + roadEstateLayer.children.length + roadContextLayer.children.length,
  },
};
