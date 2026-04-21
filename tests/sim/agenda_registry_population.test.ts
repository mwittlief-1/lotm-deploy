import { describe, expect, it } from "vitest"

import { createNewRun } from "../../src/sim"
import {
  buildCourtAgendaRegistryFromState,
  ensureCourtAgendaRegistry,
  selectCourtAgendaItems
} from "../../src/sim/domains/court/agendaRegistry"
import { buildCourtDelegationRegistry } from "../../src/sim/domains/court/delegationRegistry"
import {
  appointCourtOfficeHolder,
  createHouseCourtOfficeRegistry,
  createRealmCourtOfficeRegistry,
  createCourtServiceRecordRegistry,
  buildCourtOfficeRegistry
} from "../../src/sim/domains/court/officeRegistry"
import { recordEconomyPortfolioPhaseHints } from "../../src/sim/domains/economy/portfolioAnalysis"
import { buildBoundedWorldTopologyView } from "../../src/sim/domains/world"
import type { ProspectsWindow, RunState } from "../../src/sim/types"

function buildProspectsWindow(turnIndex: number): ProspectsWindow {
  return {
    schema_version: "prospects_window_v1",
    turn_index: turnIndex,
    shown_ids: [
      "prospect_grant_expiring",
      "prospect_marriage_open",
      "prospect_claim_open"
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
        expires_turn: turnIndex + 1,
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
        expires_turn: turnIndex + 3,
        actions: ["accept", "reject"]
      },
      {
        id: "prospect_claim_open",
        type: "inheritance_claim",
        from_house_id: "h_player",
        to_house_id: "h_player",
        subject_person_id: "p_head",
        spouse_person_id: null,
        summary: "Inheritance claim",
        requirements: [],
        costs: {},
        predicted_effects: { coin_delta: null, relationship_deltas: [], flags_set: [] },
        uncertainty: "possible",
        expires_turn: turnIndex + 2,
        actions: ["accept", "reject"]
      }
    ]
  }
}

function buildAgendaState(): { state: RunState; prospectsWindow: ProspectsWindow } {
  const state = createNewRun("agenda_registry_population_v033")
  state.turn_index = 4
  state.manor.obligations.tax_due_coin = 6
  state.manor.obligations.tithe_due_bushels = 4
  state.manor.obligations.arrears.coin = 13
  state.manor.obligations.arrears.bushels = 0

  recordEconomyPortfolioPhaseHints(state, {
    consumption_shortage_bushels: 9
  })

  const houseRegistry = createHouseCourtOfficeRegistry("house:h_player")
  const realmRegistry = createRealmCourtOfficeRegistry("actor:earl", [
    {
      seat_key: "chancellor",
      holder_person_id: "p_realm_holder",
      holder_house_id: "h_realm",
      holder_kind: "realm_holder",
      filled_turn_index: 4,
      last_transition_turn_index: 4
    }
  ])

  ;(state.house as any).court_office_registry = buildCourtOfficeRegistry([
    ...houseRegistry.seat_ids.map((seatId) => houseRegistry.seats_by_id[seatId]),
    ...realmRegistry.seat_ids.map((seatId) => realmRegistry.seats_by_id[seatId])
  ])

  ;(state.house as any).court_delegation_registry = buildCourtDelegationRegistry([
    { action: "marriage_scout", delegated: true }
  ])

  const serviceStart = appointCourtOfficeHolder(
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
  )
  ;(state.house as any).court_office_registry = serviceStart.registry
  ;(state.house as any).court_service_record_registry = serviceStart.service_record_registry

  const retainerSeatFill = appointCourtOfficeHolder(
    serviceStart.registry,
    serviceStart.service_record_registry,
    {
      seat_id: "house:house:h_player:marshal",
      holder_person_id: "p_retainer",
      holder_house_id: "h_player",
      holder_kind: "non_family_retainer",
      payment_basis: "retainer_upkeep",
      transition_turn_index: 4,
      serve_at_actor_id: "house:h_player"
    }
  )
  ;(state.house as any).court_office_registry = retainerSeatFill.registry
  ;(state.house as any).court_service_record_registry = retainerSeatFill.service_record_registry

  const prospectsWindow = buildProspectsWindow(state.turn_index)
  return { state, prospectsWindow }
}

describe("court agenda registry population", () => {
  it("populates deterministic agenda items from obligations, prospects, offices, and portfolio outliers", () => {
    const { state, prospectsWindow } = buildAgendaState()
    const anchorManorId = buildBoundedWorldTopologyView().anchor_manor_id

    const registry = buildCourtAgendaRegistryFromState(state, { prospects_window: prospectsWindow })

    expect(registry.item_ids).toEqual([
      "agenda_obligations_enforcement_liege",
      "agenda_offices_required_vacancy_house:house:h_player:steward",
      "agenda_prospects_expiring_prospect_grant_expiring",
      `agenda_portfolio_outlier_outlier_highest_arrears_coin_${anchorManorId}`,
      "agenda_offices_realm_transition_realm:actor:earl:chancellor",
      "agenda_obligations_due_church",
      "agenda_prospects_marriage_prospect_marriage_open",
      "agenda_offices_delegated_action_marriage_scout",
      "agenda_offices_active_service_house:house:h_player:marshal:p_retainer:4"
    ])

    expect(registry.items_by_id["agenda_obligations_enforcement_liege"]).toMatchObject({
      source_key: "obligations.enforcement",
      subject_ref_id: "p_head"
    })
    expect(registry.items_by_id["agenda_obligations_due_church"]).toMatchObject({
      source_key: "obligations.current_due",
      subject_ref_id: "p_clergy"
    })
    expect(registry.item_ids).not.toContain("agenda_obligations_arrears_liege")
    expect(registry.item_ids).not.toContain("agenda_prospects_grant_prospect_grant_expiring")
    expect(registry.item_ids.filter((itemId) => registry.items_by_id[itemId].source_tag === "portfolio_outliers")).toHaveLength(1)
  })

  it("attaches the populated agenda registry onto the live state", () => {
    const { state, prospectsWindow } = buildAgendaState()

    const registry = ensureCourtAgendaRegistry(state, { prospects_window: prospectsWindow })

    expect((state as any).court_agenda_registry).toBe(registry)
    expect((state.house as any).court_agenda_registry).toBe(registry)
  })

  it("selects a deterministic truncated agenda window", () => {
    const { state, prospectsWindow } = buildAgendaState()
    const anchorManorId = buildBoundedWorldTopologyView().anchor_manor_id

    const registry = buildCourtAgendaRegistryFromState(state, { prospects_window: prospectsWindow })
    const selected = selectCourtAgendaItems(registry, 5)

    expect(selected.map((item) => item.agenda_item_id)).toEqual([
      "agenda_obligations_enforcement_liege",
      "agenda_offices_required_vacancy_house:house:h_player:steward",
      "agenda_prospects_expiring_prospect_grant_expiring",
      `agenda_portfolio_outlier_outlier_highest_arrears_coin_${anchorManorId}`,
      "agenda_offices_realm_transition_realm:actor:earl:chancellor"
    ])
  })
})
