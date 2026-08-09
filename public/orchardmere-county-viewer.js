import * as THREE from "./vendor/three/three.module.min.js";
import { OrbitControls } from "./vendor/three/OrbitControls.js";

const data = window.ORCHARDMERE_COUNTY_DATA;
if (!data?.hexes?.length) throw new Error("Orchardmere county data is unavailable.");
const compositionLibrary = window.REALM_ZOOM_COMPOSITION_DATA;
const compositionSurface = window.ORCHARDMERE_COMPOSITION_SURFACE;
if (
  compositionLibrary?.counts?.recipe_count !== 75 ||
  !compositionSurface?.path
) {
  throw new Error("Realm zoom composition library or Orchardmere surface is unavailable.");
}
const compositionRecipeById = new Map(
  compositionLibrary.recipes.map((recipe) => [recipe.recipe_id, recipe]),
);

const canvas = document.querySelector("#terrain");
const sceneElement = canvas.parentElement;
const status = document.querySelector("#status");
const inspection = document.querySelector("#inspection");
const labelsRoot = document.querySelector("#labels");
const compassNeedle = document.querySelector("#compass-needle");
const reliefInput = document.querySelector("#relief");
const reliefValue = document.querySelector("#relief-value");
const contextInput = document.querySelector("#show-context");
const landscapeBorderInput = document.querySelector("#show-landscape-border");
const adminBorderInput = document.querySelector("#show-admin-border");
const compositionInput = document.querySelector("#show-composition");
const assetsInput = document.querySelector("#show-assets");
const gridInput = document.querySelector("#show-grid");
const holdingsInput = document.querySelector("#show-holdings");
const roadsInput = document.querySelector("#show-roads");
const riversInput = document.querySelector("#show-rivers");
const labelsInput = document.querySelector("#show-labels");
const query = new URLSearchParams(window.location.search);
const embedded = query.get("embedded") === "1";
const courtOsViewer = query.get("courtos") === "1";
const cartographyTheme = window.MERECROSS_CARTOGRAPHY_THEME_V1?.resolve?.(query.get("theme"));
const visualTheme = cartographyTheme?.visual ?? {};
const environmentTheme = visualTheme.environment ?? {};
const lightingTheme = visualTheme.lighting ?? {};
const materialTheme = visualTheme.material ?? {};
const waterTheme = visualTheme.water ?? {};
const routeTheme = visualTheme.routes ?? {};
const labelTheme = visualTheme.labels ?? {};
const selectionTheme = visualTheme.selection ?? {};
if (embedded) document.querySelector("#scope-nav")?.setAttribute("hidden", "");
document.body.classList.toggle(
  "courtos-viewer",
  courtOsViewer,
);

const hostTargetOrigin = (() => {
  const configured = query.get("parentOrigin");
  if (configured) {
    try { return new URL(configured).origin; } catch { /* use referrer */ }
  }
  if (!document.referrer) return window.location.origin;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return window.location.origin;
  }
})();

function postFocusToHost(hex) {
  if (!hex || window.parent === window) return;
  const message = {
    type: "merecross:focus",
    source: "county",
    level: "county",
    hexId: hex.hex_id,
    q: hex.q,
    r: hex.r,
  };
  const countyId = hex.county_id ?? hex.county_context_id;
  if (countyId) message.countyId = countyId;
  if (hex.manor_id) message.manorId = hex.manor_id;
  window.parent.postMessage(message, hostTargetOrigin);
}

document.querySelector("#hex-count").textContent = data.county.county_hex_count.toLocaleString();
document.querySelector("#manor-count").textContent = data.county.manor_count.toLocaleString();
status.textContent = `${data.county.county_hex_count} standard hexes · 75 deterministic landscape recipes`;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = lightingTheme.exposure ?? 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(environmentTheme.void ?? "#34352e");
scene.fog = new THREE.FogExp2(
  environmentTheme.fog ?? cartographyTheme?.material?.fog ?? "#68695c",
  courtOsViewer ? 0.0051 : 0.0045,
);
const camera = new THREE.OrthographicCamera(-25, 25, 25, -25, 0.1, 240);
camera.position.set(33, 46, 46);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableRotate = true;
controls.enablePan = true;
controls.enableZoom = true;
controls.zoomToCursor = true;
controls.screenSpacePanning = true;
controls.minZoom = 0.75;
controls.maxZoom = 5;
controls.minPolarAngle = THREE.MathUtils.degToRad(50);
controls.maxPolarAngle = THREE.MathUtils.degToRad(52);
controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
controls.touches.ONE = THREE.TOUCH.PAN;
controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
controls.target.set(0, 0, 0);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

scene.add(new THREE.HemisphereLight(
  lightingTheme.hemisphereSky ?? "#cbbf9f",
  lightingTheme.hemisphereGround ?? "#35382f",
  lightingTheme.hemisphereIntensity ?? 1.32,
));
const sun = new THREE.DirectionalLight(
  lightingTheme.sun ?? "#d9bd88",
  lightingTheme.sunIntensity ?? 2.05,
);
sun.position.set(-34, 62, 23);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -48;
sun.shadow.camera.right = 48;
sun.shadow.camera.top = 48;
sun.shadow.camera.bottom = -48;
scene.add(sun);
const fillLight = new THREE.DirectionalLight(
  lightingTheme.fill ?? "#7d8c87",
  lightingTheme.fillIntensity ?? 0.24,
);
fillLight.position.set(30, 16, 28);
scene.add(fillLight);

const textureLoader = new THREE.TextureLoader();
function loadSurfaceTexture(path, repeat = 1.35) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function loadSpriteTexture(path) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeSharedWaterTexture() {
  const source = window.MERECROSS_SHARED_WATER?.createCanvas?.(512);
  if (!source) throw new Error("Shared Merecross water texture is unavailable.");
  const texture = new THREE.CanvasTexture(source);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

const surfaceTextures = {
  worked: loadSurfaceTexture("/assets/mapgen-landscape/materials/worked-arable-v1-1024.jpg", 1.18),
  pasture: loadSurfaceTexture("/assets/mapgen-landscape/materials/pasture-meadow-v1-1024.jpg", 1.28),
  damp: loadSurfaceTexture("/assets/mapgen-landscape/materials/damp-swale-v1-1024.jpg", 1.25),
  woodland: loadSurfaceTexture("/assets/mapgen-landscape/materials/copse-floor-v1-1024.jpg", 1.2),
  ridge: loadSurfaceTexture("/assets/mapgen-landscape/materials/dry-ridge-v1-1024.jpg", 1.25),
  water: makeSharedWaterTexture(),
};
const compositionTexture = loadSpriteTexture(compositionSurface.path);
compositionTexture.wrapS = THREE.ClampToEdgeWrapping;
compositionTexture.wrapT = THREE.ClampToEdgeWrapping;

const artTextures = {
  oaks: [1, 2, 3, 4].map((index) =>
    loadSpriteTexture(`/assets/mapgen-landscape/vegetation/oak/english-oak-oblique-v2-${index}.png`),
  ),
  shrubs: [1, 2, 3, 4].map((index) =>
    loadSpriteTexture(`/assets/mapgen-landscape/vegetation/hedgerow/hedgerow-shrub-v1-${index}.png`),
  ),
  groundcover: [1, 2, 3, 4].map((index) =>
    loadSpriteTexture(`/assets/mapgen-landscape/vegetation/groundcover/groundcover-v1-${index}.png`),
  ),
  ruralHall: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/rural/00-modest-lower-noble-hall.png"),
  pearwickHall: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/lesserLord/00-pearwick-great-hall-and-solar.png"),
  strategicHall: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/lesserLord/02-enclosed-manorial-forecourt.png"),
  baronialHall: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/baronial/00-baronial-great-hall.png"),
  castle: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/baronial/01-compact-castle.png"),
  abbey: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/church/00-abbey-church.png"),
  village: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/civic/02-outer-close-dwellings.png"),
  town: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/civic/03-town-street-cluster.png"),
  reeds: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/crossing/07-reedbed-and-willows.png"),
  denseWoodland: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/landscape/03-dense-march-woodland.png"),
  wetWoodland: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/landscape/04-wet-alder-woodland.png"),
  floodMeadow: loadSpriteTexture("/assets/mapgen-manor-v2/sprites/landscape/06-alluvial-flood-meadow.png"),
};

const directions = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];
const cornerNeighborPairs = [[0, 1], [0, 5], [5, 4], [4, 3], [3, 2], [2, 1]];
const edgeCornerPairs = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]];
const hexById = new Map(data.hexes.map((hex) => [hex.hex_id, hex]));
const hexByCoordinate = new Map(data.hexes.map((hex) => [`${hex.q},${hex.r}`, hex]));
const countyHexes = data.hexes.filter((hex) => hex.in_county);
const meanQ = countyHexes.reduce((sum, hex) => sum + hex.q, 0) / countyHexes.length;
const meanR = countyHexes.reduce((sum, hex) => sum + hex.r, 0) / countyHexes.length;
const elevationFloor = Math.min(...data.hexes.map((hex) => hex.elevation));
let reliefScale = Number(reliefInput.value);

