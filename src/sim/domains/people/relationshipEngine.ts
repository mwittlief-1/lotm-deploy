import { playerHouseIdOf, structuredHouseIdForPerson } from "../../actors";
import type { RelationshipEdge, RunState } from "../../types";
import { clampInt } from "../../util";

export type RelationshipDelta = {
  allegiance?: number;
  respect?: number;
  threat?: number;
};

export type RelationshipScoreVector = {
  allegiance: number;
  respect: number;
  threat: number;
};

export type RelationshipStandingBand = "hostile" | "wary" | "steady" | "favorable";

export const RELATIONSHIP_BASELINE = {
  allegiance: 50,
  respect: 50,
  threat: 20
} as const;

export const RELATIONSHIP_SEED_SCHEMA_VERSION = "relationship_seed_schema_v0" as const;

export const RELATIONSHIP_SEED_FAMILIES = ["liege", "church", "local_house"] as const;
export type RelationshipSeedFamily = (typeof RELATIONSHIP_SEED_FAMILIES)[number];

export const RELATIONSHIP_SEED_DIRECTIONS = ["player_to_counterparty", "counterparty_to_player"] as const;
export type RelationshipSeedDirection = (typeof RELATIONSHIP_SEED_DIRECTIONS)[number];

export const RELATIONSHIP_SEED_LOCAL_STANCES = ["favored", "strained"] as const;
export type RelationshipSeedLocalStance = (typeof RELATIONSHIP_SEED_LOCAL_STANCES)[number];

export type RelationshipSeedRole =
  | "player_house_head"
  | "liege_counterparty"
  | "church_counterparty"
  | "local_house_counterparty";

export const RELATIONSHIP_SEED_PROFILE_KEYS = [
  "player_head_to_liege",
  "liege_to_player_head",
  "player_head_to_church",
  "church_to_player_head",
  "player_head_to_local_house_favored",
  "local_house_favored_to_player_head",
  "player_head_to_local_house_strained",
  "local_house_strained_to_player_head",
] as const;
export type RelationshipSeedProfileKey = (typeof RELATIONSHIP_SEED_PROFILE_KEYS)[number];

export type RelationshipSeedProfile = {
  schema_version: typeof RELATIONSHIP_SEED_SCHEMA_VERSION;
  profile_key: RelationshipSeedProfileKey;
  family: RelationshipSeedFamily;
  direction: RelationshipSeedDirection;
  from_role: RelationshipSeedRole;
  to_role: RelationshipSeedRole;
  local_stance: RelationshipSeedLocalStance | null;
  baseline: RelationshipScoreVector;
  delta: RelationshipScoreVector;
  target: RelationshipScoreVector;
};

export interface RuntimeRelationshipChangeRecordV1 {
  sequence: number;
  turn_index: number;
  from_id: string;
  to_id: string;
  reason: string;
  delta: RelationshipScoreVector;
}

type RelationshipSeedProfileSpec = {
  family: RelationshipSeedFamily;
  direction: RelationshipSeedDirection;
  from_role: RelationshipSeedRole;
  to_role: RelationshipSeedRole;
  local_stance: RelationshipSeedLocalStance | null;
  delta: RelationshipScoreVector;
};

