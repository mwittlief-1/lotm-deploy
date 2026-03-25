import React from "react";
import type { RunState } from "../../sim/types";
import { Tip } from "../viewHelpers";
import { HouseholdPanel } from "./HouseholdPanel";

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
  deltaBushels: number;
  deltaCoin: number;
  deltaUnrest: number;
  dueEntering: any;
  fmtObAmount: (value: any) => string;
  hasConsumptionSplit: boolean;
  idle: number;
  manor: any;
  peasantConsumptionBushels: number | null;
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
  deltaBushels,
  deltaCoin,
  deltaUnrest,
  dueEntering,
  fmtObAmount,
  hasConsumptionSplit,
  idle,
  manor,
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
  return (
    <div style={{ padding: 12, border: "1px solid #ccc" }}>
      <h3>
        Turn Report <span style={{ fontSize: 12, opacity: 0.7 }}>(before decisions)</span>
      </h3>

      <div style={{ padding: 8, border: "1px solid #eee", background: "#fafafa", marginBottom: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>At a glance</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
          <div>
            Bushels: <b>{deltaBushels > 0 ? `+${deltaBushels}` : String(deltaBushels)}</b> (now {manor.bushels_stored})
          </div>
          <div>
            Coin: <b>{deltaCoin > 0 ? `+${deltaCoin}` : String(deltaCoin)}</b> (now {manor.coin})
          </div>
          <div>
            Unrest: <b>{deltaUnrest > 0 ? `+${deltaUnrest}` : String(deltaUnrest)}</b> (now {manor.unrest}/100)
          </div>
          {report.shortage_bushels > 0 ? (
            <div>
              <b>Shortage:</b> {report.shortage_bushels} bushels
            </div>
          ) : null}
        </div>
      </div>

      <HouseholdPanel
        anchorId={anchorHousehold}
        copy={copy}
        currentHouseLog={currentHouseLog}
        courtRosterEntries={courtRosterEntries}
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
      </ul>

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
    </div>
  );
}
