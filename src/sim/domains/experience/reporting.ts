import { buildBoundedRegistryManifest, RUN_STATE_SCHEMA_VERSION } from "../../stateSchema";
import { playerHouseIdOf, registryPersonFor } from "../../actors";
import type {
  HeadlineCauseV1,
  PhaseResultV0,
  RelationshipChangeLogEntryV1,
  RelationshipChangeLogV1,
  RunSnapshot,
  RunState,
  TurnExplanationSurfaceRoleV1,
  TurnExplanationV1,
  TurnExplanationWalkdownV1,
  TurnReport
} from "../../types";
import { deepCopy } from "../../util";
import { buildAiRailDebugPacket } from "../ai/debug";
import { buildCourtDelegationView } from "../court/delegationRegistry";
import { buildEconomyObligationsView } from "./obligationsView";
import { buildEconomyPricingView } from "./pricingView";
import { buildGrantAcquisitionExperienceSurfaces } from "../people/grantAcquisitionRegistry";
import { buildKnownHouseExperienceSurfaces } from "../people/knownHouseSummaries";
import {
  readRuntimeRelationshipChangeLog,
  type RuntimeRelationshipChangeRecordV1
} from "../people/relationshipEngine";
import { ensureResidenceManorBindings } from "../people/residenceManorRegistry";
import { buildSuccessionExperienceSurfaces } from "../people/successionSummaries";
import { buildBoundedMapViewSnapshot, buildBoundedWorldTopologyView, buildManorDetailView } from "../world";

