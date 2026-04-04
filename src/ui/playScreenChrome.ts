export const PLAY_SCREEN_MODAL_TITLES = {
  household: "Household details",
  obligations: "Obligations & counterparties"
} as const;

export const PLAY_SCREEN_DEBUG_SURFACES = [
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
] as const;

export const PLAY_SCREEN_DEBUG_ACCORDION_SUMMARY =
  "Raw diagnostics stay available here without competing with the main gameplay flow.";
