import type { ProspectsWindow, RunState } from "../sim/types";
import {
  ensureCourtAgendaRegistry,
  selectCourtAgendaItems,
  type CourtAgendaItemV0
} from "../sim/domains/court/agendaRegistry";
import { buildEconomyPortfolioAnalysisFromState } from "../sim/domains/economy/portfolioAnalysis";
import { buildEconomyObligationsView } from "../sim/domains/experience/obligationsView";
import { buildCourtProvisioningView } from "../sim/domains/people/courtProvisioningRegistry";
import { buildHouseholdPresenceView } from "../sim/domains/people/householdPresenceView";
import { formatPersonName } from "./viewHelpers";

export const PLAY_ANCHORS = {
  labor: "anchor_labor",
  food: "anchor_food",
  obligations: "anchor_obligations",
  unrest: "anchor_unrest",
  prospects: "anchor_prospects",
  household: "anchor_household",
  events: "anchor_events",
  portfolio: "anchor_portfolio"
} as const;

export type SourceTag = "decision" | "event" | "system_pressure" | "prospect";

export type LedgerItem = {
  id: string;
  sort_mag: number;
  tie_key: string;
  primary: string;
  why: string;
  source: SourceTag;
};

export type AgendaItem = {
  id: string;
  score: number;
  tie_key: string;
  title: string;
  context: string;
  notes: string[];
  cta_label: string;
  anchor: string;
};

function pickEventWhyForDeltaKey(report: any, deltaKey: string): { why: string; source: SourceTag } | null {
  const events: any[] = Array.isArray(report?.events) ? report.events : [];
  let best: { id: string; title: string; mag: number } | null = null;

  for (const event of events) {
    const deltas: any[] = Array.isArray(event?.deltas) ? event.deltas : [];
    const delta = deltas.find((item) => item && typeof item === "object" && item.key === deltaKey);
    const diff = typeof delta?.diff === "number" && Number.isFinite(delta.diff) ? Math.trunc(delta.diff) : 0;
    const mag = Math.abs(diff);
    if (mag <= 0) continue;
    const id = typeof event?.id === "string" ? event.id : "";
    const title = typeof event?.title === "string" ? event.title : "";
    if (!title) continue;

    if (!best || mag > best.mag || (mag === best.mag && id && best.id && id < best.id)) {
      best = { id, title, mag };
    }
  }

  if (!best) return null;
  return { why: best.title, source: "event" };
}

function pickTopDriver(report: any, prefix: string): string | null {
  const drivers: any[] = Array.isArray(report?.top_drivers) ? report.top_drivers : [];
  for (const driver of drivers) {
    if (typeof driver === "string" && driver.startsWith(prefix)) return driver;
  }
  return null;
}

