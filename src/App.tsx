import React, { useEffect, useMemo, useState } from "react";
import { APP_VERSION } from "./version";
import { createNewRun, proposeTurn, applyDecisions } from "./sim";
import type { GameOverState, RunState, TurnDecisions } from "./sim/types";
import { buildRunSummary } from "./sim/exports";
import { NewRunScreen } from "./ui/panels/NewRunScreen";
import { PlayScreen } from "./ui/panels/PlayScreen";
import { RunLogScreen } from "./ui/panels/RunLogScreen";
import { TURN_YEARS } from "./sim/constants";

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
  intelTitle: "Intel",
  intelEmpty: "No tracked intel yet.",
  intelCurrentTurn: "This turn",
  intelMemory: "Remembered",
  intelCategoryLabel: "Category:",
  intelPhaseLabel: "Phase:",
  intelTurnLabel: "Turn:",
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
  laborTimingProduction: "Labor assignments below change next turn's harvest and upkeep. They do not rewrite the resolved ledger above.",
  laborTimingBuilders: "Construction progress shown above is already resolved. The builder count below only changes the next turn.",
  laborDeltaCapError: (max: number, requested: number) =>
    `Labor change limit exceeded. Max ${max} this turn; requested ${requested}.`,
  laborDeltaCapClarifier: "The labor change limit applies to the new plan below, not the chronicle above.",

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
  turnSummary_last3Years: "Resolved last 3 years",
  turnSummary_nowChoose: "Set next turn",
  gameplayOverviewEyebrow: "Gameplay Chronicle",
  gameplayOverviewHelper: "Resolved above: the last 3 years. Choose below: the next turn's response.",
  resourceChipHelper: "Open a chip to trace the deeper ledger or its focused detail sheet.",
  manorStateTimingHelper: "This snapshot already includes the resolved harvest, market, and event pressure from the last turn.",
  turnReportTimingHelper: "Use this card to read what already happened before you set new orders below.",
  decisionsTimingHelper: "These controls set the next turn. They do not rewrite the chronicle above.",

  // v0.2.7 binding copy (docs/ux/v0.2.7_copy.md)
  diffLedgerTitle: "Diff Ledger",
  diffLedgerHelper: "Biggest changes from the resolved last 3 years, with a one-line why.",
  diffLedgerExplainChanges: "Explain Changes",
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
  const [allPeopleFilter, setAllPeopleFilter] = useState<string>("");
  const [relationshipDrawerTab, setRelationshipDrawerTab] = useState<"house" | "person">("house");
  const [relationshipDrawerQuery, setRelationshipDrawerQuery] = useState<string>("");

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
      <NewRunScreen
        appVersion={APP_VERSION}
        onGenerateSeed={() => setSeed(`run_${Date.now()}`)}
        onNewRun={newRun}
        onSeedChange={setSeed}
        seed={seed}
        turnYears={TURN_YEARS}
      />
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
        <RunLogScreen
          filter={allPeopleFilter}
          onBack={() => setScreen("play")}
          onExportFullRunJson={() => downloadJson(`run_export_${state.run_seed}.json`, state)}
          onExportRunSummary={() => downloadJson(`run_summary_${state.run_seed}.json`, buildRunSummary(state))}
          onFilterChange={setAllPeopleFilter}
          state={state}
        />
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
      content = (
        <PlayScreen
          copy={COPY}
          ctx={ctx}
          decisions={decisions}
          gameOverReasonCopy={GAME_OVER_REASON_COPY}
          onAdvanceTurn={advanceTurn}
          onExportFullRunJson={() => downloadJson(`run_export_${state.run_seed}.json`, state)}
          onExportRunSummary={() => downloadJson(`run_summary_${state.run_seed}.json`, buildRunSummary(state))}
          onOpenLog={() => setScreen("log")}
          onOpenNewRun={() => setScreen("new")}
          relationshipDrawerQuery={relationshipDrawerQuery}
          relationshipDrawerTab={relationshipDrawerTab}
          setDecisions={setDecisions}
          setRelationshipDrawerQuery={setRelationshipDrawerQuery}
          setRelationshipDrawerTab={setRelationshipDrawerTab}
          setShowAllKnownHouses={setShowAllKnownHouses}
          setShowHouseholdDetails={setShowHouseholdDetails}
          setToast={setToast}
          showAllKnownHouses={showAllKnownHouses}
          showHouseholdDetails={showHouseholdDetails}
          state={state}
          toast={toast}
        />
      );
    }
  }

  return <>{content}</>;
}
