import { PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH } from "./playtestOpsPacket";

export const PLAYABILITY_PRESET_PACK_RELEASE = "v0.3.5" as const;
export const PLAYABILITY_PRESET_PACK_KIND = "playability_preset_pack_v1" as const;
export const PLAYABILITY_PRESET_PACK_RELPATH =
  `qa_artifacts/playtest_ops/${PLAYABILITY_PRESET_PACK_RELEASE}/playability_preset_pack.json` as const;
export const PLAYABILITY_REGRESSION_SEED_PACK_RELPATH =
  "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json" as const;
export const PLAYABILITY_UAT_SCENARIO_PACK_RELPATH =
  "qa_artifacts/playtest_ops/uat_scenarios_v0.3.json" as const;

export const PLAYABILITY_SOURCE_PACK_ORDER = [
  "economy_fiscal_regression_seed_pack",
  "playtest_ops_receipt_bundle_seed_pack",
  "uat_scenario_pack"
] as const;

export type PlayabilitySourcePackId = (typeof PLAYABILITY_SOURCE_PACK_ORDER)[number];
export type PlayabilityAcceptanceKind = "packet_review" | "uat_lock" | "kpi_band" | "runaway_detector";

export const PLAYABILITY_PRESET_ORDER = [
  "baseline_low_pressure_prudent",
  "stable_clear_prudent",
  "arrears_pressure_builder",
  "relationship_edges_builder",
  "weather_shortage_builder",
  "dispossession_builder",
  "uat_arrears_enforcement",
  "uat_grant_visibility",
  "uat_hunting_proxy"
] as const;

export type PlayabilityPresetId = (typeof PLAYABILITY_PRESET_ORDER)[number];

export const PLAYABILITY_ACCEPTANCE_ORDER = [
  "baseline_packet_review",
  "counterparty_packet_review",
  "shortage_packet_review",
  "obligations_visibility",
  "grant_visibility",
  "hunting_visibility",
  "kpi_prudent_baseline",
  "kpi_arrears_pressure",
  "kpi_dispossession_reference",
  "kpi_manor_count_baseline",
  "runaway_coin_runaway",
  "runaway_food_collapse",
  "runaway_arrears_soft",
  "runaway_arrears_hard",
  "runaway_manor_growth_frozen"
] as const;

export type PlayabilityAcceptanceId = (typeof PLAYABILITY_ACCEPTANCE_ORDER)[number];

export type PlayabilitySourceScenarioRef = {
  pack_id: PlayabilitySourcePackId;
  scenario_id: string;
};

export type PlayabilityAcceptanceTarget = {
  acceptance_id: PlayabilityAcceptanceId;
  kind: PlayabilityAcceptanceKind;
  summary: string;
};

export type PlayabilityPresetDefinition = {
  acceptance_ids: PlayabilityAcceptanceId[];
  focus: string[];
  policy_id: string;
  preset_id: PlayabilityPresetId;
  seed: string;
  source_refs: PlayabilitySourceScenarioRef[];
  summary: string;
  title: string;
  turns: number;
};

export type PlayabilityPresetPackSource = {
  artifact_relpath: string;
  hash: string;
  kind: string;
  pack_id: PlayabilitySourcePackId;
  scenario_count: number;
};

export type PlayabilityPresetPackV1 = {
  acceptance_targets: PlayabilityAcceptanceTarget[];
  init_contract: {
    current_mode: "seed_only";
    entrypoint: "createNewRun";
    future_adapter: "applyPlayabilityPreset";
    rules: string[];
    seam_id: "canonical_new_run_init_v1";
  };
  kind: typeof PLAYABILITY_PRESET_PACK_KIND;
  presets: PlayabilityPresetDefinition[];
  qa_flow: {
    commands: string[];
    note: string;
  };
  release: typeof PLAYABILITY_PRESET_PACK_RELEASE;
  source_packs: PlayabilityPresetPackSource[];
};

