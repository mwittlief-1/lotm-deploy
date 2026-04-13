#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PLAYABILITY_PRESET_PACK_RELEASE } from "../src/ui/playabilityPresetPack";
import { KPI_ACCEPTANCE_BANDS_RELPATH, type KpiAcceptanceBandsArtifact } from "./kpiAcceptanceBands";
import { RUNAWAY_DETECTORS_RELPATH, type RunawayDetectorsArtifact } from "./runawayDetectors";
import { writeStableArtifact } from "./seed_replay/artifactWriter";
import { sha256, stableStringify } from "./seed_replay/hash";

export const BALANCE_REVIEW_CLOSEOUT_KIND = "balance_review_closeout_v1" as const;
export const BALANCE_REVIEW_CLOSEOUT_RELPATH =
  `qa_artifacts/economy_balance/${PLAYABILITY_PRESET_PACK_RELEASE}/balance_review_closeout.json` as const;

const REQUIRED_BASELINE_ARTIFACTS = [
  "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
  "qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json",
  "qa_artifacts/economy_balance/v0.3.4/turns_15/summary.json",
  "qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward/summary.json"
] as const;

const REQUIRED_METRIC_IDS = [
  "net_coin",
  "arrears_incidence",
  "dispossession",
  "shortages",
  "manor_count_growth"
] as const;

const REQUIRED_DETECTOR_IDS = [
  "coin_runaway",
  "starvation_spiral",
  "arrears_too_soft",
  "arrears_too_hard",
  "manor_count_growth_frozen"
] as const;

const DETECTOR_TO_METRICS: Record<
  (typeof REQUIRED_DETECTOR_IDS)[number],
  Array<(typeof REQUIRED_METRIC_IDS)[number]>
> = {
  coin_runaway: ["net_coin"],
  starvation_spiral: ["shortages"],
  arrears_too_soft: ["arrears_incidence"],
  arrears_too_hard: ["arrears_incidence", "dispossession"],
  manor_count_growth_frozen: ["manor_count_growth"]
};

type SourceArtifact = {
  artifact_relpath: string;
  hash: string;
  kind: string;
  label: string;
};

type ReviewStep = {
  artifact_relpaths: string[];
  commands: string[];
  evidence_ids: string[];
  label: string;
  step_id: "baseline_comparisons" | "runaway_detectors" | "stability_checklist";
  summary: string;
};

type BaselineMeasurement = KpiAcceptanceBandsArtifact["metric_bands"][number]["targets"][number];
type DetectorCheck = RunawayDetectorsArtifact["detectors"][number]["checks"][number];

type BaselineComparisonRow = {
  acceptance_ids: string[];
  comparison_rails: BaselineMeasurement[];
  detector_ids: Array<(typeof REQUIRED_DETECTOR_IDS)[number]>;
  metric_id: (typeof REQUIRED_METRIC_IDS)[number];
  primary_source_artifacts: string[];
  review_order: number;
  summary: string;
  targets: BaselineMeasurement[];
};

type DetectorReviewRow = {
  acceptance_ids: string[];
  baseline_metric_ids: Array<(typeof REQUIRED_METRIC_IDS)[number]>;
  checks: DetectorCheck[];
  detector_id: (typeof REQUIRED_DETECTOR_IDS)[number];
  label: string;
  preset_ids: string[];
  primary_source_artifacts: string[];
  status: "fail" | "pass";
  summary: string;
};

type StabilityChecklistRow = {
  checklist_id:
    | "baseline_metrics_complete"
    | "comparison_rails_complete"
    | "runaway_detectors_green"
    | "baseline_artifacts_traceable"
    | "closeout_packet_ready";
  evidence_ids: string[];
  label: string;
  source_artifact_relpaths: string[];
  status: "fail" | "pass";
  summary: string;
};

export type BalanceReviewCloseoutArtifact = {
  baseline_comparisons: BaselineComparisonRow[];
  canonical_review_path: {
    commands: string[];
    note: string;
    steps: ReviewStep[];
  };
  kind: typeof BALANCE_REVIEW_CLOSEOUT_KIND;
  operator_notes: string[];
  release: typeof PLAYABILITY_PRESET_PACK_RELEASE;
  source_artifacts: SourceArtifact[];
  stability_review_checklist: StabilityChecklistRow[];
  status: "fail" | "pass";
  runaway_review: DetectorReviewRow[];
};

