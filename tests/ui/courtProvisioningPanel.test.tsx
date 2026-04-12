import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CourtProvisioningSurface } from "../../src/ui/courtProvisioningView";
import { CourtProvisioningPanel } from "../../src/ui/panels/CourtProvisioningPanel";

function createSurface(): CourtProvisioningSurface {
  return {
    allocationRows: [
      {
        allocationPriority: 0,
        badgeLabels: ["undernourishment_risk"],
        personId: "p_head",
        personName: "Roger",
        rationLevelLabel: "Full",
        requestLabel: "3 food / 1 meat",
        shortfallLabel: "0 food / 1 meat",
        statusLabel: "Shortfall"
      }
    ],
    debugEntryRows: [
      {
        activeSeatSummary: "None",
        badgeSummary: "undernourishment_risk",
        carryForwardLabel: "Seeded this turn",
        lodgingLevelLabel: "Manor House",
        personId: "p_head",
        personName: "Roger",
        provisioningClassLabel: "Head Of House",
        rationLevelLabel: "Full",
        rationRuleId: "court.provisioning.ration.full.p_head",
        seatSummary: "None",
        serviceSummary: "None",
        statusLabel: "Shortfall",
        stipendAmountLabel: "0 coin",
        stipendBasisLabel: "Family Service",
        stipendKey: "stipend:p_head"
      }
    ],
    debugRows: [
      { key: "provisioning_schema_version", label: "provisioning_schema_version", value: "court_provisioning_view_v1" },
      { key: "stipend_registry_schema_version", label: "stipend_registry_schema_version", value: "court_stipend_registry_v1" },
      { key: "generated_at_turn_index", label: "generated_at_turn_index", value: "12" },
      { key: "person_ids", label: "person_ids", value: "p_head, p_spouse" }
    ],
    debugStipendRows: [
      {
        appliesReceiptLabel: "Yes",
        carryForwardLabel: "Carried from prior turn",
        paymentBasisLabel: "Realm Stipend",
        personId: "p_retainer",
        personName: "Hugh",
        receiptCategoryLabel: "Expense Household Admin",
        ruleId: "court.provisioning.stipend.realm_stipend.p_retainer",
        stipendAmountLabel: "2 coin",
        stipendKey: "stipend:p_retainer"
      }
    ],
    helperText:
      "This sheet stays on the accepted provisioning view and stipend registry. It explains current ration allocation, carry-forward defaults, and stipend placeholders without mutating sim state directly.",
    overrideRows: [
      {
        carryForwardLabel: "Seeded this turn",
        lodgingLevelLabel: "Manor House",
        personId: "p_head",
        personName: "Roger",
        provisioningClassLabel: "Head Of House",
        rationLevelLabel: "Full",
        roleSummary: "Head of House",
        seatSummary: "None",
        serviceSummary: "None",
        statusLabel: "Shortfall"
      }
    ],
    schemaVersion: "court_provisioning_view_v1",
    stipendRows: [
      {
        activeSeatSummary: "house:house:h_player:steward",
        appliesReceiptLabel: "Receipt applies",
        carryForwardLabel: "Carried from prior turn",
        paymentBasisLabel: "Realm Stipend",
        personId: "p_retainer",
        personName: "Hugh",
        provisioningClassLabel: "Retainer",
        receiptCategoryLabel: "Expense Household Admin",
        serviceSummary: "sr_h_player_steward",
        stipendAmountLabel: "2 coin",
        stipendKey: "stipend:p_retainer"
      }
    ],
    subtitle: "2 court members · 5 food / 1 meat requested · 2 coin stipends",
    summaryCards: [
      {
        detail: "Risk watch: Roger",
        id: "court_members",
        label: "Court roster",
        value: "2 court members"
      },
      {
        detail: "2 entries in deterministic allocation order.",
        id: "ration_demand",
        label: "Ration demand",
        value: "5 food / 1 meat"
      },
      {
        detail: "1 people are currently flagged at risk.",
        id: "allocation_result",
        label: "Allocation result",
        value: "5 food / 0 meat"
      },
      {
        detail: "1 stipend keys remain available for receipt-backed follow-ons.",
        id: "stipend_coin",
        label: "Stipend coin",
        value: "2 coin"
      }
    ]
  };
}

describe("CourtProvisioningPanel", () => {
  it("renders the player tab with ration policy, overrides, and stipend table", () => {
    const html = renderToStaticMarkup(<CourtProvisioningPanel initialTab="player" surface={createSurface()} />);

    expect(html).toContain("Court provisioning");
    expect(html).toContain("Ration policy");
    expect(html).toContain("Overrides &amp; carry-forward");
    expect(html).toContain("Stipend table");
    expect(html).toContain("Receipt applies");
    expect(html).toContain("undernourishment_risk");
  });

  it("renders the debug tab with deterministic summary and registry tables", () => {
    const html = renderToStaticMarkup(<CourtProvisioningPanel initialTab="debug" surface={createSurface()} />);

    expect(html).toContain("Debug summary");
    expect(html).toContain("Deterministic provisioning field order");
    expect(html).toContain("Provisioning rows");
    expect(html).toContain("Stipend registry");
    expect(html).toContain("court.provisioning.stipend.realm_stipend.p_retainer");
    expect(html.indexOf("provisioning_schema_version")).toBeLessThan(html.indexOf("person_ids"));
  });
});
