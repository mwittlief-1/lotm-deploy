import { describe, expect, it } from "vitest"

import {
  resolveOutboundMarriageOffer,
  type MarriageOffer
} from "../../src/sim/domains/people/marriage"
import { deepCopy } from "../../src/sim/util"
import {
  buildOutboundMarriageFixtureCases,
  OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER,
  type OutboundMarriageFixtureCase
} from "../support/outboundMarriageFixtures"

function offerFromFixture(fixtureCase: OutboundMarriageFixtureCase, useAcceptedDraft: boolean): MarriageOffer {
  const draft = useAcceptedDraft
    ? fixtureCase.acceptedDraft
    : {
        ...fixtureCase.acceptedDraft,
        dowryCoinDelta: 0,
        relationshipRespect: 0,
        relationshipAllegiance: 0,
        relationshipThreat: 0,
        riskTagsText: ""
      }
  const selectedCandidateId = draft.selectedCandidateId
  if (!selectedCandidateId) {
    throw new Error(`Missing selected candidate for ${fixtureCase.scenarioId}.`)
  }

  const selectedRow = fixtureCase.surface.candidateRows.find((row) => row.candidatePersonId === selectedCandidateId)
  if (!selectedRow) {
    throw new Error(`Missing selected row for ${fixtureCase.scenarioId}.`)
  }

  return {
    house_person_id: selectedCandidateId,
    house_label: selectedRow.candidateHouseLabel,
    dowry_coin_net: draft.dowryCoinDelta,
    relationship_delta: {
      respect: draft.relationshipRespect,
      allegiance: draft.relationshipAllegiance,
      threat: draft.relationshipThreat
    },
    liege_delta: draft.includeLiegeDelta
      ? {
          respect: draft.liegeRespect,
          threat: draft.liegeThreat
        }
      : null,
    risk_tags: draft.riskTagsText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  }
}

function compactResult(fixtureCase: OutboundMarriageFixtureCase, useAcceptedDraft: boolean) {
  const draft = useAcceptedDraft
    ? fixtureCase.acceptedDraft
    : {
        ...fixtureCase.acceptedDraft,
        dowryCoinDelta: 0,
        relationshipRespect: 0,
        relationshipAllegiance: 0,
        relationshipThreat: 0,
        riskTagsText: ""
      }

  const result = resolveOutboundMarriageOffer(deepCopy(fixtureCase.surface.previewState), {
    subject_person_id: fixtureCase.surface.subjectPersonId,
    scouting_registry: fixtureCase.surface.scoutingRegistry,
    offer: offerFromFixture(fixtureCase, useAcceptedDraft),
    dowry_requested_delta_by_asset: {
      coin: draft.dowryCoinDelta,
      food_stores: draft.dowryFoodStores,
      meat_stores: draft.dowryMeatStores
    },
    dower_requested_delta_by_asset: {
      coin: draft.dowerCoinDelta,
      food_stores: draft.dowerFoodStores,
      meat_stores: draft.dowerMeatStores
    }
  })

  return {
    outcome: result.outcome,
    blocked_reason: result.blocked_reason,
    candidate_person_id: result.candidate_person_id,
    candidate_house_label: result.candidate_house_label,
    summary: result.notes[0] ?? "n/a",
    receipt_snapshots: result.receipt_snapshots.map((receipt) => ({
      asset: receipt.asset,
      category: receipt.category,
      counterparty_id: receipt.counterparty_id,
      delta: receipt.delta
    }))
  }
}

describe("outbound marriage replay guards", () => {
  it("keeps preset-launched candidate ordering deterministic across all representative fixture cases", () => {
    const first = buildOutboundMarriageFixtureCases()
    const second = buildOutboundMarriageFixtureCases()

    expect(Object.keys(first)).toEqual([...OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER])
    expect(
      OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER.map((scenarioId) => ({
        scenarioId,
        shown_candidate_ids: first[scenarioId].surface.scoutingRegistry.shown_candidate_ids,
        held_out_candidate_ids: first[scenarioId].surface.scoutingRegistry.held_out_candidate_ids,
        subject_person_name: first[scenarioId].surface.subjectPersonName
      }))
    ).toEqual(
      OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER.map((scenarioId) => ({
        scenarioId,
        shown_candidate_ids: second[scenarioId].surface.scoutingRegistry.shown_candidate_ids,
        held_out_candidate_ids: second[scenarioId].surface.scoutingRegistry.held_out_candidate_ids,
        subject_person_name: second[scenarioId].surface.subjectPersonName
      }))
    )

    expect(first.baseline_seed_candidate_set.surface.scoutingRegistry.shown_candidate_ids.slice(0, 3)).toEqual([
      "p_ext_38_child1",
      "p_ext_14_child1",
      "p_ext_50_child2"
    ])
    expect(first.weather_shortage_shortlist.surface.shownCount).toBe(7)
    expect(first.weather_shortage_shortlist.surface.scoutingRegistry.held_out_candidate_ids[0]).toBe("p_ext_22_child1")
    expect(first.market_tight_launch_window.sourceTurnIndex).toBe(0)
  })

  it("keeps accepted and rejected resolver outcomes replay-stable on the canonical preset launch surfaces", () => {
    const cases = buildOutboundMarriageFixtureCases()

    const baselineRejected = compactResult(cases.baseline_seed_candidate_set, false)
    expect(compactResult(cases.baseline_seed_candidate_set, false)).toEqual(baselineRejected)
    expect(baselineRejected).toEqual({
      outcome: "rejected",
      blocked_reason: null,
      candidate_person_id: "p_ext_38_child1",
      candidate_house_label: "House Glenholt",
      summary: "Outbound marriage offer rejected by House Glenholt for Edmund.",
      receipt_snapshots: []
    })

    const representativeAcceptedCases = [
      "baseline_seed_candidate_set",
      "relationship_edges_candidate_set",
      "market_tight_launch_window"
    ] as const

    const acceptedResults = Object.fromEntries(
      representativeAcceptedCases.map((scenarioId) => [scenarioId, compactResult(cases[scenarioId], true)])
    )

    for (const scenarioId of representativeAcceptedCases) {
      expect(compactResult(cases[scenarioId], true)).toEqual(acceptedResults[scenarioId])
    }

    expect(acceptedResults.baseline_seed_candidate_set).toEqual({
      outcome: "accepted",
      blocked_reason: null,
      candidate_person_id: "p_ext_38_child1",
      candidate_house_label: "House Glenholt",
      summary: "Outbound marriage offer accepted by House Glenholt for Edmund.",
      receipt_snapshots: [
        {
          asset: "coin",
          category: "marriage.dowry_settlement",
          counterparty_id: "house:h_ext_38",
          delta: -3
        }
      ]
    })
    expect(acceptedResults.relationship_edges_candidate_set.summary).toBe(
      "Outbound marriage offer accepted by House Bramwell for Elinor."
    )
    expect(acceptedResults.market_tight_launch_window.summary).toBe(
      "Outbound marriage offer accepted by House Bramwell for Edmund."
    )
  })
})
