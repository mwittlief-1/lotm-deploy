import { APP_VERSION } from "../version";
import type { RunProvenanceV1 } from "../sim/types";
import type { PlaytestOpsSurfaceId } from "./playtestOpsInventory";

export const PLAYTEST_OPS_PACKET_RELEASE = APP_VERSION;
export const PLAYTEST_OPS_PACKET_SCHEMA_VERSION = "playtest_ops_receipt_bundle_v1" as const;
export const PLAYTEST_OPS_PACKET_ARCHIVE_PREFIX = `lotm_${PLAYTEST_OPS_PACKET_RELEASE}_playtest_receipt_bundle`;
export const PLAYTEST_OPS_PACKET_ROOT_DIR = `qa_artifacts/playtest_ops/${PLAYTEST_OPS_PACKET_RELEASE}/receipt_bundles`;
export const PLAYTEST_OPS_PACKET_DOC_RELPATH = `docs/ux/${PLAYTEST_OPS_PACKET_RELEASE}_playtest_receipt_bundle_conventions.md`;
export const PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH = `qa_artifacts/playtest_ops/${PLAYTEST_OPS_PACKET_RELEASE}/receipt_bundle_seed_pack.json`;
export const PLAYTEST_OPS_PACKET_REPLAY_SUMMARY_RELPATH = `qa_artifacts/seed_replay/${PLAYTEST_OPS_PACKET_RELEASE}/batch/turns_15/summary.json`;

export const PLAYTEST_OPS_PACKET_ARTIFACT_ORDER = [
  "run_summary_json",
  "full_run_json",
  "turn_report_notes",
  "receipts_grouped_notes",
  "receipts_raw_notes",
  "seed_replay_batch_summary"
] as const;

export type PlaytestOpsPacketArtifactId = (typeof PLAYTEST_OPS_PACKET_ARTIFACT_ORDER)[number];
export type PlaytestOpsPacketArtifactSource = "ui_export" | "manual_capture" | "qa_reference";
export type PlaytestOpsPacketVersionStatus = "aligned" | "mismatch";

export type PlaytestOpsPacketArtifact = {
  expectedFilename: string | null;
  id: PlaytestOpsPacketArtifactId;
  repoRelpath: string | null;
  required: boolean;
  source: PlaytestOpsPacketArtifactSource;
  sourceSurfaceId: PlaytestOpsSurfaceId | null;
  summary: string;
};

export type PlaytestOpsPacketMetadataV1 = {
  schema_version: "playtest_ops_packet_metadata_v1";
  packet_release: string;
  summary_filename: string;
  full_run_filename: string;
  replay_summary_relpath: string;
  seed_pack_relpath: string;
  doc_relpath: string;
  run_provenance_v1: RunProvenanceV1;
  version_status: PlaytestOpsPacketVersionStatus;
};

function normalizePacketSegment(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "value";
}

export function formatPlaytestOpsExportFilename(kind: "run_summary_json" | "full_run_json", seed: string): string {
  const safeSeed = normalizePacketSegment(seed);
  return kind === "run_summary_json" ? `run_summary_${safeSeed}.json` : `run_export_${safeSeed}.json`;
}

export function formatPlaytestOpsPacketDirectory(args: { policy: string; scenarioId: string; seed: string }): string {
  return [
    PLAYTEST_OPS_PACKET_ROOT_DIR,
    normalizePacketSegment(args.scenarioId),
    normalizePacketSegment(args.policy),
    normalizePacketSegment(args.seed)
  ].join("/");
}

export function formatPlaytestOpsPacketArchiveName(args: { policy: string; scenarioId: string; seed: string }): string {
  return [
    PLAYTEST_OPS_PACKET_ARCHIVE_PREFIX,
    normalizePacketSegment(args.scenarioId),
    normalizePacketSegment(args.policy),
    normalizePacketSegment(args.seed)
  ].join("_") + ".zip";
}

export function buildPlaytestOpsPacketMetadata(args: {
  seed: string;
  runProvenanceV1: RunProvenanceV1;
}): PlaytestOpsPacketMetadataV1 {
  return {
    schema_version: "playtest_ops_packet_metadata_v1",
    packet_release: PLAYTEST_OPS_PACKET_RELEASE,
    summary_filename: formatPlaytestOpsExportFilename("run_summary_json", args.seed),
    full_run_filename: formatPlaytestOpsExportFilename("full_run_json", args.seed),
    replay_summary_relpath: PLAYTEST_OPS_PACKET_REPLAY_SUMMARY_RELPATH,
    seed_pack_relpath: PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH,
    doc_relpath: PLAYTEST_OPS_PACKET_DOC_RELPATH,
    run_provenance_v1: args.runProvenanceV1,
    version_status: args.runProvenanceV1.version_match ? "aligned" : "mismatch"
  };
}

export function listPlaytestOpsPacketArtifacts(seed: string): PlaytestOpsPacketArtifact[] {
  return [
    {
      id: "run_summary_json",
      expectedFilename: formatPlaytestOpsExportFilename("run_summary_json", seed),
      repoRelpath: null,
      required: true,
      source: "ui_export",
      sourceSurfaceId: "gameplay_decisions_exports",
      summary: "Player-facing run summary export for quick triage and playtest packet review."
    },
    {
      id: "full_run_json",
      expectedFilename: formatPlaytestOpsExportFilename("full_run_json", seed),
      repoRelpath: null,
      required: true,
      source: "ui_export",
      sourceSurfaceId: "gameplay_decisions_exports",
      summary: "Full raw run export for debugging, replay audit, and follow-up investigation."
    },
    {
      id: "turn_report_notes",
      expectedFilename: "turn_report_notes.md",
      repoRelpath: null,
      required: true,
      source: "manual_capture",
      sourceSurfaceId: "turn_report_summary",
      summary: "Short human-readable notes copied from the Turn Report so the bundle keeps the resolved chronicle."
    },
    {
      id: "receipts_grouped_notes",
      expectedFilename: "receipts_grouped_notes.md",
      repoRelpath: null,
      required: true,
      source: "manual_capture",
      sourceSurfaceId: "receipts_viewer_modal",
      summary: "Grouped receipt notes that summarize the main coin, food, unrest, and counterparty evidence."
    },
    {
      id: "receipts_raw_notes",
      expectedFilename: "receipts_raw_notes.md",
      repoRelpath: null,
      required: false,
      source: "manual_capture",
      sourceSurfaceId: "receipts_viewer_modal",
      summary: "Optional raw receipt-phase notes when grouped evidence does not explain the causal chain well enough."
    },
    {
      id: "seed_replay_batch_summary",
      expectedFilename: null,
      repoRelpath: PLAYTEST_OPS_PACKET_REPLAY_SUMMARY_RELPATH,
      required: true,
      source: "qa_reference",
      sourceSurfaceId: null,
      summary: "Canonical replay-batch summary that anchors the packet to the accepted deterministic 15-turn reference hash."
    }
  ];
}

export function summarizePlaytestOpsPacketContract(): {
  artifactCount: number;
  release: string;
  requiredArtifactCount: number;
  runtimeAppVersion: string;
  seedPackRelpath: string;
} {
  const artifacts = listPlaytestOpsPacketArtifacts("example_seed");

  return {
    artifactCount: artifacts.length,
    release: PLAYTEST_OPS_PACKET_RELEASE,
    requiredArtifactCount: artifacts.filter((artifact) => artifact.required).length,
    runtimeAppVersion: APP_VERSION,
    seedPackRelpath: PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH
  };
}
