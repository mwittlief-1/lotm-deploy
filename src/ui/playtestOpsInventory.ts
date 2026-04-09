export const PLAYTEST_OPS_SURFACE_ORDER = [
  "gameplay_decisions_exports",
  "debug_accordion_exports",
  "run_log_screen",
  "turn_report_summary",
  "diff_ledger_summary",
  "receipts_viewer_modal"
] as const;

export type PlaytestOpsSurfaceId = (typeof PLAYTEST_OPS_SURFACE_ORDER)[number];
export type PlaytestOpsSurfaceCategory = "export_access" | "reporting";
export type ReceiptBundleReadiness = "missing" | "partial";

export type PlaytestOpsSurface = {
  currentArtifacts: string[];
  currentRefs: string[];
  id: PlaytestOpsSurfaceId;
  location: string;
  painPoints: string[];
  plannedTaskId: "V03-R4-003-T01" | "V03-R4-003-T02" | "V03-R4-003-T04";
  receiptBundleReadiness: ReceiptBundleReadiness;
  summary: string;
  title: string;
  type: PlaytestOpsSurfaceCategory;
};

const PLAYTEST_OPS_SURFACE_INVENTORY: PlaytestOpsSurface[] = [
  {
    id: "gameplay_decisions_exports",
    type: "export_access",
    title: "Gameplay decisions footer exports",
    location: "Gameplay shell -> Decisions footer",
    summary: "The main planning surface exposes direct run-summary and full-run JSON downloads next to Advance Turn.",
    currentArtifacts: ["run_summary_json", "full_run_json"],
    currentRefs: ["src/ui/panels/DecisionsPanel.tsx", "src/App.tsx"],
    receiptBundleReadiness: "missing",
    painPoints: [
      "No receipt-bundle action exists alongside the two JSON exports.",
      "The footer does not explain which export is useful for playtest reporting versus debugging."
    ],
    plannedTaskId: "V03-R4-003-T01"
  },
  {
    id: "debug_accordion_exports",
    type: "export_access",
    title: "Debug accordion export access",
    location: "Gameplay shell -> Debug accordion -> Run log & exports",
    summary: "The debug accordion repeats the two JSON exports and adds the only in-shell path into the full Run Log screen.",
    currentArtifacts: ["open_run_log", "run_summary_json", "full_run_json"],
    currentRefs: ["src/ui/panels/PlayScreen.tsx", "src/ui/playScreenChrome.ts"],
    receiptBundleReadiness: "missing",
    painPoints: [
      "The clearest reporting path is hidden behind a debug affordance.",
      "Export access is duplicated here and in the Decisions footer without one canonical playtest handoff."
    ],
    plannedTaskId: "V03-R4-003-T01"
  },
  {
    id: "run_log_screen",
    type: "reporting",
    title: "Run Log screen",
    location: "Run Log screen header and raw-turn body",
    summary: "The Run Log screen combines raw turn summaries, event deltas, and registry inspection with another copy of the two JSON export buttons.",
    currentArtifacts: ["raw_turn_log", "all_people_registry", "run_summary_json", "full_run_json"],
    currentRefs: ["src/ui/panels/RunLogScreen.tsx", "src/App.tsx"],
    receiptBundleReadiness: "partial",
    painPoints: [
      "The body is raw JSON-first, which is useful for debugging but noisy for playtest packet assembly.",
      "There is still no one-click bundle that packages the raw run, summary, and receipts evidence together."
    ],
    plannedTaskId: "V03-R4-003-T01"
  },
  {
    id: "turn_report_summary",
    type: "reporting",
    title: "Turn report summary cards",
    location: "Gameplay shell -> Turn Report",
    summary: "Resolved production, consumption, obligations, household, and event outcomes are already organized here as the player-facing summary home.",
    currentArtifacts: ["resolved_turn_summary", "obligations_cards", "household_details_modal"],
    currentRefs: ["src/ui/panels/TurnReportPanel.tsx", "src/ui/panels/PlayScreen.tsx"],
    receiptBundleReadiness: "missing",
    painPoints: [
      "The surface explains outcomes well, but it has no direct export or packet hook.",
      "Playtest reporting still has to pair this summary manually with receipts or raw run data."
    ],
    plannedTaskId: "V03-R4-003-T01"
  },
  {
    id: "diff_ledger_summary",
    type: "reporting",
    title: "Diff ledger and agenda follow-up",
    location: "Gameplay shell -> Council Agenda and Explain Changes",
    summary: "Agenda items and diff-ledger highlights point the player toward important follow-up, but they do not preserve a shareable export shape on their own.",
    currentArtifacts: ["agenda_follow_up", "source_tagged_change_highlights", "explain_changes_entry"],
    currentRefs: ["src/ui/playScreenModel.ts", "src/ui/panels/CouncilAgendaPanel.tsx", "src/ui/panels/DiffLedgerPanel.tsx"],
    receiptBundleReadiness: "missing",
    painPoints: [
      "Important follow-up signals are visible, but they cannot yet be exported as part of a playtest packet.",
      "Agenda and ledger context can drift from the evidence a tester has to gather manually from other surfaces."
    ],
    plannedTaskId: "V03-R4-003-T01"
  },
  {
    id: "receipts_viewer_modal",
    type: "reporting",
    title: "Receipts viewer modal",
    location: "Gameplay shell -> Explain Changes / sticky resource chip detail",
    summary: "Grouped and raw receipt evidence already exists here, including counterparty paths, but it stays modal-only and non-exportable.",
    currentArtifacts: ["grouped_receipts", "raw_receipt_phases", "counterparty_receipt_paths"],
    currentRefs: ["src/ui/playScreenReceipts.ts", "src/ui/panels/ReceiptsViewerPanel.tsx"],
    receiptBundleReadiness: "partial",
    painPoints: [
      "This is the strongest evidence surface for a future receipt bundle, but there is no export action or naming convention yet.",
      "Receipt evidence is modal-scoped, so testers have to reconstruct the packet manually from screenshots or separate downloads."
    ],
    plannedTaskId: "V03-R4-003-T02"
  }
];

export function listPlaytestOpsSurfaces(type?: PlaytestOpsSurfaceCategory): PlaytestOpsSurface[] {
  return PLAYTEST_OPS_SURFACE_INVENTORY.filter((surface) => (type ? surface.type === type : true)).map((surface) => ({
    ...surface,
    currentArtifacts: [...surface.currentArtifacts],
    currentRefs: [...surface.currentRefs],
    painPoints: [...surface.painPoints]
  }));
}

export function summarizePlaytestOpsInventory(): {
  bundleGapIds: PlaytestOpsSurfaceId[];
  reportingCount: number;
  surfaceCount: number;
  exportAccessCount: number;
} {
  const bundleGapIds = PLAYTEST_OPS_SURFACE_INVENTORY.filter((surface) => surface.receiptBundleReadiness === "missing").map((surface) => surface.id);

  return {
    bundleGapIds,
    reportingCount: PLAYTEST_OPS_SURFACE_INVENTORY.filter((surface) => surface.type === "reporting").length,
    surfaceCount: PLAYTEST_OPS_SURFACE_INVENTORY.length,
    exportAccessCount: PLAYTEST_OPS_SURFACE_INVENTORY.filter((surface) => surface.type === "export_access").length
  };
}