function pickHeadlineCause(report: any, metric: "food" | "coin" | "unrest") {
  const causes: any[] =
    Array.isArray(report?.turn_explanation_v1?.headline_causes)
      ? report.turn_explanation_v1.headline_causes
      : Array.isArray(report?.headline_causes)
        ? report.headline_causes
        : [];
  return causes.find((cause) => cause && typeof cause === "object" && cause.metric === metric) ?? null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readWholeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function buildMaintenanceLedgerItem(previewState: RunState): LedgerItem | null {
  const stateRecord = readRecord(previewState);
  const maintenanceView = readRecord(stateRecord?.economy_maintenance_view);
  const summariesByKey = readRecord(maintenanceView?.manor_summaries_by_key);
  if (!summariesByKey) return null;

  const topology = readRecord(stateRecord?.world_topology_view);
  const anchorManorId = readString(topology?.anchor_manor_id);
  const summaries = Object.keys(summariesByKey)
    .sort()
    .map((key) => readRecord(summariesByKey[key]))
    .filter((summary): summary is Record<string, unknown> => summary !== null);
  const summary =
    summaries.find((candidate) => anchorManorId && readString(candidate.manor_id) === anchorManorId) ?? summaries[0] ?? null;
  if (!summary) return null;

  const totals = readRecord(summary.totals);
  if (!totals) return null;
  const laborRequired = readWholeNumber(totals.labor_required);
  const coinCost = readWholeNumber(totals.coin_cost);
  const entryCount =
    readWholeNumber(totals.entry_count) ||
    readWholeNumber(totals.building_count) + readWholeNumber(totals.right_count);
  if (laborRequired + coinCost <= 0 || entryCount <= 0) return null;

  const rowLabel = entryCount === 1 ? "upkeep row" : "upkeep rows";
  const rightCount = readWholeNumber(totals.right_count);
  const pressureLabel = rightCount > 0 ? "Rights upkeep" : "Manor upkeep";
  return {
    id: "maintenance",
    sort_mag: laborRequired + coinCost,
    tie_key: "04_maintenance",
    primary: `Maintenance: ${laborRequired} labor, ${coinCost} coin across ${entryCount} ${rowLabel}.`,
    why: `${pressureLabel} remains visible here so labor and coin pressure does not disappear into lower output totals.`,
    source: "system_pressure",
  };
}

function whyForMetric(args: {
  copy: any;
  metric: "food" | "coin" | "population" | "unrest";
  popChangeSummary: string | null;
  report: any;
  shouldSurfaceWeatherOnFood: boolean;
  weatherHarmedHarvestWhy: string | null;
}): { why: string; source: SourceTag } {
  const { copy, metric, popChangeSummary, report, shouldSurfaceWeatherOnFood, weatherHarmedHarvestWhy } = args;

  if (metric === "food") {
    const headlineCause = pickHeadlineCause(report, "food");
    if (headlineCause && typeof headlineCause.detail === "string" && headlineCause.detail.length > 0) {
      return { why: headlineCause.detail, source: headlineCause.source === "event" ? "event" : "system_pressure" };
    }
    const base =
      pickEventWhyForDeltaKey(report, "bushels") ??
      (pickTopDriver(report, "Food:") ? { why: pickTopDriver(report, "Food:") as string, source: "system_pressure" as const } : null) ??
      { why: copy.diffLedgerMultipleCauses, source: "system_pressure" as const };

    if (shouldSurfaceWeatherOnFood && weatherHarmedHarvestWhy) {
      if (base.why === copy.diffLedgerMultipleCauses) return { why: weatherHarmedHarvestWhy, source: "system_pressure" };
      if (base.why.includes(weatherHarmedHarvestWhy)) return base;
      return { why: `${base.why} · ${weatherHarmedHarvestWhy}`, source: base.source };
    }

    return base;
  }

  if (metric === "coin") {
    const headlineCause = pickHeadlineCause(report, "coin");
    if (headlineCause && typeof headlineCause.detail === "string" && headlineCause.detail.length > 0) {
      return { why: headlineCause.detail, source: headlineCause.source === "event" ? "event" : "system_pressure" };
    }
    return (
      pickEventWhyForDeltaKey(report, "coin") ??
      (pickTopDriver(report, "Coin:") ? { why: pickTopDriver(report, "Coin:") as string, source: "system_pressure" as const } : null) ??
      { why: copy.diffLedgerMultipleCauses, source: "system_pressure" as const }
    );
  }

  if (metric === "unrest") {
    const headlineCause = pickHeadlineCause(report, "unrest");
    if (headlineCause && typeof headlineCause.detail === "string" && headlineCause.detail.length > 0) {
      return { why: headlineCause.detail, source: headlineCause.source === "event" ? "event" : "system_pressure" };
    }
    return (
      pickEventWhyForDeltaKey(report, "unrest") ??
      (pickTopDriver(report, "Unrest:") ? { why: pickTopDriver(report, "Unrest:") as string, source: "system_pressure" as const } : null) ??
      { why: copy.diffLedgerMultipleCauses, source: "system_pressure" as const }
    );
  }

  if (metric === "population") {
    return (
      pickEventWhyForDeltaKey(report, "population") ??
      (popChangeSummary ? { why: popChangeSummary, source: "system_pressure" as const } : null) ??
      { why: copy.diffLedgerMultipleCauses, source: "system_pressure" as const }
    );
  }

  return { why: copy.diffLedgerMultipleCauses, source: "system_pressure" };
}

export function buildDiffLedgerItems(args: {
  beforeManor: any;
  copy: any;
  deltaBushels: number;
  deltaCoin: number;
  deltaPop: number;
  deltaUnrest: number;
  fmtSigned: (n: number) => string;
  personNameFromRegistry: (personId: string | null | undefined) => string | null;
  popChangeSummary: string | null;
  previewState: RunState;
  report: any;
  shouldSurfaceWeatherOnFood: boolean;
  state: RunState;
  weatherHarmedHarvestWhy: string | null;
}): LedgerItem[] {
  const {
    beforeManor,
    copy,
    deltaBushels,
    deltaCoin,
    deltaPop,
    deltaUnrest,
    fmtSigned,
    personNameFromRegistry,
    popChangeSummary,
    previewState,
    report,
    shouldSurfaceWeatherOnFood,
    state,
    weatherHarmedHarvestWhy
  } = args;
  const maintenanceLedgerItem = buildMaintenanceLedgerItem(previewState);

  const reportLedgerRaw: any =
    report?.diff_ledger_items ??
    report?.diff_ledger ??
    report?.diffLedger ??
    report?.delta_ledger ??
    report?.ledger_diff ??
    null;

  const normalizeSource = (src: any): SourceTag => {
    const source = typeof src === "string" ? src : "";
    if (source === "decision" || source === "event" || source === "system_pressure" || source === "prospect") return source;
    return "system_pressure";
  };

  if (Array.isArray(reportLedgerRaw) && reportLedgerRaw.length > 0) {
    const parsed: LedgerItem[] = [];
    for (let i = 0; i < reportLedgerRaw.length; i++) {
      const item: any = reportLedgerRaw[i];
      if (!item || typeof item !== "object") continue;
      const primary: string =
        typeof item.primary === "string"
          ? item.primary
          : typeof item.line === "string"
            ? item.line
            : typeof item.text === "string"
              ? item.text
              : "";
      if (!primary) continue;
      const why: string =
        typeof item.why === "string"
          ? item.why
          : typeof item.reason === "string"
            ? item.reason
            : typeof item.note === "string"
              ? item.note
              : "";
      parsed.push({
        id: typeof item.id === "string" ? item.id : `report_ledger_${i}`,
        sort_mag: typeof item.sort_mag === "number" && Number.isFinite(item.sort_mag) ? item.sort_mag : Math.max(0, primary.length),
        tie_key: typeof item.tie_key === "string" ? item.tie_key : `r${String(i).padStart(2, "0")}`,
        primary,
        why: why || copy.diffLedgerMultipleCauses,
        source: normalizeSource(item.source ?? item.source_tag ?? item.sourceTag ?? item.kind)
      });
    }
    if (parsed.length) {
      const merged = maintenanceLedgerItem ? [maintenanceLedgerItem, ...parsed.filter((item) => item.id !== "maintenance")] : parsed;
      merged.sort((a, b) => b.sort_mag - a.sort_mag || a.tie_key.localeCompare(b.tie_key));
      return merged;
    }
  }

  const items: LedgerItem[] = [];

  if (maintenanceLedgerItem) items.push(maintenanceLedgerItem);

  items.push({
    id: "food",
    sort_mag: Math.abs(deltaBushels),
    tie_key: "00_food",
    primary: copy.diffLedgerLine_food(fmtSigned(deltaBushels), previewState.manor.bushels_stored),
    ...whyForMetric({
      copy,
      metric: "food",
      popChangeSummary,
      report,
      shouldSurfaceWeatherOnFood,
      weatherHarmedHarvestWhy
    })
  });

  items.push({
    id: "coin",
    sort_mag: Math.abs(deltaCoin),
    tie_key: "01_coin",
    primary: copy.diffLedgerLine_coin(fmtSigned(deltaCoin)),
    ...whyForMetric({
      copy,
      metric: "coin",
      popChangeSummary,
      report,
      shouldSurfaceWeatherOnFood,
      weatherHarmedHarvestWhy
    })
  });

  items.push({
    id: "population",
    sort_mag: Math.abs(deltaPop),
    tie_key: "02_population",
    primary: copy.diffLedgerLine_population(fmtSigned(deltaPop)),
    ...whyForMetric({
      copy,
      metric: "population",
      popChangeSummary,
      report,
      shouldSurfaceWeatherOnFood,
      weatherHarmedHarvestWhy
    })
  });

  items.push({
    id: "unrest",
    sort_mag: Math.abs(deltaUnrest),
    tie_key: "03_unrest",
    primary: copy.diffLedgerLine_unrest(fmtSigned(deltaUnrest)),
    ...whyForMetric({
      copy,
      metric: "unrest",
      popChangeSummary,
      report,
      shouldSurfaceWeatherOnFood,
      weatherHarmedHarvestWhy
    })
  });

  const playerHeadId: string | null =
    typeof previewState?.house?.head?.id === "string" ? previewState.house.head.id : typeof state.house?.head?.id === "string" ? state.house.head.id : null;
  const playerHouseId: string | null = typeof (previewState as any)?.player_house_id === "string" ? String((previewState as any).player_house_id) : null;
  const relationshipChangeEntries: any[] = Array.isArray(report?.relationship_change_log_v1?.entries)
    ? report.relationship_change_log_v1.entries
    : [];

  if (relationshipChangeEntries.length > 0) {
    const sortedRelationshipEntries = [...relationshipChangeEntries]
      .map((entry, index) => ({
        id: typeof entry?.id === "string" ? entry.id : `relationship_change_${index}`,
        fromLabel: typeof entry?.from_label === "string" ? entry.from_label : typeof entry?.from_id === "string" ? entry.from_id : "Unknown",
        delta: {
          allegiance: typeof entry?.delta?.allegiance === "number" ? Math.trunc(entry.delta.allegiance) : 0,
          respect: typeof entry?.delta?.respect === "number" ? Math.trunc(entry.delta.respect) : 0,
          threat: typeof entry?.delta?.threat === "number" ? Math.trunc(entry.delta.threat) : 0
        },
        why: typeof entry?.cause_summary === "string" && entry.cause_summary.length > 0 ? entry.cause_summary : copy.diffLedgerWhy_relations_drift
      }))
      .filter((entry) => Math.abs(entry.delta.allegiance) + Math.abs(entry.delta.respect) + Math.abs(entry.delta.threat) > 0)
      .sort((a, b) =>
        Math.abs(b.delta.allegiance) + Math.abs(b.delta.respect) + Math.abs(b.delta.threat) -
          (Math.abs(a.delta.allegiance) + Math.abs(a.delta.respect) + Math.abs(a.delta.threat)) ||
        a.id.localeCompare(b.id)
      );

    for (const entry of sortedRelationshipEntries.slice(0, 3)) {
      const score = Math.abs(entry.delta.allegiance) + Math.abs(entry.delta.respect) + Math.abs(entry.delta.threat);
      items.push({
        id: entry.id,
        sort_mag: score,
        tie_key: `10_rel:${entry.id}`,
        primary: copy.diffLedgerLine_relations(
          entry.fromLabel,
          fmtSigned(entry.delta.allegiance),
          fmtSigned(entry.delta.respect),
          fmtSigned(entry.delta.threat)
        ),
        why: entry.why,
        source: "system_pressure"
      });
    }

    items.sort((a, b) => b.sort_mag - a.sort_mag || a.tie_key.localeCompare(b.tie_key));
    return items;
  }

  const beforeArr: any[] = Array.isArray((state as any).relationships) ? (state as any).relationships : [];
  const afterArr: any[] = Array.isArray((previewState as any).relationships) ? (previewState as any).relationships : [];

  const keyOf = (fromId: string, toId: string) => `${fromId}|${toId}`;
  const beforeMap = new Map<string, any>();
  const afterMap = new Map<string, any>();

  for (const edge of beforeArr) {
    const fromId = typeof edge?.from_id === "string" ? edge.from_id : "";
    const toId = typeof edge?.to_id === "string" ? edge.to_id : "";
    if (fromId && toId) beforeMap.set(keyOf(fromId, toId), edge);
  }
  for (const edge of afterArr) {
    const fromId = typeof edge?.from_id === "string" ? edge.from_id : "";
    const toId = typeof edge?.to_id === "string" ? edge.to_id : "";
    if (fromId && toId) afterMap.set(keyOf(fromId, toId), edge);
  }

  const headIdToHouseLabel = new Map<string, string>();
  const houseIdToHouseLabel = new Map<string, string>();
  {
    const houses: any = (previewState as any)?.houses;
    if (houses && typeof houses === "object") {
      for (const hid of Object.keys(houses).sort()) {
        const house: any = houses[hid];
        if (!house || typeof house !== "object") continue;
        const headId = typeof house.head_id === "string" ? house.head_id : null;
        const houseName = typeof house.house_name === "string" ? house.house_name : typeof house.name === "string" ? house.name : null;
        if (houseName) houseIdToHouseLabel.set(hid, copy.housePrefix(houseName));
        if (headId && houseName) headIdToHouseLabel.set(headId, copy.housePrefix(houseName));
      }
    }
  }

  type RelMove = { from_id: string; to_id: string; dA: number; dR: number; dT: number; score: number };
  const moves: RelMove[] = [];
  {
    const keys = new Set<string>();
    for (const key of beforeMap.keys()) keys.add(key);
    for (const key of afterMap.keys()) keys.add(key);

    const targets = new Set<string>();
    if (playerHeadId) targets.add(playerHeadId);
    if (playerHouseId) targets.add(playerHouseId);

    for (const key of keys) {
      const [fromId, toId] = key.split("|");
      if (!fromId || !toId) continue;
      if (!targets.has(toId)) continue;
      if (playerHeadId && fromId === playerHeadId) continue;
      if (playerHouseId && fromId === playerHouseId) continue;

      const before = beforeMap.get(key);
      const after = afterMap.get(key);

      const dA = (typeof after?.allegiance === "number" ? after.allegiance : 0) - (typeof before?.allegiance === "number" ? before.allegiance : 0);
      const dR = (typeof after?.respect === "number" ? after.respect : 0) - (typeof before?.respect === "number" ? before.respect : 0);
      const dT = (typeof after?.threat === "number" ? after.threat : 0) - (typeof before?.threat === "number" ? before.threat : 0);
      const score = Math.abs(dA) + Math.abs(dR) + Math.abs(dT);
      if (score <= 0) continue;

      moves.push({ from_id: fromId, to_id: toId, dA, dR, dT, score });
    }
  }

  moves.sort((a, b) => b.score - a.score || a.from_id.localeCompare(b.from_id) || a.to_id.localeCompare(b.to_id));

  const liegeId: string | null = typeof previewState?.locals?.liege?.id === "string" ? previewState.locals.liege.id : null;
  const clergyId: string | null = typeof previewState?.locals?.clergy?.id === "string" ? previewState.locals.clergy.id : null;
  const nobleIds = new Set<string>(
    Array.isArray(previewState?.locals?.nobles)
      ? (previewState.locals.nobles as any[]).map((p) => (p && typeof p === "object" && typeof p.id === "string" ? p.id : "")).filter(Boolean)
      : []
  );
  const hasArrearsBefore = (beforeManor?.obligations?.arrears?.coin ?? 0) > 0 || (beforeManor?.obligations?.arrears?.bushels ?? 0) > 0;

  function relationWhoLabel(fromId: string): string {
    if (liegeId && fromId === liegeId) {
      const name = personNameFromRegistry(fromId) ?? (previewState.locals?.liege?.name ? String(previewState.locals.liege.name) : fromId);
      return `${name} (Liege)`;
    }
    if (clergyId && fromId === clergyId) {
      const name = personNameFromRegistry(fromId) ?? (previewState.locals?.clergy?.name ? String(previewState.locals.clergy.name) : fromId);
      return `${name} (Clergy)`;
    }
    const houseById = houseIdToHouseLabel.get(fromId);
    if (houseById) return houseById;
    const house = headIdToHouseLabel.get(fromId);
    if (house) return house;
    if (nobleIds.has(fromId)) {
      const name = personNameFromRegistry(fromId) ?? fromId;
      return `${name} (Noble)`;
    }
    return personNameFromRegistry(fromId) ?? fromId;
  }

  function whyForRelationMove(move: RelMove): { why: string; source: SourceTag } {
    if (liegeId && move.from_id === liegeId && hasArrearsBefore) {
      return { why: copy.obligationsHelper, source: "system_pressure" };
    }
    return { why: copy.diffLedgerWhy_relations_drift, source: "system_pressure" };
  }

  for (const move of moves.slice(0, 3)) {
    const target = relationWhoLabel(move.from_id);
    items.push({
      id: `rel:${move.from_id}->${move.to_id}`,
      sort_mag: move.score,
      tie_key: `10_rel:${move.from_id}->${move.to_id}`,
      primary: copy.diffLedgerLine_relations(target, fmtSigned(move.dA), fmtSigned(move.dR), fmtSigned(move.dT)),
      ...whyForRelationMove(move)
    });
  }

  items.sort((a, b) => b.sort_mag - a.sort_mag || a.tie_key.localeCompare(b.tie_key));
  return items;
}

function noteTagValue(item: CourtAgendaItemV0, prefix: string): string | null {
  for (const tag of item.note_tags) {
    if (tag.startsWith(prefix)) return tag.slice(prefix.length);
  }
  return null;
}

function humanizeCounterpartyKind(value: string): string {
  if (value === "liege") return "Liege";
  if (value === "church") return "Church";
  return value;
}

function humanizeProspectType(value: string): string {
  if (value === "grant") return "Grant";
  if (value === "marriage") return "Marriage";
  if (value === "inheritance_claim") return "Inheritance claim";
  return value;
}

function humanizePortfolioMetric(metricKey: string): string {
  switch (metricKey) {
    case "outlier.highest.arrears_coin":
      return "coin arrears";
    case "outlier.highest.arrears_bushels":
      return "bushel arrears";
    case "outlier.highest.tax_due_coin":
      return "coin due";
    case "outlier.highest.tithe_due_bushels":
      return "church dues";
    case "outlier.highest.consumption.shortage_bushels":
      return "food shortage pressure";
    case "outlier.lowest.net.coin":
      return "net coin";
    case "outlier.lowest.net.food_stores":
      return "net food stores";
    case "outlier.lowest.net.meat_stores":
      return "net meat stores";
    default:
      return metricKey;
  }
}

function findProspectById(prospectsWindow: ProspectsWindow | null, prospectId: string | null): any | null {
  if (!prospectsWindow || !prospectId) return null;
  return (Array.isArray(prospectsWindow.prospects) ? prospectsWindow.prospects : []).find((prospect) => prospect?.id === prospectId) ?? null;
}

function personNameFromState(state: RunState, personId: string | null): string {
  if (!personId) return "Unknown person";
  const person = (state as any)?.people?.[personId] ?? null;
  return formatPersonName(person ?? { id: personId });
}

function formatAgendaToken(value: string | null | undefined): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "Unknown";
  return normalized
    .split(/[._]/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function officeTruthNotes(previewState: RunState, personId: string | null): string[] {
  if (!personId) return [];

  const provisioningEntry = buildCourtProvisioningView(previewState).entries_by_person_id[personId] ?? null;
  const householdEntry = buildHouseholdPresenceView(previewState).entries_by_person_id[personId] ?? null;
  const notes: string[] = [];

  if (householdEntry) {
    notes.push(`Household path: ${formatAgendaToken(householdEntry.presence_kind)} — ${householdEntry.presence_summary}`);
  }

  if (provisioningEntry) {
    notes.push(
      `Provisioning: ${formatAgendaToken(provisioningEntry.provisioning_class)} / ${formatAgendaToken(provisioningEntry.lodging_level)}.`
    );
  }

  return notes.slice(0, 2);
}

function agendaItemFromRegistry(args: {
  anchors: typeof PLAY_ANCHORS;
  copy: any;
  item: CourtAgendaItemV0;
  previewState: RunState;
  prospectsWindow: ProspectsWindow | null;
}): AgendaItem {
  const { anchors, copy, item, previewState, prospectsWindow } = args;
  const obligationsView = buildEconomyObligationsView(previewState);
  const officeRegistry = ((previewState.house as any)?.court_office_registry ?? {}) as Record<string, any>;
  const serviceRegistry = ((previewState.house as any)?.court_service_record_registry ?? {}) as Record<string, any>;
  const delegationView = ((previewState.house as any)?.court_delegation_view ?? {}) as Record<string, any>;
  const portfolio = ((previewState as any)?.portfolio ?? buildEconomyPortfolioAnalysisFromState(previewState)) as Record<string, any>;

  if (item.source_tag === "obligations") {
    const counterpartyKind = noteTagValue(item, "counterparty:");
    const summary =
      obligationsView.counterparty_summaries.find((candidate) => candidate.counterparty_kind === counterpartyKind) ?? null;

    if (item.source_key === "obligations.enforcement" && summary) {
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: "Penalty pressure is active",
        context: summary.enforcement_summary,
        notes: [summary.settlement_summary],
        cta_label: copy.cta_reviewObligations,
        anchor: anchors.obligations
      };
    }

    if (item.source_key === "obligations.arrears" && summary) {
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: "Arrears need attention",
        context: summary.settlement_summary,
        notes: [summary.enforcement_summary],
        cta_label: copy.cta_reviewObligations,
        anchor: anchors.obligations
      };
    }

    if (summary) {
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: copy.agenda_obligations_title,
        context: summary.settlement_summary,
        notes: [`${humanizeCounterpartyKind(summary.counterparty_kind)} prefers ${summary.preferred_payment_mode.replaceAll("_", " ")} payments.`],
        cta_label: copy.cta_reviewObligations,
        anchor: anchors.obligations
      };
    }
  }

  if (item.source_tag === "prospects") {
    const prospect = findProspectById(prospectsWindow, item.subject_ref_id);
    const expiryLine =
      prospect && typeof prospect.expires_turn === "number" ? `Expires end of Turn ${Math.trunc(prospect.expires_turn)}.` : null;

    if (item.source_key === "prospects.expiring" && prospect) {
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: copy.agenda_prospect_title,
        context: `${humanizeProspectType(prospect.type)}: ${prospect.summary}. ${copy.agenda_prospect_context(prospect.expires_turn)}`,
        notes: prospect.requirements.slice(0, 1).map((requirement: any) => requirement.text),
        cta_label: copy.cta_viewProspects,
        anchor: anchors.prospects
      };
    }

    if (item.source_key === "prospects.grant" && prospect) {
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: "Grant opportunity is open",
        context: prospect.summary,
        notes: expiryLine ? [expiryLine] : [],
        cta_label: copy.cta_viewProspects,
        anchor: anchors.prospects
      };
    }

    if (item.source_key === "prospects.marriage" && prospect) {
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: "Marriage opportunity is open",
        context: prospect.summary,
        notes: expiryLine ? [expiryLine] : [],
        cta_label: copy.cta_viewProspects,
        anchor: anchors.prospects
      };
    }
  }

  if (item.source_tag === "offices") {
    if (item.source_key === "offices.required_vacancy") {
      const seat = officeRegistry.seats_by_id?.[item.subject_ref_id ?? ""];
      const vacancyTurns =
        seat && seat.vacancy_started_turn_index !== null
          ? Math.max(0, Math.trunc(previewState.turn_index) - seat.vacancy_started_turn_index)
          : 0;
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: "A court seat stands vacant",
        context: `${seat?.title ?? "Required office"} is unfilled.`,
        notes: [`Vacant for ${vacancyTurns} turn${vacancyTurns === 1 ? "" : "s"}.`],
        cta_label: copy.cta_viewHousehold,
        anchor: anchors.household
      };
    }

    if (item.source_key === "offices.realm_holder_transition") {
      const seat = officeRegistry.seats_by_id?.[item.subject_ref_id ?? ""];
      const truthNotes = officeTruthNotes(previewState, seat?.holder_person_id ?? null);
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: "A realm office just changed hands",
        context: `${seat?.title ?? "Realm office"} last shifted on Turn ${seat?.last_transition_turn_index ?? previewState.turn_index}.`,
        notes:
          seat?.holder_person_id
            ? [`Current holder: ${personNameFromState(previewState, seat.holder_person_id)}.`, ...truthNotes]
            : truthNotes,
        cta_label: copy.cta_viewHousehold,
        anchor: anchors.household
      };
    }

    if (item.source_key === "offices.delegated_action") {
      const action = (Array.isArray(delegationView.actions) ? delegationView.actions : []).find(
        (entry: any) => entry?.action === item.subject_ref_id
      );
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: "Delegated court work is active",
        context: `${action?.summary_label ?? "Court action"} remains delegated.`,
        notes: action ? [`Budget delta ${action.budget_cost_delta}, energy delta ${action.energy_cost_delta}.`] : [],
        cta_label: copy.cta_viewHousehold,
        anchor: anchors.household
      };
    }

    if (item.source_key === "offices.active_service_record") {
      const record = serviceRegistry.records_by_id?.[item.subject_ref_id ?? ""];
      const seat = officeRegistry.seats_by_id?.[record?.seat_id ?? ""];
      const truthNotes = officeTruthNotes(previewState, record?.holder_person_id ?? null);
      const placementNote = record
        ? `Placement mode: ${String(noteTagValue(item, "placement:") ?? "serving_actor").replaceAll("_", " ")}.`
        : null;
      return {
        id: item.agenda_item_id,
        score: item.priority,
        tie_key: item.tie_key,
        title: "A court placement deserves review",
        context: `${personNameFromState(previewState, record?.holder_person_id ?? null)} serves as ${seat?.title ?? "office holder"}.`,
        notes: [...truthNotes, ...(placementNote ? [placementNote] : [])],
        cta_label: copy.cta_viewHousehold,
        anchor: anchors.household
      };
    }
  }

  if (item.source_tag === "portfolio_outliers") {
    const metricKey = noteTagValue(item, "metric:");
    const entry = metricKey
      ? ((portfolio.outliers_by_metric?.[metricKey] ?? []) as any[]).find((candidate) => candidate?.manor_id === item.subject_ref_id) ?? null
      : null;
    return {
      id: item.agenda_item_id,
      score: item.priority,
      tie_key: item.tie_key,
      title: "A portfolio outlier needs attention",
      context: `${humanizePortfolioMetric(metricKey ?? "portfolio.outlier")} is surfacing in the holdings shell.`,
      notes: entry ? [`Current bounded value: ${entry.value}.`] : [],
      cta_label: copy.cta_viewPortfolio ?? "View portfolio",
      anchor: anchors.portfolio
    };
  }

  return {
    id: item.agenda_item_id,
    score: item.priority,
    tie_key: item.tie_key,
    title: "Council agenda item",
    context: item.summary_key,
    notes: [],
    cta_label: copy.cta_openDetails,
    anchor: anchors.events
  };
}

export function buildCouncilAgendaItems(args: {
  anchors: typeof PLAY_ANCHORS;
  copy: any;
  previewState: RunState;
  report: any;
}): AgendaItem[] {
  const { anchors, copy, previewState, report } = args;
  const prospectsWindow =
    report?.prospects_window && typeof report.prospects_window === "object" ? (report.prospects_window as ProspectsWindow) : null;
  const registry = ensureCourtAgendaRegistry(previewState, { prospects_window: prospectsWindow });

  return selectCourtAgendaItems(registry).map((item) =>
    agendaItemFromRegistry({
      anchors,
      copy,
      item,
      previewState,
      prospectsWindow
    })
  );
}
