import type { HouseDossierSummary, Institution, KnownHouseSummary, RunState } from "../../types";
import {
  buildEconomyObligationPenaltyStageFromState,
  type EconomyObligationPenaltyStageEntryV1
} from "../economy/obligationEnforcement";
import {
  buildEconomyObligationRegistryFromState,
  type EconomyObligationCounterpartyKindV1,
  type EconomyObligationRegistryV1
} from "../economy/obligationRegistry";

export const REALM_PRESSURE_REGISTRY_SCHEMA_VERSION = "realm_pressure_registry_v1" as const;
export const POLITICAL_WEATHER_SCHEMA_VERSION = "political_weather_v1" as const;
export const REALM_PRESSURE_ACTOR_KEYS = ["crown", "magnates", "church"] as const;
export const REALM_PRESSURE_READ_MODE = "read_only" as const;
export const REALM_PRESSURE_ACTIVATION_STATUS = "inactive" as const;
export const REALM_PRESSURE_BASELINE_STATUSES = ["placeholder_zero", "seeded"] as const;
export const REALM_MAGNATE_RELATIONSHIP_BANDS = ["unknown", "favorable", "steady", "wary", "hostile"] as const;
export const REALM_MAGNATE_KINSHIP_SUMMARIES = ["none", "blood_tie", "marriage_tie", "blood_and_marriage_tie"] as const;

export type RealmPressureActorKeyV1 = typeof REALM_PRESSURE_ACTOR_KEYS[number];
export type RealmPressureReadModeV1 = typeof REALM_PRESSURE_READ_MODE;
export type RealmPressureActivationStatusV1 = typeof REALM_PRESSURE_ACTIVATION_STATUS;
export type RealmPressureBaselineStatusV1 = typeof REALM_PRESSURE_BASELINE_STATUSES[number];
export type RealmMagnateRelationshipBandV1 = typeof REALM_MAGNATE_RELATIONSHIP_BANDS[number];
export type RealmMagnateKinshipSummaryV1 = typeof REALM_MAGNATE_KINSHIP_SUMMARIES[number];
export type RealmPressureEnforcementStateV1 = "clear" | "arrears";
export type RealmPressureChurchTargetModeV1 =
  | "split_surface"
  | "clergy_person_only"
  | "parish_institution_only"
  | "missing";
export type RealmPressureSourceSurfaceStatusV1 = "available" | "missing";

export interface RealmMagnateRelationshipBandCountsV1 {
  unknown: number;
  favorable: number;
  steady: number;
  wary: number;
  hostile: number;
}

export interface RealmMagnateKinshipCountsV1 {
  none: number;
  blood_tie: number;
  marriage_tie: number;
  blood_and_marriage_tie: number;
}

export interface RealmPressureEntryBaseV1 {
  schema_version: typeof REALM_PRESSURE_REGISTRY_SCHEMA_VERSION;
  actor_key: RealmPressureActorKeyV1;
  actor_label: string;
  read_mode: RealmPressureReadModeV1;
  activation_status: RealmPressureActivationStatusV1;
  baseline_status: RealmPressureBaselineStatusV1;
  latent_pressure: number;
  source_surface_ids: string[];
  source_summary: string;
}

export interface RealmCrownPressureInputsV1 {
  counterparty_id: string;
  counterparty_label: string;
  due_asset: "tax_due_coin";
  due_amount: number;
  arrears_asset: "arrears_coin";
  arrears_amount: number;
  total_outstanding: number;
  settlement_cadence_turns: 1;
  enforcement_state: RealmPressureEnforcementStateV1;
  enforcement_rule_id: string;
  relationship_delta: {
    respect: number;
    threat: number;
  };
  grant_pressure_estimate: number;
  war_levy_active: boolean;
  war_levy_kind: string | null;
}

export interface RealmCrownPressureEntryV1 extends RealmPressureEntryBaseV1 {
  actor_key: "crown";
  inputs: RealmCrownPressureInputsV1;
}

