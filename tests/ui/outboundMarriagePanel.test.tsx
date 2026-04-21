import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildOutboundMarriageSurface } from "../../src/ui/outboundMarriageView";
import { OutboundMarriagePanel } from "../../src/ui/panels/OutboundMarriagePanel";

function createSurface() {
  const state = createNewRun("ui_r5005_t05_panel");
  const ctx = proposeTurn(state as any);
  const surface = buildOutboundMarriageSurface(ctx.preview_state, ctx.marriage_window);
  if (!surface) throw new Error("Expected outbound marriage surface");
  return surface;
}

describe("OutboundMarriagePanel", () => {
  it("renders the player tab with scout controls, candidate table, and resolver preview", () => {
    const html = renderToStaticMarkup(
      <OutboundMarriagePanel
        onClearScout={() => undefined}
        onQueueScout={() => undefined}
        scoutQueued={false}
        surface={createSurface()}
      />
    );

    expect(html).toContain("Scout &amp; offer sheet");
    expect(html).toContain("Queue scout");
    expect(html).toContain("Offer submission");
    expect(html).toContain("Candidate table");
    expect(html).toContain("Player term access");
    expect(html).toContain("Offer composer");
    expect(html).toContain("Resolver preview");
    expect(html).toContain("Accepted preview");
    expect(html).toContain("draft.relationshipRespect");
    expect(html).toContain("offer.relationship_delta.respect");
    expect(html).toContain("Select");
  });

  it("renders the debug tab with the eligibility table and advanced contract preview", () => {
    const html = renderToStaticMarkup(
      <OutboundMarriagePanel
        initialTab="debug"
        onClearScout={() => undefined}
        onQueueScout={() => undefined}
        scoutQueued={true}
        surface={createSurface()}
      />
    );

    expect(html).toContain("Eligibility table");
    expect(html).toContain("Advanced contract preview");
    expect(html).toContain("Risk tags");
    expect(html).toContain("Acceptance score");
    expect(html).toContain("Held out");
  });
});
