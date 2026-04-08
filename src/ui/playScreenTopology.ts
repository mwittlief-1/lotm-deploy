import {
  evaluateWorldScopeCapsForAnchor,
  getWorldScopeCapBucketOrder,
  loadBundledWorldDomain,
  normalizeWorldScopeCapTierKey,
  type WorldScopeCapBucketV1
} from "../sim/domains/world";

export type TopologyDebugSample = {
  toManorId: string;
  rawDistance: string;
  routeHops: string;
  distanceBand: string;
};

export type TopologyScopeBucketSummary = {
  admittedCount: number;
  bucketId: WorldScopeCapBucketV1;
  cumulativeLimit: string;
  label: string;
  rejectedCount: number;
};

export type TopologyScopeSampleRow = {
  bucketLabel: string;
  distanceBand: string;
  manorId: string;
  rationale: string;
  rawDistance: string;
  routeHops: string;
  statusLabel: string;
};

export type TopologyScopeDebugSurface = {
  admittedCount: number;
  bucketSummaries: TopologyScopeBucketSummary[];
  candidateCount: number;
  farThreshold: string;
  kinshipJoinSummary: string;
  metricLabel: string;
  rejectedCount: number;
  sampleRows: TopologyScopeSampleRow[];
  sourceTier: string;
  tierLabel: string;
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
  scopeCaps: TopologyScopeDebugSurface | null;
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

function bucketLabel(bucket: WorldScopeCapBucketV1): string {
  return bucket.replace(/_/g, " ");
}

function titleCase(label: string): string {
  return label.replace(/\b\w/g, (character) => character.toUpperCase());
}

function readPlayerTierLabel(previewStateRecord: Record<string, unknown>): string {
  const houses = asRecord(previewStateRecord.houses);
  const playerHouseId = readString(previewStateRecord.player_house_id);
  const playerHouse = playerHouseId ? asRecord(houses?.[playerHouseId]) : null;
  const tier = readString(playerHouse?.tier);
  return tier ?? "Unknown";
}

function bucketBaseRationale(bucket: WorldScopeCapBucketV1, rawMetric: string, farThreshold: string, routeAdjacent: boolean, territorialAdjacent: boolean): string {
  if (bucket === "kinship") {
    return "Kinship precedence outranks adjacency and distance bands.";
  }

  if (bucket === "territorial_adjacent") {
    return territorialAdjacent && routeAdjacent
      ? "Territorial adjacency outranks route adjacency and the near/far distance band."
      : "Territorial adjacency outranks route-only and distance bands.";
  }

  if (bucket === "route_adjacent") {
    return "Route adjacency outranks the near/far distance band.";
  }

  if (bucket === "near") {
    return farThreshold === "not set"
      ? `${rawMetric} is available, but no far threshold is set so this manor remains inside the near band.`
      : `Within the ${rawMetric} far threshold (${farThreshold}).`;
  }

  return farThreshold === "not set"
    ? `${rawMetric} falls outside the near band even though no far threshold is set in the bounded snapshot.`
    : `At or beyond the ${rawMetric} far threshold (${farThreshold}).`;
}

function buildTopologyScopeDebugSurface(args: {
  anchorManorId: string;
  farThresholdText: string;
  farThresholdValue: number | null;
  previewStateRecord: Record<string, unknown>;
  rawMetric: string;
}): TopologyScopeDebugSurface | null {
  const { anchorManorId, farThresholdText, farThresholdValue, previewStateRecord, rawMetric } = args;
  const world = loadBundledWorldDomain();
  const tierLabel = readPlayerTierLabel(previewStateRecord);
  const scopeEvaluation = evaluateWorldScopeCapsForAnchor(world, anchorManorId, tierLabel, {
    far_threshold: farThresholdValue
  });

  if (scopeEvaluation.candidates.length === 0) {
    return null;
  }

  const admittedCounts = new Map<WorldScopeCapBucketV1, number>();
  const rejectedCounts = new Map<WorldScopeCapBucketV1, number>();
  const decisionsById = new Map(scopeEvaluation.cap_evaluation.decisions.map((decision) => [decision.stable_id, decision]));

  for (const decision of scopeEvaluation.cap_evaluation.decisions) {
    const counts = decision.admitted ? admittedCounts : rejectedCounts;
    counts.set(decision.bucket, (counts.get(decision.bucket) ?? 0) + 1);
  }

  const bucketSummaries = getWorldScopeCapBucketOrder().map((bucket) => {
    const rule = scopeEvaluation.cap_evaluation.rules.find((entry) => entry.bucket === bucket);
    return {
      admittedCount: admittedCounts.get(bucket) ?? 0,
      bucketId: bucket,
      cumulativeLimit: String(rule?.max_total_houses ?? 0),
      label: titleCase(bucketLabel(bucket)),
      rejectedCount: rejectedCounts.get(bucket) ?? 0
    };
  });

  const admittedRows = scopeEvaluation.candidates.filter((candidate) => decisionsById.get(candidate.stable_id)?.admitted).slice(0, 4);
  const rejectedRows = scopeEvaluation.candidates.filter((candidate) => !decisionsById.get(candidate.stable_id)?.admitted).slice(0, 3);
  const sampleCandidates = [...admittedRows, ...rejectedRows];

  const sampleRows = sampleCandidates.map((candidate) => {
    const decision = decisionsById.get(candidate.stable_id);
    const baseRationale = bucketBaseRationale(
      candidate.bucket,
      rawMetric,
      farThresholdText,
      candidate.route_adjacent,
      candidate.territorial_adjacent
    );
    const statusRationale = decision?.admitted
      ? `Admitted at ${decision.admitted_total} of the ${decision.bucket_limit} cumulative-house limit.`
      : `Excluded once the ${titleCase(bucketLabel(candidate.bucket))} cap held at ${decision?.bucket_limit ?? 0} total houses.`;

    return {
      bucketLabel: titleCase(bucketLabel(candidate.bucket)),
      distanceBand: candidate.distance_band ?? "unclassified",
      manorId: candidate.manor_id,
      rationale: `${baseRationale} ${statusRationale}`,
      rawDistance: formatNumericValue(candidate.travel_cost_distance),
      routeHops: String(candidate.route_hop_distance),
      statusLabel: decision?.admitted ? "Admitted" : "Outside cap"
    };
  });

  return {
    admittedCount: scopeEvaluation.cap_evaluation.admitted_ids.length,
    bucketSummaries,
    candidateCount: scopeEvaluation.candidates.length,
    farThreshold: farThresholdText,
    kinshipJoinSummary:
      "Kinship remains part of the cap table, but this bounded debug surface cannot join known-house ties onto world manor ids yet, so kinship stays rule-only here.",
    metricLabel: rawMetric,
    rejectedCount: scopeEvaluation.cap_evaluation.rejected_ids.length,
    sampleRows,
    sourceTier: normalizeWorldScopeCapTierKey(tierLabel),
    tierLabel
  };
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
  const farThresholdText = farThresholdValue === null ? "not set" : formatNumericValue(farThresholdValue);

  return {
    anchorManorId,
    anchorHoldingId,
    anchorCountyId,
    rawMetric,
    companionMetric,
    farThreshold: farThresholdText,
    sampleSummary:
      sampleCountTotal > sampleCountShown
        ? `Showing ${sampleCountShown} of ${sampleCountTotal} sampled distances.`
        : `Showing ${sampleCountShown} sampled distances.`,
    samples,
    scopeCaps: previewStateRecord
      ? buildTopologyScopeDebugSurface({
          anchorManorId,
          farThresholdText,
          farThresholdValue,
          previewStateRecord,
          rawMetric
        })
      : null
  };
}
