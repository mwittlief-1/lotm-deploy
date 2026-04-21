import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { buildCouncilAgendaItems, PLAY_ANCHORS } from "../../src/ui/playScreenModel";
import { buildCourtDelegationRegistry } from "../../src/sim/domains/court/delegationRegistry";
import {
  appointCourtOfficeHolder,
  createCourtServiceRecordRegistry,
  createHouseCourtOfficeRegistry,
  createRealmCourtOfficeRegistry,
  buildCourtOfficeRegistry
} from "../../src/sim/domains/court/officeRegistry";
import { recordEconomyPortfolioPhaseHints } from "../../src/sim/domains/economy/portfolioAnalysis";
import { buildBoundedWorldTopologyView } from "../../src/sim/domains/world";

function applyOfficeAgendaFixtures(state: any) {
  state.people = {
    ...(state.people ?? {}),
    p_realm_holder: {
      ...state.house.head,
      id: "p_realm_holder",
      name: "Lady Westmarch",
      house_id: "h_realm",
      residence_house_id: "h_realm",
      married: true
    },
    p_retainer: {
      ...state.house.head,
      id: "p_retainer",
      name: "Sir Aldwyn",
      house_id: state.player_house_id ?? "h_player",
      residence_house_id: state.player_house_id ?? "h_player",
      married: false
    }
  };
  state.houses = {
    ...(state.houses ?? {}),
    h_realm: {
      id: "h_realm",
      house_name: "House Westmarch",
      head_id: "p_realm_holder",
      spouse_id: null,
      child_ids: [],
      member_person_ids: ["p_realm_holder"]
    }
  };

  const houseRegistry = createHouseCourtOfficeRegistry("house:h_player");
  const realmRegistry = createRealmCourtOfficeRegistry("actor:earl", [
    {
      seat_key: "chancellor",
      holder_person_id: "p_realm_holder",
      holder_house_id: "h_realm",
      holder_kind: "realm_holder",
      filled_turn_index: 4,
      last_transition_turn_index: 4
    }
  ]);

  (state.house as any).court_office_registry = buildCourtOfficeRegistry([
    ...houseRegistry.seat_ids.map((seatId) => houseRegistry.seats_by_id[seatId]),
    ...realmRegistry.seat_ids.map((seatId) => realmRegistry.seats_by_id[seatId])
  ]);
  (state.house as any).court_delegation_registry = buildCourtDelegationRegistry([
    { action: "marriage_scout", delegated: true }
  ]);

  const realmFill = appointCourtOfficeHolder(
    (state.house as any).court_office_registry,
    createCourtServiceRecordRegistry(),
    {
      seat_id: "realm:actor:earl:chancellor",
      holder_person_id: "p_realm_holder",
      holder_house_id: "h_realm",
      holder_kind: "realm_holder",
      payment_basis: "realm_stipend",
      transition_turn_index: 4,
      serve_at_actor_id: "actor:earl"
    }
  );
  (state.house as any).court_office_registry = realmFill.registry;
  (state.house as any).court_service_record_registry = realmFill.service_record_registry;

  const retainerFill = appointCourtOfficeHolder(realmFill.registry, realmFill.service_record_registry, {
    seat_id: "house:house:h_player:marshal",
    holder_person_id: "p_retainer",
    holder_house_id: "h_player",
    holder_kind: "non_family_retainer",
    payment_basis: "retainer_upkeep",
    transition_turn_index: 4,
    serve_at_actor_id: "house:h_player"
  });
  (state.house as any).court_office_registry = retainerFill.registry;
  (state.house as any).court_service_record_registry = retainerFill.service_record_registry;
}

function buildAgendaPreviewState() {
  const state = createNewRun("play_screen_agenda_v033");
  state.turn_index = 4;
  state.manor.obligations.tax_due_coin = 6;
  state.manor.obligations.tithe_due_bushels = 4;
  state.manor.obligations.arrears.coin = 13;
  state.manor.obligations.arrears.bushels = 0;

  recordEconomyPortfolioPhaseHints(state, {
    consumption_shortage_bushels: 9
  });

  applyOfficeAgendaFixtures(state);

  return state;
}

