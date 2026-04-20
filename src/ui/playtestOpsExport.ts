import { buildRunProvenanceV1 } from "../sim/provenance";
import type { RunProvenanceV1 } from "../sim/types";
import {
  buildPlaytestOpsPacketMetadata,
  formatPlaytestOpsExportFilename,
  type PlaytestOpsPacketMetadataV1
} from "./playtestOpsPacket";

export type PlaytestOpsExportCopy = {
  debugHelper: string;
  decisionsHelper: string;
  fullRunFilename: string;
  packetMetadata: PlaytestOpsPacketMetadataV1;
  runLogHelper: string;
  summaryFilename: string;
};

export function buildPlaytestOpsExportCopy(
  seed: string,
  runProvenanceV1: RunProvenanceV1 = buildRunProvenanceV1()
): PlaytestOpsExportCopy {
  const summaryFilename = formatPlaytestOpsExportFilename("run_summary_json", seed);
  const fullRunFilename = formatPlaytestOpsExportFilename("full_run_json", seed);

  return {
    debugHelper:
      `Raw-evidence fallback: keep ${summaryFilename} and ${fullRunFilename} with kpi_snapshot.json ` +
      "and any bug_report_<NN>_<short_slug>.md files when the packet needs deeper review.",
    decisionsHelper:
      `Playtest packet handoff: save ${summaryFilename} and ${fullRunFilename}, then pair them with ` +
      "turn_report_notes.md and receipts_grouped_notes.md.",
    fullRunFilename,
    packetMetadata: buildPlaytestOpsPacketMetadata({ seed, runProvenanceV1 }),
    runLogHelper:
      `This screen is the raw-evidence home. For packet review, keep ${summaryFilename} and ${fullRunFilename} ` +
      "with kpi_snapshot.json and any bug_report_<NN>_<short_slug>.md files.",
    summaryFilename
  };
}
