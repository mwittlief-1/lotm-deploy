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

function cloneRelationshipVector(vector: RelationshipScoreVector): RelationshipScoreVector {
  return {
    allegiance: Math.trunc(vector.allegiance),
    respect: Math.trunc(vector.respect),
    threat: Math.trunc(vector.threat),
  };
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

export function ensureRelationshipEdge(state: RunState, fromId: string, toId: string): RelationshipEdge {
  const found = state.relationships.find((edge) => edge.from_id === fromId && edge.to_id === toId);
  if (found) return found;

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
  _reason?: string
): RelationshipEdge {
  const edge = ensureRelationshipEdge(state, fromId, toId);
  if (delta.allegiance !== undefined) edge.allegiance = clampInt(edge.allegiance + delta.allegiance, 0, 100);
  if (delta.respect !== undefined) edge.respect = clampInt(edge.respect + delta.respect, 0, 100);
  if (delta.threat !== undefined) edge.threat = clampInt(edge.threat + delta.threat, 0, 100);
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
