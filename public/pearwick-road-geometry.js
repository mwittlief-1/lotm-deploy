/*
 * PearwickRoadGeometry
 * Dependency-free world-space road geometry for the Pearwick estate pilot.
 *
 * Coordinate convention: x/y are the horizontal map plane and z is elevation.
 * All distances, widths, offsets, and texture repeat lengths use the same world
 * unit as x/y. Mesh arrays are ordinary JavaScript arrays so callers can feed
 * them into Canvas, WebGL, Three.js BufferGeometry, or a serializer.
 */
(function initialisePearwickRoadGeometry(root) {
  "use strict";

  const EPSILON = 1e-9;
  const VERSION = "1.0.0";

  function assert(condition, message) {
    if (!condition) throw new Error(`PearwickRoadGeometry: ${message}`);
  }

  function finite(value, label) {
    const number = Number(value);
    assert(Number.isFinite(number), `${label} must be finite`);
    return number;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function point2(point, index = 0) {
    assert(point && typeof point === "object", `point ${index} is missing`);
    return {
      x: finite(point.x, `point ${index}.x`),
      y: finite(point.y, `point ${index}.y`),
    };
  }

  function distance2(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function removeDuplicatePoints(points, tolerance = 1e-7) {
    const result = [];
    for (const source of points) {
      const point = point2(source, result.length);
      if (!result.length || distance2(result[result.length - 1], point) > tolerance) result.push(point);
    }
    return result;
  }

  function cardinalPoint(p0, p1, p2, p3, t, tension) {
    const t2 = t * t;
    const t3 = t2 * t;
    const tangentScale = (1 - tension) * 0.5;
    const m1x = (p2.x - p0.x) * tangentScale;
    const m1y = (p2.y - p0.y) * tangentScale;
    const m2x = (p3.x - p1.x) * tangentScale;
    const m2y = (p3.y - p1.y) * tangentScale;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return {
      x: h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x,
      y: h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y,
    };
  }

  function polylineDistances(points) {
    const distances = [0];
    for (let index = 1; index < points.length; index += 1) {
      distances.push(distances[index - 1] + distance2(points[index - 1], points[index]));
    }
    return distances;
  }

  function pointAtDistance(points, distances, target) {
    if (target <= 0) return { ...points[0] };
    const total = distances[distances.length - 1];
    if (target >= total) return { ...points[points.length - 1] };
    let low = 0;
    let high = distances.length - 1;
    while (low + 1 < high) {
      const middle = (low + high) >> 1;
      if (distances[middle] <= target) low = middle;
      else high = middle;
    }
    const span = distances[high] - distances[low];
    const fraction = span > EPSILON ? (target - distances[low]) / span : 0;
    return {
      x: points[low].x + (points[high].x - points[low].x) * fraction,
      y: points[low].y + (points[high].y - points[low].y) * fraction,
    };
  }

  function resamplePolyline(points, spacing) {
    if (points.length < 2 || !(spacing > 0)) return points.map((point) => ({ ...point }));
    const distances = polylineDistances(points);
    const total = distances[distances.length - 1];
    if (total <= spacing) return [{ ...points[0] }, { ...points[points.length - 1] }];
    const count = Math.max(1, Math.ceil(total / spacing));
    const actualSpacing = total / count;
    const result = [];
    for (let index = 0; index <= count; index += 1) {
      result.push(pointAtDistance(points, distances, index === count ? total : index * actualSpacing));
    }
    return result;
  }

  /**
   * Smooth and uniformly sample an authored route.
   *
   * @param {{x:number,y:number}[]} points Authored world-space centerline.
   * @param {{spacing?:number,samplesPerSegment?:number,tension?:number,smooth?:boolean}} options
   * @returns {{x:number,y:number,distance:number}[]} Exact endpoints are retained.
   */
  function sampleCenterline(points, options = {}) {
    assert(Array.isArray(points) && points.length >= 2, "sampleCenterline needs at least two points");
    const tolerance = options.duplicateTolerance ?? 1e-7;
    const source = removeDuplicatePoints(points, tolerance);
    assert(source.length >= 2, "centerline collapses to fewer than two distinct points");
    const spacing = finite(options.spacing ?? 0.35, "spacing");
    const samplesPerSegment = Math.max(1, Math.floor(finite(options.samplesPerSegment ?? 8, "samplesPerSegment")));
    const tension = clamp(finite(options.tension ?? 0.18, "tension"), 0, 1);
    const curve = [];

    if (options.smooth === false || source.length === 2) {
      curve.push(...source);
    } else {
      for (let index = 0; index < source.length - 1; index += 1) {
        const p0 = source[Math.max(0, index - 1)];
        const p1 = source[index];
        const p2 = source[index + 1];
        const p3 = source[Math.min(source.length - 1, index + 2)];
        for (let sample = 0; sample < samplesPerSegment; sample += 1) {
          curve.push(cardinalPoint(p0, p1, p2, p3, sample / samplesPerSegment, tension));
        }
      }
      curve.push({ ...source[source.length - 1] });
    }

    const sampled = removeDuplicatePoints(resamplePolyline(curve, spacing), tolerance);
    const distances = polylineDistances(sampled);
    return sampled.map((point, index) => ({ ...point, distance: distances[index] }));
  }

  function readSample(sample, x, y) {
    if (typeof sample === "number") return finite(sample, `terrain elevation at (${x}, ${y})`);
    assert(sample && typeof sample === "object", `terrain sampler returned no elevation at (${x}, ${y})`);
    const value = sample.elevation ?? sample.z;
    return finite(value, `terrain elevation at (${x}, ${y})`);
  }

  function queryElevation(elevationSampler, x, y, context) {
    assert(typeof elevationSampler === "function", "elevationSampler must be a function");
    return readSample(elevationSampler(x, y, context), x, y);
  }

  function resolvedValue(value, context, fallback = 0) {
    if (value === undefined || value === null) return fallback;
    return finite(typeof value === "function" ? value(context) : value, context.label || "resolved value");
  }

  /**
   * Sample terrain under a centerline. The callback receives (x, y, context)
   * and may return a number or {elevation:number}. `offset` may be a number or
   * callback, allowing bridges, approaches, and local cut/fill adjustments.
   */
  function drapeCenterline(centerline, elevationSampler, options = {}) {
    assert(Array.isArray(centerline) && centerline.length >= 2, "drapeCenterline needs at least two points");
    const points = removeDuplicatePoints(centerline, options.duplicateTolerance ?? 1e-7);
    assert(points.length >= 2, "draped centerline collapses to fewer than two distinct points");
    const distances = polylineDistances(points);
    const draped = points.map((point, index) => {
      const context = {
        label: `centerline offset ${index}`,
        kind: "centerline",
        index,
        distance: distances[index],
        fraction: distances.at(-1) > EPSILON ? distances[index] / distances.at(-1) : 0,
        lateralOffset: 0,
      };
      const terrainElevation = queryElevation(elevationSampler, point.x, point.y, context);
      const elevationOffset = resolvedValue(options.offset, { ...context, terrainElevation }, 0);
      return { ...point, z: terrainElevation + elevationOffset, terrainElevation, elevationOffset, distance: distances[index] };
    });
    for (let index = 0; index < draped.length; index += 1) {
      const previous = draped[Math.max(0, index - 1)];
      const next = draped[Math.min(draped.length - 1, index + 1)];
      const run = distance2(previous, next);
      draped[index].grade = run > EPSILON ? (next.z - previous.z) / run : 0;
    }
    return draped;
  }

  function centerlineFrames(points) {
    return points.map((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      let dx = next.x - previous.x;
      let dy = next.y - previous.y;
      let length = Math.hypot(dx, dy);
      if (length < EPSILON && index > 0) {
        dx = point.x - points[index - 1].x;
        dy = point.y - points[index - 1].y;
        length = Math.hypot(dx, dy);
      }
      assert(length > EPSILON, `cannot derive tangent at centerline point ${index}`);
      const tangent = { x: dx / length, y: dy / length };
      return { tangent, normal: { x: -tangent.y, y: tangent.x } };
    });
  }

  function emptyMesh(name) {
    return {
      name,
      positions: [],
      normals: [],
      uvs: [],
      indices: [],
      attributes: {
        terrainElevation: [],
        elevationOffset: [],
        worldDistance: [],
        lateralDistance: [],
      },
    };
  }

  function pushVertex(mesh, vertex) {
    const index = mesh.positions.length / 3;
    mesh.positions.push(vertex.x, vertex.y, vertex.z);
    mesh.uvs.push(vertex.u, vertex.v);
    mesh.attributes.terrainElevation.push(vertex.terrainElevation);
    mesh.attributes.elevationOffset.push(vertex.elevationOffset);
    mesh.attributes.worldDistance.push(vertex.worldDistance);
    mesh.attributes.lateralDistance.push(vertex.lateralDistance);
    return index;
  }

  function addGridIndices(mesh, rowCount, columnCount) {
    for (let row = 0; row < rowCount - 1; row += 1) {
      for (let column = 0; column < columnCount - 1; column += 1) {
        const a = row * columnCount + column;
        const b = a + columnCount;
        const c = b + 1;
        const d = a + 1;
        mesh.indices.push(a, b, d, b, c, d);
      }
    }
  }

  function calculateNormals(mesh) {
    mesh.normals = new Array(mesh.positions.length).fill(0);
    for (let index = 0; index < mesh.indices.length; index += 3) {
      const ia = mesh.indices[index] * 3;
      const ib = mesh.indices[index + 1] * 3;
      const ic = mesh.indices[index + 2] * 3;
      const abx = mesh.positions[ib] - mesh.positions[ia];
      const aby = mesh.positions[ib + 1] - mesh.positions[ia + 1];
      const abz = mesh.positions[ib + 2] - mesh.positions[ia + 2];
      const acx = mesh.positions[ic] - mesh.positions[ia];
      const acy = mesh.positions[ic + 1] - mesh.positions[ia + 1];
      const acz = mesh.positions[ic + 2] - mesh.positions[ia + 2];
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      for (const vertexIndex of [ia, ib, ic]) {
        mesh.normals[vertexIndex] += nx;
        mesh.normals[vertexIndex + 1] += ny;
        mesh.normals[vertexIndex + 2] += nz;
      }
    }
    for (let index = 0; index < mesh.normals.length; index += 3) {
      const length = Math.hypot(mesh.normals[index], mesh.normals[index + 1], mesh.normals[index + 2]);
      if (length > EPSILON) {
        mesh.normals[index] /= length;
        mesh.normals[index + 1] /= length;
        mesh.normals[index + 2] /= length;
      } else {
        mesh.normals[index + 2] = 1;
      }
    }
    return mesh;
  }

  function cloneVertexFromMesh(mesh, vertexIndex, lift = 0) {
    const positionIndex = vertexIndex * 3;
    const uvIndex = vertexIndex * 2;
    return {
      x: mesh.positions[positionIndex],
      y: mesh.positions[positionIndex + 1],
      z: mesh.positions[positionIndex + 2] + lift,
      u: mesh.uvs[uvIndex],
      v: mesh.uvs[uvIndex + 1],
      terrainElevation: mesh.attributes.terrainElevation[vertexIndex],
      elevationOffset: mesh.attributes.elevationOffset[vertexIndex] + lift,
      worldDistance: mesh.attributes.worldDistance[vertexIndex],
      lateralDistance: mesh.attributes.lateralDistance[vertexIndex],
    };
  }

  function extractGridBand(source, name, rowCount, sourceColumns, firstColumn, lastColumn, lift = 0) {
    const mesh = emptyMesh(name);
    const columnCount = lastColumn - firstColumn + 1;
    for (let row = 0; row < rowCount; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        pushVertex(mesh, cloneVertexFromMesh(source, row * sourceColumns + column, lift));
      }
    }
    addGridIndices(mesh, rowCount, columnCount);
    return calculateNormals(mesh);
  }

  function roadVertex(point, frame, lateralDistance, elevationSampler, context, elevationOffset, textureRepeatDistance, v) {
    const x = point.x + frame.normal.x * lateralDistance;
    const y = point.y + frame.normal.y * lateralDistance;
    const terrainElevation = queryElevation(elevationSampler, x, y, context);
    const extraOffset = resolvedValue(context.vertexElevationOffset, { ...context, x, y, terrainElevation }, 0);
    const finalOffset = elevationOffset + extraOffset;
    return {
      x,
      y,
      z: terrainElevation + finalOffset,
      u: point.distance / textureRepeatDistance,
      v,
      terrainElevation,
      elevationOffset: finalOffset,
      worldDistance: point.distance,
      lateralDistance,
    };
  }

  function buildRoundCap(point, frame, side, radius, elevationSampler, options) {
    const mesh = emptyMesh(`${side}Cap`);
    const segmentCount = Math.max(4, Math.floor(options.capSegments));
    const outward = side === "start"
      ? { x: -frame.tangent.x, y: -frame.tangent.y }
      : { ...frame.tangent };
    const surfaceOffset = options.surfaceOffset + resolvedValue(options.vertexElevationOffset, {
      label: `${side} cap center offset`,
      kind: "cap",
      side,
      lateralOffset: 0,
      distance: point.distance,
    }, 0);
    const terrainElevation = queryElevation(elevationSampler, point.x, point.y, {
      kind: "cap",
      side,
      lateralOffset: 0,
      distance: point.distance,
    });
    pushVertex(mesh, {
      x: point.x,
      y: point.y,
      z: terrainElevation + surfaceOffset,
      u: point.distance / options.textureRepeatDistance,
      v: 0.5,
      terrainElevation,
      elevationOffset: surfaceOffset,
      worldDistance: point.distance,
      lateralDistance: 0,
    });
    for (let index = 0; index <= segmentCount; index += 1) {
      const angle = -Math.PI / 2 + Math.PI * index / segmentCount;
      const lateralDistance = Math.sin(angle) * radius;
      const longitudinalDistance = Math.cos(angle) * radius;
      const x = point.x + outward.x * longitudinalDistance + frame.normal.x * lateralDistance;
      const y = point.y + outward.y * longitudinalDistance + frame.normal.y * lateralDistance;
      const context = {
        label: `${side} cap offset ${index}`,
        kind: "cap",
        side,
        lateralOffset: lateralDistance,
        longitudinalOffset: longitudinalDistance,
        distance: point.distance,
      };
      const ground = queryElevation(elevationSampler, x, y, context);
      const extra = resolvedValue(options.vertexElevationOffset, { ...context, x, y, terrainElevation: ground }, 0);
      pushVertex(mesh, {
        x,
        y,
        z: ground + options.surfaceOffset + extra,
        u: (point.distance + (side === "start" ? -longitudinalDistance : longitudinalDistance)) / options.textureRepeatDistance,
        v: 0.5 + lateralDistance / (2 * radius),
        terrainElevation: ground,
        elevationOffset: options.surfaceOffset + extra,
        worldDistance: point.distance + (side === "start" ? -longitudinalDistance : longitudinalDistance),
        lateralDistance,
      });
    }
    for (let index = 1; index <= segmentCount; index += 1) {
      if (side === "start") mesh.indices.push(0, index + 1, index);
      else mesh.indices.push(0, index, index + 1);
    }
    return calculateNormals(mesh);
  }

  function mergeMeshes(name, meshes) {
    const result = emptyMesh(name);
    for (const mesh of meshes.filter((candidate) => candidate && candidate.positions.length)) {
      const vertexOffset = result.positions.length / 3;
      result.positions.push(...mesh.positions);
      result.uvs.push(...mesh.uvs);
      result.indices.push(...mesh.indices.map((index) => index + vertexOffset));
      for (const key of Object.keys(result.attributes)) {
        result.attributes[key].push(...(mesh.attributes[key] || new Array(mesh.positions.length / 3).fill(0)));
      }
    }
    return calculateNormals(result);
  }

  function nearestCenterlineIndex(centerline, junction) {
    if (Number.isInteger(junction.index)) return clamp(junction.index, 0, centerline.length - 1);
    if (Number.isFinite(junction.distance)) {
      let best = 0;
      for (let index = 1; index < centerline.length; index += 1) {
        if (Math.abs(centerline[index].distance - junction.distance) < Math.abs(centerline[best].distance - junction.distance)) best = index;
      }
      return best;
    }
    if (junction.point) {
      const target = point2(junction.point);
      let best = 0;
      for (let index = 1; index < centerline.length; index += 1) {
        if (distance2(centerline[index], target) < distance2(centerline[best], target)) best = index;
      }
      return best;
    }
    return 0;
  }

  /**
   * Build a terrain-following circular junction pad. Route ribbons are intended
   * to overlap this pad; `ports` provide deterministic arm connection anchors.
   */
  function constructJunctionMesh(options = {}) {
    const center = point2(options.center || {}, 0);
    const elevationSampler = options.elevationSampler;
    assert(typeof elevationSampler === "function", "constructJunctionMesh needs elevationSampler");
    const radius = finite(options.radius ?? 0.28, "junction radius");
    assert(radius > 0, "junction radius must be positive");
    const segments = Math.max(8, Math.floor(finite(options.segments ?? 20, "junction segments")));
    const surfaceOffset = finite(options.surfaceOffset ?? 0.025, "junction surfaceOffset");
    const textureRepeatDistance = finite(options.textureRepeatDistance ?? 1, "junction textureRepeatDistance");
    const rotation = finite(options.rotation ?? 0, "junction rotation");
    const mesh = emptyMesh(options.name || "junction");
    const centerContext = { kind: "junction", ring: false, lateralOffset: 0, distance: options.distance ?? 0 };
    const centerTerrain = queryElevation(elevationSampler, center.x, center.y, centerContext);
    const centerExtra = resolvedValue(options.vertexElevationOffset, {
      ...centerContext,
      x: center.x,
      y: center.y,
      terrainElevation: centerTerrain,
      label: "junction center offset",
    }, 0);
    pushVertex(mesh, {
      x: center.x,
      y: center.y,
      z: centerTerrain + surfaceOffset + centerExtra,
      u: 0.5,
      v: 0.5,
      terrainElevation: centerTerrain,
      elevationOffset: surfaceOffset + centerExtra,
      worldDistance: options.distance ?? 0,
      lateralDistance: 0,
    });
    for (let index = 0; index < segments; index += 1) {
      const angle = rotation + Math.PI * 2 * index / segments;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      const context = { kind: "junction", ring: true, index, angle, lateralOffset: radius, distance: options.distance ?? 0 };
      const ground = queryElevation(elevationSampler, x, y, context);
      const extra = resolvedValue(options.vertexElevationOffset, {
        ...context,
        x,
        y,
        terrainElevation: ground,
        label: `junction ring offset ${index}`,
      }, 0);
      pushVertex(mesh, {
        x,
        y,
        z: ground + surfaceOffset + extra,
        u: 0.5 + Math.cos(angle) * radius / textureRepeatDistance,
        v: 0.5 + Math.sin(angle) * radius / textureRepeatDistance,
        terrainElevation: ground,
        elevationOffset: surfaceOffset + extra,
        worldDistance: options.distance ?? 0,
        lateralDistance: radius,
      });
    }
    for (let index = 0; index < segments; index += 1) mesh.indices.push(0, 1 + index, 1 + ((index + 1) % segments));
    calculateNormals(mesh);

    const arms = Array.isArray(options.arms) ? options.arms : [];
    const ports = arms.map((arm, index) => {
      let dx;
      let dy;
      if (Number.isFinite(arm.angle)) {
        dx = Math.cos(arm.angle);
        dy = Math.sin(arm.angle);
      } else {
        const direction = arm.direction || arm;
        dx = finite(direction.x, `junction arm ${index}.x`);
        dy = finite(direction.y, `junction arm ${index}.y`);
        const length = Math.hypot(dx, dy);
        assert(length > EPSILON, `junction arm ${index} direction is zero`);
        dx /= length;
        dy /= length;
      }
      const x = center.x + dx * radius;
      const y = center.y + dy * radius;
      return {
        id: arm.id ?? `arm-${index}`,
        center: { x, y, z: queryElevation(elevationSampler, x, y, { kind: "junction-port", index }) + surfaceOffset },
        tangent: { x: dx, y: dy },
        width: finite(arm.width ?? options.roadWidth ?? radius, `junction arm ${index}.width`),
      };
    });
    return { mesh, center: { ...center, z: centerTerrain + surfaceOffset + centerExtra }, radius, ports };
  }

  /**
   * Construct a complete road ribbon.
   *
   * Required: {centerline, elevationSampler}. The result contains:
   * - surfaces.road / leftVerge / rightVerge / leftRut / rightRut
   * - surfaces.caps and surfaces.junctions
   * - sections with terrain-aware cross-section metadata
   * - ports.start/end for exact route-to-route edge matching
   *
   * Mesh fields are flat `positions`, `normals`, `uvs`, and triangle `indices`.
   * Per-vertex attributes retain terrain elevation, applied elevation offset,
   * cumulative world distance, and signed lateral distance.
   */
  function constructRoadMesh(options = {}) {
    assert(Array.isArray(options.centerline) && options.centerline.length >= 2, "constructRoadMesh needs centerline");
    assert(typeof options.elevationSampler === "function", "constructRoadMesh needs elevationSampler");

    const sampled = options.centerline.every((point) => Number.isFinite(point.distance))
      ? removeDuplicatePoints(options.centerline, options.duplicateTolerance ?? 1e-7)
      : sampleCenterline(options.centerline, options.sample || {});
    const distances = polylineDistances(sampled);
    const centerline2 = sampled.map((point, index) => ({ x: point.x, y: point.y, distance: distances[index] }));
    const totalDistance = distances.at(-1);
    const frames = centerlineFrames(centerline2);
    const textureRepeatDistance = finite(options.textureRepeatDistance ?? 1.6, "textureRepeatDistance");
    assert(textureRepeatDistance > 0, "textureRepeatDistance must be positive");
    const surfaceOffset = finite(options.surfaceOffset ?? 0.025, "surfaceOffset");
    const vergeOffset = finite(options.vergeOffset ?? 0.012, "vergeOffset");
    const crownHeight = finite(options.crownHeight ?? 0.018, "crownHeight");
    const rutDepth = finite(options.rutDepth ?? 0.012, "rutDepth");
    const rutOverlayLift = finite(options.rutOverlayLift ?? 0.0015, "rutOverlayLift");
    const rowCount = centerline2.length;
    const road = emptyMesh("road");
    const leftVerge = emptyMesh("leftVerge");
    const rightVerge = emptyMesh("rightVerge");
    const sections = [];
    const leftRutColumns = [1, 3];
    const rightRutColumns = [5, 7];
    const roadColumnCount = 9;

    for (let index = 0; index < rowCount; index += 1) {
      const point = centerline2[index];
      const frame = frames[index];
      const baseContext = {
        label: `road section ${index}`,
        kind: "road",
        index,
        distance: point.distance,
        fraction: totalDistance > EPSILON ? point.distance / totalDistance : 0,
        centerline: point,
      };
      const roadWidth = resolvedValue(options.roadWidth, { ...baseContext, label: `roadWidth at section ${index}` }, 0.34);
      const vergeWidth = resolvedValue(options.vergeWidth, { ...baseContext, label: `vergeWidth at section ${index}` }, 0.12);
      assert(roadWidth > 0, `roadWidth at section ${index} must be positive`);
      assert(vergeWidth >= 0, `vergeWidth at section ${index} cannot be negative`);
      const halfWidth = roadWidth / 2;
      const requestedRutOffset = resolvedValue(options.rutOffset, { ...baseContext, label: `rutOffset at section ${index}` }, roadWidth * 0.23);
      const requestedRutWidth = resolvedValue(options.rutWidth, { ...baseContext, label: `rutWidth at section ${index}` }, roadWidth * 0.12);
      const rutWidth = clamp(requestedRutWidth, roadWidth * 0.025, roadWidth * 0.22);
      const rutOffset = clamp(requestedRutOffset, rutWidth, halfWidth - rutWidth);
      const offsets = [
        -halfWidth,
        -rutOffset - rutWidth / 2,
        -rutOffset,
        -rutOffset + rutWidth / 2,
        0,
        rutOffset - rutWidth / 2,
        rutOffset,
        rutOffset + rutWidth / 2,
        halfWidth,
      ];

      for (let column = 0; column < offsets.length; column += 1) {
        const lateralDistance = offsets[column];
        const crown = crownHeight * Math.max(0, 1 - Math.abs(lateralDistance) / halfWidth);
        const leftDepression = rutDepth * Math.max(0, 1 - Math.abs(lateralDistance + rutOffset) / (rutWidth / 2));
        const rightDepression = rutDepth * Math.max(0, 1 - Math.abs(lateralDistance - rutOffset) / (rutWidth / 2));
        const crossSectionOffset = surfaceOffset + crown - Math.max(leftDepression, rightDepression);
        pushVertex(road, roadVertex(
          point,
          frame,
          lateralDistance,
          options.elevationSampler,
          {
            ...baseContext,
            kind: "road",
            column,
            lateralOffset: lateralDistance,
            crossSectionOffset,
            vertexElevationOffset: options.vertexElevationOffset,
          },
          crossSectionOffset,
          textureRepeatDistance,
          lateralDistance / roadWidth + 0.5,
        ));
      }

      const leftDistances = [-halfWidth - vergeWidth, -halfWidth];
      const rightDistances = [halfWidth, halfWidth + vergeWidth];
      for (let column = 0; column < 2; column += 1) {
        const lateralDistance = leftDistances[column];
        const blend = column;
        const offset = vergeOffset + (surfaceOffset - vergeOffset) * blend;
        pushVertex(leftVerge, roadVertex(
          point,
          frame,
          lateralDistance,
          options.elevationSampler,
          {
            ...baseContext,
            kind: "left-verge",
            column,
            lateralOffset: lateralDistance,
            crossSectionOffset: offset,
            vertexElevationOffset: options.vergeElevationOffset ?? options.vertexElevationOffset,
          },
          offset,
          textureRepeatDistance,
          blend,
        ));
      }
      for (let column = 0; column < 2; column += 1) {
        const lateralDistance = rightDistances[column];
        const blend = column;
        const offset = surfaceOffset + (vergeOffset - surfaceOffset) * blend;
        pushVertex(rightVerge, roadVertex(
          point,
          frame,
          lateralDistance,
          options.elevationSampler,
          {
            ...baseContext,
            kind: "right-verge",
            column,
            lateralOffset: lateralDistance,
            crossSectionOffset: offset,
            vertexElevationOffset: options.vergeElevationOffset ?? options.vertexElevationOffset,
          },
          offset,
          textureRepeatDistance,
          blend,
        ));
      }

      const centerTerrain = queryElevation(options.elevationSampler, point.x, point.y, { ...baseContext, kind: "centerline" });
      sections.push({
        index,
        center: { ...point, z: centerTerrain + surfaceOffset + crownHeight },
        terrainElevation: centerTerrain,
        tangent: { ...frame.tangent },
        normal: { ...frame.normal },
        distance: point.distance,
        roadWidth,
        vergeWidth,
        rutOffset,
        rutWidth,
        lateralOffsets: offsets,
        roadVertexStart: index * roadColumnCount,
        leftVergeVertexStart: index * 2,
        rightVergeVertexStart: index * 2,
      });
    }

    addGridIndices(road, rowCount, roadColumnCount);
    addGridIndices(leftVerge, rowCount, 2);
    addGridIndices(rightVerge, rowCount, 2);
    calculateNormals(road);
    calculateNormals(leftVerge);
    calculateNormals(rightVerge);
    const leftRut = extractGridBand(road, "leftRut", rowCount, roadColumnCount, leftRutColumns[0], leftRutColumns[1], rutOverlayLift);
    const rightRut = extractGridBand(road, "rightRut", rowCount, roadColumnCount, rightRutColumns[0], rightRutColumns[1], rutOverlayLift);

    const capStyle = options.cap ?? "round";
    assert(["round", "butt", "none"].includes(capStyle), "cap must be round, butt, or none");
    const capOptions = {
      capSegments: options.capSegments ?? 10,
      surfaceOffset,
      textureRepeatDistance,
      vertexElevationOffset: options.vertexElevationOffset,
    };
    const capMeshes = [];
    if (capStyle === "round") {
      capMeshes.push(buildRoundCap(centerline2[0], frames[0], "start", sections[0].roadWidth / 2, options.elevationSampler, capOptions));
      capMeshes.push(buildRoundCap(centerline2.at(-1), frames.at(-1), "end", sections.at(-1).roadWidth / 2, options.elevationSampler, capOptions));
    }
    const caps = mergeMeshes("caps", capMeshes);

    const junctionRecords = (Array.isArray(options.junctions) ? options.junctions : []).map((junction, index) => {
      const centerlineIndex = nearestCenterlineIndex(centerline2, junction);
      const section = sections[centerlineIndex];
      return {
        id: junction.id ?? `junction-${index}`,
        centerlineIndex,
        ...constructJunctionMesh({
          ...junction,
          center: centerline2[centerlineIndex],
          distance: centerline2[centerlineIndex].distance,
          radius: junction.radius ?? section.roadWidth * 0.72,
          roadWidth: junction.roadWidth ?? section.roadWidth,
          surfaceOffset: junction.surfaceOffset ?? surfaceOffset,
          textureRepeatDistance,
          vertexElevationOffset: junction.vertexElevationOffset ?? options.vertexElevationOffset,
          elevationSampler: options.elevationSampler,
        }),
      };
    });
    const junctions = mergeMeshes("junctions", junctionRecords.map((record) => record.mesh));

    function makePort(side, section) {
      const normal = section.normal;
      const halfWidth = section.roadWidth / 2;
      const center = section.center;
      return {
        side,
        center: { ...center },
        tangent: { ...section.tangent },
        left: {
          x: center.x + normal.x * halfWidth,
          y: center.y + normal.y * halfWidth,
          z: queryElevation(options.elevationSampler, center.x + normal.x * halfWidth, center.y + normal.y * halfWidth, { kind: "port", side, lateralOffset: halfWidth }) + surfaceOffset,
        },
        right: {
          x: center.x - normal.x * halfWidth,
          y: center.y - normal.y * halfWidth,
          z: queryElevation(options.elevationSampler, center.x - normal.x * halfWidth, center.y - normal.y * halfWidth, { kind: "port", side, lateralOffset: -halfWidth }) + surfaceOffset,
        },
        width: section.roadWidth,
        vergeWidth: section.vergeWidth,
        worldDistance: section.distance,
        cap: capStyle,
      };
    }

    return {
      version: VERSION,
      centerline: drapeCenterline(centerline2, options.elevationSampler, { offset: surfaceOffset + crownHeight }),
      sections,
      surfaces: { road, leftVerge, rightVerge, leftRut, rightRut, caps, junctions },
      junctionRecords,
      ports: {
        start: makePort("start", sections[0]),
        end: makePort("end", sections.at(-1)),
      },
      config: {
        textureRepeatDistance,
        surfaceOffset,
        vergeOffset,
        crownHeight,
        rutDepth,
        rutOverlayLift,
        cap: capStyle,
        sample: { ...(options.sample || {}) },
      },
    };
  }

  function triangleArea3(mesh, indexOffset) {
    const ia = mesh.indices[indexOffset] * 3;
    const ib = mesh.indices[indexOffset + 1] * 3;
    const ic = mesh.indices[indexOffset + 2] * 3;
    const abx = mesh.positions[ib] - mesh.positions[ia];
    const aby = mesh.positions[ib + 1] - mesh.positions[ia + 1];
    const abz = mesh.positions[ib + 2] - mesh.positions[ia + 2];
    const acx = mesh.positions[ic] - mesh.positions[ia];
    const acy = mesh.positions[ic + 1] - mesh.positions[ia + 1];
    const acz = mesh.positions[ic + 2] - mesh.positions[ia + 2];
    return 0.5 * Math.hypot(
      aby * acz - abz * acy,
      abz * acx - abx * acz,
      abx * acy - aby * acx,
    );
  }

  function validateSurface(mesh, label, options, errors, warnings, metrics) {
    if (!mesh) {
      errors.push(`${label} mesh is missing`);
      return;
    }
    const vertexCount = mesh.positions.length / 3;
    metrics.surfaceVertexCounts[label] = vertexCount;
    metrics.surfaceTriangleCounts[label] = mesh.indices.length / 3;
    if (mesh.positions.length % 3) errors.push(`${label} positions are not xyz triples`);
    if (mesh.uvs.length !== vertexCount * 2) errors.push(`${label} UV count does not match vertices`);
    if (mesh.normals.length !== mesh.positions.length) errors.push(`${label} normal count does not match positions`);
    for (const [name, values] of Object.entries(mesh.attributes || {})) {
      if (values.length !== vertexCount) errors.push(`${label}.${name} count does not match vertices`);
    }
    if (![...mesh.positions, ...mesh.uvs, ...mesh.normals].every(Number.isFinite)) errors.push(`${label} contains non-finite vertex data`);
    if (mesh.indices.some((index) => !Number.isInteger(index) || index < 0 || index >= vertexCount)) errors.push(`${label} contains an invalid triangle index`);
    let degenerateTriangles = 0;
    for (let index = 0; index + 2 < mesh.indices.length; index += 3) {
      if (triangleArea3(mesh, index) <= options.areaTolerance) degenerateTriangles += 1;
    }
    metrics.degenerateTriangles[label] = degenerateTriangles;
    if (degenerateTriangles) warnings.push(`${label} has ${degenerateTriangles} degenerate triangle(s)`);
  }

  /**
   * Validate finite mesh data, triangle topology, centerline spacing/grade, UV
   * monotonicity, and exact plan-position seams between road and verge strips.
   */
  function validateMeshContinuity(result, options = {}) {
    const settings = {
      positionTolerance: finite(options.positionTolerance ?? 1e-6, "positionTolerance"),
      areaTolerance: finite(options.areaTolerance ?? 1e-10, "areaTolerance"),
      maxSegmentLength: finite(options.maxSegmentLength ?? Number.MAX_VALUE, "maxSegmentLength"),
      maxAbsoluteGrade: finite(options.maxAbsoluteGrade ?? 1, "maxAbsoluteGrade"),
    };
    const errors = [];
    const warnings = [];
    const metrics = {
      surfaceVertexCounts: {},
      surfaceTriangleCounts: {},
      degenerateTriangles: {},
      maximumCenterlineStep: 0,
      maximumAbsoluteGrade: 0,
      maximumBoundaryPlanGap: 0,
    };
    if (!result || !Array.isArray(result.centerline) || result.centerline.length < 2) {
      return { valid: false, errors: ["centerline is missing or too short"], warnings, metrics };
    }
    for (let index = 1; index < result.centerline.length; index += 1) {
      const previous = result.centerline[index - 1];
      const current = result.centerline[index];
      const step = distance2(previous, current);
      metrics.maximumCenterlineStep = Math.max(metrics.maximumCenterlineStep, step);
      const grade = step > EPSILON ? Math.abs((current.z - previous.z) / step) : Infinity;
      metrics.maximumAbsoluteGrade = Math.max(metrics.maximumAbsoluteGrade, grade);
      if (!(current.distance > previous.distance)) errors.push(`centerline distance does not increase at point ${index}`);
      if (step > settings.maxSegmentLength) warnings.push(`centerline step ${index - 1}→${index} exceeds maxSegmentLength`);
      if (grade > settings.maxAbsoluteGrade) warnings.push(`centerline grade ${index - 1}→${index} exceeds maxAbsoluteGrade`);
    }

    const surfaces = result.surfaces || {};
    for (const name of ["road", "leftVerge", "rightVerge", "leftRut", "rightRut", "caps", "junctions"]) {
      validateSurface(surfaces[name], name, settings, errors, warnings, metrics);
    }

    const road = surfaces.road;
    const leftVerge = surfaces.leftVerge;
    const rightVerge = surfaces.rightVerge;
    if (road && leftVerge && rightVerge && Array.isArray(result.sections)) {
      for (let row = 0; row < result.sections.length; row += 1) {
        const roadLeftIndex = (row * 9) * 3;
        const roadRightIndex = (row * 9 + 8) * 3;
        const leftInnerIndex = (row * 2 + 1) * 3;
        const rightInnerIndex = (row * 2) * 3;
        const leftGap = Math.hypot(
          road.positions[roadLeftIndex] - leftVerge.positions[leftInnerIndex],
          road.positions[roadLeftIndex + 1] - leftVerge.positions[leftInnerIndex + 1],
        );
        const rightGap = Math.hypot(
          road.positions[roadRightIndex] - rightVerge.positions[rightInnerIndex],
          road.positions[roadRightIndex + 1] - rightVerge.positions[rightInnerIndex + 1],
        );
        metrics.maximumBoundaryPlanGap = Math.max(metrics.maximumBoundaryPlanGap, leftGap, rightGap);
      }
      if (metrics.maximumBoundaryPlanGap > settings.positionTolerance) {
        errors.push(`road/verge boundary plan gap is ${metrics.maximumBoundaryPlanGap}`);
      }
    }

    if (!result.ports?.start || !result.ports?.end) errors.push("start/end ports are missing");
    return { valid: errors.length === 0, errors, warnings, metrics };
  }

  const api = Object.freeze({
    VERSION,
    sampleCenterline,
    drapeCenterline,
    constructRoadMesh,
    constructJunctionMesh,
    validateMeshContinuity,
  });

  root.PearwickRoadGeometry = api;
  if (typeof module === "object" && module.exports) module.exports = api;
}(typeof window !== "undefined" ? window : globalThis));
