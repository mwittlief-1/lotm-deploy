/**
 * Narrow declarations for the pinned Three.js browser bundle used by CourtOS.
 * This is intentionally not a general Three.js declaration surface: it keeps
 * the offline runtime vendored while type-checking only APIs exercised by the
 * spatial renderer.
 */

export type ColorRepresentation = string | number | Color;

export interface CourtOsObjectUserData {
  [key: string]: unknown;
  cell?: { parent?: { hex_id: string; same_manor_as_target: boolean } };
  courtOsBaseOpacity?: number;
  courtOsBaseTransparent?: boolean;
  courtOsBaseDepthWrite?: boolean;
  courtOsSharedFabricTexture?: boolean;
}

export class Vector2 {
  constructor(x?: number, y?: number);
  x: number;
  y: number;
  set(x: number, y: number): this;
}

export class Vector3 {
  constructor(x?: number, y?: number, z?: number);
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): this;
  copy(value: Vector3): this;
  clone(): Vector3;
  add(value: Vector3): this;
  multiplyScalar(value: number): this;
  normalize(): this;
  lerpVectors(from: Vector3, to: Vector3, alpha: number): this;
}

export class Euler {
  constructor(x?: number, y?: number, z?: number);
  x: number;
  y: number;
  z: number;
}

export class Quaternion {
  setFromEuler(value: Euler): this;
}

export class Matrix4 {
  compose(position: Vector3, rotation: Quaternion, scale: Vector3): this;
}

export class Color {
  constructor(value?: ColorRepresentation);
}

export class Texture {
  userData: CourtOsObjectUserData;
  colorSpace: unknown;
  minFilter: unknown;
  image?: { width?: number; height?: number };
  dispose(): void;
}

export class TextureLoader {
  load(path: string): Texture;
}

export class BufferGeometry {
  setFromPoints(points: Vector3[]): this;
  setAttribute(name: string, attribute: Float32BufferAttribute): this;
  setIndex(index: number[]): this;
  computeVertexNormals(): void;
  dispose(): void;
}

export class Float32BufferAttribute {
  constructor(values: number[], itemSize: number);
}

export class CircleGeometry extends BufferGeometry {
  constructor(radius?: number, segments?: number);
}
export class CylinderGeometry extends BufferGeometry {
  constructor(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number);
}
export class BoxGeometry extends BufferGeometry {
  constructor(width?: number, height?: number, depth?: number);
}
export class IcosahedronGeometry extends BufferGeometry {
  constructor(radius?: number, detail?: number);
}
export class SphereGeometry extends BufferGeometry {
  constructor(radius?: number, widthSegments?: number, heightSegments?: number);
}
export class PlaneGeometry extends BufferGeometry {}
export class RingGeometry extends BufferGeometry {}
export class DodecahedronGeometry extends BufferGeometry {}

export class Material {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  needsUpdate: boolean;
  userData: CourtOsObjectUserData;
  map: Texture | null;
  dispose(): void;
}

export class MeshStandardMaterial extends Material {
  constructor(options?: Record<string, unknown>);
}
export class MeshBasicMaterial extends Material {
  constructor(options?: Record<string, unknown>);
}
export class SpriteMaterial extends Material {
  constructor(options?: Record<string, unknown>);
}
export class LineBasicMaterial extends Material {
  constructor(options?: Record<string, unknown>);
}
export class ShaderMaterial extends Material {
  constructor(options?: Record<string, unknown>);
}

export class Object3D {
  geometry?: BufferGeometry;
  material?: Material | Material[];
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  userData: CourtOsObjectUserData;
  renderOrder: number;
  castShadow: boolean;
  receiveShadow: boolean;
  add(...objects: Object3D[]): this;
  traverse(callback: (object: Object3D) => void): void;
}

export class Group extends Object3D {}

export class Mesh<G extends BufferGeometry = BufferGeometry, M extends Material = Material> extends Object3D {
  constructor(geometry?: G, material?: M);
  geometry: G;
  material: M;
}

export class Sprite extends Object3D {
  constructor(material?: SpriteMaterial);
  material: SpriteMaterial;
  center: Vector2;
}

export class InstancedMesh extends Mesh {
  constructor(geometry: BufferGeometry, material: Material, count: number);
  instanceMatrix: { needsUpdate: boolean };
  setMatrixAt(index: number, matrix: Matrix4): void;
}

export class LineSegments extends Object3D {
  constructor(geometry: BufferGeometry, material: LineBasicMaterial);
  geometry: BufferGeometry;
  material: LineBasicMaterial;
}

export class Scene extends Object3D {
  background: Color | null;
  fog: FogExp2 | null;
  remove(object: Object3D): this;
}

export class FogExp2 {
  constructor(color: ColorRepresentation, density?: number);
  density: number;
}

export class PerspectiveCamera extends Object3D {
  constructor(fov?: number, aspect?: number, near?: number, far?: number);
  fov: number;
  aspect: number;
  lookAt(target: Vector3 | number, y?: number, z?: number): void;
  updateProjectionMatrix(): void;
}

export class HemisphereLight extends Object3D {
  constructor(skyColor?: ColorRepresentation, groundColor?: ColorRepresentation, intensity?: number);
}

export class DirectionalLight extends Object3D {
  constructor(color?: ColorRepresentation, intensity?: number);
  shadow: {
    mapSize: { set(width: number, height: number): void };
    camera: { left: number; right: number; top: number; bottom: number; near: number; far: number };
    bias: number;
    normalBias: number;
  };
}

export class Raycaster {
  setFromCamera(pointer: Vector2, camera: PerspectiveCamera): void;
  intersectObjects(objects: Object3D[], recursive?: boolean): Array<{ object: Object3D }>;
}

export class WebGLRenderer {
  constructor(options?: { antialias?: boolean; powerPreference?: WebGLPowerPreference });
  domElement: HTMLCanvasElement;
  outputColorSpace: unknown;
  toneMapping: unknown;
  toneMappingExposure: number;
  shadowMap: { enabled: boolean; type: unknown };
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  render(scene: Scene, camera: PerspectiveCamera): void;
  dispose(): void;
}

export const MathUtils: { degToRad(degrees: number): number };
export const SRGBColorSpace: unknown;
export const LinearMipmapLinearFilter: unknown;
export const LinearFilter: unknown;
export const RepeatWrapping: unknown;
export const ACESFilmicToneMapping: unknown;
export const PCFSoftShadowMap: unknown;
export const BackSide: unknown;
export const DoubleSide: unknown;