function compositionRecipeFor(hex) {
  const recipeId = compositionLibrary.hex_assignments[hex.hex_id];
  return compositionRecipeById.get(recipeId) ?? null;
}

function axialToWorld(q, r) {
  return {
    x: Math.sqrt(3) * (q - meanQ + (r - meanR) / 2),
    z: 1.5 * (r - meanR),
  };
}

function rawHeight(hex) {
  return (hex.elevation - elevationFloor) * 0.035;
}

function height(hex) {
  return rawHeight(hex) * reliefScale;
}

function cornerPlanar(hex, cornerIndex) {
  const center = axialToWorld(hex.q, hex.r);
  const angle = THREE.MathUtils.degToRad(60 * cornerIndex - 30);
  return { x: center.x + Math.cos(angle), z: center.z + Math.sin(angle) };
}

function cornerHeight(hex, cornerIndex) {
  if (hex.terrain === "lake") return height(hex);
  const members = [hex];
  for (const directionIndex of cornerNeighborPairs[cornerIndex]) {
    const [dq, dr] = directions[directionIndex];
    const neighbor = hexByCoordinate.get(`${hex.q + dq},${hex.r + dr}`);
    if (neighbor) members.push(neighbor);
  }
  return members.reduce((sum, member) => sum + height(member), 0) / members.length;
}

function mutedColor(color) {
  const value = new THREE.Color(color || "#9dac73");
  const gray = (value.r + value.g + value.b) / 3;
  value.r = value.r * 0.43 + gray * 0.34;
  value.g = value.g * 0.43 + gray * 0.34;
  value.b = value.b * 0.43 + gray * 0.34;
  return value.multiplyScalar(0.78);
}

function surfaceTextureFor(hex) {
  if (hex.terrain === "lake") return null;
  if (hex.terrain === "forest") return surfaceTextures.woodland;
  if (hex.landcover_subtype === "rich_open_fields" || hex.landcover_subtype === "mixed_smallholdings") {
    return surfaceTextures.worked;
  }
  if (hex.landcover_subtype === "damp_meadow" || hex.landcover_subtype === "wet_wood") {
    return surfaceTextures.damp;
  }
  if (hex.landcover_subtype === "dry_meadow" || hex.landcover_subtype === "common_pasture") {
    return surfaceTextures.pasture;
  }
  return surfaceTextures.ridge;
}

function materialFor(hex) {
  const sourceColor =
    hex.terrain === "lake"
      ? new THREE.Color(waterTheme.shallow ?? "#5f7774")
      : hex.in_county
        ? new THREE.Color(hex.landcover_color || "#9dac73")
        : mutedColor(hex.landcover_color || "#899284");
  const terrainFamilyColor = new THREE.Color(
    cartographyTheme?.terrain?.[hex.terrain]
      ?? cartographyTheme?.terrain?.plains
      ?? "#8f895f",
  );
  const baseColor = hex.terrain === "lake"
    ? sourceColor
    : sourceColor.lerp(terrainFamilyColor, hex.in_county ? 0.68 : 0.52);
  const color = hex.terrain === "lake"
    ? baseColor
    : baseColor.lerp(
      new THREE.Color(materialTheme.terrainLift ?? "#a59672"),
      hex.in_county ? 0.08 : (materialTheme.contextLiftMix ?? 0.08),
    );
  if (hex.terrain === "lake") {
    return new THREE.MeshBasicMaterial({
      color: waterTheme.deep ?? "#465f61",
      map: surfaceTextures.water,
      fog: true,
      side: THREE.DoubleSide,
    });
  }
  return new THREE.MeshStandardMaterial({
    color,
    map: surfaceTextureFor(hex),
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
    roughness: materialTheme.terrainRoughness ?? 0.95,
    metalness: 0,
    transparent: !hex.in_county,
    opacity: hex.in_county ? 1 : 0.6,
    side: THREE.DoubleSide,
  });
}

const countyGroup = new THREE.Group();
const contextGroup = new THREE.Group();
const terrainHitMeshes = [];
let markerHitMeshes = [];
scene.add(contextGroup, countyGroup);

