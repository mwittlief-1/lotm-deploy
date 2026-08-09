// @ts-nocheck -- Three is a pinned, vendored browser ESM.
import * as THREE from "./vendor/three.module.min.js";

const SQRT_3 = Math.sqrt(3);
const MAX_SUBDIVISIONS = 4;
// These maps provide broad material grain beneath the authored 1024px terrain
// textures. A 512px procedural pass spent four times the synchronous CPU for
// detail that is not visible at any locked CourtOS camera distance.
const PROCEDURAL_TEXTURE_SIZE = 256;
const DIRECTIONS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const loader = new THREE.TextureLoader();
const textureCache = new Map();

function axial(q, r, radius) {
  return { x: radius * SQRT_3 * (q + r / 2), z: radius * 1.5 * r };
}

function corners(center, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = THREE.MathUtils.degToRad(-30 - index * 60);
    return { x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius };
  });
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
  return smoothNoise(x, z) * .58
    + smoothNoise(x * 2.03 + 13.2, z * 2.03 - 7.8) * .29
    + smoothNoise(x * 4.11 - 2.4, z * 4.11 + 9.1) * .13;
}

export function buildTerrainNoisePixels(size = PROCEDURAL_TEXTURE_SIZE) {
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = fractalNoise(x / 47, y / 47);
      const grain = hash(x, y, 5);
      const variation = (broad - .5) * 38 + (grain - .5) * 10.64;
      const offset = (y * size + x) * 4;
      pixels[offset] = THREE.MathUtils.clamp(214 + variation, 0, 255);
      pixels[offset + 1] = THREE.MathUtils.clamp(209 + variation, 0, 255);
      pixels[offset + 2] = THREE.MathUtils.clamp(187 + variation * .7, 0, 255);
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

export function buildTerrainReliefPixels(size = PROCEDURAL_TEXTURE_SIZE) {
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = fractalNoise((x + 77) / 31, (y - 49) / 31);
      const fine = hash(x, y, 36);
      const root = Math.abs(Math.sin((x + broad * 18) * .19) * Math.cos((y - broad * 14) * .16));
      const value = THREE.MathUtils.clamp(112 + broad * 72 + fine * 31 + root * 18, 0, 255);
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

function visualRelief(cell, lod, radius) {
  // Renderer-only surface articulation. The source elevation remains the
  // centerline; this correlated field prevents seven-cell summaries and broad
  // XMAP parents from reading as flat administrative plates.
  const broad = fractalNoise(cell.q * .41, cell.r * .41) - .5;
  const fine = fractalNoise(cell.q * 1.17 + 31, cell.r * 1.17 - 19) - .5;
  // Terrain at all three distances is one low-amplitude, correlated field.
  // Earlier macro relief multiplied a per-cell noise field by macro radius;
  // it produced stepped columns rather than a legible landform and made the
  // descent to clustered/fine fabric visibly jump.
  if (lod === "macro") return (broad * .17 + fine * .025) * radius;
  if (lod === "mid_hex") return broad * .12 + fine * .018;
  return broad * .075 + fine * .012;
}

function noiseTexture(renderer) {
  const key = "mapgen-terrain-noise";
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PROCEDURAL_TEXTURE_SIZE;
  const context = canvas.getContext("2d");
  const image = context.createImageData(PROCEDURAL_TEXTURE_SIZE, PROCEDURAL_TEXTURE_SIZE);
  image.data.set(buildTerrainNoisePixels());
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  textureCache.set(key, texture);
  return texture;
}

function reliefTexture(renderer) {
  const key = "mapgen-terrain-relief";
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PROCEDURAL_TEXTURE_SIZE;
  const context = canvas.getContext("2d");
  const image = context.createImageData(PROCEDURAL_TEXTURE_SIZE, PROCEDURAL_TEXTURE_SIZE);
  image.data.set(buildTerrainReliefPixels());
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(13, 13);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  textureCache.set(key, texture);
  return texture;
}

function artTexture(renderer, path, repeat = null) {
  if (textureCache.has(path)) return textureCache.get(path);
  const texture = loader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  textureCache.set(path, texture);
  return texture;
}

const MATERIAL_FAMILIES = [
  { match: /field|arable|ridge|furrow/i, path: "/assets/mapgen-landscape/materials/worked-arable-v1-1024.jpg", color: 0xb1a783 },
  { match: /damp|swale|marsh|water|pond/i, path: "/assets/mapgen-landscape/materials/damp-swale-v1-1024.jpg", color: 0x819083 },
  { match: /wood|copse|hedge/i, path: "/assets/mapgen-landscape/materials/copse-floor-v1-1024.jpg", color: 0x778069 },
  { match: /yard|court|compound|house/i, path: "/assets/mapgen-landscape/materials/estate-yard-v1-1024.jpg", color: 0xa1957e },
  { match: /pasture|meadow|common|grazed|orchard|garden/i, path: "/assets/mapgen-landscape/materials/pasture-meadow-v1-1024.jpg", color: 0x919b7c },
];

function stable(seed) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967295;
}

function addVegetation(root, renderer, rows, positions, radius) {
  if (radius > 1.2) return;
  const families = {
    oak: [1, 2, 3, 4].map((index) => artTexture(renderer, `/assets/mapgen-landscape/vegetation/oak/english-oak-oblique-v2-${index}.png`)),
    orchard: [1, 2, 3, 4].map((index) => artTexture(renderer, `/assets/mapgen-landscape/vegetation/orchard/orchard-apple-v1-${index}.png`)),
    hedge: [1, 2, 3, 4].map((index) => artTexture(renderer, `/assets/mapgen-landscape/vegetation/hedgerow/hedgerow-shrub-v1-${index}.png`)),
    ground: [1, 2, 3, 4].map((index) => artTexture(renderer, `/assets/mapgen-landscape/vegetation/groundcover/groundcover-v1-${index}.png`)),
  };
  const batches = new Map();
  for (const row of rows) {
    const wooded = /wood|copse/i.test(row.landUse);
    const orchard = /orchard|garden/i.test(row.landUse);
    const hedge = /hedge|boundary/i.test(row.landUse);
    const grass = /pasture|meadow|common|grazed/i.test(row.landUse);
    const count = wooded
      ? (stable(`${row.id}:wood-cluster`) > .88 ? 2 + Math.floor(stable(`${row.id}:wood-count`) * 2) : 0)
      : orchard
        ? (stable(`${row.id}:orchard-cluster`) > .82 ? 2 : 0)
        : hedge
          ? (stable(`${row.id}:hedge-cluster`) > .985 ? 1 : 0)
          // Grass character belongs in the material plane. Repeating the
          // pale groundcover sprite across it reads as map confetti.
          : grass ? 0
            : 0;
    if (!count) continue;
    const textures = wooded ? families.oak : orchard ? families.orchard : hedge ? families.hedge : families.ground;
    for (let index = 0; index < count; index += 1) {
      const texture = textures[Math.floor(stable(`${row.id}:variant:${index}`) * textures.length) % textures.length];
      const baseHeight = wooded ? 2.35 : orchard ? 1.65 : hedge ? 1.05 : .52;
      const height = baseHeight * (.72 + stable(`${row.id}:scale:${index}`) * (wooded ? .76 : .45));
      const aspect = texture.image?.width && texture.image?.height ? texture.image.width / texture.image.height : 1;
      const angle = stable(`${row.id}:angle:${index}`) * Math.PI * 2;
      const spread = Math.sqrt(stable(`${row.id}:spread:${index}`)) * radius * .74;
      const position = positions.get(row.id).clone();
      position.x += Math.cos(angle) * spread;
      position.z += Math.sin(angle) * spread;
      const entries = batches.get(texture) ?? [];
      entries.push({ position, height, width: height * aspect });
      batches.set(texture, entries);
    }
  }

  // The camera bearing is locked, so vegetation can be grouped into at most
  // sixteen instanced painterly planes instead of hundreds of Sprite objects
  // and unique materials/draw calls.
  const yaw = Math.atan2(6.4, 8.5);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  for (const [texture, entries] of batches) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(0, .5, 0);
    const vegetation = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x7b8967,
        transparent: true,
        opacity: .9,
        alphaTest: .035,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      entries.length,
    );
    const matrix = new THREE.Matrix4();
    entries.forEach((entry, index) => {
      matrix.compose(entry.position, quaternion, new THREE.Vector3(entry.width, entry.height, 1));
      vegetation.setMatrixAt(index, matrix);
    });
    vegetation.instanceMatrix.needsUpdate = true;
    vegetation.castShadow = false;
    vegetation.receiveShadow = false;
    vegetation.renderOrder = 5;
    root.add(vegetation);
  }
}

