import { useEffect, useRef, useState } from "react";
import * as THREE from "./vendor/three.module.min.js";

import type { CourtOsMapLevel } from "./embeddedMapContract";
import { buildMapgenLandscape } from "./mapgenLandscapeRenderer";
import {
  type CourtOsSpatialVisualLod,
  type CourtOsSpatialVisualProofV1,
} from "./courtosSpatialVisualClient";
import { useCachedCourtOsSpatialVisualComposition } from "./courtosSpatialVisualCompositionCache";
import {
  manorFabricRoleFromSource,
  manorFabricSpritePath,
} from "./manorFabricAssetResolver";
import {
  facilityPresentationOffset,
  sourceFeatureSegments,
  withProjectedTerrainElevations,
} from "./spatialTerrainDoctrine";

const SQRT_3 = Math.sqrt(3);
const LOCKED_CAMERA_DIRECTION = new THREE.Vector3(6.4, 7.9, 8.5).normalize();

function lodFor(level: CourtOsMapLevel): CourtOsSpatialVisualLod {
  return level === "realm" ? "macro" : level === "county" ? "mid_hex" : "fine_cell";
}

export function terrainTone(landUse: string): string {
  if (/lake|water|river/i.test(landUse)) return "#516869";
  if (/marsh|fen|reed|damp|pond|swale/i.test(landUse)) return "#61756c";
  if (/forest|wood|copse|orchard|garden|hedge/i.test(landUse)) return "#465b3f";
  if (/hill|ridge|upland|stony/i.test(landUse)) return "#756247";
  if (/pasture|meadow|common|grazed/i.test(landUse)) return "#75805b";
  if (/field|arable|crop|furrow/i.test(landUse)) return "#897a4d";
  if (/yard|court|compound|house/i.test(landUse)) return "#887b67";
  return "#77734f";
}

type LinearFeatureMark = "route" | "water" | "boundary";
type SiteFeatureMark = "gate" | "seat" | "settlement" | "site";
type MacroParent = CourtOsSpatialVisualProofV1["macro"]["parents"][number];

type SpatialRenderCell = {
  id: string;
  q: number;
  r: number;
  elevation: number;
  landUse: string;
  terrain?: string;
  parent?: MacroParent;
  linearFeatureIds: string[];
  siteFeatureIds: string[];
  neighborIds?: string[];
  parentHexId?: string;
  midClusterId?: string;
};

type MapgenLandscapeBuild = {
  root: THREE.Group;
  positions: Map<string, THREE.Vector3>;
  clickable: THREE.Object3D[];
  radius: number;
  framingRadius: number;
  authoredLinearFeatureCount: number;
  derivedFieldSeparatorCount: number;
  environmentDetailParentCount: number;
};

type SpatialRendererRuntime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sky: THREE.Mesh;
  clickable: THREE.Object3D[];
  root: THREE.Group | null;
  transitionFrame: number;
  transitionRoot: THREE.Group | null;
  invalidate: (frames?: number) => void;
  hasRenderedTerrain: boolean;
};

export function linearFeatureMark(featureIds: readonly string[]): LinearFeatureMark | null {
  const joined = featureIds.join(" ").toLowerCase();
  if (!joined) return null;
  if (/drain|water|ditch|stream|brook|river/.test(joined)) return "water";
  if (/boundary|hedge|bank|dyke|dike/.test(joined)) return "boundary";
  if (/road|lane|path|track|drive|connection|transition/.test(joined)) return "route";
  return null;
}

export function siteFeatureMark(featureIds: readonly string[]): SiteFeatureMark | null {
  const joined = featureIds.join(" ").toLowerCase();
  if (!joined) return null;
  if (/gate/.test(joined)) return "gate";
  if (/seat|hall|court/.test(joined)) return "seat";
  if (/village|lcu|hamlet|settlement/.test(joined)) return "settlement";
  return "site";
}

export function canInspectEstateParent(parent: { same_manor_as_target: boolean }): boolean {
  return parent.same_manor_as_target;
}

