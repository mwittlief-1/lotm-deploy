import type {
  EvidenceEventV0,
  RunState,
  TurnContext,
  TurnDecisions,
  TurnReport,
  Person,
  HouseLogEvent,
  HouseholdRosterView,
  PhaseReceiptV0,
  PhaseResultV0,
  ProspectsLogEvent
} from "./types";
import { deepCopy, clampInt, asNonNegInt } from "./util";
import {
  TURN_YEARS,
  BUSHELS_PER_PERSON_PER_YEAR,
  maxLaborDeltaPerTurn,
} from "./constants";
import { refreshEnergy } from "./domains/court/energy";
import { normalizeState } from "./normalize";
import { IMPROVEMENTS, hasImprovement } from "../content/improvements";
import { ensurePeopleFirst } from "./peopleFirst";
import { makePhaseReceipt, makePhaseResult } from "./phases/phaseResult";
import { ensureExternalHousesSeed_v0_2_2 } from "./worldgen";
import { addCourtExcludeId, addCourtExtraId, courtConsumptionBushels_v0_2_4, ensureCourtOfficers, removeCourtExcludeId } from "./court";
import { computeTierSets } from "./tiers";
import { deriveHouseholdRoster } from "./householdView";
import {
  appliedEventEvidenceEvents,
  houseLogEvidenceEvents,
  marriageOfferEvidenceEvents,
  makeEvidenceEvent,
  noteEvidenceEvents,
  phaseLogEventsFromEvidence,
  prospectsLogEvidenceEvents
} from "./domains/ai/evidence";
import { recordBeliefEvidence } from "./domains/ai/beliefs";
import { buildHouseholdRoster } from "./domains/people/playerHousehold";
import { boundedSnapshot, computeTopDrivers } from "./domains/experience/reporting";
import { getChildren as kinChildren } from "./kinship";
import { gcExpiredReservations } from "./marriageMarket";
import { playerHouseIdOf, registryPersonFor, syncHouseRegistryCurrentHeads } from "./actors";
import {
  applyConstructionDecisionPhase,
  applyConsumptionAndShortagePhase,
  applyLaborDecisionPhase,
  applyProductionAndConstructionPhase,
  applySellDecisionPhase,
  applySpoilagePhase,
  computeWeatherMarketPhase
} from "./phases/phase_consumption";
import { applyHouseholdDemographyPhase, applyNobleDemographyPhase } from "./phases/phase_demography";
import { applyEventsPhase, applyRelationshipDriftPhase, decrementEventCooldowns, syncLocalsFromRegistryPhase } from "./phases/phase_events";
import { applyMarriageDecisionPhase, buildMarriageWindowPhase } from "./phases/phase_marriage";
import { applyDecisionObligationsPhase, applyPreviewObligationsPhase } from "./phases/phase_obligations";
import { applyProspectsDecisionPhase, buildProspectsWindowPhase } from "./phases/phase_prospects";
import { closeTurnPhase, computeAdultSuccessorId, computeHeirId, rebaseHeadRelationships, resolveSuccessionPhase, spouseIdFromKinship } from "./phases/phase_succession";

function householdChildrenForHead(state: RunState, headId: string): Person[] {
  const byPrimogeniture = (a: Person, b: Person) => {
    if (b.age !== a.age) return b.age - a.age;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  };

  return kinChildren(state as any, headId)
    .map((id) => registryPersonFor(state, id))
    .filter((p): p is Person => !!p)
    .sort(byPrimogeniture);
}

function syncPlayerHouseSummaryFromRegistry(state: RunState): void {
  const anyState: any = state as any;
  const playerHouseId = playerHouseIdOf(state);
  if (!anyState.houses || typeof anyState.houses !== "object") anyState.houses = {};
  const houseRec: any = anyState.houses[playerHouseId] && typeof anyState.houses[playerHouseId] === "object"
    ? anyState.houses[playerHouseId]
    : (anyState.houses[playerHouseId] = { id: playerHouseId });

  const headId = state.house.head?.id ?? null;
  if (!headId) return;

  const head = registryPersonFor(state, headId);
  if (head) state.house.head = head;

  const priorSpouseStatus = state.house.spouse_status;
  const spouseId = spouseIdFromKinship(state, headId);
  const spouse = spouseId ? registryPersonFor(state, spouseId) : null;
  const livingSpouse = spouse && spouse.alive ? spouse : null;
  state.house.spouse = livingSpouse ?? undefined;
  state.house.spouse_status = livingSpouse ? "spouse" : priorSpouseStatus === "widow" ? "widow" : undefined;
  state.house.head.married = Boolean(livingSpouse || state.house.spouse_status === "widow");
  if (livingSpouse) livingSpouse.married = true;

  const children = householdChildrenForHead(state, headId);
  state.house.children = children;

  const people: Record<string, any> = (anyState.people ?? {}) as any;
  const memberIds = Object.values(people)
    .filter((p: any) => p && typeof p.id === "string" && p.alive !== false && p.residence_house_id === playerHouseId)
    .map((p: any) => p.id as string)
    .sort((a, b) => a.localeCompare(b));
  if (!memberIds.includes(headId)) memberIds.unshift(headId);
  if (livingSpouse && !memberIds.includes(livingSpouse.id)) memberIds.push(livingSpouse.id);

  houseRec.id = playerHouseId;
  houseRec.head_id = headId;
  houseRec.spouse_id = livingSpouse?.id ?? null;
  houseRec.spouse_status = state.house.spouse_status ?? null;
  houseRec.child_ids = children.map((c) => c.id);
  houseRec.member_person_ids = memberIds;
  houseRec.heir_id = state.house.heir_id ?? null;
}

