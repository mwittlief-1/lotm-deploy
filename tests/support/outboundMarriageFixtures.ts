import { proposeTurn } from "../../src/sim"
import { applyPlayabilityPreset, buildNewRunInit, createNewRun } from "../../src/sim/state"
import type { PlayabilityPresetId } from "../../src/ui/playabilityPresetPack"
import { listPlayabilityPresetDefinitions } from "../../src/ui/playabilityPresetPack"
import {
  buildOutboundMarriageOfferPreview,
  buildOutboundMarriageSurface,
  createOutboundMarriageOfferDraft,
  type OutboundMarriageOfferDraft,
  type OutboundMarriageOfferPreview,
  type OutboundMarriageSurface
} from "../../src/ui/outboundMarriageView"

export const OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER = [
  "baseline_seed_candidate_set",
  "relationship_edges_candidate_set",
  "weather_shortage_shortlist",
  "succession_pressure_candidate_set",
  "uat_baseline_launch_window",
  "market_tight_launch_window"
] as const

export type OutboundMarriageFixtureScenarioId = (typeof OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER)[number]
export type OutboundMarriageFixtureTab = "player" | "debug"

type FixtureCaseConfig = {
  initialTab: OutboundMarriageFixtureTab
  presetIds: PlayabilityPresetId[]
  representativePresetId: PlayabilityPresetId
  scenarioId: string
  steps: string[]
}

export type OutboundMarriageFixtureCase = {
  acceptedDraft: OutboundMarriageOfferDraft
  acceptedPreview: OutboundMarriageOfferPreview
  initialTab: OutboundMarriageFixtureTab
  presetIds: PlayabilityPresetId[]
  rejectedPreview: OutboundMarriageOfferPreview
  representativePresetId: PlayabilityPresetId
  scenarioId: string
  sourceSeed: string
  sourceTurnIndex: number
  steps: string[]
  surface: OutboundMarriageSurface
}

const FIXTURE_CASE_CONFIG: Record<OutboundMarriageFixtureScenarioId, FixtureCaseConfig> = {
  baseline_seed_candidate_set: {
    initialTab: "player",
    presetIds: ["baseline_low_pressure_prudent", "arrears_pressure_builder"],
    representativePresetId: "baseline_low_pressure_prudent",
    scenarioId: "outbound_marriage_baseline_seed_candidate_set",
    steps: [
      "Launch the representative preset through the canonical New Run preset path and open the outbound marriage sheet.",
      "Stay on the Player tab and confirm Edmund still anchors the shown shortlist with Beatrice Glenholt first.",
      "Check that the accepted preview still writes one receipt-backed settlement row without mutating live preview state."
    ]
  },
  relationship_edges_candidate_set: {
    initialTab: "player",
    presetIds: ["stable_clear_prudent", "relationship_edges_builder"],
    representativePresetId: "stable_clear_prudent",
    scenarioId: "outbound_marriage_relationship_edges_candidate_set",
    steps: [
      "Launch the representative relationship-edges preset and open the outbound marriage sheet.",
      "Keep the Player tab active and confirm Elinor remains the subject with Hugh Bramwell first in the shown ordering.",
      "Verify the accepted preview copy still resolves against House Bramwell with the receipt-backed settlement note."
    ]
  },
  weather_shortage_shortlist: {
    initialTab: "debug",
    presetIds: ["weather_shortage_builder"],
    representativePresetId: "weather_shortage_builder",
    scenarioId: "outbound_marriage_weather_shortage_shortlist",
    steps: [
      "Launch the shortage preset and switch the outbound marriage sheet to the Debug tab.",
      "Confirm the registry summary still shows a reduced shortlist of seven shown candidates with held-out rows preserved for review.",
      "Check that Margery Hartwyck remains the first shown candidate and the first held-out candidate stays deterministic."
    ]
  },
  succession_pressure_candidate_set: {
    initialTab: "debug",
    presetIds: ["dispossession_builder"],
    representativePresetId: "dispossession_builder",
    scenarioId: "outbound_marriage_succession_pressure_candidate_set",
    steps: [
      "Launch the dispossession reference preset and open the outbound marriage sheet on the Debug tab.",
      "Confirm Roger remains the subject and House Hartwyck still anchors the top shown candidate row.",
      "Verify the advanced contract preview keeps the accepted-receipt note stable before any live decision resolves."
    ]
  },
  uat_baseline_launch_window: {
    initialTab: "player",
    presetIds: ["uat_hunting_proxy"],
    representativePresetId: "uat_hunting_proxy",
    scenarioId: "outbound_marriage_uat_baseline_launch_window",
    steps: [
      "Launch the short baseline UAT preset and open the outbound marriage sheet immediately from the first gameplay shell.",
      "Confirm Oswin remains the subject with Matilda Glenholt first in the shown list.",
      "Check that the accepted preview still stays on the cloned snapshot path and reports one receipt-backed settlement row."
    ]
  },
  market_tight_launch_window: {
    initialTab: "player",
    presetIds: ["uat_arrears_enforcement", "uat_grant_visibility"],
    representativePresetId: "uat_grant_visibility",
    scenarioId: "outbound_marriage_market_tight_launch_window",
    steps: [
      "Launch the short market-tight preset through preset selection and open the outbound marriage sheet before advancing turns.",
      "Confirm Edmund remains the subject with Alice Bramwell first in the shown ordering.",
      "Verify the accepted preview still resolves against House Bramwell with one receipt-backed settlement row."
    ]
  }
}

