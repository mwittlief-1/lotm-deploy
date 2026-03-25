import React from "react";
import type { MarriageWindow, RunState, TurnDecisions } from "../../sim/types";
import { Tip, formatParentsLine, formatPersonWithAgeAndHouse } from "../viewHelpers";

type OblAmount = { coin: number; bushels: number };

type DecisionsPanelProps = {
  accruedThisTurn: OblAmount | null;
  advanceTurn: () => void;
  anchorLabor: string;
  anchorObligations: string;
  buildRatePerBuilderPerTurn: number;
  builderExtraPerTurn: number;
  copy: any;
  decisions: TurnDecisions;
  dueEntering: OblAmount;
  eligibleMaidensLocalRaw: any;
  fmtObAmount: (amount: OblAmount) => string;
  improvementIds: string[];
  improvements: Record<string, any>;
  laborAssignedNextTurn: number;
  laborAvailableNextTurn: number;
  laborLimitExceeded: boolean;
  laborOversubscribed: boolean;
  laborRequested: number;
  manor: any;
  marriageWindow: MarriageWindow | null;
  maxLaborShift: number;
  obligations: any;
  onExportFullRunJson: () => void;
  onExportRunSummary: () => void;
  pfHouseLabelById: Map<string, string>;
  pfParentsByChild: Map<string, string[]>;
  pfPeopleRec: Record<string, any>;
  pfPersonHouseById: Map<string, string>;
  previewState: RunState;
  prospectsTotalCount: number;
  sellCapBushels: number;
  setDecisions: React.Dispatch<React.SetStateAction<TurnDecisions>>;
  totalObligations: OblAmount;
  turnYears: number;
  arrearsCarried: OblAmount;
};