export interface RealmMagnatesPressureInputsV1 {
  source_surface_status: RealmPressureSourceSurfaceStatusV1;
  local_noble_ids: string[];
  known_house_count: number;
  dossier_count: number;
  relevant_house_ids: string[];
  high_pressure_house_ids: string[];
  relationship_band_counts: RealmMagnateRelationshipBandCountsV1;
  kinship_counts: RealmMagnateKinshipCountsV1;
}

export interface RealmMagnatesPressureEntryV1 extends RealmPressureEntryBaseV1 {
  actor_key: "magnates";
  inputs: RealmMagnatesPressureInputsV1;
}

export interface RealmChurchPressureInputsV1 {
  counterparty_id: string;
  counterparty_label: string;
  due_asset: "tithe_due_bushels";
  due_amount: number;
  arrears_asset: "arrears_bushels";
  arrears_amount: number;
  total_outstanding: number;
  settlement_cadence_turns: 1;
  enforcement_state: RealmPressureEnforcementStateV1;
  enforcement_rule_id: string;
  relationship_delta: {
    respect: number;
    threat: number;
  };
  parish_institution_id: string | null;
  parish_institution_name: string | null;
  parish_priest_person_id: string | null;
  church_target_mode: RealmPressureChurchTargetModeV1;
}

export interface RealmChurchPressureEntryV1 extends RealmPressureEntryBaseV1 {
  actor_key: "church";
  inputs: RealmChurchPressureInputsV1;
}

export type RealmPressureEntryV1 =
  | RealmCrownPressureEntryV1
  | RealmMagnatesPressureEntryV1
  | RealmChurchPressureEntryV1;

export interface RealmPressureRegistryEntriesByKeyV1 {
  crown: RealmCrownPressureEntryV1;
  magnates: RealmMagnatesPressureEntryV1;
  church: RealmChurchPressureEntryV1;
}

export interface RealmPressureRegistryV1 {
  schema_version: typeof REALM_PRESSURE_REGISTRY_SCHEMA_VERSION;
  turn: number;
  actor_order: RealmPressureActorKeyV1[];
  entries_by_key: RealmPressureRegistryEntriesByKeyV1;
}

export interface PoliticalWeatherSharedContextV1 {
  unrest: number;
  shortage_active: boolean;
  war_levy_active: boolean;
}

export interface PoliticalWeatherV1 {
  schema_version: typeof POLITICAL_WEATHER_SCHEMA_VERSION;
  registry_schema_version: typeof REALM_PRESSURE_REGISTRY_SCHEMA_VERSION;
  turn: number;
  read_mode: RealmPressureReadModeV1;
  activation_status: RealmPressureActivationStatusV1;
  actor_order: RealmPressureActorKeyV1[];
  shared_context: PoliticalWeatherSharedContextV1;
  summary_lines: string[];
  registry: RealmPressureRegistryV1;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function normalizeNonNegativeInteger(value: number): number {
  return Math.max(0, normalizeInteger(value));
}

function canonicalStringList(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => String(value)).filter((value) => value.length > 0))].sort(compareText);
}

function relationshipBandCounts(): RealmMagnateRelationshipBandCountsV1 {
  return {
    unknown: 0,
    favorable: 0,
    steady: 0,
    wary: 0,
    hostile: 0
  };
}

function kinshipCounts(): RealmMagnateKinshipCountsV1 {
  return {
    none: 0,
    blood_tie: 0,
    marriage_tie: 0,
    blood_and_marriage_tie: 0
  };
}

function readKnownHouses(state: RunState): KnownHouseSummary[] {
  const rows = Array.isArray(state.known_houses) ? state.known_houses : [];
  const byHouseId = new Map<string, KnownHouseSummary>();

  for (const row of rows) {
    if (!row || typeof row.house_id !== "string" || row.house_id.length === 0) continue;
    if (!byHouseId.has(row.house_id)) {
      byHouseId.set(row.house_id, row);
    }
  }

  return [...byHouseId.values()].sort((a, b) => compareText(a.house_id, b.house_id));
}