function addFurrows(root, rows, positions, radius) {
  if (radius > 1.2) return;
  const placements = [];
  for (const row of rows) {
    if (!/field|arable|ridge|furrow/i.test(row.landUse) || stable(`${row.id}:furrow`) < .08) continue;
    const point = positions.get(row.id);
    const angle = (Math.abs(row.q + row.r * 2) % 3) * Math.PI / 3
      + (stable(`${row.id}:furrow-angle`) - .5) * .14;
    for (const lateral of [-.52, -.31, -.1, .1, .31, .52]) {
      placements.push({ point, angle, lateral, scale: .91 + stable(`${row.id}:furrow:${lateral}`) * .16 });
    }
  }
  if (!placements.length) return;
  const furrows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1.45 * radius, .052 * radius),
    new THREE.MeshBasicMaterial({ color: 0x4a3822, transparent: true, opacity: .39, depthWrite: false, side: THREE.DoubleSide }),
    placements.length,
  );
  const matrix = new THREE.Matrix4();
  placements.forEach((placement, index) => {
    const normalX = -Math.sin(placement.angle);
    const normalZ = Math.cos(placement.angle);
    matrix.compose(
      new THREE.Vector3(
        placement.point.x + normalX * placement.lateral * radius,
        placement.point.y + .024,
        placement.point.z + normalZ * placement.lateral * radius,
      ),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, placement.angle)),
      new THREE.Vector3(placement.scale, 1, 1),
    );
    furrows.setMatrixAt(index, matrix);
  });
  furrows.instanceMatrix.needsUpdate = true;
  furrows.renderOrder = 6;
  root.add(furrows);
}