function LegacyMarriageWindowPanel({
  eligibleMaidensLocalRaw,
  manor,
  marriageWindow,
  pfHouseLabelById,
  pfParentsByChild,
  pfPeopleRec,
  pfPersonHouseById,
  previewState,
  setDecisions
}: {
  eligibleMaidensLocalRaw: any;
  manor: any;
  marriageWindow: MarriageWindow;
  pfHouseLabelById: Map<string, string>;
  pfParentsByChild: Map<string, string[]>;
  pfPeopleRec: Record<string, any>;
  pfPersonHouseById: Map<string, string>;
  previewState: RunState;
  setDecisions: React.Dispatch<React.SetStateAction<TurnDecisions>>;
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <h4>Marriage Window</h4>
      <div style={{ opacity: 0.85 }}>
        Eligible children: {marriageWindow.eligible_child_ids.join(", ")}
        {marriageWindow.eligible_child_ids && marriageWindow.eligible_child_ids.length > 0 ? (
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            <div>
              Subject: {formatPersonWithAgeAndHouse(marriageWindow.eligible_child_ids[0], pfPeopleRec, pfHouseLabelById, pfPersonHouseById)}
            </div>
            {formatParentsLine(marriageWindow.eligible_child_ids[0], pfParentsByChild, pfPeopleRec, pfHouseLabelById, pfPersonHouseById) ? (
              <div style={{ opacity: 0.8, marginTop: 2 }}>
                Parents: {formatParentsLine(marriageWindow.eligible_child_ids[0], pfParentsByChild, pfPeopleRec, pfHouseLabelById, pfPersonHouseById)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 10, padding: 8, border: "1px solid #eee" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Eligible Maidens (Local)</div>
        {eligibleMaidensLocalRaw === null ? (
          <div style={{ fontSize: 12, opacity: 0.75 }}>(Not available in this build)</div>
        ) : Array.isArray(eligibleMaidensLocalRaw) ? (
          eligibleMaidensLocalRaw.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>None</div>
          ) : (
            <ul style={{ margin: "0 0 0 18px" }}>
              {eligibleMaidensLocalRaw.slice(0, 20).map((it: any, i: number) => {
                const personId: string =
                  typeof it === "string"
                    ? it
                    : typeof it?.person_id === "string"
                      ? it.person_id
                      : typeof it?.id === "string"
                        ? it.id
                        : "";

                const p: any = personId ? (previewState as any)?.people?.[personId] : null;

                const name: string =
                  (typeof it?.name === "string" && it.name) ||
                  (p && typeof p.name === "string" ? p.name : "") ||
                  personId ||
                  "(Not available in this build)";

                const age: number | null =
                  typeof it?.age === "number" && Number.isFinite(it.age)
                    ? Math.trunc(it.age)
                    : p && typeof p.age === "number" && Number.isFinite(p.age)
                      ? Math.trunc(p.age)
                      : null;

                const houseLabel: string =
                  (typeof it?.house_label === "string" && it.house_label) ||
                  (typeof it?.house_name === "string" && it.house_name ? `House ${it.house_name}` : "") ||
                  "";

                return (
                  <li key={`${personId || i}`} style={{ fontSize: 12, opacity: 0.85, marginBottom: 2 }}>
                    {name}
                    {age !== null ? ` (Age ${age})` : ""}
                    {houseLabel ? ` — ${houseLabel}` : ""}
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <div style={{ fontSize: 12, opacity: 0.75 }}>(Not available in this build)</div>
        )}
      </div>

      {marriageWindow.offers.map((o, idx) => (
        <div key={idx} style={{ padding: 8, border: "1px solid #ddd", marginTop: 6 }}>
          <b>{o.house_label}</b> — Dowry {o.dowry_coin_net >= 0 ? "+" : ""}
          {o.dowry_coin_net} coin — tags: {o.risk_tags.join(", ")}
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            Candidate: {formatPersonWithAgeAndHouse(o.house_person_id, pfPeopleRec, pfHouseLabelById, pfPersonHouseById)}
          </div>
          {formatParentsLine(o.house_person_id, pfParentsByChild, pfPeopleRec, pfHouseLabelById, pfPersonHouseById) ? (
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
              Parents: {formatParentsLine(o.house_person_id, pfParentsByChild, pfPeopleRec, pfHouseLabelById, pfPersonHouseById)}
            </div>
          ) : null}
          <div style={{ marginTop: 6 }}>
            <button
              disabled={o.dowry_coin_net < 0 && manor.coin < Math.abs(o.dowry_coin_net)}
              onClick={() =>
                setDecisions((d) => ({
                  ...d,
                  marriage: { kind: "marriage", action: "accept", child_id: marriageWindow.eligible_child_ids[0], offer_index: idx }
                }))
              }
              title={o.dowry_coin_net < 0 && manor.coin < Math.abs(o.dowry_coin_net) ? "Insufficient coin for negative dowry (disabled)." : ""}
            >
              Choose this offer
            </button>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "reject_all" } }))}>Reject all</button>
        <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "scout" } }))}>Scout</button>
        <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "none" } }))}>Clear</button>
      </div>
    </div>
  );
}

