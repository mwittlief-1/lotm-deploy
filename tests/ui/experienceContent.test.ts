import { describe, expect, it } from "vitest";

import {
  EXPERIENCE_CONTENT_CATEGORY_ORDER,
  listExperienceContentSlots,
  summarizeExperienceContentInventory
} from "../../src/content/experienceContent";

describe("experienceContent inventory", () => {
  it("covers every locked v0.3.3 content category in one ordered registry", () => {
    const summary = summarizeExperienceContentInventory();

    expect(summary.categories).toEqual([...EXPERIENCE_CONTENT_CATEGORY_ORDER]);
    expect(summary.slotCount).toBe(7);
    expect(summary.missingCount).toBe(1);
    expect(summary.needsSurfaceCount).toBe(1);
  });

  it("maps current copy sources before the follow-on template tasks rewire them", () => {
    const obligations = listExperienceContentSlots("obligations");
    const grants = listExperienceContentSlots("grants");
    const dispossession = listExperienceContentSlots("dispossession");

    expect(obligations).toEqual([
      expect.objectContaining({
        id: "obligations.counterparty_cards",
        currentState: "hard_coded",
        plannedTaskId: "V03-R3-007-T02"
      })
    ]);

    expect(grants).toEqual([
      expect.objectContaining({
        id: "grants.accept_reject_flow",
        currentState: "central_copy",
        plannedTaskId: "V03-R3-007-T03"
      })
    ]);

    expect(dispossession).toEqual([
      expect.objectContaining({
        id: "dispossession.pretrigger_warning",
        currentState: "missing",
        gap: "needs_surface"
      }),
      expect.objectContaining({
        id: "dispossession.end_state_label",
        currentState: "central_copy",
        plannedTaskId: "V03-R3-007-T05"
      })
    ]);
  });
});
