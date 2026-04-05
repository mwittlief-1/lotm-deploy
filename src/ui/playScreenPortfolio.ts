type PortfolioValueKind = "coin" | "food" | "meat" | "count";
type PortfolioCardTone = "neutral" | "caution" | "danger";

export const PLAY_SCREEN_PORTFOLIO_CONTRACT_SCHEMA_VERSION = "play_screen_portfolio_contract_v1" as const;
export const PLAY_SCREEN_PORTFOLIO_SCOPE_ORDER = ["portfolio", "selected_manor"] as const;
export const PLAY_SCREEN_PORTFOLIO_SURFACE_ORDER = [
  "portfolio_summary",
  "portfolio_outliers",
  "diff_ledger",
  "receipts"
] as const;

export type PortfolioScopeMode = (typeof PLAY_SCREEN_PORTFOLIO_SCOPE_ORDER)[number];
export type PortfolioSurfaceId = (typeof PLAY_SCREEN_PORTFOLIO_SURFACE_ORDER)[number];

export type PortfolioSummaryCard = {
  helper: string;
  id: string;
  label: string;
  tone: PortfolioCardTone;
  value: string;
};

export type PortfolioOutlierFlag = {
  id: string;
  label: string;
  tone: PortfolioCardTone;
  value: string;
};

export type PortfolioOutlierManor = {
  flags: PortfolioOutlierFlag[];
  manorId: string;
  manorLabel: string;
  summary: string;
};

export type PortfolioOverviewSurface = {
  emptyOutliersLabel: string;
  helper: string;
  manorCount: number;
  manorCountLabel: string;
  outlierManors: PortfolioOutlierManor[];
  summaryCards: PortfolioSummaryCard[];
};

export type PortfolioScopeOption = {
  helper: string;
  id: PortfolioScopeMode;
  label: string;
};

export type PortfolioSelectorOption = {
  helper: string;
  id: string;
  isAnchorManor: boolean;
  isOutlier: boolean;
  manorId: string;
  manorKey: string;
  outlierCount: number;
  summary: string;
  title: string;
};

export type PortfolioSelectedManorSurface = {
  helper: string;
  isAnchorManor: boolean;
  manorId: string;
  manorKey: string;
  modeLabel: string;
  outlierFlags: PortfolioOutlierFlag[];
  summary: string;
  summaryCards: PortfolioSummaryCard[];
  title: string;
};

export type PortfolioSurfaceScopeRule = {
  helper: string;
  id: PortfolioSurfaceId;
  label: string;
  mode: PortfolioScopeMode;
};

export type PortfolioEvidenceScopeState = "current_manor" | "selected_manor_live" | "selected_manor_holdings_only";

export type PortfolioEvidenceScope = {
  chipHelperText: string;
  diffLedgerHelper: string;
  diffLedgerScopeLabel: string;
  receiptScopeLabel: string;
  receiptScopeSummary: string;
  state: PortfolioEvidenceScopeState;
};

export type PortfolioScopeContract = {
  anchorManorId: string | null;
  defaultMode: PortfolioScopeMode;
  manorCount: number;
  manorDetailsById: Record<string, PortfolioSelectedManorSurface>;
  portfolioSummary: PortfolioOverviewSurface;
  schemaVersion: typeof PLAY_SCREEN_PORTFOLIO_CONTRACT_SCHEMA_VERSION;
  scopeOptions: PortfolioScopeOption[];
  selectedManor: PortfolioSelectedManorSurface;
  selectedManorId: string;
  selectorHelper: string;
  selectorLabel: string;
  selectorOptions: PortfolioSelectorOption[];
  surfaceScopeRules: PortfolioSurfaceScopeRule[];
};

type TotalCardConfig = {
  helper: string;
  id: string;
  key: string;
  label: string;
  source: "asset" | "category";
  tone: PortfolioCardTone;
  valueKind: PortfolioValueKind;
};

type OutlierMetricConfig = {
  id: string;
  label: string;
  metricKey: string;
  tone: PortfolioCardTone;
  valueKind: PortfolioValueKind;
};

type PortfolioContext = {
  anchorManorId: string | null;
  manorCount: number;
  manorCountLabel: string;
  manorKeys: string[];
  portfolio: Record<string, unknown>;
};