function makeHexGeometry(hex) {
  const center = axialToWorld(hex.q, hex.r);
  const vertices = [];
  const uvs = [];
  const worldUvScale = 0.19;
  for (let corner = 0; corner < 6; corner += 1) {
    const a = cornerPlanar(hex, corner);
    const b = cornerPlanar(hex, (corner + 1) % 6);
    const angleA = THREE.MathUtils.degToRad(60 * corner - 30);
    const angleB = THREE.MathUtils.degToRad(60 * ((corner + 1) % 6) - 30);
    vertices.push(
      center.x, height(hex), center.z,
      a.x, cornerHeight(hex, corner), a.z,
      b.x, cornerHeight(hex, (corner + 1) % 6), b.z,
    );
    uvs.push(
      center.x * worldUvScale, center.z * worldUvScale,
      a.x * worldUvScale, a.z * worldUvScale,
      b.x * worldUvScale, b.z * worldUvScale,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function buildTerrain() {
  for (const hex of data.hexes) {
    const mesh = new THREE.Mesh(makeHexGeometry(hex), materialFor(hex));
    mesh.userData.hex = hex;
    mesh.receiveShadow = true;
    (hex.in_county ? countyGroup : contextGroup).add(mesh);
    terrainHitMeshes.push(mesh);
  }
}
buildTerrain();

const compositionGroundGroup = new THREE.Group();
let compositionCountyMesh = null;
let compositionContextMesh = null;
scene.add(compositionGroundGroup);

function makeCompositionGeometry(sourceHexes) {
  const bounds = compositionSurface.world_bounds;
  const vertices = [];
  const uvs = [];
  for (const hex of sourceHexes) {
    if (hex.terrain === "lake") continue;
    const center = axialToWorld(hex.q, hex.r);
    for (let corner = 0; corner < 6; corner += 1) {
      const a = cornerPlanar(hex, corner);
      const b = cornerPlanar(hex, (corner + 1) % 6);
      vertices.push(
        center.x, height(hex), center.z,
        a.x, cornerHeight(hex, corner), a.z,
        b.x, cornerHeight(hex, (corner + 1) % 6), b.z,
      );
      for (const point of [center, a, b]) {
        uvs.push(
          (point.x - bounds.min_x) / bounds.width,
          1 - ((point.z - bounds.min_z) / bounds.height),
        );
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function compositionMaterial(opacity) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: compositionTexture,
    roughness: 0.96,
    metalness: 0,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  });
}

function buildCompositionGround() {
  for (const child of [...compositionGroundGroup.children]) {
    child.geometry?.dispose();
    child.material?.dispose();
    compositionGroundGroup.remove(child);
  }
  compositionCountyMesh = new THREE.Mesh(
    makeCompositionGeometry(data.hexes.filter((hex) => hex.in_county)),
    compositionMaterial(0.64),
  );
  compositionContextMesh = new THREE.Mesh(
    makeCompositionGeometry(data.hexes.filter((hex) => !hex.in_county)),
    compositionMaterial(0.32),
  );
  for (const mesh of [compositionCountyMesh, compositionContextMesh]) {
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    mesh.raycast = () => {};
    compositionGroundGroup.add(mesh);
  }
  compositionContextMesh.visible = contextInput.checked;
  compositionGroundGroup.visible = compositionInput.checked;
}
buildCompositionGround();

function syncCompositionSurfaceState() {
  const enabled = compositionInput.checked;
  compositionGroundGroup.visible = enabled;
  for (const group of [countyGroup, contextGroup]) {
    for (const mesh of group.children) {
      const desiredMap = enabled ? null : surfaceTextureFor(mesh.userData.hex);
      if (mesh.material.map === desiredMap) continue;
      mesh.material.map = desiredMap;
      mesh.material.needsUpdate = true;
    }
  }
}
syncCompositionSurfaceState();

function cylinderBetween(a, b, radius, material, radialSegments = 6) {
  const delta = new THREE.Vector3().subVectors(b, a);
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments),
    material,
  );
  cylinder.position.copy(a).add(b).multiplyScalar(0.5);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return cylinder;
}

const countyBoundaryGroup = new THREE.Group();
const landscapeBorderGroup = new THREE.Group();
const holdingBoundaryGroup = new THREE.Group();
const gridGroup = new THREE.Group();
const roadsGroup = new THREE.Group();
const riversGroup = new THREE.Group();
const shorelineGroup = new THREE.Group();
const seatGroup = new THREE.Group();
const assetsGroup = new THREE.Group();
const portfolioGroup = new THREE.Group();
scene.add(
  countyBoundaryGroup,
  holdingBoundaryGroup,
  gridGroup,
  landscapeBorderGroup,
  shorelineGroup,
  roadsGroup,
  riversGroup,
  assetsGroup,
  seatGroup,
  portfolioGroup,
);

const assetPlacements = [];
const contactShadowMaterial = new THREE.MeshBasicMaterial({
  color: 0x1f261d,
  transparent: true,
  opacity: 0.24,
  depthWrite: false,
});

function seededUnit(seed, salt = 0) {
  let value = 2166136261;
  const text = `${seed}:${salt}`;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) % 100000) / 100000;
}

function offsetFor(seed, index, radius = 0.66) {
  const angle = seededUnit(seed, index * 2) * Math.PI * 2;
  const distance = Math.sqrt(seededUnit(seed, index * 2 + 1)) * radius;
  return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance };
}

function addContactShadow(hex, x, z, radius) {
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(radius, 16), contactShadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, height(hex) + 0.035, z);
  shadow.renderOrder = 4;
  assetsGroup.add(shadow);
  assetPlacements.push({ object: shadow, hex, groundOffset: 0.035 });
}

function addBillboard(texture, hex, {
  offsetX = 0,
  offsetZ = 0,
  width = 0.55,
  spriteHeight = 0.55,
  tint = 0xffffff,
  shadow = false,
  renderOrder = 8,
  anchorX = 0.5,
  anchorY = 0.065,
} = {}) {
  const center = axialToWorld(hex.q, hex.r);
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: tint,
    transparent: true,
    alphaTest: 0.045,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(anchorX, anchorY);
  sprite.position.set(center.x + offsetX, height(hex) + 0.045, center.z + offsetZ);
  sprite.scale.set(width, spriteHeight, 1);
  sprite.renderOrder = renderOrder;
  assetsGroup.add(sprite);
  assetPlacements.push({ object: sprite, hex, groundOffset: 0.045 });
  if (shadow) addContactShadow(hex, center.x + offsetX, center.z + offsetZ, width * 0.26);
  return sprite;
}

function forestDensity(hex) {
  const recipe = compositionRecipeFor(hex);
  if (hex.terrain !== "forest" && !/forest|wood/.test(hex.landcover_subtype ?? "")) return 0;
  return Math.max(5, Math.round(5 + (recipe?.procedural.canopy_density ?? 0.45) * 13));
}

function buildLandscapeAssets() {
  for (const hex of countyHexes) {
    const recipe = compositionRecipeFor(hex);
    if (hex.terrain === "lake") {
      for (let index = 0; index < 2; index += 1) {
        const offset = offsetFor(`${hex.hex_id}:reeds`, index, 0.7);
        addBillboard(artTextures.reeds, hex, {
          offsetX: offset.x,
          offsetZ: offset.z,
          width: 0.72,
          spriteHeight: 0.46,
          tint: index ? 0xc7d5b5 : 0xffffff,
          renderOrder: 8,
        });
      }
      continue;
    }
    const treeCount = forestDensity(hex);
    if (
      treeCount &&
      seededUnit(`${hex.hex_id}:canopy-mass`, 91) >
        0.82 - (recipe?.procedural.canopy_density ?? 0.4) * 0.2
    ) {
      const wet = hex.landcover_subtype === "wet_wood";
      addBillboard(wet ? artTextures.wetWoodland : artTextures.denseWoodland, hex, {
        width: wet ? 1.48 : 1.56,
        spriteHeight: wet ? 1.24 : 1.32,
        anchorX: wet ? 0.485037 : 0.510025,
        anchorY: wet ? 0.010145 : 0.010355,
        tint: wet ? 0xd0ded1 : 0xffffff,
        shadow: true,
        renderOrder: 6,
      });
    }
    for (let index = 0; index < treeCount; index += 1) {
      const offset = offsetFor(hex.hex_id, index, 0.7);
      const size = 0.72 + seededUnit(hex.hex_id, index + 80) * 0.32;
      addBillboard(artTextures.oaks[index % artTextures.oaks.length], hex, {
        offsetX: offset.x,
        offsetZ: offset.z,
        width: size * 0.78,
        spriteHeight: size,
        tint: hex.landcover_subtype === "wet_wood" ? 0xc4d7c6 : 0xffffff,
        renderOrder: 7,
      });
    }

    const shrubCount =
      hex.landcover_subtype === "forest_edge" ? 4 :
      hex.landcover_subtype === "wet_wood" ? 3 :
      Math.round((recipe?.procedural.shrub_density ?? 0.08) * 5);
    for (let index = 0; index < shrubCount; index += 1) {
      const offset = offsetFor(`${hex.hex_id}:shrub`, index, 0.72);
      addBillboard(artTextures.shrubs[index % artTextures.shrubs.length], hex, {
        offsetX: offset.x,
        offsetZ: offset.z,
        width: 0.42,
        spriteHeight: 0.31,
        renderOrder: 6,
      });
    }

    const showGroundcover =
      seededUnit(hex.hex_id, 44) >
      0.82 - (recipe?.procedural.groundcover_density ?? 0.25) * 0.62;
    if (showGroundcover) {
      const offset = offsetFor(`${hex.hex_id}:cover`, 0, 0.62);
      addBillboard(
        artTextures.groundcover[Math.floor(seededUnit(hex.hex_id, 47) * artTextures.groundcover.length)],
        hex,
        {
          offsetX: offset.x,
          offsetZ: offset.z,
          width: 0.4,
          spriteHeight: 0.32,
          renderOrder: 5,
        },
      );
    }
    if (
      ["damp_meadow", "flood_marsh", "dry_meadow"].includes(hex.landcover_subtype) &&
      seededUnit(`${hex.hex_id}:meadow-mass`, 92) > 0.78
    ) {
      const offset = offsetFor(`${hex.hex_id}:meadow-mass`, 0, 0.38);
      addBillboard(artTextures.floodMeadow, hex, {
        offsetX: offset.x,
        offsetZ: offset.z,
        width: 1.12,
        spriteHeight: 0.82,
        anchorX: 0.47125,
        anchorY: 0.010736,
        tint: hex.landcover_subtype === "damp_meadow" ? 0xd0dac3 : 0xffffff,
        renderOrder: 5,
      });
    }
  }
}

