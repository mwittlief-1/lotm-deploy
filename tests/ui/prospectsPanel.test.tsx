import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProspectsPanel } from "../../src/ui/panels/ProspectsPanel";

describe("ProspectsPanel", () => {
  it("renders grant helper and standing-risk copy from the shared content template", () => {
    const html = renderToStaticMarkup(
      <ProspectsPanel
        anchorId="prospects"
        copy={{
          prospectCostsLabel: "Costs",
          prospectDecisionBadgeAccepted: "Accepted",
          prospectDecisionBadgeRejected: "Rejected",
          prospectExpiredAtEndOfTurn: (turnIndex: number) => `Expired at end of Turn ${turnIndex}.`,
          prospectExpiredBadge: "Expired",
          prospectExpiredHint: "No longer actionable.",
          prospectExpiredThisTurnMessage: "Expired this turn.",
          prospectFromToLine: (fromHouse: string) => `From ${fromHouse}`,
          prospectGrantHelperLine: "WRONG GRANT HELPER",
          prospectGrantRejectNote: "WRONG REJECT NOTE",
          prospectRequirementsLabel: "Requirements",
          prospectSubjectLabel: "Subject:",
          prospectTooltip_confidence: "Confidence help.",
          prospectTooltip_costs: "Costs help.",
          prospectTooltip_expiry: "Expiry help.",
          prospectTooltip_requirements: "Requirements help.",
          prospects: "Prospects",
          prospectsEmpty_noneAvailableYet: "None yet.",
          prospectsEmpty_noneShown: "None shown.",
          prospectsEmpty_noneShownHelper: "No filtered prospects.",
          prospectsEmpty_noneThisTurn: "None this turn.",
          prospectsHelper: "Helper text.",
          prospectsHiddenTooltip: "Hidden prospects help.",
          prospectsLogHidden: (hidden: number) => `Hidden: ${hidden}`,
          prospectsLogShown: (shown: number) => `Shown: ${shown}`,
          prospectsLogTitle: "Prospects log",
          prospectsShownHiddenSummary: (shown: number, total: number, hidden: number) => `${shown}/${total}/${hidden}`
        }}
        costsForProspect={() => ({ bushels: 0, coin: 0, energy: 0 })}
        effectsSummary={() => ({})}
        fmtSigned={(value: number) => (value > 0 ? `+${value}` : `${value}`)}
        getProspectDecision={() => null}
        handleProspectAction={() => undefined}
        hasProspectExpiredThisTurn={false}
        hiddenCount={0}
        hiddenIds={[]}
        houseLabel={(houseId: string | null | undefined) => houseId ?? "House Unknown"}
        personNameFromRegistry={() => null}
        pfHouseLabelById={new Map()}
        pfParentsByChild={new Map()}
        pfPeopleRec={{}}
        pfPersonHouseById={new Map()}
        previewState={{} as any}
        prospectLogLines={[]}
        prospectTypeLabel={() => "Grant"}
        prospectsShown={[
          {
            actions: ["accept", "reject"],
            from_house_id: "House Verneuil",
            id: "grant_1",
            summary: "A grant offer is on the table.",
            type: "grant"
          }
        ]}
        prospectsShownCount={1}
        prospectsTotalCount={1}
        rejectHasStandingRisk={() => true}
        reportTurnIndex={12}
        shownIds={["grant_1"]}
        uncertaintyLabel={() => null}
      />
    );

    expect(html).toContain("Support from your liege to ease burdens this turn.");
    expect(html).toContain("Declining may reduce your standing.");
    expect(html).not.toContain("WRONG GRANT HELPER");
    expect(html).not.toContain("WRONG REJECT NOTE");
  });
});