const RELATIONSHIP_SEED_PROFILE_SPECS: Record<RelationshipSeedProfileKey, RelationshipSeedProfileSpec> = {
  player_head_to_liege: {
    family: "liege",
    direction: "player_to_counterparty",
    from_role: "player_house_head",
    to_role: "liege_counterparty",
    local_stance: null,
    delta: { allegiance: +18, respect: +10, threat: -6 },
  },
  liege_to_player_head: {
    family: "liege",
    direction: "counterparty_to_player",
    from_role: "liege_counterparty",
    to_role: "player_house_head",
    local_stance: null,
    delta: { allegiance: +8, respect: +8, threat: -4 },
  },
  player_head_to_church: {
    family: "church",
    direction: "player_to_counterparty",
    from_role: "player_house_head",
    to_role: "church_counterparty",
    local_stance: null,
    delta: { allegiance: +4, respect: +12, threat: -8 },
  },
  church_to_player_head: {
    family: "church",
    direction: "counterparty_to_player",
    from_role: "church_counterparty",
    to_role: "player_house_head",
    local_stance: null,
    delta: { allegiance: +2, respect: +10, threat: -6 },
  },
  player_head_to_local_house_favored: {
    family: "local_house",
    direction: "player_to_counterparty",
    from_role: "player_house_head",
    to_role: "local_house_counterparty",
    local_stance: "favored",
    delta: { allegiance: +7, respect: +6, threat: -4 },
  },
  local_house_favored_to_player_head: {
    family: "local_house",
    direction: "counterparty_to_player",
    from_role: "local_house_counterparty",
    to_role: "player_house_head",
    local_stance: "favored",
    delta: { allegiance: +5, respect: +4, threat: -3 },
  },
  player_head_to_local_house_strained: {
    family: "local_house",
    direction: "player_to_counterparty",
    from_role: "player_house_head",
    to_role: "local_house_counterparty",
    local_stance: "strained",
    delta: { allegiance: -9, respect: -5, threat: +7 },
  },
  local_house_strained_to_player_head: {
    family: "local_house",
    direction: "counterparty_to_player",
    from_role: "local_house_counterparty",
    to_role: "player_house_head",
    local_stance: "strained",
    delta: { allegiance: -7, respect: -4, threat: +6 },
  },
};

const runtimeRelationshipChangeLogByState = new WeakMap<RunState, RuntimeRelationshipChangeRecordV1[]>();

function cloneRelationshipVector(vector: RelationshipScoreVector): RelationshipScoreVector {
  return {
    allegiance: Math.trunc(vector.allegiance),
    respect: Math.trunc(vector.respect),
    threat: Math.trunc(vector.threat),
  };
}

function runtimeRelationshipChangeLog(state: RunState): RuntimeRelationshipChangeRecordV1[] {
  const existing = runtimeRelationshipChangeLogByState.get(state);
  if (existing) return existing;
  const created: RuntimeRelationshipChangeRecordV1[] = [];
  runtimeRelationshipChangeLogByState.set(state, created);
  return created;
}

export function readRuntimeRelationshipChangeLog(state: RunState): RuntimeRelationshipChangeRecordV1[] {
  return runtimeRelationshipChangeLog(state).map((entry) => ({
    ...entry,
    delta: cloneRelationshipVector(entry.delta)
  }));
}

export function readRelationshipVector(
  state: RunState,
  fromId: string,
  toId: string
): RelationshipScoreVector {
  const existing = state.relationships.find((edge) => edge.from_id === fromId && edge.to_id === toId);
  if (existing) {
    return cloneRelationshipVector(existing);
  }

  const seededProfile = resolveRelationshipSeedProfileForIds(state, fromId, toId);
  if (seededProfile) {
    return cloneRelationshipVector(seededProfile.target);
  }

  return cloneRelationshipVector(RELATIONSHIP_BASELINE);
}

export function relationshipFavorScore(vector: RelationshipScoreVector): number {
  return Math.trunc(vector.allegiance) + Math.trunc(vector.respect) - Math.trunc(vector.threat);
}

export function classifyRelationshipStanding(vector: RelationshipScoreVector): RelationshipStandingBand {
  if (vector.threat >= 26 || vector.allegiance <= 42 || vector.respect <= 44) return "hostile";
  if (vector.allegiance >= 60 && vector.respect >= 56 && vector.threat <= 16) return "favorable";
  if (vector.allegiance >= 48 && vector.respect >= 48 && vector.threat <= 22) return "steady";
  return "wary";
}

export function applyRelationshipDeltaToVector(
  baseline: RelationshipScoreVector,
  delta: RelationshipDelta
): RelationshipScoreVector {
  return {
    allegiance: clampInt(
      Math.trunc(baseline.allegiance) + Math.trunc(delta.allegiance ?? 0),
      0,
      100
    ),
    respect: clampInt(Math.trunc(baseline.respect) + Math.trunc(delta.respect ?? 0), 0, 100),
    threat: clampInt(Math.trunc(baseline.threat) + Math.trunc(delta.threat ?? 0), 0, 100),
  };
}