function manorArt(manor) {
  if (manor.seat_hex_id === data.county.focus_hex_id) {
    return { texture: artTextures.pearwickHall, width: 1.28, height: 1.03, anchorX: 0.467949, anchorY: 0.009777 };
  }
  if (manor.holding_type === "church_fief") {
    return { texture: artTextures.abbey, width: 1.3, height: 1.14, anchorX: 0.521028, anchorY: 0.003866 };
  }
  if (manor.primary_role === "elite" || manor.seat_archetype === "elite") {
    return { texture: artTextures.castle, width: 1.46, height: 1.32, anchorX: 0.486005, anchorY: 0.009563 };
  }
  if (manor.holding_type === "barony") {
    return { texture: artTextures.baronialHall, width: 1.24, height: 1.05, anchorX: 0.501312, anchorY: 0.010417 };
  }
  if (manor.primary_role === "strategic" || manor.seat_archetype === "strategic") {
    return { texture: artTextures.strategicHall, width: 1.06, height: 0.88, anchorX: 0.463384, anchorY: 0.010448 };
  }
  return { texture: artTextures.ruralHall, width: 0.92, height: 0.78, anchorX: 0.494382, anchorY: 0.009115 };
}

function buildSettlementAssets() {
  const settlementHexIds = new Set(data.settlements.map((settlement) => settlement.hex_id));
  for (const manor of data.manors) {
    const hex = hexById.get(manor.seat_hex_id);
    if (!hex) continue;
    const art = manorArt(manor);
    const nudge = settlementHexIds.has(manor.seat_hex_id) ? { x: -0.2, z: -0.13 } : { x: 0, z: 0 };
    addBillboard(art.texture, hex, {
      offsetX: nudge.x,
      offsetZ: nudge.z,
      width: art.width,
      spriteHeight: art.height,
      shadow: true,
      renderOrder: 10,
      anchorX: art.anchorX,
      anchorY: art.anchorY,
    });
    if (manor.households >= 72 && !settlementHexIds.has(manor.seat_hex_id)) {
      const offset = offsetFor(`${manor.manor_id}:yard`, 0, 0.42);
      addBillboard(artTextures.village, hex, {
        offsetX: offset.x,
        offsetZ: offset.z,
        width: 0.58,
        spriteHeight: 0.46,
        shadow: true,
        renderOrder: 9,
        anchorX: 0.549312,
        anchorY: 0.012027,
      });
    }
  }

  for (const settlement of data.settlements) {
    const hex = hexById.get(settlement.hex_id);
    if (!hex) continue;
    addBillboard(artTextures.town, hex, {
      offsetX: 0.22,
      offsetZ: 0.08,
      width: 1.38,
      spriteHeight: 0.98,
      shadow: true,
      renderOrder: 11,
      anchorX: 0.501247,
      anchorY: 0.011905,
    });
    addBillboard(artTextures.village, hex, {
      offsetX: -0.27,
      offsetZ: 0.24,
      width: 0.7,
      spriteHeight: 0.52,
      shadow: true,
      renderOrder: 9,
      anchorX: 0.549312,
      anchorY: 0.012027,
    });
  }
}

buildLandscapeAssets();
buildSettlementAssets();
status.textContent =
  `${data.county.county_hex_count} standard hexes · 75 landscape recipes · ` +
  `${assetPlacements.filter((placement) => placement.object.isSprite).length} scale-aware assets`;