const PLAYABILITY_ACCEPTANCE_TARGETS: readonly PlayabilityAcceptanceTarget[] = [
  {
    acceptance_id: "baseline_packet_review",
    kind: "packet_review",
    summary: "Low-pressure packet review for naming, readability, and calm-turn evidence flow."
  },
  {
    acceptance_id: "counterparty_packet_review",
    kind: "packet_review",
    summary: "Counterparty-heavy packet review where grouped receipts and follow-up context stay legible."
  },
  {
    acceptance_id: "shortage_packet_review",
    kind: "packet_review",
    summary: "High-pressure shortage packet review that exercises raw evidence follow-up."
  },
  {
    acceptance_id: "obligations_visibility",
    kind: "uat_lock",
    summary: "Arrears and enforcement pressure appear on the expected short-run timeline."
  },
  {
    acceptance_id: "grant_visibility",
    kind: "uat_lock",
    summary: "Grant prospects surface quickly enough for deterministic UAT without seed hunting."
  },
  {
    acceptance_id: "hunting_visibility",
    kind: "uat_lock",
    summary: "Hunting stays observable through one deterministic fallback proxy until direct runtime visibility lands."
  },
  {
    acceptance_id: "kpi_prudent_baseline",
    kind: "kpi_band",
    summary: "Prudent baseline scenarios remain inside the accepted v0.3.5 KPI bands."
  },
  {
    acceptance_id: "kpi_arrears_pressure",
    kind: "kpi_band",
    summary: "Builder pressure scenarios anchor arrears and unrest acceptance bands."
  },
  {
    acceptance_id: "kpi_dispossession_reference",
    kind: "kpi_band",
    summary: "The long-run dispossession reference stays available for compare-against-baseline review."
  },
  {
    acceptance_id: "kpi_manor_count_baseline",
    kind: "kpi_band",
    summary: "Single-manor expectations remain explicit before later manor-growth work lands."
  },
  {
    acceptance_id: "runaway_coin_runaway",
    kind: "runaway_detector",
    summary: "Detect unexpected coin accumulation or collapse relative to the accepted calm baseline."
  },
  {
    acceptance_id: "runaway_food_collapse",
    kind: "runaway_detector",
    summary: "Detect starvation spiral and food-collapse drift before final UAT lock."
  },
  {
    acceptance_id: "runaway_arrears_soft",
    kind: "runaway_detector",
    summary: "Catch arrears pressure becoming too soft to surface on schedule."
  },
  {
    acceptance_id: "runaway_arrears_hard",
    kind: "runaway_detector",
    summary: "Catch arrears pressure becoming too punishing relative to the accepted baseline."
  },
  {
    acceptance_id: "runaway_manor_growth_frozen",
    kind: "runaway_detector",
    summary: "Catch manor-count drift or freeze against the single-manor baseline reference."
  }
];