function noteReceipts(lines: string[]): PhaseReceiptV0[] {
  return lines.map((line) => makePhaseReceipt(line, "note"));
}

function evidenceReceipts(events: EvidenceEventV0[]): PhaseReceiptV0[] {
  return events.map((event) => makePhaseReceipt(event.detail, "note"));
}

export function proposeTurn(state: RunState): TurnContext {
  // v0.2.1 migration/sync (must accept v0.1.0-shaped saves)
  // NOTE: proposeTurn must not mutate caller state; we do this on a working copy below.
  if (state.game_over) {
    return {
      preview_state: deepCopy(state),
      report: {
        turn_index: state.turn_index,
        weather_multiplier: 1,
        market: { price_per_bushel: 0.1, sell_cap_bushels: 0 },
        spoilage: { rate: 0, loss_bushels: 0 },
        production_bushels: 0,
        consumption_bushels: 0,
        peasant_consumption_bushels: 0,
        court_consumption_bushels: 0,
        total_consumption_bushels: 0,
        shortage_bushels: 0,
        construction: { progress_added: 0, completed_improvement_id: null },
        obligations: {
          tax_due_coin: state.manor.obligations.tax_due_coin,
          tithe_due_bushels: state.manor.obligations.tithe_due_bushels,
          arrears_coin: state.manor.obligations.arrears.coin,
          arrears_bushels: state.manor.obligations.arrears.bushels,
          war_levy_due: state.manor.obligations.war_levy_due
        },
        household: { births: [], deaths: [], population_delta: 0 },
        house_log: [],
        events: [],
        top_drivers: ["Game over."],
        notes: [],
        phase_results_v0: []
      },
      marriage_window: null,
      max_labor_shift: 0,
      phase_results_v0: []
    };
  }

  const working = deepCopy(state as any) as RunState;
  ensurePeopleFirst(working);
  ensureExternalHousesSeed_v0_2_2(working);
  syncHouseRegistryCurrentHeads(working);
  // v0.2.4: deterministic court officers (idempotent; stream-isolated).
  ensureCourtOfficers(working);

  // v0.2.8 P0: GC expired marriage reservations (once per turn) before building any offer windows.
  gcExpiredReservations(working, working.turn_index);

  // v0.2.8: compute tier sets once per turn (cached; deterministic).
  const tierSets = computeTierSets(working);

  const houseLog: HouseLogEvent[] = [];
  const previewPhaseResults: PhaseResultV0[] = [];
  const preResolveSuccessionEvents: HouseLogEvent[] = [];

  // v0.2.3.2: structured delta trackers (UI support; no mechanics).
  const unrestBefore = working.manor.unrest;
  let unrestCursor = unrestBefore;
  const unrestContribs: Array<{ label: string; diff: number }> = [];

  // Track the most recent labor auto-clamp (for UX messaging).
  let laborSignalBefore: { population: number; farmers: number; builders: number } | null = null;
  let laborSignalAfter: { population: number; farmers: number; builders: number } | null = null;

  // v0.2.3.4: If labor is oversubscribed entering the turn (edited/legacy state),
  // clamp immediately *before* production/consumption math so the simulation runs on valid labor totals.
  // NOTE: This preserves determinism for valid runs (oversubscription should never occur in normal play).
  {
    const pop0 = asNonNegInt(working.manor.population);
    const f0 = asNonNegInt(working.manor.farmers);
    const b0 = asNonNegInt(working.manor.builders);
    if (f0 + b0 > pop0) {
      laborSignalBefore = { population: pop0, farmers: f0, builders: b0 };
      const overflow = f0 + b0 - pop0;
      // Deterministic clamp rule: cut builders first, then farmers (same as shortage clamp).
      const bCut = Math.min(b0, overflow);
      const b1 = asNonNegInt(b0 - bCut);
      const rem = overflow - bCut;
      const f1 = rem > 0 ? asNonNegInt(Math.max(0, f0 - rem)) : f0;
      working.manor.farmers = f1;
      working.manor.builders = b1;
      laborSignalAfter = { population: pop0, farmers: f1, builders: b1 };
    }
  }

  // 1) restore energy; compute heir
  refreshEnergy(working);
  const prevHeir = working.house.heir_id ?? null;
  const nextHeir = computeHeirId(working);
  if (nextHeir && nextHeir !== prevHeir) {
    const heirName = registryPersonFor(working, nextHeir)?.name;
    if (heirName) {
      const heirEvent: HouseLogEvent = { kind: "heir_selected", turn_index: working.turn_index, heir_name: heirName };
      houseLog.push(heirEvent);
      preResolveSuccessionEvents.push(heirEvent);
    }
  }

  // 2) macro env shift
  decrementEventCooldowns(working);
  const spoil = applySpoilagePhase(working);
  const macro = computeWeatherMarketPhase(working);

  // 3) production (+ construction progress)
  const prod = applyProductionAndConstructionPhase(working, macro.weather_multiplier);

  // 4) obligations
  const unrestBeforeObl = working.manor.unrest;
  applyPreviewObligationsPhase(working, prod.production_bushels);
  {
    const diff = working.manor.unrest - unrestBeforeObl;
    if (diff !== 0) unrestContribs.push({ label: "Arrears", diff });
    unrestCursor = working.manor.unrest;
  }
  const obligationsEvidence =
    working.manor.obligations.arrears.coin > 0 || working.manor.obligations.arrears.bushels > 0
      ? [makeEvidenceEvent({
          kind: "arrears_pressure",
          detail: "Preview obligations applied arrears pressure.",
          category: "obligations"
        })]
      : [];
  previewPhaseResults.push(makePhaseResult({
    phase: "obligations",
    receipts: [
      makePhaseReceipt(`Tax due ${working.manor.obligations.tax_due_coin} coin; tithe due ${working.manor.obligations.tithe_due_bushels} bushels.`),
      makePhaseReceipt(`Arrears coin ${working.manor.obligations.arrears.coin}; arrears bushels ${working.manor.obligations.arrears.bushels}.`)
    ],
    log_events: phaseLogEventsFromEvidence(obligationsEvidence),
    evidence_events_v0: obligationsEvidence,
    rng_keys_used: []
  }));

  // 5) relationship drift
  applyRelationshipDriftPhase(working);

  // 5.5) noble demography (Tier0/1 only; excludes the player House to avoid double-processing with householdPhase).
  applyNobleDemographyPhase(working, tierSets);

  // 6) household (births/deaths)
  const houseLogBeforeDemography = houseLog.length;
  const hh = applyHouseholdDemographyPhase(working, houseLog, {
    syncPlayerHouseSummaryFromRegistry
  });
  const demographyHouseLog = houseLog.slice(houseLogBeforeDemography);
  const demographyHouseEvidence = houseLogEvidenceEvents(demographyHouseLog);
  const demographyEvidence = [
    ...hh.births.map((birth) => makeEvidenceEvent({ kind: "birth", detail: birth, category: "household" })),
    ...hh.deaths.map((death) => makeEvidenceEvent({ kind: "death", detail: death, category: "household" })),
    ...demographyHouseEvidence
  ];
  previewPhaseResults.push(makePhaseResult({
    phase: "demography",
    receipts: [
      makePhaseReceipt(`Household births ${hh.births.length}; deaths ${hh.deaths.length}; population delta ${hh.population_delta}.`),
      ...evidenceReceipts(demographyHouseEvidence)
    ],
    log_events: phaseLogEventsFromEvidence(demographyEvidence),
    evidence_events_v0: demographyEvidence,
    rng_keys_used: ["household:mortality", "household:birth", "household:birth_family", "demography:marriage", "demography:mortality", "demography:fertility"]
  }));
  syncHouseRegistryCurrentHeads(working);

  // v0.2.3.4: Recompute heir after births/deaths so the report/roster never points at a deceased heir.
  {
    const prev = working.house.heir_id ?? null;
    const next = computeHeirId(working);
    if (next && next !== prev) {
      const heirName = registryPersonFor(working, next)?.name;
      if (heirName) {
        const heirEvent: HouseLogEvent = { kind: "heir_selected", turn_index: working.turn_index, heir_name: heirName };
        houseLog.push(heirEvent);
        preResolveSuccessionEvents.push(heirEvent);
      }
    }
  }

  // v0.2.7.1 HOTFIX: If HoH died this processed turn, resolve succession now so Turn Report/preview never shows a dead ruler.
  const houseLogBeforePreviewSuccession = houseLog.length;
  resolveSuccessionPhase(working, houseLog, undefined, {
    computeAdultSuccessorId,
    computeHeirId,
    rebaseHeadRelationships,
    syncPlayerHouseSummaryFromRegistry
  });
  const previewSuccessionEvents = [...preResolveSuccessionEvents, ...houseLog.slice(houseLogBeforePreviewSuccession)];
  const previewSuccessionEvidence = houseLogEvidenceEvents(previewSuccessionEvents);
  previewPhaseResults.push(makePhaseResult({
    phase: "succession",
    receipts: previewSuccessionEvidence.length
      ? evidenceReceipts(previewSuccessionEvidence)
      : [makePhaseReceipt(`Heir ${working.house.heir_id ?? "none"}; head ${working.house.head.id}.`)],
    log_events: phaseLogEventsFromEvidence(previewSuccessionEvidence),
    evidence_events_v0: previewSuccessionEvidence,
    rng_keys_used: []
  }));
  syncHouseRegistryCurrentHeads(working);

  // 7) court size/consumption (v0.2.4)
  const court = courtConsumptionBushels_v0_2_4(working, BUSHELS_PER_PERSON_PER_YEAR, TURN_YEARS, houseLog);

  // 8) consumption (peasants + court)
  const cons = applyConsumptionAndShortagePhase(working, court.court_consumption_bushels);
  const consumptionEvidence = [
    ...(prod.completed_improvement_id
      ? [makeEvidenceEvent({
          kind: "construction_completed",
          detail: prod.completed_improvement_id,
          category: "construction"
        })]
      : []),
    ...(cons.shortage_bushels > 0
      ? [makeEvidenceEvent({
          kind: "shortage",
          detail: `Shortage ${cons.shortage_bushels} bushels.`,
          category: "economy"
        })]
      : [])
  ];
  previewPhaseResults.push(makePhaseResult({
    phase: "consumption",
    receipts: [
      makePhaseReceipt(`Weather ${macro.weather_multiplier.toFixed(2)}; market ${macro.market.price_per_bushel.toFixed(2)} coin/bushel; sell cap ${macro.market.sell_cap_bushels}.`),
      makePhaseReceipt(`Spoilage -${spoil.loss_bushels}; production +${prod.production_bushels}; consumption -${cons.total_consumption_bushels}.`),
      ...(prod.completed_improvement_id ? [makePhaseReceipt(`Construction completed: ${prod.completed_improvement_id}.`, "note")] : []),
      ...(cons.shortage_bushels > 0 ? [makePhaseReceipt(`Shortage ${cons.shortage_bushels} bushels; population ${cons.population_delta}.`, "note")] : [])
    ],
    log_events: phaseLogEventsFromEvidence(consumptionEvidence),
    evidence_events_v0: consumptionEvidence,
    rng_keys_used: ["weather:macro", "market:macro", "household:shortage"]
  }));

  // Unrest contributor: shortage.
  {
    const diff = working.manor.unrest - unrestCursor;
    if (diff !== 0) unrestContribs.push({ label: "Shortage", diff });
    unrestCursor = working.manor.unrest;
  }

  // Labor auto-clamp (from shortage population loss).
  if (cons.labor_before && cons.labor_after) {
    laborSignalBefore = cons.labor_before;
    laborSignalAfter = cons.labor_after;
  }

  // 9) event engine (independent)
  const events = applyEventsPhase(working);
  const eventsEvidence = appliedEventEvidenceEvents(events);
  previewPhaseResults.push(makePhaseResult({
    phase: "events",
    receipts: [makePhaseReceipt(`${events.length} event${events.length === 1 ? "" : "s"} applied.`)],
    log_events: phaseLogEventsFromEvidence(eventsEvidence),
    evidence_events_v0: eventsEvidence,
    rng_keys_used: ["events:select"]
  }));

  // Unrest contributors: events.
  for (const ev of events) {
    const d = ev.deltas.find((x) => x.key === "unrest");
    if (d && d.diff !== 0) unrestContribs.push({ label: ev.title, diff: d.diff });
  }

  // Normalize/clamp state invariants.
  // Capture labor auto-clamp here as well (e.g., event-driven population loss).
  const laborBeforeNorm = {
    population: asNonNegInt(working.manor.population),
    farmers: asNonNegInt(working.manor.farmers),
    builders: asNonNegInt(working.manor.builders)
  };
  normalizeState(working);
  const laborAfterNorm = {
    population: asNonNegInt(working.manor.population),
    farmers: asNonNegInt(working.manor.farmers),
    builders: asNonNegInt(working.manor.builders)
  };
  if (laborBeforeNorm.farmers !== laborAfterNorm.farmers || laborBeforeNorm.builders !== laborAfterNorm.builders) {
    laborSignalBefore = laborBeforeNorm;
    laborSignalAfter = laborAfterNorm;
  }

  syncLocalsFromRegistryPhase(working);

  const report: TurnReport = {
    turn_index: state.turn_index,
    weather_multiplier: macro.weather_multiplier,
    market: macro.market,
    spoilage: spoil,
    production_bushels: prod.production_bushels,
    consumption_bushels: cons.consumption_bushels,
    peasant_consumption_bushels: cons.peasant_consumption_bushels,
    court_consumption_bushels: cons.court_consumption_bushels,
    total_consumption_bushels: cons.total_consumption_bushels,
    shortage_bushels: cons.shortage_bushels,
    construction: { progress_added: prod.construction_progress_added, completed_improvement_id: prod.completed_improvement_id ?? null },
    obligations: {
      tax_due_coin: working.manor.obligations.tax_due_coin,
      tithe_due_bushels: working.manor.obligations.tithe_due_bushels,
      arrears_coin: working.manor.obligations.arrears.coin,
      arrears_bushels: working.manor.obligations.arrears.bushels,
      war_levy_due: working.manor.obligations.war_levy_due
    },
    household: {
      births: hh.births,
      deaths: hh.deaths,
      births_count: hh.births.length,
      deaths_count: hh.deaths.length + asNonNegInt(cons.population_deaths),
      births_unitemized_count: 0,
      deaths_unitemized_count: asNonNegInt(cons.population_deaths),
      omissions_note: asNonNegInt(cons.population_deaths) > 0
        ? "Some shortage deaths are aggregate peasant losses and are not person-itemized."
        : undefined,
      population_delta: cons.population_delta + hh.population_delta,
      // v0.2.5: make labor-pool changes visible (runaways vs deaths).
      population_change_breakdown: {
        schema_version: "population_change_breakdown_v1",
        births: Math.max(0, hh.population_delta),
        deaths: asNonNegInt(cons.population_deaths),
        runaways: asNonNegInt(cons.population_runaways)
      }
    },
    house_log: houseLog,
    events,
    top_drivers: [],
    notes: []
  };

  report.top_drivers = computeTopDrivers(report, state, working);

  // v0.2.3.2: labor oversubscription auto-clamp signal (UI).
  if (laborSignalBefore && laborSignalAfter) {
    const assigned_before = asNonNegInt(laborSignalBefore.farmers) + asNonNegInt(laborSignalBefore.builders);
    const assigned_after = asNonNegInt(laborSignalAfter.farmers) + asNonNegInt(laborSignalAfter.builders);
    const available = asNonNegInt(laborSignalAfter.population);
    report.labor_signal = {
      schema_version: "labor_signal_v1",
      available,
      assigned_before,
      assigned_after,
      farmers_before: asNonNegInt(laborSignalBefore.farmers),
      farmers_after: asNonNegInt(laborSignalAfter.farmers),
      builders_before: asNonNegInt(laborSignalBefore.builders),
      builders_after: asNonNegInt(laborSignalAfter.builders),
      was_oversubscribed: assigned_before > available,
      auto_clamped:
        laborSignalBefore.farmers !== laborSignalAfter.farmers || laborSignalBefore.builders !== laborSignalAfter.builders
    };
  }

  // v0.2.3.2: unrest delta breakdown (contributors up/down).
  const unrestAfter = working.manor.unrest;
  report.unrest_breakdown = {
    schema_version: "unrest_breakdown_v1",
    before: unrestBefore,
    after: unrestAfter,
    delta: unrestAfter - unrestBefore,
    increased_by: unrestContribs.filter((c) => c.diff > 0).map((c) => ({ label: c.label, amount: c.diff })),
    decreased_by: unrestContribs.filter((c) => c.diff < 0).map((c) => ({ label: c.label, amount: Math.abs(c.diff) }))
  };

  // v0.2.3.2: construction option availability (built / in-progress / available).
  report.construction.options = Object.keys(IMPROVEMENTS)
    .sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
    .map((improvement_id) => {
      const isBuilt = hasImprovement(working.manor.improvements, improvement_id);
      const isActive = Boolean(working.manor.construction) && working.manor.construction?.improvement_id === improvement_id;
      const status = isBuilt ? "built" : isActive ? "active_project" : "available";
      return { improvement_id, status };
    });

  const marriageWindow = buildMarriageWindowPhase(working, tierSets);
  const marriageEvidence = marriageOfferEvidenceEvents(marriageWindow?.offers ?? []);
  previewPhaseResults.push(makePhaseResult({
    phase: "marriage",
    receipts: [makePhaseReceipt(`Marriage window eligible ${marriageWindow?.eligible_child_ids.length ?? 0}; offers ${marriageWindow?.offers.length ?? 0}.`)],
    log_events: phaseLogEventsFromEvidence(marriageEvidence),
    evidence_events_v0: marriageEvidence,
    rng_keys_used: ["marriage:offers"]
  }));

  // Prospects window + engine log (v0.2.3)
  const prospectsLog: ProspectsLogEvent[] = [];
  const prospectsWindow = buildProspectsWindowPhase(working, marriageWindow, prospectsLog, {
    computeHeirId
  });
  const prospectsEvidence = prospectsLogEvidenceEvents(prospectsLog);
  previewPhaseResults.push(makePhaseResult({
    phase: "prospects",
    receipts: [
      makePhaseReceipt(`Prospects shown ${prospectsWindow.shown_ids.length}; hidden ${prospectsWindow.hidden_ids.length}; total ${prospectsWindow.prospects.length}.`),
      ...evidenceReceipts(prospectsEvidence)
    ],
    log_events: phaseLogEventsFromEvidence(prospectsEvidence),
    evidence_events_v0: prospectsEvidence,
    rng_keys_used: ["prospects:id"]
  }));
  if (prospectsLog.length) report.prospects_log = prospectsLog;

  const maxShift = maxLaborDeltaPerTurn(working.manor.population);

  // Ensure registries remain in sync after preview simulation.
  ensurePeopleFirst(working);

  // v0.2.3.4: embed canonical household roster (schema unchanged).
  const roster = buildHouseholdRoster(working);
  report.household_roster = roster;

  // v0.2.8: derived household roster view (roles relative to current HoH; view-only).
  const derived = deriveHouseholdRoster(working as any, playerHouseIdOf(working));
  const heirId = working.house.heir_id ?? null;

  // Widow/widower badge (same rule as household_roster_v1).
  const spouse = working.house.spouse ?? null;
  let widowedPersonId: string | null = null;
  if (spouse) {
    if (working.house.head.alive && !spouse.alive) widowedPersonId = working.house.head.id;
    else if (!working.house.head.alive && spouse.alive) widowedPersonId = spouse.id;
  }

  const peoplePF: any = (working as any).people && typeof (working as any).people === "object" ? (working as any).people : {};
  const rosterView: HouseholdRosterView = {
    schema_version: "household_roster_view_v1",
    turn_index: working.turn_index,
    rows: derived.map((r: any) => {
      const badges: any[] = [];
      const p = peoplePF?.[r.person_id];
      const alive = p && typeof p === "object" && typeof p.alive === "boolean" ? p.alive : true;
      const sex = p && typeof p === "object" && (p.sex === "M" || p.sex === "F") ? p.sex : null;
      if (!alive) badges.push("deceased");
      if (alive && widowedPersonId === r.person_id && sex) badges.push(sex === "M" ? "widower" : "widow");
      if (heirId && r.person_id === heirId) badges.push("heir");
      return { person_id: r.person_id, role: r.role, relationship_label: r.relationship_label, badges };
    })
  };
  report.household_roster_view = rosterView;

  // v0.2.4: embed court roster + headcount into report for history-safe rendering.
  report.court_roster = court.court_roster;
  report.court_headcount = court.court_headcount;
  report.phase_results_v0 = previewPhaseResults;

  return {
    preview_state: working,
    report,
    marriage_window: marriageWindow,
    prospects_window: prospectsWindow,
    max_labor_shift: maxShift,
    phase_results_v0: previewPhaseResults,
    household_roster: roster,
    household_roster_view: rosterView,
    court_roster: court.court_roster
  };
}

