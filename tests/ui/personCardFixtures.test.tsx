import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createPersonCardRoute } from "../../src/ui/personCardView";
import {
  PERSON_CARD_DEBUG_KEYS,
  buildPersonCardFixture,
  buildPersonCardRouteCases
} from "../support/personCardFixtures";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

describe("person card fixtures", () => {
  it("matches the deterministic multi-tab person-card fixture", () => {
    const expected = readFixture("person_card_snapshot_v0.3.5.json");

    expect(buildPersonCardFixture()).toBe(expected);
    expect(buildPersonCardFixture()).toBe(buildPersonCardFixture());
  });

  it("keeps the major tab surfaces populated and the debug schema order stable", () => {
    const fixture = JSON.parse(buildPersonCardFixture()) as {
      debug: { debug_keys: string[]; first_rows: Array<{ key: string; value: string }> };
      family: { sections: Array<{ count: number; first_entry: { personId: string; title: string } | null; id: string }> };
      offices_service: { office_assignments: Array<{ title: string }>; service_entries: Array<{ title: string }>; selector_contexts: string };
      overview: { overview_cards: Array<{ id: string; value: string }> };
      relationships: { first_rows: Array<{ personId: string | null; totalScore: number }>; total_count: number };
    };

    expect(fixture.overview.overview_cards.map((card) => card.id)).toEqual([
      "status",
      "house",
      "residence",
      "roles",
      "succession",
      "lands"
    ]);
    expect(fixture.family.sections.map((section) => section.id)).toEqual(["parents", "spouse", "siblings", "children"]);
    expect(fixture.family.sections.find((section) => section.id === "spouse")?.first_entry?.personId).toBe("p_spouse");
    expect(fixture.family.sections.find((section) => section.id === "children")?.count).toBeGreaterThan(0);
    expect(fixture.offices_service.office_assignments.map((assignment) => assignment.title)).toEqual(["Steward"]);
    expect(fixture.offices_service.service_entries.map((entry) => entry.title)).toEqual(["Steward"]);
    expect(fixture.offices_service.selector_contexts).toContain("office");
    expect(fixture.relationships.total_count).toBeGreaterThan(fixture.relationships.first_rows.length);
    expect(fixture.relationships.first_rows[0]?.personId).toBe("p_liege");
    expect(fixture.relationships.first_rows[0]?.totalScore ?? 0).toBeGreaterThanOrEqual(
      fixture.relationships.first_rows[1]?.totalScore ?? 0
    );
    expect(fixture.debug.debug_keys).toEqual([...PERSON_CARD_DEBUG_KEYS]);
    expect(fixture.debug.first_rows.map((row) => row.key)).toEqual(PERSON_CARD_DEBUG_KEYS.slice(0, 8));
  });

  it("covers every live tap-any-name entry point with the canonical person-card route origin", () => {
    const routeCases = buildPersonCardRouteCases();

    expect(routeCases.map((entry) => entry.origin)).toEqual([
      "household",
      "roster",
      "prospects",
      "known_houses",
      "house_dossier",
      "person_card"
    ]);

    for (const routeCase of routeCases) {
      expect(routeCase.triggerIds.length).toBeGreaterThan(0);
      expect(routeCase.triggerIds.map((personId) => createPersonCardRoute(personId, routeCase.origin))).toEqual(
        routeCase.triggerIds.map((personId) => ({
          origin: routeCase.origin,
          personId
        }))
      );
    }

    const household = routeCases.find((entry) => entry.origin === "household");
    const roster = routeCases.find((entry) => entry.origin === "roster");
    const prospects = routeCases.find((entry) => entry.origin === "prospects");
    const knownHouses = routeCases.find((entry) => entry.origin === "known_houses");
    const houseDossier = routeCases.find((entry) => entry.origin === "house_dossier");
    const personCard = routeCases.find((entry) => entry.origin === "person_card");

    expect(household?.triggerIds).toContain("p_head");
    expect(roster?.triggerIds).toContain("p_head");
    expect(prospects?.triggerIds).toEqual(["p_child_1", "p_suitor_1"]);
    expect(knownHouses?.triggerIds).toEqual(["p_ext_01_head"]);
    expect(houseDossier?.triggerIds.length ?? 0).toBeGreaterThan(0);
    expect(personCard?.triggerIds).toContain("p_spouse");
    expect(personCard?.triggerIds).toContain("p_liege");
  });
});