function buildOfficeOnlyAgendaPreviewState() {
  const state = createNewRun("play_screen_agenda_office_truth_v033");
  state.turn_index = 4;
  applyOfficeAgendaFixtures(state);
  return state;
}

function buildLegacyStewardOfficeAgendaPreviewState() {
  const state = createNewRun("play_screen_agenda_legacy_steward_truth_v036");
  const playerHouseId = state.player_house_id ?? "h_player";
  state.turn_index = 4;
  state.people = {
    ...(state.people ?? {}),
    p_legacy_steward: {
      ...state.house.head,
      id: "p_legacy_steward",
      name: "Sir Living Steward",
      house_id: playerHouseId,
      residence_house_id: playerHouseId,
      married: false,
      alive: true
    }
  };
  state.houses = {
    ...(state.houses ?? {}),
    [playerHouseId]: {
      ...((state.houses as any)?.[playerHouseId] ?? { id: playerHouseId }),
      court_officers: {
        steward: "p_legacy_steward"
      }
    }
  };
  return state;
}

describe("play screen court agenda", () => {
  it("renders registry-backed court agenda stubs instead of the legacy mixed shortlist", () => {
    const previewState = buildAgendaPreviewState();
    const anchorManorId = buildBoundedWorldTopologyView().anchor_manor_id;

    const items = buildCouncilAgendaItems({
      anchors: PLAY_ANCHORS,
      copy: {
        agenda_obligations_title: "Obligations are pressing",
        agenda_prospect_title: "Opportunity expires soon",
        agenda_prospect_context: (turnIndex: number) => `A prospect expires end of Turn ${turnIndex}.`,
        cta_reviewObligations: "Review obligations",
        cta_viewProspects: "View prospects",
        cta_viewHousehold: "View household",
        cta_viewPortfolio: "View portfolio",
        cta_openDetails: "Open details"
      },
      previewState,
      report: {
        turn_index: previewState.turn_index,
        shortage_bushels: 99,
        prospects_window: {
          schema_version: "prospects_window_v1",
          turn_index: previewState.turn_index,
          shown_ids: [
            "prospect_grant_expiring",
            "prospect_marriage_open"
          ],
          hidden_ids: [],
          overflow_count: 0,
          prospects: [
            {
              id: "prospect_grant_expiring",
              type: "grant",
              from_house_id: "h_liege",
              to_house_id: "h_player",
              subject_person_id: "p_head",
              spouse_person_id: null,
              summary: "Grant offer",
              requirements: [],
              costs: {},
              predicted_effects: { coin_delta: 5, relationship_deltas: [], flags_set: [] },
              uncertainty: "likely",
              expires_turn: previewState.turn_index + 1,
              actions: ["accept", "reject"]
            },
            {
              id: "prospect_marriage_open",
              type: "marriage",
              from_house_id: "h_ext_01",
              to_house_id: "h_player",
              subject_person_id: "p_head",
              spouse_person_id: "p_ext_01_child1",
              summary: "Marriage proposal",
              requirements: [],
              costs: {},
              predicted_effects: { coin_delta: 0, relationship_deltas: [], flags_set: [] },
              uncertainty: "known",
              expires_turn: previewState.turn_index + 3,
              actions: ["accept", "reject"]
            }
          ]
        }
      }
    });

    expect(items.map((item) => item.id)).toEqual([
      "agenda_obligations_enforcement_liege",
      "agenda_prospects_expiring_prospect_grant_expiring",
      `agenda_portfolio_outlier_outlier_highest_arrears_coin_${anchorManorId}`,
      "agenda_offices_realm_transition_realm:actor:earl:chancellor",
      "agenda_obligations_due_church"
    ]);
    expect(items.map((item) => item.id)).not.toContain("agenda_offices_required_vacancy_house:house:h_player:steward");
    expect(items[0]).toMatchObject({
      title: "Penalty pressure is active",
      anchor: PLAY_ANCHORS.obligations
    });
    expect(items[2]).toMatchObject({
      title: "A portfolio outlier needs attention",
      anchor: PLAY_ANCHORS.portfolio,
      cta_label: "View portfolio"
    });
    expect(items.flatMap((item) => item.notes).length).toBeGreaterThan(0);
    expect(items.map((item) => item.id)).not.toContain("agenda_food_shortage");
    expect(items.map((item) => item.id)).not.toContain("agenda_labor_oversubscribed");
  });

  it("keeps office vacancy and transition prompts anchored to the household surface", () => {
    const previewState = buildAgendaPreviewState();

    const items = buildCouncilAgendaItems({
      anchors: PLAY_ANCHORS,
      copy: {
        agenda_obligations_title: "Obligations are pressing",
        agenda_prospect_title: "Opportunity expires soon",
        agenda_prospect_context: (turnIndex: number) => `A prospect expires end of Turn ${turnIndex}.`,
        cta_reviewObligations: "Review obligations",
        cta_viewProspects: "View prospects",
        cta_viewHousehold: "View household",
        cta_viewPortfolio: "View portfolio",
        cta_openDetails: "Open details"
      },
      previewState,
      report: {
        turn_index: previewState.turn_index,
        shortage_bushels: 0,
        prospects_window: null
      }
    });

    const householdItems = items.filter((item) => item.anchor === PLAY_ANCHORS.household);

    expect(householdItems.map((item) => item.id)).toEqual([
      "agenda_offices_realm_transition_realm:actor:earl:chancellor",
      "agenda_offices_delegated_action_marriage_scout"
    ]);
    expect(items.map((item) => item.id)).not.toContain("agenda_offices_required_vacancy_house:house:h_player:steward");
    expect(householdItems.every((item) => item.cta_label === "View household")).toBe(true);
  });

  it("reuses household and provisioning truth in active-service agenda notes", () => {
    const previewState = buildOfficeOnlyAgendaPreviewState();

    const items = buildCouncilAgendaItems({
      anchors: PLAY_ANCHORS,
      copy: {
        agenda_obligations_title: "Obligations are pressing",
        agenda_prospect_title: "Opportunity expires soon",
        agenda_prospect_context: (turnIndex: number) => `A prospect expires end of Turn ${turnIndex}.`,
        cta_reviewObligations: "Review obligations",
        cta_viewProspects: "View prospects",
        cta_viewHousehold: "View household",
        cta_viewPortfolio: "View portfolio",
        cta_openDetails: "Open details"
      },
      previewState,
      report: {
        turn_index: previewState.turn_index,
        shortage_bushels: 0,
        prospects_window: null
      }
    });

    const activeServiceItem = items.find((item) => item.id.startsWith("agenda_offices_active_service_"));

    expect(activeServiceItem).toBeTruthy();
    expect(activeServiceItem?.notes).toEqual(
      expect.arrayContaining([
        "Household path: Retainer — Sir Aldwyn serves the court as Marshal and stays on the household path through active service.",
        "Provisioning: Retainer / Court Quarters."
      ])
    );
  });

  it("does not warn that Steward is vacant when a living legacy steward hydrates office truth", () => {
    const previewState = buildLegacyStewardOfficeAgendaPreviewState();

    const items = buildCouncilAgendaItems({
      anchors: PLAY_ANCHORS,
      copy: {
        agenda_obligations_title: "Obligations are pressing",
        agenda_prospect_title: "Opportunity expires soon",
        agenda_prospect_context: (turnIndex: number) => `A prospect expires end of Turn ${turnIndex}.`,
        cta_reviewObligations: "Review obligations",
        cta_viewProspects: "View prospects",
        cta_viewHousehold: "View household",
        cta_viewPortfolio: "View portfolio",
        cta_openDetails: "Open details"
      },
      previewState,
      report: {
        turn_index: previewState.turn_index,
        shortage_bushels: 0,
        prospects_window: null
      }
    });

    const itemIds = items.map((item) => item.id);

    expect(itemIds).not.toContain("agenda_offices_required_vacancy_house:house:h_player:steward");
    expect(itemIds).toContain("agenda_offices_active_service_house:house:h_player:steward:p_legacy_steward:4");
    expect(
      items.find((item) => item.id === "agenda_offices_active_service_house:house:h_player:steward:p_legacy_steward:4")
        ?.context
    ).toContain("serves as Steward.");
  });
});
