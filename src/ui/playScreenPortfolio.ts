type PortfolioValueKind = "coin" | "food" | "meat" | "count";
type PortfolioCardTone = "neutral" | "caution" | "danger";

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

function buildOutlierManors(
  portfolio: Record<string, unknown>,
  anchorManorId: string | null,
  manorCount: number
): PortfolioOutlierManor[] {
  const outliersByMetric = asRecord(portfolio.outliers_by_metric);
  if (!outliersByMetric) return [];

  const grouped = new Map<
    string,
    {
      flags: Array<PortfolioOutlierFlag & { priority: number }>;
      manorId: string;
      manorLabel: string;
    }
  >();

  for (const [priority, config] of OUTLIER_METRIC_CONFIG.entries()) {
    const rawEntries = Array.isArray(outliersByMetric[config.metricKey]) ? outliersByMetric[config.metricKey] : [];
    const entry = asRecord(rawEntries[0]);
    if (!entry) continue;

    const manorId = readString(entry.manor_id);
    const value = readWholeNumber(entry.value);
    if (!manorId || value === null) continue;

    const current =
      grouped.get(manorId) ??
      {
        manorId,
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
    .sort((left, right) => {
      if (left.flags.length !== right.flags.length) return right.flags.length - left.flags.length;
      const leftPriority = Math.min(...left.flags.map((flag) => flag.priority));
      const rightPriority = Math.min(...right.flags.map((flag) => flag.priority));
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return sortText(left.manorLabel, right.manorLabel);
    })
    .slice(0, Math.max(1, Math.min(3, manorCount)))
    .map((group) => ({
      manorId: group.manorId,
      manorLabel: group.manorLabel,
      summary:
        group.flags.length === 1
          ? "Flagged by 1 tracked extreme."
          : `Flagged by ${group.flags.length} tracked extremes.`,
      flags: [...group.flags]
        .sort((left, right) => left.priority - right.priority || sortText(left.label, right.label))
        .map(({ priority: _priority, ...flag }) => flag)
    }));
}

export function buildPortfolioOverviewSurface(previewState: unknown): PortfolioOverviewSurface | null {
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
  const manorCountLabel = manorCount === 1 ? "1 tracked manor" : `${manorCount} tracked manors`;

  return {
    emptyOutliersLabel: "No portfolio outlier rows are exposed in this bounded snapshot yet.",
    helper:
      manorCount === 1
        ? "Read-only multi-manor stub. The current bounded snapshot only exposes one tracked manor so far, but the portfolio totals and outlier contract are already locked."
        : "Read-only multi-manor stub. Totals stay additive across the tracked manors, and the outlier list stays bounded to the strongest current extremes.",
    manorCount,
    manorCountLabel,
    outlierManors: buildOutlierManors(portfolio, anchorManorId, manorCount),
    summaryCards: buildSummaryCards(portfolio)
  };
}