/** Stable axial-to-world projection shared by all three levels. */
export function axialWorldPoint(q: number, r: number, radius: number) {
  return { x: radius * SQRT_3 * (q + r / 2), z: radius * 1.5 * r };
}

function stableUnit(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967295;
}

function material(color: string, roughness = .96): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: false });
}

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function fabricTexture(path: string): THREE.Texture {
  if (!textureCache.has(path)) {
    const texture = textureLoader.load(path);
    texture.userData.courtOsSharedFabricTexture = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    textureCache.set(path, texture);
  }
  return textureCache.get(path)!;
}

function addFabricSprite(
  group: THREE.Group,
  role: string,
  position: THREE.Vector3,
  condition: string,
  order: number,
  localOrder = order,
  sourceDescriptor = "",
): THREE.Sprite | undefined {
  const path = manorFabricSpritePath(role, sourceDescriptor);
  if (!path) return;
  const texture = fabricTexture(path);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    alphaTest: .035,
    color: condition === "worn" ? 0xd5c5a3 : condition === "repairing" ? 0xead5b1 : 0xffffff,
  }));
  const roleLayout: { x: number; z: number; height: number } = ({
    "estate-core": { x: 0, z: 0, height: 9.4 },
    storage: { x: -10.5, z: 3.8, height: 5.2 },
    "livestock-yard": { x: 10.5, z: 3.7, height: 5.1 },
    stables: { x: 7.4, z: -6.4, height: 5.5 },
    "fortification-works": { x: 0, z: 0, height: 8.4 },
  } as Record<string, { x: number; z: number; height: number }>)[role] ?? {
    x: ((localOrder % 3) - 1) * 6.8,
    z: (Math.floor(localOrder / 3) - .5) * 5.2,
    height: 5.4,
  };
  const height = roleLayout.height;
  const aspect = texture.image?.width && texture.image?.height ? texture.image.width / texture.image.height : 1.25;
  sprite.scale.set(height * aspect, height, 1);
  // The v2 manifest anchors every extracted transparent sprite at its measured
  // lower footprint rather than the source atlas midpoint.
  sprite.center.set(.5, .015);
  sprite.position.copy(position);
  sprite.position.x += roleLayout.x;
  sprite.position.z += roleLayout.z;
  sprite.position.y += .03 + order * .003;
  sprite.renderOrder = 20 + order;
  sprite.userData.fabricRole = role;
  group.add(sprite);

  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(height * .25, 18),
    new THREE.MeshBasicMaterial({ color: 0x342d22, transparent: true, opacity: .13, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.scale.set(1.45, .62, 1);
  contact.position.set(sprite.position.x, position.y + .018, sprite.position.z);
  contact.renderOrder = 18;
  group.add(contact);

  if (role === "fortification-works" && condition === "under_construction") {
    const scaffold = new THREE.Group();
    const timber = material("#70502f");
    for (let postIndex = -1; postIndex <= 1; postIndex += 1) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, 3.2, 5), timber);
      post.position.set(sprite.position.x + postIndex * .72, position.y + 1.55, sprite.position.z + .06);
      scaffold.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.2, .07, .07), timber);
    rail.position.set(sprite.position.x, position.y + 2.48, sprite.position.z + .06);
    scaffold.add(rail);
    group.add(scaffold);
  }
  return sprite;
}

function addTree(group: THREE.Group, x: number, y: number, z: number, scale: number, seed: string): void {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.07 * scale, .11 * scale, .62 * scale, 6), material("#59442f"));
  trunk.position.set(x, y + .31 * scale, z);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.42 * scale, 1), material(stableUnit(seed) > .5 ? "#3f6236" : "#4c6d3b"));
  crown.position.set(x, y + .86 * scale, z);
  trunk.castShadow = crown.castShadow = true;
  group.add(trunk, crown);
}

