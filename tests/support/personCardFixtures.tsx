import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildHouseDossierSurface, listHouseDossierIds } from "../../src/ui/houseDossierView";
import { buildPersonCardSurface, type PersonCardRouteOrigin } from "../../src/ui/personCardView";
import { HouseDossierPanel } from "../../src/ui/panels/HouseDossierPanel";
import { HouseholdDetailsPanel } from "../../src/ui/panels/HouseholdDetailsPanel";
import { HouseholdPanel } from "../../src/ui/panels/HouseholdPanel";
import { KnownHousesPanel } from "../../src/ui/panels/KnownHousesPanel";
import { PersonCardPanel } from "../../src/ui/panels/PersonCardPanel";
import { ProspectsPanel } from "../../src/ui/panels/ProspectsPanel";
import { readCourtRosterFromSnapshot } from "../../src/ui/playViewModel";
import { getPlayerHousehold } from "../../src/ui/stateSelectors";

export const PERSON_CARD_DEBUG_KEYS = [
  "schema_version",
  "person_id",
  "person_name",
  "short_id",
  "alive",
  "sex",
  "age",
  "current_house",
  "birth_house",
  "court_member",
  "court_roles",
  "known_house_relevance",
  "married_out",
  "residence_manor_id",
  "selector_contexts",
  "source_kind",
  "source_ref_id",
  "distance",
  "family_person_ids",
  "succession_projection",
  "office_assignments",
  "service_entries",
  "lands_held_projection",
  "relationship_rows"
] as const;

export type PersonCardRouteCase = {
  origin: PersonCardRouteOrigin;
  triggerIds: string[];
};

function extractTriggerIds(html: string): string[] {
  const matches = html.matchAll(/data-person-card-open="([^"]+)"/g);
  return Array.from(new Set(Array.from(matches, (match) => match[1])));
}

function requireSurface(personId: string) {
  const state = createNewRun("person_card_fixture_v035");
  const ctx = proposeTurn(state);
  const surface = buildPersonCardSurface(ctx.preview_state, personId);

  if (!surface) {
    throw new Error(`Expected a person-card surface for ${personId}.`);
  }

  return surface;
}

export function buildPersonCardFixture(): string {
  const anchorSurface = requireSurface("p_head");
  const officeSurface = requireSurface("p_court_steward");

  return `${JSON.stringify(
    {
      overview: {
        person_id: anchorSurface.personId,
        person_name: anchorSurface.personName,
        subtitle: anchorSurface.subtitle,
        overview_cards: anchorSurface.overviewCards.map((card) => ({
          id: card.id,
          label: card.label,
          value: card.value,
          detail: card.detail
        }))
      },
      family: {
        person_id: anchorSurface.personId,
        sections: anchorSurface.familySections.map((section) => ({
          id: section.id,
          title: section.title,
          empty_label: section.emptyLabel,
          count: section.entries.length,
          first_entry: section.entries[0] ?? null
        }))
      },
      offices_service: {
        person_id: officeSurface.personId,
        person_name: officeSurface.personName,
        office_assignments: officeSurface.officeAssignments,
        service_entries: officeSurface.serviceEntries,
        selector_contexts:
          officeSurface.debugRows.find((row) => row.key === "selector_contexts")?.value ?? null
      },
      relationships: {
        person_id: anchorSurface.personId,
        total_count: anchorSurface.relationshipCount,
        first_rows: anchorSurface.relationshipRows.slice(0, 4)
      },
      debug: {
        person_id: anchorSurface.personId,
        schema_version: anchorSurface.schemaVersion,
        debug_keys: anchorSurface.debugRows.map((row) => row.key),
        first_rows: anchorSurface.debugRows.slice(0, 8)
      }
    },
    null,
    2
  )}\n`;
}

