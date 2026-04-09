import type { RunState } from "../sim/types";
import { buildEconomyPricingView } from "../sim/domains/experience/pricingView";
import { buildHouseIndexes, buildParentsIndex, formatParentsLine, formatPersonName } from "./viewHelpers";

export type PopChangeLine = { label: string; amount: number };
export type UnrestLine = { label: string; amount: number };
export type UnrestBreakdown = { increased: UnrestLine[]; decreased: UnrestLine[] };
export type OblAmount = { coin: number; bushels: number };
export type EconomyPricingSurface = {
  schemaVersion: string;
  referenceId: string;
  referenceLabel: string;
  ratioLabel: string;
  fixedSellCapUnits: number;
  maxSellableUnits: number;
  maxQuotedCoin: number;
  catalogLines: string[];
};

type PersonLike = {
  id: string;
  name: string;
  age?: number;
  short_id?: string;
  alive?: boolean;
  sex?: "M" | "F";
  married?: boolean;
};

export type CourtRosterEntry = {
  person: PersonLike;
  role_label: string | null;
  officer_role_label: string | null;
  badges: string[];
  parents_line: string | null;
};

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function priceUnitLabel(baseAmount: number, unit: string): string {
  if (unit === "labor_turn") {
    return `${baseAmount} ${pluralize(baseAmount, "labor turn", "labor turns")}`;
  }
  return `${baseAmount} ${pluralize(baseAmount, "bushel", "bushels")}`;
}

export function buildEconomyPricingSurface(snapshotLike: any): EconomyPricingSurface | null {
  const view =
    snapshotLike?.economy_pricing_view && typeof snapshotLike.economy_pricing_view === "object"
      ? snapshotLike.economy_pricing_view
      : snapshotLike?.manor && typeof snapshotLike === "object"
        ? buildEconomyPricingView(snapshotLike as RunState)
        : null;

  if (!view || typeof view !== "object") return null;

  const foodStoresSellAction = view.food_stores_sell_action;
  const priceReference = foodStoresSellAction?.price_reference;
  const references = Array.isArray(view.references) ? view.references : [];

  if (!foodStoresSellAction || !priceReference) return null;

  return {
    schemaVersion: String(view.schema_version ?? ""),
    referenceId: String(priceReference.reference_id ?? ""),
    referenceLabel: String(priceReference.label ?? ""),
    ratioLabel: `${priceReference.quote_amount} coin / ${priceUnitLabel(priceReference.base_amount, String(priceReference.unit ?? ""))}`,
    fixedSellCapUnits: Number.isFinite(foodStoresSellAction.sell_cap_units) ? Math.trunc(foodStoresSellAction.sell_cap_units) : 0,
    maxSellableUnits: Number.isFinite(foodStoresSellAction.sold_units) ? Math.trunc(foodStoresSellAction.sold_units) : 0,
    maxQuotedCoin: Number.isFinite(foodStoresSellAction.quoted_coin) ? Math.trunc(foodStoresSellAction.quoted_coin) : 0,
    catalogLines: references.map((reference: any) => {
      const label = String(reference?.label ?? "");
      const ratio = `${reference?.quote_amount ?? 0} coin / ${priceUnitLabel(
        Number.isFinite(reference?.base_amount) ? Math.trunc(reference.base_amount) : 0,
        String(reference?.unit ?? "")
      )}`;
      const lifecycle = reference?.lifecycle === "placeholder" ? "placeholder" : "active";
      return `${label}: ${ratio} (${lifecycle})`;
    })
  };
}

export function getEligibleMaidensLocalRaw(ctx: any, marriageWindow: any): any {
  return (
    ctx?.eligible_maidens_local ??
    ctx?.eligibleMaidensLocal ??
    ctx?.marriage_market?.eligible_maidens_local ??
    ctx?.marriage_market?.eligibleMaidensLocal ??
    marriageWindow?.eligible_maidens_local ??
    marriageWindow?.eligibleMaidensLocal ??
    ctx?.report?.eligible_maidens_local ??
    ctx?.report?.eligibleMaidensLocal ??
    null
  );
}

