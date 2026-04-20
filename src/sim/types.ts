import { SIM_VERSION } from "./version";
import type { FiscalReceiptSnapshotV1 } from "./domains/economy/receipts";
import type { FiscalPaymentModeV1 } from "./domains/economy/schema";
import type { ManorDetailViewV1, MapViewSnapshotV1, WorldTopologySnapshotV1 } from "./domains/world/types";

export type SimVersion = typeof SIM_VERSION;

export type Sex = "M" | "F";
export type TraitKey = "stewardship" | "martial" | "diplomacy" | "discipline" | "fertility";

export type Traits = Record<TraitKey, number>; // 1..5

export interface Person {
  id: string;
  name: string;
  sex: Sex;
  age: number; // years
  birth_year?: number;
  alive: boolean;
  traits: Traits;
  married?: boolean;
  // v0.2.9 demography spacing lock
  last_birth_year?: number;

  // v0.2.8: optional origin House for clergy/outsiders (does not change current household/House membership)
  origin_house_id?: string | null;
  residence_house_id?: string | null;
  house_id?: string | null;
}


// --- Graph Actors & Institutions (v0.2.8) ---

export type ActorKind = "person" | "house" | "institution";

export type ActorId =
  | { kind: "person"; id: string }
  | { kind: "house"; id: string }
  | { kind: "institution"; id: string };

export type InstitutionType = "bishopric" | "abbey" | "parish" | "town_corporation"; // town reserved (no mechanics yet)

export interface InstitutionCommon {
  id: string;
  type: InstitutionType;
  name?: string;
  seat_hex?: string;
  county_id?: string;
}

export interface BishopricInstitution extends InstitutionCommon {
  type: "bishopric";
}

export interface AbbeyInstitution extends InstitutionCommon {
  type: "abbey";
}

export interface TownCorporationInstitution extends InstitutionCommon {
  type: "town_corporation";
}

export interface ParishInstitution extends InstitutionCommon {
  type: "parish";
  patron_actor_id: ActorId;
  priest_person_id?: string | null;
}

export type Institution = BishopricInstitution | AbbeyInstitution | TownCorporationInstitution | ParishInstitution;

// --- Service Records (v0.2.8; structure only) ---
// A person can serve in a court/institution without changing House membership.
export interface ServiceRecord {
  id: string;
  person_id: string;
  serving_actor_id: ActorId;
  role: string;
  start_turn_index?: number | null;
  end_turn_index?: number | null;
}

export interface RelationshipEdge {
  from_id: string;
  to_id: string;
  allegiance: number; // 0..100
  respect: number; // 0..100
  threat: number; // 0..100
}

export type KinshipEdge =
  | { kind: "parent_of"; parent_id: string; child_id: string }
  | { kind: "spouse_of"; a_id: string; b_id: string };

export type HouseLogEventKind = "widowed" | "succession" | "heir_selected";

