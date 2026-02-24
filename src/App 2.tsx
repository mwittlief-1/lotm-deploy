import React, { useEffect, useMemo, useState } from "react";
import { APP_VERSION } from "./version";
import { createNewRun, proposeTurn, applyDecisions } from "./sim";
import type { GameOverState, RunState, TurnDecisions } from "./sim/types";
import { buildRunSummary } from "./sim/exports";
import { IMPROVEMENT_IDS, IMPROVEMENTS } from "./content/improvements";
import {
  BUILD_RATE_PER_BUILDER_PER_TURN,
  BUILDER_EXTRA_BUSHELS_PER_YEAR,
  BUSHELS_PER_PERSON_PER_YEAR,
  TURN_YEARS,
  UNREST_ARREARS_PENALTY
} from "./sim/constants";

type Screen = "new" | "play" | "log";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtSigned(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

function fmtMult(mult: number): string {
  const m = typeof mult === "number" && Number.isFinite(mult) ? mult : 1;
  return `×${m.toFixed(2)}`;
}


function Tip({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      style={{
        cursor: "help",
        marginLeft: 6,
        opacity: 0.75,
        userSelect: "none",
        border: "1px solid #bbb",
        borderRadius: 999,
        padding: "0px 6px",
        fontSize: 12
      }}
    >
      ⓘ
    </span>
  );
}

function splitWhyNotes(notes: string[]): { player: string[]; debug: string[] } {
  const player: string[] = [];
  const debug: string[] = [];
  for (const n of notes) {
    if (n.startsWith("Selected from") || n.startsWith("Weight≈")) debug.push(n);
    else player.push(n);
  }
  return { player, debug };
}

// v0.2.1 binding copy (docs/ux/v0.2.1_copy.md). Keep People-First strings centralized.
const COPY = {
  household: "Household",
  heirLabel: "Heir:",
  spouseLabel: "Spouse:",
  childrenLabel: "Children:",
  none: "None",
  lastSuccessionLabel: "Last succession:",
  lastSuccessionNone: "Last succession: None recorded",
  showHouseholdDetails: "Show household details",
  hideHouseholdDetails: "Hide household details",
  family: "Family",
  houseLog: "House Log",
  showDetails: "Show details",
  hideDetails: "Hide details",
  heirBadge: "Heir",
  marriedBadge: "Married",
  widow: "Widow",
  widower: "Widower",
  widowed: "Widowed",
  deceasedBadge: "Deceased",
  unnamedRuler: "Unnamed ruler",

  // v0.2.2 binding copy (docs/ux/v0.2.2_copy.md)
  knownHouses: "Known Houses",
  knownHousesEmpty: "No other houses known yet.",
  housePrefix: (houseName: string) => `House ${houseName}`,
  tierLabel: "Tier:",
  headLabel: "Head:",
  heirIndicator_hasMaleHeir: "Has male heir",
  heirIndicator_noMaleHeir: "No male heir",
  heirIndicator_heiressPossible: "Heiress possible",
  tooltipTier: "Rank in the realm. Higher tiers hold more power and land.",
  tooltipHeirIndicator: "Succession stability can shape future marriage and claim prospects.",
  tooltipAllegiance: "Willingness to support you over time.",
  tooltipRespect: "Perceived competence and legitimacy.",
  tooltipThreat: "Willingness to oppose or undermine you.",
  // Obligations timing labels
  obligationsDueEntering: "Due entering turn",
  obligationsAccrued: "Accrued this turn",
  obligationsArrears: "Arrears (carried forward)",
  obligationsTotal: "Total obligations",
  obligationsHelper: "Unpaid obligations become arrears and can increase unrest and relationship risk.",

  // v0.2.3.2 patch addendum: Unrest breakdown
  unrestBreakdownTitle: "Unrest change this turn",
  unrestBreakdownIncreasedBy: "Increased by",
  unrestBreakdownDecreasedBy: "Decreased by",
  unrestBreakdownNone: "No breakdown available.",
  // Labor timing helper text + delta cap validation
  laborTimingProduction: "Labor changes affect next turn’s production.",
  laborTimingBuilders: "Builders contribute to construction progress this turn.",
  laborDeltaCapError: (max: number, requested: number) =>
    `Labor change limit exceeded. Max ${max} this turn; requested ${requested}.`,
  laborDeltaCapClarifier: "Labor change limit applies to total changes across roles.",

  // v0.2.3.x addendum: Labor oversubscription warning
  laborOversubscribedTitle: "Labor oversubscribed",
  laborOversubscribedBody: (assigned: number, available: number) => `Assigned: ${assigned}. Available: ${available}.`,
  laborOversubscribedHelper: "Reduce assignments to match available workers.",
  // House Log templates
  logTitle_widowed: "Widowed",
  logOutcome_widowed: (spouseName: string) => `${spouseName} has died.`,
  logDetails_widowed: "Your household must adapt to the loss.",
  logTitle_heir_selected: "Heir selected",
  logOutcome_heir_selected: (heirName: string) => `${heirName} is now your heir.`,
  logTitle_succession: "Succession",
  logOutcome_succession: (newRulerName: string) => `${newRulerName} assumes rule.`,
  logDetails_succession_heir: (heirName: string) => `Heir: ${heirName}`,
  noNewHouseLogThisTurn: "No new house log entries this turn.",
  noHouseLogYet: "No house log entries yet.",

  // v0.2.3 binding copy (docs/ux/v0.2.3_copy.md)
  prospects: "Prospects",
  prospectsHelper: "Time-limited opportunities from your network.",
  prospectsEmpty_noneThisTurn: "No prospects this turn.",
  prospectsEmpty_noneShown: "No prospects shown this turn.",
  prospectsEmpty_noneShownHelper:
    "Some opportunities are not currently relevant or actionable. You may learn of more as your network changes.",
  prospectsEmpty_noneAvailableYet: "No prospects available yet.",
  prospectsHiddenTooltip:
    "Some opportunities are not currently relevant or actionable. You may learn of more as your network changes.",
  prospectsShownHiddenSummary: (shown_count: number, total_count: number, hidden_count: number) =>
    `Showing ${shown_count} of ${total_count}. Hidden: ${hidden_count}.`,

  prospectType_marriage: "Marriage",
  prospectType_grant: "Grant",
  prospectType_inheritance_claim: "Inheritance claim",
  prospectFromToLine: (from_house_name: string) => `House ${from_house_name} → Your House`,
  prospectSubjectLabel: "Subject:",
  prospectRequirementsLabel: "Requirements",
  prospectCostsLabel: "Costs",
  prospectEffectsLabel: "Expected effects",
  prospectConfidenceLabel: "Confidence:",
  prospectConfidence_known: "Known",
  prospectConfidence_likely: "Likely",
  prospectConfidence_possible: "Possible",
  prospectExpiresThisTurn: "Expires this turn.",
  prospectExpiresEndOfTurn: (turn_index: number) => `Expires end of Turn ${turn_index}.`,
  prospectAccept: "Accept",
  prospectReject: "Reject",

  prospectTooltip_requirements: "Conditions that must be true to accept this prospect.",
  prospectTooltip_costs: "Resources spent if you accept.",
  prospectTooltip_confidence: "How certain the outcome is.",
  prospectTooltip_expiry: "After expiry, this opportunity will no longer be actionable.",

  prospectAcceptConfirmTitle: "Accept prospect?",
  prospectAcceptConfirmBody_withCosts: "This will apply the listed costs. Continue?",
  prospectAcceptConfirmBody_noCosts: "Accept this prospect?",
  prospectAcceptConfirmBody_marriage_noCosts: "Accept this marriage proposal?",
  prospectAcceptConfirmBody_grant_noCosts: "Accept this grant offer?",
  prospectAcceptConfirmBody_marriage_dowry: (signedCoin: string) => `Dowry: ${signedCoin}. Continue?`,
  prospectRejectConfirmTitle: "Reject prospect?",
  prospectRejectConfirmBody: "This opportunity will be declined. Continue?",

  // v0.2.3.2 patch addendum: type-specific confirmations + acknowledgements
  prospectAcceptConfirmTitle_marriage: "Accept marriage proposal?",
  prospectAcceptConfirmTitle_grant: "Accept grant offer?",
  prospectAcceptConfirmTitle_inheritance_claim: "Accept inheritance claim?",
  prospectAcceptConfirmBody_inheritance_claim: "This will record the claim. Continue?",
  prospectToastAccepted_marriage: "Marriage accepted.",
  prospectToastAccepted_grant: "Grant accepted.",
  prospectToastAccepted_inheritance_claim: "Claim recorded.",
  prospectToastRejected_marriage: "Marriage offer declined.",
  prospectToastRejected_grant: "Grant offer declined.",
  prospectToastRejected_inheritance_claim: "Claim declined.",
  prospectDecisionRecorded: "Decision recorded.",
  prospectDecisionBadgeAccepted: "Accepted",
  prospectDecisionBadgeRejected: "Rejected",

  // v0.2.3.x addendum: Grant helper + conditional reject note
  prospectGrantHelperLine: "Support from your liege to ease burdens this turn.",
  prospectGrantRejectNote: "Declining may reduce your standing.",

  // v0.2.3.x addendum: Immediate accept/reject confirmations
  prospectToastAccepted: (prospectType: string, short_effect_summary: string) =>
    `Accepted: ${prospectType}. ${short_effect_summary}`,
  prospectToastDeclined: (prospectType: string) => `Declined: ${prospectType}.`,
  prospectToastStandingMayDecrease: "Standing may decrease.",
  prospectToastEffect_arrangementRecorded: "Arrangement recorded.",
  prospectToastEffect_claimRecorded: "Claim recorded.",

  prospectErr_requirementsNotMet: "Cannot accept. Requirements not met.",
  prospectErr_insufficientResources: "Cannot accept. Insufficient resources.",
  prospectErr_alreadyDecided: "Already decided.",
  prospectErr_expired: "This prospect has expired.",
  prospectErr_actionUnavailable: "Action unavailable.",

  prospectExpiredBadge: "Expired",
  prospectExpiredAtEndOfTurn: (turn_index: number) => `Expired at end of Turn ${turn_index}.`,
  prospectExpiredHint: "No longer actionable.",
  prospectExpiredThisTurnMessage: "A prospect expired this turn. See Details for the record.",

  prospectsLogTitle: "Prospects log",
  prospectsLogShown: (shown_count: number, ids?: string[]) =>
    `Shown: ${shown_count}${ids && ids.length ? ` (${ids.join(", ")})` : ""}`,
  prospectsLogHidden: (hidden_count: number, ids?: string[]) =>
    `Hidden: ${hidden_count}${ids && ids.length ? ` (${ids.join(", ")})` : ""}`,

  prospectLog_generated: (type: string, summary: string) => `Prospect generated: ${type} — ${summary}`,
  prospectLog_windowBuilt: (shown_count: number, hidden_count: number) =>
    `Prospects window built. Shown: ${shown_count}. Hidden: ${hidden_count}.`,
  prospectLog_accepted: (type: string, summary: string) => `Prospect accepted: ${type} — ${summary}`,
  prospectLog_rejected: (type: string, summary: string) => `Prospect rejected: ${type} — ${summary}`,
  prospectLog_expired: (type: string, summary: string) => `Prospect expired: ${type} — ${summary}`,


  // v0.2.4 binding copy (docs/ux/v0.2.4_copy.md)
  courtSizeLabel: "Court Size",
  tooltipCourtSize: "Court Size — Number of people in your household and court supported by your stores.",
  courtConsumptionLabel: "Court Consumption (3y)",
  courtConsumptionHelper: "Court Consumption (3y) — Food used by your household and officers over the next 3 years.",
  peasantConsumptionLabel: "Peasant Consumption (3y)",
  peasantConsumptionHelper: "Peasant Consumption (3y) — Food used by the manor population over the next 3 years.",
  consumptionReconcileNote: "Both draw from the same Food Stores. Totals reconcile in Food Balance.",
  courtEatsSameStores: "Your court eats from the same stores as the manor.",

  // Court roster role labels (exact)
  courtRoleSteward: "Steward",
  courtRoleClerk: "Clerk",
  courtRoleMarshal: "Marshal",

  // Household relationship type labels
  relationship_son: "Son",
  relationship_daughter: "Daughter",
  relationship_spouse: "Spouse",
  relationship_officer: "Officer",
  relationship_kinsman: "Kinsman",
  relationship_kinswoman: "Kinswoman",
  relationship_kin: "Kin",

  // Marriage confirmation toast (post-accept)
  marriageToast_line1: (child_name: string) => `Marriage arranged. ${child_name} is now married.`,
  marriageToast_line2_withSpouse: (spouse_name: string) => `${spouse_name} joins your court. Court size increased.`,
  marriageToast_spouseJoinsCourt: (spouse_name: string) => `${spouse_name} joins your court.`,
  marriageToast_courtSizeIncreased: "Court size increased.",
  marriageToast_childLeavesCourt: (child_name: string) => `${child_name} leaves your court.`,
  marriageToast_courtSizeDecreased: "Court size decreased.",
  marriageToast_line2_childLeaves: (child_name: string) => `${child_name} leaves your court. Court size decreased.`,

  // Turn Summary top block
  turnSummary_last3Years: "Last 3 years",
  turnSummary_nowChoose: "Now choose",

  // v0.2.7 binding copy (docs/ux/v0.2.7_copy.md)
  diffLedgerTitle: "Diff Ledger",
  diffLedgerHelper: "Biggest changes from the last 3 years, with a one-line why.",
  diffLedgerWhyLabel: "Why:",
  diffLedgerMultipleCauses: "Multiple causes this turn.",
  // v0.2.7.1 hotfix: surface weather shocks + relation drift attribution
  weatherHarmedHarvest: (mult_text: string) => `Weather harmed harvest (${mult_text})`,
  diffLedgerWhy_relations_drift: "Relationship drift.",

  diffLedgerLine_food: (food_delta_signed: string, food_stores: number) => `Food: ${food_delta_signed} bushels · Stores: ${food_stores}`,
  diffLedgerLine_coin: (coin_delta_signed: string) => `Coin: ${coin_delta_signed}`,
  diffLedgerLine_population: (pop_delta_signed: string) => `Population: ${pop_delta_signed}`,
  diffLedgerLine_unrest: (unrest_delta_signed: string) => `Unrest: ${unrest_delta_signed}`,
  diffLedgerLine_relations: (target_name: string, a_delta: string, r_delta: string, t_delta: string) =>
    `Relations (${target_name}): A ${a_delta} / R ${r_delta} / T ${t_delta}`,
  sourceTag_decision: "decision",
  sourceTag_event: "event",
  sourceTag_systemPressure: "system_pressure",
  sourceTag_prospect: "prospect",

  councilAgendaTitle: "Council Agenda",
  councilAgendaHelper: "Three priorities for this turn.",
  agenda_labor_title: "Labor needs attention",
  agenda_labor_context: "Assignments exceed available workers.",
  agenda_food_title: "Food balance is worsening",
  agenda_food_context: "Stores may fall if trends continue.",
  agenda_obligations_title: "Obligations are pressing",
  agenda_obligations_context: "Payments are due entering this turn.",
  agenda_unrest_title: "Unrest is rising",
  agenda_unrest_context: "Recent pressures increased unrest.",
  agenda_prospect_title: "Opportunity expires soon",
  agenda_prospect_context: (turn_index: number) => `A prospect expires end of Turn ${turn_index}.`,
  agenda_succession_title: "Succession needs attention",
  agenda_succession_context: "Heir status changed this turn.",
  // Routine fillers (TA v0.2.7 review; UX copy TBD)

  cta_reviewLabor: "Review labor",
  cta_viewFoodDetails: "View food details",
  cta_reviewObligations: "Review obligations",
  cta_viewUnrestDetails: "View unrest details",
  cta_viewProspects: "View prospects",
  cta_viewHousehold: "View household",
  cta_viewEvents: "View events",
  cta_openDetails: "Open details",

  // v0.2.5: Population change reasons (Turn Summary)
  populationChange_deaths: "Deaths",
  populationChange_runaways: "Runaways",

  // v0.2.3.2 patch addendum: End Turn feedback
  turnResolvedToast: (turn_index: number) => `Turn ${turn_index} resolved.`
} as const;

type PersonLike = {
  id: string;
  name: string;
  age?: number;
  short_id?: string;
  alive?: boolean;
  sex?: "M" | "F";
  married?: boolean;
};

function formatAge(age: number | undefined): string | null {
  if (typeof age !== "number") return null;
  return `Age ${age}`;
}

function shortIdFromId(id: string | undefined): string | null {
  if (typeof id !== "string") return null;
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return null;
  if (cleaned.length <= 4) return cleaned;
  return cleaned.slice(-4);
}

function formatPersonName(p: { name?: string; age?: number; id?: string; short_id?: string } | null | undefined): string {
  const name = typeof p?.name === "string" ? p.name.trim() : "";
  if (!name) return COPY.unnamedRuler;
  if (typeof p?.age === "number") return `${name} (Age ${p.age})`;
  const sid = typeof (p as any)?.short_id === "string" ? String((p as any).short_id).trim() : "";
  const derived = sid || shortIdFromId(typeof p?.id === "string" ? p.id : undefined);
  if (derived) return `${name} · ${derived}`;
  return name;
}

function formatNameParts(name: unknown, age: unknown, short_id: unknown, fallbackId: unknown): { displayName: string; ageText: string | null } {
  const nm = typeof name === "string" ? name.trim() : String(name ?? "").trim();
  const ageNum = typeof age === "number" ? age : null;
  const sid = typeof short_id === "string" ? short_id.trim() : "";
  const fid = typeof fallbackId === "string" ? fallbackId : undefined;

  if (!nm) return { displayName: "", ageText: null };
  if (ageNum !== null) return { displayName: nm, ageText: `Age ${ageNum}` };

  const derived = sid || shortIdFromId(fid);
  if (derived) return { displayName: `${nm} · ${derived}`, ageText: null };
  return { displayName: nm, ageText: null };
}

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: 8,
        padding: "1px 8px",
        border: "1px solid #bbb",
        borderRadius: 999,
        fontSize: 12,
        opacity: 0.85
      }}
    >
      {text}
    </span>
  );
}

