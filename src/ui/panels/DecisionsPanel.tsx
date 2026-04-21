import React from "react";
import type { MarriageWindow, RunState, TurnDecisions } from "../../sim/types";
import type {
  ObligationsCounterpartyContractSection,
  ObligationsModalFocus
} from "../playScreenObligations";
import type { CourtProvisioningSurface } from "../courtProvisioningView";
import type { OutboundMarriageSurface } from "../outboundMarriageView";
import {
  clearObligationGestureDecision,
  obligationGesturePaymentModeLabel,
  obligationGesturePaymentModeOptions,
  queueDefaultObligationGesture,
  readObligationGestureDecision,
  updateObligationGestureAmount,
  updateObligationGesturePaymentMode
} from "../playScreenObligations";
import type { EconomyPricingSurface } from "../playViewModel";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_PANEL_ACCENT_STYLE,
  PLAY_SCREEN_SECTION_SIGILS,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE
} from "../playScreenTheme";
import type { CourtDecisionBudgetSurface } from "../playScreenCourtBudget";
import { buildPlaytestOpsExportCopy } from "../playtestOpsExport";
import { Tip, formatParentsLine, formatPersonWithAgeAndHouse } from "../viewHelpers";
import { ObligationsSummaryCards } from "./ObligationsSummaryCards";
import { SectionHeading } from "./SectionHeading";

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
  courtDecisionBudget: CourtDecisionBudgetSurface | null;
  courtProvisioningSurface: CourtProvisioningSurface | null;
  marriageWindow: MarriageWindow | null;
  marriageWorkflowActive?: boolean;
  maxLaborShift: number;
  obligations: any;
  obligationsSections: ObligationsCounterpartyContractSection[];
  outboundMarriageSurface: OutboundMarriageSurface | null;
  onExportFullRunJson: () => void;
  onOpenCourtProvisioning: () => void;
  onOpenOutboundMarriage: () => void;
  onExportRunSummary: () => void;
  onOpenLog?: () => void;
  onOpenObligationsDetails: (focus: ObligationsModalFocus) => void;
  pfHouseLabelById: Map<string, string>;
  pfParentsByChild: Map<string, string[]>;
  pfPeopleRec: Record<string, any>;
  pfPersonHouseById: Map<string, string>;
  pricingSurface: EconomyPricingSurface | null;
  previewState: RunState;
  prospectsTotalCount: number;
  runSeed: string;
  sellCapBushels: number;
  setDecisions: React.Dispatch<React.SetStateAction<TurnDecisions>>;
  totalObligations: OblAmount;
  turnYears: number;
  arrearsCarried: OblAmount;
};

