import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DecisionsPanel } from "../../src/ui/panels/DecisionsPanel";
import type { CourtDecisionBudgetSurface } from "../../src/ui/playScreenCourtBudget";

function createCourtDecisionBudget(): CourtDecisionBudgetSurface {
  return {
    limit: 6,
    spent: 2,
    remaining: 4,
    exhausted: false,
    entries: [
      {
        action: "gift_liege",
        cost: 1,
        spent: 0,
        label: "Gift to liege",
        detail: "Court favor spent on noble gifts.",
        isHighestCost: false
      },
      {
        action: "offering_church",
        cost: 1,
        spent: 0,
        label: "Offering to church",
        detail: "Court effort spent on religious offerings.",
        isHighestCost: false
      },
      {
        action: "marriage_inbound",
        cost: 1,
        spent: 0,
        label: "Marriage reply",
        detail: "Processing existing offers or refusals.",
        isHighestCost: false
      },
      {
        action: "marriage_scout",
        cost: 2,
        spent: 2,
        label: "Marriage scouting",
        detail: "Seeking new prospects beyond the current offers.",
        isHighestCost: true
      }
    ]
  };
}

function createProps(): React.ComponentProps<typeof DecisionsPanel> {
  return {
    accruedThisTurn: null,
    advanceTurn: () => undefined,
    anchorLabor: "labor",
    anchorObligations: "obligations",
    buildRatePerBuilderPerTurn: 1,
    builderExtraPerTurn: 3,
    copy: {
      decisionsTimingHelper: "These controls set the next turn.",
      turnSummary_nowChoose: "Now choose the next turn",
      laborTimingProduction: "Farmers affect production next turn.",
      laborTimingBuilders: "Builders affect construction next turn.",
      laborDeltaCapClarifier: "Labor shifts are capped.",
      laborDeltaCapError: (max: number, requested: number) => `Max ${max}; requested ${requested}.`,
      laborOversubscribedTitle: "Too many assignments",
      laborOversubscribedBody: (assigned: number, available: number) => `${assigned}/${available}`,
      laborOversubscribedHelper: "Reduce assignments.",
      obligationsHelper: "Obligations resolve after labor.",
      obligationsTotal: "Total obligations",
      obligationsDueEntering: "Due entering the turn",
      obligationsAccrued: "Accrued this turn",
      obligationsArrears: "Arrears carried"
    },
    decisions: {
      labor: { kind: "labor", desired_farmers: 6, desired_builders: 2 },
      sell: { kind: "sell", sell_bushels: 0 },
      obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
      construction: { kind: "construction", action: "none" },
      marriage: { kind: "marriage", action: "none" }
    },
    dueEntering: { coin: 0, bushels: 0 },
    eligibleMaidensLocalRaw: [],
    fmtObAmount: ({ coin, bushels }) => `${coin} coin / ${bushels} bushels`,
    improvementIds: [],
    improvements: {},
    laborAssignedNextTurn: 8,
    laborAvailableNextTurn: 10,
    laborLimitExceeded: false,
    laborOversubscribed: false,
    laborRequested: 0,
    manor: {
      coin: 10,
      bushels_stored: 120,
      construction: null,
      improvements: []
    },
    courtDecisionBudget: createCourtDecisionBudget(),
    marriageWindow: null,
    maxLaborShift: 2,
    obligations: { war_levy_due: null },
    onExportFullRunJson: () => undefined,
    onExportRunSummary: () => undefined,
    pfHouseLabelById: new Map(),
    pfParentsByChild: new Map(),
    pfPeopleRec: {},
    pfPersonHouseById: new Map(),
    previewState: {
      house: {
        energy: {
          available: 3,
          max: 3
        }
      }
    } as any,
    prospectsTotalCount: 1,
    sellCapBushels: 0,
    setDecisions: () => undefined,
    totalObligations: { coin: 0, bushels: 0 },
    turnYears: 3,
    arrearsCarried: { coin: 0, bushels: 0 }
  };
}

describe("DecisionsPanel court budget", () => {
  it("renders the spent and remaining court decision budget state", () => {
    const html = renderToStaticMarkup(<DecisionsPanel {...createProps()} />);

    expect(html).toContain("Court decision budget");
    expect(html).toContain("4 remaining");
    expect(html).toContain("of 6");
    expect(html).toContain("Spent 2");
    expect(html).toContain("Gift to liege");
    expect(html).toContain("Offering to church");
    expect(html).toContain("Marriage reply");
    expect(html).toContain("Marriage scouting");
    expect(html).toContain("Cost 2");
    expect(html).toContain("Used 2");
    expect(html).toContain("Highest cost");
  });
});