export function DecisionsPanel({
  accruedThisTurn,
  advanceTurn,
  anchorLabor,
  anchorObligations,
  buildRatePerBuilderPerTurn,
  builderExtraPerTurn,
  copy,
  decisions,
  dueEntering,
  eligibleMaidensLocalRaw,
  fmtObAmount,
  improvementIds,
  improvements,
  laborAssignedNextTurn,
  laborAvailableNextTurn,
  laborLimitExceeded,
  laborOversubscribed,
  laborRequested,
  manor,
  marriageWindow,
  maxLaborShift,
  obligations,
  onExportFullRunJson,
  onExportRunSummary,
  pfHouseLabelById,
  pfParentsByChild,
  pfPeopleRec,
  pfPersonHouseById,
  previewState,
  prospectsTotalCount,
  sellCapBushels,
  setDecisions,
  totalObligations,
  turnYears,
  arrearsCarried
}: DecisionsPanelProps) {
  const payCoin = Math.max(0, Math.min(Math.max(0, manor.coin), Math.trunc(Number.isFinite(decisions.obligations.pay_coin) ? decisions.obligations.pay_coin : 0)));
  const payBushels = Math.max(
    0,
    Math.min(Math.max(0, manor.bushels_stored), Math.trunc(Number.isFinite(decisions.obligations.pay_bushels) ? decisions.obligations.pay_bushels : 0))
  );

  const coinAfterArrears = Math.max(0, payCoin - Math.max(0, arrearsCarried.coin));
  const bushelsAfterArrears = Math.max(0, payBushels - Math.max(0, arrearsCarried.bushels));
  const coinToDue = Math.min(Math.max(0, dueEntering.coin), coinAfterArrears);
  const bushelsToDue = Math.min(Math.max(0, dueEntering.bushels), bushelsAfterArrears);
  const coinShortfall = Math.max(0, Math.max(0, dueEntering.coin) - coinToDue);
  const bushelsShortfall = Math.max(0, Math.max(0, dueEntering.bushels) - bushelsToDue);

  return (
    <div style={{ marginTop: 12, padding: 12, border: "1px solid #ccc" }}>
      <h3>Decisions (3–5)</h3>
      <div style={{ opacity: 0.8, fontSize: 12, lineHeight: 1.4 }}>
        <div>
          Energy available: {previewState.house.energy.available}/{previewState.house.energy.max}.
        </div>
        <div>{copy.laborTimingProduction}</div>
        <div>{copy.laborTimingBuilders}</div>
        <div>{copy.laborDeltaCapClarifier}</div>
        <div>
          Max labor shift this turn: <b>{maxLaborShift}</b>.
        </div>
        {laborLimitExceeded ? (
          <div style={{ color: "#c00", fontWeight: 700 }}>
            {copy.laborDeltaCapError(maxLaborShift, laborRequested)}
          </div>
        ) : null}
      </div>

      {laborOversubscribed ? (
        <div style={{ padding: 10, border: "1px solid #f55", background: "#fff5f5", marginTop: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>{copy.laborOversubscribedTitle}</div>
          <div style={{ marginTop: 4 }}>{copy.laborOversubscribedBody(laborAssignedNextTurn, laborAvailableNextTurn)}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{copy.laborOversubscribedHelper}</div>
        </div>
      ) : null}

      <div id={anchorLabor} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label>Farmers (next turn): </label>
          <input
            type="number"
            value={decisions.labor.desired_farmers}
            onChange={(e) =>
              setDecisions((d) => ({ ...d, labor: { ...d.labor, desired_farmers: Number(e.target.value) } }))
            }
            style={{ width: 80 }}
          />
        </div>
        <div>
          <label>
            Builders (next turn):
            <Tip
              text={`Builders contribute to construction progress this turn (rate = builders × ${buildRatePerBuilderPerTurn}). They also consume +${builderExtraPerTurn} extra bushels this turn (${turnYears}y) each.`}
            />{" "}
          </label>
          <input
            type="number"
            value={decisions.labor.desired_builders}
            onChange={(e) =>
              setDecisions((d) => ({ ...d, labor: { ...d.labor, desired_builders: Number(e.target.value) } }))
            }
            style={{ width: 80 }}
          />
        </div>

        <div>
          <label>Sell bushels: </label>
          <input
            type="number"
            value={decisions.sell.sell_bushels}
            onChange={(e) => setDecisions((d) => ({ ...d, sell: { ...d.sell, sell_bushels: Number(e.target.value) } }))}
            style={{ width: 100 }}
          />
          <span style={{ opacity: 0.8 }}> (cap {sellCapBushels})</span>
        </div>
      </div>

      <div id={anchorObligations} style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee" }}>
        <h4 style={{ margin: 0 }}>Obligations</h4>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{copy.obligationsHelper}</div>
        {coinShortfall > 0 || bushelsShortfall > 0 ? (
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Shortfall → arrears: {fmtObAmount({ coin: coinShortfall, bushels: bushelsShortfall })}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10, fontSize: 12 }}>
          <div>
            <div>
              <b>{copy.obligationsTotal}</b>: {fmtObAmount(totalObligations)}
            </div>
            <div style={{ marginTop: 4 }}>{copy.obligationsDueEntering}: {fmtObAmount(dueEntering)}</div>
            {accruedThisTurn ? (
              <div style={{ marginTop: 4 }}>{copy.obligationsAccrued}: {fmtObAmount(accruedThisTurn)}</div>
            ) : null}
            <div style={{ marginTop: 4 }}>{copy.obligationsArrears}: {fmtObAmount(arrearsCarried)}</div>
          </div>

          <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
            <div>
              <label>
                Pay coin:
                <Tip text="Payments apply to arrears first, then this turn’s dues (tax/tithe). Unpaid dues become arrears at end of turn." />{" "}
              </label>
              <input
                type="number"
                min={0}
                max={Math.max(0, manor.coin)}
                value={decisions.obligations.pay_coin}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const v = Number.isFinite(raw) ? Math.trunc(raw) : 0;
                  const clamped = Math.max(0, Math.min(Math.max(0, manor.coin), v));
                  setDecisions((d) => ({ ...d, obligations: { ...d.obligations, pay_coin: clamped } }));
                }}
                style={{ width: 100 }}
              />
            </div>

            <div>
              <label>Pay bushels: </label>
              <input
                type="number"
                min={0}
                max={Math.max(0, manor.bushels_stored)}
                value={decisions.obligations.pay_bushels}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const v = Number.isFinite(raw) ? Math.trunc(raw) : 0;
                  const clamped = Math.max(0, Math.min(Math.max(0, manor.bushels_stored), v));
                  setDecisions((d) => ({ ...d, obligations: { ...d.obligations, pay_bushels: clamped } }));
                }}
                style={{ width: 120 }}
              />
            </div>

            {obligations.war_levy_due ? (
              <div>
                <label>War levy: </label>
                <select
                  value={decisions.obligations.war_levy_choice ?? "ignore"}
                  onChange={(e) =>
                    setDecisions((d) => ({
                      ...d,
                      obligations: { ...d.obligations, war_levy_choice: e.target.value as any }
                    }))
                  }
                >
                  <option value="coin">Pay coin</option>
                  <option value="men">Provide men</option>
                  <option value="ignore">Refuse</option>
                </select>
                <span style={{ opacity: 0.8, marginLeft: 8 }}>
                  Due: {obligations.war_levy_due.kind === "men_or_coin" ? `${obligations.war_levy_due.men} men OR ${obligations.war_levy_due.coin} coin` : ""}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <h4>Improvement slot</h4>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            disabled={Boolean(manor.construction)}
            title={manor.construction ? "Disallowed while a project is active (must abandon first)." : "Pick an improvement to start."}
            onChange={(e) =>
              setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "start", improvement_id: e.target.value } }))
            }
            defaultValue=""
          >
            <option value="" disabled>
              Select project…
            </option>
            {improvementIds.map((id) => (
              <option key={id} value={id} disabled={Array.isArray(manor.improvements) ? manor.improvements.includes(id) : false}>
                {improvements[id].name} (coin {improvements[id].coin_cost}, req {improvements[id].required})
              </option>
            ))}
          </select>
          <button onClick={() => setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "none" } }))}>Clear</button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
          Construction is <b>not instant</b>. Progress each turn = builders × {buildRatePerBuilderPerTurn}. Builders also consume +{builderExtraPerTurn} extra bushels this turn ({turnYears}y) each.
        </div>
      </div>

      {marriageWindow && prospectsTotalCount === 0 ? (
        <LegacyMarriageWindowPanel
          eligibleMaidensLocalRaw={eligibleMaidensLocalRaw}
          manor={manor}
          marriageWindow={marriageWindow}
          pfHouseLabelById={pfHouseLabelById}
          pfParentsByChild={pfParentsByChild}
          pfPeopleRec={pfPeopleRec}
          pfPersonHouseById={pfPersonHouseById}
          previewState={previewState}
          setDecisions={setDecisions}
        />
      ) : null}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={advanceTurn} disabled={laborLimitExceeded}>Advance Turn</button>
        <button onClick={onExportRunSummary}>Export Run Summary</button>
        <button onClick={onExportFullRunJson}>Export Full Run JSON</button>
      </div>
    </div>
  );
}
