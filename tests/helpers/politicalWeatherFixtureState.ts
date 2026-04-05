import type { HouseDossierSummary, KnownHouseSummary, Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

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

export function createPoliticalWeatherFixtureState(): RunState {
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
    relationships: [
      { from_id: "p_liege", to_id: "p_head", allegiance: 42, respect: 38, threat: 31 },
      { from_id: "p_clergy", to_id: "p_head", allegiance: 48, respect: 46, threat: 26 },
      { from_id: "p_noble1", to_id: "p_head", allegiance: 46, respect: 43, threat: 27 },
      { from_id: "p_noble2", to_id: "p_head", allegiance: 61, respect: 54, threat: 18 }
    ],
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