function getAllHouseLogEntries(state: RunState, currentTurnLog: any[] = []): any[] {
  const entries: any[] = [];
  // Include current preview first (these aren't committed yet)
  for (const e of currentTurnLog) entries.push(e);
  // Then committed history
  for (const le of state.log ?? []) {
    const arr = (le as any)?.report?.house_log ?? [];
    if (Array.isArray(arr)) for (const e of arr) entries.push(e);
  }
  // Newest first by turn index (stable fallback)
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ta = typeof a.e?.turn_index === "number" ? a.e.turn_index : -1;
      const tb = typeof b.e?.turn_index === "number" ? b.e.turn_index : -1;
      if (tb !== ta) return tb - ta;
      return b.i - a.i;
    })
    .map((x) => x.e);
}

function findLastSuccession(state: RunState): { turn_index: number; new_ruler_name: string } | null {
  for (let i = (state.log ?? []).length - 1; i >= 0; i--) {
    const le: any = (state.log ?? [])[i];
    const arr: any[] = le?.report?.house_log ?? [];
    if (!Array.isArray(arr)) continue;
    for (let j = arr.length - 1; j >= 0; j--) {
      const e = arr[j];
      if (e?.kind === "succession" && typeof e?.turn_index === "number" && typeof e?.new_ruler_name === "string") {
        return { turn_index: e.turn_index, new_ruler_name: e.new_ruler_name };
      }
    }
  }
  return null;
}

function getPlayerHousehold(state: RunState): {
  head: PersonLike | null;
  spouse: PersonLike | null;
  spouse_status: string | null;
  children: PersonLike[];
  heir_id: string | null;
} {
  // v0.1.0 shape (current)
  const legacy = state.house;

  // v0.2.1+ shape (registries): state.people + state.houses + state.player_house_id
  // (We use `any` to stay forward-compatible without changing sim/types in this UI-only patch.)
  const s: any = state as any;
  if (s && s.player_house_id && s.houses && s.people) {
    const house = s.houses?.[s.player_house_id];
    const people = s.people;
    const head = house?.head ? house.head : house?.head_id ? people?.[house.head_id] : null;
    const spouse = house?.spouse ? house.spouse : house?.spouse_id ? people?.[house.spouse_id] : null;

    let children: PersonLike[] = [];
    if (Array.isArray(house?.children)) children = house.children;
    else if (Array.isArray(house?.child_ids)) children = house.child_ids.map((id: string) => people?.[id]).filter(Boolean);

    const spouse_status = house?.spouse_status ?? null;
    const heir_id = house?.heir_id ?? null;

    return {
      head: head ?? null,
      spouse: spouse ?? null,
      spouse_status,
      children,
      heir_id
    };
  }

  return {
    head: legacy.head,
    spouse: legacy.spouse ?? null,
    spouse_status: legacy.spouse_status ?? null,
    children: legacy.children ?? [],
    heir_id: legacy.heir_id ?? null
  };
}

function findLastNote(state: RunState, predicate: (note: string) => boolean): { turn_index: number; note: string } | null {
  const log = state.log ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    const entry: any = log[i];
    const turnIndex = typeof entry?.processed_turn_index === "number" ? entry.processed_turn_index : null;
    const notes: string[] = entry?.report?.notes ?? [];
    for (let j = notes.length - 1; j >= 0; j--) {
      const n = notes[j];
      if (typeof n === "string" && predicate(n)) {
        return turnIndex !== null ? { turn_index: turnIndex, note: n } : { turn_index: i, note: n };
      }
    }
  }
  return null;
}

const GAME_OVER_REASON_COPY: Record<GameOverState["reason"], string> = {
  Dispossessed: "Dispossessed (Unrest ≥ 100 at end of turn)",
  DeathNoHeir: "Death with no valid heir (game over)"
};

type ProspectDecisionAction = { prospect_id: string; action: "accept" | "reject" };
type ProspectsDecision = { kind: "prospects"; actions: ProspectDecisionAction[] };
type DecisionsState = TurnDecisions & { prospects: ProspectsDecision };

