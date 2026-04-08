import { describe, expect, it } from "vitest";

import {
  PLAYTEST_OPS_SURFACE_ORDER,
  listPlaytestOpsSurfaces,
  summarizePlaytestOpsInventory
} from "../../src/ui/playtestOpsInventory";

describe("playtestOpsInventory", () => {
  it("tracks the current export and reporting surfaces in one stable order", () => {
    const summary = summarizePlaytestOpsInventory();

    expect(summary.surfaceCount).toBe(6);
    expect(summary.exportAccessCount).toBe(2);
    expect(summary.reportingCount).toBe(4);
    expect(summary.bundleGapIds).toEqual([
      "gameplay_decisions_exports",
      "debug_accordion_exports",
      "turn_report_summary",
      "diff_ledger_summary"
    ]);
  });

  it("returns the live UI surface metadata that the playtest-ops docs rely on", () => {
    const surfaces = listPlaytestOpsSurfaces();
    expect(surfaces.map((surface) => surface.id)).toEqual([...PLAYTEST_OPS_SURFACE_ORDER]);

    expect(surfaces[0]).toEqual(
      expect.objectContaining({
        id: "gameplay_decisions_exports",
        location: "Gameplay shell -> Decisions footer",
        receiptBundleReadiness: "missing"
      })
    );

    expect(surfaces[5]).toEqual(
      expect.objectContaining({
        id: "receipts_viewer_modal",
        plannedTaskId: "V03-R4-003-T02",
        receiptBundleReadiness: "partial"
      })
    );
  });
});
