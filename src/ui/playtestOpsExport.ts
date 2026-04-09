import { formatPlaytestOpsExportFilename } from "./playtestOpsPacket";

export type PlaytestOpsExportCopy = {
  debugHelper: string;
  decisionsHelper: string;
  fullRunFilename: string;
  runLogHelper: string;
  summaryFilename: string;
};

export function buildPlaytestOpsExportCopy(seed: string): PlaytestOpsExportCopy {
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
    runLogHelper:
      `This screen is the raw-evidence home. For packet review, keep ${summaryFilename} and ${fullRunFilename} ` +
      "with kpi_snapshot.json and any bug_report_<NN>_<short_slug>.md files.",
    summaryFilename
  };
}