export function getRelationshipSeedProfileKey(input: {
  family: RelationshipSeedFamily;
  direction: RelationshipSeedDirection;
  local_stance?: RelationshipSeedLocalStance | null;
}): RelationshipSeedProfileKey {
  if (input.family === "liege") {
    return input.direction === "player_to_counterparty" ? "player_head_to_liege" : "liege_to_player_head";
  }
  if (input.family === "church") {
    return input.direction === "player_to_counterparty" ? "player_head_to_church" : "church_to_player_head";
  }

  const localStance = input.local_stance ?? null;
  if (localStance === "favored") {
    return input.direction === "player_to_counterparty"
      ? "player_head_to_local_house_favored"
      : "local_house_favored_to_player_head";
  }
  if (localStance === "strained") {
    return input.direction === "player_to_counterparty"
      ? "player_head_to_local_house_strained"
      : "local_house_strained_to_player_head";
  }

  throw new Error(`local_house seed profile requires a supported local_stance; received ${String(localStance)}`);
}

export function getRelationshipSeedProfile(profileKey: RelationshipSeedProfileKey): RelationshipSeedProfile {
  const spec = RELATIONSHIP_SEED_PROFILE_SPECS[profileKey];
  const baseline = cloneRelationshipVector(RELATIONSHIP_BASELINE);
  const delta = cloneRelationshipVector(spec.delta);
  return {
    schema_version: RELATIONSHIP_SEED_SCHEMA_VERSION,
    profile_key: profileKey,
    family: spec.family,
    direction: spec.direction,
    from_role: spec.from_role,
    to_role: spec.to_role,
    local_stance: spec.local_stance,
    baseline,
    delta,
    target: applyRelationshipDeltaToVector(baseline, delta),
  };
}

export function listRelationshipSeedProfiles(): RelationshipSeedProfile[] {
  return RELATIONSHIP_SEED_PROFILE_KEYS.map((profileKey) => getRelationshipSeedProfile(profileKey));
}

function parishInstitutionIdOf(state: RunState): string | null {
  const anyState: any = state as any;
  const localsParishId =
    typeof anyState?.locals?.parish_institution_id === "string" && anyState.locals.parish_institution_id.length > 0
      ? String(anyState.locals.parish_institution_id)
      : null;
  if (localsParishId) return localsParishId;

  const manorParishId =
    typeof anyState?.manor?.parish_institution_id === "string" && anyState.manor.parish_institution_id.length > 0
      ? String(anyState.manor.parish_institution_id)
      : null;
  return manorParishId;
}

function isChurchCounterpartyId(state: RunState, actorId: string): boolean {
  if (!actorId) return false;
  if (actorId === state.locals?.clergy?.id) return true;

  const anyState: any = state as any;
  const parishId = parishInstitutionIdOf(state);
  if (parishId && actorId === parishId) return true;

  const institution: any = anyState?.institutions?.[actorId];
  return Boolean(institution && typeof institution === "object" && institution.type === "parish");
}

function isLocalNobleId(actorId: string): boolean {
  return /^p_noble\d+$/.test(actorId);
}

