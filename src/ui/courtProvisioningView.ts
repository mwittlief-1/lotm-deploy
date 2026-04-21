import type { RunState } from "../sim/types";
import type {
  CourtProvisioningEntry,
  CourtProvisioningView,
  CourtStipendEntry,
  CourtStipendRegistry
} from "../sim/domains/people/courtProvisioningRegistry";

export type CourtProvisioningSummaryCard = {
  detail: string;
  id: "court_members" | "ration_demand" | "allocation_result" | "stipend_coin";
  label: string;
  value: string;
};

export type CourtProvisioningAllocationRow = {
  allocationPriority: number;
  badgeLabels: string[];
  personId: string;
  personName: string;
  rationLevelLabel: string;
  requestLabel: string;
  shortfallLabel: string;
  statusLabel: string;
};

export type CourtProvisioningOverrideRow = {
  carryForwardLabel: string;
  lodgingLevelLabel: string;
  personId: string;
  personName: string;
  provisioningClassLabel: string;
  rationLevelLabel: string;
  roleSummary: string;
  seatSummary: string;
  serviceSummary: string;
  statusLabel: string;
};

export type CourtProvisioningStipendRow = {
  activeSeatSummary: string;
  appliesReceiptLabel: string;
  carryForwardLabel: string;
  paymentBasisLabel: string;
  personId: string;
  personName: string;
  provisioningClassLabel: string;
  receiptCategoryLabel: string;
  serviceSummary: string;
  stipendAmountLabel: string;
  stipendKey: string;
};

export type CourtProvisioningHouseholdRow = {
  allocatedLabel: string;
  carryForwardLabel: string;
  contextLabel: string;
  lodgingLevelLabel: string;
  personId: string;
  personName: string;
  provisioningClassLabel: string;
  rationLevelLabel: string;
  requestLabel: string;
  roleSummary: string;
  shortfallLabel: string;
  statusLabel: string;
  supportLabel: string;
};

export type CourtProvisioningRationingDecision = {
  decision: "not_editable_v0_3_6";
  detail: string;
  label: string;
};

export type CourtProvisioningDebugRow = {
  key: string;
  label: string;
  value: string;
};

export type CourtProvisioningDebugEntryRow = {
  activeSeatSummary: string;
  badgeSummary: string;
  carryForwardLabel: string;
  lodgingLevelLabel: string;
  personId: string;
  personName: string;
  provisioningClassLabel: string;
  rationLevelLabel: string;
  rationRuleId: string;
  seatSummary: string;
  serviceSummary: string;
  statusLabel: string;
  stipendAmountLabel: string;
  stipendBasisLabel: string;
  stipendKey: string;
};

export type CourtProvisioningDebugStipendRow = {
  appliesReceiptLabel: string;
  carryForwardLabel: string;
  paymentBasisLabel: string;
  personId: string;
  personName: string;
  receiptCategoryLabel: string;
  ruleId: string;
  stipendAmountLabel: string;
  stipendKey: string;
};

