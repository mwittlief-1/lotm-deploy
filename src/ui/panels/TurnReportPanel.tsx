import React from "react";
import type { RunState, TurnExplanationV1, TurnExplanationWalkdownV1 } from "../../sim/types";
import { PLAY_SCREEN_MODAL_TITLES } from "../playScreenChrome";
import type { ObligationsCounterpartyContractSection, ObligationsModalFocus } from "../playScreenObligations";
import { PLAY_SCREEN_ACTION_BUTTON_STYLE, PLAY_SCREEN_PANEL_STYLE, PLAY_SCREEN_SECTION_SIGILS, PLAY_SCREEN_SUBCARD_STYLE } from "../playScreenTheme";
import type { EconomyPricingSurface } from "../playViewModel";
import { HouseholdDetailsPanel } from "./HouseholdDetailsPanel";
import { HouseholdPanel } from "./HouseholdPanel";
import { ModalSheet } from "./ModalSheet";
import { SectionHeading } from "./SectionHeading";

type TurnReportPanelProps = {
  accruedThisTurn: any;
  anchorFood: string;
  anchorHousehold: string;
  arrearsCarried: any;
  baselineConsPerTurn: number;
  builderExtraPerTurn: number;
  consBuilders: number;
  consFarmers: number;
  consIdle: number;
  copy: any;
  courtConsumptionBushels: number | null;
  courtRosterEntries: any[];
  courtSize: number | null;
  currentHouseLog: any[];
  dueEntering: any;
  fmtObAmount: (value: any) => string;
  hasConsumptionSplit: boolean;
  idle: number;
  manor: any;
  obligationsSections: ObligationsCounterpartyContractSection[];
  onOpenObligationsDetails?: (focus: ObligationsModalFocus) => void;
  peasantConsumptionBushels: number | null;
  pricingSurface: EconomyPricingSurface | null;
  previewState: RunState;
  report: any;
  showHouseholdDetails: boolean;
  state: RunState;
  toggleHouseholdDetails: () => void;
  totalConsumptionBushels: number | null;
  totalObligations: any;
  turnYears: number;
};

function readTurnExplanation(report: any): TurnExplanationV1 | null {
  return report?.turn_explanation_v1 && typeof report.turn_explanation_v1 === "object"
    ? (report.turn_explanation_v1 as TurnExplanationV1)
    : null;
}

function walkdownForMetric(explanation: TurnExplanationV1 | null, metric: "food" | "coin" | "unrest"): TurnExplanationWalkdownV1 | null {
  if (!explanation) return null;
  if (metric === "food") return explanation.food_walkdown;
  if (metric === "coin") return explanation.coin_walkdown;
  return explanation.unrest_walkdown;
}

function formatWalkdownAmount(amount: number, unitLabel: string): string {
  return `${amount} ${unitLabel}`;
}

function summarizeWalkdown(walkdown: TurnExplanationWalkdownV1 | null): {
  directSummary: string;
  endLabel: string;
  startLabel: string;
} | null {
  if (!walkdown) return null;
  const biggestRow =
    [...walkdown.rows]
    .filter((row) => !["start", "net", "ending"].includes(row.direction) && row.amount !== 0)
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount) || left.label.localeCompare(right.label))
    [0] ?? null;

  return {
    directSummary: biggestRow?.summary ?? `Explain Changes keeps the full ${walkdown.metric} walkdown for this turn.`,
    endLabel: formatWalkdownAmount(walkdown.end_amount, walkdown.unit_label),
    startLabel: formatWalkdownAmount(walkdown.start_amount, walkdown.unit_label)
  };
}

function headlineCauseDetail(headlineCauses: any[], metric: "food" | "coin" | "unrest"): string | null {
  const match =
    headlineCauses.find((cause) => cause && typeof cause === "object" && cause.metric === metric) ?? null;
  if (!match) return null;
  return typeof match.detail === "string" && match.detail.length > 0 ? match.detail : null;
}

function summarizeObligations(sections: ObligationsCounterpartyContractSection[]): string {
  if (!sections.length) return "Open the obligation detail sheet for current versus arrears timing by counterparty.";

  return sections
    .slice(0, 2)
    .map((section) => {
      const dueLabel = section.dueGroup.amountLabel;
      const arrearsLabel = section.penaltyGroup.amountLabel;
      const stageLabel = section.penaltyGroup.stageLabel;
      if (section.penaltyGroup.amount > 0) {
        return `${section.shortTitle}: ${dueLabel} due, ${arrearsLabel} arrears, ${stageLabel}.`;
      }
      return `${section.shortTitle}: ${dueLabel} due, ${stageLabel}.`;
    })
    .join(" ");
}