export function parsePopulationChangeBreakdown(
  report: any,
  labels: { deaths: string; runaways: string }
): PopChangeLine[] | null {
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

  const normalizeKey = (key: string): string => String(key || "").toLowerCase().replace(/[^a-z]/g, "");

  function labelForKey(keyRaw: any): string {
    const key = typeof keyRaw === "string" ? keyRaw : String(keyRaw ?? "");
    const normalized = normalizeKey(key);
    if (normalized === "deaths" || normalized === "death" || normalized === "died" || normalized === "dead" || normalized === "mortality") {
      return labels.deaths;
    }
    if (normalized === "runaways" || normalized === "runaway" || normalized === "fled" || normalized === "flee" || normalized === "deserted" || normalized === "ranaway") {
      return labels.runaways;
    }
    const cleaned = key.replace(/_/g, " ").trim();
    return cleaned ? cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1) : key;
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const key = item.kind ?? item.cause ?? item.reason ?? item.label ?? item.code;
      const amount = item.count ?? item.amount ?? item.delta ?? item.value;
      if (key != null) add(labelForKey(key), amount);
    }
  } else {
    const obj: any = raw?.breakdown && typeof raw.breakdown === "object" ? raw.breakdown : raw;
    if (obj && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "number" && Number.isFinite(value) && value !== 0) add(labelForKey(key), value);
      }
    }
  }

  if (!lines.length) return null;

  const rank = (label: string): number => {
    if (label === labels.deaths) return 1;
    if (label === labels.runaways) return 2;
    return 9;
  };

  lines.sort((a, b) => rank(a.label) - rank(b.label) || b.amount - a.amount || a.label.localeCompare(b.label));
  return lines;
}

export function summarizePopulationChange(lines: PopChangeLine[] | null): string | null {
  return lines ? lines.map((line) => `${line.label} ${line.amount}`).join(", ") : null;
}