export type CourtProvisioningSurface = {
  allocationRows: CourtProvisioningAllocationRow[];
  debugEntryRows: CourtProvisioningDebugEntryRow[];
  debugRows: CourtProvisioningDebugRow[];
  debugStipendRows: CourtProvisioningDebugStipendRow[];
  helperText: string;
  householdRows: CourtProvisioningHouseholdRow[];
  overrideRows: CourtProvisioningOverrideRow[];
  rationingDecision: CourtProvisioningRationingDecision;
  schemaVersion: string;
  stipendRows: CourtProvisioningStipendRow[];
  subtitle: string;
  summaryCards: CourtProvisioningSummaryCard[];
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function asProvisioningView(previewState: RunState | null | undefined): CourtProvisioningView | null {
  const value = (previewState as any)?.court_provisioning_view;
  if (!value || typeof value !== "object") return null;
  return value.schema_version === "court_provisioning_view_v1" ? (value as CourtProvisioningView) : null;
}

function asStipendRegistry(previewState: RunState | null | undefined): CourtStipendRegistry | null {
  const value = (previewState as any)?.court_stipend_registry;
  if (!value || typeof value !== "object") return null;
  return value.schema_version === "court_stipend_registry_v1" ? (value as CourtStipendRegistry) : null;
}

function formatToken(value: string | null | undefined): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "Unknown";
  return token
    .split(/[._]/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatInteger(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.trunc(value)) : "0";
}

function formatRationPair(food: number | null | undefined, meat: number | null | undefined): string {
  return `${formatInteger(food)} food / ${formatInteger(meat)} meat`;
}

function formatStringList(values: readonly string[] | null | undefined, emptyLabel = "None"): string {
  const items = Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  return items.length > 0 ? [...items].sort(compareText).join(", ") : emptyLabel;
}

function carryForwardLabel(value: boolean): string {
  return value ? "Carried from prior turn" : "Seeded this turn";
}

function stipendAmountLabel(entry: CourtStipendEntry | CourtProvisioningEntry): string {
  const amount = entry.stipend_policy?.stipend_amount ?? 0;
  return `${Math.trunc(amount)} coin`;
}

function personNameById(view: CourtProvisioningView): Map<string, string> {
  return new Map(
    view.person_ids.map((personId) => [personId, view.entries_by_person_id[personId]?.person_name ?? personId])
  );
}

export function buildCourtProvisioningSurface(
  previewState: RunState | null | undefined
): CourtProvisioningSurface | null {
  const view = asProvisioningView(previewState);
  const stipendRegistry = asStipendRegistry(previewState);

  if (!view || !stipendRegistry) return null;

  const policy = view.fiscal_policy;
  const namesById = personNameById(view);
  const atRiskNames = policy.at_risk_person_ids.map((personId) => namesById.get(personId) ?? personId);

  const allocationRows = policy.allocation_order
    .map((personId) => {
      const entry = view.entries_by_person_id[personId];
      if (!entry) return null;

      return {
        allocationPriority: entry.ration_policy.allocation_priority,
        badgeLabels: [...entry.undernourishment_badges],
        personId,
        personName: entry.person_name,
        rationLevelLabel: formatToken(entry.ration_level),
        requestLabel: formatRationPair(entry.ration_policy.requested_food_units, entry.ration_policy.requested_meat_units),
        shortfallLabel:
          entry.ration_policy.food_shortfall_units > 0 || entry.ration_policy.meat_shortfall_units > 0
            ? formatRationPair(entry.ration_policy.food_shortfall_units, entry.ration_policy.meat_shortfall_units)
            : "No shortfall",
        statusLabel: formatToken(entry.ration_policy.status)
      };
    })
    .filter((row): row is CourtProvisioningAllocationRow => row !== null);

  const overrideRows = [...view.person_ids]
    .sort(compareText)
    .map((personId) => {
      const entry = view.entries_by_person_id[personId];
      if (!entry) return null;

      return {
        carryForwardLabel: carryForwardLabel(entry.carried_forward_from_prior),
        lodgingLevelLabel: formatToken(entry.lodging_level),
        personId,
        personName: entry.person_name,
        provisioningClassLabel: formatToken(entry.provisioning_class),
        rationLevelLabel: formatToken(entry.ration_level),
        roleSummary: formatStringList(entry.court_role_labels),
        seatSummary: formatStringList(entry.active_seat_ids),
        serviceSummary: formatStringList(entry.active_service_record_ids),
        statusLabel: formatToken(entry.ration_policy.status)
      };
    })
    .filter((row): row is CourtProvisioningOverrideRow => row !== null);

  const stipendRows = [...stipendRegistry.stipend_keys]
    .sort(compareText)
    .map((stipendKey) => {
      const entry = stipendRegistry.entries_by_key[stipendKey];
      if (!entry) return null;

      return {
        activeSeatSummary: formatStringList(entry.active_seat_ids),
        appliesReceiptLabel: entry.stipend_policy.applies_receipt ? "Receipt applies" : "Placeholder only",
        carryForwardLabel: carryForwardLabel(entry.carry_forward_from_prior),
        paymentBasisLabel: formatToken(entry.payment_basis),
        personId: entry.person_id,
        personName: entry.person_name,
        provisioningClassLabel: formatToken(entry.provisioning_class),
        receiptCategoryLabel: formatToken(entry.receipt_category),
        serviceSummary: formatStringList(entry.service_record_ids),
        stipendAmountLabel: `${Math.trunc(entry.stipend_amount)} coin`,
        stipendKey: entry.stipend_key
      };
    })
    .filter((row): row is CourtProvisioningStipendRow => row !== null);

  const householdRows = policy.allocation_order
    .map((personId) => {
      const entry = view.entries_by_person_id[personId];
      if (!entry) return null;

      return {
        allocatedLabel: formatRationPair(entry.ration_policy.allocated_food_units, entry.ration_policy.allocated_meat_units),
        carryForwardLabel: carryForwardLabel(entry.carried_forward_from_prior),
        contextLabel: `Seats ${formatStringList(entry.active_seat_ids)} · Service ${formatStringList(entry.active_service_record_ids)}`,
        lodgingLevelLabel: formatToken(entry.lodging_level),
        personId,
        personName: entry.person_name,
        provisioningClassLabel: formatToken(entry.provisioning_class),
        rationLevelLabel: formatToken(entry.ration_level),
        requestLabel: formatRationPair(entry.ration_policy.requested_food_units, entry.ration_policy.requested_meat_units),
        roleSummary: formatStringList(entry.court_role_labels),
        shortfallLabel:
          entry.ration_policy.food_shortfall_units > 0 || entry.ration_policy.meat_shortfall_units > 0
            ? formatRationPair(entry.ration_policy.food_shortfall_units, entry.ration_policy.meat_shortfall_units)
            : "No shortfall",
        statusLabel: formatToken(entry.ration_policy.status),
        supportLabel: `${formatToken(entry.stipend_basis)} · ${stipendAmountLabel(entry)}`
      };
    })
    .filter((row): row is CourtProvisioningHouseholdRow => row !== null);

  const summaryCards: CourtProvisioningSummaryCard[] = [
    {
      detail: atRiskNames.length > 0 ? `Risk watch: ${atRiskNames.join(", ")}` : "No undernourishment risk badges are active in this snapshot.",
      id: "court_members",
      label: "Court roster",
      value: `${view.person_ids.length} court members`
    },
    {
      detail: `${policy.allocation_order.length} entries in deterministic allocation order. Meat here is ration stock already on hand, not a separate live market action.`,
      id: "ration_demand",
      label: "Ration demand",
      value: formatRationPair(policy.total_requested_food_units, policy.total_requested_meat_units)
    },
    {
      detail: atRiskNames.length > 0
        ? `${atRiskNames.length} people are currently flagged at risk because current food or meat stock fell short.`
        : "Every current ration row is covered or external from current food and meat stores.",
      id: "allocation_result",
      label: "Allocation result",
      value: formatRationPair(policy.total_allocated_food_units, policy.total_allocated_meat_units)
    },
    {
      detail: `${stipendRegistry.stipend_keys.length} stipend keys remain available for receipt-backed follow-ons.`,
      id: "stipend_coin",
      label: "Stipend coin",
      value: `${Math.trunc(policy.total_requested_stipend_coin)} coin`
    }
  ];

  const debugRows: CourtProvisioningDebugRow[] = [
    { key: "provisioning_schema_version", label: "provisioning_schema_version", value: view.schema_version },
    { key: "stipend_registry_schema_version", label: "stipend_registry_schema_version", value: stipendRegistry.schema_version },
    { key: "generated_at_turn_index", label: "generated_at_turn_index", value: formatInteger(view.generated_at_turn_index) },
    { key: "person_ids", label: "person_ids", value: formatStringList(view.person_ids) },
    { key: "allocation_order", label: "allocation_order", value: formatStringList(policy.allocation_order) },
    { key: "stipend_keys", label: "stipend_keys", value: formatStringList(stipendRegistry.stipend_keys) },
    { key: "total_requested_food_units", label: "total_requested_food_units", value: formatInteger(policy.total_requested_food_units) },
    { key: "total_requested_meat_units", label: "total_requested_meat_units", value: formatInteger(policy.total_requested_meat_units) },
    { key: "total_allocated_food_units", label: "total_allocated_food_units", value: formatInteger(policy.total_allocated_food_units) },
    { key: "total_allocated_meat_units", label: "total_allocated_meat_units", value: formatInteger(policy.total_allocated_meat_units) },
    { key: "total_requested_stipend_coin", label: "total_requested_stipend_coin", value: formatInteger(policy.total_requested_stipend_coin) },
    { key: "at_risk_person_ids", label: "at_risk_person_ids", value: formatStringList(policy.at_risk_person_ids) }
  ];

  const debugEntryRows = [...view.person_ids]
    .sort(compareText)
    .map((personId) => {
      const entry = view.entries_by_person_id[personId];
      if (!entry) return null;

      return {
        activeSeatSummary: formatStringList(entry.active_seat_ids),
        badgeSummary: formatStringList(entry.undernourishment_badges),
        carryForwardLabel: carryForwardLabel(entry.carried_forward_from_prior),
        lodgingLevelLabel: formatToken(entry.lodging_level),
        personId,
        personName: entry.person_name,
        provisioningClassLabel: formatToken(entry.provisioning_class),
        rationLevelLabel: formatToken(entry.ration_level),
        rationRuleId: entry.ration_policy.rule_id,
        seatSummary: formatStringList(entry.active_seat_ids),
        serviceSummary: formatStringList(entry.active_service_record_ids),
        statusLabel: formatToken(entry.ration_policy.status),
        stipendAmountLabel: stipendAmountLabel(entry),
        stipendBasisLabel: formatToken(entry.stipend_basis),
        stipendKey: entry.stipend_key
      };
    })
    .filter((row): row is CourtProvisioningDebugEntryRow => row !== null);

  const debugStipendRows = [...stipendRegistry.stipend_keys]
    .sort(compareText)
    .map((stipendKey) => {
      const entry = stipendRegistry.entries_by_key[stipendKey];
      if (!entry) return null;

      return {
        appliesReceiptLabel: entry.stipend_policy.applies_receipt ? "Yes" : "No",
        carryForwardLabel: carryForwardLabel(entry.carry_forward_from_prior),
        paymentBasisLabel: formatToken(entry.payment_basis),
        personId: entry.person_id,
        personName: entry.person_name,
        receiptCategoryLabel: formatToken(entry.receipt_category),
        ruleId: entry.rule_id,
        stipendAmountLabel: `${Math.trunc(entry.stipend_amount)} coin`,
        stipendKey
      };
    })
    .filter((row): row is CourtProvisioningDebugStipendRow => row !== null);

  return {
    allocationRows,
    debugEntryRows,
    debugRows,
    debugStipendRows,
    helperText:
      "This sheet stays on the accepted provisioning view and stipend registry. It explains current ration allocation, carry-forward defaults, and stipend placeholders without mutating sim state directly. Rationing is intentionally not editable in v0.3.6.",
    householdRows,
    overrideRows,
    rationingDecision: {
      decision: "not_editable_v0_3_6",
      detail:
        "v0.3.6 has no canonical ration-change decision payload. The UI shows effective rations, allocation, and shortfall evidence only; any future ration controls must route through an owned decision flow before mutating sim state.",
      label: "Rationing is read-only in v0.3.6"
    },
    schemaVersion: view.schema_version,
    stipendRows,
    subtitle: `${view.person_ids.length} court members · ${formatRationPair(
      policy.total_requested_food_units,
      policy.total_requested_meat_units
    )} requested · ${Math.trunc(policy.total_requested_stipend_coin)} coin stipends`,
    summaryCards
  };
}