function worldCells(value: CourtOsSpatialVisualProofV1, lod: CourtOsSpatialVisualLod): SpatialRenderCell[] {
  if (lod === "macro") {
    return value.macro.parents.map((parent) => ({
      id: parent.hex_id,
      q: parent.q,
      r: parent.r,
      elevation: parent.approved_elevation,
      landUse: parent.landcover_subtype,
      terrain: parent.terrain,
      parent,
      linearFeatureIds: parent.linear_feature_ids,
      siteFeatureIds: parent.site_feature_ids,
    }));
  }
  const estateParentIds = new Set(
    value.macro.parents
      .filter((parent) => parent.same_manor_as_target)
      .map((parent) => parent.hex_id),
  );
  if (lod === "mid_hex") {
    // One visual cell per seven-cell cluster. Re-expanding each summary into
    // its original 217 fine positions made County look like a thinly tinted
    // Manor view and erased the intentionally authored middle scale.
    return (value.mid_cells ?? []).map((summary) => ({
      id: summary.cell_id,
      q: summary.q,
      r: summary.r,
      elevation: summary.elevation,
      landUse: summary.land_use,
      linearFeatureIds: summary.linear_feature_ids,
      siteFeatureIds: summary.site_feature_ids,
      neighborIds: [],
      parentHexId: summary.parent_hex_id,
      midClusterId: summary.cell_id,
    }));
  }
  // County retains the whole 23-parent authored context. Manor resolves only
  // the admitted nine-parent Roadcote estate so its 1,953 fine cells and
  // source-driven fabric remain legible instead of being miniaturized inside
  // the complete 4,991-cell export.
  const source = (value.fine_cells ?? []).filter((cell) => estateParentIds.has(cell.parent_hex_id));
  return source.map((cell) => ({
    id: cell.cell_id,
    q: cell.q,
    r: cell.r,
    elevation: "elevation" in cell ? cell.elevation : 0,
    landUse: "land_use" in cell ? cell.land_use : "recorded parcel",
    linearFeatureIds: "linear_feature_ids" in cell ? cell.linear_feature_ids : [],
    siteFeatureIds: "site_feature_ids" in cell ? cell.site_feature_ids : [],
    neighborIds: "neighbor_ids" in cell ? cell.neighbor_ids : [],
    parentHexId: cell.parent_hex_id,
  }));
}

