import type { RunState } from "../sim/types";

export const PLAY_ANCHORS = {
  labor: "anchor_labor",
  food: "anchor_food",
  obligations: "anchor_obligations",
  unrest: "anchor_unrest",
  prospects: "anchor_prospects",
  household: "anchor_household",
  events: "anchor_events"
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
    return (
      pickEventWhyForDeltaKey(report, "coin") ??
      (pickTopDriver(report, "Coin:") ? { why: pickTopDriver(report, "Coin:") as string, source: "system_pressure" as const } : null) ??
      { why: copy.diffLedgerMultipleCauses, source: "system_pressure" as const }
    );
  }

  if (metric === "unrest") {
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
    if (parsed.length) return parsed;
  }

  const items: LedgerItem[] = [];

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

export function buildCouncilAgendaItems(args: {
  anchors: typeof PLAY_ANCHORS;
  arrearsCarried: { coin: number; bushels: number };
  copy: any;
  deltaBushels: number;
  deltaUnrest: number;
  dueEntering: { coin: number; bushels: number };
  laborOversubscribed: boolean;
  prospectsAll: any[];
  report: any;
  shouldSurfaceWeatherOnFood: boolean;
  weatherHarmedHarvestWhy: string | null;
}): AgendaItem[] {
  const {
    anchors,
    arrearsCarried,
    copy,
    deltaBushels,
    deltaUnrest,
    dueEntering,
    laborOversubscribed,
    prospectsAll,
    report,
    shouldSurfaceWeatherOnFood,
    weatherHarmedHarvestWhy
  } = args;

  const items: AgendaItem[] = [];
  const nowTurn = report.turn_index;

  if (laborOversubscribed) {
    items.push({
      id: "agenda_labor_oversubscribed",
      score: 1000,
      tie_key: "00_labor",
      title: copy.agenda_labor_title,
      context: copy.agenda_labor_context,
      cta_label: copy.cta_reviewLabor,
      anchor: anchors.labor
    });
  }

  if (report.shortage_bushels > 0 || deltaBushels < 0) {
    const severity = (report.shortage_bushels ?? 0) + Math.abs(Math.min(0, deltaBushels));
    items.push({
      id: "agenda_food_shortage",
      score: 900 + severity,
      tie_key: "01_food",
      title: copy.agenda_food_title,
      context: shouldSurfaceWeatherOnFood && weatherHarmedHarvestWhy ? weatherHarmedHarvestWhy : copy.agenda_food_context,
      cta_label: copy.cta_viewFoodDetails,
      anchor: anchors.food
    });
  }

  const dueTotal = (dueEntering.coin ?? 0) + (dueEntering.bushels ?? 0);
  if (dueTotal > 0) {
    const severity = dueTotal + (arrearsCarried.coin ?? 0) + (arrearsCarried.bushels ?? 0);
    items.push({
      id: "agenda_obligations_due",
      score: 850 + severity,
      tie_key: "02_obligations",
      title: copy.agenda_obligations_title,
      context: copy.agenda_obligations_context,
      cta_label: copy.cta_reviewObligations,
      anchor: anchors.obligations
    });
  }

  if (deltaUnrest > 0) {
    items.push({
      id: "agenda_unrest_rising",
      score: 800 + deltaUnrest,
      tie_key: "03_unrest",
      title: copy.agenda_unrest_title,
      context: copy.agenda_unrest_context,
      cta_label: copy.cta_viewUnrestDetails,
      anchor: anchors.unrest
    });
  }

  {
    const expiring = prospectsAll
      .filter((prospect) => typeof prospect?.expires_turn === "number" && Number.isFinite(prospect.expires_turn))
      .map((prospect) => ({ id: typeof prospect?.id === "string" ? prospect.id : "", expires_turn: Math.trunc(prospect.expires_turn as number) }))
      .filter((prospect) => prospect.id && prospect.expires_turn <= nowTurn + 1)
      .sort((a, b) => a.expires_turn - b.expires_turn || a.id.localeCompare(b.id));

    const pick = expiring[0];
    if (pick) {
      const severity = Math.max(0, (nowTurn + 1) - pick.expires_turn);
      items.push({
        id: `agenda_prospect_expiring:${pick.id}`,
        score: 780 + severity,
        tie_key: `10_prospect:${pick.id}`,
        title: copy.agenda_prospect_title,
        context: copy.agenda_prospect_context(pick.expires_turn),
        cta_label: copy.cta_viewProspects,
        anchor: anchors.prospects
      });
    }
  }

  {
    const houseLog: any[] = Array.isArray(report?.house_log) ? report.house_log : [];
    const changed = houseLog.some((entry) => entry?.kind === "heir_selected" || entry?.kind === "succession");
    if (changed && nowTurn > 0) {
      items.push({
        id: "agenda_succession",
        score: 760,
        tie_key: "06_heir",
        title: copy.agenda_succession_title,
        context: copy.agenda_succession_context,
        cta_label: copy.cta_viewHousehold,
        anchor: anchors.household
      });
    }
  }

  items.sort((a, b) => b.score - a.score || a.tie_key.localeCompare(b.tie_key));
  return items.slice(0, Math.min(5, Math.max(3, items.length)));
}