export function createDefaultDecisions(state?: RunState): TurnDecisions {
  const farmers = state?.manor?.farmers ?? 75;
  const builders = state?.manor?.builders ?? 0;
  return {
    labor: { kind: "labor", desired_farmers: farmers, desired_builders: builders },
    sell: { kind: "sell", sell_bushels: 0 },
    obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
    construction: { kind: "construction", action: "none" },
    marriage: { kind: "marriage", action: "none" },
    prospects: { kind: "prospects", actions: [] },
  };
}

export function applyDecisions(state: RunState, decisions: TurnDecisions): RunState {
  if (state.game_over) return state;

  // Defensive People-First migration for legacy saves.
  // applyDecisions may be called on a v0.1.0-shaped RunState; migrate deterministically before proceeding.
  const anyState: any = state as any;
  const needsMigration = !(anyState && anyState.people && anyState.houses && anyState.player_house_id);
  const base: RunState = needsMigration ? (deepCopy(state as any) as RunState) : state;
  if (needsMigration) ensurePeopleFirst(base);

  const snapshotBefore = boundedSnapshot(base);

  // Defensive migration: if an older save/log entry ever contained full RunState snapshots (including nested `log`),
  // strip them down to bounded snapshots so the run can't balloon in memory.
  const cleanedPriorLog = (base.log ?? []).map((e: any) => {
    const sb: any = e.snapshot_before;
    const sa: any = e.snapshot_after;
    const cleanBefore = sb && typeof sb === "object" && "log" in sb ? boundedSnapshot(sb as any) : sb;
    const cleanAfter = sa && typeof sa === "object" && "log" in sa ? boundedSnapshot(sa as any) : sa;
    return { ...e, snapshot_before: cleanBefore, snapshot_after: cleanAfter };
  });

  const ctx = proposeTurn(base);
  let working = deepCopy(ctx.preview_state);

  const notes: string[] = [];
  const maxShift = ctx.max_labor_shift;

  const prospectsLog: ProspectsLogEvent[] = [...(ctx.report.prospects_log ?? [])];
  const resolutionPhaseResults: PhaseResultV0[] = [];
  let notesCursor = 0;
  let prospectsLogCursor = prospectsLog.length;

  // 10) apply decisions
  applyLaborDecisionPhase(working, decisions, maxShift, notes);
  const laborNotes = notes.slice(notesCursor);
  const laborEvidence = noteEvidenceEvents("labor", laborNotes);
  resolutionPhaseResults.push(makePhaseResult({
    phase: "labor",
    receipts: [
      makePhaseReceipt(`Labor desired farmers ${decisions.labor.desired_farmers}; builders ${decisions.labor.desired_builders}.`),
      ...noteReceipts(laborNotes)
    ],
    log_events: phaseLogEventsFromEvidence(laborEvidence),
    evidence_events_v0: laborEvidence,
    rng_keys_used: []
  }));
  notesCursor = notes.length;
  applySellDecisionPhase(working, ctx, decisions, notes);
  const sellNotes = notes.slice(notesCursor);
  const sellEvidence = noteEvidenceEvents("sell", sellNotes);
  resolutionPhaseResults.push(makePhaseResult({
    phase: "sell",
    receipts: [
      makePhaseReceipt(`Sell requested ${decisions.sell.sell_bushels} bushels.`),
      ...noteReceipts(sellNotes)
    ],
    log_events: phaseLogEventsFromEvidence(sellEvidence),
    evidence_events_v0: sellEvidence,
    rng_keys_used: []
  }));
  notesCursor = notes.length;
  applyConstructionDecisionPhase(working, decisions, notes);
  const constructionNotes = notes.slice(notesCursor);
  const constructionEvidence = noteEvidenceEvents("construction", constructionNotes);
  resolutionPhaseResults.push(makePhaseResult({
    phase: "construction",
    receipts: [
      makePhaseReceipt(`Construction action ${decisions.construction.action}.`),
      ...noteReceipts(constructionNotes)
    ],
    log_events: phaseLogEventsFromEvidence(constructionEvidence),
    evidence_events_v0: constructionEvidence,
    rng_keys_used: []
  }));
  notesCursor = notes.length;
  applyMarriageDecisionPhase(working, ctx, decisions, notes);
  const marriageNotes = notes.slice(notesCursor);
  const marriageResolutionEvidence = noteEvidenceEvents("marriage", marriageNotes);
  resolutionPhaseResults.push(makePhaseResult({
    phase: "marriage",
    receipts: [
      makePhaseReceipt(`Marriage action ${decisions.marriage.action}.`),
      ...noteReceipts(marriageNotes)
    ],
    log_events: phaseLogEventsFromEvidence(marriageResolutionEvidence),
    evidence_events_v0: marriageResolutionEvidence,
    rng_keys_used: []
  }));
  notesCursor = notes.length;
  applyProspectsDecisionPhase(working, ctx, decisions, prospectsLog);
  const prospectsResolutionLog = prospectsLog.slice(prospectsLogCursor);
  const prospectsResolutionEvidence = prospectsLogEvidenceEvents(prospectsResolutionLog);
  resolutionPhaseResults.push(makePhaseResult({
    phase: "prospects",
    receipts: [
      makePhaseReceipt(`Prospect decisions queued ${(decisions.prospects?.actions ?? []).length}.`),
      ...evidenceReceipts(prospectsResolutionEvidence)
    ],
    log_events: phaseLogEventsFromEvidence(prospectsResolutionEvidence),
    evidence_events_v0: prospectsResolutionEvidence,
    rng_keys_used: []
  }));
  prospectsLogCursor = prospectsLog.length;
  applyDecisionObligationsPhase(working, decisions, notes);
  const obligationsNotes = notes.slice(notesCursor);
  const obligationsResolutionEvidence = noteEvidenceEvents("obligations", obligationsNotes);
  resolutionPhaseResults.push(makePhaseResult({
    phase: "obligations",
    receipts: [
      makePhaseReceipt(
        `Obligation payments coin ${decisions.obligations.pay_coin}; bushels ${decisions.obligations.pay_bushels}; levy ${decisions.obligations.war_levy_choice ?? "ignore"}.`
      ),
      ...noteReceipts(obligationsNotes)
    ],
    log_events: phaseLogEventsFromEvidence(obligationsResolutionEvidence),
    evidence_events_v0: obligationsResolutionEvidence,
    rng_keys_used: []
  }));
  notesCursor = notes.length;

  // 11) minimal AI/world reactions handled via relationship adjustments above.

  // 12) end-of-turn checks + log
  const lifeLog: HouseLogEvent[] = [];
  // Carry over any People-First preview events (e.g., spouse death widowhood) from proposeTurn.
  for (const e of ctx.report.house_log ?? []) lifeLog.push(e);

  const closeNotesBefore = notes.length;
  const closeHouseLogBefore = lifeLog.length;
  closeTurnPhase(working, notes, lifeLog, {
    computeAdultSuccessorId,
    computeHeirId,
    rebaseHeadRelationships,
    syncPlayerHouseSummaryFromRegistry
  });
  const closeTurnNotes = notes.slice(closeNotesBefore);
  const closeTurnNoteEvidence = noteEvidenceEvents("succession", closeTurnNotes);
  const closeTurnHouseEvidence = houseLogEvidenceEvents(lifeLog.slice(closeHouseLogBefore));
  const closeTurnEvidence = [...closeTurnNoteEvidence, ...closeTurnHouseEvidence];
  resolutionPhaseResults.push(makePhaseResult({
    phase: "succession",
    receipts: [
      makePhaseReceipt("Close turn phase applied."),
      ...noteReceipts(closeTurnNotes),
      ...evidenceReceipts(closeTurnHouseEvidence)
    ],
    log_events: phaseLogEventsFromEvidence(closeTurnEvidence),
    evidence_events_v0: closeTurnEvidence,
    rng_keys_used: []
  }));

  for (const phaseResult of [...(ctx.phase_results_v0 ?? []), ...resolutionPhaseResults]) {
    recordBeliefEvidence(working, phaseResult.phase, ctx.report.turn_index, phaseResult.evidence_events_v0);
  }

  normalizeState(working);

  ensurePeopleFirst(working);

  const snapshotAfter = boundedSnapshot(working);

  // deltas for quick debug
  const deltas: Record<string, number> = {
    bushels: snapshotAfter.manor.bushels_stored - snapshotBefore.manor.bushels_stored,
    coin: snapshotAfter.manor.coin - snapshotBefore.manor.coin,
    unrest: snapshotAfter.manor.unrest - snapshotBefore.manor.unrest,
    pop: snapshotAfter.manor.population - snapshotBefore.manor.population,
    arrears_coin: snapshotAfter.manor.obligations.arrears.coin - snapshotBefore.manor.obligations.arrears.coin,
    arrears_bushels: snapshotAfter.manor.obligations.arrears.bushels - snapshotBefore.manor.obligations.arrears.bushels
  };

  const summary = `Turn ${ctx.report.turn_index} resolved. ${notes.slice(0, 2).join(" ")}`.trim();

  const orderedHouseLog = (lifeLog ?? []).map((e, i) => ({ e, i })).sort((a, b) => {
    if (a.e.turn_index !== b.e.turn_index) return a.i - b.i;
    const w = (k: HouseLogEvent["kind"]) => (k === "succession" ? 0 : k === "widowed" ? 1 : 2);
    const da = w(a.e.kind);
    const db = w(b.e.kind);
    if (da !== db) return da - db;
    return a.i - b.i;
  }).map((x) => x.e);

  working.log = [...cleanedPriorLog, {
    processed_turn_index: ctx.report.turn_index,
    summary,
    // Order rule: if succession + heir_selected occur same turn, show Succession first.
    report: {
      ...ctx.report,
      house_log: orderedHouseLog,
      notes: [...ctx.report.notes, ...notes],
      prospects_log: prospectsLog.length ? prospectsLog : undefined,
      resolution_phase_results_v0: resolutionPhaseResults
    },
    decisions,
    snapshot_before: snapshotBefore,
    snapshot_after: snapshotAfter,
    deltas
  }];

  return working;
}
