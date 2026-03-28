import { describe, expect, it } from "vitest";

import { buildCourtDecisionBudgetSurface } from "../../src/ui/playScreenCourtBudget";

describe("playScreenCourtBudget", () => {
  it("reads the report budget and marks the highest-cost court action", () => {
    const surface = buildCourtDecisionBudgetSurface(
      {
        court_decision_budget: {
          schema_version: "court_decision_budget_view_v0",
          limit: 6,
          spent: 2,
          remaining: 4,
          exhausted: false,
          actions: [
            { action: "gift_liege", cost: 1, spent: 0 },
            { action: "offering_church", cost: 1, spent: 0 },
            { action: "marriage_inbound", cost: 1, spent: 0 },
            { action: "marriage_scout", cost: 2, spent: 2 }
          ]
        }
      },
      null
    );

    expect(surface).toEqual({
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
    });
  });

  it("falls back to the marriage window when the report budget is absent", () => {
    const surface = buildCourtDecisionBudgetSurface(
      {},
      {
        court_decision_budget: {
          limit: 6,
          spent: 0,
          remaining: 6,
          exhausted: false,
          actions: [
            { action: "gift_liege", cost: 1, spent: 0 },
            { action: "offering_church", cost: 1, spent: 0 },
            { action: "marriage_inbound", cost: 1, spent: 0 },
            { action: "marriage_scout", cost: 2, spent: 0 }
          ]
        }
      }
    );

    expect(surface?.remaining).toBe(6);
    expect(surface?.spent).toBe(0);
    expect(surface?.entries.map((entry) => entry.label)).toEqual([
      "Gift to liege",
      "Offering to church",
      "Marriage reply",
      "Marriage scouting"
    ]);
  });
});