type PortfolioRowMetricConfig = Omit<TotalCardConfig, "source"> & {
  source: "asset" | "category" | "net";
};

type InternalOutlierGroup = {
  flags: Array<PortfolioOutlierFlag & { priority: number }>;
  manorId: string;
  manorKey: string | null;
  manorLabel: string;
};

type ParsedPortfolioRow = {
  isAnchorManor: boolean;
  manorId: string;
  manorKey: string;
  manorLabel: string;
  row: Record<string, unknown>;
};

const TOTAL_CARD_CONFIG: readonly TotalCardConfig[] = [
  {
    id: "coin_total",
    label: "Portfolio coin",
    key: "coin",
    source: "asset",
    helper: "Total held coin across every tracked manor in the bounded portfolio.",
    tone: "neutral",
    valueKind: "coin"
  },
  {
    id: "food_total",
    label: "Food stores",
    key: "food_stores",
    source: "asset",
    helper: "Total grain stores across the tracked manors.",
    tone: "neutral",
    valueKind: "food"
  },
  {
    id: "meat_total",
    label: "Meat stores",
    key: "meat_stores",
    source: "asset",
    helper: "Total preserved meat carried by the tracked manors.",
    tone: "neutral",
    valueKind: "meat"
  },
  {
    id: "coin_due",
    label: "Coin due",
    key: "obligations.current_due.coin",
    source: "category",
    helper: "Current liege dues still sitting in the portfolio rollup.",
    tone: "caution",
    valueKind: "coin"
  },
  {
    id: "food_due",
    label: "Food due",
    key: "obligations.current_due.food_stores",
    source: "category",
    helper: "Current church dues still sitting in the portfolio rollup.",
    tone: "caution",
    valueKind: "food"
  },
  {
    id: "coin_arrears",
    label: "Coin arrears",
    key: "obligations.arrears.coin",
    source: "category",
    helper: "Open coin arrears across the tracked manors.",
    tone: "danger",
    valueKind: "coin"
  },
  {
    id: "food_arrears",
    label: "Food arrears",
    key: "obligations.arrears.food_stores",
    source: "category",
    helper: "Open bushel arrears across the tracked manors.",
    tone: "danger",
    valueKind: "food"
  }
] as const;

const SELECTED_MANOR_CARD_CONFIG: readonly PortfolioRowMetricConfig[] = [
  {
    id: "coin_total",
    label: "Coin on hand",
    key: "coin",
    source: "asset",
    helper: "Coin currently held at the selected manor.",
    tone: "neutral",
    valueKind: "coin"
  },
  {
    id: "food_total",
    label: "Food stores",
    key: "food_stores",
    source: "asset",
    helper: "Stored grain currently held at the selected manor.",
    tone: "neutral",
    valueKind: "food"
  },
  {
    id: "meat_total",
    label: "Meat stores",
    key: "meat_stores",
    source: "asset",
    helper: "Preserved meat currently held at the selected manor.",
    tone: "neutral",
    valueKind: "meat"
  },
  {
    id: "coin_due",
    label: "Coin due",
    key: "obligations.current_due.coin",
    source: "category",
    helper: "Current liege dues still open at the selected manor.",
    tone: "caution",
    valueKind: "coin"
  },
  {
    id: "food_due",
    label: "Food due",
    key: "obligations.current_due.food_stores",
    source: "category",
    helper: "Current church dues still open at the selected manor.",
    tone: "caution",
    valueKind: "food"
  },
  {
    id: "coin_arrears",
    label: "Coin arrears",
    key: "obligations.arrears.coin",
    source: "category",
    helper: "Coin arrears currently carried by the selected manor.",
    tone: "danger",
    valueKind: "coin"
  },
  {
    id: "food_arrears",
    label: "Food arrears",
    key: "obligations.arrears.food_stores",
    source: "category",
    helper: "Food arrears currently carried by the selected manor.",
    tone: "danger",
    valueKind: "food"
  }
] as const;