export function buildPersonCardRouteCases(): PersonCardRouteCase[] {
  const state = createNewRun("person_card_route_cases_v035");
  const ctx = proposeTurn(state);
  const household = getPlayerHousehold(ctx.preview_state);
  const localLiegeId =
    typeof (ctx.preview_state as any)?.locals?.liege?.id === "string"
      ? (ctx.preview_state as any).locals.liege.id
      : null;

  const householdHtml = renderToStaticMarkup(
    <HouseholdPanel
      anchorId="household"
      copy={{
        childrenLabel: "Children",
        courtSizeLabel: "Court Size",
        heirLabel: "Heir",
        hideHouseholdDetails: "Hide household details",
        household: "Household",
        lastSuccessionLabel: "Last succession",
        lastSuccessionNone: "No succession recorded.",
        logOutcome_succession: (name: string) => `Succession: ${name}`,
        none: "None",
        showHouseholdDetails: "Show household details",
        spouseLabel: "Spouse",
        tooltipCourtSize: "Court size help."
      }}
      courtSize={4}
      onOpenPersonCard={() => undefined}
      onToggleDetails={() => undefined}
      personCardIds={
        new Set(
          [household.head?.id, household.heir_id, household.spouse?.id, localLiegeId].filter(
            (value): value is string => typeof value === "string" && value.length > 0
          )
        )
      }
      previewState={ctx.preview_state}
      showDetails={false}
      state={state}
    />
  );

  const { entries, court_size } = readCourtRosterFromSnapshot(ctx);
  const rosterHtml = renderToStaticMarkup(
    <HouseholdDetailsPanel
      copy={{
        childrenLabel: "Children",
        courtSizeLabel: "Court Size",
        heirLabel: "Heir",
        houseLog: "House log",
        lastSuccessionLabel: "Last succession",
        lastSuccessionNone: "No succession recorded.",
        logOutcome_succession: (name: string) => `Succession: ${name}`,
        noHouseLogYet: "No house log yet.",
        noNewHouseLogThisTurn: "No new house log this turn.",
        none: "None",
        spouseLabel: "Spouse",
        tooltipCourtSize: "Court size help."
      }}
      currentHouseLog={[]}
      courtRosterEntries={entries}
      courtSize={court_size}
      onOpenPersonCard={() => undefined}
      personCardIds={new Set([household.head.id, ...entries.map((entry) => entry.person.id)])}
      previewState={ctx.preview_state}
      state={state}
    />
  );

  const dossierId = listHouseDossierIds(ctx.preview_state).find((houseId) => {
    return (buildHouseDossierSurface(ctx.preview_state, houseId)?.relatedPeople.length ?? 0) > 0;
  });
  if (!dossierId) {
    throw new Error("Expected a dossier surface with related people.");
  }

  const dossierSurface = buildHouseDossierSurface(ctx.preview_state, dossierId);
  if (!dossierSurface) {
    throw new Error(`Expected a dossier surface for ${dossierId}.`);
  }

  const dossierHtml = renderToStaticMarkup(
    <HouseDossierPanel initialTab="player" onOpenPersonCard={() => undefined} surface={dossierSurface} />
  );

  const personCardSurface = requireSurface("p_head");
  const personCardHtml =
    renderToStaticMarkup(
      <PersonCardPanel initialTab="family" onOpenPersonCard={() => undefined} surface={personCardSurface} />
    ) +
    renderToStaticMarkup(
      <PersonCardPanel initialTab="relationships" onOpenPersonCard={() => undefined} surface={personCardSurface} />
    );

  const prospectsHtml = renderToStaticMarkup(
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
        prospectsShownHiddenSummary: (shown: number, total: number, hidden: number) =>
          `${shown}/${total}/${hidden}`
      }}
      costsForProspect={() => ({ bushels: 0, coin: 0, energy: 0 })}
      effectsSummary={() => ({})}
      fmtSigned={(value: number) => (value > 0 ? `+${value}` : `${value}`)}
      getProspectDecision={() => null}
      handleProspectAction={() => undefined}
      hasProspectExpiredThisTurn={false}
      hiddenCount={0}
      hiddenIds={[]}
      houseLabel={(houseId: string | null | undefined) =>
        houseId === "h_ext_02" ? "House Ashford" : houseId ?? "House Unknown"
      }
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

  const knownHousesHtml = renderToStaticMarkup(
    <KnownHousesPanel
      copy={{
        headLabel: "Head:",
        heirIndicator_hasMaleHeir: "Has male heir",
        heirIndicator_heiressPossible: "Heiress possible",
        heirIndicator_noMaleHeir: "No male heir",
        hideDetails: "Hide details",
        housePrefix: (houseName: string) => `House ${houseName}`,
        knownHouses: "Known Houses",
        knownHousesEmpty: "No houses.",
        showDetails: "Show details",
        tierLabel: "Tier:",
        tooltipAllegiance: "Allegiance help.",
        tooltipHeirIndicator: "Heir help.",
        tooltipRespect: "Respect help.",
        tooltipThreat: "Threat help.",
        tooltipTier: "Tier help."
      }}
      dossierHouseIds={new Set(["h_ext_01"])}
      hasMoreKnownHouses={false}
      knownHouses={[
        { head_id: "p_ext_01_head", head_name: "Aveline", house_id: "h_ext_01", house_name: "Falkmere", tier: "Count" },
        { head_id: "p_ext_02_head", head_name: "Roland", house_id: "h_ext_02", house_name: "Ashford", tier: "Baron" }
      ]}
      knownHousesMain={[
        { head_id: "p_ext_01_head", head_name: "Aveline", house_id: "h_ext_01", house_name: "Falkmere", tier: "Count" },
        { head_id: "p_ext_02_head", head_name: "Roland", house_id: "h_ext_02", house_name: "Ashford", tier: "Baron" }
      ]}
      onOpenHouseDossier={() => undefined}
      onOpenPersonCard={() => undefined}
      onToggleShowAll={() => undefined}
      personCardIds={new Set(["p_ext_01_head"])}
      showAllKnownHouses={false}
    />
  );

  return [
    { origin: "household", triggerIds: extractTriggerIds(householdHtml) },
    { origin: "roster", triggerIds: extractTriggerIds(rosterHtml) },
    { origin: "prospects", triggerIds: extractTriggerIds(prospectsHtml) },
    { origin: "known_houses", triggerIds: extractTriggerIds(knownHousesHtml) },
    { origin: "house_dossier", triggerIds: extractTriggerIds(dossierHtml) },
    { origin: "person_card", triggerIds: extractTriggerIds(personCardHtml) }
  ];
}