const boundaryMaterial = new THREE.MeshBasicMaterial({ color: routeTheme.jurisdiction ?? "#342f27" });
const holdingMaterial = new THREE.MeshBasicMaterial({ color: routeTheme.boundary ?? "#6f6856", transparent: true, opacity: 0.65 });
const gridMaterial = new THREE.LineBasicMaterial({ color: routeTheme.grid ?? "#5b5749", transparent: true, opacity: 0.22 });
const roadVergeMaterial = new THREE.MeshStandardMaterial({
  color: routeTheme.verge ?? "#4c4938",
  roughness: 1,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const roadBedMaterial = new THREE.MeshBasicMaterial({
  color: routeTheme.bed ?? "#806343",
  map: surfaceTextures.ridge,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const roadWearMaterial = new THREE.MeshBasicMaterial({
  color: routeTheme.wear ?? "#a28760",
  transparent: true,
  opacity: 0.68,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const riverBankMaterial = new THREE.MeshStandardMaterial({
  color: waterTheme.bank ?? "#485247",
  roughness: 1,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const riverMaterial = new THREE.MeshBasicMaterial({
  color: waterTheme.deep ?? "#465f61",
  transparent: true,
  opacity: 0.96,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const riverGlintMaterial = new THREE.MeshBasicMaterial({
  color: waterTheme.glint ?? "#aaa98e",
  transparent: true,
  opacity: waterTheme.glintOpacity ?? 0.12,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const shoreBankMaterial = new THREE.MeshStandardMaterial({
  color: waterTheme.shore ?? "#756d56",
  roughness: 1,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const shoreWetMaterial = new THREE.MeshStandardMaterial({
  color: waterTheme.shallow ?? "#5f7774",
  roughness: 0.82,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const borderEarthMaterial = new THREE.MeshStandardMaterial({
  color: 0x51432e,
  roughness: 1,
  transparent: true,
  opacity: 0.94,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const borderHedgeMaterial = new THREE.MeshStandardMaterial({
  color: 0x314d2f,
  roughness: 1,
  transparent: true,
  opacity: 0.92,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const borderWetMaterial = new THREE.MeshStandardMaterial({
  color: 0x385e5b,
  roughness: 0.76,
  transparent: true,
  opacity: 0.88,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const boundaryStoneMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b887a,
  roughness: 0.96,
});
const boundaryTimberMaterial = new THREE.MeshStandardMaterial({
  color: 0x61452f,
  roughness: 1,
});

function ribbonGeometry(points, width, lateralOffset = 0) {
  const vertices = [];
  const uvs = [];
  let distance = 0;
  const sections = points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = new THREE.Vector3(next.x - previous.x, 0, next.z - previous.z).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    if (index > 0) distance += point.distanceTo(points[index - 1]);
    const center = point.clone().addScaledVector(normal, lateralOffset);
    return {
      left: center.clone().addScaledVector(normal, width / 2),
      right: center.clone().addScaledVector(normal, -width / 2),
      distance,
    };
  });
  for (let index = 0; index < sections.length - 1; index += 1) {
    const a = sections[index];
    const b = sections[index + 1];
    vertices.push(
      a.left.x, a.left.y, a.left.z,
      a.right.x, a.right.y, a.right.z,
      b.left.x, b.left.y, b.left.z,
      a.right.x, a.right.y, a.right.z,
      b.right.x, b.right.y, b.right.z,
      b.left.x, b.left.y, b.left.z,
    );
    uvs.push(
      0, a.distance,
      1, a.distance,
      0, b.distance,
      1, a.distance,
      1, b.distance,
      0, b.distance,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function addRibbon(group, points, width, material, {
  verticalOffset = 0,
  lateralOffset = 0,
  renderOrder = 3,
} = {}) {
  const raised = points.map((point) => point.clone().add(new THREE.Vector3(0, verticalOffset, 0)));
  const mesh = new THREE.Mesh(ribbonGeometry(raised, width, lateralOffset), material);
  mesh.renderOrder = renderOrder;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function featureCurvePoints(edge, isRiver) {
  const fromHex = hexById.get(edge.from_hex_id);
  const toHex = hexById.get(edge.to_hex_id);
  if (!fromHex || !toHex) return [];
  const from = axialToWorld(fromHex.q, fromHex.r);
  const to = axialToWorld(toHex.q, toHex.r);
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz) || 1;
  const normalX = -dz / length;
  const normalZ = dx / length;
  const directionIndex = directions.findIndex(
    ([dq, dr]) => fromHex.q + dq === toHex.q && fromHex.r + dr === toHex.r,
  );
  const sharedEdgeHeight = directionIndex >= 0
    ? edgeCornerPairs[directionIndex]
      .map((cornerIndex) => cornerHeight(fromHex, cornerIndex))
      .reduce((sum, value) => sum + value, 0) / 2
    : (height(fromHex) + height(toHex)) / 2;
  const seed = `${edge.from_hex_id}:${edge.to_hex_id}:${edge.feature_kind}`;
  const phase = seededUnit(seed, 1) * Math.PI * 2;
  const secondaryPhase = seededUnit(seed, 2) * Math.PI * 2;
  const amplitude = isRiver ? 0.29 : edge.feature_class === "regional" ? 0.14 : 0.19;
  const points = [];
  const segmentCount = isRiver ? 9 : 7;
  for (let index = 0; index <= segmentCount; index += 1) {
    const t = index / segmentCount;
    const envelope = Math.sin(Math.PI * t) ** 2;
    const wiggle = envelope * (
      Math.sin(t * Math.PI * 2 + phase) * amplitude +
      Math.sin(t * Math.PI * 4 + secondaryPhase) * amplitude * 0.32
    );
    const terrainHeight = t <= 0.5
      ? THREE.MathUtils.lerp(height(fromHex), sharedEdgeHeight, t * 2)
      : THREE.MathUtils.lerp(sharedEdgeHeight, height(toHex), (t - 0.5) * 2);
    points.push(new THREE.Vector3(
      THREE.MathUtils.lerp(from.x, to.x, t) + normalX * wiggle,
      terrainHeight,
      THREE.MathUtils.lerp(from.z, to.z, t) + normalZ * wiggle,
    ));
  }
  return points;
}

function shorelinePoints(hex, edge) {
  const start = pointOnEdge(hex, edge, 0);
  const end = pointOnEdge(hex, edge, 1);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz) || 1;
  const normalX = -dz / length;
  const normalZ = dx / length;
  const phase = seededUnit(`${hex.hex_id}:shore:${edge}`, 1) * Math.PI * 2;
  const points = [];
  for (let index = 0; index <= 6; index += 1) {
    const t = index / 6;
    const wiggle = Math.sin(Math.PI * t) * Math.sin(t * Math.PI * 2 + phase) * 0.045;
    points.push(new THREE.Vector3(
      THREE.MathUtils.lerp(start.x, end.x, t) + normalX * wiggle,
      height(hex),
      THREE.MathUtils.lerp(start.z, end.z, t) + normalZ * wiggle,
    ));
  }
  return points;
}

function boundaryPoint(hex, edge, t) {
  const start = pointOnEdge(hex, edge, 0);
  const end = pointOnEdge(hex, edge, 1);
  return start.clone().lerp(end, t);
}

function boundarySegmentPoints(hex, edge, fromT = 0.08, toT = 0.92, seed = "") {
  const start = pointOnEdge(hex, edge, 0);
  const end = pointOnEdge(hex, edge, 1);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz) || 1;
  const normalX = -dz / length;
  const normalZ = dx / length;
  const phase = seededUnit(seed || `${hex.hex_id}:${edge}`, 71) * Math.PI * 2;
  const points = [];
  for (let index = 0; index <= 5; index += 1) {
    const localT = index / 5;
    const t = THREE.MathUtils.lerp(fromT, toT, localT);
    const wiggle = Math.sin(Math.PI * localT) * Math.sin(localT * Math.PI * 2 + phase) * 0.035;
    points.push(new THREE.Vector3(
      THREE.MathUtils.lerp(start.x, end.x, t) + normalX * wiggle,
      THREE.MathUtils.lerp(start.y, end.y, t),
      THREE.MathUtils.lerp(start.z, end.z, t) + normalZ * wiggle,
    ));
  }
  return points;
}

function addBoundarySprite(texture, point, width, spriteHeight, tint = 0xffffff) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: tint,
    transparent: true,
    alphaTest: 0.045,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0.065);
  sprite.position.set(point.x, point.y + 0.04, point.z);
  sprite.scale.set(width, spriteHeight, 1);
  sprite.renderOrder = 9;
  landscapeBorderGroup.add(sprite);
}

function addBoundaryStone(point, size = 0.095) {
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), boundaryStoneMaterial);
  stone.scale.set(0.75, 1.4, 0.72);
  stone.position.set(point.x, point.y + size * 0.9, point.z);
  stone.castShadow = true;
  stone.renderOrder = 10;
  landscapeBorderGroup.add(stone);
}

function addShortFence(hex, edge, seed) {
  const a = boundaryPoint(hex, edge, 0.24);
  const b = boundaryPoint(hex, edge, 0.76);
  for (const point of [a, b]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.25, 6),
      boundaryTimberMaterial,
    );
    post.position.set(point.x, point.y + 0.125, point.z);
    post.renderOrder = 8;
    landscapeBorderGroup.add(post);
  }
  const railA = a.clone().add(new THREE.Vector3(0, 0.1, 0));
  const railB = b.clone().add(new THREE.Vector3(0, 0.1, 0));
  const rail = cylinderBetween(railA, railB, 0.014, boundaryTimberMaterial, 5);
  rail.renderOrder = 8;
  landscapeBorderGroup.add(rail);
  if (seededUnit(seed, 93) > 0.62) {
    const highRail = cylinderBetween(
      a.clone().add(new THREE.Vector3(0, 0.18, 0)),
      b.clone().add(new THREE.Vector3(0, 0.18, 0)),
      0.011,
      boundaryTimberMaterial,
      5,
    );
    highRail.renderOrder = 8;
    landscapeBorderGroup.add(highRail);
  }
}

function buildLandscapeBorders() {
  for (const border of data.authored_border_edges ?? []) {
    const hex = hexById.get(border.hex_id);
    if (!hex) continue;
    const seed = `${border.hex_id}:${border.edge}:${border.border_kind}`;
    if (border.border_kind === "treeline") {
      addRibbon(
        landscapeBorderGroup,
        boundarySegmentPoints(hex, border.edge, 0.06, 0.94, seed),
        0.12,
        borderEarthMaterial,
        { verticalOffset: 0.035, renderOrder: 5 },
      );
      for (const [index, t] of [0.3, 0.7].entries()) {
        if (index === 1 && seededUnit(seed, 12) < 0.28) continue;
        addBoundarySprite(
          artTextures.oaks[Math.floor(seededUnit(seed, 20 + index) * artTextures.oaks.length)],
          boundaryPoint(hex, border.edge, t),
          0.43,
          0.58,
          seededUnit(seed, 28 + index) > 0.76 ? 0xd3dbc8 : 0xffffff,
        );
      }
      if (seededUnit(seed, 31) > 0.46) {
        addBoundarySprite(
          artTextures.shrubs[Math.floor(seededUnit(seed, 32) * artTextures.shrubs.length)],
          boundaryPoint(hex, border.edge, 0.52),
          0.31,
          0.23,
        );
      }
      continue;
    }

    if (border.border_kind === "hedge_ditch") {
      const hasFieldGap = seededUnit(seed, 41) > 0.58;
      const segments = hasFieldGap
        ? [[0.07, 0.43], [0.57, 0.93]]
        : [[0.07, 0.93]];
      for (const [fromT, toT] of segments) {
        const points = boundarySegmentPoints(hex, border.edge, fromT, toT, `${seed}:${fromT}`);
        addRibbon(landscapeBorderGroup, points, 0.14, borderEarthMaterial, {
          verticalOffset: 0.032,
          renderOrder: 5,
        });
        addRibbon(landscapeBorderGroup, points, 0.075, borderHedgeMaterial, {
          verticalOffset: 0.06,
          renderOrder: 6,
        });
      }
      addBoundarySprite(
        artTextures.shrubs[Math.floor(seededUnit(seed, 45) * artTextures.shrubs.length)],
        boundaryPoint(hex, border.edge, seededUnit(seed, 46) > 0.5 ? 0.3 : 0.7),
        0.43,
        0.31,
      );
      // County edges are not continuous fences; short enclosed stretches are exceptional.
      if (seededUnit(seed, 47) > 0.91) addShortFence(hex, border.edge, seed);
      continue;
    }

    if (border.border_kind === "wet_margin") {
      const points = boundarySegmentPoints(hex, border.edge, 0.08, 0.92, seed);
      addRibbon(landscapeBorderGroup, points, 0.145, borderEarthMaterial, {
        verticalOffset: 0.028,
        renderOrder: 5,
      });
      addRibbon(landscapeBorderGroup, points, 0.07, borderWetMaterial, {
        verticalOffset: 0.052,
        renderOrder: 6,
      });
      if (seededUnit(seed, 51) > 0.35) {
        addBoundarySprite(artTextures.reeds, boundaryPoint(hex, border.edge, 0.5), 0.48, 0.31, 0xd5dec3);
      }
      continue;
    }

    if (border.border_kind === "road_crossing" || border.border_kind === "bridge_crossing") {
      for (const [fromT, toT] of [[0.07, 0.36], [0.64, 0.93]]) {
        const points = boundarySegmentPoints(hex, border.edge, fromT, toT, `${seed}:${fromT}`);
        addRibbon(landscapeBorderGroup, points, 0.1, borderEarthMaterial, {
          verticalOffset: 0.035,
          renderOrder: 5,
        });
        addRibbon(landscapeBorderGroup, points, 0.048, borderHedgeMaterial, {
          verticalOffset: 0.058,
          renderOrder: 6,
        });
      }
      addBoundaryStone(boundaryPoint(hex, border.edge, 0.4), 0.1);
      addBoundaryStone(boundaryPoint(hex, border.edge, 0.6), 0.1);
      continue;
    }

    if (border.border_kind === "river_crossing") {
      for (const [fromT, toT] of [[0.07, 0.31], [0.69, 0.93]]) {
        const points = boundarySegmentPoints(hex, border.edge, fromT, toT, `${seed}:${fromT}`);
        addRibbon(landscapeBorderGroup, points, 0.13, borderWetMaterial, {
          verticalOffset: 0.04,
          renderOrder: 6,
        });
      }
      addBoundarySprite(artTextures.reeds, boundaryPoint(hex, border.edge, 0.22), 0.4, 0.27, 0xd3dec4);
      addBoundarySprite(artTextures.reeds, boundaryPoint(hex, border.edge, 0.78), 0.4, 0.27, 0xd3dec4);
      continue;
    }

    const points = boundarySegmentPoints(hex, border.edge, 0.12, 0.88, seed);
    addRibbon(landscapeBorderGroup, points, 0.095, borderEarthMaterial, {
      verticalOffset: 0.035,
      renderOrder: 5,
    });
    if (seededUnit(seed, 61) > 0.42) addBoundaryStone(boundaryPoint(hex, border.edge, 0.5));
  }
}

function riverChains() {
  const riverEdges = data.feature_edges.filter((edge) => edge.feature_kind === "river_crossing");
  const adjacency = new Map();
  const edgeByPair = new Map();
  for (const edge of riverEdges) {
    const pair = [edge.from_hex_id, edge.to_hex_id].sort().join("__");
    edgeByPair.set(pair, edge);
    for (const [from, to] of [
      [edge.from_hex_id, edge.to_hex_id],
      [edge.to_hex_id, edge.from_hex_id],
    ]) {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from).push(to);
    }
  }
  const visited = new Set();
  const chains = [];
  const walk = (start, neighbor) => {
    const chain = [start];
    let previous = start;
    let current = neighbor;
    visited.add([start, neighbor].sort().join("__"));
    chain.push(current);
    while ((adjacency.get(current)?.length ?? 0) === 2) {
      const next = adjacency.get(current).find((candidate) => candidate !== previous);
      const pair = [current, next].sort().join("__");
      if (visited.has(pair)) break;
      visited.add(pair);
      previous = current;
      current = next;
      chain.push(current);
    }
    return chain;
  };
  for (const [node, neighbors] of adjacency) {
    if (neighbors.length === 2) continue;
    for (const neighbor of neighbors) {
      const pair = [node, neighbor].sort().join("__");
      if (!visited.has(pair)) chains.push(walk(node, neighbor));
    }
  }
  for (const pair of edgeByPair.keys()) {
    if (visited.has(pair)) continue;
    const [start, neighbor] = pair.split("__");
    chains.push(walk(start, neighbor));
  }
  return chains;
}

function riverChainPoints(chain) {
  if (chain.length === 2) {
    return featureCurvePoints({
      from_hex_id: chain[0],
      to_hex_id: chain[1],
      feature_kind: "river_crossing",
      feature_class: "minor_river",
    }, true);
  }
  const anchors = chain
    .map((hexId) => hexById.get(hexId))
    .filter(Boolean)
    .map((hex) => {
      const world = axialToWorld(hex.q, hex.r);
      return new THREE.Vector3(world.x, height(hex), world.z);
    });
  if (anchors.length < 2) return [];
  const curve = new THREE.CatmullRomCurve3(anchors, false, "centripetal", 0.25);
  const sampled = curve.getPoints(Math.max(10, (anchors.length - 1) * 9));
  const seed = chain.join(":");
  const phase = seededUnit(seed, 8) * Math.PI * 2;
  return sampled.map((point, index) => {
    const t = index / Math.max(1, sampled.length - 1);
    const previous = sampled[Math.max(0, index - 1)];
    const next = sampled[Math.min(sampled.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz) || 1;
    const meander =
      Math.sin(Math.PI * t) ** 2 *
      Math.sin(t * Math.PI * Math.max(2, anchors.length - 1) + phase) *
      0.1;
    return new THREE.Vector3(
      point.x + (-dz / length) * meander,
      point.y,
      point.z + (dx / length) * meander,
    );
  });
}

function pointOnEdge(hex, edge, position) {
  const cornerIndex = edgeCornerPairs[edge][position];
  const planar = cornerPlanar(hex, cornerIndex);
  return new THREE.Vector3(planar.x, cornerHeight(hex, cornerIndex) + 0.055, planar.z);
}

function buildLines() {
  for (const entry of data.county_boundary_edges) {
    const hex = hexById.get(entry.hex_id);
    if (!hex) continue;
    countyBoundaryGroup.add(
      cylinderBetween(pointOnEdge(hex, entry.edge, 0), pointOnEdge(hex, entry.edge, 1), 0.075, boundaryMaterial, 8),
    );
  }

  for (const entry of data.holding_boundary_edges) {
    const aHex = hexById.get(entry.hex_id);
    const bHex = hexById.get(entry.neighbor_hex_id);
    if (!aHex || !bHex) continue;
    const a = axialToWorld(aHex.q, aHex.r);
    const b = axialToWorld(bHex.q, bHex.r);
    const midpoint = new THREE.Vector3(
      (a.x + b.x) / 2,
      (height(aHex) + height(bHex)) / 2 + 0.06,
      (a.z + b.z) / 2,
    );
    const tangent = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(0.52);
    holdingBoundaryGroup.add(
      cylinderBetween(
        midpoint.clone().sub(tangent),
        midpoint.clone().add(tangent),
        0.025,
        holdingMaterial,
        5,
      ),
    );
  }

  const gridPositions = [];
  for (const hex of countyHexes) {
    if (hex.terrain === "lake") continue;
    for (let corner = 0; corner < 6; corner += 1) {
      const a = cornerPlanar(hex, corner);
      const b = cornerPlanar(hex, (corner + 1) % 6);
      gridPositions.push(
        a.x, cornerHeight(hex, corner) + 0.025, a.z,
        b.x, cornerHeight(hex, (corner + 1) % 6) + 0.025, b.z,
      );
    }
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
  gridGroup.add(new THREE.LineSegments(gridGeometry, gridMaterial));

  for (const hex of countyHexes.filter((candidate) => candidate.terrain === "lake")) {
    for (let edge = 0; edge < directions.length; edge += 1) {
      const [dq, dr] = directions[edge];
      const neighbor = hexByCoordinate.get(`${hex.q + dq},${hex.r + dr}`);
      if (neighbor?.terrain === "lake") continue;
      const points = shorelinePoints(hex, edge);
      addRibbon(shorelineGroup, points, 0.19, shoreBankMaterial, {
        verticalOffset: 0.035,
        renderOrder: 2,
      });
      addRibbon(shorelineGroup, points, 0.09, shoreWetMaterial, {
        verticalOffset: 0.052,
        renderOrder: 3,
      });
    }
  }

  for (const chain of riverChains()) {
    const points = riverChainPoints(chain);
    if (points.length < 2) continue;
    addRibbon(riversGroup, points, 0.46, riverBankMaterial, {
      verticalOffset: 0.035,
      renderOrder: 2,
    });
    addRibbon(riversGroup, points, 0.255, riverMaterial, {
      verticalOffset: 0.062,
      renderOrder: 3,
    });
    addRibbon(riversGroup, points, 0.038, riverGlintMaterial, {
      verticalOffset: 0.075,
      lateralOffset: 0.018,
      renderOrder: 4,
    });
  }

  for (const edge of data.feature_edges.filter((candidate) => candidate.feature_kind === "road_crossing")) {
    const points = featureCurvePoints(edge, false);
    if (points.length < 2) continue;
    const roadWidth =
      edge.feature_class === "regional" ? 0.27 :
      edge.feature_class === "manor_road" ? 0.14 : 0.205;
    addRibbon(roadsGroup, points, roadWidth + 0.14, roadVergeMaterial, {
      verticalOffset: 0.038,
      renderOrder: 2,
    });
    addRibbon(roadsGroup, points, roadWidth, roadBedMaterial, {
      verticalOffset: 0.058,
      renderOrder: 3,
    });
    addRibbon(roadsGroup, points, Math.max(0.018, roadWidth * 0.14), roadWearMaterial, {
      verticalOffset: 0.074,
      renderOrder: 4,
    });
  }
  buildLandscapeBorders();
}
buildLines();
countyBoundaryGroup.visible = false;
holdingBoundaryGroup.visible = false;

function addSeatMarker(entry, index) {
  const hex = hexById.get(entry.hex_id);
  if (!hex) return;
  const position = axialToWorld(hex.q, hex.r);
  const focus = entry.hex_id === data.county.focus_hex_id;
  const geometry = focus
    ? new THREE.ConeGeometry(0.26, 0.7, 6)
    : new THREE.CylinderGeometry(0.14, 0.18, 0.36, 8);
  const material = new THREE.MeshStandardMaterial({
    color: focus
      ? (labelTheme.selectedRule ?? "#d0ad64")
      : (labelTheme.placeInk ?? "#ded2b4"),
    roughness: 0.72,
  });
  const marker = new THREE.Mesh(geometry, material);
  marker.position.set(position.x, height(hex) + (focus ? 0.4 : 0.23), position.z);
  marker.castShadow = true;
  marker.userData.hex = hex;
  marker.userData.markerIndex = index;
  seatGroup.add(marker);
  markerHitMeshes.push(marker);
}
data.labels.forEach(addSeatMarker);

const labelElements = [...data.labels, ...(data.neighbor_labels ?? [])].map((label) => {
  const element = document.createElement("div");
  element.className = `map-label ${label.kind}`;
  element.innerHTML = label.sublabel
    ? `${label.label}<small>${label.sublabel}</small>`
    : label.label;
  labelsRoot.append(element);
  return { label, element };
});
let portfolioLabels = [];
let focusedPortfolioManorId = null;

function clearPortfolioMarkers() {
  for (const child of [...portfolioGroup.children]) {
    child.geometry?.dispose();
    child.material?.dispose();
    portfolioGroup.remove(child);
  }
  for (const entry of portfolioLabels) entry.element.remove();
  portfolioLabels = [];
}

function showPortfolio(payload) {
  clearPortfolioMarkers();
  const manors = Array.isArray(payload?.manors) ? payload.manors : [];
  focusedPortfolioManorId = payload?.focus?.manorId ?? payload?.focus?.manor_id ?? null;
  for (const manor of manors) {
    if (manor.countyId !== data.county.id) continue;
    const hex = hexByCoordinate.get(`${manor.q},${manor.r}`) ?? hexById.get(manor.hexId);
    if (!hex) continue;
    const active = manor.id === focusedPortfolioManorId;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(active ? 0.34 : 0.28, active ? 0.47 : 0.39, 32),
      new THREE.MeshBasicMaterial({
        color: active
          ? (labelTheme.selectedRule ?? "#d0ad64")
          : (labelTheme.rule ?? "#9f7d43"),
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    const world = axialToWorld(hex.q, hex.r);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(world.x, height(hex) + 0.18, world.z);
    ring.renderOrder = 20;
    portfolioGroup.add(ring);
    const element = document.createElement("div");
    element.className = `map-label portfolio${active ? " active" : ""}`;
    element.textContent = manor.name || "Recorded manor";
    labelsRoot.append(element);
    portfolioLabels.push({ manor, hex, element });
  }
}

const selectionMaterial = new THREE.MeshBasicMaterial({
  color: selectionTheme.fill ?? "#c8a65e",
  transparent: true,
  opacity: selectionTheme.fillOpacity ?? 0.18,
  side: THREE.DoubleSide,
  depthWrite: false,
});
let selectionMesh = null;
function selectHex(hex, { notifyHost = true } = {}) {
  if (!hex) return;
  if (selectionMesh) scene.remove(selectionMesh);
  selectionMesh = new THREE.Mesh(makeHexGeometry(hex), selectionMaterial);
  selectionMesh.position.y = 0.09;
  selectionMesh.userData.hex = hex;
  scene.add(selectionMesh);
  const manorLines = hex.manor_id
    ? `\nManor: ${hex.manor_id.replace("manor_", "")}` +
      `${hex.manor_hex_count ? ` · ${hex.manor_hex_count} hexes` : ""}` +
      `${hex.manor_households ? ` · ~${hex.manor_households} households` : ""}`
    : "\nManor: residual / non-manorial";
  const recipe = compositionRecipeFor(hex);
  const recipeLine = recipe
    ? `\nComposition: ${recipe.recipe_id.replace("rzc_", "").replaceAll("_", " ")}`
    : "\nComposition: unavailable";
  inspection.textContent =
    `${hex.hex_id} · (q ${hex.q}, r ${hex.r})\n` +
    `${hex.county_name}${hex.in_county ? " · Orchardmere fabric" : " · neighboring context"}\n` +
    `${hex.terrain} · ${hex.landcover_subtype.replaceAll("_", " ")} · ${Math.round(hex.elevation)} m` +
    manorLines +
    recipeLine;
  if (notifyHost) postFocusToHost(hex);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;
canvas.addEventListener("pointerdown", (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", (event) => {
  if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...markerHitMeshes, ...terrainHitMeshes], false)[0];
  if (hit?.object.userData.hex) selectHex(hit.object.userData.hex);
});

function rebuildVerticalGeometry() {
  for (const group of [countyGroup, contextGroup]) {
    for (const mesh of group.children) {
      mesh.geometry.dispose();
      mesh.geometry = makeHexGeometry(mesh.userData.hex);
    }
  }
  buildCompositionGround();
  for (const group of [
    countyBoundaryGroup,
    holdingBoundaryGroup,
    gridGroup,
    landscapeBorderGroup,
    shorelineGroup,
    roadsGroup,
    riversGroup,
    seatGroup,
  ]) {
    scene.remove(group);
  }
  countyBoundaryGroup.clear();
  holdingBoundaryGroup.clear();
  gridGroup.clear();
  landscapeBorderGroup.clear();
  shorelineGroup.clear();
  roadsGroup.clear();
  riversGroup.clear();
  seatGroup.clear();
  markerHitMeshes = [];
  scene.add(
    countyBoundaryGroup,
    holdingBoundaryGroup,
    gridGroup,
    landscapeBorderGroup,
    shorelineGroup,
    roadsGroup,
    riversGroup,
    seatGroup,
  );
  buildLines();
  countyBoundaryGroup.visible = adminBorderInput.checked;
  landscapeBorderGroup.visible = landscapeBorderInput.checked;
  holdingBoundaryGroup.visible = holdingsInput.checked;
  gridGroup.visible = gridInput.checked;
  roadsGroup.visible = roadsInput.checked;
  riversGroup.visible = riversInput.checked;
  for (const placement of assetPlacements) {
    placement.object.position.y = height(placement.hex) + placement.groundOffset;
  }
  data.labels.forEach(addSeatMarker);
  if (selectionMesh) {
    const selectedHex = selectionMesh.userData?.hex;
    scene.remove(selectionMesh);
    selectionMesh = null;
    if (selectedHex) selectHex(selectedHex, { notifyHost: false });
  }
}

function frameCounty() {
  controls.reset();
  camera.position.set(33, 46, 46);
  controls.target.set(0, 0, 0);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  controls.update();
}
controls.saveState();

function faceNorth() {
  const offset = camera.position.clone().sub(controls.target);
  const groundDistance = Math.max(1, Math.hypot(offset.x, offset.z));
  camera.position.set(
    controls.target.x,
    controls.target.y + Math.max(4, offset.y),
    controls.target.z + groundDistance,
  );
  camera.lookAt(controls.target);
  controls.update();
}

contextInput.addEventListener("change", () => {
  contextGroup.visible = contextInput.checked;
  if (compositionContextMesh) compositionContextMesh.visible = contextInput.checked;
});
landscapeBorderInput.addEventListener("change", () => {
  landscapeBorderGroup.visible = landscapeBorderInput.checked;
});
adminBorderInput.addEventListener("change", () => {
  countyBoundaryGroup.visible = adminBorderInput.checked;
});
compositionInput.addEventListener("change", () => {
  syncCompositionSurfaceState();
});
assetsInput.addEventListener("change", () => { assetsGroup.visible = assetsInput.checked; });
gridInput.addEventListener("change", () => { gridGroup.visible = gridInput.checked; });
holdingsInput.addEventListener("change", () => { holdingBoundaryGroup.visible = holdingsInput.checked; });
roadsInput.addEventListener("change", () => { roadsGroup.visible = roadsInput.checked; });
riversInput.addEventListener("change", () => { riversGroup.visible = riversInput.checked; });
labelsInput.addEventListener("change", () => { labelsRoot.hidden = !labelsInput.checked; });
reliefInput.addEventListener("input", () => {
  reliefScale = Number(reliefInput.value);
  reliefValue.value = `${reliefScale.toFixed(2)}×`;
  rebuildVerticalGeometry();
});
document.querySelector("#reset").addEventListener("click", frameCounty);
document.querySelector("#compass").addEventListener("click", faceNorth);

function resize() {
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  const aspect = rect.width / rect.height;
  const viewHeight = 50;
  camera.left = (-viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}

function updateLabels() {
  const rect = canvas.getBoundingClientRect();
  for (const { label, element } of labelElements) {
    const hex = hexById.get(label.hex_id);
    if (!hex) {
      element.hidden = true;
      continue;
    }
    const world = axialToWorld(hex.q, hex.r);
    const vector = new THREE.Vector3(world.x, height(hex) + 0.85, world.z).project(camera);
    const labelOffsetX = label.kind === "county_seat" ? -72 : 0;
    element.style.left = `${(vector.x * 0.5 + 0.5) * rect.width + labelOffsetX}px`;
    element.style.top = `${(-vector.y * 0.5 + 0.5) * rect.height}px`;
    element.hidden = !labelsInput.checked || vector.z < -1 || vector.z > 1;
  }
  for (const { hex, element } of portfolioLabels) {
    const world = axialToWorld(hex.q, hex.r);
    const vector = new THREE.Vector3(world.x, height(hex) + 1.25, world.z).project(camera);
    element.style.left = `${(vector.x * 0.5 + 0.5) * rect.width}px`;
    element.style.top = `${(-vector.y * 0.5 + 0.5) * rect.height}px`;
    element.hidden = vector.z < -1 || vector.z > 1;
  }
}

function updateCompass() {
  const origin = controls.target.clone().project(camera);
  const north = controls.target.clone().add(new THREE.Vector3(0, 0, -8)).project(camera);
  const angle = Math.atan2(north.x - origin.x, north.y - origin.y);
  compassNeedle.style.transform = `rotate(${angle}rad)`;
}

let viewerActive = true;
let animationFrameId = null;
let firstUsableFrameAnnounced = false;

function animate() {
  animationFrameId = null;
  if (!viewerActive) return;
  resize();
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
  updateCompass();
  if (!firstUsableFrameAnnounced) {
    firstUsableFrameAnnounced = true;
    window.MERECROSS_EMBEDDED_ADAPTER_V1?.rendererReady?.({ rendererKey: "orchardmere_county_v1" });
  }
  animationFrameId = requestAnimationFrame(animate);
}

function setViewerActive(active) {
  const nextActive = active !== false;
  if (viewerActive === nextActive) return;
  viewerActive = nextActive;
  controls.enabled = viewerActive;
  if (!viewerActive && animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  } else if (viewerActive && animationFrameId === null) {
    animationFrameId = requestAnimationFrame(animate);
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || !event.data || typeof event.data !== "object") return;
  if (event.origin !== hostTargetOrigin) return;
  const message = event.data;
  if (
    message.type === "merecross:viewer-active" ||
    message.type === "viewer-active"
  ) {
    setViewerActive(message.active ?? message.payload?.active);
    return;
  }
  if (message.type === "merecross:portfolio" || message.type === "merecross:spatial:init:v1") {
    const payload = message.payload && typeof message.payload === "object" ? message.payload : {};
    showPortfolio(payload);
    const focus = payload.focus;
    if (focus) {
      const hex = hexById.get(focus.hexId ?? focus.hex_id) ?? hexByCoordinate.get(`${focus.q},${focus.r}`);
      if (hex) selectHex(hex, { notifyHost: false });
    }
    return;
  }
  if (
    message.type !== "merecross:focus" &&
    message.type !== "focus" &&
    message.type !== "merecross:spatial:focus:v1"
  ) return;
  const payload = message.payload && typeof message.payload === "object"
    ? message.payload
    : message;
  const hex =
    hexById.get(payload.hexId ?? payload.hex_id) ??
    (Number.isFinite(payload.q) && Number.isFinite(payload.r)
      ? hexByCoordinate.get(`${payload.q},${payload.r}`)
      : null);
  if (hex) selectHex(hex, { notifyHost: false });
});

function startAnimation() {
  if (animationFrameId === null) animationFrameId = requestAnimationFrame(animate);
}

frameCounty();
selectHex(hexById.get(data.county.focus_hex_id));
startAnimation();
