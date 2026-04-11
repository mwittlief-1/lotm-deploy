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
        onOpenPersonCard={() => undefined}
        personNameFromRegistry={(personId: string | null | undefined) => (personId === "p_grant_subject" ? "Cecily" : null)}
        personCardIds={new Set(["p_grant_subject"])}
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
            subject_person_id: "p_grant_subject",
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
    expect(html).toContain('data-person-card-open="p_grant_subject"');
    expect(html).not.toContain("WRONG GRANT HELPER");
    expect(html).not.toContain("WRONG REJECT NOTE");
  });

  it("renders both subject and spouse names as person-card triggers for marriage prospects", () => {
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
          prospectGrantHelperLine: "Grant helper.",
          prospectGrantRejectNote: "Grant reject note.",
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
        houseLabel={(houseId: string | null | undefined) => (houseId === "h_ext_02" ? "House Ashford" : houseId ?? "House Unknown")}
        onOpenPersonCard={() => undefined}
        personNameFromRegistry={(personId: string | null | undefined) =>
          personId === "p_child_1" ? "Alice" : personId === "p_suitor_1" ? "Cedric" : null
        }
        personCardIds={new Set(["p_child_1", "p_suitor_1"])}
        pfHouseLabelById={new Map()}
        pfParentsByChild={new Map()}
        pfPeopleRec={{}}
        pfPersonHouseById={new Map()}
        previewState={{
          people: {
            p_child_1: { age: 18, sex: "F" },
            p_suitor_1: { age: 21, sex: "M" }
          }
        } as any}
        prospectLogLines={[]}
        prospectTypeLabel={() => "Marriage"}
        prospectsShown={[
          {
            actions: ["accept", "reject"],
            from_house_id: "h_ext_02",
            id: "marriage_1",
            spouse_age: 21,
            spouse_person_id: "p_suitor_1",
            summary: "A marriage offer links your house to House Ashford.",
            subject_person_id: "p_child_1",
            type: "marriage"
          }
        ]}
        prospectsShownCount={1}
        prospectsTotalCount={1}
        rejectHasStandingRisk={() => false}
        reportTurnIndex={12}
        shownIds={["marriage_1"]}
        uncertaintyLabel={() => null}
      />
    );

    expect(html).toContain('data-person-card-open="p_child_1"');
    expect(html).toContain('data-person-card-open="p_suitor_1"');
    expect(html).toContain("Groom:");
  });
});
