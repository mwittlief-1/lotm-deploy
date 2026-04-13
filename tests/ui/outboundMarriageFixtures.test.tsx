import fs from "node:fs"
import path from "node:path"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OutboundMarriagePanel } from "../../src/ui/panels/OutboundMarriagePanel"
import {
  buildOutboundMarriagePresetCoverageArtifact,
  OUTBOUND_MARRIAGE_PRESET_COVERAGE_RELPATH
} from "../../scripts/outboundMarriagePresetCoverage"
import { sha256, stableStringify } from "../../scripts/seed_replay/hash"
import {
  buildOutboundMarriageFixture,
  buildOutboundMarriageFixtureCases,
  OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER
} from "../support/outboundMarriageFixtures"

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name)
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8")
}

describe("outbound marriage fixtures", () => {
  it("matches the deterministic outbound marriage fixture snapshot", () => {
    const expected = readFixture("outbound_marriage_snapshot_v0.3.5.json")

    expect(buildOutboundMarriageFixture()).toBe(expected)
    expect(buildOutboundMarriageFixture()).toBe(buildOutboundMarriageFixture())
  })

  it("locks representative preset launch cases for candidate ordering, preview copy, and player/debug routing", () => {
    const cases = buildOutboundMarriageFixtureCases()

    expect(Object.keys(cases)).toEqual([...OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER])

    const baseline = cases.baseline_seed_candidate_set
    expect(baseline.representativePresetId).toBe("baseline_low_pressure_prudent")
    expect(baseline.presetIds).toEqual(["baseline_low_pressure_prudent", "arrears_pressure_builder"])
    expect(baseline.surface.subjectPersonName).toBe("Edmund")
    expect(baseline.surface.candidateRows[0]?.candidatePersonName).toBe("Beatrice Glenholt")
    expect(baseline.acceptedPreview).toMatchObject({
      outcome: "accepted",
      receiptSummary: "1 receipt-backed settlement row would be written.",
      summary: "Outbound marriage offer accepted by House Glenholt for Edmund."
    })
    const baselineHtml = renderToStaticMarkup(
      <OutboundMarriagePanel
        initialTab={baseline.initialTab}
        onClearScout={() => undefined}
        onQueueScout={() => undefined}
        scoutQueued={false}
        surface={baseline.surface}
      />
    )
    expect(baselineHtml).toContain("Scout &amp; offer sheet")
    expect(baselineHtml).toContain("Beatrice Glenholt")
    expect(baselineHtml).toContain("Resolver preview")

    const weather = cases.weather_shortage_shortlist
    expect(weather.initialTab).toBe("debug")
    expect(weather.surface.shownCount).toBe(7)
    expect(weather.surface.heldOutCount).toBe(12)
    expect(weather.surface.candidateRows[0]?.candidatePersonName).toBe("Margery Hartwyck")
    expect(weather.surface.candidateRows.find((row) => row.rankGroupLabel === "Held out")?.candidatePersonName).toBe(
      "Edith Evershaw"
    )
    const weatherHtml = renderToStaticMarkup(
      <OutboundMarriagePanel
        initialTab={weather.initialTab}
        onClearScout={() => undefined}
        onQueueScout={() => undefined}
        scoutQueued={true}
        surface={weather.surface}
      />
    )
    expect(weatherHtml).toContain("Eligibility table")
    expect(weatherHtml).toContain("Deterministic scouting registry counts")
    expect(weatherHtml).toContain("Edith Evershaw")

    const marketTight = cases.market_tight_launch_window
    expect(marketTight.presetIds).toEqual(["uat_arrears_enforcement", "uat_grant_visibility"])
    expect(marketTight.surface.subjectPersonName).toBe("Edmund")
    expect(marketTight.surface.candidateRows[0]?.candidatePersonName).toBe("Alice Bramwell")

    const uatBaseline = cases.uat_baseline_launch_window
    expect(uatBaseline.surface.subjectPersonName).toBe("Oswin")
    expect(uatBaseline.surface.candidateRows[0]?.candidatePersonName).toBe("Matilda Glenholt")
    expect(uatBaseline.acceptedPreview.summary).toBe("Outbound marriage offer accepted by House Glenholt for Oswin.")
  })

  it("keeps the checked-in outbound marriage preset coverage artifact aligned to the fixture cases", () => {
    const artifact = JSON.parse(
      fs.readFileSync(path.resolve(OUTBOUND_MARRIAGE_PRESET_COVERAGE_RELPATH), "utf8")
    ) as Record<string, any>
    const built = buildOutboundMarriagePresetCoverageArtifact()

    expect(artifact).toEqual({
      ...built,
      hash: sha256(stableStringify(built))
    })
    expect(artifact.cases.map((entry: any) => entry.fixture_case_id)).toEqual([
      ...OUTBOUND_MARRIAGE_FIXTURE_SCENARIO_ORDER
    ])
    expect(artifact.cases.find((entry: any) => entry.fixture_case_id === "baseline_seed_candidate_set")).toMatchObject({
      preset_ids: ["baseline_low_pressure_prudent", "arrears_pressure_builder"],
      subject_person_name: "Edmund",
      first_shown_candidate: "Beatrice Glenholt",
      expected_cues: ["Edmund", "Beatrice Glenholt", "1 receipt-backed settlement row would be written."]
    })
    expect(artifact.cases.find((entry: any) => entry.fixture_case_id === "weather_shortage_shortlist")).toMatchObject({
      preset_ids: ["weather_shortage_builder"],
      shown_count: 7,
      held_out_count: 12,
      expected_cues: ["7 shown", "12 held out", "Edith Evershaw"]
    })
    expect(artifact.cases.find((entry: any) => entry.fixture_case_id === "market_tight_launch_window")).toMatchObject({
      preset_ids: ["uat_arrears_enforcement", "uat_grant_visibility"],
      first_shown_candidate: "Alice Bramwell"
    })
    expect(artifact.source_artifacts).toEqual([
      {
        artifact_relpath: "tests/fixtures/outbound_marriage_snapshot_v0.3.5.json",
        label: "outbound marriage fixture"
      },
      {
        artifact_relpath: "qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json",
        label: "preset-pack canonical launch map"
      }
    ])
  })
})
