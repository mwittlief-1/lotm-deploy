import React from "react";
import type { RunState } from "../../sim/types";
import { AllPeopleRegistryPanel } from "./AllPeopleRegistryPanel";

type RunLogScreenProps = {
  filter: string;
  onBack: () => void;
  onExportFullRunJson: () => void;
  onExportRunSummary: () => void;
  onFilterChange: (value: string) => void;
  state: RunState;
};

export function RunLogScreen({
  filter,
  onBack,
  onExportFullRunJson,
  onExportRunSummary,
  onFilterChange,
  state
}: RunLogScreenProps) {
  return (
    <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 1100 }}>
      <h2>Run Log</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onExportFullRunJson}>Export Full Run JSON</button>
        <button onClick={onExportRunSummary}>Export Run Summary</button>
      </div>

      <p style={{ opacity: 0.8 }}>
        {state.log.length} turns logged. Game over: {state.game_over ? state.game_over.reason : "no"}.
      </p>

      <pre style={{ background: "#111", color: "#eee", padding: 12, overflow: "auto", maxHeight: 600 }}>
        {JSON.stringify(
          state.log.map((t) => ({
            turn: t.processed_turn_index,
            summary: t.summary,
            top_drivers: t.report.top_drivers,
            events: t.report.events.map((e) => ({
              id: e.id,
              title: e.title,
              why: e.why.notes,
              effects: e.effects,
              deltas: e.deltas
            }))
          })),
          null,
          2
        )}
      </pre>

      <AllPeopleRegistryPanel
        filter={filter}
        onFilterChange={onFilterChange}
        state={state}
      />
    </div>
  );
}