function addCultivatedBands(root, rows, positions, radius) {
  if (radius > 1.2) return;
  const groups = new Map();
  rows.filter((row) => /field|arable|ridge|furrow/i.test(row.landUse)).forEach((row) => {
    // Keep broad cultivation strokes inside a single recorded game hex.
    // Grouping every estate cell only by land use made one oversized stripe
    // across the entire manor and erased the six-/nine-hex field rhythm.
    const groupKey = `${row.parentHexId ?? "unscoped"}:${row.landUse}`;
    const entries = groups.get(groupKey) ?? [];
    entries.push(row);
    groups.set(groupKey, entries);
  });
  const placements = [];
  for (const [groupKey, group] of groups) {
    if (group.length < 4) continue;
    const landUse = groupKey.slice(groupKey.indexOf(":") + 1);
    const points = group.map((row) => positions.get(row.id));
    const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
    const angle = (Math.abs(group[0].q + group[0].r * 2) % 3) * Math.PI / 3;
    const tangent = { x: Math.cos(angle), z: Math.sin(angle) };
    const projections = points.map((point) => point.x * tangent.x + point.z * tangent.z);
    const length = Math.max(radius * 3.2, Math.min(radius * 10, Math.max(...projections) - Math.min(...projections)));
    for (const lateral of [-.42, 0, .42]) placements.push({ center, angle, length, lateral, landUse });
  }
  if (!placements.length) return;
  const bands = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, radius * .11),
    new THREE.MeshBasicMaterial({ color: 0x473c27, transparent: true, opacity: .34, depthWrite: false, side: THREE.DoubleSide }),
    placements.length,
  );
  const matrix = new THREE.Matrix4();
  placements.forEach((placement, index) => {
    const normalX = -Math.sin(placement.angle);
    const normalZ = Math.cos(placement.angle);
    matrix.compose(
      new THREE.Vector3(
        placement.center.x + normalX * placement.lateral * radius,
        placement.center.y + .031,
        placement.center.z + normalZ * placement.lateral * radius,
      ),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, placement.angle)),
      new THREE.Vector3(placement.length, 1, 1),
    );
    bands.setMatrixAt(index, matrix);
  });
  bands.instanceMatrix.needsUpdate = true;
  bands.renderOrder = 6;
  root.add(bands);
}

