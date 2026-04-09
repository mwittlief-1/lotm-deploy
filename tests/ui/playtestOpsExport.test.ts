import { describe, expect, it } from "vitest";

import { buildPlaytestOpsExportCopy } from "../../src/ui/playtestOpsExport";

describe("playtestOpsExport", () => {
  it("builds the live packet helper copy from the current seed", () => {
    const copy = buildPlaytestOpsExportCopy("lotm_v022_seed_001_baseline_extworld");

    expect(copy).toEqual({
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
  });
});