function representativePreset(presetId: PlayabilityPresetId) {
  const preset = listPlayabilityPresetDefinitions().find((entry) => entry.preset_id === presetId)
  if (!preset) {
    throw new Error(`Missing playability preset ${presetId}.`)
  }
  return preset
}

function acceptedDraft(surface: OutboundMarriageSurface): OutboundMarriageOfferDraft {
  return {
    ...createOutboundMarriageOfferDraft(surface),
    dowryCoinDelta: -3,
    relationshipRespect: 4,
    relationshipAllegiance: 3,
    relationshipThreat: -1,
    riskTagsText: "prestige, costly"
  }
}

function compactPreview(preview: OutboundMarriageOfferPreview) {
  return {
    outcome: preview.outcome,
    outcome_label: preview.outcomeLabel,
    blocked_reason_label: preview.blockedReasonLabel,
    summary: preview.summary,
    receipt_summary: preview.receiptSummary,
    debug_rows: preview.debugRows.slice(0, 6)
  }
}

function compactCandidateRow(surface: OutboundMarriageSurface, candidateId: string | null | undefined) {
  if (!candidateId) return null
  const row = surface.candidateRows.find((entry) => entry.candidatePersonId === candidateId) ?? null
  if (!row) return null

  return {
    candidate_person_id: row.candidatePersonId,
    candidate_person_name: row.candidatePersonName,
    candidate_house_label: row.candidateHouseLabel,
    rank_group_label: row.rankGroupLabel,
    rank_index: row.rankIndex,
    ranking_score: row.rankingScore,
    scope_label: row.scopeLabel,
    distance_label: row.distanceLabel,
    include_reason_label: row.includeReasonLabel,
    exclude_reason_label: row.excludeReasonLabel,
    readiness_label: row.readinessLabel,
    selector_label: row.selectorLabel
  }
}

