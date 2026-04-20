import React, { useMemo, useState } from "react";
import { IMPROVEMENT_IDS, IMPROVEMENTS } from "../../content/improvements";
import {
  BUILD_RATE_PER_BUILDER_PER_TURN,
  BUILDER_EXTRA_BUSHELS_PER_YEAR,
  BUSHELS_PER_PERSON_PER_YEAR,
  TURN_YEARS
} from "../../sim/constants";
import type { RunState, TurnContext, TurnDecisions } from "../../sim/types";
import { buildHouseDossierSurface, listHouseDossierIds } from "../houseDossierView";
import { buildMarriageWorkflowSurface } from "../marriageWorkflowView";
import { buildPersonCardSurface } from "../personCardView";
import {
  buildHouseIndexes,
  buildParentsIndex,
  fmtMult,
  fmtSigned
} from "../viewHelpers";
import {
  buildEconomyPricingSurface,
  buildObligationTiming,
  costsForProspect as getProspectCosts,
  effectsSummary as summarizeProspectEffects,
  fmtObAmount,
  getEligibleMaidensLocalRaw,
  getKnownHouses,
  getProspectDecision as findProspectDecision,
  getProspectsWindowState,
  hasSufficientResourcesForCosts as prospectCostsSufficient,
  houseLabel as resolveHouseLabel,
  parsePopulationChangeBreakdown,
  parseUnrestBreakdown,
  personNameFromRegistry as resolvePersonNameFromRegistry,
  prospectTypeLabel as labelProspectType,
  readCourtRosterFromSnapshot,
  rejectHasStandingRisk as prospectRejectHasStandingRisk,
  requirementsMetForProspect as prospectRequirementsMet,
  summarizePopulationChange,
  uncertaintyLabel as labelUncertainty
} from "../playViewModel";
import {
  PLAY_ANCHORS,
  buildCouncilAgendaItems,
  buildDiffLedgerItems
} from "../playScreenModel";
import {
  buildReceiptViewerData,
  createExplainChangesRoute,
  createResourceChipRoute,
  receiptViewerSubtitle,
  receiptViewerTitle,
  selectCounterpartyReceiptSections,
  selectGroupedReceiptSections,
  selectRawReceiptPhases,
  type ReceiptViewerMode,
  type ReceiptViewerRoute
} from "../playScreenReceipts";
import { buildCourtDecisionBudgetSurface } from "../playScreenCourtBudget";
import {
  buildPortfolioEvidenceScope,
  buildPortfolioMapCheckpoint,
  buildPortfolioScopeContract,
  selectPortfolioManor,
  type PortfolioMapTarget,
  type PortfolioScopeMode
} from "../playScreenPortfolio";
import {
  buildObligationsCounterpartyContract,
  createObligationsModalRoute,
  obligationsModalSubtitle,
  obligationsModalTitle,
  selectObligationsCounterpartySections,
  type ObligationsModalFocus,
  type ObligationsModalRoute
} from "../playScreenObligations";
import {
  PLAY_SCREEN_DEBUG_ACCORDION_SUMMARY,
  PLAY_SCREEN_DEBUG_SURFACES
} from "../playScreenChrome";
import { buildPlaytestOpsExportCopy } from "../playtestOpsExport";
import {
  resolveGameOverReasonLabel,
  resolveProspectAcceptCopy,
  resolveProspectDecisionToast
} from "../playScreenExperienceCopy";
import { PLAY_SCREEN_CARD_ORDER, type PlayScreenCardId, type StickyResourceChip, buildStickyResourceChips } from "../playScreenLayout";
import { buildTopologyDebugSurface } from "../playScreenTopology";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_EYEBROW_STYLE,
  PLAY_SCREEN_HEADER_HELPER_STYLE,
  PLAY_SCREEN_PAGE_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_SIGIL_STYLE,
  PLAY_SCREEN_THEME,
  PLAY_SCREEN_TIMING_PILL_STYLE
} from "../playScreenTheme";
import { buildIntelSections } from "../intelModel";
import { CouncilAgendaPanel } from "./CouncilAgendaPanel";
import { DebugAccordion } from "./DebugAccordion";
import { DecisionsPanel } from "./DecisionsPanel";
import { DiffLedgerPanel } from "./DiffLedgerPanel";
import { EventsPanel } from "./EventsPanel";
import { HouseDossierPanel } from "./HouseDossierPanel";
import { IntelPanel } from "./IntelPanel";
import { KnownHousesPanel } from "./KnownHousesPanel";
import { ManorStatePanel } from "./ManorStatePanel";
import { ModalSheet } from "./ModalSheet";
import { ObligationsDetailPanel } from "./ObligationsDetailPanel";
import { PersonCardPanel } from "./PersonCardPanel";
import { PortfolioOverviewPanel } from "./PortfolioOverviewPanel";
import { ProspectsPanel } from "./ProspectsPanel";
import { ReceiptsViewerPanel } from "./ReceiptsViewerPanel";
import { RelationshipDrawerPanel } from "./RelationshipDrawerPanel";
import { StickyResourceChips } from "./StickyResourceChips";
import { TopologyDebugPanel } from "./TopologyDebugPanel";
import { TurnReportPanel } from "./TurnReportPanel";

type ProspectDecisionAction = { prospect_id: string; action: "accept" | "reject" };
type PlayDecisions = TurnDecisions & {
  prospects?: { kind: "prospects"; actions: ProspectDecisionAction[] };
};
type ToastState = { kind: "ok" | "error"; message: string } | null;