const EDGE_CORNERS = [[5, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];

function addDerivedFieldSeparators(root, renderer, rows, centers, cornerHeights, radius) {
  if (radius > 1.2) return 0;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const byCoordinate = new Map(rows.map((row) => [`${row.q},${row.r}`, row]));
  const segments = [];
  const hedgePlacements = [];
  for (const row of rows) {
    DIRECTIONS.forEach(([dq, dr], edge) => {
      const neighborId = row.neighborIds?.[edge];
      const neighbor = (neighborId ? byId.get(neighborId) : null)
        ?? byCoordinate.get(`${row.q + dq},${row.r + dr}`);
      if (!neighbor || row.id.localeCompare(neighbor.id) >= 0 || row.landUse === neighbor.landUse) return;
      if (!/(field|arable|ridge|furrow|pasture|meadow|orchard|garden|hedge|copse)/i.test(`${row.landUse} ${neighbor.landUse}`)) return;
      // The underlying land-use fabric changes at acre-cell grain. Drawing
      // every transition recreates the diagnostic grid and floods the scene
      // with thousands of tiny marks; retain a stable, sparse evidence of
      // working-field divisions instead.
      if (stable(`${row.id}:${neighbor.id}:separator`) < .8) return;
      const center = centers.get(row.id);
      const edgeCorners = corners(center, radius * .985);
      const [aIndex, bIndex] = EDGE_CORNERS[edge] ?? [];
      if (aIndex === undefined || bIndex === undefined) return;
      const heights = cornerHeights.get(row.id);
      const a = new THREE.Vector3(edgeCorners[aIndex].x, heights[aIndex] + .03, edgeCorners[aIndex].z);
      const b = new THREE.Vector3(edgeCorners[bIndex].x, heights[bIndex] + .03, edgeCorners[bIndex].z);
      segments.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (!/hedge|copse|wood/i.test(`${row.landUse} ${neighbor.landUse}`)) return;
      if (stable(`${row.id}:${neighbor.id}:hedge-presence`) < .99) return;
      hedgePlacements.push({
        position: a.clone().lerp(b, .5),
        scale: 1.04 + stable(`${row.id}:${neighbor.id}:hedge`) * .34,
      });
    });
  }
  if (segments.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(segments, 3));
    root.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: 0x4d4b31, transparent: true, opacity: .34, depthWrite: false,
    })));
  }
  if (hedgePlacements.length) {
    const textures = [1, 2].map((index) => artTexture(renderer, `/assets/mapgen-landscape/vegetation/hedgerow/hedgerow-shrub-v1-${index}.png`));
    textures.forEach((texture, textureIndex) => {
      const placements = hedgePlacements.filter((_, index) => index % textures.length === textureIndex);
      const geometry = new THREE.PlaneGeometry(1, 1);
      geometry.translate(0, .5, 0);
      const hedges = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshBasicMaterial({ map: texture, color: 0x71805d, transparent: true, opacity: .88, alphaTest: .05, depthWrite: false, side: THREE.DoubleSide }),
        placements.length,
      );
      const yaw = Math.atan2(6.4, 8.5);
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
      const matrix = new THREE.Matrix4();
      placements.forEach((placement, index) => {
        matrix.compose(placement.position, quaternion, new THREE.Vector3(1.08 * placement.scale, .58 * placement.scale, 1));
        hedges.setMatrixAt(index, matrix);
      });
      hedges.instanceMatrix.needsUpdate = true;
      hedges.renderOrder = 7;
      root.add(hedges);
    });
  }
  return segments.length / 6;
}