const OUTLIER_METRIC_CONFIG: readonly OutlierMetricConfig[] = [
  {
    id: "lowest_net_coin",
    label: "Lowest net coin",
    metricKey: "outlier.lowest.net.coin",
    tone: "danger",
    valueKind: "coin"
  },
  {
    id: "lowest_net_food",
    label: "Lowest net food",
    metricKey: "outlier.lowest.net.food_stores",
    tone: "danger",
    valueKind: "food"
  },
  {
    id: "highest_arrears_coin",
    label: "Most coin arrears",
    metricKey: "outlier.highest.arrears_coin",
    tone: "danger",
    valueKind: "coin"
  },
  {
    id: "highest_arrears_food",
    label: "Most food arrears",
    metricKey: "outlier.highest.arrears_bushels",
    tone: "danger",
    valueKind: "food"
  },
  {
    id: "highest_coin",
    label: "Most coin",
    metricKey: "outlier.highest.coin",
    tone: "neutral",
    valueKind: "coin"
  },
  {
    id: "highest_food",
    label: "Most food stores",
    metricKey: "outlier.highest.food_stores",
    tone: "neutral",
    valueKind: "food"
  }
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readWholeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function formatValue(value: number, kind: PortfolioValueKind): string {
  if (kind === "coin") return `${value} coin`;
  if (kind === "food") return `${value} ${value === 1 ? "bushel" : "bushels"}`;
  if (kind === "meat") return `${value} stores`;
  return String(value);
}

function formatManorLabel(manorId: string, anchorManorId: string | null): string {
  if (anchorManorId && manorId === anchorManorId) return "Current manor";
  const cleaned = manorId.replace(/^manor_/, "").replace(/_/g, " ");
  return cleaned.length > 0 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : manorId;
}

function sortText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function readPortfolioTotal(portfolio: Record<string, unknown>, config: TotalCardConfig): number {
  const totalsRecord = asRecord(
    config.source === "asset" ? portfolio.totals_by_asset : portfolio.totals_by_category
  );
  return readWholeNumber(totalsRecord?.[config.key]) ?? 0;
}

function buildSummaryCards(portfolio: Record<string, unknown>): PortfolioSummaryCard[] {
  return TOTAL_CARD_CONFIG.map((config) => ({
    helper: config.helper,
    id: config.id,
    label: config.label,
    tone: config.tone,
    value: formatValue(readPortfolioTotal(portfolio, config), config.valueKind)
  }));
}

function readPortfolioContext(previewState: unknown): PortfolioContext | null {
  const previewStateRecord = asRecord(previewState);
  const portfolio = asRecord(previewStateRecord?.portfolio);
  if (!portfolio) return null;

  const manorKeys = Array.isArray(portfolio.manor_keys)
    ? portfolio.manor_keys.map(readString).filter((value): value is string => value !== null)
    : [];
  const manorCount = manorKeys.length;
  if (manorCount === 0) return null;

  const worldTopologyView = asRecord(previewStateRecord?.world_topology_view);
  const anchorManorId = readString(worldTopologyView?.anchor_manor_id);

  return {
    anchorManorId,
    manorCount,
    manorCountLabel: manorCount === 1 ? "1 tracked manor" : `${manorCount} tracked manors`,
    manorKeys,
    portfolio
  };
}

function readManorMetric(row: Record<string, unknown>, config: PortfolioRowMetricConfig): number {
  if (config.source === "net") {
    return readWholeNumber(asRecord(row.net_values)?.[config.key]) ?? 0;
  }

  const totalsRecord = asRecord(config.source === "asset" ? row.asset_totals : row.category_totals);
  return readWholeNumber(totalsRecord?.[config.key]) ?? 0;
}

function buildSelectedManorCards(row: Record<string, unknown>): PortfolioSummaryCard[] {
  return SELECTED_MANOR_CARD_CONFIG.map((config) => ({
    helper: config.helper,
    id: config.id,
    label: config.label,
    tone: config.tone,
    value: formatValue(readManorMetric(row, config), config.valueKind)
  }));
}

function inferManorIdFromKey(manorKey: string): string {
  const match = manorKey.match(/:manor:([^:]+)$/);
  return match?.[1] ?? manorKey;
}

function buildOutlierGroups(
  portfolio: Record<string, unknown>,
  anchorManorId: string | null
): InternalOutlierGroup[] {
  const outliersByMetric = asRecord(portfolio.outliers_by_metric);
  if (!outliersByMetric) return [];

  const grouped = new Map<string, InternalOutlierGroup>();

  for (const [priority, config] of OUTLIER_METRIC_CONFIG.entries()) {
    const rawEntries = Array.isArray(outliersByMetric[config.metricKey]) ? outliersByMetric[config.metricKey] : [];
    const entry = asRecord(rawEntries[0]);
    if (!entry) continue;

    const manorId = readString(entry.manor_id);
    const manorKey = readString(entry.manor_key);
    const value = readWholeNumber(entry.value);
    if (!manorId || value === null) continue;

    const current =
      grouped.get(manorId) ??
      {
        manorId,
        manorKey,
        manorLabel: formatManorLabel(manorId, anchorManorId),
        flags: []
      };

    current.flags.push({
      id: config.id,
      label: config.label,
      tone: config.tone,
      value: formatValue(value, config.valueKind),
      priority
    });

    grouped.set(manorId, current);
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      flags: [...group.flags].sort((left, right) => left.priority - right.priority || sortText(left.label, right.label))
    }))
    .sort((left, right) => {
      if (left.flags.length !== right.flags.length) return right.flags.length - left.flags.length;
      const leftPriority = Math.min(...left.flags.map((flag) => flag.priority));
      const rightPriority = Math.min(...right.flags.map((flag) => flag.priority));
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return sortText(left.manorLabel, right.manorLabel);
    });
}

