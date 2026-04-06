import type { RunState } from "../../types";
import { asNonNegInt } from "../../util";

export const COURT_DELEGATION_REGISTRY_SCHEMA_VERSION = "court_delegation_registry_v0" as const;
export const COURT_DELEGATION_EFFECT_CONTRACT_SCHEMA_VERSION = "court_delegation_effect_contract_v0" as const;
export const COURT_DELEGATION_VIEW_SCHEMA_VERSION = "court_delegation_view_v0" as const;

export const COURT_DELEGATION_ACTIONS = [
  "gift_liege",
  "offering_church",
  "marriage_scout",
  "maintenance",
] as const;
export type CourtDelegationAction = (typeof COURT_DELEGATION_ACTIONS)[number];

export const COURT_DELEGATION_MODES = ["manual", "delegated"] as const;
export type CourtDelegationMode = (typeof COURT_DELEGATION_MODES)[number];

export type CourtDelegationEffectContractV0 = {
  schema_version: typeof COURT_DELEGATION_EFFECT_CONTRACT_SCHEMA_VERSION;
  budget_cost_delta: number;
  budget_cost_floor: number;
  amount_multiplier_pct: number;
  energy_cost_delta: number;
  energy_cost_floor: number;
};

export type CourtDelegationRegistryEntryV0 = {
  action: CourtDelegationAction;
  mode: CourtDelegationMode;
  delegated: boolean;
  summary_label: string;
  effect: CourtDelegationEffectContractV0;
};

export type CourtDelegationRegistryV0 = {
  schema_version: typeof COURT_DELEGATION_REGISTRY_SCHEMA_VERSION;
  action_keys: CourtDelegationAction[];
  active_action_keys: CourtDelegationAction[];
  entries_by_action: Record<CourtDelegationAction, CourtDelegationRegistryEntryV0>;
};

export type CourtDelegationActionViewV0 = {
  action: CourtDelegationAction;
  mode: CourtDelegationMode;
  delegated: boolean;
  summary_label: string;
  budget_cost_delta: number;
  budget_cost_floor: number;
  amount_multiplier_pct: number;
  energy_cost_delta: number;
  energy_cost_floor: number;
};

export type CourtDelegationViewV0 = {
  schema_version: typeof COURT_DELEGATION_VIEW_SCHEMA_VERSION;
  action_keys: CourtDelegationAction[];
  active_action_keys: CourtDelegationAction[];
  actions: CourtDelegationActionViewV0[];
};

export type CourtDelegationEffectContractDraft = Partial<
  Omit<CourtDelegationEffectContractV0, "schema_version">
>;

export type CourtDelegationRegistryEntryDraft = {
  action: CourtDelegationAction;
  mode?: CourtDelegationMode;
  delegated?: boolean;
  summary_label?: string;
  effect?: CourtDelegationEffectContractDraft;
};

const ACTION_SUMMARY_LABELS: Record<CourtDelegationAction, string> = {
  gift_liege: "Liege gifts",
  offering_church: "Church offerings",
  marriage_scout: "Marriage scouting",
  maintenance: "Maintenance",
};

function registryFrom(value: CourtDelegationRegistryV0 | RunState): CourtDelegationRegistryV0 {
  if (!("run_seed" in value)) return normalizeCourtDelegationRegistry(value);

  const existing = (value.house as any)?.court_delegation_registry;
  return existing &&
    typeof existing === "object" &&
    existing.schema_version === COURT_DELEGATION_REGISTRY_SCHEMA_VERSION
    ? normalizeCourtDelegationRegistry(existing)
    : createCourtDelegationRegistry();
}

function normalizeInteger(value: number | null | undefined): number {
  return Math.trunc(Number.isFinite(value) ? Number(value) : 0);
}

function normalizePct(value: number | null | undefined): number {
  return Math.max(0, normalizeInteger(value ?? 100));
}

export function isCourtDelegationAction(value: string): value is CourtDelegationAction {
  return (COURT_DELEGATION_ACTIONS as readonly string[]).includes(value);
}

function normalizeMode(value: CourtDelegationMode | undefined, delegated: boolean): CourtDelegationMode {
  if (value === "manual" || value === "delegated") return value;
  return delegated ? "delegated" : "manual";
}

export function createCourtDelegationEffectContract(
  draft?: CourtDelegationEffectContractDraft | null
): CourtDelegationEffectContractV0 {
  return {
    schema_version: COURT_DELEGATION_EFFECT_CONTRACT_SCHEMA_VERSION,
    budget_cost_delta: normalizeInteger(draft?.budget_cost_delta),
    budget_cost_floor: asNonNegInt(draft?.budget_cost_floor),
    amount_multiplier_pct: normalizePct(draft?.amount_multiplier_pct),
    energy_cost_delta: normalizeInteger(draft?.energy_cost_delta),
    energy_cost_floor: asNonNegInt(draft?.energy_cost_floor),
  };
}

export function createCourtDelegationRegistryEntry(
  draft: CourtDelegationRegistryEntryDraft
): CourtDelegationRegistryEntryV0 {
  const delegated = Boolean(draft.delegated ?? draft.mode === "delegated");
  const effect = createCourtDelegationEffectContract(draft.effect);

  return {
    action: draft.action,
    mode: normalizeMode(draft.mode, delegated),
    delegated,
    summary_label: (draft.summary_label ?? ACTION_SUMMARY_LABELS[draft.action]).trim() || ACTION_SUMMARY_LABELS[draft.action],
    effect,
  };
}

