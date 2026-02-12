import { SIM_VERSION } from "./version";

export type SimVersion = typeof SIM_VERSION;

export type Sex = "M" | "F";
export type TraitKey = "stewardship" | "martial" | "diplomacy" | "discipline" | "fertility";

export type Traits = Record<TraitKey, number>; // 1..5

export interface Person {
  id: string;
  name: string;
  sex: Sex;
  age: number; // years
  alive: boolean;
  traits: Traits;
  married?: boolean;
}

export interface RelationshipEdge {
  from_id: string;
  to_id: string;
  allegiance: number; // 0..100
  respect: number; // 0..100
  threat: number; // 0..100
}

export type WarLevyDue =
  | null
  | {
      kind: "men_or_coin";
      men: number;
      coin: number;
      created_turn: number;
    };

export interface ObligationsState {
  tax_due_coin: number;
  tithe_due_bushels: number;
  arrears: { coin: number; bushels: number };
  war_levy_due: WarLevyDue;
}

export interface ConstructionState {
  improvement_id: string;
  progress: number;
  required: number;
}

export interface ManorState {
  population: number;
  farmers: number;
  builders: number;
  bushels_stored: number;
  coin: number;
  unrest: number; // 0..100
  improvements: string[];
  construction: ConstructionState | null;
  obligations: ObligationsState;
}

export interface HouseState {
  head: Person;
  spouse?: Person;
  spouse_status?: "spouse" | "widow";
  children: Person[];
  energy: { max: number; available: number };
  heir_id?: string | null;
}

export interface LocalsState {
  liege: Person;
  clergy: Person;
  nobles: Person[];
}

export interface GameOverState {
  reason: "Dispossessed" | "DeathNoHeir";
  turn_index: number;
  details?: Record<string, unknown>;
}

export interface RunState {
  version: SimVersion;
  app_version: string;
  run_seed: string;
  turn_index: number;
  manor: ManorState;
  house: HouseState;
  locals: LocalsState;
  relationships: RelationshipEdge[];
  flags: Record<string, unknown>;
  log: TurnLogEntry[];
  game_over?: GameOverState | null;
}

export type HouseSummary = Pick<HouseState, "head" | "spouse" | "spouse_status" | "children" | "energy" | "heir_id">;

/**
 * Bounded snapshot for TurnLogEntry.
 * Must NEVER include `log` or any nested history.
 * (Fix for v0.0.5 QA blocker: runaway log growth / OOM.)
 */
export interface RunSnapshot {
  turn_index: number;
  manor: ManorState;
  house: HouseSummary;
  relationships: RelationshipEdge[];
  flags: Record<string, unknown>;
  game_over?: GameOverState | null;
}

export type EventCategory =
  | "weather"
  | "economic"
  | "security"
  | "religious"
  | "political"
  | "military"
  | "personal"
  | "social"
  | "construction";

export interface EventWhy {
  weight: number;
  roll: number;
  notes: string[];
}

export interface EventDelta {
  key:
    | "bushels"
    | "coin"
    | "unrest"
    | "population"
    | "tax_due_coin"
    | "tithe_due_bushels"
    | "arrears_coin"
    | "arrears_bushels"
    | "construction_progress";
  before: number;
  after: number;
  diff: number;
}

export interface EventResult {
  id: string;
  title: string;
  category: EventCategory;
  why: EventWhy;
  effects: string[]; // plain-language
  deltas: EventDelta[];
}

export interface TurnReport {
  turn_index: number; // processed
  weather_multiplier: number;
  market: { price_per_bushel: number; sell_cap_bushels: number };
  spoilage: { rate: number; loss_bushels: number };
  production_bushels: number;
  consumption_bushels: number;
  shortage_bushels: number;
  construction: { progress_added: number; completed_improvement_id?: string | null };
  obligations: {
    tax_due_coin: number;
    tithe_due_bushels: number;
    arrears_coin: number;
    arrears_bushels: number;
    war_levy_due: WarLevyDue;
  };
  household: { births: string[]; deaths: string[]; population_delta: number };
  events: EventResult[];
  top_drivers: string[]; // top 3 explanation strings
  notes: string[]; // additional log notes
}

export interface MarriageOffer {
  house_person_id: string;
  house_label: string;
  dowry_coin_net: number;
  relationship_delta: { respect: number; allegiance: number; threat: number };
  liege_delta?: { respect: number; threat: number } | null;
  risk_tags: string[];
}

export interface MarriageWindow {
  eligible_child_ids: string[];
  offers: MarriageOffer[];
}

export type LaborDecision = { kind: "labor"; desired_farmers: number; desired_builders: number };
export type SellDecision = { kind: "sell"; sell_bushels: number };
export type ObligationsDecision = {
  kind: "pay_obligations";
  pay_coin: number;
  pay_bushels: number;
  war_levy_choice?: "coin" | "men" | "ignore";
};
export type ConstructionDecision =
  | { kind: "construction"; action: "none" }
  | { kind: "construction"; action: "start"; improvement_id: string }
  | { kind: "construction"; action: "abandon"; confirm: boolean };
export type MarriageDecision =
  | { kind: "marriage"; action: "none" }
  | { kind: "marriage"; action: "scout" }
  | { kind: "marriage"; action: "reject_all" }
  | { kind: "marriage"; action: "accept"; child_id: string; offer_index: number };

export type TurnDecisions = {
  labor: LaborDecision;
  sell: SellDecision;
  obligations: ObligationsDecision;
  construction: ConstructionDecision;
  marriage: MarriageDecision;
};

export interface TurnContext {
  preview_state: RunState;
  report: TurnReport;
  marriage_window: MarriageWindow | null;
  max_labor_shift: number;
}

export interface TurnLogEntry {
  processed_turn_index: number;
  summary: string;
  report: TurnReport;
  decisions: TurnDecisions;
  snapshot_before: RunSnapshot;
  snapshot_after: RunSnapshot;
  deltas: Record<string, number>;
}

export interface RunSummaryExport {
  seed: string;
  app_version: string;
  sim_version: SimVersion;
  turns_played: number;
  game_over_reason: string | null;
  ending_resources: { bushels: number; coin: number; unrest: number; arrears_coin: number; arrears_bushels: number };
  key_flags: string[];
}
