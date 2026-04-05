import { describe, expect, it } from "vitest";

import {
  PLAY_SCREEN_DEBUG_ACCORDION_SUMMARY,
  PLAY_SCREEN_DEBUG_SURFACES,
  PLAY_SCREEN_MODAL_TITLES
} from "../../src/ui/playScreenChrome";

describe("play screen chrome", () => {
  it("keeps the first detail modal title stable for gameplay shells", () => {
    expect(PLAY_SCREEN_MODAL_TITLES).toEqual({
      household: "Household details",
      obligations: "Obligations & counterparties"
    });
  });

  it("keeps the debug accordion sections in the expected order", () => {
    expect(PLAY_SCREEN_DEBUG_SURFACES).toEqual([
      {
        id: "run_log",
        title: "Run log & exports",
        description: "Open the raw run log screen or export the current run without leaving the gameplay shell."
      },
      {
        id: "relationship_drawer",
        title: "Relationship drawer",
        description: "House and person relationship edges stay available here for replay audits and balancing checks."
      },
      {
        id: "topology_distances",
        title: "Topology distances",
        description: "Bounded world snapshot fields stay visible here so raw distance values and the current far threshold can be audited in the UI."
      }
    ]);
    expect(PLAY_SCREEN_DEBUG_ACCORDION_SUMMARY).toBe(
      "Raw diagnostics stay available here without competing with the main gameplay flow."
    );
  });
});