function stableOrdinalFromId(actorId: string): number {
  const match = actorId.match(/(\d+)(?!.*\d)/);
  if (match) {
    const parsed = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  let acc = 0;
  for (const ch of actorId) acc = (acc + ch.charCodeAt(0)) % 997;
  return acc;
}

function localHouseStanceForCounterparty(state: RunState, actorId: string): RelationshipSeedLocalStance {
  const structuredHouseId = structuredHouseIdForPerson(state, actorId);
  const stableId = structuredHouseId ?? actorId;
  return stableOrdinalFromId(stableId) % 2 === 0 ? "favored" : "strained";
}

function isLocalHouseCounterpartyId(state: RunState, actorId: string): boolean {
  if (!actorId) return false;
  if (actorId === state.house?.head?.id) return false;
  if (actorId === state.locals?.liege?.id) return false;
  if (isChurchCounterpartyId(state, actorId)) return false;
  if (isLocalNobleId(actorId)) return true;

  const playerHouseId = playerHouseIdOf(state);
  const houseId = structuredHouseIdForPerson(state, actorId);
  if (!houseId || houseId === playerHouseId) return false;

  const anyState: any = state as any;
  const house: any = anyState?.houses?.[houseId];
  return Boolean(house && typeof house === "object" && house.head_id === actorId);
}

export function resolveRelationshipSeedProfileForIds(
  state: RunState,
  fromId: string,
  toId: string
): RelationshipSeedProfile | null {
  if (Math.trunc(state.turn_index) !== 0) return null;

  const playerHeadId = state.house?.head?.id ?? "";
  if (!playerHeadId) return null;
  if (fromId !== playerHeadId && toId !== playerHeadId) return null;

  const direction: RelationshipSeedDirection =
    fromId === playerHeadId ? "player_to_counterparty" : "counterparty_to_player";
  const counterpartyId = fromId === playerHeadId ? toId : fromId;

  if (counterpartyId === state.locals?.liege?.id) {
    return getRelationshipSeedProfile(
      getRelationshipSeedProfileKey({
        family: "liege",
        direction,
      })
    );
  }

  if (isChurchCounterpartyId(state, counterpartyId)) {
    return getRelationshipSeedProfile(
      getRelationshipSeedProfileKey({
        family: "church",
        direction,
      })
    );
  }

  if (isLocalHouseCounterpartyId(state, counterpartyId)) {
    return getRelationshipSeedProfile(
      getRelationshipSeedProfileKey({
        family: "local_house",
        direction,
        local_stance: localHouseStanceForCounterparty(state, counterpartyId),
      })
    );
  }

  return null;
}

export function ensureRelationshipEdge(state: RunState, fromId: string, toId: string): RelationshipEdge {
  const found = state.relationships.find((edge) => edge.from_id === fromId && edge.to_id === toId);
  if (found) return found;

  const seededProfile = resolveRelationshipSeedProfileForIds(state, fromId, toId);
  if (seededProfile) {
    const edge: RelationshipEdge = {
      from_id: fromId,
      to_id: toId,
      allegiance: seededProfile.target.allegiance,
      respect: seededProfile.target.respect,
      threat: seededProfile.target.threat,
    };
    state.relationships.push(edge);
    return edge;
  }

  const edge: RelationshipEdge = {
    from_id: fromId,
    to_id: toId,
    allegiance: RELATIONSHIP_BASELINE.allegiance,
    respect: RELATIONSHIP_BASELINE.respect,
    threat: RELATIONSHIP_BASELINE.threat
  };
  state.relationships.push(edge);
  return edge;
}

export function applyRelationshipDelta(
  state: RunState,
  fromId: string,
  toId: string,
  delta: RelationshipDelta,
  reason?: string
): RelationshipEdge {
  const edge = ensureRelationshipEdge(state, fromId, toId);
  const before = cloneRelationshipVector(edge);
  if (delta.allegiance !== undefined) edge.allegiance = clampInt(edge.allegiance + delta.allegiance, 0, 100);
  if (delta.respect !== undefined) edge.respect = clampInt(edge.respect + delta.respect, 0, 100);
  if (delta.threat !== undefined) edge.threat = clampInt(edge.threat + delta.threat, 0, 100);

  const appliedDelta = {
    allegiance: edge.allegiance - before.allegiance,
    respect: edge.respect - before.respect,
    threat: edge.threat - before.threat
  };

  if (appliedDelta.allegiance !== 0 || appliedDelta.respect !== 0 || appliedDelta.threat !== 0) {
    const log = runtimeRelationshipChangeLog(state);
    log.push({
      sequence: log.length,
      turn_index: Math.trunc(state.turn_index),
      from_id: fromId,
      to_id: toId,
      reason: typeof reason === "string" && reason.trim().length > 0 ? reason.trim() : "relationship_delta",
      delta: appliedDelta
    });
  }

  return edge;
}

export function driftRelationshipTowardBaseline(
  edge: RelationshipEdge,
  baseline = RELATIONSHIP_BASELINE
): RelationshipEdge {
  edge.allegiance += edge.allegiance < baseline.allegiance ? 1 : edge.allegiance > baseline.allegiance ? -1 : 0;
  edge.respect += edge.respect < baseline.respect ? 1 : edge.respect > baseline.respect ? -1 : 0;
  edge.threat += edge.threat < baseline.threat ? 1 : edge.threat > baseline.threat ? -1 : 0;
  edge.allegiance = clampInt(edge.allegiance, 0, 100);
  edge.respect = clampInt(edge.respect, 0, 100);
  edge.threat = clampInt(edge.threat, 0, 100);
  return edge;
}

export function driftRelationshipsTowardBaseline(state: RunState): void {
  for (const edge of state.relationships) {
    driftRelationshipTowardBaseline(edge);
  }
}
