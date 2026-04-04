import React from "react";
import type { RunState } from "../../sim/types";
import type { EconomyPricingSurface } from "../playViewModel";
import { PLAY_SCREEN_MODAL_TITLES } from "../playScreenChrome";
import { PLAY_SCREEN_PANEL_STYLE, PLAY_SCREEN_SECTION_SIGILS } from "../playScreenTheme";
import { Tip } from "../viewHelpers";
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

export function TurnReportPanel({
  accruedThisTurn,
  anchorFood,
  anchorHousehold,
  arrearsCarried,
  baselineConsPerTurn,
  builderExtraPerTurn,
  consBuilders,
  consFarmers,
  consIdle,
  copy,
  courtConsumptionBushels,
  courtRosterEntries,
  courtSize,
  currentHouseLog,
  dueEntering,
  fmtObAmount,
  hasConsumptionSplit,
  idle,
  manor,
  peasantConsumptionBushels,
  pricingSurface,
  previewState,
  report,
  showHouseholdDetails,
  state,
  toggleHouseholdDetails,
  totalConsumptionBushels,
  totalObligations,
  turnYears
}: TurnReportPanelProps) {
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
        previewState={previewState}
        state={state}
        showDetails={showHouseholdDetails}
        onToggleDetails={toggleHouseholdDetails}
      />

      <h4>Top drivers (3)</h4>
      {report.top_drivers.length ? (
        <ol>
          {report.top_drivers.slice(0, 3).map((d: string, i: number) => (
            <li key={i}>{d}</li>
          ))}
        </ol>
      ) : (
        <div style={{ opacity: 0.7 }}>None</div>
      )}

      <h4 id={anchorFood}>Food & stores</h4>
      <ul>
        <li>Weather multiplier: {report.weather_multiplier.toFixed(2)}</li>
        <li>Production: +{report.production_bushels} bushels</li>
        <li>
          Consumption: -{totalConsumptionBushels !== null ? totalConsumptionBushels : report.consumption_bushels} bushels
          <Tip
            text={`Baseline consumption: ${baselineConsPerTurn} bushels this turn (${turnYears}y) per person. Builders cost +${builderExtraPerTurn} extra bushels this turn (${turnYears}y) each.`}
          />
          {hasConsumptionSplit ? (
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
              <div>
                <b>{copy.peasantConsumptionLabel}:</b> -{peasantConsumptionBushels} bushels <Tip text={copy.peasantConsumptionHelper} />
              </div>
              <div>
                <b>{copy.courtConsumptionLabel}:</b> -{courtConsumptionBushels} bushels <Tip text={copy.courtConsumptionHelper} />
              </div>
              <div style={{ marginTop: 4 }}>{copy.courtEatsSameStores}</div>
              <div>{copy.consumptionReconcileNote}</div>
            </div>
          ) : null}
        </li>
        <li>
          Spoilage: -{report.spoilage.loss_bushels} bushels ({(report.spoilage.rate * 100).toFixed(1)}%)
        </li>
      </ul>

      <details style={{ marginTop: 6 }}>
        <summary>Consumption breakdown</summary>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
          <div style={{ marginBottom: 6, opacity: 0.85 }}>All values are for this turn ({turnYears}y).</div>
          <ul>
            <li>
              Farmers: {manor.farmers} × {baselineConsPerTurn} = {consFarmers} bushels
            </li>
            <li>
              Builders: {manor.builders} × {baselineConsPerTurn + builderExtraPerTurn} = {consBuilders} bushels
            </li>
            <li>
              Idle: {idle} × {baselineConsPerTurn} = {consIdle} bushels
            </li>
            {hasConsumptionSplit ? (
              <li>
                {copy.courtConsumptionLabel}: {courtConsumptionBushels} bushels
              </li>
            ) : null}
            <li>
              Total:{" "}
              {hasConsumptionSplit && courtConsumptionBushels !== null
                ? consFarmers + consBuilders + consIdle + courtConsumptionBushels
                : consFarmers + consBuilders + consIdle}{" "}
              bushels
            </li>
          </ul>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Builder premium: +{builderExtraPerTurn} bushels this turn ({turnYears}y) <b>per builder</b>.
          </div>
        </div>
      </details>

      <h4 style={{ marginTop: 12 }}>Market</h4>
      <ul>
        <li>
          Price: {report.market.price_per_bushel.toFixed(2)} coin/bushel
        </li>
        <li>
          Sell cap: {report.market.sell_cap_bushels} bushels
          <Tip text="Selling consumes 1 energy. Amount is trimmed to the market cap." />
        </li>
        {pricingSurface ? (
          <li>
            Reference: {pricingSurface.referenceLabel} ({pricingSurface.referenceId}) at {pricingSurface.ratioLabel}
          </li>
        ) : null}
        {pricingSurface ? (
          <li>
            Fixed reference cap: {pricingSurface.fixedSellCapUnits} bushels; current stores allow up to {pricingSurface.maxSellableUnits} for{" "}
            {pricingSurface.maxQuotedCoin} coin
          </li>
        ) : null}
      </ul>
      {pricingSurface && pricingSurface.catalogLines.length > 0 ? (
        <details style={{ marginTop: 6 }}>
          <summary>Pricing reference catalog</summary>
          <ul style={{ marginTop: 6 }}>
            {pricingSurface.catalogLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <h4 style={{ marginTop: 12 }}>Obligations</h4>
      <ul>
        <li>
          <b>{copy.obligationsTotal}</b>: {fmtObAmount(totalObligations)}
        </li>
        <li>
          {copy.obligationsDueEntering}: {fmtObAmount(dueEntering)}
        </li>
        {accruedThisTurn ? (
          <li>
            {copy.obligationsAccrued}: {fmtObAmount(accruedThisTurn)}
          </li>
        ) : null}
        <li>
          {copy.obligationsArrears}: {fmtObAmount(arrearsCarried)}
        </li>
      </ul>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{copy.obligationsHelper}</div>

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
