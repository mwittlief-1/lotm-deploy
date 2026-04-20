import { describe, expect, it } from "vitest";

import { buildRunProvenanceV1 } from "../../src/sim/provenance";
import { createNewRun } from "../../src/sim/state";
import { buildPlaytestOpsExportCopy } from "../../src/ui/playtestOpsExport";
import { APP_VERSION } from "../../src/version";

describe("playtestOpsExport", () => {
  it("builds the live packet helper copy from the current seed", () => {
    const provenance = buildRunProvenanceV1(createNewRun("lotm_v022_seed_001_baseline_extworld"));
    const copy = buildPlaytestOpsExportCopy("lotm_v022_seed_001_baseline_extworld", provenance);

    expect(copy).toMatchObject({
      debugHelper:
        "Raw-evidence fallback: keep run_summary_lotm_v022_seed_001_baseline_extworld.json and " +
        "run_export_lotm_v022_seed_001_baseline_extworld.json with kpi_snapshot.json and any " +
        "bug_report_<NN>_<short_slug>.md files when the packet needs deeper review.",
      decisionsHelper:
        "Playtest packet handoff: save run_summary_lotm_v022_seed_001_baseline_extworld.json and " +
        "run_export_lotm_v022_seed_001_baseline_extworld.json, then pair them with turn_report_notes.md and " +
        "receipts_grouped_notes.md.",
      fullRunFilename: "run_export_lotm_v022_seed_001_baseline_extworld.json",
      runLogHelper:
        "This screen is the raw-evidence home. For packet review, keep run_summary_lotm_v022_seed_001_baseline_extworld.json and " +
        "run_export_lotm_v022_seed_001_baseline_extworld.json with kpi_snapshot.json and any " +
        "bug_report_<NN>_<short_slug>.md files.",
      summaryFilename: "run_summary_lotm_v022_seed_001_baseline_extworld.json"
    });
    expect(copy.packetMetadata).toMatchObject({
      schema_version: "playtest_ops_packet_metadata_v1",
      packet_release: APP_VERSION,
      summary_filename: "run_summary_lotm_v022_seed_001_baseline_extworld.json",
      full_run_filename: "run_export_lotm_v022_seed_001_baseline_extworld.json",
      replay_summary_relpath: `qa_artifacts/seed_replay/${APP_VERSION}/batch/turns_15/summary.json`,
      run_provenance_v1: provenance,
      version_status: "aligned"
    });
  });
});