export interface HouseLogEvent {
  kind: HouseLogEventKind;
  turn_index: number;
  // For templated outcome lines (UX binding): keep only the minimal IDs/names.
  spouse_name?: string;
  // v0.2.3.2+: widowed is a household-status transition; provide both survivor + deceased.
  // (UI can choose which copy line to render.)
  survivor_name?: string;
  survivor_id?: string;
  survivor_sex?: Sex;
  deceased_name?: string;
  deceased_id?: string;
  deceased_age?: number;
  heir_name?: string;
  new_ruler_name?: string;
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
  meat_stores?: number;
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

export type RunStateSchemaVersion = "run_state_schema_v0.3.1";
export type BoundedRegistryManifestSchemaVersion = "bounded_registry_manifest_v1";
export type BoundedRegistryManifestEntryKind = "edge_list" | "pointer" | "record";
export type EconomyRegistryPlaceholderSchemaVersion = "economy_registry_placeholder_v1";
export type ManorEconomySurfaceSchemaVersion = "manor_economy_surface_v1";
export type PortfolioRegistryPlaceholderSchemaVersion = "portfolio_registry_placeholder_v1";

export interface BoundedRegistryManifestEntry {
  registry_id: string;
  state_path: string;
  entry_kind: BoundedRegistryManifestEntryKind;
  migration_tracked: boolean;
  registry_schema_version: string | null;
  legacy_paths?: string[];
}

export interface BoundedRegistryManifest {
  schema_version: BoundedRegistryManifestSchemaVersion;
  entries: BoundedRegistryManifestEntry[];
}

export interface EconomyRegistryPlaceholderV1 {
  schema_version: EconomyRegistryPlaceholderSchemaVersion;
  surface_id: "manor_economy_surface";
  surface_schema_version: ManorEconomySurfaceSchemaVersion;
  tracked_state_paths: string[];
}

export interface PortfolioRegistryPlaceholderV1 {
  schema_version: PortfolioRegistryPlaceholderSchemaVersion;
  positions: string[];
}

export type KnownHouseRelevanceReason = "player_house" | "blood_tie" | "marriage_tie";
export type KnownHouseRelevanceTier = "tier0" | "tier1";
export type HouseDossierKinshipSummary = "none" | "blood_tie" | "marriage_tie" | "blood_and_marriage_tie";
export type HouseDossierRelationshipBand = "unknown" | "favorable" | "steady" | "wary" | "hostile";
export type HouseDossierHouseholdScope = "head_only" | "household_seeded";
export type HouseDossierKnownness = "known_house" | "prospect_house" | "known_house_and_prospect";
export type HouseDossierKnownnessSource = "relevance" | "marriage_offer" | "prospect";
export type HouseDossierLedgerBand = "distressed" | "tight" | "stable" | "flush" | "unknown";
export type HouseDossierLedgerTrend = "declining" | "flat" | "rising" | "unknown";
export type HouseDossierHoldingsBand = "single_holding" | "minor_cluster" | "broad_domain";

export interface HouseDossierRelationshipSummary {
  allegiance: number;
  respect: number;
  threat: number;
  favor_score: number;
  standing_band: HouseDossierRelationshipBand;
}

export interface RelationshipTurnMovementRowV1 {
  row_id: string;
  counterparty_actor_id: string;
  counterparty_label: string;
  counterparty_person_id: string | null;
  direction_label: string;
  cause_summary: string;
  allegiance_delta: number;
  respect_delta: number;
  threat_delta: number;
  magnitude: number;
  before_standing_band: HouseDossierRelationshipBand;
  after_standing_band: HouseDossierRelationshipBand;
}

export interface HouseDossierHoldingsFootprint {
  holdings_count: number;
  holdings_band: HouseDossierHoldingsBand;
  anchor_manor_id: string | null;
  known_manor_ids?: string[];
  source_kind: "player_portfolio" | "house_seed";
}

export interface KnownHouseSummary {
  house_id: string;
  house_name: string;
  tier: string;
  relevance_tier: KnownHouseRelevanceTier;
  relevance_reasons: KnownHouseRelevanceReason[];
  head_id: string | null;
  head_name: string;
  head_age: number | null;
  head_status: "Alive" | "Deceased" | "Unknown";
  head_short_id: string | null;
  heir_indicator: "has_male_heir" | "no_male_heir" | "heiress_possible";
  has_male_heir: boolean;
  heiress_possible: boolean;
  relationship: { allegiance: number; respect: number; threat: number } | null;
}

export interface HouseDossierSummary {
  schema_version: "house_dossier_summary_v2";
  house_id: string;
  house_name: string;
  tier: string;
  relevance_tier: KnownHouseRelevanceTier;
  relevance_reasons: KnownHouseRelevanceReason[];
  knownness: HouseDossierKnownness;
  knownness_sources: HouseDossierKnownnessSource[];
  kinship_summary: HouseDossierKinshipSummary;
  kinship_tags: KnownHouseRelevanceReason[];
  relationship_summary: HouseDossierRelationshipSummary | null;
  relationship_turn_movement_count: number;
  relationship_turn_movement_rows: RelationshipTurnMovementRowV1[];
  household_scope: HouseDossierHouseholdScope;
  household_member_count: number;
  living_member_count: number;
  child_count: number;
  has_male_heir: boolean;
  heiress_possible: boolean;
  holdings_footprint: HouseDossierHoldingsFootprint;
  ledger_band: HouseDossierLedgerBand;
  ledger_trend: HouseDossierLedgerTrend;
}

export interface BoundedHouseDossierSummary {
  schema_version: "house_dossier_summary_v2";
  house_id: string;
  knownness: HouseDossierKnownness;
  kinship_summary: HouseDossierKinshipSummary;
  kinship_tags: KnownHouseRelevanceReason[];
  relationship_summary: HouseDossierRelationshipSummary | null;
  relationship_turn_movement_count: number;
  relationship_turn_movement_rows: RelationshipTurnMovementRowV1[];
  holdings_footprint: HouseDossierHoldingsFootprint;
  ledger_band: HouseDossierLedgerBand;
  ledger_trend: HouseDossierLedgerTrend;
}

export interface PersonCardRelativeRef {
  person_id: string;
  person_name: string;
  house_id: string | null;
  house_name: string | null;
  age: number | null;
  sex: Sex | null;
  alive: boolean;
  married_out: boolean;
}

export interface PersonCardResidenceBinding {
  residence_manor_id: string | null;
  selector_contexts: string[];
  source_kind: string | null;
  source_ref_id: string | null;
  travel_cost_distance: number | null;
  route_hop_distance: number | null;
  distance_band: "near" | "far" | null;
}

export interface PersonCardFamilyProjection {
  family_person_ids: string[];
  parents: PersonCardRelativeRef[];
  spouse: PersonCardRelativeRef | null;
  siblings: PersonCardRelativeRef[];
  children: PersonCardRelativeRef[];
  kinship_tags: string[];
  married_out: boolean;
}

export interface PersonCardSuccessionProjection {
  line_position: number | null;
  adult_line_position: number | null;
  claimant_position: number | null;
  claimant_adult_position: number | null;
  current_heir_id: string | null;
  adult_successor_id: string | null;
  claim_window_open: boolean;
  blocked_by_current_heir: boolean | null;
  current_heir: boolean;
  adult_eligible: boolean;
  player_house_relevance_reasons: string[];
}

export interface PersonCardOfficeAssignment {
  seat_id: string | null;
  title: string;
  scope: string | null;
  owner_actor_id: string | null;
  holder_kind: string | null;
  payment_basis: string | null;
  active_service_record_id: string | null;
}

export interface PersonCardServiceTimelineEntry {
  record_id: string;
  title: string;
  role_key: string;
  source_kind: "court_service_record" | "service_record";
  serve_at_actor_id: string | null;
  institution_assignment_id: string | null;
  payment_basis: string | null;
  start_turn_index: number | null;
  end_turn_index: number | null;
  active: boolean;
}

export type PersonCardHouseHoldingsStatus = "player_anchor_known" | "coarse_house_only" | "absent_no_house";
export type PersonCardPersonalHoldingsStatus = "not_exposed_on_this_seam" | "absent_no_house";

export interface PersonCardLandsHeldProjection {
  house_id: string | null;
  house_name: string | null;
  holdings_count: number;
  holdings_band: HouseDossierHoldingsBand;
  anchor_manor_id: string | null;
  known_manor_ids: string[];
  house_holdings_status: PersonCardHouseHoldingsStatus;
  personal_holdings_status: PersonCardPersonalHoldingsStatus;
}

export interface PersonCardView {
  schema_version: "person_card_view_v1";
  person_id: string;
  person_name: string;
  short_id: string | null;
  sex: Sex | null;
  age: number | null;
  alive: boolean;
  current_house_id: string | null;
  current_house_name: string | null;
  birth_house_id: string | null;
  birth_house_name: string | null;
  court_member: boolean;
  court_role_labels: string[];
  known_house_relevance_tier: KnownHouseRelevanceTier | null;
  known_house_relevance_reasons: KnownHouseRelevanceReason[];
  married_out: boolean;
  residence_binding: PersonCardResidenceBinding;
  family_projection: PersonCardFamilyProjection;
  succession_projection: PersonCardSuccessionProjection;
  office_assignments: PersonCardOfficeAssignment[];
  service_timeline: {
    active_record_ids: string[];
    entries: PersonCardServiceTimelineEntry[];
  };
  lands_held_projection: PersonCardLandsHeldProjection;
}

export interface PersonCardRegistry {
  schema_version: "person_card_registry_v1";
  person_ids: string[];
  entries_by_person_id: Record<string, PersonCardView>;
}

export interface MarriageWorkflowRelativeRefV1 {
  person_id: string;
  person_name: string;
  house_id: string | null;
  house_name: string | null;
}

export interface MarriageWorkflowPersonRefV1 {
  person_id: string;
  person_name: string;
  house_id: string | null;
  house_name: string | null;
  parent_refs: MarriageWorkflowRelativeRefV1[];
}

export interface MarriageWorkflowEffectSummaryV1 {
  coin_delta: number;
  relationship_delta: {
    allegiance: number;
    respect: number;
    threat: number;
  };
  liege_delta: {
    respect: number;
    threat: number;
  } | null;
  risk_tags: string[];
}

export interface MarriageWorkflowInboundOfferV1 {
  schema_version: "marriage_workflow_inbound_offer_v1";
  entry_id: string;
  offer_index: number;
  offer_key: string | null;
  state: "received";
  candidate: MarriageWorkflowPersonRefV1;
  expected_effects: MarriageWorkflowEffectSummaryV1;
}

export interface MarriageWorkflowOutboundScoutingV1 {
  schema_version: "marriage_workflow_outbound_scouting_v1";
  scouting_status: "available" | "empty";
  shown_candidate_count: number;
  held_out_candidate_count: number;
  total_candidates_considered: number;
  featured_candidate: MarriageWorkflowPersonRefV1 | null;
}

export interface MarriageWorkflowLatestOfferV1 {
  schema_version: "marriage_workflow_latest_offer_v1";
  offer_key: string;
  state: "generated" | "pending" | "accepted" | "rejected" | "expired" | "withdrawn";
  candidate: MarriageWorkflowPersonRefV1;
  expected_effects: MarriageWorkflowEffectSummaryV1;
}

export interface MarriageWorkflowSubjectViewV1 {
  schema_version: "marriage_workflow_subject_v1";
  subject: MarriageWorkflowPersonRefV1;
  inbound_offer_count: number;
  inbound_offers: MarriageWorkflowInboundOfferV1[];
  outbound_scouting: MarriageWorkflowOutboundScoutingV1 | null;
  latest_outbound_offer: MarriageWorkflowLatestOfferV1 | null;
}

export interface MarriageWorkflowViewV1 {
  schema_version: "marriage_workflow_view_v1";
  turn_index: number;
  subject_person_ids: string[];
  subjects_by_person_id: Record<string, MarriageWorkflowSubjectViewV1>;
}

export type HouseholdPresenceKindV1 = "resident" | "guest" | "retainer" | "outsider";

export interface HouseholdPresenceEntryV1 {
  schema_version: "household_presence_entry_v1";
  person_id: string;
  person_name: string;
  presence_kind: HouseholdPresenceKindV1;
  roster_role: CourtRosterRole | "local_power";
  local_role: "liege" | "clergy" | "noble" | null;
  provisioning_class: string | null;
  lodging_level: string | null;
  stipend_basis: string | null;
  residence_manor_id: string | null;
  court_role_labels: string[];
  active_seat_ids: string[];
  active_service_record_ids: string[];
  presence_summary: string;
  turnover_note: string | null;
  succession_note: string | null;
}

export interface HouseholdPresenceViewV1 {
  schema_version: "household_presence_view_v1";
  generated_at_turn_index: number;
  entry_order: string[];
  entries_by_person_id: Record<string, HouseholdPresenceEntryV1>;
  recent_succession: { turn_index: number; new_ruler_name: string } | null;
}

export interface RunState {
  version: SimVersion;
  app_version: string;
  run_seed: string;
  state_schema_version?: RunStateSchemaVersion;
  bounded_registry_manifest?: BoundedRegistryManifest;
  turn_index: number;
  manor: ManorState;
  house: HouseState;
  locals: LocalsState;
  relationships: RelationshipEdge[];
  // v0.2.1 People-First registries (may be absent in legacy saves; migrate deterministically in proposeTurn/applyDecisions)
  people?: Record<string, Person>;
  houses?: Record<string, unknown>;
  player_house_id?: string;
  kinship_edges?: KinshipEdge[];
  kinship?: KinshipEdge[];
  // v0.2.8 graph registries (additive; wired later)
  institutions?: Record<string, Institution>;
  service_records?: ServiceRecord[];
  beliefs?: BeliefRegistryV0;
  economy?: EconomyRegistryPlaceholderV1;
  economy_fiscal_receipts?: FiscalReceiptSnapshotV1[];
  portfolio?: PortfolioRegistryPlaceholderV1;
  known_houses?: KnownHouseSummary[];
  house_dossiers?: HouseDossierSummary[];

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
  state_schema_version: RunStateSchemaVersion;
  bounded_registry_manifest: BoundedRegistryManifest;
  turn_index: number;
  manor: ManorState;
  house: HouseSummary;
  relationships: RelationshipEdge[];
  // v0.2.1 People-First (optional; included for migration/debug; must remain bounded)
  people?: Record<string, Person>;
  houses?: Record<string, unknown>;
  player_house_id?: string;
  kinship_edges?: KinshipEdge[];
  kinship?: KinshipEdge[];
  // v0.2.8 graph registries (bounded snapshot; debug + UI scaffolding)
  institutions?: Record<string, Institution>;
  service_records?: ServiceRecord[];
  beliefs?: BeliefRegistryV0;
  economy?: EconomyRegistryPlaceholderV1;
  economy_obligations_view?: { schema_version: string } | null;
  portfolio?: PortfolioRegistryPlaceholderV1;
  world_topology_view?: WorldTopologySnapshotV1;
  map_view_snapshot?: MapViewSnapshotV1;
  manor_detail_view?: ManorDetailViewV1;
  known_houses?: KnownHouseSummary[];
  house_dossiers?: HouseDossierSummary[];
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

export interface MaintenanceLaborPressureEntryV1 {
  maintenance_key: string;
  label: string;
  source_kind: string;
  labor_required: number;
}

export interface MaintenanceLaborPressureV1 {
  schema_version: "maintenance_labor_pressure_v1";
  ordering_rule: "builders_first";
  delegated: boolean;
  delegated_multiplier_pct: number;
  source_keys: string[];
  total_sources: number;
  planned_population: number;
  planned_farmers: number;
  planned_builders: number;
  allocatable_before: number;
  required_labor_before_delegation: number;
  required_labor_after_delegation: number;
  applied_drag: number;
  unmet_labor: number;
  allocatable_after: number;
  effective_farmers: number;
  effective_builders: number;
  entries: MaintenanceLaborPressureEntryV1[];
}

export type HeadlineCauseMetricV1 = "food" | "coin" | "unrest" | "relationships" | "household" | "project";
export type HeadlineCauseSourceV1 = "decision" | "event" | "system_pressure" | "prospect";
export type TurnExplanationWalkdownMetricV1 = "food" | "coin" | "unrest";
export type TurnExplanationWalkdownDirectionV1 = "start" | "inflow" | "outflow" | "net" | "ending";
export type TurnExplanationSurfaceIdV1 = "turn_report" | "diff_ledger" | "manor_state" | "explain_changes";
export type RelationshipChangeScopeV1 = "person" | "house" | "institution" | "unknown";

export interface HeadlineCauseV1 {
  id: string;
  metric: HeadlineCauseMetricV1;
  source: HeadlineCauseSourceV1;
  magnitude: number;
  summary: string;
  detail: string;
}

export interface TurnExplanationWalkdownRowV1 {
  id: string;
  label: string;
  direction: TurnExplanationWalkdownDirectionV1;
  amount: number;
  running_total?: number;
  summary: string;
}

export interface TurnExplanationWalkdownV1 {
  schema_version: "turn_explanation_walkdown_v1";
  metric: TurnExplanationWalkdownMetricV1;
  unit_label: string;
  start_amount: number;
  end_amount: number;
  reconciles: boolean;
  rows: TurnExplanationWalkdownRowV1[];
}

export interface TurnExplanationSurfaceRoleV1 {
  surface: TurnExplanationSurfaceIdV1;
  role_label: string;
  helper: string;
}

export interface TurnExplanationV1 {
  schema_version: "turn_explanation_v1";
  food_walkdown: TurnExplanationWalkdownV1;
  coin_walkdown: TurnExplanationWalkdownV1;
  unrest_walkdown: TurnExplanationWalkdownV1;
  headline_causes: HeadlineCauseV1[];
  surface_roles: TurnExplanationSurfaceRoleV1[];
}

export interface RelationshipChangeLogEntryV1 {
  id: string;
  turn_index: number;
  scope: RelationshipChangeScopeV1;
  from_id: string;
  to_id: string;
  from_label: string;
  to_label: string;
  cause_key: string;
  cause_summary: string;
  delta: {
    allegiance: number;
    respect: number;
    threat: number;
  };
}

export interface RelationshipChangeLogV1 {
  schema_version: "relationship_change_log_v1";
  turn_index: number;
  entries: RelationshipChangeLogEntryV1[];
}

export interface RunProvenanceV1 {
  schema_version: "run_provenance_v1";
  ui_app_version: string;
  run_app_version: string;
  build_info_app_version: string | null;
  sim_version: SimVersion;
  code_fingerprint: string | null;
  build_time_utc: string | null;
  created_at_utc: string | null;
  version_match: boolean;
  notes: string | null;
}

export interface TurnReport {
  turn_index: number; // processed
  weather_multiplier: number;
  market: { price_per_bushel: number; sell_cap_bushels: number };
  spoilage: { rate: number; loss_bushels: number };
  production_bushels: number;
  consumption_bushels: number;
  // v0.2.4: consumption breakdown (3y). All values are in bushels and reconcile:
  //   total = peasant + court
  peasant_consumption_bushels: number;
  court_consumption_bushels: number;
  total_consumption_bushels: number;
  shortage_bushels: number;
  construction: {
    progress_added: number;
    completed_improvement_id?: string | null;
    // v0.2.3.2+: per-option availability signal (UI can disable/remove built improvements).
    options?: Array<{ improvement_id: string; status: "available" | "built" | "active_project" }>;
  };
  obligations: {
    tax_due_coin: number;
    tithe_due_bushels: number;
    arrears_coin: number;
    arrears_bushels: number;
    war_levy_due: WarLevyDue;
  };
  household: {
    births: string[];
    deaths: string[];
    // v0.2.9 reporting integrity
    births_count?: number;
    deaths_count?: number;
    births_unitemized_count?: number;
    deaths_unitemized_count?: number;
    omissions_note?: string;
    population_delta: number;
    // v0.2.5: population (labor pool) change visibility.
    // Positive counts; net delta = births - deaths - runaways.
    population_change_breakdown?: {
      schema_version: "population_change_breakdown_v1";
      births: number;
      deaths: number;
      runaways: number;
    };
  };
  house_log: HouseLogEvent[];
  events: EventResult[];
  headline_causes?: HeadlineCauseV1[];
  turn_explanation_v1?: TurnExplanationV1;
  relationship_change_log_v1?: RelationshipChangeLogV1;
  top_drivers: string[]; // top 3 explanation strings
  notes: string[]; // additional log notes
  // v0.2.3.2+: structured deltas for UI clarity (no mechanics).
  unrest_breakdown?: {
    schema_version: "unrest_breakdown_v1";
    before: number;
    after: number;
    delta: number;
    increased_by: Array<{ label: string; amount: number }>;
    decreased_by: Array<{ label: string; amount: number }>;
  };
  labor_signal?: {
    schema_version: "labor_signal_v1";
    available: number;
    assigned_before: number;
    assigned_after: number;
    farmers_before: number;
    farmers_after: number;
    builders_before: number;
    builders_after: number;
    was_oversubscribed: boolean;
    auto_clamped: boolean;
  };
  maintenance_labor_pressure?: MaintenanceLaborPressureV1;
  // v0.2.3.4+: roster snapshot embedded for history-safe rendering (dedupe + death/heir badges).
  household_roster?: HouseholdRoster;
  // v0.2.8: derived household roles (rebased on succession; view-only; does not change household_roster schema).
  household_roster_view?: HouseholdRosterView;
  // v0.2.4: court roster snapshot embedded for history-safe rendering (officers + married-in spouses).
  court_roster?: CourtRoster;
  court_headcount?: number;
  prospects_log?: ProspectsLogEvent[];
  phase_results_v0?: PhaseResultV0[];
  resolution_phase_results_v0?: PhaseResultV0[];
}

// v0.2.3.2+: a UI-ready household roster (deduped; heir is a badge).
export type HouseholdRosterRole = "head" | "spouse" | "child";
export type HouseholdRosterBadge = "heir" | "widow" | "widower" | "widowed" | "deceased";

export interface HouseholdRosterRow {
  person_id: string;
  role: HouseholdRosterRole;
  badges: HouseholdRosterBadge[];
}

export interface HouseholdRoster {
  schema_version: "household_roster_v1";
  turn_index: number;
  rows: HouseholdRosterRow[];
}


// v0.2.8: derived household roster view (roles relative to current HoH; additive).
export type HouseholdRosterViewRole = "head" | "spouse" | "child" | "sibling" | "parent";

export interface HouseholdRosterViewRow {
  person_id: string;
  role: HouseholdRosterViewRole;
  relationship_label?: string;
  badges: HouseholdRosterBadge[];
}

export interface HouseholdRosterView {
  schema_version: "household_roster_view_v1";
  turn_index: number;
  rows: HouseholdRosterViewRow[];
}

// --- Court (v0.2.4) ---

export type CourtOfficerRole = "steward" | "clerk" | "marshal";
export type CourtRosterRole = "head" | "spouse" | "child" | "officer" | "married_in_spouse" | "resident";

export interface CourtRosterRow {
  person_id: string;
  role: CourtRosterRole;
  // Officer role key (UI maps to title labels per UX contract).
  officer_role: CourtOfficerRole | null;
  badges: HouseholdRosterBadge[];
}

export interface CourtRoster {
  schema_version: "court_roster_v1";
  turn_index: number;
  headcount_alive: number;
  rows: CourtRosterRow[];
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


// --- Prospects (v0.2.3) ---

export type ProspectType = "marriage" | "grant" | "inheritance_claim";
export type ProspectUncertainty = "known" | "likely" | "possible";
export type ProspectAction = "accept" | "reject";

export type ProspectRequirementKind = "respect_min" | "allegiance_min" | "threat_max" | "coin_min" | "no_arrears" | "custom";
export type ProspectRequirement = { kind: ProspectRequirementKind; value: number | string | boolean; text: string };

export type ProspectCosts = { coin?: number; energy?: number; bushels?: number };

export type RelationshipDeltaScope = "person" | "house";
export type RelationshipDelta = {
  scope: RelationshipDeltaScope;
  from_id: string;
  to_id: string;
  allegiance_delta: number;
  respect_delta: number;
  threat_delta: number;
};

export type ProspectEffects = {
  coin_delta?: number;
  relationship_deltas?: RelationshipDelta[];
  flags_set?: string[];
};

export type Prospect = {
  id: string;
  type: ProspectType;
  from_house_id: string;
  to_house_id: string;
  subject_person_id: string | null;
  // v0.2.4: when present, identifies the spouse that joins the court on acceptance.
  spouse_person_id?: string | null;
  summary: string;
  requirements: ProspectRequirement[];
  costs: ProspectCosts;
  predicted_effects: ProspectEffects;
  uncertainty: ProspectUncertainty;
  expires_turn: number;
  actions: ProspectAction[];
};

export type ProspectsWindow = {
  schema_version: "prospects_window_v1";
  turn_index: number;
  generated_at_turn_index: number;
  prospects: Prospect[];
  shown_ids: string[];
  hidden_ids: string[];
};

export type ProspectsLogEvent =
  | {
      kind: "prospect_generated";
      turn_index: number;
      type: ProspectType;
      from_house_id: string;
      to_house_id: string;
      subject_person_id: string | null;
      prospect_id: string;
      prospect: Prospect;
    }
  | {
      kind: "prospects_window_built";
      turn_index: number;
      shown_ids: string[];
      hidden_ids: string[];
    }
  | {
      kind: "prospect_accepted" | "prospect_rejected" | "prospect_expired";
      turn_index: number;
      type: ProspectType;
      from_house_id: string;
      to_house_id: string;
      subject_person_id: string | null;
      prospect_id: string;
      effects_applied: ProspectEffects;
    };

export type ProspectsDecisionAction = { prospect_id: string; action: ProspectAction };
export type ProspectsDecision = { kind: "prospects"; actions: ProspectsDecisionAction[] };

export type PhaseNameV0 =
  | "consumption"
  | "demography"
  | "events"
  | "obligations"
  | "marriage"
  | "prospects"
  | "succession"
  | "labor"
  | "sell"
  | "construction";

export type PhaseReceiptKindV0 = "summary" | "note";

export interface PhaseReceiptV0 {
  kind: PhaseReceiptKindV0;
  line: string;
}

export interface PhaseLogEventV0 {
  kind: string;
  detail: string;
}

export type EvidenceConfidenceV0 = "known" | "likely" | "possible";

export type EvidenceCategoryV0 =
  | EventCategory
  | "construction"
  | "court"
  | "economy"
  | "events"
  | "household"
  | "labor"
  | "marriage"
  | "obligations"
  | "prospects"
  | "succession";

export interface EvidenceEventV0 {
  kind: string;
  detail: string;
  category: EvidenceCategoryV0;
  confidence: EvidenceConfidenceV0;
  subject_ids?: string[];
}

export interface BeliefObservationV0 {
  subject_id: string;
  phase: PhaseNameV0;
  turn_index: number;
  kind: string;
  detail: string;
  category: EvidenceCategoryV0;
  confidence: EvidenceConfidenceV0;
}

export interface BeliefRegistryV0 {
  schema_version: "belief_registry_v0";
  by_subject: Record<string, BeliefObservationV0[]>;
}

export interface PhaseResultV0 {
  phase: PhaseNameV0;
  receipts: PhaseReceiptV0[];
  fiscal_receipts_v1?: FiscalReceiptSnapshotV1[];
  log_events: PhaseLogEventV0[];
  evidence_events_v0: EvidenceEventV0[];
  rng_keys_used: string[];
  patch?: null;
}

export type LaborDecision = { kind: "labor"; desired_farmers: number; desired_builders: number };
export type SellDecision = { kind: "sell"; sell_bushels: number };
export type ObligationsGesturePaymentMode = FiscalPaymentModeV1 | "none";
export interface ObligationsGestureDecision {
  amount: number;
  payment_mode: ObligationsGesturePaymentMode;
}
export interface ObligationsGestureSet {
  gift_liege: ObligationsGestureDecision;
  offering_church: ObligationsGestureDecision;
}
export type ObligationsDecision = {
  kind: "pay_obligations";
  pay_coin: number;
  pay_bushels: number;
  war_levy_choice?: "coin" | "men" | "ignore";
  gestures?: ObligationsGestureSet;
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

  prospects?: ProspectsDecision;
};

export interface TurnContext {
  preview_state: RunState;
  report: TurnReport;
  marriage_window: MarriageWindow | null;
  max_labor_shift: number;
  prospects_window?: ProspectsWindow | null;
  phase_results_v0?: PhaseResultV0[];
  // v0.2.3.2+: deduped roster view for UI.
  household_roster?: HouseholdRoster;
  // v0.2.8: derived household roles view for UI/debug.
  household_roster_view?: HouseholdRosterView;
  // v0.2.4: court roster view for UI.
  court_roster?: CourtRoster;
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

export interface RunProvenanceV1 {
  schema_version: "run_provenance_v1";
  ui_app_version: string;
  run_app_version: string;
  build_info_app_version: string | null;
  sim_version: SimVersion;
  code_fingerprint: string | null;
  build_time_utc: string | null;
  created_at_utc: string | null;
  version_match: boolean;
  notes: string | null;
}

export interface RunSummaryExport {
  seed: string;
  app_version: string;
  sim_version: SimVersion;
  state_schema_version: RunStateSchemaVersion;
  bounded_registry_manifest: BoundedRegistryManifest;
  run_provenance_v1: RunProvenanceV1;
  turns_played: number;
  game_over_reason: string | null;
  ending_resources: { bushels: number; coin: number; unrest: number; arrears_coin: number; arrears_bushels: number };
  key_flags: string[];
}
