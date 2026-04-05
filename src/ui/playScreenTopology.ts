export type TopologyDebugSample = {
  toManorId: string;
  rawDistance: string;
  routeHops: string;
  distanceBand: string;
};

export type TopologyDebugSurface = {
  anchorManorId: string;
  anchorHoldingId: string;
  anchorCountyId: string;
  rawMetric: string;
  companionMetric: string;
  farThreshold: string;
  sampleSummary: string;
  samples: TopologyDebugSample[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatNumericValue(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  return normalized.toFixed(3).replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");
}

export function buildTopologyDebugSurface(previewState: unknown): TopologyDebugSurface | null {
  const previewStateRecord = asRecord(previewState);
  const topologyView = asRecord(previewStateRecord?.world_topology_view);
  if (!topologyView) return null;

  const anchorManorId = readString(topologyView.anchor_manor_id);
  const anchorHoldingId = readString(topologyView.anchor_holding_id);
  const anchorCountyId = readString(topologyView.anchor_county_id);
  const rawMetric = readString(topologyView.canonical_numeric_distance);
  const companionMetric = readString(topologyView.companion_metric);

  if (!anchorManorId || !anchorHoldingId || !anchorCountyId || !rawMetric || !companionMetric) {
    return null;
  }

  const samples = Array.isArray(topologyView.distance_samples)
    ? topologyView.distance_samples
        .map((entry) => {
          const sample = asRecord(entry);
          if (!sample) return null;

          const toManorId = readString(sample.to_manor_id);
          const rawDistance = readFiniteNumber(sample.travel_cost_distance);
          if (!toManorId || rawDistance === null) return null;

          const routeHops = readFiniteNumber(sample.route_hop_distance);
          const distanceBand = readString(sample.distance_band) ?? "unclassified";

          return {
            toManorId,
            rawDistance: formatNumericValue(rawDistance),
            routeHops: routeHops === null ? "?" : String(Math.trunc(routeHops)),
            distanceBand
          };
        })
        .filter((entry): entry is TopologyDebugSample => entry !== null)
    : [];

  const farThresholdValue = readFiniteNumber(topologyView.far_threshold);
  const distanceSampleTotal = readFiniteNumber(topologyView.distance_sample_total);
  const sampleCountShown = samples.length;
  const sampleCountTotal =
    distanceSampleTotal === null ? sampleCountShown : Math.max(sampleCountShown, Math.trunc(distanceSampleTotal));

  return {
    anchorManorId,
    anchorHoldingId,
    anchorCountyId,
    rawMetric,
    companionMetric,
    farThreshold: farThresholdValue === null ? "not set" : formatNumericValue(farThresholdValue),
    sampleSummary:
      sampleCountTotal > sampleCountShown
        ? `Showing ${sampleCountShown} of ${sampleCountTotal} sampled distances.`
        : `Showing ${sampleCountShown} sampled distances.`,
    samples
  };
}