function buildTerrain(
  value: CourtOsSpatialVisualProofV1,
  lod: CourtOsSpatialVisualLod,
  selectedParentHexId: string,
  renderer: THREE.WebGLRenderer,
) {
  const cells = withProjectedTerrainElevations(worldCells(value, lod), lod);
  const built = buildMapgenLandscape({ cells, lod, renderer, toneFor: terrainTone, selectedParentHexId }) as MapgenLandscapeBuild;
  const { root, positions, clickable, radius } = built;
  let cameraTarget = new THREE.Vector3(0, -.55, 0);

  const featureCells = new Map<string, SpatialRenderCell[]>();
  cells.forEach((cell) => cell.linearFeatureIds.forEach((id) => {
    const list = featureCells.get(id) ?? [];
    list.push(cell);
    featureCells.set(id, list);
  }));
  featureCells.forEach((featureCellsForId, featureId) => {
    const kind = linearFeatureMark([featureId]) ?? "route";
    const topology = sourceFeatureSegments(featureCellsForId);
    const pointSegments = topology.segments.flatMap((segment): Array<[THREE.Vector3, THREE.Vector3]> => {
      const from = positions.get(segment.fromId);
      const to = positions.get(segment.toId);
      return from && to ? [[from, to]] : [];
    });
    if (pointSegments.length) addRouteSegments(root, pointSegments, kind, radius * .105);
    const isolatedPoints = topology.isolatedCellIds
      .map((cellId) => positions.get(cellId))
      .filter((point): point is THREE.Vector3 => Boolean(point));
    if (isolatedPoints.length) addLinearFeatureMarks(root, isolatedPoints, kind, radius * .105);
  });
  if (lod === "fine_cell" && value.manor_fabric) {
      const manorFabric = value.manor_fabric;
      const surfaces = manorFabric.aggregate_surfaces;
      const nativeOrColocatedRoles = new Set([
        "working-yard",
        "administrative-court",
        "field-system",
        "commons",
        "pasture",
        "woodland",
      ]);
      const compoundCell = cells.find((cell) => siteFeatureMark(cell.siteFeatureIds) === "seat")
        ?? cells.find((cell) => /court|compound|estate_house|yard/i.test(cell.landUse))
        ?? cells[Math.floor(cells.length / 2)];
      const compoundAnchor = (compoundCell ? positions.get(compoundCell.id) : undefined) ?? new THREE.Vector3(0, 1, 0);
      cameraTarget = compoundAnchor.clone().add(new THREE.Vector3(0, 1.15, 0));
      const compoundApron = new THREE.Mesh(
        new THREE.CircleGeometry(12.4, 28),
        new THREE.MeshStandardMaterial({ color: 0x988367, roughness: 1, transparent: true, opacity: .62 }),
      );
      compoundApron.rotation.x = -Math.PI / 2;
      compoundApron.position.copy(compoundAnchor).add(new THREE.Vector3(0, -.018, 0));
      compoundApron.scale.set(1.28, .76, 1);
      compoundApron.receiveShadow = false;
      root.add(compoundApron);
      let order = 0;
      surfaces.forEach((surface) => {
        const hint = manorFabric.placement_hints.find(
          (candidate) => candidate.subject_id === surface.asset_surface_id,
        );
        surface.render_roles.forEach((role) => {
          if (nativeOrColocatedRoles.has(role)) return;
          if (role === "fortification-works" && manorFabric.discrete_facilities.length) return;
          const sprite = addFabricSprite(
            root,
            role,
            compoundAnchor,
            hint?.construction_treatment === "active_works" ? "under_construction" : surface.condition_state,
            order,
            order,
            [
              surface.asset_surface_id,
              surface.exact_label,
              manorFabric.manor.holding_type,
              manorFabric.manor.manor_size_class,
              manorFabric.manor.seat_archetype,
            ].filter(Boolean).join(" "),
          );
          if (sprite) sprite.userData.preferredParentHexId = hint?.preferred_parent_hex_id;
          order += 1;
        });
      });
      manorFabric.discrete_facilities.forEach((facility, facilityIndex) => {
        const hint = manorFabric.placement_hints.find(
          (candidate) => candidate.subject_id === facility.facility_id,
        );
        const preferredCells = hint
          ? cells.filter((cell) => cell.parentHexId === hint.preferred_parent_hex_id)
          : [];
        const preferredPoints = preferredCells
          .map((cell) => positions.get(cell.id))
          .filter((point): point is THREE.Vector3 => Boolean(point));
        const zoneAnchor = preferredPoints.length
          ? preferredPoints.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / preferredPoints.length)
          : compoundAnchor.clone();
        const visualOffset = facilityPresentationOffset(facilityIndex, radius * 1.75);
        const facilityAnchor = zoneAnchor.add(new THREE.Vector3(visualOffset.x, 0, visualOffset.z));
        const facilityDescriptor = [
          facility.facility_id,
          facility.facility_kind,
          facility.exact_type,
          facility.parent_surface_key,
          hint?.visual_family,
        ].filter(Boolean).join(" ");
        const facilityRole = manorFabricRoleFromSource(null, facilityDescriptor);
        if (!facilityRole) return;
        const facilitySprite = addFabricSprite(
          root,
          facilityRole,
          facilityAnchor,
          hint?.construction_treatment === "active_works" ? "under_construction" : facility.operational_state,
          order,
          order,
          facilityDescriptor,
        );
        if (facilitySprite) {
          facilitySprite.userData.preferredParentHexId = hint?.preferred_parent_hex_id;
          facilitySprite.userData.placementSemantics = "preferred-parent-zone-presentation-offset-not-exact-location";
        }
        order += 1;
      });
  }
  return {
    root,
    clickable,
    framingRadius: built.framingRadius,
    authoredLinearFeatureCount: built.authoredLinearFeatureCount,
    derivedFieldSeparatorCount: built.derivedFieldSeparatorCount,
    environmentDetailParentCount: built.environmentDetailParentCount,
    cameraTarget,
  };
}

