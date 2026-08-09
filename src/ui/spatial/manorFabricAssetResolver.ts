export type ManorFabricSpriteRole =
  | "administrative-court"
  | "chapel"
  | "commons"
  | "estate-core"
  | "field-system"
  | "fortification-works"
  | "infirmary"
  | "livestock-yard"
  | "mill"
  | "orchard"
  | "pasture"
  | "quay"
  | "stables"
  | "storage"
  | "working-yard"
  | "woodland";

const ROLE_SPRITES: Readonly<Record<ManorFabricSpriteRole, string>> = Object.freeze({
  "administrative-court": "/assets/mapgen-manor-v2/sprites/lesserLord/02-enclosed-manorial-forecourt.png",
  chapel: "/assets/mapgen-manor-v2/sprites/lesserLord/04-small-manorial-chapel.png",
  commons: "/assets/mapgen-manor-v2/sprites/rural/07-hedge-bank-gate-and-ditch.png",
  "estate-core": "/assets/mapgen-manor-v2/sprites/rural/00-modest-lower-noble-hall.png",
  "field-system": "/assets/mapgen-manor-v2/sprites/rural/01-threshing-barn.png",
  "fortification-works": "/assets/mapgen-manor-v2/sprites/baronial/02-fortified-gatehouse.png",
  infirmary: "/assets/mapgen-manor-v2/sprites/church/03-infirmary-and-physic-garden.png",
  "livestock-yard": "/assets/mapgen-manor-v2/sprites/rural/02-cattle-byre.png",
  mill: "/assets/mapgen-manor-v2/sprites/crossing/04-undershot-watermill.png",
  orchard: "/assets/mapgen-manor-v2/sprites/rural/04-apple-orchard.png",
  pasture: "/assets/mapgen-manor-v2/sprites/landscape/07-rough-upland-pasture.png",
  quay: "/assets/mapgen-manor-v2/sprites/civic/04-working-river-quay.png",
  stables: "/assets/mapgen-manor-v2/sprites/lesserLord/05-stable-and-hayloft.png",
  storage: "/assets/mapgen-manor-v2/sprites/lesserLord/08-manorial-barn-and-store.png",
  "working-yard": "/assets/mapgen-manor-v2/sprites/baronial/07-demesne-working-yard.png",
  woodland: "/assets/mapgen-manor-v2/sprites/landscape/03-dense-march-woodland.png",
});

/**
 * Converts an admitted fabric/facility descriptor into a visual role. This is
 * deliberately closed and source-bound: unknown descriptors render no
 * invented facility, while known canonical improvements select matching art.
 */
export function manorFabricRoleFromSource(
  declaredRole: string | null | undefined,
  sourceDescriptor: string | null | undefined,
): ManorFabricSpriteRole | null {
  const normalizedRole = declaredRole?.trim().toLowerCase() as ManorFabricSpriteRole | undefined;
  if (normalizedRole && Object.prototype.hasOwnProperty.call(ROLE_SPRITES, normalizedRole)) {
    return normalizedRole;
  }
  const descriptor = `${sourceDescriptor ?? ""}`.toLowerCase();
  if (/chapel|oratory/.test(descriptor)) return "chapel";
  if (/infirmary|physic|hospital/.test(descriptor)) return "infirmary";
  if (/watermill|water-mill|mill/.test(descriptor)) return "mill";
  if (/quay|jetty|wharf|boatyard/.test(descriptor)) return "quay";
  if (/orchard/.test(descriptor)) return "orchard";
  if (/granary|barn|storehouse|storage/.test(descriptor)) return "storage";
  if (/stable|mews|hayloft/.test(descriptor)) return "stables";
  if (/gatehouse|fortification|palisade|wall|tower|castle/.test(descriptor)) return "fortification-works";
  if (/livestock|cattle|byre/.test(descriptor)) return "livestock-yard";
  if (/working-yard|demesne-yard|work-yard/.test(descriptor)) return "working-yard";
  if (/administrative-court|forecourt/.test(descriptor)) return "administrative-court";
  if (/field-system|arable/.test(descriptor)) return "field-system";
  if (/pasture|common/.test(descriptor)) return "pasture";
  if (/estate-core|manor-house|great-hall|residence|seat/.test(descriptor)) return "estate-core";
  return null;
}

export function manorFabricSpritePath(
  declaredRole: string | null | undefined,
  sourceDescriptor?: string | null,
): string | null {
  const role = manorFabricRoleFromSource(declaredRole, sourceDescriptor);
  if (!role) return null;
  const descriptor = `${sourceDescriptor ?? ""}`.toLowerCase();
  if (role === "estate-core") {
    if (/comital|count(?:y|ess)?[- ]court/.test(descriptor)) {
      return "/assets/mapgen-manor-v2/sprites/civic/00-comital-court.png";
    }
    if (/castle|castellated/.test(descriptor)) {
      return "/assets/mapgen-manor-v2/sprites/baronial/01-compact-castle.png";
    }
    if (/baronial|great[- ]hall/.test(descriptor)) {
      return "/assets/mapgen-manor-v2/sprites/baronial/00-baronial-great-hall.png";
    }
    if (/woodland|march[- ]hall/.test(descriptor)) {
      return "/assets/mapgen-manor-v2/sprites/lesserLord/01-deepcote-woodland-march-hall.png";
    }
  }
  if (role === "storage" && /great[- ]granary|baronial granary/.test(descriptor)) {
    return "/assets/mapgen-manor-v2/sprites/baronial/04-great-granary.png";
  }
  if (role === "chapel" && /baronial|tower/.test(descriptor)) {
    return "/assets/mapgen-manor-v2/sprites/baronial/08-baronial-chapel-and-tower.png";
  }
  return ROLE_SPRITES[role];
}