function buildVisibleOutlierManors(groups: InternalOutlierGroup[], manorCount: number): PortfolioOutlierManor[] {
  return groups
    .slice(0, Math.max(1, Math.min(3, manorCount)))
    .map((group) => ({
      manorId: group.manorId,
      manorLabel: group.manorLabel,
      summary:
        group.flags.length === 1
          ? "Flagged by 1 tracked extreme."
          : `Flagged by ${group.flags.length} tracked extremes.`,
      flags: group.flags.map(({ priority: _priority, ...flag }) => flag)
    }));
}

function buildPortfolioOverviewSurfaceFromContext(context: PortfolioContext): PortfolioOverviewSurface {
  const { anchorManorId, manorCount, manorCountLabel, portfolio } = context;

  return {
    emptyOutliersLabel: "No portfolio outlier rows are exposed in this bounded snapshot yet.",
    helper:
      manorCount === 1
        ? "Read-only multi-manor stub. The current bounded snapshot only exposes one tracked manor so far, but the portfolio totals and outlier contract are already locked."
        : "Read-only multi-manor stub. Totals stay additive across the tracked manors, and the outlier list stays bounded to the strongest current extremes.",
    manorCount,
    manorCountLabel,
    outlierManors: buildVisibleOutlierManors(buildOutlierGroups(portfolio, anchorManorId), manorCount),
    summaryCards: buildSummaryCards(portfolio)
  };
}

function readPortfolioRowsInOrder(
  portfolio: Record<string, unknown>,
  manorKeys: string[],
  anchorManorId: string | null
): ParsedPortfolioRow[] {
  const manorRowsByKey = asRecord(portfolio.manor_rows_by_key);
  if (!manorRowsByKey) return [];

  return manorKeys.flatMap((manorKey) => {
    const row = asRecord(manorRowsByKey[manorKey]);
    if (!row) return [];

    const manorId = readString(row.manor_id) ?? inferManorIdFromKey(manorKey);

    return [
      {
        isAnchorManor: anchorManorId !== null && manorId === anchorManorId,
        manorId,
        manorKey,
        manorLabel: formatManorLabel(manorId, anchorManorId),
        row
      }
    ];
  });
}

function selectedManorModeLabel(selectedRow: ParsedPortfolioRow): string {
  return selectedRow.isAnchorManor ? "Current manor detail" : `${selectedRow.manorLabel} detail`;
}

function buildSelectorSummary(row: ParsedPortfolioRow, outlierCount: number): string {
  const fragments: string[] = [];

  if (row.isAnchorManor) fragments.push("Current manor");
  if (outlierCount > 0) {
    fragments.push(outlierCount === 1 ? "1 outlier flag" : `${outlierCount} outlier flags`);
  }

  return fragments.length > 0 ? fragments.join(" · ") : "Tracked manor";
}

