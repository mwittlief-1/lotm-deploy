import { describe, expect, it } from "vitest";

import type { HouseDossierSummary, KnownHouseSummary, Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import {
  POLITICAL_WEATHER_SCHEMA_VERSION,
  REALM_PRESSURE_ACTOR_KEYS,
  REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
  buildPoliticalWeatherFromState,
  buildRealmPressureRegistryFromState,
  serializePoliticalWeatherSnapshot,
  serializeRealmPressureRegistrySnapshot
} from "../../src/sim/domains/realm";

function mkPerson(id: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkKnownHouses(): KnownHouseSummary[] {
  return [
    {
      house_id: "h_beta",
      house_name: "House Beta",
      tier: "Knight",
      relevance_tier: "tier1",
      relevance_reasons: ["marriage_tie"],
      head_id: "p_beta_head",
      head_name: "Beta Head",
      head_age: 36,
      head_status: "Alive",
      head_short_id: null,
      heir_indicator: "has_male_heir",
      has_male_heir: true,
      heiress_possible: false,
      relationship: { allegiance: 52, respect: 47, threat: 24 }
    },
    {
      house_id: "h_alpha",
      house_name: "House Alpha",
      tier: "Baron",
      relevance_tier: "tier1",
      relevance_reasons: ["blood_tie"],
      head_id: "p_alpha_head",
      head_name: "Alpha Head",
      head_age: 42,
      head_status: "Alive",
      head_short_id: null,
      heir_indicator: "heiress_possible",
      has_male_heir: false,
      heiress_possible: true,
      relationship: { allegiance: 39, respect: 41, threat: 27 }
    }
  ];
}

function mkHouseDossiers(): HouseDossierSummary[] {
  return [
    {
      schema_version: "house_dossier_summary_v1",
      house_id: "h_beta",
      house_name: "House Beta",
      tier: "Knight",
      relevance_tier: "tier1",
      relevance_reasons: ["marriage_tie"],
      kinship_summary: "marriage_tie",
      relationship_band: "wary",
      household_scope: "household_seeded",
      household_member_count: 3,
      living_member_count: 3,
      child_count: 1,
      has_male_heir: true,
      heiress_possible: false
    },
    {
      schema_version: "house_dossier_summary_v1",
      house_id: "h_alpha",
      house_name: "House Alpha",
      tier: "Baron",
      relevance_tier: "tier1",
      relevance_reasons: ["blood_tie"],
      kinship_summary: "blood_tie",
      relationship_band: "hostile",
      household_scope: "household_seeded",
      household_member_count: 4,
      living_member_count: 4,
      child_count: 2,
      has_male_heir: false,
      heiress_possible: true
    }
  ];
}

function mkState(): RunState {
  const state: RunState = {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 3,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 80,
      coin: 12,
      unrest: 17,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 4,
        tithe_due_bushels: 21,
        arrears: { coin: 6, bushels: 110 },
        war_levy_due: { kind: "men_or_coin", men: 8, coin: 5, created_turn: 2 }
      }
    },
    house: {
      head: mkPerson("p_head", "M", 40),
      children: [],
      energy: { max: 3, available: 3 }
    },
    locals: {
      liege: mkPerson("p_liege", "M", 50),
      clergy: mkPerson("p_clergy", "M", 45),
      nobles: [mkPerson("p_noble2", "M", 39), mkPerson("p_noble1", "M", 43)]
    },
    relationships: [],
    flags: { Shortage: true },
    log: [],
    known_houses: mkKnownHouses(),
    house_dossiers: mkHouseDossiers(),
    institutions: {
      i_parish_player_local: {
        id: "i_parish_player_local",
        type: "parish",
        name: "St. Brigid",
        patron_actor_id: { kind: "house", id: "h_player" },
        priest_person_id: null
      }
    }
  };

  (state.locals as any).parish_institution_id = "i_parish_player_local";

  return state;
}