function readHouseDossiers(state: RunState): HouseDossierSummary[] {
  const rows = Array.isArray(state.house_dossiers) ? state.house_dossiers : [];
  const byHouseId = new Map<string, HouseDossierSummary>();

  for (const row of rows) {
    if (!row || typeof row.house_id !== "string" || row.house_id.length === 0) continue;
    if (!byHouseId.has(row.house_id)) {
      byHouseId.set(row.house_id, row);
    }
  }

  return [...byHouseId.values()].sort((a, b) => compareText(a.house_id, b.house_id));
}

function parishInstitutionFromState(state: RunState): Institution | null {
  const anyState = state as any;
  const institutions =
    anyState?.institutions && typeof anyState.institutions === "object" && !Array.isArray(anyState.institutions)
      ? (anyState.institutions as Record<string, Institution>)
      : {};

  const candidateIds = canonicalStringList([
    typeof anyState?.locals?.parish_institution_id === "string" ? anyState.locals.parish_institution_id : "",
    typeof anyState?.manor?.parish_institution_id === "string" ? anyState.manor.parish_institution_id : ""
  ]);

  for (const candidateId of candidateIds) {
    const institution = institutions[candidateId];
    if (institution && institution.type === "parish") return institution;
  }

  const firstParish = Object.values(institutions)
    .filter((institution): institution is Institution => Boolean(institution && institution.type === "parish"))
    .sort((a, b) => compareText(a.id, b.id))[0];

  return firstParish ?? null;
}

function grantPressureEstimate(state: RunState): number {
  const arrears = state.manor?.obligations?.arrears;
  const arrearsCoin = normalizeNonNegativeInteger(arrears?.coin ?? 0);
  const arrearsBushels = normalizeNonNegativeInteger(arrears?.bushels ?? 0);
  return normalizeNonNegativeInteger(arrearsCoin + Math.floor(arrearsBushels / 100));
}

function warLevyKind(state: RunState): string | null {
  const levy = state.manor?.obligations?.war_levy_due;
  return levy && typeof levy.kind === "string" && levy.kind.length > 0 ? levy.kind : null;
}

function enforcementState(entry: EconomyObligationPenaltyStageEntryV1): RealmPressureEnforcementStateV1 {
  return entry.arrears_amount > 0 ? "arrears" : "clear";
}

function churchTargetMode(state: RunState, parish: Institution | null): RealmPressureChurchTargetModeV1 {
  const hasClergy = Boolean(state.locals?.clergy?.id);
  const hasParish = Boolean(parish);

  if (hasClergy && hasParish) return "split_surface";
  if (hasClergy) return "clergy_person_only";
  if (hasParish) return "parish_institution_only";
  return "missing";
}

function baseEntry(
  actorKey: RealmPressureActorKeyV1,
  actorLabel: string,
  sourceSurfaceIds: readonly string[],
  sourceSummary: string
): RealmPressureEntryBaseV1 {
  return {
    schema_version: REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
    actor_key: actorKey,
    actor_label: actorLabel,
    read_mode: REALM_PRESSURE_READ_MODE,
    activation_status: REALM_PRESSURE_ACTIVATION_STATUS,
    baseline_status: "placeholder_zero",
    latent_pressure: 0,
    source_surface_ids: canonicalStringList(sourceSurfaceIds),
    source_summary: sourceSummary
  };
}

function buildPenaltyByKind(
  state: RunState
): Record<EconomyObligationCounterpartyKindV1, EconomyObligationPenaltyStageEntryV1> {
  const penaltyStage = buildEconomyObligationPenaltyStageFromState(state);
  return Object.fromEntries(penaltyStage.entries.map((entry) => [entry.counterparty_kind, entry])) as Record<
    EconomyObligationCounterpartyKindV1,
    EconomyObligationPenaltyStageEntryV1
  >;
}

