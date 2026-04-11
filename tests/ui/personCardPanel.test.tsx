import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildPersonCardSurface } from "../../src/ui/personCardView";
import { PersonCardPanel } from "../../src/ui/panels/PersonCardPanel";

function buildSurface() {
  const state = createNewRun("person_card_panel");
  const ctx = proposeTurn(state);
  const surface = buildPersonCardSurface(ctx.preview_state, "p_head");

  if (!surface) {
    throw new Error("Expected a person-card surface for p_head.");
  }

  return surface;
}

describe("PersonCardPanel", () => {
  it("renders family-tab drilldown triggers from the shared person-card surface", () => {
    const surface = buildSurface();
    const familyEntry = surface.familySections.find((section) => section.entries.length > 0)?.entries[0];

    if (!familyEntry) {
      throw new Error("Expected a family entry on the person-card surface.");
    }

    const html = renderToStaticMarkup(
      <PersonCardPanel initialTab="family" onOpenPersonCard={() => undefined} surface={surface} />
    );

    expect(html).toContain("Person card");
    expect(html).toContain(familyEntry.title);
    expect(html).toContain(`data-person-card-open="${familyEntry.personId}"`);
  });

  it("renders relationship rows and debug field order deterministically", () => {
    const surface = buildSurface();
    const relationshipEntry = surface.relationshipRows.find((row) => row.personId);

    if (!relationshipEntry?.personId) {
      throw new Error("Expected a routed relationship row on the person-card surface.");
    }

    const relationshipsHtml = renderToStaticMarkup(
      <PersonCardPanel initialTab="relationships" onOpenPersonCard={() => undefined} surface={surface} />
    );
    const debugHtml = renderToStaticMarkup(
      <PersonCardPanel initialTab="debug" onOpenPersonCard={() => undefined} surface={surface} />
    );

    expect(relationshipsHtml).toContain("Relationships");
    expect(relationshipsHtml).toContain(relationshipEntry.title);
    expect(relationshipsHtml).toContain(`data-person-card-open="${relationshipEntry.personId}"`);
    expect(debugHtml).toContain("Deterministic person-card field order");
    expect(debugHtml).toContain(surface.schemaVersion);
    expect(debugHtml.indexOf("schema_version")).toBeLessThan(debugHtml.indexOf("person_id"));
  });
});