function readJson<T>(artifactRelpath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(artifactRelpath), "utf8")) as T;
}

function deriveArtifactHash(payload: Record<string, unknown>): string {
  return typeof payload.hash === "string" && payload.hash.trim().length > 0
    ? payload.hash
    : sha256(stableStringify(payload));
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function collectSourceArtifacts(
  kpiArtifact: KpiAcceptanceBandsArtifact,
  detectorArtifact: RunawayDetectorsArtifact
): SourceArtifact[] {
  const packets: SourceArtifact[] = [
    {
      artifact_relpath: KPI_ACCEPTANCE_BANDS_RELPATH,
      hash: deriveArtifactHash(kpiArtifact as Record<string, unknown>),
      kind: kpiArtifact.kind,
      label: "kpi acceptance bands packet"
    },
    {
      artifact_relpath: RUNAWAY_DETECTORS_RELPATH,
      hash: deriveArtifactHash(detectorArtifact as Record<string, unknown>),
      kind: detectorArtifact.kind,
      label: "runaway detector packet"
    }
  ];

  const deduped = new Map<string, SourceArtifact>();
  for (const artifact of [...packets, ...kpiArtifact.source_artifacts, ...detectorArtifact.source_artifacts]) {
    if (!deduped.has(artifact.artifact_relpath)) {
      deduped.set(artifact.artifact_relpath, artifact);
    }
  }
  return [...deduped.values()].sort((left, right) => left.artifact_relpath.localeCompare(right.artifact_relpath));
}

function detectorIdsForMetric(metricId: (typeof REQUIRED_METRIC_IDS)[number]): Array<(typeof REQUIRED_DETECTOR_IDS)[number]> {
  return REQUIRED_DETECTOR_IDS.filter((detectorId) => DETECTOR_TO_METRICS[detectorId].includes(metricId));
}

function buildBaselineComparisons(kpiArtifact: KpiAcceptanceBandsArtifact): BaselineComparisonRow[] {
  return REQUIRED_METRIC_IDS.map((metricId, index) => {
    const metric = kpiArtifact.metric_bands.find((row) => row.metric_id === metricId);
    if (!metric) {
      throw new Error(`Missing KPI metric band ${metricId}.`);
    }
    return {
      review_order: index + 1,
      metric_id: metricId,
      acceptance_ids: [...metric.acceptance_ids],
      summary: metric.summary,
      detector_ids: detectorIdsForMetric(metricId),
      targets: metric.targets.map((row) => ({ ...row, preset_ids: [...row.preset_ids], source: { ...row.source } })),
      comparison_rails: metric.comparison_rails.map((row) => ({
        ...row,
        preset_ids: [...row.preset_ids],
        source: { ...row.source }
      })),
      primary_source_artifacts: uniqueSorted([
        ...metric.targets.map((row) => row.source.artifact_relpath),
        ...metric.comparison_rails.map((row) => row.source.artifact_relpath)
      ])
    };
  });
}

function buildRunawayReview(detectorArtifact: RunawayDetectorsArtifact): DetectorReviewRow[] {
  return REQUIRED_DETECTOR_IDS.map((detectorId) => {
    const detector = detectorArtifact.detectors.find((row) => row.detector_id === detectorId);
    if (!detector) {
      throw new Error(`Missing runaway detector ${detectorId}.`);
    }
    return {
      detector_id: detectorId,
      label: detector.label,
      acceptance_ids: [...detector.acceptance_ids],
      baseline_metric_ids: [...DETECTOR_TO_METRICS[detectorId]],
      preset_ids: [...detector.preset_ids],
      status: detector.status,
      summary: detector.summary,
      checks: detector.checks.map((check) => ({ ...check, band: { ...check.band }, source: { ...check.source } })),
      primary_source_artifacts: uniqueSorted(detector.checks.map((check) => check.source.artifact_relpath))
    };
  });
}

function buildStabilityChecklist(
  baselineComparisons: BaselineComparisonRow[],
  runawayReview: DetectorReviewRow[],
  sourceArtifacts: SourceArtifact[]
): StabilityChecklistRow[] {
  const sourceArtifactPaths = new Set(sourceArtifacts.map((artifact) => artifact.artifact_relpath));
  const metricIds = baselineComparisons.map((row) => row.metric_id);
  const detectorIds = runawayReview.map((row) => row.detector_id);
  const metricsComplete = REQUIRED_METRIC_IDS.every((metricId) => metricIds.includes(metricId));
  const comparisonRailsComplete = baselineComparisons.every((row) => row.comparison_rails.length > 0);
  const runawayDetectorsGreen = runawayReview.every((row) => row.status === "pass");
  const baselineArtifactsTraceable = REQUIRED_BASELINE_ARTIFACTS.every((artifactRelpath) =>
    sourceArtifactPaths.has(artifactRelpath)
  );

  const checklist: StabilityChecklistRow[] = [
    {
      checklist_id: "baseline_metrics_complete",
      label: "Baseline metric comparisons stay first-class",
      status: metricsComplete ? "pass" : "fail",
      summary:
        "The closeout packet must expose the five KPI metric rows first so balance review starts with deterministic baseline comparisons before any detector triage.",
      source_artifact_relpaths: [KPI_ACCEPTANCE_BANDS_RELPATH],
      evidence_ids: metricIds.map((metricId) => `metric:${metricId}`)
    },
    {
      checklist_id: "comparison_rails_complete",
      label: "Every KPI metric keeps at least one comparison rail",
      status: comparisonRailsComplete ? "pass" : "fail",
      summary:
        "Comparison rails remain the accepted lower-pressure or longer-run context for each metric, so reviewers can compare drift without inventing new scenarios.",
      source_artifact_relpaths: [KPI_ACCEPTANCE_BANDS_RELPATH],
      evidence_ids: baselineComparisons.map((row) => `metric:${row.metric_id}`)
    },
    {
      checklist_id: "runaway_detectors_green",
      label: "Runaway detectors remain downstream of the baseline review",
      status: runawayDetectorsGreen ? "pass" : "fail",
      summary:
        "Detector rows should only translate a baseline drift into named failure modes after the KPI comparisons are confirmed.",
      source_artifact_relpaths: [RUNAWAY_DETECTORS_RELPATH],
      evidence_ids: detectorIds.map((detectorId) => `detector:${detectorId}`)
    },
    {
      checklist_id: "baseline_artifacts_traceable",
      label: "Receipt, regression, and DOE baselines remain directly traceable",
      status: baselineArtifactsTraceable ? "pass" : "fail",
      summary:
        "The v0.3.5 balance review stays anchored to the locked baseline artifacts instead of shifting onto a new scenario catalog or a second init path.",
      source_artifact_relpaths: [...REQUIRED_BASELINE_ARTIFACTS],
      evidence_ids: [...REQUIRED_BASELINE_ARTIFACTS]
    }
  ];

  checklist.push({
    checklist_id: "closeout_packet_ready",
    label: "The explicit stability-review checklist is ready for v0.3.5 closeout",
    status: checklist.every((row) => row.status === "pass") ? "pass" : "fail",
    summary:
      "Use this packet to review KPI baselines first, then detector rows, then attach the required qa, preflight, and replay gate outcomes to the closeout note.",
    source_artifact_relpaths: [
      KPI_ACCEPTANCE_BANDS_RELPATH,
      RUNAWAY_DETECTORS_RELPATH,
      ...REQUIRED_BASELINE_ARTIFACTS
    ],
    evidence_ids: [...checklist.map((row) => `check:${row.checklist_id}`)]
  });

  return checklist;
}

export function buildBalanceReviewCloseoutArtifact(): BalanceReviewCloseoutArtifact {
  const kpiArtifact = readJson<KpiAcceptanceBandsArtifact>(KPI_ACCEPTANCE_BANDS_RELPATH);
  const detectorArtifact = readJson<RunawayDetectorsArtifact>(RUNAWAY_DETECTORS_RELPATH);

  const baselineComparisons = buildBaselineComparisons(kpiArtifact);
  const runawayReview = buildRunawayReview(detectorArtifact);
  const sourceArtifacts = collectSourceArtifacts(kpiArtifact, detectorArtifact);
  const stabilityReviewChecklist = buildStabilityChecklist(baselineComparisons, runawayReview, sourceArtifacts);

  return {
    kind: BALANCE_REVIEW_CLOSEOUT_KIND,
    release: PLAYABILITY_PRESET_PACK_RELEASE,
    source_artifacts: sourceArtifacts,
    baseline_comparisons: baselineComparisons,
    runaway_review: runawayReview,
    canonical_review_path: {
      commands: [
        "node node_modules/tsx/dist/cli.mjs scripts/kpiAcceptanceBands.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/runawayDetectors.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/balanceReviewCloseout.ts",
        "npm run qa",
        "npm run preflight",
        "npm run seed:replay:batch"
      ],
      note:
        "Start with the KPI metric rows because they are the compact, deterministic comparison view over the locked receipt, regression, and DOE artifacts. Use detector rows only after the baseline comparison tells you which metric drifted.",
      steps: [
        {
          step_id: "baseline_comparisons",
          label: "Review baseline comparisons first",
          summary:
            "Walk the five KPI metric rows in order and confirm the target and comparison-rail values before looking at any named failure-mode detector.",
          artifact_relpaths: [KPI_ACCEPTANCE_BANDS_RELPATH, ...REQUIRED_BASELINE_ARTIFACTS],
          commands: ["node node_modules/tsx/dist/cli.mjs scripts/kpiAcceptanceBands.ts"],
          evidence_ids: baselineComparisons.map((row) => `metric:${row.metric_id}`)
        },
        {
          step_id: "runaway_detectors",
          label: "Use runaway detectors as the second-pass triage layer",
          summary:
            "After the KPI baselines are confirmed, read the detector rows to translate any drift into the named v0.3.5 balance failure modes.",
          artifact_relpaths: [RUNAWAY_DETECTORS_RELPATH],
          commands: ["node node_modules/tsx/dist/cli.mjs scripts/runawayDetectors.ts"],
          evidence_ids: runawayReview.map((row) => `detector:${row.detector_id}`)
        },
        {
          step_id: "stability_checklist",
          label: "Finish with the explicit stability-review checklist",
          summary:
            "Use the checklist rows in this packet as the closeout signoff surface, then attach qa, preflight, and replay results to the release note.",
          artifact_relpaths: [BALANCE_REVIEW_CLOSEOUT_RELPATH],
          commands: ["node node_modules/tsx/dist/cli.mjs scripts/balanceReviewCloseout.ts"],
          evidence_ids: stabilityReviewChecklist.map((row) => `check:${row.checklist_id}`)
        }
      ]
    },
    operator_notes: [
      "Do not replace the accepted receipt, regression, or DOE baselines with a new balance scenario catalog during closeout review.",
      "If a detector fails, treat the KPI metric row as the canonical pass or fail anchor and use the detector row only to explain the failure mode.",
      "If a live repro is needed after an artifact drift, use the preset ids already attached to the KPI or detector rows instead of opening a second init path."
    ],
    stability_review_checklist: stabilityReviewChecklist,
    status: stabilityReviewChecklist.every((row) => row.status === "pass") ? "pass" : "fail"
  };
}

export function writeBalanceReviewCloseoutArtifact() {
  return writeStableArtifact(path.resolve(BALANCE_REVIEW_CLOSEOUT_RELPATH), buildBalanceReviewCloseoutArtifact());
}

async function main() {
  const artifact = writeBalanceReviewCloseoutArtifact();
  console.log("balance review closeout: PASS");
  console.log(
    `artifact=${path.relative(process.cwd(), path.resolve(BALANCE_REVIEW_CLOSEOUT_RELPATH)).split(path.sep).join("/")}`
  );
  console.log(`hash=${artifact.hash}`);
  console.log(`status=${artifact.status}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