type PlayScreenProps = {
  copy: any;
  ctx: TurnContext;
  decisions: PlayDecisions;
  gameOverReasonCopy: Record<string, string>;
  onAdvanceTurn: () => void;
  onCenterSelectedHolding?: (target: PortfolioMapTarget) => void;
  onExportFullRunJson: () => void;
  onExportRunSummary: () => void;
  onOpenLog: () => void;
  onOpenNewRun: () => void;
  relationshipDrawerQuery: string;
  relationshipDrawerTab: "house" | "person";
  setDecisions: React.Dispatch<React.SetStateAction<any>>;
  setRelationshipDrawerQuery: React.Dispatch<React.SetStateAction<string>>;
  setRelationshipDrawerTab: React.Dispatch<React.SetStateAction<"house" | "person">>;
  setShowAllKnownHouses: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHouseholdDetails: React.Dispatch<React.SetStateAction<boolean>>;
  setToast: React.Dispatch<React.SetStateAction<ToastState>>;
  showAllKnownHouses: boolean;
  showHouseholdDetails: boolean;
  state: RunState;
  toast: ToastState;
};

export function PlayScreen({
  copy,
  ctx,
  decisions,
  gameOverReasonCopy,
  onAdvanceTurn,
  onCenterSelectedHolding,
  onExportFullRunJson,
  onExportRunSummary,
  onOpenLog,
  onOpenNewRun,
  relationshipDrawerQuery,
  relationshipDrawerTab,
  setDecisions,
  setRelationshipDrawerQuery,
  setRelationshipDrawerTab,
  setShowAllKnownHouses,
  setShowHouseholdDetails,
  setToast,
  showAllKnownHouses,
  showHouseholdDetails,
  state,
  toast
}: PlayScreenProps) {
  const [activeHouseDossierId, setActiveHouseDossierId] = useState<string | null>(null);
  const [obligationsModalRoute, setObligationsModalRoute] = useState<ObligationsModalRoute | null>(null);
  const [activePersonCardId, setActivePersonCardId] = useState<string | null>(null);
  const [portfolioScopeMode, setPortfolioScopeMode] = useState<PortfolioScopeMode>("portfolio");
  const [selectedPortfolioManorId, setSelectedPortfolioManorId] = useState<string | null>(null);
  const [receiptViewerRoute, setReceiptViewerRoute] = useState<ReceiptViewerRoute | null>(null);
  const m = ctx.preview_state.manor;
  const ob = ctx.preview_state.manor.obligations;
  const mw = ctx.marriage_window;

  const pfStateAny: any = ctx.preview_state as any;
  const pfPeopleRec: any = pfStateAny?.people && typeof pfStateAny.people === "object" ? pfStateAny.people : {};
  const pfKinEdges: any[] = Array.isArray(pfStateAny?.kinship_edges)
    ? pfStateAny.kinship_edges
    : Array.isArray(pfStateAny?.kinship)
      ? pfStateAny.kinship
      : [];
  const pfParentsByChild = buildParentsIndex(pfKinEdges);
  const pfHouseIx = buildHouseIndexes(pfStateAny?.houses);

  const eligibleMaidensLocalRaw = getEligibleMaidensLocalRaw(ctx, mw);
  const beforeManor = state.manor;

  const deltaPop = m.population - beforeManor.population;
  const deltaBushels = m.bushels_stored - beforeManor.bushels_stored;
  const deltaCoin = m.coin - beforeManor.coin;
  const deltaUnrest = m.unrest - beforeManor.unrest;

  const popChangeLines = parsePopulationChangeBreakdown(ctx.report as any, {
    deaths: copy.populationChange_deaths,
    runaways: copy.populationChange_runaways
  });
  const popChangeSummary = summarizePopulationChange(popChangeLines);

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

  const knownHousesRaw: any =
    (ctx.report as any)?.known_houses ??
    (ctx.report as any)?.knownHouses ??
    (ctx.preview_state as any)?.known_houses ??
    (ctx.preview_state as any)?.knownHouses ??
    (ctx.preview_state as any)?.house?.known_houses ??
    (ctx.preview_state as any)?.house?.knownHouses ??
    null;
  const knownHouses: any[] = getKnownHouses(ctx.preview_state, knownHousesRaw);
  const knownHousesMain = showAllKnownHouses ? knownHouses : knownHouses.slice(0, 5);
  const hasMoreKnownHouses = knownHouses.length > 5;
  const intelSections = useMemo(() => buildIntelSections({ state, ctx }), [state, ctx]);
  const pricingSurface = useMemo(() => buildEconomyPricingSurface(ctx.preview_state), [ctx.preview_state]);
  const playtestOpsExportCopy = useMemo(() => buildPlaytestOpsExportCopy(state.run_seed), [state.run_seed]);
  const portfolioContract = useMemo(() => buildPortfolioScopeContract(ctx.preview_state), [ctx.preview_state]);
  const activePortfolioManor = portfolioContract ? selectPortfolioManor(portfolioContract, selectedPortfolioManorId) : null;
  const portfolioEvidenceScope = buildPortfolioEvidenceScope({
    contract: portfolioContract,
    scopeMode: portfolioScopeMode,
    selectedManorId: selectedPortfolioManorId
  });

  const prospectsWindowRaw: any =
    (ctx as any).prospects_window ??
    (ctx as any).prospectsWindow ??
    (ctx.report as any)?.prospects_window ??
    (ctx.report as any)?.prospectsWindow ??
    null;

  const {
    prospectsAll,
    prospectsShownIds,
    prospectsHiddenIds,
    prospectsShown,
    prospectsTotalCount,
    prospectsShownCount,
    prospectsHiddenCount
  } = getProspectsWindowState(prospectsWindowRaw);

  const prospectLogLines: Array<{ turn_index: number; line: string }> = useMemo(() => {
    const lines: Array<{ turn_index: number; line: string }> = [];
    const reports: Array<{ turn_index: number; report: any }> = [
      ...((state.log ?? []).map((turn: any) => ({
        turn_index: typeof turn?.processed_turn_index === "number" ? turn.processed_turn_index : turn.turn_index,
        report: turn.report
      })) as any),
      { turn_index: ctx.report.turn_index, report: ctx.report }
    ];

    const summaryById = new Map<string, string>();
    for (const { report } of reports) {
      const events: any[] | undefined = (report as any)?.prospects_log;
      if (!Array.isArray(events)) continue;
      for (const event of events) {
        if (event && event.kind === "prospect_generated" && typeof event.prospect_id === "string" && event.prospect && typeof event.prospect === "object") {
          const summary = (event.prospect as any).summary;
          if (typeof summary === "string") summaryById.set(event.prospect_id, summary);
        }
      }
    }

    function formatProspectLog(event: any): string | null {
      if (!event || typeof event !== "object") return null;
      if (event.kind === "prospect_generated") {
        const summary = typeof event.prospect?.summary === "string" ? event.prospect.summary : summaryById.get(event.prospect_id) ?? event.type;
        return copy.prospectLog_generated(event.type, summary);
      }
      if (event.kind === "prospects_window_built") {
        const shown = Array.isArray(event.shown_ids) ? event.shown_ids.length : 0;
        const hidden = Array.isArray(event.hidden_ids) ? event.hidden_ids.length : 0;
        return copy.prospectLog_windowBuilt(shown, hidden);
      }
      if (event.kind === "prospect_accepted") {
        const summary = summaryById.get(event.prospect_id) ?? event.type;
        const base = copy.prospectLog_accepted(event.type, summary);
        const receipt = typeof event?.effects_applied?.receipt_line === "string" ? event.effects_applied.receipt_line : null;
        return receipt ? `${base} — ${receipt}` : base;
      }
      if (event.kind === "prospect_rejected") {
        const summary = summaryById.get(event.prospect_id) ?? event.type;
        return copy.prospectLog_rejected(event.type, summary);
      }
      if (event.kind === "prospect_expired") {
        const summary = summaryById.get(event.prospect_id) ?? event.type;
        return copy.prospectLog_expired(event.type, summary);
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
      const events: any[] | undefined = (report as any)?.prospects_log;
      if (!Array.isArray(events)) continue;
      for (const event of events) {
        const line = formatProspectLog(event);
        if (line) push(turn_index, line);
      }
    }

    lines.sort((a, b) => a.turn_index - b.turn_index);
    return lines.slice(-24);
  }, [copy, ctx, state]);

  const hasProspectExpiredThisTurn = useMemo(() => {
    const events: any[] | undefined = (ctx as any)?.report?.prospects_log;
    if (!Array.isArray(events)) return false;
    return events.some((event) => event && event.kind === "prospect_expired");
  }, [ctx]);

  const prospectActions: ProspectDecisionAction[] = Array.isArray((decisions as any).prospects?.actions)
    ? ((decisions as any).prospects.actions as ProspectDecisionAction[])
    : [];

  const getProspectDecision = (id: string): "accept" | "reject" | null => findProspectDecision(prospectActions, id);
  const houseLabel = (house_id: string | null | undefined): string => resolveHouseLabel(ctx.preview_state, house_id);
  const personNameFromRegistry = (person_id: string | null | undefined): string | null => resolvePersonNameFromRegistry(ctx.preview_state, person_id);
  const requirementsMetForProspect = (prospect: any): boolean => prospectRequirementsMet(ctx.preview_state, m, prospect);
  const costsForProspect = (prospect: any): { coin: number; energy: number; bushels: number } => getProspectCosts(prospect);
  const hasSufficientResourcesForCosts = (costs: { coin: number; energy: number; bushels: number }): boolean =>
    prospectCostsSufficient(m, ctx.preview_state.house.energy.available, costs);
  const prospectTypeLabel = (value: string | null | undefined): string => labelProspectType(copy, value);
  const uncertaintyLabel = (value: string | null | undefined): string | null => labelUncertainty(copy, value);
  const effectsSummary = (prospect: any): { coin?: number; rel?: string | null; flags?: string | null } => summarizeProspectEffects(prospect, fmtSigned);
  const rejectHasStandingRisk = (prospect: any): boolean => prospectRejectHasStandingRisk(prospect);

  function recordProspectDecision(prospect_id: string, action: "accept" | "reject") {
    setDecisions((current: any) => {
      const prior: any = current?.prospects;
      const actions: ProspectDecisionAction[] = Array.isArray(prior?.actions) ? [...(prior.actions as ProspectDecisionAction[])] : [];
      actions.push({ prospect_id, action });
      return { ...current, prospects: { kind: "prospects", actions } };
    });
  }

  function handleProspectAction(prospect: any, action: "accept" | "reject") {
    const id = typeof prospect?.id === "string" ? prospect.id : "";
    if (!id) {
      setToast({ kind: "error", message: copy.prospectErr_actionUnavailable });
      return;
    }

    const type = typeof prospect?.type === "string" ? prospect.type : null;
    const expiresTurn = typeof prospect?.expires_turn === "number" ? prospect.expires_turn : null;
    const nowTurn = ctx.report.turn_index;

    if (expiresTurn !== null && nowTurn > expiresTurn) {
      setToast({ kind: "error", message: copy.prospectErr_expired });
      return;
    }

    if (getProspectDecision(id)) {
      setToast({ kind: "error", message: copy.prospectErr_alreadyDecided });
      return;
    }

    const allowedActions: any[] = Array.isArray(prospect?.actions) ? prospect.actions : [];
    if (allowedActions.length > 0 && !allowedActions.includes(action)) {
      setToast({ kind: "error", message: copy.prospectErr_actionUnavailable });
      return;
    }

    if (action === "accept") {
      if (!requirementsMetForProspect(prospect)) {
        setToast({ kind: "error", message: copy.prospectErr_requirementsNotMet });
        return;
      }

      const costs = costsForProspect(prospect);
      const anyCost = costs.coin !== 0 || costs.energy !== 0 || costs.bushels !== 0;
      if (!hasSufficientResourcesForCosts(costs)) {
        setToast({ kind: "error", message: copy.prospectErr_insufficientResources });
        return;
      }

      const predictedEffects: any = prospect?.predicted_effects;
      const coinDelta = typeof predictedEffects?.coin_delta === "number" && Number.isFinite(predictedEffects.coin_delta) ? Math.trunc(predictedEffects.coin_delta) : null;

      const { title: confirmTitle, body: confirmBody } = resolveProspectAcceptCopy({
        anyCost,
        coinDeltaText: coinDelta !== null ? fmtSigned(coinDelta) : null,
        fallbackCopy: copy,
        prospectType: type
      });

      if (!window.confirm(`${confirmTitle}\n\n${confirmBody}`)) return;

      recordProspectDecision(id, "accept");

      const typeToken = prospectTypeLabel(type);
      const shortEffectSummary =
        coinDelta !== null && coinDelta !== 0
          ? `Coin ${fmtSigned(coinDelta)}.`
          : type === "inheritance_claim"
            ? copy.prospectToastEffect_claimRecorded
            : copy.prospectToastEffect_arrangementRecorded;

      if (type === "marriage") {
        const childId: string | null =
          typeof prospect?.subject_person_id === "string"
            ? prospect.subject_person_id
            : typeof prospect?.child_id === "string"
              ? prospect.child_id
              : typeof prospect?.person_id === "string"
                ? prospect.person_id
                : null;

        const childName =
          personNameFromRegistry(childId) ??
          (typeof prospect?.subject_person_name === "string" ? prospect.subject_person_name : null);

        const spouseName =
          personNameFromRegistry(typeof prospect?.spouse_person_id === "string" ? prospect.spouse_person_id : null) ??
          (typeof prospect?.spouse_name === "string" ? prospect.spouse_name : null) ??
          (typeof prospect?.other_person_name === "string" ? prospect.other_person_name : null) ??
          null;

        const people: any = (ctx.preview_state as any).people;
        const childRec: any = childId && people && typeof people === "object" ? people[childId] : null;
        const childSex: "M" | "F" | null =
          childRec && typeof childRec === "object" && (childRec.sex === "M" || childRec.sex === "F") ? childRec.sex : null;

        if (childName) {
          const household: any = (ctx.preview_state as any)?.house;
          const heirId: string | null = typeof household?.heir_id === "string" ? household.heir_id : null;
          const kidsArr: any[] = Array.isArray(household?.children) ? household.children : [];
          const eldestSonId: string | null = kidsArr
            .filter((child) => child && typeof child === "object" && child.alive !== false && child.sex === "M" && typeof child.id === "string")
            .sort((a, b) => (Number(b.age ?? 0) - Number(a.age ?? 0)) || String(a.id).localeCompare(String(b.id)))[0]?.id ?? null;

          const spouseJoinsCourt = childSex === "M" && Boolean(childId) && (childId === heirId || childId === eldestSonId);

          setToast({
            kind: "ok",
            message: resolveProspectDecisionToast({
              action: "accept",
              childName,
              fallbackCopy: copy,
              prospectType: type,
              shortEffectSummary,
              spouseJoinsCourt,
              spouseName,
              typeLabel: typeToken
            })
          });
          return;
        }
      }

      setToast({
        kind: "ok",
        message: resolveProspectDecisionToast({
          action: "accept",
          fallbackCopy: copy,
          prospectType: type,
          shortEffectSummary,
          typeLabel: typeToken
        })
      });
      return;
    }

    if (!window.confirm(`${copy.prospectRejectConfirmTitle}\n\n${copy.prospectRejectConfirmBody}`)) return;
    recordProspectDecision(id, "reject");

    const typeToken = prospectTypeLabel(type);
    setToast({
      kind: "ok",
      message: resolveProspectDecisionToast({
        action: "reject",
        fallbackCopy: copy,
        prospectType: type,
        shortEffectSummary: copy.prospectToastEffect_arrangementRecorded,
        standingRisk: rejectHasStandingRisk(prospect),
        typeLabel: typeToken
      })
    });
  }

  const laborRequested =
    Math.abs(decisions.labor.desired_farmers - m.farmers) +
    Math.abs(decisions.labor.desired_builders - m.builders);
  const laborLimitExceeded = laborRequested > ctx.max_labor_shift;
  const plannedFarmers = Number.isFinite(decisions.labor.desired_farmers) ? decisions.labor.desired_farmers : 0;
  const plannedBuilders = Number.isFinite(decisions.labor.desired_builders) ? decisions.labor.desired_builders : 0;
  const laborAssignedNextTurn = plannedFarmers + plannedBuilders;
  const laborAvailableNextTurn = m.population;
  const laborOversubscribed = laborAssignedNextTurn > laborAvailableNextTurn;

  const { dueEntering, accruedThisTurn, arrearsCarried, totalObligations } = buildObligationTiming(ctx.report, ob);
  const courtDecisionBudget = buildCourtDecisionBudgetSurface(ctx.report, mw);
  const obligationsContract = useMemo(
    () =>
      buildObligationsCounterpartyContract({
        courtDecisionBudget,
        previewState: ctx.preview_state
      }),
    [courtDecisionBudget, ctx.preview_state]
  );
  const topologyDebugSurface = useMemo(() => buildTopologyDebugSurface(ctx.preview_state), [ctx.preview_state]);
  const personCardIds = useMemo(() => {
    const ids = Array.isArray((ctx.preview_state as any)?.person_card_registry?.person_ids)
      ? ((ctx.preview_state as any).person_card_registry.person_ids as string[])
      : [];
    return new Set(ids);
  }, [ctx.preview_state]);
  const dossierHouseIds = useMemo(() => new Set(listHouseDossierIds(ctx.preview_state)), [ctx.preview_state]);
  const marriageWorkflowSurface = useMemo(() => buildMarriageWorkflowSurface(ctx.preview_state), [ctx.preview_state]);
  const activePersonCardSurface = useMemo(
    () => (activePersonCardId ? buildPersonCardSurface(ctx.preview_state, activePersonCardId) : null),
    [activePersonCardId, ctx.preview_state]
  );
  const activeHouseDossierSurface = useMemo(
    () => (activeHouseDossierId ? buildHouseDossierSurface(ctx.preview_state, activeHouseDossierId) : null),
    [activeHouseDossierId, ctx.preview_state]
  );
  const portfolioMapCheckpoint = useMemo(
    () =>
      buildPortfolioMapCheckpoint({
        contract: portfolioContract,
        mapCheckpointAvailable: typeof onCenterSelectedHolding === "function",
        scopeMode: portfolioScopeMode,
        selectedManorId: selectedPortfolioManorId,
        topologySurface: topologyDebugSurface
      }),
    [onCenterSelectedHolding, portfolioContract, portfolioScopeMode, selectedPortfolioManorId, topologyDebugSurface]
  );

  const constructionRateThisTurn = m.builders * BUILD_RATE_PER_BUILDER_PER_TURN;
  const constructionRatePlannedNextTurn = decisions.labor.desired_builders * BUILD_RATE_PER_BUILDER_PER_TURN;
  const constructionRemaining = m.construction ? Math.max(0, m.construction.required - m.construction.progress) : 0;
  const constructionEtaTurns =
    m.construction && constructionRateThisTurn > 0 ? Math.ceil(constructionRemaining / constructionRateThisTurn) : null;

  const consFarmers = m.farmers * baselineConsPerTurn;
  const consBuilders = m.builders * builderConsPerTurn;
  const consIdle = idle * baselineConsPerTurn;

  const peasantConsumptionBushels: number | null = (() => {
    const value: any = (ctx.report as any)?.peasant_consumption_bushels;
    return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
  })();
  const courtConsumptionBushels: number | null = (() => {
    const value: any = (ctx.report as any)?.court_consumption_bushels;
    return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
  })();
  const totalConsumptionBushels: number | null = (() => {
    const value: any = (ctx.report as any)?.total_consumption_bushels;
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    const legacy = (ctx.report as any)?.consumption_bushels;
    if (typeof legacy === "number" && Number.isFinite(legacy)) return Math.trunc(legacy);
    if (peasantConsumptionBushels !== null && courtConsumptionBushels !== null) return peasantConsumptionBushels + courtConsumptionBushels;
    return null;
  })();
  const hasConsumptionSplit = peasantConsumptionBushels !== null && courtConsumptionBushels !== null && totalConsumptionBushels !== null;
  const { entries: courtRosterEntries, court_size: courtSize } = readCourtRosterFromSnapshot(ctx);

  function scrollToAnchor(anchorId: string) {
    try {
      const el = document.getElementById(anchorId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // no-op
    }
  }

  const weatherMultiplier =
    typeof ctx.report.weather_multiplier === "number" && Number.isFinite(ctx.report.weather_multiplier)
      ? ctx.report.weather_multiplier
      : 1;
  const weatherMultText = fmtMult(weatherMultiplier);
  const weatherHarmedHarvestWhy = weatherMultiplier < 0.999 ? copy.weatherHarmedHarvest(weatherMultText) : null;
  const shortageBushels =
    typeof ctx.report.shortage_bushels === "number" && Number.isFinite(ctx.report.shortage_bushels) ? ctx.report.shortage_bushels : 0;
  const shouldSurfaceWeatherOnFood = Boolean(weatherHarmedHarvestWhy) && (shortageBushels > 0 || deltaBushels < 0);

  const diffLedgerItems = buildDiffLedgerItems({
    beforeManor,
    copy,
    deltaBushels,
    deltaCoin,
    deltaPop,
    deltaUnrest,
    fmtSigned,
    personNameFromRegistry,
    popChangeSummary,
    previewState: ctx.preview_state,
    report: ctx.report,
    shouldSurfaceWeatherOnFood,
    state,
    weatherHarmedHarvestWhy
  });

  const councilAgendaItems = buildCouncilAgendaItems({
    anchors: PLAY_ANCHORS,
    copy,
    previewState: ctx.preview_state,
    report: ctx.report,
  });

  const resourceChips = buildStickyResourceChips({
    manor: m,
    deltaBushels,
    deltaCoin,
    deltaUnrest,
    fmtSigned
  });
  const receiptsViewerData = useMemo(
    () =>
      buildReceiptViewerData({
        diffLedgerItems,
        obligationsContract,
        phaseResults: ctx.phase_results_v0,
        turnExplanation: ctx.report.turn_explanation_v1 ?? null
      }),
    [ctx.phase_results_v0, ctx.report.turn_explanation_v1, diffLedgerItems, obligationsContract]
  );
  const activeReceiptViewerFocus = receiptViewerRoute?.focus ?? "overview";
  const receiptsViewerMode: ReceiptViewerMode = receiptViewerRoute?.mode ?? "grouped";
  const receiptsViewerTitleText = receiptViewerTitle(activeReceiptViewerFocus);
  const receiptsViewerSubtitleText = receiptViewerSubtitle(activeReceiptViewerFocus);
  const visibleCounterpartyReceiptSections = selectCounterpartyReceiptSections(receiptsViewerData.counterpartySections, activeReceiptViewerFocus);
  const visibleGroupedReceiptSections = selectGroupedReceiptSections(receiptsViewerData.groupedSections, activeReceiptViewerFocus);
  const visibleRawReceiptPhases = selectRawReceiptPhases(receiptsViewerData.rawPhases, activeReceiptViewerFocus);
  const activeObligationsModalFocus: ObligationsModalFocus = obligationsModalRoute?.focus ?? "overview";
  const allObligationsSections = obligationsContract?.counterpartySections ?? [];
  const visibleObligationsSections = selectObligationsCounterpartySections(obligationsContract, activeObligationsModalFocus);
  const obligationsModalTitleText = obligationsModalTitle(activeObligationsModalFocus);
  const obligationsModalSubtitleText = obligationsModalSubtitle(obligationsModalRoute?.origin ?? "turn_report", activeObligationsModalFocus);
  const [runLogDebugSurface, relationshipDebugSurface, topologyDebugSurfaceMeta] = PLAY_SCREEN_DEBUG_SURFACES;

  function openExplainChanges() {
    setReceiptViewerRoute(createExplainChangesRoute());
  }

  function openChipDetails(chipId: StickyResourceChip["id"]) {
    setReceiptViewerRoute(createResourceChipRoute(chipId));
  }

  function handlePortfolioScopeModeChange(mode: PortfolioScopeMode) {
    setPortfolioScopeMode(mode);
  }

  function handlePortfolioManorSelect(manorId: string) {
    setPortfolioScopeMode("selected_manor");
    setSelectedPortfolioManorId(manorId);
  }

  function closeReceiptViewer() {
    setReceiptViewerRoute(null);
  }

  function openPersonCard(personId: string) {
    setActiveHouseDossierId(null);
    setActivePersonCardId(personId);
  }

  function closePersonCard() {
    setActivePersonCardId(null);
  }

  function openHouseDossier(houseId: string) {
    setActivePersonCardId(null);
    setActiveHouseDossierId(houseId);
  }

  function closeHouseDossier() {
    setActiveHouseDossierId(null);
  }

  function openObligationsDetails(origin: "turn_report" | "decisions", focus: ObligationsModalFocus = "overview") {
    setObligationsModalRoute(createObligationsModalRoute(origin, focus));
  }

  function closeObligationsDetails() {
    setObligationsModalRoute(null);
  }

  function focusObligationsCounterparty(focus: ObligationsModalFocus) {
    setObligationsModalRoute((current) => createObligationsModalRoute(current?.origin ?? "turn_report", focus));
  }

  function jumpToObligationsDecisions() {
    setObligationsModalRoute(null);
    scrollToAnchor(PLAY_ANCHORS.obligations);
  }

  function handleReceiptViewerModeChange(mode: ReceiptViewerMode) {
    setReceiptViewerRoute((current) => (current ? { ...current, mode } : current));
  }

  const playSections: Record<PlayScreenCardId, React.ReactNode> = {
    council_agenda: <CouncilAgendaPanel copy={copy} items={councilAgendaItems} onScrollToAnchor={scrollToAnchor} />,
    diff_ledger: (
      <DiffLedgerPanel
        copy={copy}
        items={diffLedgerItems}
        onOpenExplainChanges={openExplainChanges}
        scopeHelperText={portfolioEvidenceScope.diffLedgerHelper}
        scopeLabel={portfolioEvidenceScope.diffLedgerScopeLabel}
      />
    ),
    manor_state: (
      <ManorStatePanel
        anchorUnrest={PLAY_ANCHORS.unrest}
        buildRatePerBuilderPerTurn={BUILD_RATE_PER_BUILDER_PER_TURN}
        builderExtraPerTurn={builderExtraPerTurn}
        constructionEtaTurns={constructionEtaTurns}
        constructionRatePlannedNextTurn={constructionRatePlannedNextTurn}
        constructionRateThisTurn={constructionRateThisTurn}
        copy={copy}
        deltaBushels={deltaBushels}
        deltaCoin={deltaCoin}
        deltaPop={deltaPop}
        deltaUnrest={deltaUnrest}
        desiredBuilders={decisions.labor.desired_builders}
        fmtSigned={fmtSigned}
        improvements={IMPROVEMENTS}
        manor={m}
        onAbandonProject={() => setDecisions((current: any) => ({ ...current, construction: { kind: "construction", action: "abandon", confirm: true } }))}
        popChangeSummary={popChangeSummary}
        pricingSurface={pricingSurface}
        report={ctx.report}
        showUnrestBreakdown={showUnrestBreakdown}
        turnExplanation={ctx.report.turn_explanation_v1 ?? null}
        turnYears={TURN_YEARS}
        unrestBreakdown={unrestBreakdown}
      />
    ),
    turn_report: (
      <TurnReportPanel
        accruedThisTurn={accruedThisTurn}
        anchorFood={PLAY_ANCHORS.food}
        anchorHousehold={PLAY_ANCHORS.household}
        arrearsCarried={arrearsCarried}
        baselineConsPerTurn={baselineConsPerTurn}
        builderExtraPerTurn={builderExtraPerTurn}
        consBuilders={consBuilders}
        consFarmers={consFarmers}
        consIdle={consIdle}
        copy={copy}
        courtConsumptionBushels={courtConsumptionBushels}
        courtRosterEntries={courtRosterEntries}
        courtSize={courtSize}
        currentHouseLog={(ctx.report.house_log ?? []) as any[]}
        dueEntering={dueEntering}
        fmtObAmount={fmtObAmount}
        hasConsumptionSplit={hasConsumptionSplit}
        idle={idle}
        manor={m}
        obligationsSections={allObligationsSections}
        onOpenObligationsDetails={(focus) => openObligationsDetails("turn_report", focus)}
        peasantConsumptionBushels={peasantConsumptionBushels}
        pricingSurface={pricingSurface}
        previewState={ctx.preview_state}
        report={ctx.report}
        showHouseholdDetails={showHouseholdDetails}
        state={state}
        toggleHouseholdDetails={() => setShowHouseholdDetails((value) => !value)}
        totalConsumptionBushels={totalConsumptionBushels}
        totalObligations={totalObligations}
        turnYears={TURN_YEARS}
      />
    ),
    portfolio_overview: portfolioContract ? (
      <PortfolioOverviewPanel
        anchorId={PLAY_ANCHORS.portfolio}
        contract={portfolioContract}
        mapCheckpoint={portfolioMapCheckpoint}
        onCenterSelectedHolding={
          portfolioMapCheckpoint?.state === "ready" && onCenterSelectedHolding
            ? () => onCenterSelectedHolding(portfolioMapCheckpoint.target)
            : undefined
        }
        onScopeModeChange={handlePortfolioScopeModeChange}
        onSelectManor={handlePortfolioManorSelect}
        selectedManor={activePortfolioManor ?? portfolioContract.selectedManor}
        selectedManorId={activePortfolioManor?.manorId ?? portfolioContract.selectedManorId}
        scopeMode={portfolioScopeMode}
      />
    ) : null,
    prospects: (
      <ProspectsPanel
        anchorId={PLAY_ANCHORS.prospects}
        copy={copy}
        costsForProspect={costsForProspect}
        dossierHouseIds={dossierHouseIds}
        effectsSummary={effectsSummary}
        fmtSigned={fmtSigned}
        getProspectDecision={getProspectDecision}
        handleProspectAction={handleProspectAction}
        hasProspectExpiredThisTurn={hasProspectExpiredThisTurn}
        hiddenCount={prospectsHiddenCount}
        hiddenIds={prospectsHiddenIds}
        houseLabel={houseLabel}
        marriageWorkflowSurface={marriageWorkflowSurface}
        onOpenHouseDossier={openHouseDossier}
        onOpenPersonCard={openPersonCard}
        personNameFromRegistry={personNameFromRegistry}
        personCardIds={personCardIds}
        pfHouseLabelById={pfHouseIx.houseLabelById}
        pfParentsByChild={pfParentsByChild}
        pfPeopleRec={pfPeopleRec}
        pfPersonHouseById={pfHouseIx.personHouseById}
        previewState={ctx.preview_state}
        prospectLogLines={prospectLogLines}
        prospectTypeLabel={prospectTypeLabel}
        prospectsShown={prospectsShown}
        prospectsShownCount={prospectsShownCount}
        prospectsTotalCount={prospectsTotalCount}
        rejectHasStandingRisk={rejectHasStandingRisk}
        reportTurnIndex={ctx.report.turn_index}
        shownIds={prospectsShownIds}
        uncertaintyLabel={uncertaintyLabel}
      />
    ),
    known_houses: (
      <KnownHousesPanel
        copy={copy}
        hasMoreKnownHouses={hasMoreKnownHouses}
        knownHouses={knownHouses}
        knownHousesMain={knownHousesMain}
        onToggleShowAll={() => setShowAllKnownHouses((value) => !value)}
        showAllKnownHouses={showAllKnownHouses}
      />
    ),
    intel: <IntelPanel copy={copy} current={intelSections.current} memory={intelSections.memory} />,
    events: <EventsPanel anchorId={PLAY_ANCHORS.events} copy={copy} events={ctx.report.events} />,
    decisions: !state.game_over ? (
      <DecisionsPanel
        accruedThisTurn={accruedThisTurn}
        advanceTurn={onAdvanceTurn}
        anchorLabor={PLAY_ANCHORS.labor}
        anchorObligations={PLAY_ANCHORS.obligations}
        buildRatePerBuilderPerTurn={BUILD_RATE_PER_BUILDER_PER_TURN}
        builderExtraPerTurn={builderExtraPerTurn}
        copy={copy}
        decisions={decisions}
        dueEntering={dueEntering}
        eligibleMaidensLocalRaw={eligibleMaidensLocalRaw}
        fmtObAmount={fmtObAmount}
        improvementIds={IMPROVEMENT_IDS}
        improvements={IMPROVEMENTS}
        laborAssignedNextTurn={laborAssignedNextTurn}
        laborAvailableNextTurn={laborAvailableNextTurn}
        laborLimitExceeded={laborLimitExceeded}
        laborOversubscribed={laborOversubscribed}
        laborRequested={laborRequested}
        manor={m}
        courtDecisionBudget={courtDecisionBudget}
        marriageWindow={mw}
        maxLaborShift={ctx.max_labor_shift}
        obligations={ob}
        obligationsSections={allObligationsSections}
        onExportFullRunJson={onExportFullRunJson}
        onExportRunSummary={onExportRunSummary}
        onOpenLog={onOpenLog}
        onOpenObligationsDetails={(focus) => openObligationsDetails("decisions", focus)}
        pfHouseLabelById={pfHouseIx.houseLabelById}
        pfParentsByChild={pfParentsByChild}
        pfPeopleRec={pfPeopleRec}
        pfPersonHouseById={pfHouseIx.personHouseById}
        pricingSurface={pricingSurface}
        previewState={ctx.preview_state}
        prospectsTotalCount={prospectsTotalCount}
        runSeed={state.run_seed}
        sellCapBushels={ctx.report.market.sell_cap_bushels}
        setDecisions={setDecisions}
        totalObligations={totalObligations}
        turnYears={TURN_YEARS}
        arrearsCarried={arrearsCarried}
      />
    ) : null,
    debug_relationships: (
      <DebugAccordion summary={PLAY_SCREEN_DEBUG_ACCORDION_SUMMARY} title="Debug surfaces">
        <div style={{ padding: 12, border: "1px solid #ddd7cb", background: "#fff" }}>
          <div style={{ fontWeight: 700 }}>{runLogDebugSurface.title}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{runLogDebugSurface.description}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={onOpenLog}>Open Run Log</button>
            <button onClick={onExportRunSummary}>Export Run Summary</button>
            <button onClick={onExportFullRunJson}>Export Full Run JSON</button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>{playtestOpsExportCopy.debugHelper}</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd7cb", background: "#fff" }}>
          <div style={{ fontWeight: 700 }}>{relationshipDebugSurface.title}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{relationshipDebugSurface.description}</div>
          <RelationshipDrawerPanel
            onQueryChange={setRelationshipDrawerQuery}
            onTabChange={setRelationshipDrawerTab}
            previewState={ctx.preview_state}
            query={relationshipDrawerQuery}
            tab={relationshipDrawerTab}
          />
        </div>

        <TopologyDebugPanel
          description={topologyDebugSurfaceMeta.description}
          surface={topologyDebugSurface}
          title={topologyDebugSurfaceMeta.title}
        />
      </DebugAccordion>
    )
  };

  return (
    <div style={PLAY_SCREEN_PAGE_STYLE}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={PLAY_SCREEN_SIGIL_STYLE}>HC</span>
              <span style={PLAY_SCREEN_TIMING_PILL_STYLE}>{copy.turnSummary_last3Years}</span>
              <span style={PLAY_SCREEN_TIMING_PILL_STYLE}>{copy.turnSummary_nowChoose}</span>
            </div>
            <div style={{ ...PLAY_SCREEN_EYEBROW_STYLE, marginTop: 8, color: PLAY_SCREEN_THEME.ink }}>
              {copy.gameplayOverviewEyebrow ?? "Gameplay Chronicle"}
            </div>
            <h2 style={{ margin: "6px 0 0", fontFamily: PLAY_SCREEN_THEME.bodyFont, fontSize: 32 }}>Turn {ctx.report.turn_index}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onOpenLog} style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE}>Debug/Log</button>
            <button onClick={onOpenNewRun} style={PLAY_SCREEN_ACTION_BUTTON_STYLE}>New Run</button>
          </div>
        </div>
        <div style={PLAY_SCREEN_HEADER_HELPER_STYLE}>
          {copy.gameplayOverviewHelper ?? "Resolved above: the last 3 years. Choose below: the next turn's response."}
        </div>
      </div>

      {state.game_over ? (
        <div style={{ padding: 12, border: "1px solid #f55", marginBottom: 12 }}>
          <b>GAME OVER:</b> {resolveGameOverReasonLabel({ fallbackCopy: gameOverReasonCopy, reason: state.game_over.reason })} — Turn{" "}
          {state.game_over.turn_index}
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

      <StickyResourceChips
        chips={resourceChips}
        helperText={portfolioEvidenceScope.chipHelperText}
        onOpenChipDetails={openChipDetails}
        timingLabel={copy.turnSummary_last3Years}
      />

      <div style={{ display: "grid", gap: 12 }}>
        {PLAY_SCREEN_CARD_ORDER.map((sectionId) =>
          playSections[sectionId] ? (
            <div key={sectionId} data-play-card={sectionId}>
              {playSections[sectionId]}
            </div>
          ) : null
        )}
      </div>

      <ModalSheet
        onClose={closeObligationsDetails}
        open={obligationsModalRoute !== null}
        subtitle={obligationsModalSubtitleText}
        title={obligationsModalTitleText}
      >
        <ObligationsDetailPanel
          allSections={allObligationsSections}
          focus={activeObligationsModalFocus}
          onFocusChange={focusObligationsCounterparty}
          onJumpToDecisions={jumpToObligationsDecisions}
          sections={visibleObligationsSections}
        />
      </ModalSheet>

      <ModalSheet onClose={closeReceiptViewer} open={receiptViewerRoute !== null} subtitle={receiptsViewerSubtitleText} title={receiptsViewerTitleText}>
        <ReceiptsViewerPanel
          counterpartySections={visibleCounterpartyReceiptSections}
          groupedSections={visibleGroupedReceiptSections}
          mode={receiptsViewerMode}
          onModeChange={handleReceiptViewerModeChange}
          rawPhases={visibleRawReceiptPhases}
          scopeLabel={portfolioEvidenceScope.receiptScopeLabel}
          scopeSummary={portfolioEvidenceScope.receiptScopeSummary}
        />
      </ModalSheet>

      <ModalSheet
        onClose={closePersonCard}
        open={activePersonCardSurface !== null}
        subtitle={activePersonCardSurface?.subtitle}
        title={activePersonCardSurface?.personName ?? "Person card"}
      >
        {activePersonCardSurface ? (
          <PersonCardPanel initialTab="overview" onOpenPersonCard={openPersonCard} surface={activePersonCardSurface} />
        ) : null}
      </ModalSheet>

      <ModalSheet
        onClose={closeHouseDossier}
        open={activeHouseDossierSurface !== null}
        subtitle={activeHouseDossierSurface?.subtitle}
        title={activeHouseDossierSurface?.houseName ?? "House dossier"}
      >
        {activeHouseDossierSurface ? (
          <HouseDossierPanel initialTab="player" onOpenPersonCard={openPersonCard} surface={activeHouseDossierSurface} />
        ) : null}
      </ModalSheet>
    </div>
  );
}
