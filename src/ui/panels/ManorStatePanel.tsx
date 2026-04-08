import React from "react";
import { renderDispossessionThresholdTip } from "../../content/experienceContent";
import { PLAY_SCREEN_ACTION_BUTTON_STYLE, PLAY_SCREEN_PANEL_STYLE, PLAY_SCREEN_SECTION_SIGILS } from "../playScreenTheme";
import { Tip } from "../viewHelpers";
import { SectionHeading } from "./SectionHeading";

type ManorStatePanelProps = {
  anchorUnrest: string;
  buildRatePerBuilderPerTurn: number;
  builderExtraPerTurn: number;
  constructionEtaTurns: number | null;
  constructionRatePlannedNextTurn: number;
  constructionRateThisTurn: number;
  copy: any;
  deltaBushels: number;
  deltaCoin: number;
  deltaPop: number;
  deltaUnrest: number;
  desiredBuilders: number;
  fmtSigned: (value: number) => string;
  improvements: Record<string, { name: string }>;
  manor: any;
  onAbandonProject: () => void;
  popChangeSummary: string | null;
  report: any;
  showUnrestBreakdown: boolean;
  turnYears: number;
  unrestBreakdown: { increased: Array<{ label: string; amount: number }>; decreased: Array<{ label: string; amount: number }> } | null;
};

export function ManorStatePanel({
  anchorUnrest,
  buildRatePerBuilderPerTurn,
  builderExtraPerTurn,
  constructionEtaTurns,
  constructionRatePlannedNextTurn,
  constructionRateThisTurn,
  copy,
  deltaBushels,
  deltaCoin,
  deltaPop,
  deltaUnrest,
  desiredBuilders,
  fmtSigned,
  improvements,
  manor,
  onAbandonProject,
  popChangeSummary,
  report,
  showUnrestBreakdown,
  turnYears,
  unrestBreakdown
}: ManorStatePanelProps) {
  return (
    <div style={PLAY_SCREEN_PANEL_STYLE}>
      <SectionHeading
        helper={copy.manorStateTimingHelper ?? `Turn = ${turnYears} years. This snapshot is already resolved above; plans below only shape the next turn.`}
        sigil={PLAY_SCREEN_SECTION_SIGILS.state}
        timingLabel={copy.turnSummary_last3Years}
        title="Manor State"
      />

      <ul>
        <li>
          Population: {manor.population} {deltaPop !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaPop)})</span> : null}{" "}
          {popChangeSummary ? <span style={{ opacity: 0.75 }}>({popChangeSummary})</span> : null}
        </li>
        <li>Farmers: {manor.farmers}</li>
        <li>
          Builders: {manor.builders}
          <Tip
            text={`Builder food premium: each builder consumes +${builderExtraPerTurn} extra bushels this turn (${turnYears}y) compared to a farmer/idle worker.`}
          />
        </li>
        <li>
          Bushels stored: {manor.bushels_stored}{" "}
          {deltaBushels !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaBushels)})</span> : null}
        </li>
        <li>
          Coin: {manor.coin} {deltaCoin !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaCoin)})</span> : null}
        </li>
        <li id={anchorUnrest} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>
            Unrest: <b>{manor.unrest}</b>/100 {deltaUnrest !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaUnrest)})</span> : null}
          </span>
          <progress value={manor.unrest} max={100} style={{ width: 180, height: 14 }} />
          <Tip text={renderDispossessionThresholdTip()} />
        </li>
      </ul>

      {showUnrestBreakdown ? (
        <details style={{ marginTop: 6 }}>
          <summary>{copy.unrestBreakdownTitle}</summary>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            {!unrestBreakdown ? (
              <div style={{ opacity: 0.85 }}>{copy.unrestBreakdownNone}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {unrestBreakdown.increased.length ? (
                  <div>
                    <div style={{ fontWeight: 700 }}>{copy.unrestBreakdownIncreasedBy}</div>
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {unrestBreakdown.increased.map((l) => (
                        <li key={`up:${l.label}`}>{l.label}: {l.amount}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {unrestBreakdown.decreased.length ? (
                  <div>
                    <div style={{ fontWeight: 700 }}>{copy.unrestBreakdownDecreasedBy}</div>
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {unrestBreakdown.decreased.map((l) => (
                        <li key={`down:${l.label}`}>{l.label}: {l.amount}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </details>
      ) : null}

      <h4>Construction</h4>
      {report.construction.completed_improvement_id ? (
        <div style={{ padding: 8, border: "1px solid #cfc", marginBottom: 8 }}>
          Completed: <b>{improvements[report.construction.completed_improvement_id]?.name ?? report.construction.completed_improvement_id}</b>
        </div>
      ) : null}

      {manor.construction ? (
        <div>
          <div>
            Active: <b>{improvements[manor.construction.improvement_id]?.name ?? manor.construction.improvement_id}</b>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            <span>
              Progress: {manor.construction.progress}/{manor.construction.required}
            </span>
            <progress value={manor.construction.progress} max={manor.construction.required} style={{ width: 200, height: 14 }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            This turn’s progress: +{report.construction.progress_added} (rate {manor.builders} builders × {buildRatePerBuilderPerTurn} = {constructionRateThisTurn}/turn)
            <Tip text="Construction progress uses CURRENT builders. Changing builders below affects NEXT turn." />
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
            {constructionRateThisTurn > 0 ? (
              <span>
                Estimated time remaining at current rate: ~{constructionEtaTurns} turn{constructionEtaTurns === 1 ? "" : "s"}
              </span>
            ) : (
              <span>
                No progress while builders = 0.
                <Tip text="Assign builders (next turn) to keep construction moving." />
              </span>
            )}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
            Planned next turn: {desiredBuilders} builders → ~{constructionRatePlannedNextTurn} progress/turn
          </div>

          <button
            onClick={onAbandonProject}
            title="Abandon loses all progress; coin is not refunded."
            style={{ ...PLAY_SCREEN_ACTION_BUTTON_STYLE, marginTop: 8 }}
          >
            Abandon Project (lossy)
          </button>
        </div>
      ) : (
        <div>None</div>
      )}
    </div>
  );
}