export function boundedSnapshot(state: RunState): RunSnapshot {
  const experienceSurfaces = buildKnownHouseExperienceSurfaces(state);
  const successionSurfaces = buildSuccessionExperienceSurfaces(state);
  const grantAcquisitionSurfaces = buildGrantAcquisitionExperienceSurfaces(state);
  const residenceSurfaces = ensureResidenceManorBindings(state);
  const delegationView = buildCourtDelegationView(state);
  const worldTopologyView = buildBoundedWorldTopologyView();
  const mapViewSnapshot = buildBoundedMapViewSnapshot();
  const manorDetailView = buildManorDetailView(worldTopologyView.anchor_manor_id);
  const snapshot = deepCopy({
    state_schema_version: state.state_schema_version ?? RUN_STATE_SCHEMA_VERSION,
    bounded_registry_manifest: buildBoundedRegistryManifest(),
    turn_index: state.turn_index,
    manor: state.manor,
    house: state.house,
    relationships: state.relationships,
    people: (state as any).people,
    houses: (state as any).houses,
    player_house_id: (state as any).player_house_id,
    kinship_edges: (state as any).kinship_edges ?? (state as any).kinship,
    economy: (state as any).economy,
    economy_obligations_view: buildEconomyObligationsView(state),
    economy_pricing_view: buildEconomyPricingView(state),
    court_delegation_view: delegationView,
    portfolio: (state as any).portfolio,
    world_topology_view: worldTopologyView,
    map_view_snapshot: mapViewSnapshot,
    manor_detail_view: manorDetailView,
    known_houses: experienceSurfaces.known_houses,
    house_dossiers: experienceSurfaces.house_dossiers,
    flags: state.flags,
    game_over: state.game_over ?? null
  }) as unknown as RunSnapshot;
  if ((state as any).beliefs) {
    Object.defineProperty(snapshot, "beliefs", {
      value: deepCopy((state as any).beliefs),
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
  Object.defineProperty(snapshot, "ai_rail_debug_packet", {
    value: deepCopy(buildAiRailDebugPacket(state)),
    enumerable: false,
    writable: true,
    configurable: true
  });
  (snapshot.house as any).court_delegation_view = deepCopy(delegationView);
  Object.defineProperty(snapshot, "succession_line_summary", {
    value: deepCopy(successionSurfaces.succession_line_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "claimant_summary", {
    value: deepCopy(successionSurfaces.claimant_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "succession_line_summary", {
    value: deepCopy(successionSurfaces.succession_line_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "claimant_summary", {
    value: deepCopy(successionSurfaces.claimant_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "grant_eligibility", {
    value: deepCopy(grantAcquisitionSurfaces.grant_eligibility),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "grant_source_registry", {
    value: deepCopy(grantAcquisitionSurfaces.grant_source_registry),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "grant_dossier_summaries", {
    value: deepCopy(grantAcquisitionSurfaces.grant_dossier_summaries),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "acquisition_prospects_window", {
    value: deepCopy(grantAcquisitionSurfaces.acquisition_prospects_window),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "grant_eligibility", {
    value: deepCopy(grantAcquisitionSurfaces.grant_eligibility),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "grant_source_registry", {
    value: deepCopy(grantAcquisitionSurfaces.grant_source_registry),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "grant_dossier_summaries", {
    value: deepCopy(grantAcquisitionSurfaces.grant_dossier_summaries),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "acquisition_prospects_window", {
    value: deepCopy(grantAcquisitionSurfaces.acquisition_prospects_window),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "residence_selector_summary", {
    value: deepCopy(residenceSurfaces.selector_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "residence_distance_hooks", {
    value: deepCopy(residenceSurfaces.distance_hooks),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "residence_selector_summary", {
    value: deepCopy(residenceSurfaces.selector_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "residence_distance_hooks", {
    value: deepCopy(residenceSurfaces.distance_hooks),
    enumerable: false,
    writable: true,
    configurable: true
  });
  for (const personId of residenceSurfaces.selector_summary.person_ids) {
    const entry = residenceSurfaces.selector_summary.entries_by_person_id[personId] ?? null;
    const hook = residenceSurfaces.distance_hooks.entries_by_person_id[personId] ?? null;
    const snapshotPerson = (snapshot as any).people?.[personId] ?? null;
    if (snapshotPerson) {
      Object.defineProperty(snapshotPerson, "residence_manor_id", {
        value: entry?.residence_manor_id ?? null,
        enumerable: false,
        writable: true,
        configurable: true
      });
      Object.defineProperty(snapshotPerson, "residence_selector_contexts", {
        value: entry?.selector_contexts ?? [],
        enumerable: false,
        writable: true,
        configurable: true
      });
      Object.defineProperty(snapshotPerson, "residence_distance_hook", {
        value: hook,
        enumerable: false,
        writable: true,
        configurable: true
      });
    }
  }
  const headId = (snapshot.house as any)?.head?.id;
  if (typeof headId === "string" && (snapshot.house as any)?.head) {
    const entry = residenceSurfaces.selector_summary.entries_by_person_id[headId] ?? null;
    const hook = residenceSurfaces.distance_hooks.entries_by_person_id[headId] ?? null;
    Object.defineProperty((snapshot.house as any).head, "residence_manor_id", {
      value: entry?.residence_manor_id ?? null,
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty((snapshot.house as any).head, "residence_selector_contexts", {
      value: entry?.selector_contexts ?? [],
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty((snapshot.house as any).head, "residence_distance_hook", {
      value: hook,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
  const spouseId = (snapshot.house as any)?.spouse?.id;
  if (typeof spouseId === "string" && (snapshot.house as any)?.spouse) {
    const entry = residenceSurfaces.selector_summary.entries_by_person_id[spouseId] ?? null;
    const hook = residenceSurfaces.distance_hooks.entries_by_person_id[spouseId] ?? null;
    Object.defineProperty((snapshot.house as any).spouse, "residence_manor_id", {
      value: entry?.residence_manor_id ?? null,
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty((snapshot.house as any).spouse, "residence_selector_contexts", {
      value: entry?.selector_contexts ?? [],
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty((snapshot.house as any).spouse, "residence_distance_hook", {
      value: hook,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
  for (const child of (snapshot.house as any)?.children ?? []) {
    const childId = typeof child?.id === "string" ? child.id : null;
    if (!childId) continue;
    const entry = residenceSurfaces.selector_summary.entries_by_person_id[childId] ?? null;
    const hook = residenceSurfaces.distance_hooks.entries_by_person_id[childId] ?? null;
    Object.defineProperty(child, "residence_manor_id", {
      value: entry?.residence_manor_id ?? null,
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty(child, "residence_selector_contexts", {
      value: entry?.selector_contexts ?? [],
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty(child, "residence_distance_hook", {
      value: hook,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
  return snapshot;
}

const TURN_EXPLANATION_SURFACE_ROLES: TurnExplanationSurfaceRoleV1[] = [
  {
    surface: "turn_report",
    role_label: "Summary",
    helper: "Turn Report keeps only the headline story of what changed this turn."
  },
  {
    surface: "diff_ledger",
    role_label: "Top deltas",
    helper: "Diff Ledger keeps the largest movements and points you toward the deeper cause chain."
  },
  {
    surface: "manor_state",
    role_label: "Current state plus direct causes",
    helper: "Manor State shows where you stand now and the direct pressures behind that state."
  },
  {
    surface: "explain_changes",
    role_label: "Drilldown",
    helper: "Explain Changes keeps the ordered walkdowns and matched receipts without repeating every headline."
  }
] as const;

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function signedAmount(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function humanizeReason(value: string): string {
  switch (value) {
    case "obligations_arrears_preview":
      return "Arrears pressure";
    case "obligations_current_due_pressure":
      return "Current dues pressure";
    case "war_levy_men":
      return "War levy answered with men";
    case "war_levy_coin":
      return "War levy paid in coin";
    case "war_levy_partial_coin_then_men":
      return "War levy covered with coin and men";
    case "war_levy_failed":
      return "War levy failed";
    case "war_levy_ignored":
      return "War levy ignored";
    case "relationship_delta":
      return "Relationship moved";
    default:
      return value
        .replaceAll(".", " ")
        .replaceAll("_", " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^\w/, (ch) => ch.toUpperCase());
  }
}

function actorLabel(state: RunState, actorId: string): string {
  const person = registryPersonFor(state, actorId);
  if (person?.name) return person.name;

  const houses = (state as any).houses;
  const house = houses && typeof houses === "object" ? houses[actorId] : null;
  if (house && typeof house === "object") {
    const houseName =
      typeof (house as any).house_name === "string"
        ? (house as any).house_name
        : typeof (house as any).name === "string"
          ? (house as any).name
          : null;
    if (houseName) return `House ${houseName}`;
  }

  const institution = (state as any).institutions?.[actorId];
  if (institution && typeof institution === "object" && typeof institution.name === "string" && institution.name.length > 0) {
    return institution.name;
  }

  if (state.locals?.liege?.id === actorId) return state.locals.liege.name;
  if (state.locals?.clergy?.id === actorId) return state.locals.clergy.name;
  return actorId;
}

function inferRelationshipScope(state: RunState, fromId: string, toId: string): RelationshipChangeLogEntryV1["scope"] {
  const houses = (state as any).houses;
  if ((houses && typeof houses === "object" && (houses[fromId] || houses[toId])) || fromId === playerHouseIdOf(state) || toId === playerHouseIdOf(state)) {
    return "house";
  }
  const institutions = (state as any).institutions;
  if (institutions && typeof institutions === "object" && (institutions[fromId] || institutions[toId])) return "institution";
  const fromPerson = registryPersonFor(state, fromId);
  const toPerson = registryPersonFor(state, toId);
  if (fromPerson || toPerson) return "person";
  return "unknown";
}

function allPhaseReceipts(phaseResults?: PhaseResultV0[] | null): PhaseResultV0[] {
  return Array.isArray(phaseResults) ? phaseResults : [];
}

function phaseNoteLines(phaseResults?: PhaseResultV0[] | null): string[] {
  return allPhaseReceipts(phaseResults).flatMap((phaseResult) =>
    Array.isArray(phaseResult.receipts)
      ? phaseResult.receipts
          .map((receipt) => (typeof receipt?.line === "string" ? receipt.line.trim() : ""))
          .filter((line) => line.length > 0)
      : []
  );
}

function sumFiscalDelta(
  phaseResults: PhaseResultV0[] | null | undefined,
  predicate: (receipt: NonNullable<PhaseResultV0["fiscal_receipts_v1"]>[number]) => boolean
): number {
  let total = 0;
  for (const phaseResult of allPhaseReceipts(phaseResults)) {
    for (const receipt of phaseResult.fiscal_receipts_v1 ?? []) {
      if (predicate(receipt)) total += normalizeInteger(receipt.delta);
    }
  }
  return total;
}

function extractPaidAmounts(phaseResults?: PhaseResultV0[] | null): {
  paidCurrentCoin: number;
  paidCurrentBushels: number;
  paidArrearsCoin: number;
  paidArrearsBushels: number;
} {
  const lines = phaseNoteLines(phaseResults);
  let paidCurrentCoin = 0;
  let paidCurrentBushels = 0;
  let paidArrearsCoin = 0;
  let paidArrearsBushels = 0;

  for (const line of lines) {
    const currentMatch = line.match(/Paid current dues: tax -(\d+) coin, tithe -(\d+) bushels\./i);
    if (currentMatch) {
      paidCurrentCoin += normalizeInteger(Number(currentMatch[1]));
      paidCurrentBushels += normalizeInteger(Number(currentMatch[2]));
    }
    const arrearsMatch = line.match(/Paid arrears: coin -(\d+), bushels -(\d+)\./i);
    if (arrearsMatch) {
      paidArrearsCoin += normalizeInteger(Number(arrearsMatch[1]));
      paidArrearsBushels += normalizeInteger(Number(arrearsMatch[2]));
    }
  }

  return { paidCurrentCoin, paidCurrentBushels, paidArrearsCoin, paidArrearsBushels };
}

function buildFoodWalkdown(
  report: TurnReport,
  before: RunState,
  after: RunState,
  phaseResults?: PhaseResultV0[] | null
): TurnExplanationWalkdownV1 {
  const startAmount = normalizeInteger(before.manor.bushels_stored);
  const production = normalizeInteger(report.production_bushels);
  const totalBeforeDeductions = startAmount + production;
  const consumption = normalizeInteger(report.total_consumption_bushels || report.consumption_bushels);
  const spoilage = normalizeInteger(report.spoilage.loss_bushels);
  const paidAmounts = extractPaidAmounts(phaseResults);
  const duesAndTithe = paidAmounts.paidCurrentBushels + paidAmounts.paidArrearsBushels;
  const endAmount = normalizeInteger(after.manor.bushels_stored);
  const otherEffects = totalBeforeDeductions - consumption - spoilage - duesAndTithe - endAmount;
  const rows: TurnExplanationWalkdownV1["rows"] = [
    {
      id: "food_starting_stores",
      label: "Starting stores",
      direction: "start",
      amount: startAmount,
      running_total: startAmount,
      summary: `${startAmount} bushels on hand at the start of the turn.`
    },
    {
      id: "food_production",
      label: "Production",
      direction: "inflow",
      amount: production,
      running_total: totalBeforeDeductions,
      summary: `${production} bushels came in from production.`
    },
    {
      id: "food_total_before_deductions",
      label: "Total before deductions",
      direction: "net",
      amount: totalBeforeDeductions,
      running_total: totalBeforeDeductions,
      summary: `${totalBeforeDeductions} bushels were available before consumption, spoilage, and dues.`
    },
    {
      id: "food_consumption",
      label: "Consumption",
      direction: "outflow",
      amount: consumption,
      running_total: totalBeforeDeductions - consumption,
      summary: `${consumption} bushels were consumed by peasants and court.`
    },
    {
      id: "food_spoilage",
      label: "Spoilage",
      direction: "outflow",
      amount: spoilage,
      running_total: totalBeforeDeductions - consumption - spoilage,
      summary: `${spoilage} bushels were lost to spoilage.`
    },
    {
      id: "food_dues",
      label: "Dues and tithe",
      direction: "outflow",
      amount: duesAndTithe,
      running_total: totalBeforeDeductions - consumption - spoilage - duesAndTithe,
      summary: duesAndTithe > 0 ? `${duesAndTithe} bushels left stores to cover church dues or arrears.` : "No bushels left stores for tithe settlement this turn."
    }
  ];

  if (otherEffects !== 0) {
    rows.push({
      id: "food_other_effects",
      label: "Other effects",
      direction: otherEffects > 0 ? "inflow" : "outflow",
      amount: Math.abs(otherEffects),
      running_total: endAmount,
      summary: `${Math.abs(otherEffects)} bushels ${otherEffects > 0 ? "came in from" : "were moved by"} other turn effects such as events, trade, or project outcomes.`
    });
  }

  rows.push({
    id: "food_ending_stores",
    label: "Ending stores",
    direction: "ending",
    amount: endAmount,
    running_total: endAmount,
    summary: `${endAmount} bushels remain at turn end.`
  });

  return {
    schema_version: "turn_explanation_walkdown_v1",
    metric: "food",
    unit_label: "bushels",
    start_amount: startAmount,
    end_amount: endAmount,
    reconciles: totalBeforeDeductions - consumption - spoilage - duesAndTithe - otherEffects === endAmount,
    rows
  };
}

function buildCoinWalkdown(
  report: TurnReport,
  before: RunState,
  after: RunState,
  phaseResults?: PhaseResultV0[] | null
): TurnExplanationWalkdownV1 {
  const startAmount = normalizeInteger(before.manor.coin);
  const paidAmounts = extractPaidAmounts(phaseResults);
  const marketTradeCoin = sumFiscalDelta(
    phaseResults,
    (receipt) => receipt.asset === "coin" && receipt.counterparty_kind === "market"
  );
  const marriageProjectOtherInflows = sumFiscalDelta(
    phaseResults,
    (receipt) =>
      receipt.asset === "coin" &&
      receipt.delta > 0 &&
      (receipt.phase === "marriage" || receipt.phase === "prospects" || receipt.counterparty_kind === "project" || receipt.counterparty_kind === "event")
  );
  const maintenanceUpkeep = Math.abs(
    sumFiscalDelta(
      phaseResults,
      (receipt) =>
        receipt.asset === "coin" &&
        receipt.delta < 0 &&
        (receipt.category.includes("maintenance") || receipt.summary.toLowerCase().includes("upkeep"))
    )
  );
  const duesPaid = paidAmounts.paidCurrentCoin + paidAmounts.paidArrearsCoin;
  const endAmount = normalizeInteger(after.manor.coin);
  const otherEffects = endAmount - startAmount - marketTradeCoin - marriageProjectOtherInflows + maintenanceUpkeep + duesPaid;
  const rows: TurnExplanationWalkdownV1["rows"] = [
    {
      id: "coin_starting_coin",
      label: "Starting coin",
      direction: "start",
      amount: startAmount,
      running_total: startAmount,
      summary: `${startAmount} coin on hand at the start of the turn.`
    },
    {
      id: "coin_market_trade",
      label: "Market and trade",
      direction: marketTradeCoin >= 0 ? "inflow" : "outflow",
      amount: Math.abs(marketTradeCoin),
      running_total: startAmount + marketTradeCoin,
      summary: marketTradeCoin === 0 ? "No market or trade coin movement was recorded." : `${Math.abs(marketTradeCoin)} coin ${marketTradeCoin > 0 ? "came in from" : "left through"} market activity.`
    },
    {
      id: "coin_marriage_project_other_inflows",
      label: "Marriage, project, and other inflows",
      direction: "inflow",
      amount: marriageProjectOtherInflows,
      running_total: startAmount + marketTradeCoin + marriageProjectOtherInflows,
      summary: marriageProjectOtherInflows > 0 ? `${marriageProjectOtherInflows} coin came in from marriage, project, or event outcomes.` : "No marriage, project, or event coin inflows were recorded."
    },
    {
      id: "coin_maintenance",
      label: "Maintenance and upkeep",
      direction: "outflow",
      amount: maintenanceUpkeep,
      running_total: startAmount + marketTradeCoin + marriageProjectOtherInflows - maintenanceUpkeep,
      summary: maintenanceUpkeep > 0 ? `${maintenanceUpkeep} coin went to upkeep and recurring maintenance.` : "No upkeep coin outflow was recorded."
    },
    {
      id: "coin_dues_paid",
      label: "Dues paid",
      direction: "outflow",
      amount: duesPaid,
      running_total: startAmount + marketTradeCoin + marriageProjectOtherInflows - maintenanceUpkeep - duesPaid,
      summary: duesPaid > 0 ? `${duesPaid} coin went to dues or arrears payments.` : "No coin left the treasury for dues settlement this turn."
    }
  ];

  if (otherEffects !== 0) {
    rows.push({
      id: "coin_other_effects",
      label: "Other effects",
      direction: otherEffects > 0 ? "inflow" : "outflow",
      amount: Math.abs(otherEffects),
      running_total: endAmount,
      summary: `${Math.abs(otherEffects)} coin ${otherEffects > 0 ? "came in from" : "left through"} other turn effects that are not yet broken out into a dedicated walkdown line.`
    });
  }

  rows.push({
    id: "coin_ending_coin",
    label: "Ending coin",
    direction: "ending",
    amount: endAmount,
    running_total: endAmount,
    summary: `${endAmount} coin remain at turn end.`
  });

  return {
    schema_version: "turn_explanation_walkdown_v1",
    metric: "coin",
    unit_label: "coin",
    start_amount: startAmount,
    end_amount: endAmount,
    reconciles: startAmount + marketTradeCoin + marriageProjectOtherInflows - maintenanceUpkeep - duesPaid + otherEffects === endAmount,
    rows
  };
}

function buildUnrestWalkdown(report: TurnReport, before: RunState, after: RunState): TurnExplanationWalkdownV1 {
  const startAmount = normalizeInteger(before.manor.unrest);
  const endAmount = normalizeInteger(after.manor.unrest);
  const breakdown = report.unrest_breakdown;
  const rows: TurnExplanationWalkdownV1["rows"] = [
    {
      id: "unrest_start",
      label: "Starting unrest",
      direction: "start",
      amount: startAmount,
      running_total: startAmount,
      summary: `${startAmount} unrest at the start of the turn.`
    }
  ];

  for (const row of breakdown?.increased_by ?? []) {
    rows.push({
      id: `unrest_increase_${row.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      label: row.label,
      direction: "inflow",
      amount: normalizeInteger(row.amount),
      summary: `${normalizeInteger(row.amount)} unrest came from ${row.label.toLowerCase()}.`
    });
  }

  for (const row of breakdown?.decreased_by ?? []) {
    rows.push({
      id: `unrest_decrease_${row.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      label: row.label,
      direction: "outflow",
      amount: normalizeInteger(row.amount),
      summary: `${normalizeInteger(row.amount)} unrest eased because of ${row.label.toLowerCase()}.`
    });
  }

  rows.push({
    id: "unrest_net",
    label: "Net unrest change",
    direction: "net",
    amount: endAmount - startAmount,
    running_total: endAmount,
    summary: `Net unrest change ${signedAmount(endAmount - startAmount)}.`
  });
  rows.push({
    id: "unrest_end",
    label: "Ending unrest",
    direction: "ending",
    amount: endAmount,
    running_total: endAmount,
    summary: `${endAmount} unrest at the end of the turn.`
  });

  return {
    schema_version: "turn_explanation_walkdown_v1",
    metric: "unrest",
    unit_label: "unrest",
    start_amount: startAmount,
    end_amount: endAmount,
    reconciles: true,
    rows
  };
}

function biggestWalkdownLine(walkdown: TurnExplanationWalkdownV1): { label: string; amount: number } | null {
  const candidates = walkdown.rows.filter((row) => !["start", "net", "ending"].includes(row.direction) && row.amount !== 0);
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || compareText(a.label, b.label))[0] ?? null;
}

function buildHeadlineCauses(
  report: TurnReport,
  before: RunState,
  after: RunState,
  foodWalkdown: TurnExplanationWalkdownV1,
  coinWalkdown: TurnExplanationWalkdownV1,
  unrestWalkdown: TurnExplanationWalkdownV1,
  relationshipChangeLog: RelationshipChangeLogV1
): HeadlineCauseV1[] {
  const causes: HeadlineCauseV1[] = [];
  const foodDelta = after.manor.bushels_stored - before.manor.bushels_stored;
  const coinDelta = after.manor.coin - before.manor.coin;
  const unrestDelta = after.manor.unrest - before.manor.unrest;
  const biggestFood = biggestWalkdownLine(foodWalkdown);
  const biggestCoin = biggestWalkdownLine(coinWalkdown);
  const biggestUnrest = biggestWalkdownLine(unrestWalkdown);

  causes.push({
    id: "headline_food",
    metric: "food",
    source: "system_pressure",
    magnitude: Math.abs(foodDelta),
    summary: `Food stores ${signedAmount(foodDelta)}`,
    detail: biggestFood ? `${biggestFood.label} was the biggest visible food driver (${signedAmount(biggestFood.amount)}).` : "Food movement was limited this turn."
  });
  causes.push({
    id: "headline_coin",
    metric: "coin",
    source: "system_pressure",
    magnitude: Math.abs(coinDelta),
    summary: `Coin ${signedAmount(coinDelta)}`,
    detail: biggestCoin ? `${biggestCoin.label} was the biggest visible coin driver (${signedAmount(biggestCoin.amount)}).` : "Coin stayed close to flat this turn."
  });
  causes.push({
    id: "headline_unrest",
    metric: "unrest",
    source: "system_pressure",
    magnitude: Math.abs(unrestDelta),
    summary: `Unrest ${signedAmount(unrestDelta)}`,
    detail: biggestUnrest ? `${biggestUnrest.label} was the clearest visible unrest driver (${signedAmount(biggestUnrest.amount)}).` : "Unrest did not meaningfully move."
  });

  if (report.construction.completed_improvement_id) {
    causes.push({
      id: "headline_project_completion",
      metric: "project",
      source: "decision",
      magnitude: 1,
      summary: `Project completed: ${report.construction.completed_improvement_id}`,
      detail: "The turn completed a manor improvement and its effects should be visible in the walkdowns and state surfaces."
    });
  }

  if (report.maintenance_labor_pressure?.applied_drag) {
    causes.push({
      id: "headline_maintenance_pressure",
      metric: "project",
      source: "system_pressure",
      magnitude: Math.abs(normalizeInteger(report.maintenance_labor_pressure.applied_drag)),
      summary: `Maintenance labor ${signedAmount(-normalizeInteger(report.maintenance_labor_pressure.applied_drag))}`,
      detail: `${normalizeInteger(report.maintenance_labor_pressure.applied_drag)} labor was absorbed by upkeep before allocatable labor was consumed.`
    });
  }

  const first = relationshipChangeLog.entries[0];
  if (first) {
    causes.push({
      id: "headline_relationships",
      metric: "relationships",
      source: "system_pressure",
      magnitude:
        Math.abs(first.delta.allegiance) + Math.abs(first.delta.respect) + Math.abs(first.delta.threat),
      summary: `${first.from_label} shifted toward ${first.to_label}`,
      detail: `${first.cause_summary}: A ${signedAmount(first.delta.allegiance)} / R ${signedAmount(first.delta.respect)} / T ${signedAmount(first.delta.threat)}.`
    });
  }

  return causes
    .sort((a, b) => b.magnitude - a.magnitude || compareText(a.id, b.id))
    .filter((cause) => cause.magnitude > 0)
    .slice(0, 6);
}

export function buildRelationshipChangeLogV1(
  state: RunState,
  records: readonly RuntimeRelationshipChangeRecordV1[] = readRuntimeRelationshipChangeLog(state)
): RelationshipChangeLogV1 {
  const entries = [...records]
    .sort((a, b) => a.sequence - b.sequence || compareText(a.from_id, b.from_id) || compareText(a.to_id, b.to_id))
    .map((record, index) => ({
      id: `relationship_change_${String(index).padStart(2, "0")}`,
      turn_index: normalizeInteger(record.turn_index),
      scope: inferRelationshipScope(state, record.from_id, record.to_id),
      from_id: record.from_id,
      to_id: record.to_id,
      from_label: actorLabel(state, record.from_id),
      to_label: actorLabel(state, record.to_id),
      cause_key: record.reason,
      cause_summary: humanizeReason(record.reason),
      delta: {
        allegiance: normalizeInteger(record.delta.allegiance),
        respect: normalizeInteger(record.delta.respect),
        threat: normalizeInteger(record.delta.threat)
      }
    }));

  return {
    schema_version: "relationship_change_log_v1",
    turn_index: normalizeInteger(state.turn_index),
    entries
  };
}

export function buildTurnExplanationV1(
  report: TurnReport,
  before: RunState,
  after: RunState,
  phaseResults?: PhaseResultV0[] | null,
  relationshipChangeLog: RelationshipChangeLogV1 = buildRelationshipChangeLogV1(after)
): TurnExplanationV1 {
  const foodWalkdown = buildFoodWalkdown(report, before, after, phaseResults);
  const coinWalkdown = buildCoinWalkdown(report, before, after, phaseResults);
  const unrestWalkdown = buildUnrestWalkdown(report, before, after);
  const headlineCauses = buildHeadlineCauses(
    report,
    before,
    after,
    foodWalkdown,
    coinWalkdown,
    unrestWalkdown,
    relationshipChangeLog
  );

  return {
    schema_version: "turn_explanation_v1",
    food_walkdown: foodWalkdown,
    coin_walkdown: coinWalkdown,
    unrest_walkdown: unrestWalkdown,
    headline_causes: headlineCauses,
    surface_roles: [...TURN_EXPLANATION_SURFACE_ROLES]
  };
}

export function attachExperienceContractsToReport(
  report: TurnReport,
  before: RunState,
  after: RunState,
  phaseResults?: PhaseResultV0[] | null,
  relationshipChangeLog: RelationshipChangeLogV1 = buildRelationshipChangeLogV1(after)
): TurnReport {
  const turnExplanation = buildTurnExplanationV1(report, before, after, phaseResults, relationshipChangeLog);
  report.relationship_change_log_v1 = relationshipChangeLog;
  report.turn_explanation_v1 = turnExplanation;
  report.headline_causes = turnExplanation.headline_causes;
  report.top_drivers = computeTopDrivers(report, before, after);
  return report;
}

export function computeTopDrivers(report: TurnReport, before: RunState, after: RunState): string[] {
  if (Array.isArray(report.headline_causes) && report.headline_causes.length > 0) {
    return report.headline_causes.slice(0, 3).map((cause) => `${cause.summary}. ${cause.detail}`);
  }

  const drivers: Array<{ label: string; score: number; text: string }> = [];

  const bushelDiff = after.manor.bushels_stored - before.manor.bushels_stored;
  const unrestDiff = after.manor.unrest - before.manor.unrest;
  const coinDiff = after.manor.coin - before.manor.coin;
  const arrearsCoinDiff = after.manor.obligations.arrears.coin - before.manor.obligations.arrears.coin;
  const arrearsBushelDiff = after.manor.obligations.arrears.bushels - before.manor.obligations.arrears.bushels;

  drivers.push({
    label: "Food",
    score: Math.abs(bushelDiff),
    text: `Food: prod +${report.production_bushels}, cons -${report.consumption_bushels}, spoil -${report.spoilage.loss_bushels}, net ${bushelDiff >= 0 ? "+" : ""}${bushelDiff}.`
  });
  drivers.push({
    label: "Unrest",
    score: Math.abs(unrestDiff),
    text: `Unrest: net ${unrestDiff >= 0 ? "+" : ""}${unrestDiff} (threshold dispossession at 100).`
  });
  drivers.push({
    label: "Obligations",
    score: Math.abs(arrearsCoinDiff) * 20 + Math.abs(arrearsBushelDiff),
    text: `Obligations: tax due ${report.obligations.tax_due_coin}, tithe due ${report.obligations.tithe_due_bushels}, arrears Δ coin ${arrearsCoinDiff >= 0 ? "+" : ""}${arrearsCoinDiff}, bushels ${arrearsBushelDiff >= 0 ? "+" : ""}${arrearsBushelDiff}.`
  });
  drivers.push({
    label: "Coin",
    score: Math.abs(coinDiff),
    text: `Coin: net ${coinDiff >= 0 ? "+" : ""}${coinDiff}.`
  });
  drivers.sort((a, b) => b.score - a.score);
  return drivers.slice(0, 3).map((d) => d.text);
}