const PLAYABILITY_PRESET_DEFINITIONS: readonly PlayabilityPresetDefinition[] = [
  {
    preset_id: "baseline_low_pressure_prudent",
    title: "Low-pressure prudent baseline",
    summary: "Calm baseline preset for packet readability, stable naming, and single-manor review.",
    seed: "lotm_v022_seed_001_baseline_extworld",
    policy_id: "prudent-builder",
    turns: 15,
    focus: ["packet_review", "baseline_kpi", "manor_count"],
    source_refs: [
      {
        pack_id: "playtest_ops_receipt_bundle_seed_pack",
        scenario_id: "baseline_low_pressure_prudent"
      },
      {
        pack_id: "economy_fiscal_regression_seed_pack",
        scenario_id: "single_manor_distribution_baseline"
      }
    ],
    acceptance_ids: [
      "baseline_packet_review",
      "kpi_prudent_baseline",
      "kpi_manor_count_baseline",
      "runaway_coin_runaway",
      "runaway_manor_growth_frozen"
    ]
  },
  {
    preset_id: "stable_clear_prudent",
    title: "Stable-clear prudent comparison",
    summary: "Clean prudent comparison point for stores and coin stability outside the extworld baseline seed.",
    seed: "lotm_v022_seed_002_relationship_edges",
    policy_id: "prudent-builder",
    turns: 15,
    focus: ["stable_baseline", "stores", "comparison"],
    source_refs: [
      {
        pack_id: "economy_fiscal_regression_seed_pack",
        scenario_id: "stable_clear_prudent_turns_15"
      }
    ],
    acceptance_ids: ["kpi_prudent_baseline", "runaway_coin_runaway"]
  },
  {
    preset_id: "arrears_pressure_builder",
    title: "Arrears-pressure builder",
    summary: "Short builder-forward pressure preset for arrears visibility, unrest review, and detector baselines.",
    seed: "lotm_v022_seed_001_baseline_extworld",
    policy_id: "builder-forward",
    turns: 15,
    focus: ["arrears", "unrest", "packet_review"],
    source_refs: [
      {
        pack_id: "playtest_ops_receipt_bundle_seed_pack",
        scenario_id: "arrears_pressure_builder"
      },
      {
        pack_id: "economy_fiscal_regression_seed_pack",
        scenario_id: "arrears_pressure_builder_turns_15"
      }
    ],
    acceptance_ids: [
      "obligations_visibility",
      "kpi_arrears_pressure",
      "runaway_arrears_soft",
      "runaway_arrears_hard"
    ]
  },
  {
    preset_id: "relationship_edges_builder",
    title: "Relationship-edges builder packet",
    summary: "Counterparty-oriented builder packet for grouped receipt review and follow-up evidence.",
    seed: "lotm_v022_seed_002_relationship_edges",
    policy_id: "builder-forward",
    turns: 15,
    focus: ["counterparties", "receipts", "follow_up"],
    source_refs: [
      {
        pack_id: "playtest_ops_receipt_bundle_seed_pack",
        scenario_id: "relationship_edges_builder"
      }
    ],
    acceptance_ids: ["counterparty_packet_review"]
  },
  {
    preset_id: "weather_shortage_builder",
    title: "Weather-shortage builder packet",
    summary: "High-noise shortage preset for raw evidence review and food-collapse monitoring.",
    seed: "lotm_v022_seed_007_weather_volatility",
    policy_id: "builder-forward",
    turns: 15,
    focus: ["shortage", "food_pressure", "raw_evidence"],
    source_refs: [
      {
        pack_id: "playtest_ops_receipt_bundle_seed_pack",
        scenario_id: "weather_shortage_builder"
      }
    ],
    acceptance_ids: ["shortage_packet_review", "runaway_food_collapse"]
  },
  {
    preset_id: "dispossession_builder",
    title: "Dispossession long-run builder",
    summary: "Long-run builder comparison point for dispossession timing and hard-pressure drift.",
    seed: "lotm_v022_seed_003_succession_pressure",
    policy_id: "builder-forward",
    turns: 30,
    focus: ["dispossession", "long_run", "arrears"],
    source_refs: [
      {
        pack_id: "economy_fiscal_regression_seed_pack",
        scenario_id: "dispossession_builder_turns_30"
      }
    ],
    acceptance_ids: ["kpi_dispossession_reference", "runaway_food_collapse", "runaway_arrears_hard"]
  },
  {
    preset_id: "uat_arrears_enforcement",
    title: "UAT arrears enforcement",
    summary: "Three-turn market-tight UAT preset for explicit arrears and enforcement visibility.",
    seed: "lotm_v026_seed_003_market_tight",
    policy_id: "builder-forward",
    turns: 3,
    focus: ["uat", "short_run", "obligations"],
    source_refs: [
      {
        pack_id: "uat_scenario_pack",
        scenario_id: "uat_arrears_enforcement"
      }
    ],
    acceptance_ids: ["obligations_visibility"]
  },
  {
    preset_id: "uat_grant_visibility",
    title: "UAT grant visibility",
    summary: "Four-turn market-tight UAT preset for deterministic grant-surface checks.",
    seed: "lotm_v026_seed_003_market_tight",
    policy_id: "builder-forward",
    turns: 4,
    focus: ["uat", "short_run", "prospects"],
    source_refs: [
      {
        pack_id: "uat_scenario_pack",
        scenario_id: "uat_grant_visibility"
      }
    ],
    acceptance_ids: ["grant_visibility"]
  },
  {
    preset_id: "uat_hunting_proxy",
    title: "UAT hunting proxy",
    summary: "Two-turn prudent UAT preset that keeps the deterministic hunting fallback visible until direct meat outputs land.",
    seed: "lotm_v026_seed_001_baseline",
    policy_id: "prudent-builder",
    turns: 2,
    focus: ["uat", "fallback_proxy", "hunting"],
    source_refs: [
      {
        pack_id: "uat_scenario_pack",
        scenario_id: "uat_meat_hunting_proxy"
      }
    ],
    acceptance_ids: ["hunting_visibility"]
  }
];

export function listPlayabilityAcceptanceTargets(): PlayabilityAcceptanceTarget[] {
  return PLAYABILITY_ACCEPTANCE_TARGETS.map((target) => ({ ...target }));
}

export function listPlayabilityPresetDefinitions(): PlayabilityPresetDefinition[] {
  return PLAYABILITY_PRESET_DEFINITIONS.map((preset) => ({
    ...preset,
    acceptance_ids: [...preset.acceptance_ids],
    focus: [...preset.focus],
    source_refs: preset.source_refs.map((ref) => ({ ...ref }))
  }));
}

export function summarizePlayabilityPresetPackContract(): {
  acceptanceCount: number;
  presetCount: number;
  release: string;
  relpath: string;
  sourcePackCount: number;
  sourceSeedPackRelpaths: string[];
} {
  return {
    acceptanceCount: PLAYABILITY_ACCEPTANCE_TARGETS.length,
    presetCount: PLAYABILITY_PRESET_DEFINITIONS.length,
    release: PLAYABILITY_PRESET_PACK_RELEASE,
    relpath: PLAYABILITY_PRESET_PACK_RELPATH,
    sourcePackCount: PLAYABILITY_SOURCE_PACK_ORDER.length,
    sourceSeedPackRelpaths: [
      PLAYABILITY_REGRESSION_SEED_PACK_RELPATH,
      PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH,
      PLAYABILITY_UAT_SCENARIO_PACK_RELPATH
    ]
  };
}
