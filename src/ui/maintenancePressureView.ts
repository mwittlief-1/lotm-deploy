import {
  buildEconomyMaintenanceView,
  type EconomyMaintenanceManorSummaryV1,
  type EconomyMaintenanceSummaryEntryV1,
  type EconomyMaintenanceViewV1
} from "../sim/domains/economy/maintenance";
import type { RunState } from "../sim/types";

export type MaintenancePressureEntryRow = {
  coinCost: number;
  entryId: string;
  kindLabel: string;
  laborRequired: number;
  label: string;
  ledgerPaidCoinCost: number;
  ledgerStatusLabel: string;
  manorId: string;
  manorKey: string;
  ruleId: string;
  stateLabel: string;
};

export type MaintenancePressureManorRow = {
  buildingCount: number;
  coinCost: number;
  entryCount: number;
  laborRequired: number;
  ledgerPaidCoinCost: number;
  manorId: string;
  manorKey: string;
  manorLabel: string;
  rightCount: number;
  rows: MaintenancePressureEntryRow[];
};

export type MaintenancePressureCoinAudit = {
  coinReceiptAmount: number;
  coinReconciled: boolean;
  coinWalkdownAmount: number | null;
  summary: string;
};

export type MaintenancePressureSurface = {
  coinAudit?: MaintenancePressureCoinAudit;
  currentManorId: string | null;
  currentManorRow: MaintenancePressureManorRow | null;
  explainPrimary: string | null;
  explainWhy: string | null;
  helperText: string;
  manorRows: MaintenancePressureManorRow[];
  noteLines: string[];
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readWholeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function formatToken(value: string | null | undefined): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "Unknown";
  return token
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatManorLabel(manorId: string, currentManorId: string | null): string {
  if (currentManorId && manorId === currentManorId) return "Current manor";
  const match = manorId.match(/hx_(\d+)/);
  return match ? `Hx ${match[1]}` : manorId;
}

function isEconomyMaintenanceView(value: unknown): value is EconomyMaintenanceViewV1 {
  const record = asRecord(value);
  return !!record && readString(record.schema_version) === "economy_maintenance_view_v1" && Array.isArray(record.manor_keys);
}

function readMaintenanceView(previewState: unknown): EconomyMaintenanceViewV1 | null {
  const previewRecord = asRecord(previewState);
  const explicitView = previewRecord?.economy_maintenance_view;
  if (isEconomyMaintenanceView(explicitView)) return explicitView as EconomyMaintenanceViewV1;

  if (previewRecord?.manor && previewRecord?.house) {
    try {
      return buildEconomyMaintenanceView(previewState as RunState);
    } catch {
      return null;
    }
  }

  return null;
}

function currentManorIdFromPreviewState(previewState: unknown, manorRows: Array<{ manorId: string }>): string | null {
  const previewRecord = asRecord(previewState);
  const topologyView = asRecord(previewRecord?.world_topology_view);
  const anchorManorId = readString(topologyView?.anchor_manor_id);
  if (anchorManorId) return anchorManorId;
  return manorRows[0]?.manorId ?? null;
}

function toEntryRow(
  manorId: string,
  manorKey: string,
  entry: EconomyMaintenanceSummaryEntryV1,
  receiptAudit: MaintenanceReceiptAudit
): MaintenancePressureEntryRow {
  const ruleId = readString((entry as any).rule_id) ?? "";
  const counterpartyId = readString((entry as any).counterparty_id) ?? "";
  const ledgerPaidCoinCost = (ruleId ? receiptAudit.paidByRuleId.get(ruleId) : undefined)
    ?? (counterpartyId ? receiptAudit.paidByCounterpartyId.get(counterpartyId) : undefined)
    ?? 0;
  return {
    coinCost: readWholeNumber(entry.coin_cost),
    entryId: entry.entry_id,
    kindLabel: formatToken(entry.entry_kind),
    laborRequired: readWholeNumber(entry.labor_required),
    label: entry.source_label,
    ledgerPaidCoinCost,
    ledgerStatusLabel:
      ledgerPaidCoinCost > 0
        ? `Ledger-paid ${ledgerPaidCoinCost} coin`
        : readWholeNumber(entry.coin_cost) > 0
          ? "Modeled cost; 0 coin charged this turn"
          : "No coin cost",
    manorId,
    manorKey,
    ruleId,
    stateLabel: formatToken(entry.source_state)
  };
}

type MaintenanceReceiptAudit = {
  paidByCounterpartyId: Map<string, number>;
  paidByRuleId: Map<string, number>;
  totalPaidCoin: number;
};

function emptyMaintenanceReceiptAudit(): MaintenanceReceiptAudit {
  return {
    paidByCounterpartyId: new Map(),
    paidByRuleId: new Map(),
    totalPaidCoin: 0
  };
}

function addToMap(map: Map<string, number>, key: string | null, amount: number): void {
  if (!key || amount <= 0) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

function readMaintenanceReceiptAudit(report: unknown): MaintenanceReceiptAudit {
  const reportRecord = asRecord(report);
  if (!reportRecord) return emptyMaintenanceReceiptAudit();

  const audit = emptyMaintenanceReceiptAudit();
  const phaseResults = [
    ...(Array.isArray(reportRecord.phase_results_v0) ? reportRecord.phase_results_v0 : []),
    ...(Array.isArray(reportRecord.resolution_phase_results_v0) ? reportRecord.resolution_phase_results_v0 : [])
  ];

  for (const phaseResult of phaseResults) {
    const phaseRecord = asRecord(phaseResult);
    const fiscalReceipts = Array.isArray(phaseRecord?.fiscal_receipts_v1) ? phaseRecord.fiscal_receipts_v1 : [];
    for (const receipt of fiscalReceipts) {
      const receiptRecord = asRecord(receipt);
      const asset = readString(receiptRecord?.asset);
      const delta = readNumber(receiptRecord?.delta) ?? 0;
      const category = readString(receiptRecord?.category) ?? "";
      const summary = readString(receiptRecord?.summary) ?? "";
      const isMaintenance = category.includes("maintenance") || summary.toLowerCase().includes("upkeep");
      if (asset !== "coin" || delta >= 0 || !isMaintenance) continue;

      const amount = Math.abs(delta);
      audit.totalPaidCoin += amount;
      addToMap(audit.paidByRuleId, readString(receiptRecord?.rule_id), amount);
      addToMap(audit.paidByCounterpartyId, readString(receiptRecord?.counterparty_id), amount);
    }
  }

  return audit;
}

function readCoinMaintenanceWalkdownAmount(report: unknown): number | null {
  const turnExplanation = asRecord(asRecord(report)?.turn_explanation_v1);
  const coinWalkdown = asRecord(turnExplanation?.coin_walkdown);
  const rows = Array.isArray(coinWalkdown?.rows) ? coinWalkdown.rows : [];
  for (const row of rows) {
    const rowRecord = asRecord(row);
    if (readString(rowRecord?.id) !== "coin_maintenance") continue;
    return readWholeNumber(rowRecord?.amount);
  }
  return null;
}

function coinAuditSummary(audit: MaintenanceReceiptAudit, coinWalkdownAmount: number | null): MaintenancePressureCoinAudit {
  const coinReconciled = coinWalkdownAmount === null || audit.totalPaidCoin === coinWalkdownAmount;
  const summary =
    coinWalkdownAmount === null
      ? "No coin walkdown was available; requested upkeep rows are shown as model pressure only."
      : coinReconciled
        ? `Ledger-paid upkeep is ${audit.totalPaidCoin} coin and reconciles to the coin maintenance walkdown.`
        : `Ledger-paid upkeep is ${audit.totalPaidCoin} coin, but the coin maintenance walkdown shows ${coinWalkdownAmount} coin.`;

  return {
    coinReceiptAmount: audit.totalPaidCoin,
    coinReconciled,
    coinWalkdownAmount,
    summary
  };
}

function readMaintenanceNoteLines(report: unknown): string[] {
  const reportRecord = asRecord(report);
  const lines: string[] = [];
  const seen = new Set<string>();

  const pushLine = (value: unknown) => {
    const line = readString(value);
    if (!line) return;
    if (!line.toLowerCase().includes("maintenance")) return;
    if (seen.has(line)) return;
    seen.add(line);
    lines.push(line);
  };

  const notes = Array.isArray(reportRecord?.notes) ? reportRecord.notes : [];
  for (const note of notes) pushLine(note);

  const phaseResults = Array.isArray(reportRecord?.phase_results_v0) ? reportRecord.phase_results_v0 : [];
  for (const phaseResult of phaseResults) {
    const phaseRecord = asRecord(phaseResult);
    const receipts = Array.isArray(phaseRecord?.receipts) ? phaseRecord.receipts : [];
    for (const receipt of receipts) {
      pushLine(asRecord(receipt)?.line);
    }

    const fiscalReceipts = Array.isArray(phaseRecord?.fiscal_receipts_v1) ? phaseRecord.fiscal_receipts_v1 : [];
    for (const receipt of fiscalReceipts) {
      const fiscalRecord = asRecord(receipt);
      const category = readString(fiscalRecord?.category) ?? "";
      const summary = readString(fiscalRecord?.summary);
      if (category.includes("maintenance")) pushLine(summary ?? category);
    }
  }

  return lines;
}

function explainPrimaryForRow(row: MaintenancePressureManorRow): string {
  return `Maintenance: ${row.laborRequired} labor, ${row.coinCost} coin across ${row.entryCount} upkeep row${row.entryCount === 1 ? "" : "s"}.`;
}

function explainWhyForRow(row: MaintenancePressureManorRow): string {
  if (row.rightCount > 0 && row.buildingCount > 0) {
    return "Buildings and rights both contribute upkeep pressure, so labor drag is visible here instead of hiding inside lower output.";
  }
  if (row.rightCount > 0) {
    return "Rights upkeep remains visible here so labor and coin pressure does not disappear into lower output totals.";
  }
  return "Building upkeep remains visible here so labor and coin pressure does not disappear into lower output totals.";
}

export function buildMaintenancePressureSurface(args: {
  previewState: unknown;
  report?: unknown;
}): MaintenancePressureSurface | null {
  const { previewState, report } = args;
  const view = readMaintenanceView(previewState);
  if (!view || !Array.isArray(view.manor_keys) || view.manor_keys.length === 0) return null;

  const receiptAudit = readMaintenanceReceiptAudit(report);
  const coinAudit = coinAuditSummary(receiptAudit, readCoinMaintenanceWalkdownAmount(report));
  const manorRowsBase = view.manor_keys
    .map((manorKey) => {
      const summary = view.manor_summaries_by_key?.[manorKey] as EconomyMaintenanceManorSummaryV1 | undefined;
      if (!summary) return null;

      const rows = [...summary.building_entries, ...summary.right_entries].map((entry) =>
        toEntryRow(summary.manor_id, summary.manor_key, entry, receiptAudit)
      );

      return {
        buildingCount: readWholeNumber(summary.totals.building_count),
        coinCost: readWholeNumber(summary.totals.coin_cost),
        entryCount: readWholeNumber(summary.totals.entry_count),
        laborRequired: readWholeNumber(summary.totals.labor_required),
        ledgerPaidCoinCost: rows.reduce((sum, row) => sum + row.ledgerPaidCoinCost, 0),
        manorId: summary.manor_id,
        manorKey: summary.manor_key,
        manorLabel: summary.manor_id,
        rightCount: readWholeNumber(summary.totals.right_count),
        rows
      };
    })
    .filter((row): row is Omit<MaintenancePressureManorRow, "manorLabel"> & { manorLabel: string } => row !== null);

  const currentManorId = currentManorIdFromPreviewState(previewState, manorRowsBase);
  const manorRows = manorRowsBase.map((row) => ({
    ...row,
    manorLabel: formatManorLabel(row.manorId, currentManorId)
  }));
  const currentManorRow = manorRows.find((row) => row.manorId === currentManorId) ?? manorRows[0] ?? null;
  const noteLines = readMaintenanceNoteLines(report);

  return {
    coinAudit,
    currentManorId,
    currentManorRow,
    explainPrimary: noteLines[0] ?? (currentManorRow ? explainPrimaryForRow(currentManorRow) : null),
    explainWhy:
      noteLines.length > 1
        ? noteLines.slice(1).join(" ")
        : currentManorRow
          ? explainWhyForRow(currentManorRow)
          : null,
    helperText:
      "Maintenance rows come from the accepted upkeep read model. Requested coin/labor pressure stays separate from ledger-paid coin; paid upkeep only appears when receipts reconcile to the coin walkdown.",
    manorRows: [...manorRows].sort((left, right) => compareText(left.manorId, right.manorId)),
    noteLines
  };
}