export function parseUnrestBreakdown(raw: any): UnrestBreakdown | null {
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

  const contributors: any[] = Array.isArray(raw?.contributors) ? raw.contributors : [];
  if (contributors.length > 0) {
    for (const contributor of contributors) {
      if (!contributor || typeof contributor !== "object") continue;
      const label = contributor.label ?? contributor.reason ?? contributor.key ?? contributor.code;
      const delta = contributor.delta ?? contributor.amount ?? contributor.value;
      pushLine(label, delta, true);
    }
  }

  const ups: any[] = Array.isArray(raw?.increased_by) ? raw.increased_by : Array.isArray(raw?.increases) ? raw.increases : [];
  const downs: any[] = Array.isArray(raw?.decreased_by) ? raw.decreased_by : Array.isArray(raw?.decreases) ? raw.decreases : [];

  function parseList(list: any[], target: "increased" | "decreased") {
    for (const item of list) {
      if (item == null || typeof item === "string") continue;
      if (typeof item === "object") {
        const label = item.label ?? item.reason ?? item.key ?? item.code;
        const amount = item.amount ?? item.delta ?? item.value;
        const labelStr = typeof label === "string" ? label : "";
        const amtNum = typeof amount === "number" && Number.isFinite(amount) ? Math.trunc(amount) : null;
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

  increased.sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
  decreased.sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  return { increased, decreased };
}

export function readObAmount(value: any): OblAmount | null {
  if (typeof value === "number") return { coin: value, bushels: 0 };
  if (!value || typeof value !== "object") return null;
  const coin = typeof value.coin === "number" ? value.coin : null;
  const bushels = typeof value.bushels === "number" ? value.bushels : null;
  if (coin === null && bushels === null) return null;
  return { coin: coin ?? 0, bushels: bushels ?? 0 };
}

export function fmtObAmount(amount: OblAmount): string {
  return `${amount.coin} coin / ${amount.bushels} bushels`;
}

export function buildObligationTiming(report: any, obligations: any): {
  dueEntering: OblAmount;
  accruedThisTurn: OblAmount | null;
  arrearsCarried: OblAmount;
  totalObligations: OblAmount;
} {
  const timing = report?.obligations_timing ?? report?.obligations?.timing ?? null;

  const dueEntering = readObAmount(timing?.due_entering_turn) ?? {
    coin: obligations?.tax_due_coin ?? 0,
    bushels: obligations?.tithe_due_bushels ?? 0
  };

  const accruedThisTurn = readObAmount(timing?.accrued_this_turn);

  const arrearsCarried = readObAmount(timing?.arrears_carried_forward) ?? {
    coin: obligations?.arrears?.coin ?? 0,
    bushels: obligations?.arrears?.bushels ?? 0
  };

  const totalObligations = readObAmount(timing?.total) ??
    readObAmount(timing?.total_obligations) ?? {
      coin: dueEntering.coin + (accruedThisTurn?.coin ?? 0) + arrearsCarried.coin,
      bushels: dueEntering.bushels + (accruedThisTurn?.bushels ?? 0) + arrearsCarried.bushels
    };

  return { dueEntering, accruedThisTurn, arrearsCarried, totalObligations };
}

export function houseNameFromRegistry(previewState: RunState, houseId: string | null | undefined): string | null {
  const hid = typeof houseId === "string" ? houseId : null;
  if (!hid) return null;
  const houses: any = (previewState as any).houses;
  const house = houses && typeof houses === "object" ? houses[hid] : null;
  const name =
    (house && typeof house === "object" && (
      typeof house.name === "string" ? house.name : typeof house.house_name === "string" ? house.house_name : typeof house.houseName === "string" ? house.houseName : null
    )) || null;
  return name ? String(name) : null;
}

export function houseLabel(previewState: RunState, houseId: string | null | undefined): string {
  const hid = typeof houseId === "string" ? houseId : "";
  const name = houseNameFromRegistry(previewState, hid);
  return name ?? hid ?? "";
}

export function personNameFromRegistry(previewState: RunState, personId: string | null | undefined): string | null {
  const pid = typeof personId === "string" ? personId : null;
  if (!pid) return null;
  const people: any = (previewState as any).people;
  const person = people && typeof people === "object" ? people[pid] : null;
  if (person && typeof person === "object" && typeof person.name === "string") {
    return formatPersonName(person as any);
  }
  return null;
}

export function relationshipToPlayerFromHouse(
  previewState: RunState,
  houseId: string | null | undefined
): { allegiance: number; respect: number; threat: number } | null {
  const hid = typeof houseId === "string" ? houseId : null;
  if (!hid) return null;
  const houses: any = (previewState as any).houses;
  const house = houses && typeof houses === "object" ? houses[hid] : null;
  const fromHeadId = house && typeof house === "object" && typeof house.head_id === "string" ? house.head_id : null;
  const playerHeadId = previewState.house?.head?.id;
  if (!fromHeadId || !playerHeadId) return null;
  const edge = (previewState.relationships ?? []).find((item) => item.from_id === fromHeadId && item.to_id === playerHeadId);
  if (!edge) return null;
  return { allegiance: edge.allegiance, respect: edge.respect, threat: edge.threat };
}

export function getKnownHouses(previewState: RunState, knownHousesRaw: any): any[] {
  const raw: any[] = Array.isArray(knownHousesRaw) ? knownHousesRaw : [];
  if (raw.length === 0) return [];

  const allStrings = raw.every((x) => typeof x === "string");
  if (allStrings) {
    const houses: any = (previewState as any).houses;
    const people: any = (previewState as any).people;
    const out: any[] = [];

    for (const hid of raw as string[]) {
      const house = houses && typeof houses === "object" ? houses[hid] : null;
      const houseName = house && typeof house === "object" ? String(house.house_name ?? house.name ?? house.houseName ?? "").trim() : "";
      const tier = house && typeof house === "object" ? String(house.tier ?? "").trim() : "";

      const headId: string | null =
        house && typeof house === "object"
          ? typeof house.head_id === "string"
            ? house.head_id
            : typeof house.head?.id === "string"
              ? house.head.id
              : null
          : null;

      const head = headId && people && typeof people === "object" ? people[headId] : null;
      const rel = relationshipToPlayerFromHouse(previewState, hid);

      out.push({
        house_id: hid,
        house_name: houseName || hid,
        tier,
        head_id: headId,
        head_name: head && typeof head === "object" ? head.name : "",
        head_age: head && typeof head === "object" ? head.age : null,
        head_short_id: head && typeof head === "object" ? head.short_id : null,
        head_status: head && typeof head === "object" && typeof head.alive === "boolean" ? (head.alive ? "Alive" : "Deceased") : "",
        relationship: rel
      });
    }

    out.sort((a, b) => String(a.house_name).localeCompare(String(b.house_name)) || String(a.house_id).localeCompare(String(b.house_id)));
    return out;
  }

  const objects = raw.filter((x) => x && typeof x === "object");
  const nameOf = (house: any) => String(house?.house_name ?? house?.houseName ?? house?.name ?? house?.house_id ?? house?.id ?? "");
  objects.sort(
    (a, b) =>
      nameOf(a).localeCompare(nameOf(b)) ||
      String(a?.house_id ?? a?.id ?? "").localeCompare(String(b?.house_id ?? b?.id ?? ""))
  );
  return objects;
}

export function getProspectsWindowState(prospectsWindowRaw: any): {
  prospectsWindow: any | null;
  prospectsAll: any[];
  prospectsShownIds: string[];
  prospectsHiddenIds: string[];
  prospectsShown: any[];
  prospectsTotalCount: number;
  prospectsShownCount: number;
  prospectsHiddenCount: number;
} {
  const prospectsWindow: any | null = prospectsWindowRaw && typeof prospectsWindowRaw === "object" ? prospectsWindowRaw : null;
  const prospectsAll: any[] = Array.isArray(prospectsWindow?.prospects) ? prospectsWindow.prospects : [];
  const prospectsShownIds: string[] = Array.isArray(prospectsWindow?.shown_ids) ? prospectsWindow.shown_ids : [];
  const prospectsHiddenIds: string[] = Array.isArray(prospectsWindow?.hidden_ids) ? prospectsWindow.hidden_ids : [];

  const prospectById = new Map<string, any>();
  for (const prospect of prospectsAll) {
    const id = typeof prospect?.id === "string" ? prospect.id : "";
    if (id) prospectById.set(id, prospect);
  }

  const prospectsShown: any[] =
    prospectsShownIds.length > 0 ? prospectsShownIds.map((id) => prospectById.get(id)).filter(Boolean) : prospectsAll;

  const prospectsTotalCount = prospectsAll.length;
  const prospectsShownCount = prospectsShown.length;
  const prospectsHiddenCount =
    prospectsHiddenIds.length > 0 ? prospectsHiddenIds.length : Math.max(0, prospectsTotalCount - prospectsShownCount);

  return {
    prospectsWindow,
    prospectsAll,
    prospectsShownIds,
    prospectsHiddenIds,
    prospectsShown,
    prospectsTotalCount,
    prospectsShownCount,
    prospectsHiddenCount
  };
}

export function getProspectDecision(
  actions: Array<{ prospect_id: string; action: "accept" | "reject" }>,
  id: string
): "accept" | "reject" | null {
  const hit = actions.find((action) => action && action.prospect_id === id);
  return hit ? hit.action : null;
}

export function costsForProspect(prospect: any): { coin: number; energy: number; bushels: number } {
  const costs: any = prospect?.costs;
  return {
    coin: typeof costs?.coin === "number" ? costs.coin : 0,
    energy: typeof costs?.energy === "number" ? costs.energy : 0,
    bushels: typeof costs?.bushels === "number" ? costs.bushels : 0
  };
}

export function hasSufficientResourcesForCosts(
  manor: any,
  energyAvailable: number,
  costs: { coin: number; energy: number; bushels: number }
): boolean {
  if (costs.coin > 0 && manor.coin < costs.coin) return false;
  if (costs.bushels > 0 && manor.bushels_stored < costs.bushels) return false;
  if (costs.energy > 0 && energyAvailable < costs.energy) return false;
  return true;
}

export function requirementsMetForProspect(previewState: RunState, manor: any, prospect: any): boolean {
  const requirements: any[] = Array.isArray(prospect?.requirements) ? prospect.requirements : [];
  if (requirements.length === 0) return true;

  const rel = relationshipToPlayerFromHouse(previewState, prospect?.from_house_id);
  const hasArrears = (manor?.obligations?.arrears?.coin ?? 0) > 0 || (manor?.obligations?.arrears?.bushels ?? 0) > 0;

  for (const requirement of requirements) {
    const kind = typeof requirement?.kind === "string" ? requirement.kind : "";
    const value = requirement?.value;

    if (kind === "coin_min" && typeof value === "number" && manor.coin < value) return false;
    if (kind === "no_arrears" && hasArrears) return false;
    if (kind === "respect_min" && typeof value === "number" && rel && rel.respect < value) return false;
    if (kind === "allegiance_min" && typeof value === "number" && rel && rel.allegiance < value) return false;
    if (kind === "threat_max" && typeof value === "number" && rel && rel.threat > value) return false;
  }

  return true;
}

export function prospectTypeLabel(copy: any, type: string | null | undefined): string {
  if (type === "marriage") return copy.prospectType_marriage;
  if (type === "grant") return copy.prospectType_grant;
  if (type === "inheritance_claim") return copy.prospectType_inheritance_claim;
  return type ? String(type) : "";
}

export function uncertaintyLabel(copy: any, uncertainty: string | null | undefined): string | null {
  if (uncertainty === "known") return copy.prospectConfidence_known;
  if (uncertainty === "likely") return copy.prospectConfidence_likely;
  if (uncertainty === "possible") return copy.prospectConfidence_possible;
  return null;
}

export function effectsSummary(
  prospect: any,
  formatSigned: (n: number) => string
): { coin?: number; rel?: string | null; flags?: string | null } {
  const predicted: any = prospect?.predicted_effects;
  if (!predicted || typeof predicted !== "object") return {};

  const out: { coin?: number; rel?: string | null; flags?: string | null } = {};
  if (typeof predicted.coin_delta === "number") out.coin = predicted.coin_delta;

  const relationshipDeltas: any[] = Array.isArray(predicted.relationship_deltas) ? predicted.relationship_deltas : [];
  if (relationshipDeltas.length > 0) {
    const sumA = relationshipDeltas.reduce((sum, delta) => sum + (typeof delta?.allegiance_delta === "number" ? delta.allegiance_delta : 0), 0);
    const sumR = relationshipDeltas.reduce((sum, delta) => sum + (typeof delta?.respect_delta === "number" ? delta.respect_delta : 0), 0);
    const sumT = relationshipDeltas.reduce((sum, delta) => sum + (typeof delta?.threat_delta === "number" ? delta.threat_delta : 0), 0);
    out.rel = `A ${formatSigned(sumA)} / R ${formatSigned(sumR)} / T ${formatSigned(sumT)}`;
  }

  const flags: any[] = Array.isArray(predicted.flags_set) ? predicted.flags_set : [];
  if (flags.length > 0) out.flags = flags.map(String).join(", ");

  return out;
}

export function rejectHasStandingRisk(prospect: any): boolean {
  const predicted: any = prospect?.predicted_effects;
  const relationshipDeltas: any[] = Array.isArray(predicted?.relationship_deltas) ? predicted.relationship_deltas : [];
  if (relationshipDeltas.length === 0) return false;
  return relationshipDeltas.some((delta) => {
    const allegiance = typeof delta?.allegiance_delta === "number" ? delta.allegiance_delta : 0;
    const respect = typeof delta?.respect_delta === "number" ? delta.respect_delta : 0;
    const threat = typeof delta?.threat_delta === "number" ? delta.threat_delta : 0;
    return allegiance < 0 || respect < 0 || threat > 0;
  });
}

export function readCourtRosterFromSnapshot(ctx: any): { entries: CourtRosterEntry[]; court_size: number | null } {
  const entries: CourtRosterEntry[] = [];

  const previewState: any = ctx?.preview_state ?? {};
  const report: any = ctx?.report ?? {};
  const peopleRec: any = previewState?.people && typeof previewState.people === "object" ? previewState.people : {};

  const kinEdges: any[] = Array.isArray(previewState?.kinship_edges) ? previewState.kinship_edges : Array.isArray(previewState?.kinship) ? previewState.kinship : [];
  const parentsByChild = buildParentsIndex(kinEdges);
  const { houseLabelById, personHouseById } = buildHouseIndexes(previewState?.houses);

  const householdRosterView: any = report?.household_roster_view ?? null;
  const householdRoleByPersonId = new Map<string, { role_label: string | null; badges: string[] }>();
  {
    const rows: any[] =
      (householdRosterView && Array.isArray(householdRosterView.rows) && householdRosterView.rows) ||
      (householdRosterView && Array.isArray(householdRosterView.entries) && householdRosterView.entries) ||
      [];
    for (const row of rows) {
      const personId = typeof row?.person_id === "string" ? row.person_id : typeof row?.id === "string" ? row.id : "";
      if (!personId) continue;
      const roleLabel = typeof row?.role_label === "string" ? row.role_label : null;
      const badges: string[] = Array.isArray(row?.badges) ? row.badges.filter((badge: any) => typeof badge === "string") : [];
      householdRoleByPersonId.set(personId, { role_label: roleLabel, badges });
    }
  }

  const officerRoleLabel = (role: string | null): string | null => {
    if (!role) return null;
    if (role === "steward") return "Steward";
    if (role === "clerk") return "Clerk";
    if (role === "marshal") return "Marshal";
    return role;
  };

  const genericRoleLabel = (role: string | null): string | null => {
    if (!role) return null;
    if (role === "head") return "Head of House";
    if (role === "spouse") return "Spouse";
    if (role === "child") return "Child";
    if (role === "courtier") return "Courtier";
    if (role === "resident") return "Resident";
    if (role === "officer") return "Officer";
    return role;
  };

  const courtSizeRaw: any =
    report?.court_headcount ??
    report?.court_headcount_alive ??
    ctx?.court_roster?.headcount_alive ??
    report?.court_roster?.headcount_alive ??
    null;
  const court_size = typeof courtSizeRaw === "number" && Number.isFinite(courtSizeRaw) ? Math.trunc(courtSizeRaw) : null;

  const view: any =
    ctx?.court_roster_view ??
    report?.court_roster_view ??
    ctx?.derived_views?.court_roster ??
    ctx?.derivedViews?.court_roster ??
    null;

  const rowsAny: any =
    (view && Array.isArray(view.entries) && view.entries) ||
    (view && Array.isArray(view.rows) && view.rows) ||
    (ctx?.court_roster && Array.isArray(ctx.court_roster.rows) && ctx.court_roster.rows) ||
    (report?.court_roster && Array.isArray(report.court_roster.rows) && report.court_roster.rows) ||
    [];

  for (const row of rowsAny as any[]) {
    if (!row || typeof row !== "object") continue;
    const personId: string =
      typeof row.person_id === "string"
        ? row.person_id
        : typeof row.id === "string"
          ? row.id
          : typeof row.personId === "string"
            ? row.personId
            : "";
    if (!personId) continue;

    const person = peopleRec?.[personId];
    const personLike: PersonLike = person && typeof person === "object" ? (person as PersonLike) : ({ id: personId, name: personId } as PersonLike);

    const roleRaw: string | null = typeof row.role === "string" ? row.role : null;
    const officerRoleRaw: string | null = typeof row.officer_role === "string" ? row.officer_role : null;

    const role_label: string | null =
      typeof row.role_label === "string"
        ? row.role_label
        : typeof row.derived_role_label === "string"
          ? row.derived_role_label
          : typeof row.relationship_label === "string"
            ? row.relationship_label
            : householdRoleByPersonId.get(personId)?.role_label ?? genericRoleLabel(roleRaw);

    const officer_role_label: string | null =
      typeof row.officer_role_label === "string"
        ? row.officer_role_label
        : typeof row.officerRoleLabel === "string"
          ? row.officerRoleLabel
          : officerRoleLabel(officerRoleRaw);

    const badgesRaw: string[] = Array.isArray(row.badges) ? row.badges.filter((badge: any) => typeof badge === "string") : [];
    const householdBadges = householdRoleByPersonId.get(personId)?.badges ?? [];
    const badges = [...new Set([...badgesRaw, ...householdBadges])].sort((a, b) => a.localeCompare(b));

    const parents_line = formatParentsLine(personId, parentsByChild, peopleRec, houseLabelById, personHouseById);
    entries.push({ person: personLike, role_label, officer_role_label, badges, parents_line });
  }

  return { entries, court_size };
}