function baselineEntryForAction(action: CourtDelegationAction): CourtDelegationRegistryEntryV0 {
  return createCourtDelegationRegistryEntry({ action });
}

export function buildCourtDelegationRegistry(
  drafts: readonly CourtDelegationRegistryEntryDraft[] = []
): CourtDelegationRegistryV0 {
  const draftByAction = new Map<CourtDelegationAction, CourtDelegationRegistryEntryDraft>();

  for (const draft of drafts) {
    if (!draft || !isCourtDelegationAction(draft.action)) continue;
    draftByAction.set(draft.action, draft);
  }

  const entriesByAction = Object.fromEntries(
    COURT_DELEGATION_ACTIONS.map((action) => [
      action,
      createCourtDelegationRegistryEntry(draftByAction.get(action) ?? { action }),
    ])
  ) as Record<CourtDelegationAction, CourtDelegationRegistryEntryV0>;

  const actionKeys = [...COURT_DELEGATION_ACTIONS];
  const activeActionKeys = actionKeys.filter((action) => entriesByAction[action].delegated);

  return {
    schema_version: COURT_DELEGATION_REGISTRY_SCHEMA_VERSION,
    action_keys: actionKeys,
    active_action_keys: activeActionKeys,
    entries_by_action: entriesByAction,
  };
}

export function normalizeCourtDelegationRegistry(value: any): CourtDelegationRegistryV0 {
  const drafts: CourtDelegationRegistryEntryDraft[] = [];
  const rawEntries =
    value && typeof value === "object" && value.entries_by_action && typeof value.entries_by_action === "object"
      ? value.entries_by_action
      : {};

  for (const [action, rawEntry] of Object.entries(rawEntries)) {
    if (!isCourtDelegationAction(action)) continue;
    drafts.push({
      action,
      mode: rawEntry && typeof rawEntry === "object" ? rawEntry.mode : undefined,
      delegated: rawEntry && typeof rawEntry === "object" ? Boolean(rawEntry.delegated) : undefined,
      summary_label: rawEntry && typeof rawEntry === "object" ? rawEntry.summary_label : undefined,
      effect: rawEntry && typeof rawEntry === "object" ? rawEntry.effect : undefined,
    });
  }

  return buildCourtDelegationRegistry(drafts);
}

export function createCourtDelegationRegistry(): CourtDelegationRegistryV0 {
  return buildCourtDelegationRegistry();
}

export function ensureCourtDelegationRegistry(state: RunState): CourtDelegationRegistryV0 {
  const houseAny: any = state.house as any;
  const existing = houseAny?.court_delegation_registry;
  const normalized =
    existing &&
    typeof existing === "object" &&
    existing.schema_version === COURT_DELEGATION_REGISTRY_SCHEMA_VERSION
      ? normalizeCourtDelegationRegistry(existing)
      : createCourtDelegationRegistry();

  houseAny.court_delegation_registry = normalized;
  houseAny.court_delegation_view = buildCourtDelegationView(normalized);
  return normalized;
}

export function buildCourtDelegationView(value: CourtDelegationRegistryV0 | RunState): CourtDelegationViewV0 {
  const registry = registryFrom(value);

  return {
    schema_version: COURT_DELEGATION_VIEW_SCHEMA_VERSION,
    action_keys: [...registry.action_keys],
    active_action_keys: [...registry.active_action_keys],
    actions: registry.action_keys.map((action) => {
      const entry = registry.entries_by_action[action];
      return {
        action,
        mode: entry.mode,
        delegated: entry.delegated,
        summary_label: entry.summary_label,
        budget_cost_delta: entry.effect.budget_cost_delta,
        budget_cost_floor: entry.effect.budget_cost_floor,
        amount_multiplier_pct: entry.effect.amount_multiplier_pct,
        energy_cost_delta: entry.effect.energy_cost_delta,
        energy_cost_floor: entry.effect.energy_cost_floor,
      };
    }),
  };
}

export function resolveCourtDelegationEntry(
  value: CourtDelegationRegistryV0 | RunState,
  action: CourtDelegationAction
): CourtDelegationRegistryEntryV0 {
  const registry = "run_seed" in value ? ensureCourtDelegationRegistry(value) : normalizeCourtDelegationRegistry(value);
  return registry.entries_by_action[action] ?? baselineEntryForAction(action);
}

export function resolveDelegatedBudgetCost(
  baseCost: number,
  entry: CourtDelegationRegistryEntryV0 | CourtDelegationEffectContractV0
): number {
  const effect = "effect" in entry ? entry.effect : entry;
  const base = asNonNegInt(baseCost);
  return Math.max(effect.budget_cost_floor, base + normalizeInteger(effect.budget_cost_delta));
}

export function resolveDelegatedAmount(
  baseAmount: number,
  entry: CourtDelegationRegistryEntryV0 | CourtDelegationEffectContractV0
): number {
  const effect = "effect" in entry ? entry.effect : entry;
  const base = asNonNegInt(baseAmount);
  return Math.max(0, Math.trunc((base * effect.amount_multiplier_pct) / 100));
}

export function resolveDelegatedEnergyCost(
  baseCost: number,
  entry: CourtDelegationRegistryEntryV0 | CourtDelegationEffectContractV0
): number {
  const effect = "effect" in entry ? entry.effect : entry;
  const base = asNonNegInt(baseCost);
  return Math.max(effect.energy_cost_floor, base + normalizeInteger(effect.energy_cost_delta));
}