function buildCrownPressureEntry(
  state: RunState,
  registry: EconomyObligationRegistryV1,
  penaltyByKind: Record<EconomyObligationCounterpartyKindV1, EconomyObligationPenaltyStageEntryV1>
): RealmCrownPressureEntryV1 {
  const liege = registry.counterparties_by_key.liege;
  const penalty = penaltyByKind.liege;

  return {
    ...baseEntry(
      "crown",
      "Crown",
      [
        "economy_obligation_registry.liege",
        "economy_obligation_penalty_stage.liege",
        "manor.obligations.war_levy_due",
        "phase_prospects.grant_pressure_proxy"
      ],
      "Read-only crown precursor surface combines liege obligations, stage-one enforcement, the current arrears-based grant proxy, and war-levy visibility."
    ),
    actor_key: "crown",
    inputs: {
      counterparty_id: liege.counterparty_id,
      counterparty_label: liege.counterparty_label,
      due_asset: "tax_due_coin",
      due_amount: normalizeNonNegativeInteger(liege.due_amount),
      arrears_asset: "arrears_coin",
      arrears_amount: normalizeNonNegativeInteger(liege.arrears_amount),
      total_outstanding: normalizeNonNegativeInteger(liege.due_amount + liege.arrears_amount),
      settlement_cadence_turns: 1,
      enforcement_state: enforcementState(penalty),
      enforcement_rule_id: penalty.rule_id,
      relationship_delta: {
        respect: normalizeInteger(penalty.relationship_delta.respect),
        threat: normalizeInteger(penalty.relationship_delta.threat)
      },
      grant_pressure_estimate: grantPressureEstimate(state),
      war_levy_active: Boolean(state.manor?.obligations?.war_levy_due),
      war_levy_kind: warLevyKind(state)
    }
  };
}

function buildMagnatesPressureEntry(state: RunState): RealmMagnatesPressureEntryV1 {
  const anyState = state as any;
  const knownHouses = readKnownHouses(state);
  const dossiers = readHouseDossiers(state);
  const localNobleIds = canonicalStringList((state.locals?.nobles ?? []).map((person) => person.id));
  const relevantHouseIds = canonicalStringList([
    ...knownHouses.map((row) => row.house_id),
    ...dossiers.map((row) => row.house_id)
  ]);
  const highPressureHouseIds = canonicalStringList(
    dossiers
      .filter((row) => row.relationship_band === "hostile" || row.relationship_band === "wary")
      .map((row) => row.house_id)
  );
  const bands = relationshipBandCounts();
  const kinships = kinshipCounts();

  for (const row of dossiers) {
    bands[row.relationship_band] += 1;
    kinships[row.kinship_summary] += 1;
  }

  const sourceSurfaceStatus: RealmPressureSourceSurfaceStatusV1 =
    Array.isArray(anyState?.known_houses) || Array.isArray(anyState?.house_dossiers) ? "available" : "missing";

  return {
    ...baseEntry(
      "magnates",
      "Magnates",
      ["house_dossiers", "known_houses", "locals.nobles"],
      "Read-only magnate precursor surface combines observed local nobles with known-house and dossier summaries when available."
    ),
    actor_key: "magnates",
    inputs: {
      source_surface_status: sourceSurfaceStatus,
      local_noble_ids: localNobleIds,
      known_house_count: knownHouses.length,
      dossier_count: dossiers.length,
      relevant_house_ids: relevantHouseIds,
      high_pressure_house_ids: highPressureHouseIds,
      relationship_band_counts: bands,
      kinship_counts: kinships
    }
  };
}