function addRouteSegments(
  root: THREE.Group,
  pointSegments: Array<[THREE.Vector3, THREE.Vector3]>,
  kind: LinearFeatureMark,
  width: number,
): void {
  const segments: Array<[THREE.Vector3, THREE.Vector3]> = pointSegments.map(([from, to]) => [
    from.clone().add(new THREE.Vector3(0, .045, 0)),
    to.clone().add(new THREE.Vector3(0, .045, 0)),
  ]);
  const color = kind === "water" ? "#6d9b9e" : kind === "boundary" ? "#565037" : "#b49868";
  if (kind === "boundary") {
    const boundary = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(segments.flat()),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: .5 }),
    );
    boundary.renderOrder = 8;
    root.add(boundary);
    return;
  }
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  segments.forEach(([from, to], index) => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.max(1e-6, Math.hypot(dx, dz));
    const nx = -dz / length;
    const nz = dx / length;
    const vertex = index * 4;
    vertices.push(
      from.x - nx * width, from.y, from.z - nz * width,
      from.x + nx * width, from.y, from.z + nz * width,
      to.x - nx * width, to.y, to.z - nz * width,
      to.x + nx * width, to.y, to.z + nz * width,
    );
    uvs.push(0, 0, 0, 1, 1, 0, 1, 1);
    indices.push(vertex, vertex + 2, vertex + 1, vertex + 2, vertex + 3, vertex + 1);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const route = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: kind === "water" ? .72 : .8, side: THREE.DoubleSide }),
  );
  route.renderOrder = 8;
  root.add(route);
}

function addLinearFeatureMarks(
  root: THREE.Group,
  points: THREE.Vector3[],
  kind: LinearFeatureMark,
  width: number,
): void {
  const color = kind === "water" ? "#6d9b9e" : kind === "boundary" ? "#565037" : "#b49868";
  const mark = new THREE.InstancedMesh(
    new THREE.CircleGeometry(width * 1.35, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: kind === "boundary" ? .5 : .76 }),
    points.length,
  );
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  points.forEach((point, index) => {
    matrix.compose(
      point.clone().add(new THREE.Vector3(0, .046, 0)),
      rotation,
      new THREE.Vector3(1, 1, 1),
    );
    mark.setMatrixAt(index, matrix);
  });
  mark.instanceMatrix.needsUpdate = true;
  mark.renderOrder = 8;
  mark.userData.placementSemantics = "source-cell-mark-no-inferred-corridor";
  root.add(mark);
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    materials.forEach((entry) => {
      // Fabric textures are intentionally cached across LOD transitions. A
      // retiring SpriteMaterial must release itself without taking the shared
      // decoded texture with it.
      if (entry.map?.userData?.courtOsSharedFabricTexture) entry.map = null;
      entry.dispose?.();
    });
  });
}

function setTreeBlend(root: THREE.Object3D, blend: number): void {
  root.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    materials.forEach((entry) => {
      if (entry.userData.courtOsBaseOpacity === undefined) {
        entry.userData.courtOsBaseOpacity = entry.opacity;
        entry.userData.courtOsBaseTransparent = entry.transparent;
        entry.userData.courtOsBaseDepthWrite = entry.depthWrite;
      }
      entry.opacity = entry.userData.courtOsBaseOpacity * blend;
      entry.transparent = blend < .999 || Boolean(entry.userData.courtOsBaseTransparent);
      entry.depthWrite = blend >= .999 && Boolean(entry.userData.courtOsBaseDepthWrite);
      entry.needsUpdate = true;
    });
  });
}