export function TurnReportPanel({
  accruedThisTurn,
  anchorFood,
  anchorHousehold,
  arrearsCarried,
  copy,
  courtRosterEntries,
  courtSize,
  currentHouseLog,
  dueEntering,
  fmtObAmount,
  manor,
  obligationsSections,
  onOpenObligationsDetails,
  pricingSurface,
  peasantConsumptionBushels,
  previewState,
  report,
  showHouseholdDetails,
  state,
  toggleHouseholdDetails,
  totalConsumptionBushels,
  totalObligations,
  turnYears
}: TurnReportPanelProps) {
  const turnExplanation = readTurnExplanation(report);
  const headlineCauses = Array.isArray(turnExplanation?.headline_causes) && turnExplanation.headline_causes.length > 0
    ? turnExplanation.headline_causes
    : Array.isArray(report?.headline_causes)
      ? report.headline_causes
      : [];
  const summaryRole =
    Array.isArray(turnExplanation?.surface_roles)
      ? turnExplanation.surface_roles.find((role) => role.surface === "turn_report") ?? null
      : null;
  const foodWalkdown = summarizeWalkdown(walkdownForMetric(turnExplanation, "food"));
  const coinWalkdown = summarizeWalkdown(walkdownForMetric(turnExplanation, "coin"));
  const unrestWalkdown = summarizeWalkdown(walkdownForMetric(turnExplanation, "unrest"));
  const foodHeadlineDetail = headlineCauseDetail(headlineCauses, "food");
  const coinHeadlineDetail = headlineCauseDetail(headlineCauses, "coin");
  const unrestHeadlineDetail = headlineCauseDetail(headlineCauses, "unrest");
  const obligationsSummary = summarizeObligations(obligationsSections);

  return (
    <div style={PLAY_SCREEN_PANEL_STYLE}>
      <SectionHeading
        helper={copy.turnReportTimingHelper ?? "These figures explain what already resolved over the last turn before you set new orders below."}
        sigil={PLAY_SCREEN_SECTION_SIGILS.report}
        timingLabel={copy.turnSummary_last3Years}
        title="Turn Report"
      />

      <HouseholdPanel
        anchorId={anchorHousehold}
        copy={copy}
        courtSize={courtSize}
        currentHouseLog={currentHouseLog}
        previewState={previewState}
        report={report}
        state={state}
        showDetails={showHouseholdDetails}
        onToggleDetails={toggleHouseholdDetails}
      />

      {summaryRole ? (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Role</div>
          <div style={{ marginTop: 4, fontWeight: 700 }}>{summaryRole.role_label} only</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>{summaryRole.helper}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <h4 style={{ marginBottom: 8 }}>Headline causes</h4>
        {headlineCauses.length ? (
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {headlineCauses.slice(0, 4).map((cause: any) => (
              <li key={cause.id} style={{ marginTop: 6 }}>
                <b>{cause.summary}</b>. {cause.detail}
              </li>
            ))}
          </ol>
        ) : report.top_drivers.length ? (
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {report.top_drivers.slice(0, 4).map((driver: string, index: number) => (
              <li key={index} style={{ marginTop: 6 }}>{driver}</li>
            ))}
          </ol>
        ) : (
          <div style={{ opacity: 0.7 }}>No headline causes recorded for this turn.</div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 14 }}>
        <div id={anchorFood} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Food & stores</div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>
            {foodWalkdown ? foodWalkdown.endLabel : `${report.production_bushels} bushels produced`}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
            {foodHeadlineDetail ?? foodWalkdown?.directSummary ?? "Explain Changes keeps the ordered food walkdown when you need the full accounting path."}
          </div>
          {foodWalkdown ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.76 }}>Started at {foodWalkdown.startLabel}.</div> : null}
        </div>

        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Coin & dues</div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>
            {coinWalkdown ? coinWalkdown.endLabel : `${manor.coin} coin`}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
            {coinHeadlineDetail ?? coinWalkdown?.directSummary ?? "Explain Changes keeps the ordered coin walkdown when offsets need a fuller reading."}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.76 }}>
            Due entering {fmtObAmount(dueEntering)}. Arrears carried {fmtObAmount(arrearsCarried)}.
            {accruedThisTurn ? ` New obligations ${fmtObAmount(accruedThisTurn)}.` : ""}
          </div>
        </div>

        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Unrest & stability</div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>
            {unrestWalkdown ? unrestWalkdown.endLabel : `${manor.unrest} unrest`}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
            {unrestHeadlineDetail ?? unrestWalkdown?.directSummary ?? "Manor State keeps the live pressure while Explain Changes keeps the full unrest cause chain."}
          </div>
          {unrestWalkdown ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.76 }}>Started at {unrestWalkdown.startLabel}.</div> : null}
        </div>

        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.68, textTransform: "uppercase" }}>Obligations</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>{fmtObAmount(totalObligations)}</div>
            </div>
            {onOpenObligationsDetails ? (
              <button onClick={() => onOpenObligationsDetails("overview")} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
                Open detail sheet
              </button>
            ) : null}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>{obligationsSummary}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.78, marginTop: 12 }}>
        Diff Ledger keeps only the biggest resolved moves, Manor State keeps live conditions, and Explain Changes is the drilldown home for ordered walkdowns and matched receipts.
      </div>

      <ModalSheet
        onClose={toggleHouseholdDetails}
        open={showHouseholdDetails}
        subtitle="Court roster, household log, and succession context stay accessible here without crowding the main card."
        title={PLAY_SCREEN_MODAL_TITLES.household}
      >
        <HouseholdDetailsPanel
          copy={copy}
          currentHouseLog={currentHouseLog}
          courtRosterEntries={courtRosterEntries}
          courtSize={courtSize}
          previewState={previewState}
          state={state}
        />
      </ModalSheet>
    </div>
  );
}