function compactFixtureCase(scenarioId: OutboundMarriageFixtureScenarioId, fixtureCase: OutboundMarriageFixtureCase) {
  const firstShownCandidateId = fixtureCase.surface.scoutingRegistry.shown_candidate_ids[0] ?? null
  const firstHeldOutCandidateId = fixtureCase.surface.scoutingRegistry.held_out_candidate_ids[0] ?? null

  return {
    scenario_id: fixtureCase.scenarioId,
    initial_tab: fixtureCase.initialTab,
    representative_preset_id: fixtureCase.representativePresetId,
    preset_ids: fixtureCase.presetIds,
    source_seed: fixtureCase.sourceSeed,
    source_turn_index: fixtureCase.sourceTurnIndex,
    steps: fixtureCase.steps,
    surface: {
      schema_version: fixtureCase.surface.schemaVersion,
      subtitle: fixtureCase.surface.subtitle,
      helper_text: fixtureCase.surface.helperText,
      summary_cards: fixtureCase.surface.summaryCards,
      scope_summary: fixtureCase.surface.scopeSummary,
      subject_person_id: fixtureCase.surface.subjectPersonId,
      subject_person_name: fixtureCase.surface.subjectPersonName,
      shown_count: fixtureCase.surface.shownCount,
      held_out_count: fixtureCase.surface.heldOutCount,
      total_candidates: fixtureCase.surface.totalCandidates,
      total_candidates_considered: fixtureCase.surface.totalCandidatesConsidered,
      shown_candidate_ids: fixtureCase.surface.scoutingRegistry.shown_candidate_ids.slice(0, 6),
      held_out_candidate_ids: fixtureCase.surface.scoutingRegistry.held_out_candidate_ids.slice(0, 6),
      first_shown_row: compactCandidateRow(fixtureCase.surface, firstShownCandidateId),
      first_held_out_row: compactCandidateRow(fixtureCase.surface, firstHeldOutCandidateId),
      focus_candidate_rows: fixtureCase.surface.candidateRows.slice(0, scenarioId === "weather_shortage_shortlist" ? 5 : 4).map((row) => ({
        candidate_person_id: row.candidatePersonId,
        candidate_person_name: row.candidatePersonName,
        candidate_house_label: row.candidateHouseLabel,
        rank_group_label: row.rankGroupLabel,
        rank_index: row.rankIndex,
        ranking_score: row.rankingScore,
        include_reason_label: row.includeReasonLabel,
        exclude_reason_label: row.excludeReasonLabel,
        scope_label: row.scopeLabel,
        readiness_label: row.readinessLabel
      }))
    },
    rejected_preview: compactPreview(fixtureCase.rejectedPreview),
    accepted_preview: compactPreview(fixtureCase.acceptedPreview)
  }
}

export function buildOutboundMarriageFixtureCases(): Record<
  OutboundMarriageFixtureScenarioId,
  OutboundMarriageFixtureCase
> {
  return Object.fromEntries(
    OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER.map((scenarioId) => {
      const config = FIXTURE_CASE_CONFIG[scenarioId]
      const preset = representativePreset(config.representativePresetId)
      const init = applyPlayabilityPreset(buildNewRunInit("outbound_marriage_fixture_placeholder"), {
        preset_id: preset.preset_id,
        seed: preset.seed
      })
      const state = createNewRun(init)
      const ctx = proposeTurn(state as any)
      const surface = buildOutboundMarriageSurface(ctx.preview_state, ctx.marriage_window)
      if (!surface) {
        throw new Error(`Expected outbound marriage surface for preset ${preset.preset_id}.`)
      }

      const rejectedPreview = buildOutboundMarriageOfferPreview(surface, createOutboundMarriageOfferDraft(surface))
      const draft = acceptedDraft(surface)
      const acceptedPreview = buildOutboundMarriageOfferPreview(surface, draft)
      if (!rejectedPreview || !acceptedPreview) {
        throw new Error(`Expected outbound marriage previews for preset ${preset.preset_id}.`)
      }

      return [
        scenarioId,
        {
          acceptedDraft: draft,
          acceptedPreview,
          initialTab: config.initialTab,
          presetIds: [...config.presetIds],
          rejectedPreview,
          representativePresetId: config.representativePresetId,
          scenarioId: config.scenarioId,
          sourceSeed: preset.seed,
          sourceTurnIndex: ctx.preview_state.turn_index,
          steps: [...config.steps],
          surface
        }
      ]
    })
  ) as Record<OutboundMarriageFixtureScenarioId, OutboundMarriageFixtureCase>
}

export function buildOutboundMarriageFixture(): string {
  const cases = buildOutboundMarriageFixtureCases()

  return `${JSON.stringify(
    Object.fromEntries(
      OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER.map((scenarioId) => [
        scenarioId,
        compactFixtureCase(scenarioId, cases[scenarioId])
      ])
    ),
    null,
    2
  )}\n`
}
