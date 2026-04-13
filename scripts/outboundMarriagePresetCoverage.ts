#!/usr/bin/env node
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  PLAYABILITY_PRESET_PACK_RELEASE,
  PLAYABILITY_PRESET_PACK_RELPATH,
  type PlayabilityPresetId
} from "../src/ui/playabilityPresetPack"
import {
  buildOutboundMarriageFixtureCases,
  OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER,
  type OutboundMarriageFixtureScenarioId
} from "../tests/support/outboundMarriageFixtures"
import { writeStableArtifact } from "./seed_replay/artifactWriter"

export const OUTBOUND_MARRIAGE_PRESET_COVERAGE_KIND = "outbound_marriage_preset_coverage_v1" as const
export const OUTBOUND_MARRIAGE_PRESET_COVERAGE_RELPATH =
  `qa_artifacts/playtest_ops/${PLAYABILITY_PRESET_PACK_RELEASE}/outbound_marriage_preset_coverage.json` as const

type SourceArtifact = {
  artifact_relpath: string
  label: string
}

export type OutboundMarriagePresetCoverageCase = {
  accepted_preview: string
  accepted_receipt_summary: string
  expected_cues: string[]
  first_held_out_candidate: string
  first_shown_candidate: string
  fixture_case_id: OutboundMarriageFixtureScenarioId
  held_out_count: number
  initial_tab: "player" | "debug"
  preset_ids: PlayabilityPresetId[]
  rejected_preview: string
  scenario_id: string
  scope_summary: string
  shown_count: number
  source_seed: string
  source_turn_index: number
  steps: string[]
  subject_person_name: string
}

export type OutboundMarriagePresetCoverageArtifact = {
  cases: OutboundMarriagePresetCoverageCase[]
  kind: typeof OUTBOUND_MARRIAGE_PRESET_COVERAGE_KIND
  release: typeof PLAYABILITY_PRESET_PACK_RELEASE
  source_artifacts: SourceArtifact[]
}

function firstHeldOutCandidateName(caseData: ReturnType<typeof buildOutboundMarriageFixtureCases>[OutboundMarriageFixtureScenarioId]): string {
  const candidateId = caseData.surface.scoutingRegistry.held_out_candidate_ids[0] ?? null
  return caseData.surface.candidateRows.find((row) => row.candidatePersonId === candidateId)?.candidatePersonName ?? "n/a"
}

function expectedCues(caseData: ReturnType<typeof buildOutboundMarriageFixtureCases>[OutboundMarriageFixtureScenarioId]): string[] {
  const firstShownCandidate = caseData.surface.candidateRows[0]?.candidatePersonName ?? "n/a"

  if (caseData.initialTab === "debug") {
    return [`${caseData.surface.shownCount} shown`, `${caseData.surface.heldOutCount} held out`, firstHeldOutCandidateName(caseData)]
  }

  return [caseData.surface.subjectPersonName, firstShownCandidate, caseData.acceptedPreview.receiptSummary]
}

export function buildOutboundMarriagePresetCoverageArtifact(): OutboundMarriagePresetCoverageArtifact {
  const cases = buildOutboundMarriageFixtureCases()

  return {
    kind: OUTBOUND_MARRIAGE_PRESET_COVERAGE_KIND,
    release: PLAYABILITY_PRESET_PACK_RELEASE,
    cases: OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER.map((fixtureCaseId) => {
      const fixtureCase = cases[fixtureCaseId]
      const heldOutCandidateId = fixtureCase.surface.scoutingRegistry.held_out_candidate_ids[0] ?? null

      return {
        accepted_preview: fixtureCase.acceptedPreview.summary,
        accepted_receipt_summary: fixtureCase.acceptedPreview.receiptSummary,
        expected_cues: expectedCues(fixtureCase),
        first_held_out_candidate: firstHeldOutCandidateName(fixtureCase),
        first_shown_candidate: fixtureCase.surface.candidateRows[0]?.candidatePersonName ?? "n/a",
        fixture_case_id: fixtureCaseId,
        held_out_count: fixtureCase.surface.heldOutCount,
        initial_tab: fixtureCase.initialTab,
        preset_ids: [...fixtureCase.presetIds],
        rejected_preview: fixtureCase.rejectedPreview.summary,
        scenario_id: fixtureCase.scenarioId,
        scope_summary: fixtureCase.surface.scopeSummary,
        shown_count: fixtureCase.surface.shownCount,
        source_seed: fixtureCase.sourceSeed,
        source_turn_index: fixtureCase.sourceTurnIndex,
        steps: [...fixtureCase.steps],
        subject_person_name: fixtureCase.surface.subjectPersonName
      }
    }),
    source_artifacts: [
      {
        artifact_relpath: "tests/fixtures/outbound_marriage_snapshot_v0.3.5.json",
        label: "outbound marriage fixture"
      },
      {
        artifact_relpath: PLAYABILITY_PRESET_PACK_RELPATH,
        label: "preset-pack canonical launch map"
      }
    ]
  }
}

function main(): void {
  writeStableArtifact(
    path.resolve(OUTBOUND_MARRIAGE_PRESET_COVERAGE_RELPATH),
    buildOutboundMarriagePresetCoverageArtifact()
  )
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isEntrypoint) {
  main()
}