function gestureBudgetStatus(
  section: ObligationsCounterpartyContractSection,
  courtDecisionBudget: CourtDecisionBudgetSurface | null
): { availableNow: boolean; summary: string } {
  if (!section.gestureGroup.availableInBudget) {
    return {
      availableNow: false,
      summary: "Court budget availability is not exposed for this gesture in the current snapshot."
    };
  }

  if (!courtDecisionBudget) {
    return {
      availableNow: true,
      summary:
        section.gestureGroup.cost === null
          ? "Court budget cost is not exposed in the current snapshot."
          : `Court budget cost ${section.gestureGroup.cost}.`
    };
  }

  const costSummary =
    section.gestureGroup.cost === null
      ? "No court budget cost recorded."
      : `Cost ${section.gestureGroup.cost}; ${courtDecisionBudget.remaining} remaining.`;
  const spentSummary =
    section.gestureGroup.spent !== null && section.gestureGroup.spent > 0
      ? ` Visible snapshot used ${section.gestureGroup.spent}.`
      : "";
  const availableNow =
    !courtDecisionBudget.exhausted &&
    (section.gestureGroup.cost === null || courtDecisionBudget.remaining >= section.gestureGroup.cost);

  return {
    availableNow,
    summary: `${availableNow ? "Court budget available now." : "Court budget unavailable now."} ${costSummary}${spentSummary}`
  };
}

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
  courtDecisionBudget,
  courtProvisioningSurface,
  marriageWindow,
  marriageWorkflowActive = false,
  maxLaborShift,
  obligations,
  obligationsSections,
  outboundMarriageSurface,
  onExportFullRunJson,
  onOpenCourtProvisioning,
  onOpenOutboundMarriage,
  onExportRunSummary,
  onOpenLog,
  onOpenObligationsDetails,
  pfHouseLabelById,
  pfParentsByChild,
  pfPeopleRec,
  pfPersonHouseById,
  pricingSurface,
  previewState,
  prospectsTotalCount,
  runSeed,
  sellCapBushels,
  setDecisions,
  totalObligations,
  turnYears,
  arrearsCarried
}: DecisionsPanelProps) {
  const exportCopy = buildPlaytestOpsExportCopy(runSeed);
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
    <div style={{ ...PLAY_SCREEN_PANEL_ACCENT_STYLE, marginTop: 12 }}>
      <SectionHeading
        helper={copy.decisionsTimingHelper ?? "These controls set the next turn. They do not rewrite the resolved chronicle above."}
        sigil={PLAY_SCREEN_SECTION_SIGILS.decisions}
        timingLabel={copy.turnSummary_nowChoose}
        title="Decisions"
      />
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

      {courtDecisionBudget ? (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, marginTop: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase" }}>
                Court decision budget
              </div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700 }}>
                {courtDecisionBudget.remaining} remaining
                <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500, opacity: 0.75 }}>of {courtDecisionBudget.limit}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Spent {courtDecisionBudget.spent}
              {courtDecisionBudget.exhausted ? " • No court budget remains." : ""}
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, lineHeight: 1.45 }}>
            Gifts, church offerings, and marriage handling all draw from the same court attention this turn.
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {courtDecisionBudget.entries.map((entry) => (
              <div
                key={entry.action}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto auto",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "8px 10px",
                  border: "1px solid rgba(172, 143, 100, 0.28)",
                  borderRadius: 12,
                  background: entry.spent > 0 ? "rgba(236, 224, 201, 0.45)" : "rgba(255, 250, 241, 0.78)"
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {entry.label}
                    {entry.isHighestCost ? <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>Highest cost</span> : null}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, opacity: 0.72 }}>{entry.detail}</div>
                </div>
                <div style={{ fontSize: 12, whiteSpace: "nowrap" }}>Cost {entry.cost}</div>
                <div style={{ fontSize: 12, whiteSpace: "nowrap", fontWeight: entry.spent > 0 ? 700 : 500 }}>Used {entry.spent}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {courtProvisioningSurface ? (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, marginTop: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase" }}>
                Court provisioning
              </div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700 }}>{courtProvisioningSurface.summaryCards[0]?.value ?? "Provisioning available"}</div>
            </div>
            <button onClick={onOpenCourtProvisioning} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
              Open provisioning sheet
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
            {courtProvisioningSurface.helperText}
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 10 }}>
            {courtProvisioningSurface.summaryCards.slice(1).map((card) => (
              <div
                key={card.id}
                style={{
                  padding: "8px 10px",
                  border: "1px solid rgba(172, 143, 100, 0.28)",
                  borderRadius: 12,
                  background: "rgba(255, 250, 241, 0.78)"
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.72, textTransform: "uppercase" }}>{card.label}</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{card.value}</div>
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.78, lineHeight: 1.4 }}>{card.detail}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {marriageWorkflowActive ? (
        <div
          data-marriage-decisions-demoted="true"
          style={{ ...PLAY_SCREEN_SUBCARD_STYLE, marginTop: 12, padding: 12 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase" }}>
            Marriage workflow
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
            Marriage replies, scouting/search, and outbound offer construction now live together in the Prospects marriage
            workflow. The old decision-panel marriage controls are hidden so proposals do not appear in two places.
          </div>
        </div>
      ) : outboundMarriageSurface ? (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, marginTop: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase" }}>
                Outbound marriage
              </div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700 }}>{outboundMarriageSurface.subjectPersonName}</div>
            </div>
            <button onClick={onOpenOutboundMarriage} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
              Open match sheet
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
            {outboundMarriageSurface.helperText}
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 10 }}>
            {outboundMarriageSurface.summaryCards.slice(1).map((card) => (
              <div
                key={card.id}
                style={{
                  padding: "8px 10px",
                  border: "1px solid rgba(172, 143, 100, 0.28)",
                  borderRadius: 12,
                  background: "rgba(255, 250, 241, 0.78)"
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.72, textTransform: "uppercase" }}>{card.label}</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{card.value}</div>
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.78, lineHeight: 1.4 }}>{card.detail}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button
              onClick={() => setDecisions((current) => ({ ...current, marriage: { kind: "marriage", action: "scout" } }))}
              style={PLAY_SCREEN_ACTION_BUTTON_STYLE}
              type="button"
            >
              {decisions.marriage.action === "scout" ? "Scout queued" : "Queue scout"}
            </button>
            <button
              onClick={() => setDecisions((current) => ({ ...current, marriage: { kind: "marriage", action: "none" } }))}
              style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE}
              type="button"
            >
              Clear scout
            </button>
          </div>
        </div>
      ) : null}

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
          {pricingSurface ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82, lineHeight: 1.4 }}>
              <div>
                Reference price: <b>{pricingSurface.ratioLabel}</b>.
              </div>
              <div>
                Fixed reference cap: {pricingSurface.fixedSellCapUnits} bushels; max sellable now {pricingSurface.maxSellableUnits} for{" "}
                {pricingSurface.maxQuotedCoin} coin.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div id={anchorObligations} style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h4 style={{ margin: 0 }}>Obligations</h4>
          {obligationsSections.length > 0 ? (
            <button onClick={() => onOpenObligationsDetails("overview")} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
              Open detail sheet
            </button>
          ) : null}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{copy.obligationsHelper}</div>
        {coinShortfall > 0 || bushelsShortfall > 0 ? (
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Shortfall → arrears: {fmtObAmount({ coin: coinShortfall, bushels: bushelsShortfall })}
          </div>
        ) : null}
        <ObligationsSummaryCards
          helperText="Next turn response: these cards keep the active stage visible while showing what coin, bushels, and court attention can still change."
          onOpenDetails={onOpenObligationsDetails}
          sections={obligationsSections}
          surface="decisions"
        />

        {obligationsSections.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase" }}>
              Gift & offering controls
            </div>
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
              Keep dues payments below for tax and tithe settlement. Use these separate gesture controls when you want a gift or offering to show up in the next turn plan explicitly.
            </div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 10 }}>
              {obligationsSections.map((section) => {
                const actionId = section.gestureGroup.actionId;
                const gestureDecision = readObligationGestureDecision(decisions, actionId);
                const budgetStatus = gestureBudgetStatus(section, courtDecisionBudget);
                const queueLabel = actionId === "gift_liege" ? "Queue gift" : "Queue offering";
                const queued = gestureDecision.amount > 0 && gestureDecision.payment_mode !== "none";

                return (
                  <div
                    data-obligation-gesture-control={actionId}
                    key={actionId}
                    style={{
                      ...PLAY_SCREEN_SUBCARD_STYLE,
                      padding: 12,
                      display: "grid",
                      gap: 10
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{section.gestureGroup.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.72 }}>{queued ? "Queued" : "Not queued"}</div>
                    </div>

                    <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{section.gestureGroup.detail}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{section.gestureGroup.leverSummary}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                      Amount {gestureDecision.amount}. Payment mode {obligationGesturePaymentModeLabel(gestureDecision.payment_mode)}.{" "}
                      {budgetStatus.summary}
                    </div>

                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span>Amount</span>
                        <input
                          aria-label={`${section.gestureGroup.title} amount`}
                          min={0}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            setDecisions((current) => updateObligationGestureAmount(current, actionId, raw));
                          }}
                          style={{ width: "100%" }}
                          type="number"
                          value={gestureDecision.amount}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 4 }}>
                        <span>Payment mode</span>
                        <select
                          aria-label={`${section.gestureGroup.title} payment mode`}
                          onChange={(e) =>
                            setDecisions((current) =>
                              updateObligationGesturePaymentMode(current, actionId, e.target.value as any)
                            )
                          }
                          value={gestureDecision.payment_mode}
                        >
                          {obligationGesturePaymentModeOptions(actionId).map((mode) => (
                            <option key={mode} value={mode}>
                              {obligationGesturePaymentModeLabel(mode)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        disabled={!budgetStatus.availableNow}
                        onClick={() => setDecisions((current) => queueDefaultObligationGesture(current, actionId))}
                        style={PLAY_SCREEN_ACTION_BUTTON_STYLE}
                        title={budgetStatus.availableNow ? "" : budgetStatus.summary}
                        type="button"
                      >
                        {queueLabel}
                      </button>
                      <button
                        onClick={() => setDecisions((current) => clearObligationGestureDecision(current, actionId))}
                        style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE}
                        type="button"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
          <button onClick={() => setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "none" } }))} style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE}>
            Clear
          </button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
          Construction is <b>not instant</b>. Progress each turn = builders × {buildRatePerBuilderPerTurn}. Builders also consume +{builderExtraPerTurn} extra bushels this turn ({turnYears}y) each.
        </div>
      </div>

      {marriageWindow && prospectsTotalCount === 0 && !marriageWorkflowActive ? (
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

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={advanceTurn} disabled={laborLimitExceeded} style={PLAY_SCREEN_ACTION_BUTTON_STYLE}>Advance Turn</button>
        {onOpenLog ? <button onClick={onOpenLog} style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE}>Open Run Log</button> : null}
        <button onClick={onExportRunSummary} style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE}>Export Run Summary</button>
        <button onClick={onExportFullRunJson} style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE}>Export Full Run JSON</button>
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{exportCopy.decisionsHelper}</div>
    </div>
  );
}