function buildSelectedManorSummary(row: ParsedPortfolioRow, outlierCount: number): string {
  const title = row.isAnchorManor ? "Current manor" : row.manorLabel;
  if (outlierCount === 0) {
    return `${title} is the default manor-scoped follow-up beneath the portfolio summary even when no outlier is active.`;
  }

  return outlierCount === 1
    ? `${title} is currently flagged by 1 tracked extreme.`
    : `${title} is currently flagged by ${outlierCount} tracked extremes.`;
}

function buildSurfaceScopeRules(selectedRow: ParsedPortfolioRow): PortfolioSurfaceScopeRule[] {
  const selectedDetailLabel = selectedRow.isAnchorManor ? "Current manor detail" : `${selectedRow.manorLabel} detail`;

  const byId: Record<PortfolioSurfaceId, PortfolioSurfaceScopeRule> = {
    portfolio_summary: {
      id: "portfolio_summary",
      label: "Portfolio summary",
      mode: "portfolio",
      helper: "Additive holdings totals stay portfolio-scoped context rather than collapsing into one manor."
    },
    portfolio_outliers: {
      id: "portfolio_outliers",
      label: "Portfolio outliers",
      mode: "portfolio",
      helper: "Exception rows stay portfolio-scoped so they can promote one manor into detail without becoming a ledger."
    },
    diff_ledger: {
      id: "diff_ledger",
      label: "Diff ledger",
      mode: "selected_manor",
      helper: `${selectedDetailLabel} should own the resolved ledger trail instead of widening it to the whole portfolio.`
    },
    receipts: {
      id: "receipts",
      label: "Receipts explainer",
      mode: "selected_manor",
      helper: `${selectedDetailLabel} should own receipt detail once the explain surface inherits selector state.`
    }
  };

  return PLAY_SCREEN_PORTFOLIO_SURFACE_ORDER.map((surfaceId) => byId[surfaceId]);
}

function buildSelectedManorSurface(
  row: ParsedPortfolioRow,
  outlierFlags: PortfolioOutlierFlag[]
): PortfolioSelectedManorSurface {
  return {
    helper: row.isAnchorManor
      ? "Current manor detail stays ready for manor-scoped ledger and receipt follow-up."
      : `${row.manorLabel} is the deterministic manor detail selection exposed by this contract.`,
    isAnchorManor: row.isAnchorManor,
    manorId: row.manorId,
    manorKey: row.manorKey,
    modeLabel: selectedManorModeLabel(row),
    outlierFlags,
    summary: buildSelectedManorSummary(row, outlierFlags.length),
    summaryCards: buildSelectedManorCards(row.row),
    title: row.manorLabel
  };
}

export function buildPortfolioScopeContract(previewState: unknown): PortfolioScopeContract | null {
  const context = readPortfolioContext(previewState);
  if (!context) return null;

  const { anchorManorId, manorCount, manorKeys, portfolio } = context;
  const portfolioSummary = buildPortfolioOverviewSurfaceFromContext(context);
  const outlierGroups = buildOutlierGroups(portfolio, anchorManorId);
  const outlierGroupsByManorId = new Map(outlierGroups.map((group) => [group.manorId, group]));
  const rows = readPortfolioRowsInOrder(portfolio, manorKeys, anchorManorId);
  if (rows.length === 0) return null;

  const manorDetailsById = Object.fromEntries(
    rows.map((row) => {
      const outlierFlags = (outlierGroupsByManorId.get(row.manorId)?.flags ?? []).map(({ priority: _priority, ...flag }) => flag);
      return [row.manorId, buildSelectedManorSurface(row, outlierFlags)];
    })
  ) as Record<string, PortfolioSelectedManorSurface>;
  const selectedRow = rows.find((row) => row.isAnchorManor) ?? rows[0];
  const scopeOptions: PortfolioScopeOption[] = [
    {
      id: "portfolio",
      label: "Portfolio summary",
      helper: "Holdings totals and portfolio exceptions stay grouped here as the top-level shell context."
    },
    {
      id: "selected_manor",
      label: selectedManorModeLabel(selectedRow),
      helper: selectedRow.isAnchorManor
        ? "The selector starts on the current manor so manor-scoped follow-up stays anchored without inventing a second default."
        : "The selector can move detail focus to a tracked manor without changing the portfolio totals above it."
    }
  ];

  return {
    anchorManorId,
    defaultMode: "portfolio",
    manorCount,
    manorDetailsById,
    portfolioSummary,
    schemaVersion: PLAY_SCREEN_PORTFOLIO_CONTRACT_SCHEMA_VERSION,
    scopeOptions,
    selectedManor: {
      ...manorDetailsById[selectedRow.manorId],
      modeLabel: scopeOptions[1].label
    },
    selectedManorId: selectedRow.manorId,
    selectorHelper:
      "Tracked manor selection stays deterministic, UI-owned, and ready for receipts or ledger surfaces to inherit later.",
    selectorLabel: "Tracked manor detail",
    selectorOptions: rows.map((row) => {
      const outlierCount = outlierGroupsByManorId.get(row.manorId)?.flags.length ?? 0;
      return {
        helper: "Use this manor as the focused detail scope beneath the portfolio summary.",
        id: row.manorId,
        isAnchorManor: row.isAnchorManor,
        isOutlier: outlierCount > 0,
        manorId: row.manorId,
        manorKey: row.manorKey,
        outlierCount,
        summary: buildSelectorSummary(row, outlierCount),
        title: row.manorLabel
      };
    }),
    surfaceScopeRules: buildSurfaceScopeRules(selectedRow)
  };
}

