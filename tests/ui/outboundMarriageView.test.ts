import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import {
  buildOutboundMarriageOfferPreview,
  buildOutboundMarriageSurface,
  createOutboundMarriageOfferDraft,
  resolveOutboundMarriageSelectedCandidateId
} from "../../src/ui/outboundMarriageView";

function createSurface() {
  const state = createNewRun("ui_r5005_t05_surface");
  const ctx = proposeTurn(state as any);
  const surface = buildOutboundMarriageSurface(ctx.preview_state, ctx.marriage_window);
  if (!surface) throw new Error("Expected outbound marriage surface");
  return surface;
}

describe("outboundMarriageView", () => {
  it("keeps the canonical shown ordering and falls back selection to the first shown candidate", () => {
    const surface = createSurface();

    expect(surface.candidateRows[0]?.candidatePersonId).toBe(surface.scoutingRegistry.shown_candidate_ids[0]);
    expect(resolveOutboundMarriageSelectedCandidateId(surface, null)).toBe(surface.scoutingRegistry.shown_candidate_ids[0]);
    expect(
      resolveOutboundMarriageSelectedCandidateId(surface, surface.scoutingRegistry.held_out_candidate_ids[0] ?? null)
    ).toBe(surface.scoutingRegistry.held_out_candidate_ids[0] ?? null);
    expect(surface.playerTermRows.find((row) => row.draftFieldPath === "draft.relationshipRespect")).toMatchObject({
      label: "Respect delta",
      playerAccessLabel: "Editable on player tab",
      resolverFieldPath: "offer.relationship_delta.respect",
    });
    expect(surface.playerTermRows.find((row) => row.draftFieldPath === "draft.riskTagsText")).toMatchObject({
      playerAccessLabel: "Locked to advanced contract",
      resolverFieldPath: "offer.risk_tags[]",
    });
    expect(surface.submissionStatus.label.length).toBeGreaterThan(0);
  });

  it("previews outbound offer outcomes against a cloned snapshot without mutating live preview state", () => {
    const surface = createSurface();
    const draft = createOutboundMarriageOfferDraft(surface);
    const beforeCoin = surface.previewState.manor.coin;
    const beforeMarried = surface.previewState.house.children[0]?.married;

    const rejectedPreview = buildOutboundMarriageOfferPreview(surface, draft);
    expect(rejectedPreview?.outcome).toBe("rejected");

    const acceptedPreview = buildOutboundMarriageOfferPreview(surface, {
      ...draft,
      dowryCoinDelta: -3,
      relationshipRespect: 4,
      relationshipAllegiance: 3,
      relationshipThreat: -1,
      riskTagsText: "prestige, costly"
    });

    expect(acceptedPreview?.outcome).toBe("accepted");
    expect(acceptedPreview?.summary).toContain("accepted");
    expect(surface.previewState.manor.coin).toBe(beforeCoin);
    expect(surface.previewState.house.children[0]?.married).toBe(beforeMarried);
  });
});