function addGroundClutter(root, rows, positions, radius) {
  if (radius > 1.2) return;
  const placements = rows.filter((row) => (
    /dry|ridge|rock|stony/i.test(row.landUse) || row.linearFeatureIds?.length
  ) && stable(`${row.id}:rock`) > .58);
  if (!placements.length) return;
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(.055, 0),
    new THREE.MeshStandardMaterial({ color: 0x6d6856, roughness: 1 }),
    placements.length,
  );
  const matrix = new THREE.Matrix4();
  placements.forEach((row, index) => {
    const position = positions.get(row.id).clone();
    position.x += (stable(`${row.id}:rock-x`) - .5) * radius;
    position.z += (stable(`${row.id}:rock-z`) - .5) * radius;
    const scale = .62 + stable(`${row.id}:rock-scale`) * .76;
    matrix.compose(
      position,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(.2, stable(`${row.id}:rock-turn`) * Math.PI, .12)),
      new THREE.Vector3(scale * 1.25, scale * .65, scale),
    );
    rocks.setMatrixAt(index, matrix);
  });
  rocks.instanceMatrix.needsUpdate = true;
  root.add(rocks);
}

/** Port of the accepted Pearwick welded-terrain path; never extrudes cell columns. */
export function buildMapgenLandscape({ cells, lod, renderer, toneFor, selectedParentHexId }) {
  const root = new THREE.Group();
  // Seven-cell clusters are a real visual intermediate scale: large enough
  // to read as terrain fabric, small enough to resolve continuously into the
  // 217-cell Manor field. They must not reuse the fine-cell radius.
  const radius = lod === "macro" ? 4.7 : lod === "mid_hex" ? 2.08 : 1;
  // The full 23-parent manor composition contains 4,991 cells. Two wedges per
  // edge retain a continuous, faceted terrain surface without rebuilding the
  // ~480k-triangle review mesh that blocked the UI thread on Manor entry.
  const subdivisions = cells.length > 1500 ? 1 : cells.length > 1000 ? 2 : MAX_SUBDIVISIONS;
  const raw = cells.map((cell) => axial(cell.q, cell.r, radius));
  const centerX = raw.reduce((sum, point) => sum + point.x, 0) / Math.max(1, raw.length);
  const centerZ = raw.reduce((sum, point) => sum + point.z, 0) / Math.max(1, raw.length);
  const elevations = cells.map((cell) => cell.elevation).filter(Number.isFinite);
  const baseElevation = elevations.length ? Math.min(...elevations) : 0;
  const heightUnit = lod === "macro" ? .1 : lod === "mid_hex" ? .16 : .38;
  const byCoordinate = new Map(cells.map((cell) => [`${cell.q},${cell.r}`, cell]));
  const centers = new Map();
  const positions = new Map();
  const cornerHeights = new Map();
  const clickable = [];

  const centerY = (cell) => (
    (cell.elevation - baseElevation) * heightUnit
    + visualRelief(cell, lod, radius)
  );
  const cornerY = (cell, corner) => {
    const point = corners(axial(cell.q, cell.r, radius), radius)[corner];
    const candidates = [cell, ...DIRECTIONS.map(([dq, dr]) => byCoordinate.get(`${cell.q + dq},${cell.r + dr}`)).filter(Boolean)];
    return candidates
      .sort((a, b) => {
        const pa = axial(a.q, a.r, radius);
        const pb = axial(b.q, b.r, radius);
        return Math.hypot(pa.x - point.x, pa.z - point.z) - Math.hypot(pb.x - point.x, pb.z - point.z);
      })
      .slice(0, 3)
      .reduce((sum, candidate) => sum + centerY(candidate), 0) / Math.min(3, candidates.length);
  };

  const vertices = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const vertexMap = new Map();
  function vertexIndex(x, y, z, color) {
    const key = `${x.toFixed(4)},${z.toFixed(4)}`;
    let index = vertexMap.get(key);
    if (index === undefined) {
      index = vertices.length / 3;
      vertexMap.set(key, index);
      const visualY = y + (fractalNoise(x * 1.35, z * 1.35) - .5) * .075;
      vertices.push(x, visualY, z);
      colors.push(color.r, color.g, color.b);
      uvs.push(x / 8, z / 8);
    }
    return index;
  }

  cells.forEach((cell, cellIndex) => {
    const center = { x: raw[cellIndex].x - centerX, z: raw[cellIndex].z - centerZ };
    centers.set(cell.id, center);
    const y = centerY(cell);
    positions.set(cell.id, new THREE.Vector3(center.x, y + .06, center.z));
    const cellCorners = corners(center, radius);
    const elevationsAtCorners = Array.from({ length: 6 }, (_, corner) => cornerY(cell, corner));
    cornerHeights.set(cell.id, elevationsAtCorners);
    const baseColor = new THREE.Color(toneFor(`${cell.terrain ?? ""} ${cell.landUse}`));
    const neighborColors = DIRECTIONS
      .map(([dq, dr]) => byCoordinate.get(`${cell.q + dq},${cell.r + dr}`))
      .filter(Boolean)
      .map((neighbor) => new THREE.Color(toneFor(`${neighbor.terrain ?? ""} ${neighbor.landUse}`)));
    if (neighborColors.length) {
      const neighborhoodColor = neighborColors
        .reduce((sum, color) => sum.add(color), new THREE.Color())
        .multiplyScalar(1 / neighborColors.length);
      baseColor.lerp(neighborhoodColor, lod === "mid_hex" ? .5 : lod === "fine_cell" ? .32 : .24);
    }
    for (let wedge = 0; wedge < 6; wedge += 1) {
      const next = (wedge + 1) % 6;
      const wedgeIndices = new Map();
      for (let i = 0; i <= subdivisions; i += 1) {
        for (let j = 0; j <= subdivisions - i; j += 1) {
          const wb = i / subdivisions;
          const wc = j / subdivisions;
          const wa = 1 - wb - wc;
          const x = center.x * wa + cellCorners[wedge].x * wb + cellCorners[next].x * wc;
          const z = center.z * wa + cellCorners[wedge].z * wb + cellCorners[next].z * wc;
          const elevation = y * wa + elevationsAtCorners[wedge] * wb + elevationsAtCorners[next] * wc;
          const materialValue = .82
            + fractalNoise(x * .37, z * .37) * .18
            + fractalNoise(x * 1.31 + 17, z * 1.31 - 9) * .09;
          const color = baseColor.clone().multiplyScalar(materialValue);
          wedgeIndices.set(`${i},${j}`, vertexIndex(x, elevation, z, color));
        }
      }
      for (let i = 0; i < subdivisions; i += 1) {
        for (let j = 0; j < subdivisions - i; j += 1) {
          const a = wedgeIndices.get(`${i},${j}`);
          const b = wedgeIndices.get(`${i + 1},${j}`);
          const c = wedgeIndices.get(`${i},${j + 1}`);
          indices.push(a, c, b);
          if (i + j <= subdivisions - 2) indices.push(b, c, wedgeIndices.get(`${i + 1},${j + 1}`));
        }
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: noiseTexture(renderer),
    bumpMap: reliefTexture(renderer),
    bumpScale: .095,
    roughness: .95,
    metalness: 0,
    side: THREE.DoubleSide,
  }));
  terrain.receiveShadow = true;
  root.add(terrain);

  const materialRows = MATERIAL_FAMILIES.map((family) => ({ family, cells: cells.filter((cell) => family.match.test(cell.landUse)) }));
  for (const { family, cells: familyCells } of materialRows) {
    if (!familyCells.length) continue;
    const patchPositions = [];
    const patchUvs = [];
    for (const cell of familyCells) {
      const center = centers.get(cell.id);
      const y = positions.get(cell.id).y - .04;
      const cellCorners = corners(center, radius * .985);
      const cellCornerHeights = cornerHeights.get(cell.id);
      for (let wedge = 0; wedge < 6; wedge += 1) {
        const next = (wedge + 1) % 6;
        patchPositions.push(
          center.x, y, center.z,
          cellCorners[wedge].x, cellCornerHeights[wedge] + .02, cellCorners[wedge].z,
          cellCorners[next].x, cellCornerHeights[next] + .02, cellCorners[next].z,
        );
        // World-space UVs make adjacent XMAP and summary cells read as one
        // landscape rather than a repeated tile atlas.
        const textureScale = radius * (lod === "macro" ? 7.4 : 9.2);
        patchUvs.push(
          center.x / textureScale, center.z / textureScale,
          cellCorners[wedge].x / textureScale, cellCorners[wedge].z / textureScale,
          cellCorners[next].x / textureScale, cellCorners[next].z / textureScale,
        );
      }
    }
    const patchGeometry = new THREE.BufferGeometry();
    patchGeometry.setAttribute("position", new THREE.Float32BufferAttribute(patchPositions, 3));
    patchGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(patchUvs, 2));
    patchGeometry.computeVertexNormals();
    const patch = new THREE.Mesh(patchGeometry, new THREE.MeshStandardMaterial({
      map: artTexture(renderer, family.path, [2.5, 2.5]), color: family.color, roughness: .98,
      transparent: true,
      opacity: lod === "macro" ? .24 : lod === "mid_hex" ? .18 : .23,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    patch.receiveShadow = true;
    root.add(patch);
  }

  const extent = Math.max(
    Math.max(...raw.map((point) => point.x)) - Math.min(...raw.map((point) => point.x)),
    Math.max(...raw.map((point) => point.z)) - Math.min(...raw.map((point) => point.z)),
    1,
  );
  const underlay = new THREE.Mesh(
    new THREE.PlaneGeometry(extent * 1.8, extent * 1.8),
    new THREE.MeshStandardMaterial({ map: noiseTexture(renderer), color: 0x5b624b, roughness: 1 }),
  );
  underlay.rotation.x = -Math.PI / 2;
  underlay.position.y = -.42;
  underlay.receiveShadow = true;
  root.add(underlay);

  if (lod === "macro") {
    for (const cell of cells) {
      if (!cell.parent?.same_manor_as_target) continue;
      const hit = new THREE.Mesh(new THREE.CircleGeometry(radius * .92, 6), new THREE.MeshBasicMaterial({ visible: false }));
      hit.rotation.x = -Math.PI / 2;
      hit.position.copy(positions.get(cell.id));
      hit.userData.cell = cell;
      clickable.push(hit);
      root.add(hit);
      if (cell.id === selectedParentHexId) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(radius * .84, radius * .97, 6), new THREE.MeshBasicMaterial({
          color: 0x8d7445,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: .42,
          depthWrite: false,
        }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(positions.get(cell.id)).add(new THREE.Vector3(0, .08, 0));
        root.add(ring);
      }
    }
  }

  // The Manor view represents the admitted estate as one worked landscape.
  // Keep full treatment in the inspected parent, retain every visually
  // distinctive parcel elsewhere, and sample broad open-field cells across
  // every other parent. This preserves estate-wide field/wood/pasture rhythm
  // without asking the GPU to draw fine furniture for all 1,953 cells at once.
  const environmentCells = lod === "fine_cell"
    ? cells.filter((cell) => (
      cell.parentHexId === selectedParentHexId
      || /wood|copse|hedge|orchard|garden|yard|court|compound|house|pasture|meadow|common|grazed|damp|swale|marsh|water|pond/i.test(cell.landUse)
      || stable(`${cell.id}:estate-detail`) > .84
    ))
    : cells;
  // County is a reduced geographic survey: its seven-cell summaries must read
  // as continuous land, not repeat thousands of close-view orchard and hedge
  // billboards. Environmental furniture enters only at the fine Manor LOD.
  let derivedFieldSeparatorCount = 0;
  if (lod === "fine_cell") {
    addVegetation(root, renderer, environmentCells, positions, radius);
    addFurrows(root, environmentCells, positions, radius);
    addCultivatedBands(root, environmentCells, positions, radius);
    derivedFieldSeparatorCount = addDerivedFieldSeparators(
      root, renderer, cells, centers, cornerHeights, radius,
    );
    addGroundClutter(root, environmentCells, positions, radius);
  }
  const authoredLinearFeatureCount = new Set(cells.flatMap((cell) => cell.linearFeatureIds ?? [])).size;
  return {
    root,
    clickable,
    positions,
    cells,
    radius,
    framingRadius: extent * .56,
    derivedFieldSeparatorCount,
    authoredLinearFeatureCount,
    environmentDetailParentCount: new Set(environmentCells.map((cell) => cell.parentHexId)).size,
  };
}