const defaultDecisions: DecisionsState = {
  labor: { kind: "labor", desired_farmers: 28, desired_builders: 0 },
  sell: { kind: "sell", sell_bushels: 0 },
  obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
  construction: { kind: "construction", action: "none" },
  marriage: { kind: "marriage", action: "none" },
  prospects: { kind: "prospects", actions: [] }
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("new");
  const [seed, setSeed] = useState<string>(() => `run_${Math.random().toString(36).slice(2, 10)}`);
  const [state, setState] = useState<RunState | null>(null);
  const [decisions, setDecisions] = useState<DecisionsState>(defaultDecisions);
  const [showHouseholdDetails, setShowHouseholdDetails] = useState<boolean>(false);
  const [showAllKnownHouses, setShowAllKnownHouses] = useState<boolean>(false);

  const [toast, setToast] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const autoObDefaultsKeyRef = React.useRef<string>("");


  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const ctx = useMemo(() => (state ? proposeTurn(state) : null), [state]);

  // v0.2.7.1 hotfix: default obligation payments to due entering the turn (bounded by available stores).
  useEffect(() => {
    if (screen !== "play") return;
    if (!state || !ctx || state.game_over) return;

    const key = `${state.run_seed}|${ctx.report.turn_index}`;
    if (autoObDefaultsKeyRef.current === key) return;
    autoObDefaultsKeyRef.current = key;

    const dueCoinRaw: any = (ctx.preview_state as any)?.manor?.obligations?.tax_due_coin;
    const dueBushelsRaw: any = (ctx.preview_state as any)?.manor?.obligations?.tithe_due_bushels;
    const availCoinRaw: any = (ctx.preview_state as any)?.manor?.coin;
    const availBushelsRaw: any = (ctx.preview_state as any)?.manor?.bushels_stored;

    const dueCoin = typeof dueCoinRaw === "number" && Number.isFinite(dueCoinRaw) ? Math.max(0, Math.trunc(dueCoinRaw)) : 0;
    const dueBushels = typeof dueBushelsRaw === "number" && Number.isFinite(dueBushelsRaw) ? Math.max(0, Math.trunc(dueBushelsRaw)) : 0;
    const availCoin = typeof availCoinRaw === "number" && Number.isFinite(availCoinRaw) ? Math.max(0, Math.trunc(availCoinRaw)) : 0;
    const availBushels = typeof availBushelsRaw === "number" && Number.isFinite(availBushelsRaw) ? Math.max(0, Math.trunc(availBushelsRaw)) : 0;

    const nextPayCoin = Math.min(dueCoin, availCoin);
    const nextPayBushels = Math.min(dueBushels, availBushels);

    setDecisions((d) => ({
      ...d,
      obligations: { ...d.obligations, pay_coin: nextPayCoin, pay_bushels: nextPayBushels }
    }));
  }, [screen, state?.run_seed, state?.game_over, ctx?.report.turn_index]);



  // Hotfix v0.2.3.1: keep all hooks unconditional across screens.
  // These memos must run even when state/ctx are null to avoid hooks order violations.
  const prospectLogLines: Array<{ turn_index: number; line: string }> = useMemo(() => {
    if (!state || !ctx) return [];
    const lines: Array<{ turn_index: number; line: string }> = [];

    const reports: Array<{ turn_index: number; report: any }> = [
      ...((state.log ?? []).map((t: any) => ({
        turn_index: typeof t?.processed_turn_index === "number" ? t.processed_turn_index : t.turn_index,
        report: t.report
      })) as any),
      { turn_index: ctx.report.turn_index, report: ctx.report }
    ];

    // Build prospect_id → summary lookup from prospect_generated events.
    const summaryById = new Map<string, string>();
    for (const { report } of reports) {
      const evs: any[] | undefined = (report as any)?.prospects_log;
      if (!Array.isArray(evs)) continue;
      for (const ev of evs) {
        if (ev && ev.kind === "prospect_generated" && typeof ev.prospect_id === "string" && ev.prospect && typeof ev.prospect === "object") {
          const s = (ev.prospect as any).summary;
          if (typeof s === "string") summaryById.set(ev.prospect_id, s);
        }
      }
    }

    function fmt(ev: any): string | null {
      if (!ev || typeof ev !== "object") return null;
      const k = ev.kind;
      if (k === "prospect_generated") {
        const s = typeof ev.prospect?.summary === "string" ? ev.prospect.summary : summaryById.get(ev.prospect_id) ?? ev.type;
        return COPY.prospectLog_generated(ev.type, s);
      }
      if (k === "prospects_window_built") {
        const shown = Array.isArray(ev.shown_ids) ? ev.shown_ids.length : 0;
        const hidden = Array.isArray(ev.hidden_ids) ? ev.hidden_ids.length : 0;
        return COPY.prospectLog_windowBuilt(shown, hidden);
      }
      if (k === "prospect_accepted") {
        const s = summaryById.get(ev.prospect_id) ?? ev.type;
        return COPY.prospectLog_accepted(ev.type, s);
      }
      if (k === "prospect_rejected") {
        const s = summaryById.get(ev.prospect_id) ?? ev.type;
        return COPY.prospectLog_rejected(ev.type, s);
      }
      if (k === "prospect_expired") {
        const s = summaryById.get(ev.prospect_id) ?? ev.type;
        return COPY.prospectLog_expired(ev.type, s);
      }
      return null;
    }

    const seen = new Set<string>();
    const push = (turn_index: number, line: string) => {
      const key = `${turn_index}|${line}`;
      if (seen.has(key)) return;
      seen.add(key);
      lines.push({ turn_index, line });
    };

    for (const { turn_index, report } of reports) {
      const evs: any[] | undefined = (report as any)?.prospects_log;
      if (!Array.isArray(evs)) continue;
      for (const ev of evs) {
        const line = fmt(ev);
        if (line) push(turn_index, line);
      }
    }

    lines.sort((a, b) => a.turn_index - b.turn_index);
    return lines.slice(-24);
  }, [state, ctx]);

  const hasProspectExpiredThisTurn: boolean = useMemo(() => {
    const evs: any[] | undefined = (ctx as any)?.report?.prospects_log;
    if (!Array.isArray(evs)) return false;
    return evs.some((ev) => ev && ev.kind === "prospect_expired");
  }, [ctx]);

  function newRun() {
    const s = createNewRun(seed.trim() || `run_${Date.now()}`);
    setState(s);
    setDecisions({
      ...defaultDecisions,
      labor: { kind: "labor", desired_farmers: s.manor.farmers, desired_builders: s.manor.builders }
    });
    setScreen("play");
    setShowHouseholdDetails(false);
  }

  function advanceTurn() {
    if (!state) return;
    const resolvedTurnIndex = state.turn_index;
    const next = applyDecisions(state, decisions);
    setState(next);
    setShowHouseholdDetails(false);
    setToast({ kind: "ok", message: COPY.turnResolvedToast(resolvedTurnIndex) });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!next.game_over) {
      setDecisions((d) => ({
        ...d,
        labor: { kind: "labor", desired_farmers: next.manor.farmers, desired_builders: next.manor.builders },
        construction: { kind: "construction", action: "none" },
        marriage: { kind: "marriage", action: "none" },
        prospects: { kind: "prospects", actions: [] }
      }));
    }
  }

  let content: React.ReactNode = null;

  if (screen === "new") {
    content = (
      <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 900 }}>
        <h1>Lords of the Manor — MVP ({APP_VERSION})</h1>
        <p>Deterministic, seeded prototype. Turn = {TURN_YEARS} years.</p>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label>Seed:</label>
          <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ width: 360 }} />
          <button onClick={() => setSeed(`run_${Date.now()}`)}>Generate</button>
          <button onClick={newRun}>New Run</button>
        </div>

        <p style={{ marginTop: 12, opacity: 0.8 }}>
          Note: Same seed + same decisions ⇒ identical results (no Math.random in sim).
        </p>
      </div>
    );
  } else if (screen === "log") {
    if (!state) {
      content = (
        <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 1100 }}>
          <h2>Loading…</h2>
        </div>
      );
    } else {
      content = (
      <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 1100 }}>
        <h2>Run Log</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScreen("play")}>Back</button>
          <button onClick={() => downloadJson(`run_export_${state.run_seed}.json`, state)}>Export Full Run JSON</button>
          <button onClick={() => downloadJson(`run_summary_${state.run_seed}.json`, buildRunSummary(state))}>Export Run Summary</button>
        </div>

        <p style={{ opacity: 0.8 }}>
          {state.log.length} turns logged. Game over: {state.game_over ? state.game_over.reason : "no"}.
        </p>

        <pre style={{ background: "#111", color: "#eee", padding: 12, overflow: "auto", maxHeight: 600 }}>
          {JSON.stringify(
            state.log.map((t) => ({
              turn: t.processed_turn_index,
              summary: t.summary,
              top_drivers: t.report.top_drivers,
              events: t.report.events.map((e) => ({
                id: e.id,
                title: e.title,
                why: e.why.notes,
                effects: e.effects,
                deltas: e.deltas
              }))
            })),
            null,
            2
          )}
        </pre>
      </div>
      );
    }
  } else {
    if (!state || !ctx) {
      content = (
        <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 1100 }}>
          <h2>Loading…</h2>
        </div>
      );
    } else {


      // play screen
      const m = ctx.preview_state.manor;
      const ob = ctx.preview_state.manor.obligations;
      const mw = ctx.marriage_window;

      // v0.2.8 UI (presentation-only): Eligible Maidens (Local) read-only list.
      // Snapshot field must be provided by sim; if absent, UI renders "(Not available in this build)".
      const eligibleMaidensLocalRaw: any =
        (ctx as any)?.eligible_maidens_local ??
        (ctx as any)?.eligibleMaidensLocal ??
        (ctx as any)?.marriage_market?.eligible_maidens_local ??
        (ctx as any)?.marriage_market?.eligibleMaidensLocal ??
        (mw as any)?.eligible_maidens_local ??
        (mw as any)?.eligibleMaidensLocal ??
        (ctx.report as any)?.eligible_maidens_local ??
        (ctx.report as any)?.eligibleMaidensLocal ??
        null;

      const hhView = getPlayerHousehold(ctx.preview_state);
      const lastSuccession = findLastSuccession(state);

      const beforeM = state.manor;

      const deltaPop = m.population - beforeM.population;
      const deltaBushels = m.bushels_stored - beforeM.bushels_stored;
      const deltaCoin = m.coin - beforeM.coin;
      const deltaUnrest = m.unrest - beforeM.unrest;

      // v0.2.5: Population change breakdown (deaths vs runaways) for Turn Summary.
      type PopChangeLine = { label: string; amount: number };

      function parsePopulationChangeBreakdown(report: any): PopChangeLine[] | null {
        const raw: any =
          report?.population_change_breakdown ??
          report?.population_change ??
          report?.population_delta_breakdown ??
          report?.population_change_reasons ??
          report?.populationBreakdown ??
          report?.population_breakdown ??
          null;

        if (!raw || (typeof raw !== "object" && !Array.isArray(raw))) return null;

        const lines: PopChangeLine[] = [];

        function add(label: string, amtRaw: any) {
          const amtNum = typeof amtRaw === "number" && Number.isFinite(amtRaw) ? Math.trunc(amtRaw) : null;
          if (!label || amtNum === null || amtNum === 0) return;
          lines.push({ label, amount: Math.abs(amtNum) });
        }

        const normalizeKey = (k: string): string => String(k || "").toLowerCase().replace(/[^a-z]/g, "");

        function labelForKey(keyRaw: any): string {
          const k = typeof keyRaw === "string" ? keyRaw : String(keyRaw ?? "");
          const nk = normalizeKey(k);
          if (nk === "deaths" || nk === "death" || nk === "died" || nk === "dead" || nk === "mortality") return COPY.populationChange_deaths;
          if (nk === "runaways" || nk === "runaway" || nk === "fled" || nk === "flee" || nk === "deserted" || nk === "ranaway")
            return COPY.populationChange_runaways;
          const cleaned = k.replace(/_/g, " ").trim();
          return cleaned ? cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1) : k;
        }

        if (Array.isArray(raw)) {
          for (const it of raw) {
            if (!it || typeof it !== "object") continue;
            const key = (it as any).kind ?? (it as any).cause ?? (it as any).reason ?? (it as any).label ?? (it as any).code;
            const amt = (it as any).count ?? (it as any).amount ?? (it as any).delta ?? (it as any).value;
            if (key != null) add(labelForKey(key), amt);
          }
        } else {
          const obj: any =
            (raw as any).breakdown && typeof (raw as any).breakdown === "object" ? (raw as any).breakdown : raw;
          if (obj && typeof obj === "object") {
            for (const [k, v] of Object.entries(obj)) {
              if (typeof v === "number" && Number.isFinite(v) && v !== 0) add(labelForKey(k), v);
            }
          }
        }

        if (!lines.length) return null;

        // Stable ordering: deaths/runaways first, then largest → smallest.
        const rank = (label: string): number => {
          if (label === COPY.populationChange_deaths) return 1;
          if (label === COPY.populationChange_runaways) return 2;
          return 9;
        };
        lines.sort((a, b) => rank(a.label) - rank(b.label) || b.amount - a.amount || a.label.localeCompare(b.label));
        return lines;
      }

      const popChangeLines = parsePopulationChangeBreakdown(ctx.report as any);
      const popChangeSummary = popChangeLines ? popChangeLines.map((l) => `${l.label} ${l.amount}`).join(", ") : null;

      // v0.2.3.2: Unrest delta breakdown (data-driven; UI renders if available)
      type UnrestLine = { label: string; amount: number };

      function parseUnrestBreakdown(raw: any): { increased: UnrestLine[]; decreased: UnrestLine[] } | null {
        if (!raw || typeof raw !== "object") return null;

        const increased: UnrestLine[] = [];
        const decreased: UnrestLine[] = [];

        function pushLine(labelRaw: any, amtRaw: any, signed: boolean) {
          const label = typeof labelRaw === "string" ? labelRaw : typeof labelRaw === "number" ? String(labelRaw) : "";
          const amtNum = typeof amtRaw === "number" && Number.isFinite(amtRaw) ? Math.trunc(amtRaw) : null;
          if (!label || amtNum === null || amtNum === 0) return;
          const amt = signed ? amtNum : Math.abs(amtNum);
          if (amtNum > 0) increased.push({ label, amount: Math.abs(amt) });
          else decreased.push({ label, amount: Math.abs(amt) });
        }

        // Preferred: contributors with signed deltas
        const contributors: any[] = Array.isArray((raw as any).contributors) ? (raw as any).contributors : [];
        if (contributors.length > 0) {
          for (const c of contributors) {
            if (!c || typeof c !== "object") continue;
            const label = (c as any).label ?? (c as any).reason ?? (c as any).key ?? (c as any).code;
            const delta = (c as any).delta ?? (c as any).amount ?? (c as any).value;
            pushLine(label, delta, true);
          }
        }

        // Alternate: separate up/down lists
        const ups: any[] =
          Array.isArray((raw as any).increased_by) ? (raw as any).increased_by : Array.isArray((raw as any).increases) ? (raw as any).increases : [];
        const downs: any[] =
          Array.isArray((raw as any).decreased_by) ? (raw as any).decreased_by : Array.isArray((raw as any).decreases) ? (raw as any).decreases : [];

        function parseList(list: any[], target: "increased" | "decreased") {
          for (const it of list) {
            if (it == null) continue;
            if (typeof it === "string") continue;
            if (typeof it === "object") {
              const label = (it as any).label ?? (it as any).reason ?? (it as any).key ?? (it as any).code;
              const amt = (it as any).amount ?? (it as any).delta ?? (it as any).value;
              const labelStr = typeof label === "string" ? label : "";
              const amtNum = typeof amt === "number" && Number.isFinite(amt) ? Math.trunc(amt) : null;
              if (!labelStr || amtNum === null || amtNum === 0) continue;
              const line = { label: labelStr, amount: Math.abs(amtNum) };
              if (target === "increased") increased.push(line);
              else decreased.push(line);
            }
          }
        }

        if (ups.length) parseList(ups, "increased");
        if (downs.length) parseList(downs, "decreased");

        if (increased.length === 0 && decreased.length === 0) return null;

        // Stable ordering: largest contribution first
        increased.sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
        decreased.sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

        return { increased, decreased };
      }

      const unrestBreakdownRaw: any =
        (ctx.report as any)?.unrest_breakdown ??
        (ctx.report as any)?.unrest_delta_breakdown ??
        (ctx.report as any)?.unrest_change_breakdown ??
        (ctx.report as any)?.unrestBreakdown ??
        null;

      const unrestBreakdown = parseUnrestBreakdown(unrestBreakdownRaw);
      const showUnrestBreakdown = Boolean(deltaUnrest !== 0 || (unrestBreakdown && (unrestBreakdown.increased.length || unrestBreakdown.decreased.length)));

      const baselineConsPerTurn = BUSHELS_PER_PERSON_PER_YEAR * TURN_YEARS;
      const builderExtraPerTurn = BUILDER_EXTRA_BUSHELS_PER_YEAR * TURN_YEARS;
      const builderConsPerTurn = baselineConsPerTurn + builderExtraPerTurn;

      const idle = Math.max(0, m.population - m.farmers - m.builders);

      const hasArrears = ob.arrears.coin > 0 || ob.arrears.bushels > 0;

      // Known Houses: tolerant to multiple shapes (objects or house_id list).
      const knownHousesRaw: any =
        (ctx.report as any)?.known_houses ??
        (ctx.report as any)?.knownHouses ??
        (ctx.preview_state as any)?.known_houses ??
        (ctx.preview_state as any)?.knownHouses ??
        (ctx.preview_state as any)?.house?.known_houses ??
        (ctx.preview_state as any)?.house?.knownHouses ??
        null;

      const knownHouses: any[] = (() => {
        const raw: any[] = Array.isArray(knownHousesRaw) ? (knownHousesRaw as any[]) : [];
        if (raw.length === 0) return [];

        // If the sim returns an array of house IDs, hydrate from registry for display.
        const allStrings = raw.every((x) => typeof x === "string");
        if (allStrings) {
          const houses: any = (ctx.preview_state as any).houses;
          const people: any = (ctx.preview_state as any).people;
          const out: any[] = [];

          for (const hid of raw as any as string[]) {
            const h = houses && typeof houses === "object" ? houses[hid] : null;
            const house_name = h && typeof h === "object" ? String((h as any).house_name ?? (h as any).name ?? (h as any).houseName ?? "").trim() : "";
            const tier = h && typeof h === "object" ? String((h as any).tier ?? "").trim() : "";

            const head_id: string | null =
              h && typeof h === "object"
                ? typeof (h as any).head_id === "string"
                  ? (h as any).head_id
                  : typeof (h as any).head?.id === "string"
                    ? (h as any).head.id
                    : null
                : null;

            const head = head_id && people && typeof people === "object" ? people[head_id] : null;

            const rel = relationshipToPlayerFromHouse(hid);

            out.push({
              house_id: hid,
              house_name: house_name || hid,
              tier,
              head_id,
              head_name: head && typeof head === "object" ? (head as any).name : "",
              head_age: head && typeof head === "object" ? (head as any).age : null,
              head_short_id: head && typeof head === "object" ? (head as any).short_id : null,
              head_status:
                head && typeof head === "object" && typeof (head as any).alive === "boolean" ? ((head as any).alive ? "Alive" : "Deceased") : "",
              relationship: rel
            });
          }

          out.sort(
            (a, b) =>
              String(a.house_name).localeCompare(String(b.house_name)) ||
              String(a.house_id).localeCompare(String(b.house_id))
          );

          return out;
        }

        // Otherwise assume already objects.
        const objs = raw.filter((x) => x && typeof x === "object");
        const nameOf = (h: any) => String(h?.house_name ?? h?.houseName ?? h?.name ?? h?.house_id ?? h?.id ?? "");
        objs.sort(
          (a, b) =>
            nameOf(a).localeCompare(nameOf(b)) ||
            String(a?.house_id ?? a?.id ?? "").localeCompare(String(b?.house_id ?? b?.id ?? ""))
        );
        return objs;
      })();

      const knownHousesMain = showAllKnownHouses ? knownHouses : knownHouses.slice(0, 5);
      const hasMoreKnownHouses = knownHouses.length > 5;

      // Prospects (v0.2.3): presentation-only relevance filtering
      const prospectsWindowRaw: any =
        (ctx as any).prospects_window ??
        (ctx as any).prospectsWindow ??
        (ctx.report as any)?.prospects_window ??
        (ctx.report as any)?.prospectsWindow ??
        null;

      const prospectsWindow: any | null = prospectsWindowRaw && typeof prospectsWindowRaw === "object" ? prospectsWindowRaw : null;

      const prospectsAll: any[] = Array.isArray(prospectsWindow?.prospects) ? prospectsWindow.prospects : [];
      const prospectsShownIds: string[] = Array.isArray(prospectsWindow?.shown_ids) ? prospectsWindow.shown_ids : [];
      const prospectsHiddenIds: string[] = Array.isArray(prospectsWindow?.hidden_ids) ? prospectsWindow.hidden_ids : [];

      const prospectById = new Map<string, any>();
      for (const p of prospectsAll) {
        const id = typeof p?.id === "string" ? p.id : "";
        if (id) prospectById.set(id, p);
      }

      const prospectsShown: any[] =
        prospectsShownIds.length > 0 ? prospectsShownIds.map((id) => prospectById.get(id)).filter(Boolean) : prospectsAll;

      const prospectsTotalCount = prospectsAll.length;
      const prospectsShownCount = prospectsShown.length;
      const prospectsHiddenCount =
        prospectsHiddenIds.length > 0 ? prospectsHiddenIds.length : Math.max(0, prospectsTotalCount - prospectsShownCount);

      const prospectActions: ProspectDecisionAction[] = Array.isArray((decisions as any).prospects?.actions)
        ? ((decisions as any).prospects.actions as ProspectDecisionAction[])
        : [];

      function getProspectDecision(id: string): "accept" | "reject" | null {
        const hit = prospectActions.find((a) => a && a.prospect_id === id);
        return hit ? hit.action : null;
      }

      function houseNameFromRegistry(house_id: string | null | undefined): string | null {
        const hid = typeof house_id === "string" ? house_id : null;
        if (!hid) return null;
        const houses: any = (ctx.preview_state as any).houses;
        const h = houses && typeof houses === "object" ? houses[hid] : null;
        const name =
          (h && typeof h === "object" && (typeof h.name === "string" ? h.name : typeof h.house_name === "string" ? h.house_name : typeof h.houseName === "string" ? h.houseName : null)) ||
          null;
        return name ? String(name) : null;
      }

      function houseLabel(house_id: string | null | undefined): string {
        const hid = typeof house_id === "string" ? house_id : "";
        const name = houseNameFromRegistry(hid);
        return name ?? hid ?? "";
      }

      function personNameFromRegistry(person_id: string | null | undefined): string | null {
        const pid = typeof person_id === "string" ? person_id : null;
        if (!pid) return null;
        const people: any = (ctx.preview_state as any).people;
        const p = people && typeof people === "object" ? people[pid] : null;
        if (p && typeof p === "object" && typeof p.name === "string") {
          return formatPersonName(p as any);
        }
        return null;
      }

      function relationshipToPlayerFromHouse(house_id: string | null | undefined): { allegiance: number; respect: number; threat: number } | null {
        const hid = typeof house_id === "string" ? house_id : null;
        if (!hid) return null;
        const houses: any = (ctx.preview_state as any).houses;
        const h = houses && typeof houses === "object" ? houses[hid] : null;
        const fromHeadId = h && typeof h === "object" && typeof h.head_id === "string" ? h.head_id : null;
        const playerHeadId = ctx.preview_state.house?.head?.id;
        if (!fromHeadId || !playerHeadId) return null;
        const edge = (ctx.preview_state.relationships ?? []).find((e) => e.from_id === fromHeadId && e.to_id === playerHeadId);
        if (!edge) return null;
        return { allegiance: edge.allegiance, respect: edge.respect, threat: edge.threat };
      }

      function requirementsMetForProspect(p: any): boolean {
        const reqs: any[] = Array.isArray(p?.requirements) ? p.requirements : [];
        if (reqs.length === 0) return true;

        const rel = relationshipToPlayerFromHouse(p?.from_house_id);

        for (const r of reqs) {
          const kind = typeof r?.kind === "string" ? r.kind : "";
          const v = r?.value;

          if (kind === "coin_min" && typeof v === "number") {
            if (m.coin < v) return false;
          }
          if (kind === "no_arrears") {
            const hasArrears = ob.arrears.coin > 0 || ob.arrears.bushels > 0;
            if (hasArrears) return false;
          }
          if (kind === "respect_min" && typeof v === "number" && rel) {
            if (rel.respect < v) return false;
          }
          if (kind === "allegiance_min" && typeof v === "number" && rel) {
            if (rel.allegiance < v) return false;
          }
          if (kind === "threat_max" && typeof v === "number" && rel) {
            if (rel.threat > v) return false;
          }
          // "custom" is informational only in v0.2.3 UI.
        }
        return true;
      }

      function costsForProspect(p: any): { coin: number; energy: number; bushels: number } {
        const c: any = p?.costs;
        return {
          coin: typeof c?.coin === "number" ? c.coin : 0,
          energy: typeof c?.energy === "number" ? c.energy : 0,
          bushels: typeof c?.bushels === "number" ? c.bushels : 0
        };
      }

      function hasSufficientResourcesForCosts(costs: { coin: number; energy: number; bushels: number }): boolean {
        if (costs.coin > 0 && m.coin < costs.coin) return false;
        if (costs.bushels > 0 && m.bushels_stored < costs.bushels) return false;
        if (costs.energy > 0 && ctx.preview_state.house.energy.available < costs.energy) return false;
        return true;
      }

      function recordProspectDecision(prospect_id: string, action: "accept" | "reject") {
        setDecisions((d) => {
          const prior: any = (d as any).prospects;
          const arr: ProspectDecisionAction[] = Array.isArray(prior?.actions) ? [...(prior.actions as ProspectDecisionAction[])] : [];
          arr.push({ prospect_id, action });
          return { ...(d as any), prospects: { kind: "prospects", actions: arr } };
        });
      }

      function handleProspectAction(p: any, action: "accept" | "reject") {
        const id = typeof p?.id === "string" ? p.id : "";
        if (!id) {
          setToast({ kind: "error", message: COPY.prospectErr_actionUnavailable });
          return;
        }

        const t = typeof p?.type === "string" ? (p.type as string) : null;

        const expiresTurn = typeof p?.expires_turn === "number" ? p.expires_turn : null;
        const nowTurn = ctx.report.turn_index;

        if (expiresTurn !== null && nowTurn > expiresTurn) {
          setToast({ kind: "error", message: COPY.prospectErr_expired });
          return;
        }

        if (getProspectDecision(id)) {
          setToast({ kind: "error", message: COPY.prospectErr_alreadyDecided });
          return;
        }

        const allowedActions: any[] = Array.isArray(p?.actions) ? p.actions : [];
        if (allowedActions.length > 0 && !allowedActions.includes(action)) {
          setToast({ kind: "error", message: COPY.prospectErr_actionUnavailable });
          return;
        }

        if (action === "accept") {
          if (!requirementsMetForProspect(p)) {
            setToast({ kind: "error", message: COPY.prospectErr_requirementsNotMet });
            return;
          }
          const costs = costsForProspect(p);
          const anyCost = costs.coin !== 0 || costs.energy !== 0 || costs.bushels !== 0;
          if (!hasSufficientResourcesForCosts(costs)) {
            setToast({ kind: "error", message: COPY.prospectErr_insufficientResources });
            return;
          }
          // v0.2.3.2: type-specific accept confirmations (copy-only)
          const pe: any = p?.predicted_effects;
          const coinDelta = typeof pe?.coin_delta === "number" && Number.isFinite(pe.coin_delta) ? Math.trunc(pe.coin_delta) : null;

          let confirmTitle = COPY.prospectAcceptConfirmTitle;
          let confirmBody = anyCost ? COPY.prospectAcceptConfirmBody_withCosts : COPY.prospectAcceptConfirmBody_noCosts;

          if (t === "marriage") {
            confirmTitle = COPY.prospectAcceptConfirmTitle_marriage;
            confirmBody = anyCost
              ? COPY.prospectAcceptConfirmBody_withCosts
              : coinDelta !== null
                ? COPY.prospectAcceptConfirmBody_marriage_dowry(fmtSigned(coinDelta))
                : COPY.prospectAcceptConfirmBody_marriage_noCosts;
          } else if (t === "grant") {
            confirmTitle = COPY.prospectAcceptConfirmTitle_grant;
            confirmBody = anyCost ? COPY.prospectAcceptConfirmBody_withCosts : COPY.prospectAcceptConfirmBody_grant_noCosts;
          } else if (t === "inheritance_claim") {
            confirmTitle = COPY.prospectAcceptConfirmTitle_inheritance_claim;
            confirmBody = COPY.prospectAcceptConfirmBody_inheritance_claim;
          }

          const ok = window.confirm(`${confirmTitle}

${confirmBody}`);
          if (!ok) return;

          recordProspectDecision(id, "accept");

          const typeToken = prospectTypeLabel(t);
          const shortEffectSummary =
            coinDelta !== null && coinDelta !== 0
              ? `Coin ${fmtSigned(coinDelta)}.`
              : t === "inheritance_claim"
                ? COPY.prospectToastEffect_claimRecorded
                : COPY.prospectToastEffect_arrangementRecorded;
          const acceptedMsg = COPY.prospectToastAccepted(typeToken, shortEffectSummary);

          // v0.2.4: Marriage acceptance confirmation (explicit copy + optional spouse/court note).
          if (t === "marriage") {
            const childId: string | null =
              typeof p?.subject_person_id === "string"
                ? p.subject_person_id
                : typeof p?.child_id === "string"
                  ? p.child_id
                  : typeof p?.person_id === "string"
                    ? p.person_id
                    : null;

            const childName =
              personNameFromRegistry(childId) ??
              (typeof p?.subject_person_name === "string" ? p.subject_person_name : null);

            const spouseName =
              personNameFromRegistry(typeof p?.spouse_person_id === "string" ? p.spouse_person_id : null) ??
              (typeof p?.spouse_name === "string" ? p.spouse_name : null) ??
              (typeof p?.other_person_name === "string" ? p.other_person_name : null) ??
              null;

            // Residence rule visibility: daughters marry out; sons marry in.
            const people: any = (ctx.preview_state as any).people;
            const childRec: any = childId && people && typeof people === "object" ? people[childId] : null;
            const childSex: "M" | "F" | null =
              childRec && typeof childRec === "object" && (childRec.sex === "M" || childRec.sex === "F") ? childRec.sex : null;

            if (childName) {
              const line1 = COPY.marriageToast_line1(childName);
              // Mirror sim residence rule (v0.2.5):
              // - Daughters always marry out.
              // - Sons marry in only if heir or eldest son; otherwise they marry out.
              const hh: any = (ctx.preview_state as any)?.house;
              const heirId: string | null = typeof hh?.heir_id === "string" ? hh.heir_id : null;
              const kidsArr: any[] = Array.isArray(hh?.children) ? hh.children : [];
              const eldestSonId: string | null = kidsArr
                .filter((c) => c && typeof c === "object" && c.alive !== false && c.sex === "M" && typeof c.id === "string")
                .sort((a, b) => (Number(b.age ?? 0) - Number(a.age ?? 0)) || String(a.id).localeCompare(String(b.id)))
                [0]?.id ?? null;

              const spouseJoinsCourt = childSex === "M" && Boolean(childId) && (childId === heirId || childId === eldestSonId);

              const msg =
                spouseJoinsCourt && spouseName
                  ? `${line1}
${COPY.marriageToast_line2_withSpouse(spouseName)}`
                  : `${line1}
${COPY.marriageToast_line2_childLeaves(childName)}`;
              setToast({ kind: "ok", message: msg });
              return;
            }
          }

          setToast({ kind: "ok", message: acceptedMsg });
          return;
        }

        // reject
        const ok = window.confirm(`${COPY.prospectRejectConfirmTitle}

    ${COPY.prospectRejectConfirmBody}`);
        if (!ok) return;
        recordProspectDecision(id, "reject");

        const typeToken = prospectTypeLabel(t);
        const baseMsg = COPY.prospectToastDeclined(typeToken);
        const rejectedMsg = rejectHasStandingRisk(p) ? `${baseMsg} ${COPY.prospectToastStandingMayDecrease}` : baseMsg;
        setToast({ kind: "ok", message: rejectedMsg });
      }

      function prospectTypeLabel(t: string | null | undefined): string {
        if (t === "marriage") return COPY.prospectType_marriage;
        if (t === "grant") return COPY.prospectType_grant;
        if (t === "inheritance_claim") return COPY.prospectType_inheritance_claim;
        return t ? String(t) : "";
      }

      function uncertaintyLabel(u: string | null | undefined): string | null {
        if (u === "known") return COPY.prospectConfidence_known;
        if (u === "likely") return COPY.prospectConfidence_likely;
        if (u === "possible") return COPY.prospectConfidence_possible;
        return null;
      }

      function effectsSummary(p: any): { coin?: number; rel?: string | null; flags?: string | null } {
        const pe: any = p?.predicted_effects;
        if (!pe || typeof pe !== "object") return {};
        const out: any = {};
        if (typeof pe.coin_delta === "number") out.coin = pe.coin_delta;

        const rds: any[] = Array.isArray(pe.relationship_deltas) ? pe.relationship_deltas : [];
        if (rds.length > 0) {
          const sumA = rds.reduce((s, d) => s + (typeof d?.allegiance_delta === "number" ? d.allegiance_delta : 0), 0);
          const sumR = rds.reduce((s, d) => s + (typeof d?.respect_delta === "number" ? d.respect_delta : 0), 0);
          const sumT = rds.reduce((s, d) => s + (typeof d?.threat_delta === "number" ? d.threat_delta : 0), 0);
          out.rel = `A ${fmtSigned(sumA)} / R ${fmtSigned(sumR)} / T ${fmtSigned(sumT)}`;
        }

        const flags: any[] = Array.isArray(pe.flags_set) ? pe.flags_set : [];
        if (flags.length > 0) out.flags = flags.map(String).join(", ");
        return out as any;
      }

      function rejectHasStandingRisk(p: any): boolean {
        const pe: any = p?.predicted_effects;
        const rds: any[] = Array.isArray(pe?.relationship_deltas) ? pe.relationship_deltas : [];
        if (rds.length === 0) return false;
        return rds.some((d) => {
          const a = typeof d?.allegiance_delta === "number" ? d.allegiance_delta : 0;
          const r = typeof d?.respect_delta === "number" ? d.respect_delta : 0;
          const t = typeof d?.threat_delta === "number" ? d.threat_delta : 0;
          return a < 0 || r < 0 || t > 0;
        });
      }

      // Labor delta cap (UX v0.2.2): total shift across roles
      const laborRequested =
        Math.abs(decisions.labor.desired_farmers - m.farmers) +
        Math.abs(decisions.labor.desired_builders - m.builders);
      const laborLimitExceeded = laborRequested > ctx.max_labor_shift;

      const plannedFarmers = Number.isFinite(decisions.labor.desired_farmers) ? decisions.labor.desired_farmers : 0;
      const plannedBuilders = Number.isFinite(decisions.labor.desired_builders) ? decisions.labor.desired_builders : 0;
      const laborAssignedNextTurn = plannedFarmers + plannedBuilders;
      const laborAvailableNextTurn = m.population;
      const laborOversubscribed = laborAssignedNextTurn > laborAvailableNextTurn;

      type OblAmount = { coin: number; bushels: number };
      function readObAmount(v: any): OblAmount | null {
        if (typeof v === "number") return { coin: v, bushels: 0 };
        if (!v || typeof v !== "object") return null;
        const coin = typeof (v as any).coin === "number" ? (v as any).coin : null;
        const bushels = typeof (v as any).bushels === "number" ? (v as any).bushels : null;
        if (coin === null && bushels === null) return null;
        return { coin: coin ?? 0, bushels: bushels ?? 0 };
      }
      function fmtObAmount(a: OblAmount): string {
        const parts: string[] = [];
        parts.push(`${a.coin} coin`);
        parts.push(`${a.bushels} bushels`);
        return parts.join(" / ");
      }

      const obTimingRaw = (ctx.report as any)?.obligations_timing ?? (ctx.report as any)?.obligations?.timing ?? null;

      const dueEntering: OblAmount = readObAmount(obTimingRaw?.due_entering_turn) ?? {
        coin: ob.tax_due_coin,
        bushels: ob.tithe_due_bushels
      };

      const accruedThisTurn: OblAmount | null = readObAmount(obTimingRaw?.accrued_this_turn);

      const arrearsCarried: OblAmount = readObAmount(obTimingRaw?.arrears_carried_forward) ?? {
        coin: ob.arrears.coin,
        bushels: ob.arrears.bushels
      };

      const totalObligations: OblAmount = readObAmount(obTimingRaw?.total) ??
        readObAmount(obTimingRaw?.total_obligations) ?? {
          coin: dueEntering.coin + (accruedThisTurn?.coin ?? 0) + arrearsCarried.coin,
          bushels: dueEntering.bushels + (accruedThisTurn?.bushels ?? 0) + arrearsCarried.bushels
        };

      const constructionRateThisTurn = m.builders * BUILD_RATE_PER_BUILDER_PER_TURN;
      const constructionRatePlannedNextTurn = decisions.labor.desired_builders * BUILD_RATE_PER_BUILDER_PER_TURN;
      const constructionRemaining = m.construction ? Math.max(0, m.construction.required - m.construction.progress) : 0;
      const constructionEtaTurns =
        m.construction && constructionRateThisTurn > 0 ? Math.ceil(constructionRemaining / constructionRateThisTurn) : null;

      const consFarmers = m.farmers * baselineConsPerTurn;
      const consBuilders = m.builders * builderConsPerTurn;
      const consIdle = idle * baselineConsPerTurn;


      // v0.2.4: Consumption split (peasant vs court) + optional court size.
      const peasantConsumptionBushels: number | null = (() => {
        const v: any = (ctx.report as any)?.peasant_consumption_bushels;
        return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;
      })();
      const courtConsumptionBushels: number | null = (() => {
        const v: any = (ctx.report as any)?.court_consumption_bushels;
        return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;
      })();
      const totalConsumptionBushels: number | null = (() => {
        const v: any = (ctx.report as any)?.total_consumption_bushels;
        if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
        const legacy = (ctx.report as any)?.consumption_bushels;
        if (typeof legacy === "number" && Number.isFinite(legacy)) return Math.trunc(legacy);
        if (peasantConsumptionBushels !== null && courtConsumptionBushels !== null) return peasantConsumptionBushels + courtConsumptionBushels;
        return null;
      })();
      const hasConsumptionSplit = peasantConsumptionBushels !== null && courtConsumptionBushels !== null && totalConsumptionBushels !== null;

            // v0.2.8 UI (presentation-only):
            // Court roster + derived role labels are expected to be provided by the snapshot (no UI derivation).
            type CourtRosterEntry = { person: PersonLike; role_label: string | null; officer_role_label: string | null; badges: string[] };
      
            function readCourtRosterFromSnapshot(): { entries: CourtRosterEntry[]; court_size: number | null } {
              const entries: CourtRosterEntry[] = [];
      
              const s: any = ctx.preview_state as any;
              const peopleRec: any = s?.people && typeof s.people === "object" ? s.people : {};
      
              const courtSizeRaw: any =
                (ctx.report as any)?.court_headcount ??
                (ctx.report as any)?.court_headcount_alive ??
                (ctx as any)?.court_roster?.headcount_alive ??
                (ctx.report as any)?.court_roster?.headcount_alive ??
                null;
              const court_size = typeof courtSizeRaw === "number" && Number.isFinite(courtSizeRaw) ? Math.trunc(courtSizeRaw) : null;
      
              const view: any =
                (ctx as any)?.court_roster_view ??
                (ctx.report as any)?.court_roster_view ??
                (ctx as any)?.derived_views?.court_roster ??
                (ctx as any)?.derivedViews?.court_roster ??
                null;
      
              const rowsAny: any =
                (view && Array.isArray((view as any).entries) && (view as any).entries) ||
                (view && Array.isArray((view as any).rows) && (view as any).rows) ||
                ((ctx as any)?.court_roster && Array.isArray((ctx as any).court_roster.rows) && (ctx as any).court_roster.rows) ||
                ((ctx.report as any)?.court_roster && Array.isArray((ctx.report as any).court_roster.rows) && (ctx.report as any).court_roster.rows) ||
                [];
      
              for (const r of rowsAny as any[]) {
                if (!r || typeof r !== "object") continue;
                const person_id: string =
                  typeof (r as any).person_id === "string"
                    ? (r as any).person_id
                    : typeof (r as any).id === "string"
                      ? (r as any).id
                      : typeof (r as any).personId === "string"
                        ? (r as any).personId
                        : "";
                if (!person_id) continue;
      
                const p = peopleRec?.[person_id];
                const person: PersonLike = p && typeof p === "object" ? (p as PersonLike) : ({ id: person_id, name: person_id } as any);
      
                const role_label: string | null =
                  typeof (r as any).role_label === "string"
                    ? (r as any).role_label
                    : typeof (r as any).derived_role_label === "string"
                      ? (r as any).derived_role_label
                      : typeof (r as any).relationship_label === "string"
                        ? (r as any).relationship_label
                        : null;
      
                const officer_role_label: string | null =
                  typeof (r as any).officer_role_label === "string"
                    ? (r as any).officer_role_label
                    : typeof (r as any).officerRoleLabel === "string"
                      ? (r as any).officerRoleLabel
                      : null;
      
                const badges: string[] = Array.isArray((r as any).badges) ? (r as any).badges.filter((b: any) => typeof b === "string") : [];
      
                entries.push({ person, role_label, officer_role_label, badges });
              }
      
              return { entries, court_size };
            }
      
            const { entries: courtRosterEntries, court_size: courtSize } = readCourtRosterFromSnapshot();
      

      // Spouse lookup by person_id (use kinship_edges spouse_of); avoids relying on a global household spouse field.
      const spouseIdByPersonId: Map<string, string> = (() => {
        const m = new Map<string, string>();
        const s: any = ctx.preview_state as any;
        const edges: any[] = Array.isArray(s?.kinship_edges) ? s.kinship_edges : Array.isArray(s?.kinship) ? s.kinship : [];
        for (const e of edges) {
          if (!e || typeof e !== "object") continue;
          if ((e as any).kind !== "spouse_of") continue;
          const a = (e as any).a_id;
          const b = (e as any).b_id;
          if (typeof a !== "string" || typeof b !== "string" || !a || !b) continue;
          if (a === b) continue;
          // Deterministic even if multiple spouse_of edges exist: keep lexicographically smallest spouse id.
          const setMin = (k: string, v: string) => {
            const cur = m.get(k);
            if (!cur || v.localeCompare(cur) < 0) m.set(k, v);
          };
          setMin(a, b);
          setMin(b, a);
        }
        return m;
      })();

      function spouseNameForPersonId(person_id: string): string | null {
        const sid = spouseIdByPersonId.get(person_id);
        if (!sid || sid === person_id) return null;
        return personNameFromRegistry(sid) ?? null;
      }

      // v0.2.7: Anchors for Council Agenda CTAs (scroll only; no new routes).
      const ANCHOR = {
        labor: "anchor_labor",
        food: "anchor_food",
        obligations: "anchor_obligations",
        unrest: "anchor_unrest",
        prospects: "anchor_prospects",
        household: "anchor_household",
        events: "anchor_events"
      } as const;

      function scrollToAnchor(anchorId: string) {
        try {
          const el = document.getElementById(anchorId);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {
          // no-op
        }
      }

      // --- v0.2.7.1 hotfix: Weather surfacing (derived; UI-only) ---
      const weatherMultiplier =
        typeof ctx.report.weather_multiplier === "number" && Number.isFinite(ctx.report.weather_multiplier)
          ? ctx.report.weather_multiplier
          : 1;
      const weatherMultText = fmtMult(weatherMultiplier);
      const weatherHarmedHarvestWhy = weatherMultiplier < 0.999 ? COPY.weatherHarmedHarvest(weatherMultText) : null;
      const shortageBushels =
        typeof ctx.report.shortage_bushels === "number" && Number.isFinite(ctx.report.shortage_bushels) ? ctx.report.shortage_bushels : 0;
      const shouldSurfaceWeatherOnFood = Boolean(weatherHarmedHarvestWhy) && (shortageBushels > 0 || deltaBushels < 0);


      // --- v0.2.7 Diff Ledger (derived; UI-only) ---
      type SourceTag = "decision" | "event" | "system_pressure" | "prospect";
      type LedgerItem = {
        id: string;
        sort_mag: number;
        tie_key: string;
        primary: string;
        why: string;
        source: SourceTag;
      };

      function pickEventWhyForDeltaKey(deltaKey: string): { why: string; source: SourceTag } | null {
        const evs: any[] = Array.isArray(ctx.report.events) ? (ctx.report.events as any[]) : [];
        let best: { id: string; title: string; mag: number } | null = null;

        for (const e of evs) {
          const deltas: any[] = Array.isArray(e?.deltas) ? e.deltas : [];
          const d = deltas.find((x) => x && typeof x === "object" && x.key === deltaKey);
          const diff = typeof d?.diff === "number" && Number.isFinite(d.diff) ? Math.trunc(d.diff) : 0;
          const mag = Math.abs(diff);
          if (mag <= 0) continue;
          const id = typeof e?.id === "string" ? e.id : "";
          const title = typeof e?.title === "string" ? e.title : "";
          if (!title) continue;

          if (!best) {
            best = { id, title, mag };
            continue;
          }

          if (mag > best.mag) {
            best = { id, title, mag };
            continue;
          }

          if (mag === best.mag) {
            const a = id;
            const b = best.id;
            if (a && b && a < b) best = { id, title, mag };
          }
        }

        if (!best) return null;
        return { why: best.title, source: "event" };
      }

      function pickTopDriver(prefix: string): string | null {
        const ds: any[] = Array.isArray(ctx.report.top_drivers) ? (ctx.report.top_drivers as any[]) : [];
        for (const d of ds) {
          if (typeof d === "string" && d.startsWith(prefix)) return d;
        }
        return null;
      }

      function whyForMetric(metric: "food" | "coin" | "population" | "unrest"): { why: string; source: SourceTag } {
        // Decision/prospect attribution is intentionally omitted in the live (pre-decision) Turn Report.
        if (metric === "food") {
          const base =
            pickEventWhyForDeltaKey("bushels") ??
            (pickTopDriver("Food:") ? { why: pickTopDriver("Food:") as string, source: "system_pressure" } : null) ??
            { why: COPY.diffLedgerMultipleCauses, source: "system_pressure" };

          // Surface weather shocks directly on the Food line when food is worsening/shortage is present.
          if (shouldSurfaceWeatherOnFood && weatherHarmedHarvestWhy) {
            if (base.why === COPY.diffLedgerMultipleCauses) return { why: weatherHarmedHarvestWhy, source: "system_pressure" };
            if (base.why.includes(weatherHarmedHarvestWhy)) return base;
            return { why: `${base.why} · ${weatherHarmedHarvestWhy}`, source: base.source };
          }

          return base;
        }
        if (metric === "coin") {
          return (
            pickEventWhyForDeltaKey("coin") ??
            (pickTopDriver("Coin:") ? { why: pickTopDriver("Coin:") as string, source: "system_pressure" } : null) ??
            { why: COPY.diffLedgerMultipleCauses, source: "system_pressure" }
          );
        }
        if (metric === "unrest") {
          return (
            pickEventWhyForDeltaKey("unrest") ??
            (pickTopDriver("Unrest:") ? { why: pickTopDriver("Unrest:") as string, source: "system_pressure" } : null) ??
            { why: COPY.diffLedgerMultipleCauses, source: "system_pressure" }
          );
        }
        if (metric === "population") {
          return (
            pickEventWhyForDeltaKey("population") ??
            (popChangeSummary ? { why: popChangeSummary, source: "system_pressure" } : null) ??
            { why: COPY.diffLedgerMultipleCauses, source: "system_pressure" }
          );
        }
        return { why: COPY.diffLedgerMultipleCauses, source: "system_pressure" };
      }

      const diffLedgerItems: LedgerItem[] = (() => {
        // Prefer sim-provided diff ledger if present (prospect attribution + house labels).
        const reportLedgerRaw: any =
          (ctx.report as any)?.diff_ledger_items ??
          (ctx.report as any)?.diff_ledger ??
          (ctx.report as any)?.diffLedger ??
          (ctx.report as any)?.delta_ledger ??
          (ctx.report as any)?.ledger_diff ??
          null;

        const normalizeSource = (src: any): SourceTag => {
          const s = typeof src === "string" ? src : "";
          if (s === "decision" || s === "event" || s === "system_pressure" || s === "prospect") return s;
          return "system_pressure";
        };

        if (Array.isArray(reportLedgerRaw) && reportLedgerRaw.length > 0) {
          const parsed: LedgerItem[] = [];
          for (let i = 0; i < reportLedgerRaw.length; i++) {
            const it: any = reportLedgerRaw[i];
            if (!it || typeof it !== "object") continue;
            const primary: string =
              typeof it.primary === "string"
                ? it.primary
                : typeof it.line === "string"
                  ? it.line
                  : typeof it.text === "string"
                    ? it.text
                    : "";
            if (!primary) continue;
            const why: string =
              typeof it.why === "string"
                ? it.why
                : typeof it.reason === "string"
                  ? it.reason
                  : typeof it.note === "string"
                    ? it.note
                    : "";
            const src = normalizeSource(it.source ?? it.source_tag ?? it.sourceTag ?? it.kind);
            const id = typeof it.id === "string" ? it.id : `report_ledger_${i}`;
            parsed.push({
              id,
              sort_mag: typeof it.sort_mag === "number" && Number.isFinite(it.sort_mag) ? it.sort_mag : Math.max(0, primary.length),
              tie_key: typeof it.tie_key === "string" ? it.tie_key : `r${String(i).padStart(2, "0")}`,
              primary,
              why: why || COPY.diffLedgerMultipleCauses,
              source: src
            });
          }
          if (parsed.length) return parsed;
        }

        const items: LedgerItem[] = [];

        const inferSourceFromWhy = (why: string, fallback: SourceTag): SourceTag => {
          const w = String(why || "").toLowerCase();
          if (w.includes("grant") || w.includes("marriage") || w.includes("prospect")) return "prospect";
          return fallback;
        };

        items.push({
          id: "food",
          sort_mag: Math.abs(deltaBushels),
          tie_key: "00_food",
          primary: COPY.diffLedgerLine_food(fmtSigned(deltaBushels), m.bushels_stored),
          ...whyForMetric("food")
        });

        items.push({
          id: "coin",
          sort_mag: Math.abs(deltaCoin),
          tie_key: "01_coin",
          primary: COPY.diffLedgerLine_coin(fmtSigned(deltaCoin)),
          ...whyForMetric("coin")
        });

        items.push({
          id: "population",
          sort_mag: Math.abs(deltaPop),
          tie_key: "02_population",
          primary: COPY.diffLedgerLine_population(fmtSigned(deltaPop)),
          ...whyForMetric("population")
        });

        items.push({
          id: "unrest",
          sort_mag: Math.abs(deltaUnrest),
          tie_key: "03_unrest",
          primary: COPY.diffLedgerLine_unrest(fmtSigned(deltaUnrest)),
          ...whyForMetric("unrest")
        });

        // Relationship movers (bounded): incoming edges to player head.
        const playerHeadId: string | null =
          typeof ctx.preview_state?.house?.head?.id === "string" ? ctx.preview_state.house.head.id : typeof state.house?.head?.id === "string" ? state.house.head.id : null;

        const beforeArr: any[] = Array.isArray((state as any).relationships) ? ((state as any).relationships as any[]) : [];
        const afterArr: any[] = Array.isArray((ctx.preview_state as any).relationships) ? ((ctx.preview_state as any).relationships as any[]) : [];

        const keyOf = (from_id: string, to_id: string) => `${from_id}|${to_id}`;
        const beforeMap = new Map<string, any>();
        const afterMap = new Map<string, any>();

        for (const e of beforeArr) {
          const from_id = typeof e?.from_id === "string" ? e.from_id : "";
          const to_id = typeof e?.to_id === "string" ? e.to_id : "";
          if (from_id && to_id) beforeMap.set(keyOf(from_id, to_id), e);
        }
        for (const e of afterArr) {
          const from_id = typeof e?.from_id === "string" ? e.from_id : "";
          const to_id = typeof e?.to_id === "string" ? e.to_id : "";
          if (from_id && to_id) afterMap.set(keyOf(from_id, to_id), e);
        }

        // Map head_id -> house label ("House {name}") for stable target display.
        const headIdToHouseLabel = new Map<string, string>();
        {
          const houses: any = (ctx.preview_state as any)?.houses;
          if (houses && typeof houses === "object") {
            for (const hid of Object.keys(houses).sort()) {
              const h: any = houses[hid];
              if (!h || typeof h !== "object") continue;
              const head_id = typeof h.head_id === "string" ? h.head_id : null;
              const house_name = typeof h.house_name === "string" ? h.house_name : typeof h.name === "string" ? h.name : null;
              if (head_id && house_name) headIdToHouseLabel.set(head_id, COPY.housePrefix(house_name));
            }
          }
        }

        type RelMove = { from_id: string; to_id: string; dA: number; dR: number; dT: number; score: number };
        const moves: RelMove[] = [];

        if (playerHeadId) {
          const keys = new Set<string>();
          for (const k of beforeMap.keys()) keys.add(k);
          for (const k of afterMap.keys()) keys.add(k);

          for (const k of keys) {
            const [from_id, to_id] = k.split("|");
            if (!from_id || !to_id) continue;
            if (to_id !== playerHeadId) continue;
            if (from_id === playerHeadId) continue;

            const b: any = beforeMap.get(k);
            const a: any = afterMap.get(k);

            const dA =
              (typeof a?.allegiance === "number" ? a.allegiance : 0) - (typeof b?.allegiance === "number" ? b.allegiance : 0);
            const dR = (typeof a?.respect === "number" ? a.respect : 0) - (typeof b?.respect === "number" ? b.respect : 0);
            const dT = (typeof a?.threat === "number" ? a.threat : 0) - (typeof b?.threat === "number" ? b.threat : 0);
            const score = Math.abs(dA) + Math.abs(dR) + Math.abs(dT);
            if (score <= 0) continue;

            moves.push({ from_id, to_id, dA, dR, dT, score });
          }
        }

        moves.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.from_id < b.from_id) return -1;
          if (a.from_id > b.from_id) return 1;
          if (a.to_id < b.to_id) return -1;
          if (a.to_id > b.to_id) return 1;
          return 0;
        });

        const liegeId: string | null = typeof ctx.preview_state?.locals?.liege?.id === "string" ? ctx.preview_state.locals.liege.id : null;
        const clergyId: string | null = typeof ctx.preview_state?.locals?.clergy?.id === "string" ? ctx.preview_state.locals.clergy.id : null;
        const nobleIds = new Set<string>(
          Array.isArray(ctx.preview_state?.locals?.nobles) ? (ctx.preview_state.locals.nobles as any[]).map((p) => (p && typeof p === "object" && typeof (p as any).id === "string" ? (p as any).id : "")).filter(Boolean) : []
        );
        const hasArrearsBefore =
          ((beforeM?.obligations?.arrears?.coin ?? 0) > 0) || ((beforeM?.obligations?.arrears?.bushels ?? 0) > 0);

        function relationWhoLabel(from_id: string): string {
          if (liegeId && from_id === liegeId) {
            const nm = personNameFromRegistry(from_id) ?? (ctx.preview_state.locals?.liege?.name ? String(ctx.preview_state.locals.liege.name) : from_id);
            return `${nm} (Liege)`;
          }
          if (clergyId && from_id === clergyId) {
            const nm = personNameFromRegistry(from_id) ?? (ctx.preview_state.locals?.clergy?.name ? String(ctx.preview_state.locals.clergy.name) : from_id);
            return `${nm} (Clergy)`;
          }
          const house = headIdToHouseLabel.get(from_id);
          if (house) return house;
          if (nobleIds.has(from_id)) {
            const nm = personNameFromRegistry(from_id) ?? from_id;
            return `${nm} (Noble)`;
          }
          return personNameFromRegistry(from_id) ?? from_id;
        }

        function whyForRelationMove(mv: RelMove): { why: string; source: SourceTag } {
          if (liegeId && mv.from_id === liegeId && hasArrearsBefore) {
            // Use binding obligations helper text for a deterministic, player-facing attribution.
            return { why: COPY.obligationsHelper, source: "system_pressure" };
          }
          return { why: COPY.diffLedgerWhy_relations_drift, source: "system_pressure" };
        }

        for (const mv of moves.slice(0, 3)) {
          const target = relationWhoLabel(mv.from_id);

          items.push({
            id: `rel:${mv.from_id}->${mv.to_id}`,
            sort_mag: mv.score,
            tie_key: `10_rel:${mv.from_id}->${mv.to_id}`,
            primary: COPY.diffLedgerLine_relations(target, fmtSigned(mv.dA), fmtSigned(mv.dR), fmtSigned(mv.dT)),
            ...whyForRelationMove(mv)
          });
        }

        items.sort((a, b) => {
          if (b.sort_mag !== a.sort_mag) return b.sort_mag - a.sort_mag;
          if (a.tie_key < b.tie_key) return -1;
          if (a.tie_key > b.tie_key) return 1;
          return 0;
        });

        return items;
      })();

      // --- v0.2.7 Council Agenda (derived; UI-only) ---
      type AgendaItem = {
        id: string;
        score: number;
        tie_key: string;
        title: string;
        context: string;
        cta_label: string;
        anchor: string;
      };

      const councilAgendaItems: AgendaItem[] = (() => {
        const items: AgendaItem[] = [];

        const nowTurn = ctx.report.turn_index;

        // 1) Labor oversubscribed (reuse banner signal)
        if (laborOversubscribed) {
          items.push({
            id: "agenda_labor_oversubscribed",
            score: 1000,
            tie_key: "00_labor",
            title: COPY.agenda_labor_title,
            context: COPY.agenda_labor_context,
            cta_label: COPY.cta_reviewLabor,
            anchor: ANCHOR.labor
          });
        }

        // 2) Food risk
        if (ctx.report.shortage_bushels > 0 || deltaBushels < 0) {
          const severity = (ctx.report.shortage_bushels ?? 0) + Math.abs(Math.min(0, deltaBushels));
          items.push({
            id: "agenda_food_shortage",
            score: 900 + severity,
            tie_key: "01_food",
            title: COPY.agenda_food_title,
            context: shouldSurfaceWeatherOnFood && weatherHarmedHarvestWhy ? weatherHarmedHarvestWhy : COPY.agenda_food_context,
            cta_label: COPY.cta_viewFoodDetails,
            anchor: ANCHOR.food
          });
        }

        // 3) Obligations pressing (due entering)
        const dueTotal = (dueEntering.coin ?? 0) + (dueEntering.bushels ?? 0);
        if (dueTotal > 0) {
          const severity = dueTotal + (arrearsCarried.coin ?? 0) + (arrearsCarried.bushels ?? 0);
          items.push({
            id: "agenda_obligations_due",
            score: 850 + severity,
            tie_key: "02_obligations",
            title: COPY.agenda_obligations_title,
            context: COPY.agenda_obligations_context,
            cta_label: COPY.cta_reviewObligations,
            anchor: ANCHOR.obligations
          });
        }

        // 4) Unrest rising
        if (deltaUnrest > 0) {
          items.push({
            id: "agenda_unrest_rising",
            score: 800 + deltaUnrest,
            tie_key: "03_unrest",
            title: COPY.agenda_unrest_title,
            context: COPY.agenda_unrest_context,
            cta_label: COPY.cta_viewUnrestDetails,
            anchor: ANCHOR.unrest
          });
        }

        // 5) Prospect expiring soon (cap to 1)
        {
          const ps: any[] = Array.isArray(prospectsAll) ? (prospectsAll as any[]) : [];
          const expiring = ps
            .filter((p) => typeof p?.expires_turn === "number" && Number.isFinite(p.expires_turn))
            .map((p) => ({ id: typeof p?.id === "string" ? p.id : "", expires_turn: Math.trunc(p.expires_turn as number) }))
            .filter((p) => p.id && p.expires_turn <= nowTurn + 1);

          expiring.sort((a, b) => {
            if (a.expires_turn !== b.expires_turn) return a.expires_turn - b.expires_turn;
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
          });

          const pick = expiring[0];
          if (pick) {
            const severity = Math.max(0, (nowTurn + 1) - pick.expires_turn);
            items.push({
              id: `agenda_prospect_expiring:${pick.id}`,
              score: 780 + severity,
              tie_key: `10_prospect:${pick.id}`,
              title: COPY.agenda_prospect_title,
              context: COPY.agenda_prospect_context(pick.expires_turn),
              cta_label: COPY.cta_viewProspects,
              anchor: ANCHOR.prospects
            });
          }
        }

        // 6) Succession/heir attention (only when heir status changed this turn)
        {
          const hl: any[] = Array.isArray((ctx.report as any)?.house_log) ? (((ctx.report as any).house_log) as any[]) : [];
          const changed = hl.some((e) => e?.kind === "heir_selected" || e?.kind === "succession");
          if (changed && nowTurn > 0) {
            items.push({
              id: "agenda_succession",
              score: 760,
              tie_key: "06_heir",
              title: COPY.agenda_succession_title,
              context: COPY.agenda_succession_context,
              cta_label: COPY.cta_viewHousehold,
              anchor: ANCHOR.household
            });
          }
        }

        items.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.tie_key < b.tie_key) return -1;
          if (a.tie_key > b.tie_key) return 1;
          return 0;
        });

        const k = Math.min(5, Math.max(3, items.length));
        return items.slice(0, k);
      })();


      content = (
        <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 1100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2>Turn {ctx.report.turn_index}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setScreen("new")}>New Run</button>
              <button onClick={() => setScreen("log")}>Debug/Log</button>
            </div>
          </div>

          {state.game_over ? (
            <div style={{ padding: 12, border: "1px solid #f55", marginBottom: 12 }}>
              <b>GAME OVER:</b> {GAME_OVER_REASON_COPY[state.game_over.reason]} — Turn {state.game_over.turn_index}
            </div>
          ) : null}

          {toast ? (
            <div
              style={{
                padding: 10,
                border: toast.kind === "error" ? "1px solid #f55" : "1px solid #ccc",
                background: toast.kind === "error" ? "#fff5f5" : "#fafafa",
                whiteSpace: "pre-line",
                marginBottom: 12
              }}
            >
              {toast.message}
            </div>
          ) : null}

          
          {/* v0.2.7: Diff Ledger (biggest changes + one-line why) */}
          <div style={{ padding: 12, border: "1px solid #ccc", background: "#fafafa", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{COPY.diffLedgerTitle}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>{COPY.diffLedgerHelper}</div>

            <div style={{ display: "grid", gap: 8 }}>
              {diffLedgerItems.map((it) => (
                <div key={it.id} style={{ padding: 10, border: "1px solid #ddd", background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 700 }}>{it.primary}</div>
                    <span
                      title="Source of the change (highest-priority contributor)."
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        border: "1px solid #ddd",
                        borderRadius: 999,
                        background: "#fafafa",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {it.source}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{it.why}</div>
                </div>
              ))}
            </div>
          </div>

          {/* v0.2.7: Council Agenda (3–5 items) */}
          <div style={{ padding: 12, border: "1px solid #ccc", background: "#fafafa", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{COPY.councilAgendaTitle}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>{COPY.councilAgendaHelper}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {councilAgendaItems.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: 10,
                    border: "1px solid #ddd",
                    background: "#fff"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{a.context}</div>
                  </div>
                  <button onClick={() => scrollToAnchor(a.anchor)} style={{ whiteSpace: "nowrap" }}>
                    {a.cta_label}
                  </button>
                </div>
              ))}
            </div>
          </div>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 12, border: "1px solid #ccc" }}>
              <h3>
                Manor State <span style={{ fontSize: 12, opacity: 0.7 }}>(before decisions)</span>
              </h3>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                Turn = {TURN_YEARS} years. This includes harvest/spoilage/events that already happened this turn; your choices below still
                affect the end-of-turn outcome.
              </div>

              <ul>
                <li>
                  Population: {m.population} {deltaPop !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaPop)})</span> : null}{" "}
                  {popChangeSummary ? <span style={{ opacity: 0.75 }}>({popChangeSummary})</span> : null}
                </li>
                <li>Farmers: {m.farmers}</li>
                <li>
                  Builders: {m.builders}
                  <Tip
                    text={`Builder food premium: each builder consumes +${builderExtraPerTurn} extra bushels this turn (${TURN_YEARS}y) compared to a farmer/idle worker.`}
                  />
                </li>
                <li>
                  Bushels stored: {m.bushels_stored}{" "}
                  {deltaBushels !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaBushels)})</span> : null}
                </li>
                <li>
                  Coin: {m.coin} {deltaCoin !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaCoin)})</span> : null}
                </li>
                <li id={ANCHOR.unrest} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>
                    Unrest: <b>{m.unrest}</b>/100 {deltaUnrest !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaUnrest)})</span> : null}
                  </span>
                  <progress value={m.unrest} max={100} style={{ width: 180, height: 14 }} />
                  <Tip text="If Unrest is ≥ 100 at end of a turn, you are Dispossessed (game over)." />
                </li>
              </ul>

              {showUnrestBreakdown ? (
                <details style={{ marginTop: 6 }}>
                  <summary>{COPY.unrestBreakdownTitle}</summary>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    {!unrestBreakdown ? (
                      <div style={{ opacity: 0.85 }}>{COPY.unrestBreakdownNone}</div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        {unrestBreakdown.increased.length ? (
                          <div>
                            <div style={{ fontWeight: 700 }}>{COPY.unrestBreakdownIncreasedBy}</div>
                            <ul style={{ margin: "6px 0 0 18px" }}>
                              {unrestBreakdown.increased.map((l) => (
                                <li key={`up:${l.label}`}>{l.label}: {l.amount}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {unrestBreakdown.decreased.length ? (
                          <div>
                            <div style={{ fontWeight: 700 }}>{COPY.unrestBreakdownDecreasedBy}</div>
                            <ul style={{ margin: "6px 0 0 18px" }}>
                              {unrestBreakdown.decreased.map((l) => (
                                <li key={`down:${l.label}`}>{l.label}: {l.amount}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </details>
              ) : null}

              <h4>Construction</h4>
              {ctx.report.construction.completed_improvement_id ? (
                <div style={{ padding: 8, border: "1px solid #cfc", marginBottom: 8 }}>
                  Completed: <b>{IMPROVEMENTS[ctx.report.construction.completed_improvement_id]?.name ?? ctx.report.construction.completed_improvement_id}</b>
                </div>
              ) : null}

              {m.construction ? (
                <div>
                  <div>
                    Active: <b>{IMPROVEMENTS[m.construction.improvement_id]?.name ?? m.construction.improvement_id}</b>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    <span>
                      Progress: {m.construction.progress}/{m.construction.required}
                    </span>
                    <progress value={m.construction.progress} max={m.construction.required} style={{ width: 200, height: 14 }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                    This turn’s progress: +{ctx.report.construction.progress_added} (rate {m.builders} builders × {BUILD_RATE_PER_BUILDER_PER_TURN} = {constructionRateThisTurn}/turn)
                    <Tip text="Construction progress uses CURRENT builders. Changing builders below affects NEXT turn." />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                    {constructionRateThisTurn > 0 ? (
                      <span>
                        Estimated time remaining at current rate: ~{constructionEtaTurns} turn{constructionEtaTurns === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span>
                        No progress while builders = 0.
                        <Tip text="Assign builders (next turn) to keep construction moving." />
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                    Planned next turn: {decisions.labor.desired_builders} builders → ~{constructionRatePlannedNextTurn} progress/turn
                  </div>

                  <button
                    onClick={() => setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "abandon", confirm: true } }))}
                    title="Abandon loses all progress; coin is not refunded."
                    style={{ marginTop: 8 }}
                  >
                    Abandon Project (lossy)
                  </button>
                </div>
              ) : (
                <div>None</div>
              )}
            </div>

            <div style={{ padding: 12, border: "1px solid #ccc" }}>
              <h3>
                Turn Report <span style={{ fontSize: 12, opacity: 0.7 }}>(before decisions)</span>
              </h3>

              <div style={{ padding: 8, border: "1px solid #eee", background: "#fafafa", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>At a glance</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                  <div>
                    Bushels: <b>{fmtSigned(deltaBushels)}</b> (now {m.bushels_stored})
                  </div>
                  <div>
                    Coin: <b>{fmtSigned(deltaCoin)}</b> (now {m.coin})
                  </div>
                  <div>
                    Unrest: <b>{fmtSigned(deltaUnrest)}</b> (now {m.unrest}/100)
                  </div>
                  {ctx.report.shortage_bushels > 0 ? (
                    <div>
                      <b>Shortage:</b> {ctx.report.shortage_bushels} bushels
                    </div>
                  ) : null}
                </div>
              </div>

              <h4 id={ANCHOR.household}>{COPY.household}</h4>
              <div style={{ padding: 10, border: "1px solid #eee", background: "#fff", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{formatPersonName(hhView.head)}</div>
                  </div>
                  <button onClick={() => setShowHouseholdDetails((v) => !v)} style={{ fontSize: 12 }}>
                    {showHouseholdDetails ? COPY.hideHouseholdDetails : COPY.showHouseholdDetails}
                  </button>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                  <div>
                    <b>{COPY.heirLabel}</b>{" "}
                    {hhView.heir_id
                      ? (() => {
                          const heir = hhView.children.find((c) => c.id === hhView.heir_id);
                          return heir ? formatPersonName(heir) : COPY.none;
                        })()
                      : COPY.none}
                  </div>
                  <div>
                    <b>{COPY.spouseLabel}</b>{" "}
                    {hhView.spouse ? formatPersonName(hhView.spouse) : COPY.none}
                  </div>
                  <div>
                    <b>{COPY.childrenLabel}</b>{" "}
                    {hhView.children.length ? hhView.children.length : COPY.none}
                  </div>
                  <div>
                    <b>{COPY.courtSizeLabel}</b> {courtSize !== null ? courtSize : "(Not available in this build)"} <Tip text={COPY.tooltipCourtSize} />
                  </div>
                  <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.9 }}>
                    {lastSuccession
                      ? `${COPY.lastSuccessionLabel} Turn ${lastSuccession.turn_index} — ${COPY.logOutcome_succession(lastSuccession.new_ruler_name)}`
                      : COPY.lastSuccessionNone}
                  </div>
                </div>

                {showHouseholdDetails ? (
                  <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 6 }}>
                      {COPY.courtSizeLabel}: {courtSize !== null ? courtSize : "(Not available in this build)"} <Tip text={COPY.tooltipCourtSize} />
                    </div>

                    <ul style={{ margin: "0 0 10px 18px" }}>
                      {courtRosterEntries.length === 0 ? (
                        <li style={{ opacity: 0.7 }}>(Not available in this build)</li>
                      ) : (
                        courtRosterEntries.map((r) => {
                        const spouseName = spouseNameForPersonId(r.person.id);
                        return (
                          <li key={r.person.id} style={{ marginBottom: 6 }}>
                            <div>
                              <span>{formatPersonName(r.person)}</span>
                              {r.badges.map((b) => (
                                <Badge key={`${r.person.id}:${b}`} text={b} />
                              ))}
                            </div>

                            {spouseName ? (
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                                Spouse: {spouseName}
                              </div>
                            ) : null}

                            {r.role_label || r.officer_role_label ? (
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: spouseName ? 2 : 0 }}>
                                {r.role_label ? r.role_label : null}
                                {r.officer_role_label ? ` — ${r.officer_role_label}` : null}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, opacity: 0.6, marginTop: spouseName ? 2 : 0 }}>(Not available in this build)</div>
                            )}
                          </li>
                        );
                      })
                      )}
                    </ul>

                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{COPY.houseLog}</div>

                    {(() => {
                      const thisTurn = (ctx.report.house_log ?? []) as any[];
                      const all = getAllHouseLogEntries(state, thisTurn);
                      if (!all.length) {
                        return <div style={{ fontSize: 12, opacity: 0.85 }}>{COPY.noHouseLogYet}</div>;
                      }
                      const header = !thisTurn.length ? (
                        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>{COPY.noNewHouseLogThisTurn}</div>
                      ) : null;
                      return (
                        <div style={{ display: "grid", gap: 8 }}>
                          {header}
                          {all.map((e, idx) => {
                            const kind = e?.kind;
                            let title = "";
                            let outcome = "";
                            let details: string | null = null;
                            if (kind === "widowed") {
                              title = COPY.logTitle_widowed;
                              const spouseParts = formatNameParts(e?.spouse_name, e?.spouse_age, e?.spouse_short_id, e?.spouse_id);
                              const spouseName = spouseParts.displayName
                                ? spouseParts.ageText
                                  ? `${spouseParts.displayName} (${spouseParts.ageText})`
                                  : spouseParts.displayName
                                : "";
                              outcome = COPY.logOutcome_widowed(spouseName);
                              details = COPY.logDetails_widowed;
                            } else if (kind === "heir_selected") {
                              title = COPY.logTitle_heir_selected;
                              const heirParts = formatNameParts(e?.heir_name, e?.heir_age, e?.heir_short_id, e?.heir_id);
                              const heirName = heirParts.displayName
                                ? heirParts.ageText
                                  ? `${heirParts.displayName} (${heirParts.ageText})`
                                  : heirParts.displayName
                                : "";
                              outcome = COPY.logOutcome_heir_selected(heirName);
                            } else if (kind === "succession") {
                              title = COPY.logTitle_succession;
                              const rulerParts = formatNameParts(
                                e?.new_ruler_name,
                                e?.new_ruler_age,
                                e?.new_ruler_short_id,
                                e?.new_ruler_id
                              );
                              const newRulerName = rulerParts.displayName
                                ? rulerParts.ageText
                                  ? `${rulerParts.displayName} (${rulerParts.ageText})`
                                  : rulerParts.displayName
                                : "";
                              outcome = COPY.logOutcome_succession(newRulerName);

                              const heirParts = formatNameParts(e?.heir_name, e?.heir_age, e?.heir_short_id, e?.heir_id);
                              const heirName = heirParts.displayName
                                ? heirParts.ageText
                                  ? `${heirParts.displayName} (${heirParts.ageText})`
                                  : heirParts.displayName
                                : "";
                              if (heirName) details = COPY.logDetails_succession_heir(heirName);
                            } else if (kind === "marriage" || kind === "marriage_arranged" || kind === "marriage_resolved") {
                              title = COPY.prospectType_marriage;

                              const childId: string | null =
                                typeof e?.child_id === "string"
                                  ? e.child_id
                                  : typeof e?.subject_person_id === "string"
                                    ? e.subject_person_id
                                    : typeof e?.person_id === "string"
                                      ? e.person_id
                                      : null;

                              const childNameFromReg = personNameFromRegistry(childId);
                              const childParts = formatNameParts(
                                e?.child_name ?? e?.person_name ?? e?.subject_person_name,
                                e?.child_age ?? e?.person_age ?? e?.subject_person_age,
                                e?.child_short_id ?? e?.person_short_id ?? e?.subject_person_short_id,
                                e?.child_id ?? e?.person_id ?? e?.subject_person_id
                              );
                              const childName = childNameFromReg ?? (childParts.displayName
                                ? childParts.ageText
                                  ? `${childParts.displayName} (${childParts.ageText})`
                                  : childParts.displayName
                                : "");

                              const spouseId: string | null =
                                typeof e?.spouse_id === "string"
                                  ? e.spouse_id
                                  : typeof e?.spouse_person_id === "string"
                                    ? e.spouse_person_id
                                    : null;
                              const spouseNameFromReg = personNameFromRegistry(spouseId);
                              const spouseParts = formatNameParts(e?.spouse_name, e?.spouse_age, e?.spouse_short_id, e?.spouse_id);
                              const spouseName = spouseNameFromReg ?? (spouseParts.displayName
                                ? spouseParts.ageText
                                  ? `${spouseParts.displayName} (${spouseParts.ageText})`
                                  : spouseParts.displayName
                                : "");

                              const otherHouseName: string | null =
                                typeof e?.other_house_name === "string"
                                  ? e.other_house_name
                                  : typeof e?.otherHouseName === "string"
                                    ? e.otherHouseName
                                    : typeof e?.other_house_id === "string"
                                      ? houseNameFromRegistry(e.other_house_id)
                                      : typeof e?.from_house_id === "string"
                                        ? houseNameFromRegistry(e.from_house_id)
                                        : null;

                              if (childName && spouseName) outcome = `${childName} married ${spouseName}.`;
                              else if (childName && otherHouseName) outcome = `${childName} married into House ${otherHouseName}.`;
                              else if (childName) outcome = `${childName} married.`;

                              // Details: dowry + residence change (joined/left court).
                              const detailsParts: string[] = [];

                              const dowrySigned = typeof e?.dowry_signed_coin === "string" ? e.dowry_signed_coin : null;
                              if (dowrySigned) {
                                detailsParts.push(`Dowry: ${dowrySigned}.`);
                              } else {
                                const amt = typeof e?.dowry_amount === "number" && Number.isFinite(e.dowry_amount) ? Math.trunc(e.dowry_amount) : null;
                                const dir = typeof e?.dowry_direction === "string" ? e.dowry_direction : null;
                                if (amt !== null && amt !== 0) {
                                  const signed = amt > 0 ? `+${amt}` : String(amt);
                                  if (dir === "paid" || dir === "received") detailsParts.push(`Dowry: ${signed} coin (${dir}).`);
                                  else detailsParts.push(`Dowry: ${signed} coin.`);
                                }
                              }

                              function inferResidenceChange(): "spouse_joins" | "child_leaves" | null {
                                if (e?.spouse_joins_court === true || e?.spouse_joined_court === true) return "spouse_joins";
                                if (e?.child_leaves_court === true || e?.child_left_court === true) return "child_leaves";

                                const r = typeof e?.residence === "string" ? e.residence.toLowerCase() : null;
                                if (r) {
                                  if (r.includes("join") || r.includes("in") || r.includes("court")) return "spouse_joins";
                                  if (r.includes("leave") || r.includes("out")) return "child_leaves";
                                }

                                const courtDelta = typeof e?.court_delta === "number" && Number.isFinite(e.court_delta) ? Math.trunc(e.court_delta) : null;
                                if (courtDelta !== null) {
                                  if (courtDelta > 0) return "spouse_joins";
                                  if (courtDelta < 0) return "child_leaves";
                                }

                                // Fallback rule: daughters marry out; sons marry in.
                                const people: any = (ctx.preview_state as any).people;
                                const childRec: any = childId && people && typeof people === "object" ? people[childId] : null;
                                const sex = childRec && typeof childRec === "object" ? childRec.sex : null;
                                if (sex === "F") return "child_leaves";
                                if (sex === "M") return "spouse_joins";
                                return null;
                              }

                              const residenceChange = inferResidenceChange();
                              if (residenceChange === "spouse_joins") {
                                if (spouseName) detailsParts.push(`${COPY.marriageToast_spouseJoinsCourt(spouseName)} ${COPY.marriageToast_courtSizeIncreased}`);
                                else detailsParts.push(COPY.marriageToast_courtSizeIncreased);
                              } else if (residenceChange === "child_leaves") {
                                if (childName) detailsParts.push(`${COPY.marriageToast_childLeavesCourt(childName)} ${COPY.marriageToast_courtSizeDecreased}`);
                                else detailsParts.push(COPY.marriageToast_courtSizeDecreased);
                              }

                              details = detailsParts.length ? detailsParts.join(" ") : null;
                            }
                            const turnIndex = typeof e?.turn_index === "number" ? e.turn_index : null;
                            if (!title || !outcome || turnIndex === null) return null;
                            return (
                              <div key={idx} style={{ border: "1px solid #eee", padding: 8, background: "#fafafa" }}>
                                <div style={{ fontWeight: 700 }}>{title}</div>
                                <div style={{ fontSize: 12, opacity: 0.95, marginTop: 2 }}>{outcome}</div>
                                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Turn: {turnIndex}</div>
                                {details ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{details}</div> : null}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </div>

              <h4>Top drivers (3)</h4>
              {ctx.report.top_drivers.length ? (
                <ol>
                  {ctx.report.top_drivers.slice(0, 3).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ol>
              ) : (
                <div style={{ opacity: 0.7 }}>None</div>
              )}

              <h4 id={ANCHOR.food}>Food & stores</h4>
              <ul>
                <li>Weather multiplier: {ctx.report.weather_multiplier.toFixed(2)}</li>
                <li>Production: +{ctx.report.production_bushels} bushels</li>
                <li>
                  Consumption: -{totalConsumptionBushels !== null ? totalConsumptionBushels : ctx.report.consumption_bushels} bushels
                  <Tip
                    text={`Baseline consumption: ${baselineConsPerTurn} bushels this turn (${TURN_YEARS}y) per person. Builders cost +${builderExtraPerTurn} extra bushels this turn (${TURN_YEARS}y) each.`}
                  />
                  {hasConsumptionSplit ? (
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                      <div>
                        <b>{COPY.peasantConsumptionLabel}:</b> -{peasantConsumptionBushels} bushels <Tip text={COPY.peasantConsumptionHelper} />
                      </div>
                      <div>
                        <b>{COPY.courtConsumptionLabel}:</b> -{courtConsumptionBushels} bushels <Tip text={COPY.courtConsumptionHelper} />
                      </div>
                      <div style={{ marginTop: 4 }}>{COPY.courtEatsSameStores}</div>
                      <div>{COPY.consumptionReconcileNote}</div>
                    </div>
                  ) : null}
                </li>
                <li>
                  Spoilage: -{ctx.report.spoilage.loss_bushels} bushels ({(ctx.report.spoilage.rate * 100).toFixed(1)}%)
                </li>
              </ul>

              <details style={{ marginTop: 6 }}>
                <summary>Consumption breakdown</summary>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                  <div style={{ marginBottom: 6, opacity: 0.85 }}>All values are for this turn ({TURN_YEARS}y).</div>
                  <ul>
                    <li>
                      Farmers: {m.farmers} × {baselineConsPerTurn} = {consFarmers} bushels
                    </li>
                    <li>
                      Builders: {m.builders} × {builderConsPerTurn} = {consBuilders} bushels
                    </li>
                    <li>
                      Idle: {idle} × {baselineConsPerTurn} = {consIdle} bushels
                    </li>
                    {hasConsumptionSplit ? (
                      <li>
                        {COPY.courtConsumptionLabel}: {courtConsumptionBushels} bushels
                      </li>
                    ) : null}
                    <li>
                      Total:{" "}
                      {hasConsumptionSplit && courtConsumptionBushels !== null
                        ? consFarmers + consBuilders + consIdle + courtConsumptionBushels
                        : consFarmers + consBuilders + consIdle}{" "}
                      bushels
                    </li>
                  </ul>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    Builder premium: +{builderExtraPerTurn} bushels this turn ({TURN_YEARS}y) <b>per builder</b>.
                  </div>
                </div>
              </details>

              <h4 style={{ marginTop: 12 }}>Market</h4>
              <ul>
                <li>
                  Price: {ctx.report.market.price_per_bushel.toFixed(2)} coin/bushel
                </li>
                <li>
                  Sell cap: {ctx.report.market.sell_cap_bushels} bushels
                  <Tip text="Selling consumes 1 energy. Amount is trimmed to the market cap." />
                </li>
              </ul>

              <h4 style={{ marginTop: 12 }}>Obligations</h4>
              <ul>
                <li>
                  <b>{COPY.obligationsTotal}</b>: {fmtObAmount(totalObligations)}
                </li>
                <li>
                  {COPY.obligationsDueEntering}: {fmtObAmount(dueEntering)}
                </li>
                {accruedThisTurn ? (
                  <li>
                    {COPY.obligationsAccrued}: {fmtObAmount(accruedThisTurn)}
                  </li>
                ) : null}
                <li>
                  {COPY.obligationsArrears}: {fmtObAmount(arrearsCarried)}
                </li>
              </ul>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{COPY.obligationsHelper}</div>

              <h4 id={ANCHOR.prospects} style={{ marginTop: 12 }}>{COPY.prospects}</h4>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{COPY.prospectsHelper}</div>

              {(() => {
                const anyVisibleExpired = prospectsShown.some(
                  (p) => typeof p?.expires_turn === "number" && ctx.report.turn_index > (p.expires_turn as number)
                );
                const showExpiredMsg = hasProspectExpiredThisTurn && !anyVisibleExpired;

                if (prospectsTotalCount === 0) {
                  return (
                    <div style={{ opacity: 0.8 }}>
                      {COPY.prospectsEmpty_noneThisTurn}
                      {showExpiredMsg ? <div style={{ marginTop: 6 }}>{COPY.prospectExpiredThisTurnMessage}</div> : null}
                    </div>
                  );
                }

                if (prospectsShownCount === 0) {
                  return (
                    <div style={{ opacity: 0.8 }}>
                      {prospectsHiddenCount > 0 ? COPY.prospectsEmpty_noneShown : COPY.prospectsEmpty_noneAvailableYet}
                      {prospectsHiddenCount > 0 ? <div style={{ marginTop: 6 }}>{COPY.prospectsEmpty_noneShownHelper}</div> : null}
                      {showExpiredMsg ? <div style={{ marginTop: 6 }}>{COPY.prospectExpiredThisTurnMessage}</div> : null}
                    </div>
                  );
                }

                return (
                  <>
                    {showExpiredMsg ? <div style={{ fontSize: 12, marginTop: 6 }}>{COPY.prospectExpiredThisTurnMessage}</div> : null}

                    {prospectsHiddenCount > 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                        {COPY.prospectsShownHiddenSummary(prospectsShownCount, prospectsTotalCount, prospectsHiddenCount)}{" "}
                        <span title={COPY.prospectsHiddenTooltip}>ⓘ</span>
                      </div>
                    ) : null}

                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                      {prospectsShown.map((p, idx) => {
                        const id = typeof p?.id === "string" ? p.id : `prospect_${idx}`;
                        const t = typeof p?.type === "string" ? p.type : null;
                        const typeLabel = prospectTypeLabel(t);

                        const fromHouseId = typeof p?.from_house_id === "string" ? p.from_house_id : null;
                        const fromHouse = houseLabel(fromHouseId);
                        const partiesLine = fromHouse ? COPY.prospectFromToLine(fromHouse) : null;

                        const subject =
                          personNameFromRegistry(typeof p?.subject_person_id === "string" ? p.subject_person_id : null) ??
                          (typeof p?.subject_person_name === "string" ? p.subject_person_name : null) ??
                          null;

                        const summary = typeof p?.summary === "string" ? p.summary : "";

                        const reqs: any[] = Array.isArray(p?.requirements) ? p.requirements : [];
                        const reqTexts: string[] = reqs.map((r) => (typeof r?.text === "string" ? r.text : "")).filter(Boolean);

                        const costs = costsForProspect(p);
                        const anyCost = costs.coin !== 0 || costs.energy !== 0 || costs.bushels !== 0;

                        const eff = effectsSummary(p);

                        const u = typeof p?.uncertainty === "string" ? p.uncertainty : null;
                        const uLabel = uncertaintyLabel(u);

                        const expiresTurn = typeof p?.expires_turn === "number" ? p.expires_turn : null;
                        const nowTurn = ctx.report.turn_index;
                        const expired = expiresTurn !== null && nowTurn > expiresTurn;

                        const decided = getProspectDecision(id);
                        const allowedActions: any[] = Array.isArray(p?.actions) ? p.actions : [];
                        const canAccept = !expired && !decided && (allowedActions.length === 0 || allowedActions.includes("accept"));
                        const canReject = !expired && !decided && (allowedActions.length === 0 || allowedActions.includes("reject"));

                        return (
                          <div key={id} style={{ padding: 10, border: "1px solid #eee", background: "#fff" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                              <div style={{ fontWeight: 700 }}>{typeLabel}</div>
                              {expired ? (
                                <span style={{ fontSize: 12, border: "1px solid #ddd", padding: "2px 6px" }}>
                                  {COPY.prospectExpiredBadge}
                                </span>
                              ) : decided ? (
                                <span style={{ fontSize: 12, border: "1px solid #ddd", padding: "2px 6px" }}>
                                  {decided === "accept" ? COPY.prospectDecisionBadgeAccepted : COPY.prospectDecisionBadgeRejected}
                                </span>
                              ) : null}
                            </div>

                            {partiesLine ? <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{partiesLine}</div> : null}
                            {subject ? (
                              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                                {COPY.prospectSubjectLabel} {subject}
                              </div>
                            ) : null}

                            {/* v0.2.7.2 UI: marriage cards should show offered spouse identity (name + age) */}
                            {t === "marriage" ? (
                              (() => {
                                const spouseId: string | null =
                                  typeof (p as any)?.spouse_person_id === "string"
                                    ? ((p as any).spouse_person_id as string)
                                    : typeof (p as any)?.offer_person_id === "string"
                                      ? ((p as any).offer_person_id as string)
                                      : typeof (p as any)?.offer_personId === "string"
                                        ? ((p as any).offer_personId as string)
                                        : null;

                                const people: any = (ctx.preview_state as any).people;
                                const spouseRec: any = spouseId && people && typeof people === "object" ? people[spouseId] : null;
                                const spouseSex: string | null = spouseRec && typeof spouseRec === "object" ? spouseRec.sex : null;
                                const label = spouseSex === "F" ? "Bride" : spouseSex === "M" ? "Groom" : "Spouse";

                                const spouseName: string | null =
                                  personNameFromRegistry(spouseId) ??
                                  (typeof (p as any)?.spouse_name === "string" ? String((p as any).spouse_name) : null) ??
                                  (typeof (p as any)?.other_person_name === "string" ? String((p as any).other_person_name) : null);

                                const spouseAgeFromRec: number | null =
                                  spouseRec && typeof spouseRec === "object" && typeof spouseRec.age === "number" && Number.isFinite(spouseRec.age)
                                    ? Math.trunc(spouseRec.age)
                                    : null;

                                const spouseAge: number | null =
                                  typeof (p as any)?.spouse_age === "number" && Number.isFinite((p as any).spouse_age)
                                    ? Math.trunc((p as any).spouse_age)
                                    : spouseAgeFromRec;

                                const spouseText: string | null = (() => {
                                  if (!spouseName) return null;
                                  // If the registry name already includes age, don't double-add.
                                  if (spouseAge !== null && !spouseName.includes("Age")) return `${spouseName} (Age ${spouseAge})`;
                                  return spouseName;
                                })();

                                return spouseText ? (
                                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                                    {label}: {spouseText}
                                    {fromHouse ? ` — House ${fromHouse}` : ""}
                                  </div>
                                ) : null;
                              })()
                            ) : null}

                            {summary ? <div style={{ marginTop: 6 }}>{summary}</div> : null}

                            {t === "grant" ? (
                              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>{COPY.prospectGrantHelperLine}</div>
                            ) : null}

                            {t === "grant" && canReject && rejectHasStandingRisk(p) ? (
                              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{COPY.prospectGrantRejectNote}</div>
                            ) : null}

                            {reqTexts.length > 0 ? (
                              <div style={{ marginTop: 10, fontSize: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <b>{COPY.prospectRequirementsLabel}</b>
                                  <Tip text={COPY.prospectTooltip_requirements} />
                                </div>
                                <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                                  {reqTexts.map((t, i) => (
                                    <li key={i}>{t}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {anyCost ? (
                              <div style={{ marginTop: 10, fontSize: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <b>{COPY.prospectCostsLabel}</b>
                                  <Tip text={COPY.prospectTooltip_costs} />
                                </div>
                                <div style={{ marginTop: 6, display: "grid", gap: 2 }}>
                                  {costs.coin !== 0 ? (
                                    <div>
                                      Coin: {costs.coin}
                                    </div>
                                  ) : null}
                                  {costs.energy !== 0 ? (
                                    <div>
                                      Energy: {costs.energy}
                                    </div>
                                  ) : null}
                                  {costs.bushels !== 0 ? (
                                    <div>
                                      Bushels: {costs.bushels}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            {eff.coin !== undefined || eff.rel || eff.flags ? (
                              <div style={{ marginTop: 10, fontSize: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <b>{COPY.prospectEffectsLabel}</b>
                                </div>
                                <div style={{ marginTop: 6, display: "grid", gap: 2 }}>
                                  {typeof eff.coin === "number" ? (
                                    <div>
                                      Coin: {fmtSigned(eff.coin)}
                                    </div>
                                  ) : null}
                                  {eff.rel ? (
                                    <div>
                                      Relationships: {eff.rel}
                                    </div>
                                  ) : null}
                                  {eff.flags ? (
                                    <div>
                                      Flags: {eff.flags}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            {uLabel ? (
                              <div style={{ marginTop: 10, fontSize: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <b>{COPY.prospectConfidenceLabel}</b> {uLabel}
                                  <Tip text={COPY.prospectTooltip_confidence} />
                                </div>
                              </div>
                            ) : null}

                            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                              {expired && expiresTurn !== null
                                ? COPY.prospectExpiredAtEndOfTurn(expiresTurn)
                                : expiresTurn === nowTurn
                                  ? COPY.prospectExpiresThisTurn
                                  : expiresTurn !== null
                                    ? COPY.prospectExpiresEndOfTurn(expiresTurn)
                                    : null}{" "}
                              <Tip text={COPY.prospectTooltip_expiry} />
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              <button disabled={!canAccept} onClick={() => handleProspectAction(p, "accept")}>
                                {COPY.prospectAccept}
                              </button>
                              <button disabled={!canReject} onClick={() => handleProspectAction(p, "reject")}>
                                {COPY.prospectReject}
                              </button>
                            </div>

                            {expired ? (
                              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{COPY.prospectExpiredHint}</div>
                            ) : decided ? (
                              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{COPY.prospectDecisionRecorded}</div>
                            ) : null}
                          </div>
                        );
                      })
                      }
                    </div>

                    <details style={{ marginTop: 10 }}>
                      <summary>{COPY.prospectsLogTitle}</summary>
                      <div style={{ fontSize: 12, marginTop: 6 }}>
                        <div>{COPY.prospectsLogShown(prospectsShownCount, prospectsShownIds.length ? prospectsShownIds : undefined)}</div>
                        <div>{COPY.prospectsLogHidden(prospectsHiddenCount, prospectsHiddenIds.length ? prospectsHiddenIds : undefined)}</div>
                        {prospectsHiddenCount > 0 ? <div style={{ marginTop: 6 }}>{COPY.prospectsHiddenTooltip}</div> : null}

                        {prospectLogLines.length > 0 ? (
                          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                            {Object.entries(
                              prospectLogLines.reduce((acc: Record<string, string[]>, it) => {
                                const k = String(it.turn_index);
                                if (!acc[k]) acc[k] = [];
                                acc[k].push(it.line);
                                return acc;
                              }, {})
                            )
                              .sort((a, b) => Number(a[0]) - Number(b[0]))
                              .map(([turn, lines]) => (
                                <div key={turn}>
                                  <div style={{ fontWeight: 700 }}>Turn {turn}</div>
                                  <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                                    {lines.map((line, i) => (
                                      <li key={i}>{line}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    </details>
                  </>
                );
              })()}

              <h4 style={{ marginTop: 12 }}>{COPY.knownHouses}</h4>
              {knownHouses.length === 0 ? (
                <div style={{ opacity: 0.7 }}>{COPY.knownHousesEmpty}</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {knownHousesMain.map((h, idx) => {
                    const houseName = String(h?.house_name ?? h?.houseName ?? h?.name ?? "").trim();
                    const tier = String(h?.tier ?? "").trim();

                    const headNameRaw = h?.head_name ?? h?.head?.head_name ?? h?.head?.name ?? "";
                    const headAgeRaw = h?.head_age ?? h?.head?.head_age ?? h?.head?.age;
                    const headStatusRaw =
                      h?.head_status ??
                      h?.head?.head_status ??
                      (typeof h?.head?.alive === "boolean" ? (h.head.alive ? "Alive" : "Deceased") : "");
                    const headShortIdRaw = h?.head_short_id ?? h?.head?.short_id;
                    const headIdRaw = h?.head_id ?? h?.head?.id;

                    const headParts = formatNameParts(headNameRaw, headAgeRaw, headShortIdRaw, headIdRaw);

                    const heirRaw = h?.heir_indicator ?? h?.heir_indicator_enum ?? h?.heir_indicator_str;
                    const hasMaleHeirRaw = h?.has_male_heir;
                    const heiressPossibleRaw = h?.heiress_possible;

                    let heirIndicator: string | null = null;
                    const heirStr = typeof heirRaw === "string" ? heirRaw.trim() : "";
                    if (heirStr === COPY.heirIndicator_hasMaleHeir) heirIndicator = COPY.heirIndicator_hasMaleHeir;
                    else if (heirStr === COPY.heirIndicator_noMaleHeir) heirIndicator = COPY.heirIndicator_noMaleHeir;
                    else if (heirStr === COPY.heirIndicator_heiressPossible) heirIndicator = COPY.heirIndicator_heiressPossible;
                    else {
                      const norm = heirStr.toLowerCase().replace(/[^a-z]/g, "");
                      if (norm.includes("heiress")) heirIndicator = COPY.heirIndicator_heiressPossible;
                      else if (norm.includes("hasmale") || norm.includes("maleheir") || norm.includes("hasheir")) heirIndicator = COPY.heirIndicator_hasMaleHeir;
                      else if (norm.includes("nomale")) heirIndicator = COPY.heirIndicator_noMaleHeir;
                      else if (typeof heiressPossibleRaw === "boolean" && heiressPossibleRaw) heirIndicator = COPY.heirIndicator_heiressPossible;
                      else if (typeof hasMaleHeirRaw === "boolean") heirIndicator = hasMaleHeirRaw ? COPY.heirIndicator_hasMaleHeir : COPY.heirIndicator_noMaleHeir;
                    }

                    const rel = h?.relationship ?? h?.relation_to_player ?? h?.rel_to_player ?? null;
                    const a = typeof (rel?.allegiance ?? h?.allegiance) === "number" ? Number(rel?.allegiance ?? h?.allegiance) : null;
                    const r = typeof (rel?.respect ?? h?.respect) === "number" ? Number(rel?.respect ?? h?.respect) : null;
                    const t = typeof (rel?.threat ?? h?.threat) === "number" ? Number(rel?.threat ?? h?.threat) : null;
                    const showRel = a !== null && r !== null && t !== null;

                    return (
                      <div key={idx} style={{ padding: 10, border: "1px solid #eee", background: "#fff" }}>
                        {houseName ? <div style={{ fontWeight: 700 }}>{COPY.housePrefix(houseName)}</div> : null}

                        {tier ? (
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.95 }}>
                            <b>{COPY.tierLabel}</b> {tier} <Tip text={COPY.tooltipTier} />
                          </div>
                        ) : null}

                        {headParts.displayName ? (
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.95 }}>
                            <b>{COPY.headLabel}</b> {headParts.displayName}
                            {headParts.ageText ? ` (${headParts.ageText})` : ""}
                            {headStatusRaw ? ` — ${headStatusRaw}` : ""}
                          </div>
                        ) : null}

                        {heirIndicator ? (
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.95 }}>
                            {heirIndicator} <Tip text={COPY.tooltipHeirIndicator} />
                          </div>
                        ) : null}

                        {showRel ? (
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.95 }}>
                            <b>Allegiance:</b> {a} <Tip text={COPY.tooltipAllegiance} /> · <b>Respect:</b> {r}{" "}
                            <Tip text={COPY.tooltipRespect} /> · <b>Threat:</b> {t} <Tip text={COPY.tooltipThreat} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {hasMoreKnownHouses ? (
                    <button onClick={() => setShowAllKnownHouses((v) => !v)} style={{ fontSize: 12, width: "fit-content" }}>
                      {showAllKnownHouses ? COPY.hideDetails : COPY.showDetails}
                    </button>
                  ) : null}
                </div>
              )}

    <h4 id={ANCHOR.events} style={{ marginTop: 12 }}>Events</h4>
              {ctx.report.events.length === 0 ? <div>None</div> : null}
              {ctx.report.events.map((e) => {
                const { player } = splitWhyNotes(e.why.notes);
                return (
                  <div key={e.id} style={{ padding: 8, border: "1px solid #ddd", marginBottom: 6 }}>
                    <div>
                      <b>{e.title}</b> <span style={{ opacity: 0.7 }}>({e.category})</span>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                      <b>{COPY.prospectConfidenceLabel}</b> {COPY.prospectConfidence_known}
                    </div>

                    {player.length ? (
                      <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
                        <b>Why:</b>
                        <ul style={{ margin: "4px 0 0 18px" }}>
                          {player.map((n, idx) => (
                            <li key={idx}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <ul style={{ marginTop: 6 }}>
                      {e.effects.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {!state.game_over ? (
            <div style={{ marginTop: 12, padding: 12, border: "1px solid #ccc" }}>
              <h3>Decisions (3–5)</h3>
              <div style={{ opacity: 0.8, fontSize: 12, lineHeight: 1.4 }}>
                <div>
                  Energy available: {ctx.preview_state.house.energy.available}/{ctx.preview_state.house.energy.max}.
                </div>
                <div>{COPY.laborTimingProduction}</div>
                <div>{COPY.laborTimingBuilders}</div>
                <div>{COPY.laborDeltaCapClarifier}</div>
                <div>
                  Max labor shift this turn: <b>{ctx.max_labor_shift}</b>.
                </div>
                {laborLimitExceeded ? (
                  <div style={{ color: "#c00", fontWeight: 700 }}>
                    {COPY.laborDeltaCapError(ctx.max_labor_shift, laborRequested)}
                  </div>
                ) : null}
              </div>

              {laborOversubscribed ? (
                <div style={{ padding: 10, border: "1px solid #f55", background: "#fff5f5", marginTop: 10, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{COPY.laborOversubscribedTitle}</div>
                  <div style={{ marginTop: 4 }}>{COPY.laborOversubscribedBody(laborAssignedNextTurn, laborAvailableNextTurn)}</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{COPY.laborOversubscribedHelper}</div>
                </div>
              ) : null}

              {/* Labor */}
              <div id={ANCHOR.labor} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <label>Farmers (next turn): </label>
                  <input
                    type="number"
                    value={decisions.labor.desired_farmers}
                    onChange={(e) =>
                      setDecisions((d) => ({ ...d, labor: { ...d.labor, desired_farmers: Number(e.target.value) } }))
                    }
                    style={{ width: 80 }}
                  />
                </div>
                <div>
                  <label>
                    Builders (next turn):
                    <Tip
                      text={`Builders contribute to construction progress this turn (rate = builders × ${BUILD_RATE_PER_BUILDER_PER_TURN}). They also consume +${builderExtraPerTurn} extra bushels this turn (${TURN_YEARS}y) each.`}
                    />
                    {" "}
                  </label>
                  <input
                    type="number"
                    value={decisions.labor.desired_builders}
                    onChange={(e) =>
                      setDecisions((d) => ({ ...d, labor: { ...d.labor, desired_builders: Number(e.target.value) } }))
                    }
                    style={{ width: 80 }}
                  />
                </div>

                {/* Sell */}
                <div>
                  <label>Sell bushels: </label>
                  <input
                    type="number"
                    value={decisions.sell.sell_bushels}
                    onChange={(e) => setDecisions((d) => ({ ...d, sell: { ...d.sell, sell_bushels: Number(e.target.value) } }))}
                    style={{ width: 100 }}
                  />
                  <span style={{ opacity: 0.8 }}> (cap {ctx.report.market.sell_cap_bushels})</span>
                </div>
              </div>

              {/* Obligations (payments are manual) */}
              <div id={ANCHOR.obligations} style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee" }}>
                <h4 style={{ margin: 0 }}>Obligations</h4>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{COPY.obligationsHelper}</div>
                {(() => {
                  const payCoin = Math.max(0, Math.min(Math.max(0, m.coin), Math.trunc(Number.isFinite(decisions.obligations.pay_coin) ? decisions.obligations.pay_coin : 0)));
                  const payBushels = Math.max(
                    0,
                    Math.min(Math.max(0, m.bushels_stored), Math.trunc(Number.isFinite(decisions.obligations.pay_bushels) ? decisions.obligations.pay_bushels : 0))
                  );

                  const coinAfterArrears = Math.max(0, payCoin - Math.max(0, arrearsCarried.coin));
                  const bushelsAfterArrears = Math.max(0, payBushels - Math.max(0, arrearsCarried.bushels));

                  const coinToDue = Math.min(Math.max(0, dueEntering.coin), coinAfterArrears);
                  const bushelsToDue = Math.min(Math.max(0, dueEntering.bushels), bushelsAfterArrears);

                  const coinShortfall = Math.max(0, Math.max(0, dueEntering.coin) - coinToDue);
                  const bushelsShortfall = Math.max(0, Math.max(0, dueEntering.bushels) - bushelsToDue);

                  if (coinShortfall <= 0 && bushelsShortfall <= 0) return null;

                  return (
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      Shortfall → arrears: {fmtObAmount({ coin: coinShortfall, bushels: bushelsShortfall })}
                    </div>
                  );
                })()}


                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10, fontSize: 12 }}>
                  <div>
                    <div>
                      <b>{COPY.obligationsTotal}</b>: {fmtObAmount(totalObligations)}
                    </div>
                    <div style={{ marginTop: 4 }}>{COPY.obligationsDueEntering}: {fmtObAmount(dueEntering)}</div>
                    {accruedThisTurn ? (
                      <div style={{ marginTop: 4 }}>{COPY.obligationsAccrued}: {fmtObAmount(accruedThisTurn)}</div>
                    ) : null}
                    <div style={{ marginTop: 4 }}>{COPY.obligationsArrears}: {fmtObAmount(arrearsCarried)}</div>
                  </div>

                  <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                    <div>
                      <label>
                        Pay coin:
                        <Tip text="Payments apply to arrears first, then this turn’s dues (tax/tithe). Unpaid dues become arrears at end of turn." />
                        {" "}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, m.coin)}
                        value={decisions.obligations.pay_coin}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const v = Number.isFinite(raw) ? Math.trunc(raw) : 0;
                          const clamped = Math.max(0, Math.min(Math.max(0, m.coin), v));
                          setDecisions((d) => ({ ...d, obligations: { ...d.obligations, pay_coin: clamped } }));
                        }}
                        style={{ width: 100 }}
                      />
                    </div>

                    <div>
                      <label>Pay bushels: </label>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, m.bushels_stored)}
                        value={decisions.obligations.pay_bushels}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const v = Number.isFinite(raw) ? Math.trunc(raw) : 0;
                          const clamped = Math.max(0, Math.min(Math.max(0, m.bushels_stored), v));
                          setDecisions((d) => ({ ...d, obligations: { ...d.obligations, pay_bushels: clamped } }));
                        }}
                        style={{ width: 120 }}
                      />
                    </div>

                    {ob.war_levy_due ? (
                      <div>
                        <label>War levy: </label>
                        <select
                          value={decisions.obligations.war_levy_choice ?? "ignore"}
                          onChange={(e) =>
                            setDecisions((d) => ({
                              ...d,
                              obligations: { ...d.obligations, war_levy_choice: e.target.value as any }
                            }))
                          }
                        >
                          <option value="coin">Pay coin</option>
                          <option value="men">Provide men</option>
                          <option value="ignore">Refuse</option>
                        </select>
                        <span style={{ opacity: 0.8, marginLeft: 8 }}>
                          Due: {ob.war_levy_due.kind === "men_or_coin" ? `${ob.war_levy_due.men} men OR ${ob.war_levy_due.coin} coin` : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Construction */}
              <div style={{ marginTop: 10 }}>
                <h4>Improvement slot</h4>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    disabled={Boolean(m.construction)}
                    title={m.construction ? "Disallowed while a project is active (must abandon first)." : "Pick an improvement to start."}
                    onChange={(e) =>
                      setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "start", improvement_id: e.target.value } }))
                    }
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select project…
                    </option>
                    {IMPROVEMENT_IDS.map((id) => (
                      <option key={id} value={id} disabled={Array.isArray(m.improvements) ? m.improvements.includes(id) : false}>
                        {IMPROVEMENTS[id].name} (coin {IMPROVEMENTS[id].coin_cost}, req {IMPROVEMENTS[id].required})
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "none" } }))}>Clear</button>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  Construction is <b>not instant</b>. Progress each turn = builders × {BUILD_RATE_PER_BUILDER_PER_TURN}. Builders also consume +{builderExtraPerTurn} extra bushels this turn ({TURN_YEARS}y) each.
                </div>
              </div>

              {/* Marriage */}
              {mw && prospectsTotalCount === 0 ? (
                <div style={{ marginTop: 10 }}>
                  <h4>Marriage Window</h4>
                  <div style={{ opacity: 0.85 }}>Eligible children: {mw.eligible_child_ids.join(", ")}</div>

                  <div style={{ marginTop: 10, padding: 8, border: "1px solid #eee" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Eligible Maidens (Local)</div>
                    {eligibleMaidensLocalRaw === null ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>(Not available in this build)</div>
                    ) : Array.isArray(eligibleMaidensLocalRaw) ? (
                      eligibleMaidensLocalRaw.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>None</div>
                      ) : (
                        <ul style={{ margin: "0 0 0 18px" }}>
                          {eligibleMaidensLocalRaw.slice(0, 20).map((it: any, i: number) => {
                            const person_id: string =
                              typeof it === "string"
                                ? it
                                : typeof it?.person_id === "string"
                                  ? it.person_id
                                  : typeof it?.id === "string"
                                    ? it.id
                                    : "";

                            const p: any = person_id ? (ctx.preview_state as any)?.people?.[person_id] : null;

                            const name: string =
                              (typeof (it as any)?.name === "string" && (it as any).name) ||
                              (p && typeof p.name === "string" ? p.name : "") ||
                              person_id ||
                              "(Not available in this build)";

                            const age: number | null =
                              typeof (it as any)?.age === "number" && Number.isFinite((it as any).age)
                                ? Math.trunc((it as any).age)
                                : p && typeof p.age === "number" && Number.isFinite(p.age)
                                  ? Math.trunc(p.age)
                                  : null;

                            const house_label: string =
                              (typeof (it as any)?.house_label === "string" && (it as any).house_label) ||
                              (typeof (it as any)?.house_name === "string" && (it as any).house_name ? `House ${(it as any).house_name}` : "") ||
                              "";

                            return (
                              <li key={`${person_id || i}`} style={{ fontSize: 12, opacity: 0.85, marginBottom: 2 }}>
                                {name}
                                {age !== null ? ` (Age ${age})` : ""}
                                {house_label ? ` — ${house_label}` : ""}
                              </li>
                            );
                          })}
                        </ul>
                      )
                    ) : (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>(Not available in this build)</div>
                    )}
                  </div>
                  {mw.offers.map((o, idx) => (
                    <div key={idx} style={{ padding: 8, border: "1px solid #ddd", marginTop: 6 }}>
                      <b>{o.house_label}</b> — Dowry {o.dowry_coin_net >= 0 ? "+" : ""}
                      {o.dowry_coin_net} coin — tags: {o.risk_tags.join(", ")}
                      <div style={{ marginTop: 6 }}>
                        <button
                          disabled={o.dowry_coin_net < 0 && m.coin < Math.abs(o.dowry_coin_net)}
                          onClick={() =>
                            setDecisions((d) => ({
                              ...d,
                              marriage: { kind: "marriage", action: "accept", child_id: mw.eligible_child_ids[0], offer_index: idx }
                            }))
                          }
                          title={o.dowry_coin_net < 0 && m.coin < Math.abs(o.dowry_coin_net) ? "Insufficient coin for negative dowry (disabled)." : ""}
                        >
                          Choose this offer
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "reject_all" } }))}>Reject all</button>
                    <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "scout" } }))}>Scout</button>
                    <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "none" } }))}>Clear</button>
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button onClick={advanceTurn} disabled={laborLimitExceeded}>Advance Turn</button>
                <button onClick={() => downloadJson(`run_summary_${state.run_seed}.json`, buildRunSummary(state))}>Export Run Summary</button>
                <button onClick={() => downloadJson(`run_export_${state.run_seed}.json`, state)}>Export Full Run JSON</button>
              </div>
            </div>
          ) : null}
        </div>
      );
    }
  }

  return <>{content}</>;
}
