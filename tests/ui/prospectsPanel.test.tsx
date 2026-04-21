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
    expect(html).toContain("Age 21 · House Ashford");
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
        marriageWorkflowActionStatus={{
          "marriage_workflow:outbound_offer:workflow:p_child_1": "queued"
        }}
        onMarriageWorkflowAcceptInbound={() => undefined}
        onMarriageWorkflowClearScout={() => undefined}
        onMarriageWorkflowConstructOffer={() => undefined}
        onMarriageWorkflowQueueOffer={() => undefined}
        onMarriageWorkflowRejectInbound={() => undefined}
        onMarriageWorkflowScout={() => undefined}
        marriageWorkflowSurface={{
          helperText: "Marriage workflow keeps inbound proposals beside outbound scouting and offer state.",
          schemaVersion: "marriage_workflow_view_v1",
          subjects: [
            {
              helperText: "Inbound and outbound state stay grouped here.",
              inboundOffers: [
                {
                  candidate: {
                    detail: "Age 21 · House Ashford · Resides Hx 7",
                    houseDetail: "Baron · Head Giles Ashford · Anchor Hx 7",
                    houseId: "h_ext_02",
                    houseLabel: "House Ashford",
                    personId: "p_suitor_1",
                    title: "Cedric"
                  },
                  acceptOutcomeSummary: "Accepting queues this proposal for resolution with House Ashford.",
                  effectSummary: "Dowry +3 coin · A +4 · R +6 · T -2",
                  entryId: "inbound:p_child_1:p_suitor_1:0",
                  houseId: "h_ext_02",
                  houseLabel: "House Ashford",
                  offerIndex: 0,
                  offerSummary: "Cedric from House Ashford is waiting for your response.",
                  rejectOutcomeSummary: "Rejecting this proposal leaves the match unresolved and adds slight social friction with House Ashford."
                }
              ],
              inboundSummary: "1 inbound proposal waiting on this subject.",
              latestOfferSummary: "Last outbound offer: Pending with Cedric of House Ashford.",
              latestOfferStatus: "sent",
              outboundFeaturedCandidate: {
                detail: "House Ashford",
                houseDetail: "Baron · Head Giles Ashford · Anchor Hx 7",
                houseId: "h_ext_02",
                houseLabel: "House Ashford",
                personId: "p_suitor_1",
                title: "Cedric"
              },
              outboundSendOutcomeSummary: "If you send now: Accepted preview. Outbound marriage offer accepted by House Ashford for Alice.",
              outboundSummary: "1 shown candidate and 0 held out candidates are grouped here for one outbound workflow path.",
              subject: {
                detail: "Age 18 · House Player · Resides Hx 1",
                houseDetail: "Count · Head Roland Player · Anchor Hx 1",
                houseId: "h_player",
                houseLabel: "House Player",
                personId: "p_child_1",
                title: "Alice"
              },
              subjectParents: [
                {
                  detail: "Age 43 · House Player · Resides Hx 1",
                  houseDetail: "Count · Head Roland Player · Anchor Hx 1",
                  houseId: "h_player",
                  houseLabel: "House Player",
                  personId: "p_parent_1",
                  title: "Edith"
                },
                {
                  detail: "Age 46 · House Player · Resides Hx 1",
                  houseDetail: "Count · Head Roland Player · Anchor Hx 1",
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
    expect(html).toContain("Age 18 · House Player · Resides Hx 1");
    expect(html).toContain("Age 21 · House Ashford · Resides Hx 7");
    expect(html).toContain("Baron · Head Giles Ashford · Anchor Hx 7");
    expect(html).toContain("Accept proposal");
    expect(html).toContain("Reject proposal");
    expect(html).toContain("Scout/search candidates");
    expect(html).toContain("Outbound offer construction");
    expect(html).toContain("Construct outbound offer");
    expect(html).toContain("Queue outbound offer");
    expect(html).toContain("Build the offer here, then queue it for the Social lane contract.");
    expect(html).toContain("Dowry coin");
    expect(html).toContain("Respect delta");
    expect(html).toContain("Settlement asset terms remain locked until Social owns the canonical offer payload.");
    expect(html).toContain("Rejecting this proposal leaves the match unresolved");
    expect(html).toContain("Search status:");
    expect(html).toContain("Offer status:");
    expect(html).toContain("Queued in this workflow UI; the final simulation send waits for the Social lane contract.");
    expect(html).toContain("If you send now: Accepted preview.");
  });

  it("demotes legacy marriage prospect cards when the unified workflow is present", () => {
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
        houseLabel={(houseId: string | null | undefined) => houseId ?? "House Unknown"}
        marriageWorkflowSurface={{
          helperText: "Marriage workflow owns player-facing marriage decisions.",
          schemaVersion: "marriage_workflow_view_v1",
          subjects: [
            {
              helperText: "Workflow helper.",
              inboundOffers: [],
              inboundSummary: "No inbound proposal is active for this subject.",
              latestOfferSummary: null,
              latestOfferStatus: null,
              outboundFeaturedCandidate: null,
              outboundSendOutcomeSummary: null,
              outboundSummary: "Outbound scouting has not surfaced for this subject yet.",
              subject: {
                detail: "Age 18 · House Player",
                houseDetail: null,
                houseId: "h_player",
                houseLabel: "House Player",
                personId: "p_child_1",
                title: "Alice"
              },
              subjectParents: [],
              workflowId: "workflow:p_child_1"
            }
          ]
        }}
        personNameFromRegistry={(personId: string | null | undefined) => (personId === "p_grant_subject" ? "Cecily" : null)}
        pfHouseLabelById={new Map()}
        pfParentsByChild={new Map()}
        pfPeopleRec={{}}
        pfPersonHouseById={new Map()}
        previewState={{ people: {} } as any}
        prospectLogLines={[]}
        prospectTypeLabel={(type: string | null | undefined) => (type === "grant" ? "Grant" : "Marriage")}
        prospectsShown={[
          {
            actions: ["accept", "reject"],
            from_house_id: "h_ext_02",
            id: "legacy_marriage_1",
            spouse_name: "Cedric",
            summary: "Legacy marriage proposal should not render.",
            subject_person_id: "p_child_1",
            type: "marriage"
          },
          {
            actions: ["accept", "reject"],
            from_house_id: "h_grant",
            id: "grant_1",
            summary: "A grant offer remains visible.",
            subject_person_id: "p_grant_subject",
            type: "grant"
          }
        ]}
        prospectsShownCount={2}
        prospectsTotalCount={2}
        rejectHasStandingRisk={() => false}
        reportTurnIndex={12}
        shownIds={["legacy_marriage_1", "grant_1"]}
        uncertaintyLabel={() => null}
      />
    );

    expect(html).toContain('data-marriage-legacy-demoted="true"');
    expect(html).toContain("Legacy marriage proposal cards are retired here.");
    expect(html).not.toContain("Legacy marriage proposal should not render.");
    expect(html).toContain("A grant offer remains visible.");
  });

  it("reuses the same secondary identifiers when a nearby marriage prospect repeats a familiar name", () => {
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
          prospectExpiresEndOfTurn: (turnIndex: number) => `Expires at end of Turn ${turnIndex}.`,
          prospectExpiresThisTurn: "Expires this turn.",
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
        houseLabel={(houseId: string | null | undefined) => (houseId === "h_ext_19" ? "Glenholt" : houseId ?? "House Unknown")}
        onOpenPersonCard={() => undefined}
        personNameFromRegistry={(personId: string | null | undefined) =>
          personId === "p_subject_cedric" ? "Cedric Hartwyck" : personId === "p_suitor_cedric" ? "Cedric Hartwyck" : null
        }
        personCardIds={new Set(["p_subject_cedric", "p_suitor_cedric"])}
        pfHouseLabelById={new Map()}
        pfParentsByChild={new Map()}
        pfPeopleRec={{}}
        pfPersonHouseById={new Map()}
        previewState={{
          known_houses: [
            {
              has_male_heir: true,
              head_age: 47,
              head_id: "p_head_glenholt",
              head_name: "Giles Glenholt",
              head_short_id: null,
              head_status: "Alive",
              heiress_possible: false,
              heir_indicator: "has_male_heir",
              house_id: "h_ext_19",
              house_name: "Glenholt",
              relationship: null,
              relevance_reasons: ["nearby_house"],
              relevance_tier: "tier1",
              tier: "Knight"
            }
          ],
          person_card_registry: {
            entries_by_person_id: {
              p_subject_cedric: {
                age: 18,
                alive: true,
                birth_house_id: "h_player",
                birth_house_name: "Player",
                court_member: false,
                court_role_labels: [],
                current_house_id: "h_player",
                current_house_name: "Player",
                family_projection: {
                  children: [],
                  family_person_ids: [],
                  kinship_tags: [],
                  married_out: false,
                  parents: [],
                  siblings: [],
                  spouse: null
                },
                known_house_relevance_reasons: [],
                known_house_relevance_tier: null,
                lands_held_projection: {
                  anchor_manor_id: null,
                  holdings_band: "single_holding",
                  holdings_count: 0,
                  house_holdings_status: "coarse_house_only",
                  house_id: "h_player",
                  house_name: "Player",
                  known_manor_ids: [],
                  personal_holdings_status: "not_exposed_on_this_seam"
                },
                married_out: false,
                office_assignments: [],
                person_id: "p_subject_cedric",
                person_name: "Cedric Hartwyck",
                residence_binding: {
                  distance_band: "near",
                  residence_manor_id: "hx_1",
                  route_hop_distance: 1,
                  selector_contexts: ["known_house"],
                  source_kind: "known_house",
                  source_ref_id: "ref:p_subject_cedric",
                  travel_cost_distance: 1
                },
                schema_version: "person_card_view_v1",
                service_timeline: {
                  active_record_ids: [],
                  entries: []
                },
                short_id: null,
                sex: "M",
                succession_projection: {
                  adult_eligible: true,
                  adult_line_position: null,
                  adult_successor_id: null,
                  blocked_by_current_heir: null,
                  claim_window_open: false,
                  claimant_adult_position: null,
                  claimant_position: null,
                  current_heir: false,
                  current_heir_id: null,
                  line_position: null,
                  player_house_relevance_reasons: []
                }
              },
              p_suitor_cedric: {
                age: 21,
                alive: true,
                birth_house_id: "h_ext_19",
                birth_house_name: "Glenholt",
                court_member: false,
                court_role_labels: [],
                current_house_id: "h_ext_19",
                current_house_name: "Glenholt",
                family_projection: {
                  children: [],
                  family_person_ids: [],
                  kinship_tags: [],
                  married_out: false,
                  parents: [],
                  siblings: [],
                  spouse: null
                },
                known_house_relevance_reasons: [],
                known_house_relevance_tier: null,
                lands_held_projection: {
                  anchor_manor_id: null,
                  holdings_band: "single_holding",
                  holdings_count: 0,
                  house_holdings_status: "coarse_house_only",
                  house_id: "h_ext_19",
                  house_name: "Glenholt",
                  known_manor_ids: [],
                  personal_holdings_status: "not_exposed_on_this_seam"
                },
                married_out: false,
                office_assignments: [],
                person_id: "p_suitor_cedric",
                person_name: "Cedric Hartwyck",
                residence_binding: {
                  distance_band: "near",
                  residence_manor_id: "hx_19",
                  route_hop_distance: 1,
                  selector_contexts: ["known_house"],
                  source_kind: "known_house",
                  source_ref_id: "ref:p_suitor_cedric",
                  travel_cost_distance: 1
                },
                schema_version: "person_card_view_v1",
                service_timeline: {
                  active_record_ids: [],
                  entries: []
                },
                short_id: null,
                sex: "M",
                succession_projection: {
                  adult_eligible: true,
                  adult_line_position: null,
                  adult_successor_id: null,
                  blocked_by_current_heir: null,
                  claim_window_open: false,
                  claimant_adult_position: null,
                  claimant_position: null,
                  current_heir: false,
                  current_heir_id: null,
                  line_position: null,
                  player_house_relevance_reasons: []
                }
              }
            },
            person_ids: ["p_subject_cedric", "p_suitor_cedric"],
            schema_version: "person_card_registry_v1"
          }
        } as any}
        prospectLogLines={[]}
        prospectTypeLabel={() => "Marriage"}
        prospectsShown={[
          {
            actions: ["accept", "reject"],
            expires_turn: 14,
            from_house_id: "h_ext_19",
            id: "marriage_repeat_1",
            spouse_age: 21,
            spouse_person_id: "p_suitor_cedric",
            summary: "Another Cedric Hartwyck has arrived from a nearby Glenholt branch.",
            subject_person_id: "p_subject_cedric",
            type: "marriage"
          }
        ]}
        prospectsShownCount={1}
        prospectsTotalCount={1}
        rejectHasStandingRisk={() => false}
        reportTurnIndex={12}
        shownIds={["marriage_repeat_1"]}
        uncertaintyLabel={() => null}
      />
    );

    expect(html).toContain("Age 18 · House Player · Resides Hx 1");
    expect(html).toContain("Age 21 · House Glenholt · Resides Hx 19");
    expect(html).toContain("Knight · Head Giles Glenholt");
  });
});