export function buildPortfolioOverviewSurface(previewState: unknown): PortfolioOverviewSurface | null {
  const contract = buildPortfolioScopeContract(previewState);
  if (contract) return contract.portfolioSummary;

  const context = readPortfolioContext(previewState);
  if (!context) return null;
  return buildPortfolioOverviewSurfaceFromContext(context);
}

export function selectPortfolioManor(
  contract: PortfolioScopeContract,
  manorId: string | null | undefined
): PortfolioSelectedManorSurface {
  if (manorId && contract.manorDetailsById[manorId]) return contract.manorDetailsById[manorId];
  return contract.selectedManor;
}

export function buildPortfolioEvidenceScope(args: {
  contract: PortfolioScopeContract | null;
  scopeMode: PortfolioScopeMode;
  selectedManorId: string | null | undefined;
}): PortfolioEvidenceScope {
  const { contract, scopeMode, selectedManorId } = args;

  if (!contract || scopeMode === "portfolio") {
    return {
      chipHelperText:
        "Portfolio summary is active above, but headline chips still open the current manor chronicle so the resolved ledger stays grounded in one bounded holding.",
      diffLedgerHelper:
        "Portfolio summary is active above. This resolved ledger still follows the current manor chronicle until you switch into selected-manor detail.",
      diffLedgerScopeLabel: "Current manor chronicle",
      receiptScopeLabel: "Current manor chronicle",
      receiptScopeSummary:
        "Explain Changes is still showing the current manor receipt trail. Portfolio totals remain summary context only.",
      state: "current_manor"
    };
  }

  const selectedManor = selectPortfolioManor(contract, selectedManorId);
  if (selectedManor.isAnchorManor) {
    return {
      chipHelperText:
        "Selected manor detail is active and it currently matches the current manor, so chips, ledger, and receipts all stay live on the same resolved holding.",
      diffLedgerHelper:
        "Selected manor detail is active and it currently matches the current manor, so this resolved ledger is the live follow-up for the same holding.",
      diffLedgerScopeLabel: `${selectedManor.title} detail`,
      receiptScopeLabel: `${selectedManor.title} detail`,
      receiptScopeSummary:
        "Explain Changes is following the same selected manor detail that is active in Holdings because the selected manor still matches the current chronicle.",
      state: "selected_manor_live"
    };
  }

  return {
    chipHelperText: `${selectedManor.title} detail is selected above, but the headline chips still track the current manor chronicle because only that holding exposes resolved receipts in this snapshot.`,
    diffLedgerHelper: `${selectedManor.title} detail is selected above, but this resolved ledger remains pinned to the current manor chronicle because non-anchor holdings do not expose a separate ledger trail yet.`,
    diffLedgerScopeLabel: `Current manor chronicle · ${selectedManor.title} selected`,
    receiptScopeLabel: `${selectedManor.title} selected`,
    receiptScopeSummary: `${selectedManor.title} detail is selected in Holdings, but this bounded snapshot only exposes the current manor receipt trail. Use the selector for holdings comparison without assuming a second ledger exists.`,
    state: "selected_manor_holdings_only"
  };
}