function buildChurchPressureEntry(
  state: RunState,
  registry: EconomyObligationRegistryV1,
  penaltyByKind: Record<EconomyObligationCounterpartyKindV1, EconomyObligationPenaltyStageEntryV1>
): RealmChurchPressureEntryV1 {
  const church = registry.counterparties_by_key.church;
  const penalty = penaltyByKind.church;
  const parish = parishInstitutionFromState(state);

  return {
    ...baseEntry(
      "church",
      "Church",
      [
        "economy_obligation_registry.church",
        "economy_obligation_penalty_stage.church",
        "world.parish_institution_visibility"
      ],
      "Read-only church precursor surface combines church obligations, stage-one enforcement, and the current clergy-versus-parish visibility seam."
    ),
    actor_key: "church",
    inputs: {
      counterparty_id: church.counterparty_id,
      counterparty_label: church.counterparty_label,
      due_asset: "tithe_due_bushels",
      due_amount: normalizeNonNegativeInteger(church.due_amount),
      arrears_asset: "arrears_bushels",
      arrears_amount: normalizeNonNegativeInteger(church.arrears_amount),
      total_outstanding: normalizeNonNegativeInteger(church.due_amount + church.arrears_amount),
      settlement_cadence_turns: 1,
      enforcement_state: enforcementState(penalty),
      enforcement_rule_id: penalty.rule_id,
      relationship_delta: {
        respect: normalizeInteger(penalty.relationship_delta.respect),
        threat: normalizeInteger(penalty.relationship_delta.threat)
      },
      parish_institution_id: parish?.id ?? null,
      parish_institution_name:
        parish && typeof parish.name === "string" && parish.name.length > 0 ? parish.name : parish?.id ?? null,
      parish_priest_person_id:
        parish && "priest_person_id" in parish && typeof parish.priest_person_id === "string"
          ? parish.priest_person_id
          : null,
      church_target_mode: churchTargetMode(state, parish)
    }
  };
}

function summaryLineForEntry(entry: RealmPressureEntryV1): string {
  switch (entry.actor_key) {
    case "crown":
      return `Crown: ${entry.inputs.total_outstanding} outstanding, grant proxy ${entry.inputs.grant_pressure_estimate}, levy ${entry.inputs.war_levy_active ? "active" : "clear"}.`;
    case "magnates":
      return `Magnates: ${entry.inputs.relevant_house_ids.length} observed houses, ${entry.inputs.high_pressure_house_ids.length} high-pressure houses, ${entry.inputs.local_noble_ids.length} local nobles.`;
    case "church":
      return `Church: ${entry.inputs.total_outstanding} outstanding, target ${entry.inputs.church_target_mode}.`;
  }
}

export function buildRealmPressureRegistryFromState(state: RunState): RealmPressureRegistryV1 {
  const registry = buildEconomyObligationRegistryFromState(state);
  const penaltyByKind = buildPenaltyByKind(state);
  const actorOrder = [...REALM_PRESSURE_ACTOR_KEYS];

  return {
    schema_version: REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
    turn: normalizeNonNegativeInteger(state.turn_index),
    actor_order: actorOrder,
    entries_by_key: {
      crown: buildCrownPressureEntry(state, registry, penaltyByKind),
      magnates: buildMagnatesPressureEntry(state),
      church: buildChurchPressureEntry(state, registry, penaltyByKind)
    }
  };
}

export function buildPoliticalWeatherFromState(state: RunState): PoliticalWeatherV1 {
  const registry = buildRealmPressureRegistryFromState(state);
  const actorOrder = [...registry.actor_order];
  const shortageActive = Boolean((state.flags as Record<string, unknown>).Shortage);
  const warLevyActive = Boolean(state.manor?.obligations?.war_levy_due);

  return {
    schema_version: POLITICAL_WEATHER_SCHEMA_VERSION,
    registry_schema_version: REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
    turn: registry.turn,
    read_mode: REALM_PRESSURE_READ_MODE,
    activation_status: REALM_PRESSURE_ACTIVATION_STATUS,
    actor_order: actorOrder,
    shared_context: {
      unrest: normalizeNonNegativeInteger(state.manor?.unrest ?? 0),
      shortage_active: shortageActive,
      war_levy_active: warLevyActive
    },
    summary_lines: actorOrder.map((actorKey) => summaryLineForEntry(registry.entries_by_key[actorKey])),
    registry
  };
}

export function serializeRealmPressureRegistrySnapshot(state: RunState): string {
  return JSON.stringify(buildRealmPressureRegistryFromState(state));
}

export function serializePoliticalWeatherSnapshot(state: RunState): string {
  return JSON.stringify(buildPoliticalWeatherFromState(state));
}