/**
 * Production in-process MapGen surface. One WebGL canvas persists while the
 * admitted macro, county, and manor payloads replace its terrain graph; the
 * camera keeps a fixed oblique bearing and only changes altitude/distance.
 */
export function CourtOsSpatialCanvas({
  houseId,
  manorId,
  level,
  selectedParentHexId,
  onSelectedParentHexId,
}: {
  houseId: string;
  manorId: string;
  level: CourtOsMapLevel;
  selectedParentHexId: string;
  onSelectedParentHexId: (hexId: string) => void;
}) {
  const lod = lodFor(level);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<SpatialRendererRuntime | null>(null);
  const [webglFailure, setWebglFailure] = useState<string | null>(null);
  const [visualReady, setVisualReady] = useState(false);
  const [renderedLod, setRenderedLod] = useState<CourtOsSpatialVisualLod | null>(null);
  const [renderedProof, setRenderedProof] = useState<CourtOsSpatialVisualProofV1 | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const state = useCachedCourtOsSpatialVisualComposition({
    houseId,
    manorId,
    lod,
    enabled: true,
    reloadKey,
  });
  const fabric = renderedProof?.manor_fabric;
  const fabricRoles = fabric
    ? [...new Set(fabric.aggregate_surfaces.flatMap((surface) => surface.render_roles))]
    : [];
  const estateParentCount = renderedProof?.macro.parents.filter((parent) => parent.is_estate).length;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglFailure("This device could not open the three-dimensional estate renderer.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .86;
    // Painterly sprites contain their own contact treatment. Terrain relief is
    // carried by welded normals, so a dynamic estate-wide shadow pass adds GPU
    // cost without useful visual information.
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "uat-spatial-webgl-canvas";
    renderer.domElement.setAttribute("aria-label", "Three-dimensional recorded House lands");
    renderer.domElement.setAttribute("role", "img");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x34352e);
    scene.fog = new THREE.FogExp2(0x68695c, .0042);
    const camera = new THREE.PerspectiveCamera(43, 1, .1, 520);
    camera.position.copy(LOCKED_CAMERA_DIRECTION.clone().multiplyScalar(120));
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xcbbf9f, 0x35382f, 1.32));
    const sun = new THREE.DirectionalLight(0xd9bd88, 2.05);
    sun.position.set(-38, 52, -30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -160;
    sun.shadow.camera.right = sun.shadow.camera.top = 160;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 420;
    sun.shadow.bias = -.0002;
    sun.shadow.normalBias = .052;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x7d8c87, .24);
    fill.position.set(30, 16, 28);
    scene.add(fill);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(700, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x4f5d59) },
          horizonColor: { value: new THREE.Color(0x7d7b68) },
          bottomColor: { value: new THREE.Color(0x9b8f72) },
        },
        vertexShader: "varying vec3 vWorld; void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
        fragmentShader: "varying vec3 vWorld;uniform vec3 topColor;uniform vec3 horizonColor;uniform vec3 bottomColor;void main(){float h=normalize(vWorld).y;vec3 c=h>0.0?mix(horizonColor,topColor,smoothstep(0.0,.72,h)):mix(horizonColor,bottomColor,smoothstep(0.0,-.35,h));gl_FragColor=vec4(c,1.0);}",
      }),
    );
    scene.add(sky);

    let frame = 0;
    let framesRemaining = 0;
    const invalidate = (frames = 1) => {
      framesRemaining = Math.max(framesRemaining, frames);
      if (frame) return;
      const render = () => {
        renderer.render(scene, camera);
        framesRemaining -= 1;
        frame = framesRemaining > 0 ? window.requestAnimationFrame(render) : 0;
      };
      frame = window.requestAnimationFrame(render);
    };
    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      invalidate(2);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    invalidate(2);
    runtimeRef.current = {
      renderer,
      scene,
      camera,
      sky,
      clickable: [],
      root: null,
      transitionFrame: 0,
      transitionRoot: null,
      invalidate,
      hasRenderedTerrain: false,
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointer = (event: PointerEvent) => {
      const runtime = runtimeRef.current;
      if (!runtime?.clickable.length) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(runtime.clickable, false)[0];
      const parent = hit?.object.userData.cell?.parent;
      if (parent && canInspectEstateParent(parent)) onSelectedParentHexId(parent.hex_id);
    };
    renderer.domElement.addEventListener("pointerup", onPointer);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerup", onPointer);
      window.cancelAnimationFrame(runtimeRef.current?.transitionFrame ?? 0);
      if (runtimeRef.current?.root) disposeTree(runtimeRef.current.root);
      if (runtimeRef.current?.transitionRoot) disposeTree(runtimeRef.current.transitionRoot);
      sky.geometry.dispose();
      sky.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state.status !== "ready" || !runtimeRef.current) return;
    const runtime = runtimeRef.current;
    if (!runtime.hasRenderedTerrain) setVisualReady(false);
    const built = buildTerrain(state.value, lod, selectedParentHexId, runtime.renderer);
    window.cancelAnimationFrame(runtime.transitionFrame);
    if (runtime.transitionRoot) {
      runtime.scene.remove(runtime.transitionRoot);
      disposeTree(runtime.transitionRoot);
      runtime.transitionRoot = null;
    }
    const previousRoot = runtime.root;
    setTransitioning(Boolean(previousRoot && runtime.hasRenderedTerrain));
    runtime.root = built.root;
    runtime.clickable = built.clickable;
    runtime.scene.add(built.root);
    setRenderedLod(lod);
    setRenderedProof(state.value);
    // Render long enough for async fabric textures and the bounded camera move,
    // then leave the static framebuffer intact instead of burning a permanent
    // animation loop over the 4,991-cell manor composition.
    runtime.invalidate(12);
    runtime.renderer.domElement.dataset.lod = lod;
    runtime.renderer.domElement.dataset.renderer = "mapgen-3d";
    runtime.renderer.domElement.dataset.authoredLinearFeatureCount = String(built.authoredLinearFeatureCount);
    runtime.renderer.domElement.dataset.derivedFieldSeparatorCount = String(built.derivedFieldSeparatorCount);
    runtime.renderer.domElement.dataset.environmentDetailParentCount = String(built.environmentDetailParentCount);

    if (previousRoot && runtime.hasRenderedTerrain) {
      runtime.transitionRoot = previousRoot;
      setTreeBlend(built.root, 0);
      setTreeBlend(previousRoot, 1);
      const transitionStarted = performance.now();
      const blendTerrain = (now: number) => {
        const progress = Math.min(1, (now - transitionStarted) / 360);
        const eased = progress * progress * (3 - 2 * progress);
        setTreeBlend(built.root, eased);
        setTreeBlend(previousRoot, 1 - eased);
        runtime.renderer.render(runtime.scene, runtime.camera);
        if (progress < 1) {
          runtime.transitionFrame = window.requestAnimationFrame(blendTerrain);
          return;
        }
        runtime.scene.remove(previousRoot);
        disposeTree(previousRoot);
        runtime.transitionRoot = null;
        runtime.transitionFrame = 0;
        setTreeBlend(built.root, 1);
        setTransitioning(false);
      };
      runtime.transitionFrame = window.requestAnimationFrame(blendTerrain);
    } else if (previousRoot) {
      runtime.scene.remove(previousRoot);
      disposeTree(previousRoot);
      setTransitioning(false);
    } else {
      setTransitioning(false);
    }

    if (runtime.scene.fog) {
      runtime.scene.fog.density = lod === "fine_cell" ? .0029 : lod === "mid_hex" ? .0032 : .00355;
    }
    const framingDistance = built.framingRadius
      / Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2))
      * (lod === "fine_cell" ? .56 : lod === "mid_hex" ? .69 : .86);
    const from = runtime.camera.position.clone();
    const target = built.cameraTarget;
    const to = target.clone().add(LOCKED_CAMERA_DIRECTION.clone().multiplyScalar(framingDistance));
    if (!runtime.hasRenderedTerrain) {
      runtime.camera.position.copy(to);
      runtime.camera.lookAt(target);
      runtime.renderer.render(runtime.scene, runtime.camera);
      runtime.hasRenderedTerrain = true;
      const readyTimer = window.setTimeout(() => {
        runtime.renderer.render(runtime.scene, runtime.camera);
        setVisualReady(true);
      }, 140);
      return () => window.clearTimeout(readyTimer);
    }
    const started = performance.now();
    let cameraFrame = 0;
    const animateCamera = (now: number) => {
      const progress = Math.min(1, (now - started) / 480);
      const eased = 1 - Math.pow(1 - progress, 3);
      runtime.camera.position.lerpVectors(from, to, eased);
      runtime.camera.lookAt(target);
      runtime.renderer.render(runtime.scene, runtime.camera);
      if (progress >= .12) setVisualReady(true);
      if (progress < 1) cameraFrame = window.requestAnimationFrame(animateCamera);
    };
    cameraFrame = window.requestAnimationFrame(animateCamera);
    return () => window.cancelAnimationFrame(cameraFrame);
  }, [state, lod, selectedParentHexId]);

  const message = webglFailure ?? (state.status === "error" ? state.message : null);
  return (
    <div
      className="uat-spatial-webgl-surface"
      data-courtos-spatial-scene={visualReady ? "mapgen-3d" : undefined}
      data-spatial-render-ready={visualReady ? "true" : "false"}
      data-spatial-level={renderedLod === "fine_cell" ? "manor" : renderedLod === "mid_hex" ? "county" : renderedLod === "macro" ? "realm" : undefined}
      data-spatial-transitioning={transitioning || (state.status === "loading" && visualReady) ? "true" : "false"}
      data-camera-projection="perspective"
      data-camera-perspective-deg="43"
      data-terrain-relief={renderedLod === "macro" ? "0.9" : renderedLod ? "0.35" : undefined}
      data-manor-name={fabric?.manor.display_name?.replace(/^Manor of /, "")}
      data-manor-fabric={fabricRoles.join(" ")}
      data-native-or-colocated-fabric="working-yard administrative-court field-system commons pasture woodland"
      data-manor-facility-count={fabric?.discrete_facilities.length}
      data-estate-parent-count={estateParentCount}
      data-context-parent-count={renderedProof?.macro.parent_count}
      data-total-export-cell-count={renderedProof?.macro.fine_cell_count}
      data-mapgen-renderer="three-webgl"
      data-route-layer-authority="authored-linear-features-only"
      data-field-separator-authority="interpretive-land-use-transition-not-legal-boundary"
      data-mapgen-level={renderedLod ?? undefined}
      ref={mountRef}
    >
      {!visualReady && !webglFailure ? (
        <div className="uat-spatial-native-loading" role="status">Building the three-dimensional ground survey…</div>
      ) : null}
      {message ? (
        <div className="uat-spatial-native-loading" role="alert">
          <span>{message}</span>
          {!webglFailure ? (
            <button onClick={() => setReloadKey((value) => value + 1)} type="button">
              Try the ground survey again
            </button>
          ) : null}
        </div>
      ) : null}
      {renderedLod === "macro" && renderedProof ? (
        <div className="uat-spatial-a11y-hexes" aria-label="Recorded estate ground">
          {renderedProof.macro.parents
            .filter((parent) => parent.same_manor_as_target)
            .map((parent) => (
              <button
                aria-pressed={parent.hex_id === selectedParentHexId}
                key={parent.hex_id}
                onClick={() => onSelectedParentHexId(parent.hex_id)}
                type="button"
              >
                Recorded estate hex {parent.hex_id}
              </button>
            ))}
        </div>
      ) : null}
      <div className="uat-spatial-3d-badge" aria-hidden="true"><i /> MapGen · 3D terrain</div>
    </div>
  );
}
