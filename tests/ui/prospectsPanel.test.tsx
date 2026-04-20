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

  it("renders a unified marriage workflow entry with candidate, parent, and house links", () => {
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
        dossierHouseIds={new Set(["h_ext_02"])}
        effectsSummary={() => ({})}
        fmtSigned={(value: number) => (value > 0 ? `+${value}` : `${value}`)}
        getProspectDecision={() => null}
        handleProspectAction={() => undefined}
        hasProspectExpiredThisTurn={false}
        hiddenCount={0}
        hiddenIds={[]}
        houseLabel={(houseId: string | null | undefined) => (houseId === "h_ext_02" ? "House Ashford" : houseId ?? "House Unknown")}
        marriageWorkflowSurface={{
          helperText: "Marriage workflow keeps inbound proposals beside outbound scouting and offer state.",
          schemaVersion: "marriage_workflow_view_v1",
          subjects: [
            {
              helperText: "Inbound and outbound state stay grouped here.",
              inboundOffers: [
                {
                  candidate: {
                    detail: "House Ashford",
                    houseId: "h_ext_02",
                    houseLabel: "House Ashford",
                    personId: "p_suitor_1",
                    title: "Cedric"
                  },
                  effectSummary: "Dowry +3 coin · A +4 · R +6 · T -2",
                  entryId: "inbound:p_child_1:p_suitor_1:0",
                  houseId: "h_ext_02",
                  houseLabel: "House Ashford",
                  offerSummary: "Cedric from House Ashford is waiting for your response.",
                  rejectOutcomeSummary: "Rejecting this proposal leaves the match unresolved and adds slight social friction with House Ashford."
                }
              ],
              inboundSummary: "1 inbound proposal waiting on this subject.",
              latestOfferSummary: "Post-submit state: awaiting reply from Cedric of House Ashford.",
              outboundFeaturedCandidate: {
                detail: "House Ashford",
                houseId: "h_ext_02",
                houseLabel: "House Ashford",
                personId: "p_suitor_1",
                title: "Cedric"
              },
              outboundSendOutcomeSummary: "If you send now: Accepted preview. Outbound marriage offer accepted by House Ashford for Alice.",
              outboundTermSummary: "Editable on player tab: dowry coin, respect delta, allegiance delta, threat delta. Locked on the normal path: liege delta, risk tags.",
              outboundSummary: "1 shown candidate and 0 held out candidates are grouped here for one outbound workflow path.",
              subject: {
                detail: "House Player",
                houseId: "h_player",
                houseLabel: "House Player",
                personId: "p_child_1",
                title: "Alice"
              },
              subjectParents: [
                {
                  detail: "House Player",
                  houseId: "h_player",
                  houseLabel: "House Player",
                  personId: "p_parent_1",
                  title: "Edith"
                },
                {
                  detail: "House Player",
                  houseId: "h_player",
                  houseLabel: "House Player",
                  personId: "p_parent_2",
                  title: "Roland"
                }
              ],
              workflowId: "workflow:p_child_1"
            }
          ]
        }}
        onOpenHouseDossier={() => undefined}
        onOpenPersonCard={() => undefined}
        personNameFromRegistry={(personId: string | null | undefined) =>
          personId === "p_child_1" ? "Alice" : personId === "p_suitor_1" ? "Cedric" : null
        }
        personCardIds={new Set(["p_child_1", "p_suitor_1", "p_parent_1", "p_parent_2"])}
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
        prospectsShown={[]}
        prospectsShownCount={0}
        prospectsTotalCount={0}
        rejectHasStandingRisk={() => false}
        reportTurnIndex={12}
        shownIds={[]}
        uncertaintyLabel={() => null}
      />
    );

    expect(html).toContain('data-marriage-workflow="marriage_workflow_view_v1"');
    expect(html).toContain('data-person-card-open="p_child_1"');
    expect(html).toContain('data-person-card-open="p_parent_1"');
    expect(html).toContain('data-person-card-open="p_suitor_1"');
    expect(html).toContain('data-house-dossier-open="h_ext_02"');
    expect(html).toContain("Rejecting this proposal leaves the match unresolved");
    expect(html).toContain("If you send now: Accepted preview.");
    expect(html).toContain("Terms: Editable on player tab:");
    expect(html).toContain("Post-submit state: awaiting reply from Cedric of House Ashford.");
  });
});
