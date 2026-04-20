import React from "react";
import { renderDispossessionThresholdTip } from "../../content/experienceContent";
import type { TurnExplanationV1, TurnExplanationWalkdownV1 } from "../../sim/types";
import { PLAY_SCREEN_ACTION_BUTTON_STYLE, PLAY_SCREEN_PANEL_STYLE, PLAY_SCREEN_SECTION_SIGILS, PLAY_SCREEN_SUBCARD_STYLE } from "../playScreenTheme";
import type { EconomyPricingSurface } from "../playViewModel";
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
  pricingSurface?: EconomyPricingSurface | null;
  report: any;
  showUnrestBreakdown: boolean;
  turnExplanation?: TurnExplanationV1 | null;
  turnYears: number;
  unrestBreakdown: { increased: Array<{ label: string; amount: number }>; decreased: Array<{ label: string; amount: number }> } | null;
};

function walkdownForMetric(explanation: TurnExplanationV1 | null | undefined, metric: "food" | "coin" | "unrest"): TurnExplanationWalkdownV1 | null {
  if (!explanation) return null;
  if (metric === "food") return explanation.food_walkdown;
  if (metric === "coin") return explanation.coin_walkdown;
  return explanation.unrest_walkdown;
}

function headlineCauseDetail(explanation: TurnExplanationV1 | null | undefined, metric: "food" | "coin" | "unrest"): string | null {
  const causes = Array.isArray(explanation?.headline_causes) ? explanation.headline_causes : [];
  const match = causes.find((cause) => cause && typeof cause === "object" && cause.metric === metric) ?? null;
  return match && typeof match.detail === "string" && match.detail.length > 0 ? match.detail : null;
}

function biggestWalkdownRow(walkdown: TurnExplanationWalkdownV1 | null): TurnExplanationWalkdownV1["rows"][number] | null {
  if (!walkdown) return null;
  return (
    [...walkdown.rows]
      .filter((row) => !["start", "net", "ending"].includes(row.direction) && row.amount !== 0)
      .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount) || left.label.localeCompare(right.label))[0] ?? null
  );
}

function unrestCauseLists(
  walkdown: TurnExplanationWalkdownV1 | null,
  fallback: { increased: Array<{ label: string; amount: number }>; decreased: Array<{ label: string; amount: number }> } | null
): { increased: Array<{ label: string; amount: number }>; decreased: Array<{ label: string; amount: number }> } | null {
  if (walkdown) {
    const increased = walkdown.rows
      .filter((row) => row.direction === "inflow" && row.amount > 0)
      .map((row) => ({ label: row.label, amount: row.amount }));
    const decreased = walkdown.rows
      .filter((row) => row.direction === "outflow" && row.amount > 0)
      .map((row) => ({ label: row.label, amount: row.amount }));
    if (increased.length > 0 || decreased.length > 0) return { increased, decreased };
  }
  return fallback;
}

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
  pricingSurface = null,
  report,
  showUnrestBreakdown,
  turnExplanation = null,
  turnYears,
  unrestBreakdown
}: ManorStatePanelProps) {
  const foodWalkdown = walkdownForMetric(turnExplanation, "food");
  const coinWalkdown = walkdownForMetric(turnExplanation, "coin");
  const unrestWalkdown = walkdownForMetric(turnExplanation, "unrest");
  const unrestHeadlineDetail = headlineCauseDetail(turnExplanation, "unrest");
  const unrestCauseBreakdown = unrestCauseLists(unrestWalkdown, unrestBreakdown);
  const biggestFoodRow = biggestWalkdownRow(foodWalkdown);
  const biggestCoinRow = biggestWalkdownRow(coinWalkdown);
  const biggestUnrestRow = biggestWalkdownRow(unrestWalkdown);
  const maintenanceLaborDrag = Number(report?.maintenance_labor_pressure?.applied_drag ?? 0);
  const maintenanceLaborApplied = Number(report?.maintenance_labor_pressure?.applied ?? 0);
  const placeholderCatalogCount = pricingSurface?.catalogLines.filter((line) => line.includes("(placeholder)")).length ?? 0;

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
            {!unrestCauseBreakdown ? (
              <div style={{ opacity: 0.85 }}>{copy.unrestBreakdownNone}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {unrestWalkdown ? (
                  <div style={{ opacity: 0.78 }}>
                    Started at {unrestWalkdown.start_amount} unrest, ended at {unrestWalkdown.end_amount} (net {fmtSigned(unrestWalkdown.end_amount - unrestWalkdown.start_amount)}).
                  </div>
                ) : null}

                {unrestCauseBreakdown.increased.length ? (
                  <div>
                    <div style={{ fontWeight: 700 }}>{copy.unrestBreakdownIncreasedBy}</div>
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {unrestCauseBreakdown.increased.map((l) => (
                        <li key={`up:${l.label}`}>{l.label}: {l.amount}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {unrestCauseBreakdown.decreased.length ? (
                  <div>
                    <div style={{ fontWeight: 700 }}>{copy.unrestBreakdownDecreasedBy}</div>
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {unrestCauseBreakdown.decreased.map((l) => (
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

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", marginTop: 12 }}>
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Food stores now</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>
            {manor.bushels_stored} bushels stored
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
            {biggestFoodRow ? biggestFoodRow.summary : "No direct food walkdown line was recorded this turn."}
          </div>
        </div>

        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Coin on hand</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>
            {manor.coin} coin
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
            {biggestCoinRow ? biggestCoinRow.summary : "No direct coin walkdown line was recorded this turn."}
          </div>
        </div>

        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Unrest pressure now</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>
            {manor.unrest} unrest
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
            {unrestHeadlineDetail ?? biggestUnrestRow?.summary ?? "No explicit unrest contributor lines were recorded this turn."}
          </div>
        </div>

        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Labor & upkeep</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>
            {maintenanceLaborDrag > 0 ? `${maintenanceLaborDrag} labor absorbed` : "No upkeep drag"}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
            {maintenanceLaborDrag > 0
              ? `${maintenanceLaborApplied} upkeep labor came off the top before the remaining labor pool could be assigned to farming or building.`
              : "No maintenance labor drag was recorded in the resolved turn."}
          </div>
          {pricingSurface ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.78 }}>
              Market reference: {pricingSurface.ratioLabel}.
              {placeholderCatalogCount > 0
                ? ` ${placeholderCatalogCount} catalog line${placeholderCatalogCount === 1 ? "" : "s"} still read as placeholder references, not live actions from this screen.`
                : " All shown catalog lines are active references."}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.78, marginTop: 12 }}>
        Manor State stays on the current manor condition and the strongest direct pressure behind it. Explain Changes keeps the full ordered walkdowns.
      </div>

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