describe("political weather contract", () => {
  it("builds a stable read-only registry and weather scaffold for crown, magnates, and church", () => {
    const state = mkState();

    expect(REALM_PRESSURE_REGISTRY_SCHEMA_VERSION).toBe("realm_pressure_registry_v1");
    expect(POLITICAL_WEATHER_SCHEMA_VERSION).toBe("political_weather_v1");
    expect(REALM_PRESSURE_ACTOR_KEYS).toEqual(["crown", "magnates", "church"]);

    const registry = buildRealmPressureRegistryFromState(state);

    expect(registry).toEqual({
      schema_version: REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
      turn: 3,
      actor_order: ["crown", "magnates", "church"],
      entries_by_key: {
        crown: {
          schema_version: REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
          actor_key: "crown",
          actor_label: "Crown",
          read_mode: "read_only",
          activation_status: "inactive",
          baseline_status: "placeholder_zero",
          latent_pressure: 0,
          source_surface_ids: [
            "economy_obligation_penalty_stage.liege",
            "economy_obligation_registry.liege",
            "manor.obligations.war_levy_due",
            "phase_prospects.grant_pressure_proxy"
          ],
          source_summary:
            "Read-only crown precursor surface combines liege obligations, stage-one enforcement, the current arrears-based grant proxy, and war-levy visibility.",
          inputs: {
            counterparty_id: "p_liege",
            counterparty_label: "p_liege",
            due_asset: "tax_due_coin",
            due_amount: 4,
            arrears_asset: "arrears_coin",
            arrears_amount: 6,
            total_outstanding: 10,
            settlement_cadence_turns: 1,
            enforcement_state: "arrears",
            enforcement_rule_id: "enforcement.penalty.stage_one.liege_arrears",
            relationship_delta: {
              respect: -1,
              threat: 1
            },
            grant_pressure_estimate: 7,
            war_levy_active: true,
            war_levy_kind: "men_or_coin"
          }
        },
        magnates: {
          schema_version: REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
          actor_key: "magnates",
          actor_label: "Magnates",
          read_mode: "read_only",
          activation_status: "inactive",
          baseline_status: "placeholder_zero",
          latent_pressure: 0,
          source_surface_ids: ["house_dossiers", "known_houses", "locals.nobles"],
          source_summary:
            "Read-only magnate precursor surface combines observed local nobles with known-house and dossier summaries when available.",
          inputs: {
            source_surface_status: "available",
            local_noble_ids: ["p_noble1", "p_noble2"],
            known_house_count: 2,
            dossier_count: 2,
            relevant_house_ids: ["h_alpha", "h_beta"],
            high_pressure_house_ids: ["h_alpha", "h_beta"],
            relationship_band_counts: {
              unknown: 0,
              favorable: 0,
              steady: 0,
              wary: 1,
              hostile: 1
            },
            kinship_counts: {
              none: 0,
              blood_tie: 1,
              marriage_tie: 1,
              blood_and_marriage_tie: 0
            }
          }
        },
        church: {
          schema_version: REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
          actor_key: "church",
          actor_label: "Church",
          read_mode: "read_only",
          activation_status: "inactive",
          baseline_status: "placeholder_zero",
          latent_pressure: 0,
          source_surface_ids: [
            "economy_obligation_penalty_stage.church",
            "economy_obligation_registry.church",
            "world.parish_institution_visibility"
          ],
          source_summary:
            "Read-only church precursor surface combines church obligations, stage-one enforcement, and the current clergy-versus-parish visibility seam.",
          inputs: {
            counterparty_id: "p_clergy",
            counterparty_label: "p_clergy",
            due_asset: "tithe_due_bushels",
            due_amount: 21,
            arrears_asset: "arrears_bushels",
            arrears_amount: 110,
            total_outstanding: 131,
            settlement_cadence_turns: 1,
            enforcement_state: "arrears",
            enforcement_rule_id: "enforcement.penalty.stage_one.church_arrears",
            relationship_delta: {
              respect: -1,
              threat: 1
            },
            parish_institution_id: "i_parish_player_local",
            parish_institution_name: "St. Brigid",
            parish_priest_person_id: null,
            church_target_mode: "split_surface"
          }
        }
      }
    });

    expect(buildPoliticalWeatherFromState(state)).toEqual({
      schema_version: POLITICAL_WEATHER_SCHEMA_VERSION,
      registry_schema_version: REALM_PRESSURE_REGISTRY_SCHEMA_VERSION,
      turn: 3,
      read_mode: "read_only",
      activation_status: "inactive",
      actor_order: ["crown", "magnates", "church"],
      shared_context: {
        unrest: 17,
        shortage_active: true,
        war_levy_active: true
      },
      summary_lines: [
        "Crown: 10 outstanding, grant proxy 7, levy active.",
        "Magnates: 2 observed houses, 2 high-pressure houses, 2 local nobles.",
        "Church: 131 outstanding, target split_surface."
      ],
      registry
    });
  });

  it("serializes the registry and weather snapshots deterministically regardless of surface insertion order", () => {
    const stateA = mkState();
    const stateB = mkState();

    stateB.known_houses = [...(stateB.known_houses ?? [])].reverse();
    stateB.house_dossiers = [...(stateB.house_dossiers ?? [])].reverse();
    stateB.locals.nobles = [...stateB.locals.nobles].reverse();

    expect(serializeRealmPressureRegistrySnapshot(stateA)).toBe(serializeRealmPressureRegistrySnapshot(stateB));
    expect(serializePoliticalWeatherSnapshot(stateA)).toBe(serializePoliticalWeatherSnapshot(stateB));
  });

  it("stays read-only and exposes missing optional precursor surfaces explicitly", () => {
    const state = mkState();

    delete state.known_houses;
    delete state.house_dossiers;
    delete state.institutions;
    delete (state.locals as any).parish_institution_id;
    const expectedState = JSON.parse(JSON.stringify(state));

    const weather = buildPoliticalWeatherFromState(state);

    expect(state).toEqual(expectedState);
    expect(weather.registry.entries_by_key.magnates.inputs.source_surface_status).toBe("missing");
    expect(weather.registry.entries_by_key.magnates.inputs.known_house_count).toBe(0);
    expect(weather.registry.entries_by_key.magnates.inputs.dossier_count).toBe(0);
    expect(weather.registry.entries_by_key.church.inputs.church_target_mode).toBe("clergy_person_only");
    expect(weather.read_mode).toBe("read_only");
    expect(weather.activation_status).toBe("inactive");
  });
});
