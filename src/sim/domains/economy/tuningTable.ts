import { FISCAL_LEDGER_RUNTIME_ASSET_PATHS } from "./schema";

export const ECONOMY_FISCAL_TUNING_TABLE_SCHEMA_VERSION = "economy_fiscal_tuning_table_v1" as const;
export const ECONOMY_FISCAL_TUNING_SECTION_KEYS = [
  "obligations",
  "maintenance",
  "pricing",
  "consumption",
  "production"
] as const;
export const ECONOMY_TUNING_OBLIGATION_COUNTERPARTY_KEYS = ["church", "liege"] as const;
export const ECONOMY_TUNING_OBLIGATION_STATES = ["clear", "arrears"] as const;
export const ECONOMY_TUNING_MAINTENANCE_ENTRY_KEYS = [
  "expense.household_admin",
  "expense.maintenance",
  "expense.project_capex",
  "hook.maintenance_scaling_bps_per_manor",
  "hook.admin_overhead_bps_per_manor",
  "hook.delegation_efficiency_bps"
] as const;
export const ECONOMY_TUNING_MAINTENANCE_ENTRY_STATUSES = [
  "taxonomy_only",
  "placeholder"
] as const;
export const ECONOMY_TUNING_PRICE_KEYS = [
  "food_stores_market_sell",
  "meat_stores_market_sell_placeholder",
  "farm_labor_turn_placeholder",
  "builder_labor_turn_placeholder"
] as const;

export type EconomyFiscalTuningTableSchemaVersionV1 = typeof ECONOMY_FISCAL_TUNING_TABLE_SCHEMA_VERSION;
export type EconomyFiscalTuningSectionKeyV1 = typeof ECONOMY_FISCAL_TUNING_SECTION_KEYS[number];
export type EconomyTuningObligationCounterpartyKeyV1 = typeof ECONOMY_TUNING_OBLIGATION_COUNTERPARTY_KEYS[number];
export type EconomyTuningObligationStateV1 = typeof ECONOMY_TUNING_OBLIGATION_STATES[number];
export type EconomyTuningMaintenanceEntryKeyV1 = typeof ECONOMY_TUNING_MAINTENANCE_ENTRY_KEYS[number];
export type EconomyTuningMaintenanceEntryStatusV1 = typeof ECONOMY_TUNING_MAINTENANCE_ENTRY_STATUSES[number];
export type EconomyTuningPriceKeyV1 = typeof ECONOMY_TUNING_PRICE_KEYS[number];

export interface EconomyTuningRelationshipDeltaV1 {
  respect: number;
  threat: number;
}

export interface EconomyTuningMaintenanceEntryV1 {
  key: EconomyTuningMaintenanceEntryKeyV1;
  status: EconomyTuningMaintenanceEntryStatusV1;
  unit: "coin" | "bps";
  default_value: number | null;
  runtime_owner: string;
  notes: string;
}

export interface EconomyFiscalTuningTableSnapshotV1 {
  schema_version: EconomyFiscalTuningTableSchemaVersionV1;
  sections: EconomyFiscalTuningSectionKeyV1[];
  obligations: {
    settlement_cadence_turns: number;
    stable_unrest_relief_when_clear: number;
    stage_one_relationship_deltas: Record<
      EconomyTuningObligationCounterpartyKeyV1,
      Record<EconomyTuningObligationStateV1, EconomyTuningRelationshipDeltaV1>
    >;
    stage_two_placeholder_caps: {
      enterprise_seizure_turn_cap_coin: number | null;
      forced_church_food_turn_cap: number | null;
    };
  };
  maintenance: {
    entries: EconomyTuningMaintenanceEntryV1[];
  };
  pricing: {
    fixed_sell_cap_bps: number;
    price_keys: EconomyTuningPriceKeyV1[];
    price_table: Record<EconomyTuningPriceKeyV1, {
      category: "good" | "labor";
      lifecycle: "active" | "placeholder";
      subject: "food_stores" | "meat_stores" | "farm_labor_turn" | "builder_labor_turn";
      label: string;
      pricing_model: "fixed_ratio";
      quote_asset: "coin";
      quote_amount: number;
      base_amount: number;
      unit: "store_unit" | "labor_turn";
      runtime_asset_path: string | null;
      notes: string;
    }>;
  };
  consumption: {
    bushels_per_person_per_year: number;
    builder_extra_bushels_per_year: number;
    turn_years: number;
    meat_target_bps: {
      peasant: number;
      court: number;
    };
  };
  production: {
    turn_years: number;
    hunting: {
      idle_worker_turn_years_divisor: number;
      martial_bonus_threshold: number;
      martial_bonus_divisor: number;
    };
  };
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function normalizePositiveInteger(value: number): number {
  return Math.max(1, normalizeInteger(value));
}

function normalizeNullableInteger(value: number | null): number | null {
  if (value == null) return null;
  return normalizeInteger(value);
}

function cloneRelationshipDelta(delta: EconomyTuningRelationshipDeltaV1): EconomyTuningRelationshipDeltaV1 {
  return {
    respect: normalizeInteger(delta.respect),
    threat: normalizeInteger(delta.threat)
  };
}

function cloneMaintenanceEntry(entry: EconomyTuningMaintenanceEntryV1): EconomyTuningMaintenanceEntryV1 {
  return {
    key: entry.key,
    status: entry.status,
    unit: entry.unit,
    default_value: normalizeNullableInteger(entry.default_value),
    runtime_owner: entry.runtime_owner,
    notes: entry.notes
  };
}

export const ECONOMY_FISCAL_TUNING_TABLE = {
  schema_version: ECONOMY_FISCAL_TUNING_TABLE_SCHEMA_VERSION,
  sections: [...ECONOMY_FISCAL_TUNING_SECTION_KEYS],
  obligations: {
    settlement_cadence_turns: 1,
    stable_unrest_relief_when_clear: 2,
    stage_one_relationship_deltas: {
      church: {
        clear: { respect: 1, threat: 0 },
        arrears: { respect: -1, threat: 1 }
      },
      liege: {
        clear: { respect: 1, threat: -1 },
        arrears: { respect: -1, threat: 1 }
      }
    },
    stage_two_placeholder_caps: {
      enterprise_seizure_turn_cap_coin: null,
      forced_church_food_turn_cap: null
    }
  },
  maintenance: {
    entries: [
      {
        key: "expense.household_admin",
        status: "taxonomy_only",
        unit: "coin",
        default_value: null,
        runtime_owner: "receipt_taxonomy_only",
        notes: "Receipt ordering and grouping already recognize this family, but there is no economy-owned scalar amount yet."
      },
      {
        key: "expense.maintenance",
        status: "taxonomy_only",
        unit: "coin",
        default_value: null,
        runtime_owner: "receipt_taxonomy_only",
        notes: "The fiscal packet names this expense family, but the lane has not extracted a live maintenance constant yet."
      },
      {
        key: "expense.project_capex",
        status: "taxonomy_only",
        unit: "coin",
        default_value: null,
        runtime_owner: "receipt_taxonomy_only",
        notes: "Project spending already uses the receipt taxonomy, but no shared economy tuning scalar exists for capex."
      },
      {
        key: "hook.maintenance_scaling_bps_per_manor",
        status: "placeholder",
        unit: "bps",
        default_value: null,
        runtime_owner: "future_balance_hook",
        notes: "Reserved for future manor maintenance scaling once the runtime path is explicit."
      },
      {
        key: "hook.admin_overhead_bps_per_manor",
        status: "placeholder",
        unit: "bps",
        default_value: null,
        runtime_owner: "future_balance_hook",
        notes: "Reserved for future manor-count admin overhead scaling."
      },
      {
        key: "hook.delegation_efficiency_bps",
        status: "placeholder",
        unit: "bps",
        default_value: null,
        runtime_owner: "future_balance_hook",
        notes: "Reserved for future delegation-efficiency balancing once the hook is promoted into runtime math."
      }
    ]
  },
  pricing: {
    fixed_sell_cap_bps: 10000,
    price_keys: [...ECONOMY_TUNING_PRICE_KEYS],
    price_table: {
      food_stores_market_sell: {
        category: "good",
        lifecycle: "active",
        subject: "food_stores",
        label: "Food stores market sell",
        pricing_model: "fixed_ratio",
        quote_asset: "coin",
        quote_amount: 1,
        base_amount: 10,
        unit: "store_unit",
        runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.food_stores,
        notes: "Anchors the future fixed bushel sale constant near the legacy 0.10 coin-per-bushel midpoint."
      },
      meat_stores_market_sell_placeholder: {
        category: "good",
        lifecycle: "placeholder",
        subject: "meat_stores",
        label: "Meat stores market sell placeholder",
        pricing_model: "fixed_ratio",
        quote_asset: "coin",
        quote_amount: 1,
        base_amount: 5,
        unit: "store_unit",
        runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.meat_stores,
        notes: "Reserved for future meat-sale exposure without implying an active live market action in v0.3."
      },
      farm_labor_turn_placeholder: {
        category: "labor",
        lifecycle: "placeholder",
        subject: "farm_labor_turn",
        label: "Farm labor turn placeholder",
        pricing_model: "fixed_ratio",
        quote_asset: "coin",
        quote_amount: 1,
        base_amount: 1,
        unit: "labor_turn",
        runtime_asset_path: null,
        notes: "Reserved for future fixed labor pricing hooks; not wired into runtime actions in v0.3."
      },
      builder_labor_turn_placeholder: {
        category: "labor",
        lifecycle: "placeholder",
        subject: "builder_labor_turn",
        label: "Builder labor turn placeholder",
        pricing_model: "fixed_ratio",
        quote_asset: "coin",
        quote_amount: 2,
        base_amount: 1,
        unit: "labor_turn",
        runtime_asset_path: null,
        notes: "Reserved for future construction labor pricing hooks; not wired into runtime actions in v0.3."
      }
    }
  },
  consumption: {
    bushels_per_person_per_year: 12,
    builder_extra_bushels_per_year: 1,
    turn_years: 3,
    meat_target_bps: {
      peasant: 100,
      court: 500
    }
  },
  production: {
    turn_years: 3,
    hunting: {
      idle_worker_turn_years_divisor: 2,
      martial_bonus_threshold: 2,
      martial_bonus_divisor: 3
    }
  }
} as const satisfies EconomyFiscalTuningTableSnapshotV1;

export function economyObligationSettlementCadenceTurns(): number {
  return normalizePositiveInteger(ECONOMY_FISCAL_TUNING_TABLE.obligations.settlement_cadence_turns);
}

export function economyStableUnrestReliefWhenClear(): number {
  return normalizePositiveInteger(ECONOMY_FISCAL_TUNING_TABLE.obligations.stable_unrest_relief_when_clear);
}

export function economyObligationStageOneRelationshipDelta(
  counterpartyKind: EconomyTuningObligationCounterpartyKeyV1,
  state: EconomyTuningObligationStateV1
): EconomyTuningRelationshipDeltaV1 {
  return cloneRelationshipDelta(ECONOMY_FISCAL_TUNING_TABLE.obligations.stage_one_relationship_deltas[counterpartyKind][state]);
}

export function buildEconomyFiscalTuningTableSnapshot(): EconomyFiscalTuningTableSnapshotV1 {
  return {
    schema_version: ECONOMY_FISCAL_TUNING_TABLE_SCHEMA_VERSION,
    sections: [...ECONOMY_FISCAL_TUNING_SECTION_KEYS],
    obligations: {
      settlement_cadence_turns: economyObligationSettlementCadenceTurns(),
      stable_unrest_relief_when_clear: economyStableUnrestReliefWhenClear(),
      stage_one_relationship_deltas: {
        church: {
          clear: economyObligationStageOneRelationshipDelta("church", "clear"),
          arrears: economyObligationStageOneRelationshipDelta("church", "arrears")
        },
        liege: {
          clear: economyObligationStageOneRelationshipDelta("liege", "clear"),
          arrears: economyObligationStageOneRelationshipDelta("liege", "arrears")
        }
      },
      stage_two_placeholder_caps: {
        enterprise_seizure_turn_cap_coin: normalizeNullableInteger(
          ECONOMY_FISCAL_TUNING_TABLE.obligations.stage_two_placeholder_caps.enterprise_seizure_turn_cap_coin
        ),
        forced_church_food_turn_cap: normalizeNullableInteger(
          ECONOMY_FISCAL_TUNING_TABLE.obligations.stage_two_placeholder_caps.forced_church_food_turn_cap
        )
      }
    },
    maintenance: {
      entries: ECONOMY_TUNING_MAINTENANCE_ENTRY_KEYS.map((key) =>
        cloneMaintenanceEntry(
          ECONOMY_FISCAL_TUNING_TABLE.maintenance.entries.find((entry) => entry.key === key) ??
            ECONOMY_FISCAL_TUNING_TABLE.maintenance.entries[0]
        )
      )
    },
    pricing: {
      fixed_sell_cap_bps: normalizePositiveInteger(ECONOMY_FISCAL_TUNING_TABLE.pricing.fixed_sell_cap_bps),
      price_keys: [...ECONOMY_TUNING_PRICE_KEYS],
      price_table: Object.fromEntries(
        ECONOMY_TUNING_PRICE_KEYS.map((priceKey) => [
          priceKey,
          {
            ...ECONOMY_FISCAL_TUNING_TABLE.pricing.price_table[priceKey],
            quote_amount: normalizePositiveInteger(ECONOMY_FISCAL_TUNING_TABLE.pricing.price_table[priceKey].quote_amount),
            base_amount: normalizePositiveInteger(ECONOMY_FISCAL_TUNING_TABLE.pricing.price_table[priceKey].base_amount)
          }
        ])
      ) as EconomyFiscalTuningTableSnapshotV1["pricing"]["price_table"]
    },
    consumption: {
      bushels_per_person_per_year: normalizePositiveInteger(
        ECONOMY_FISCAL_TUNING_TABLE.consumption.bushels_per_person_per_year
      ),
      builder_extra_bushels_per_year: normalizeInteger(
        ECONOMY_FISCAL_TUNING_TABLE.consumption.builder_extra_bushels_per_year
      ),
      turn_years: normalizePositiveInteger(ECONOMY_FISCAL_TUNING_TABLE.consumption.turn_years),
      meat_target_bps: {
        peasant: normalizeInteger(ECONOMY_FISCAL_TUNING_TABLE.consumption.meat_target_bps.peasant),
        court: normalizeInteger(ECONOMY_FISCAL_TUNING_TABLE.consumption.meat_target_bps.court)
      }
    },
    production: {
      turn_years: normalizePositiveInteger(ECONOMY_FISCAL_TUNING_TABLE.production.turn_years),
      hunting: {
        idle_worker_turn_years_divisor: normalizePositiveInteger(
          ECONOMY_FISCAL_TUNING_TABLE.production.hunting.idle_worker_turn_years_divisor
        ),
        martial_bonus_threshold: normalizeInteger(
          ECONOMY_FISCAL_TUNING_TABLE.production.hunting.martial_bonus_threshold
        ),
        martial_bonus_divisor: normalizePositiveInteger(
          ECONOMY_FISCAL_TUNING_TABLE.production.hunting.martial_bonus_divisor
        )
      }
    }
  };
}

export function serializeEconomyFiscalTuningTableSnapshot(
  snapshot: EconomyFiscalTuningTableSnapshotV1 = buildEconomyFiscalTuningTableSnapshot()
): string {
  return JSON.stringify({
    schema_version: snapshot.schema_version,
    sections: [...snapshot.sections],
    obligations: {
      settlement_cadence_turns: snapshot.obligations.settlement_cadence_turns,
      stable_unrest_relief_when_clear: snapshot.obligations.stable_unrest_relief_when_clear,
      stage_one_relationship_deltas: Object.fromEntries(
        [...ECONOMY_TUNING_OBLIGATION_COUNTERPARTY_KEYS].map((counterpartyKind) => [
          counterpartyKind,
          Object.fromEntries(
            [...ECONOMY_TUNING_OBLIGATION_STATES].map((state) => [
              state,
              snapshot.obligations.stage_one_relationship_deltas[counterpartyKind][state]
            ])
          )
        ])
      ),
      stage_two_placeholder_caps: {
        enterprise_seizure_turn_cap_coin: snapshot.obligations.stage_two_placeholder_caps.enterprise_seizure_turn_cap_coin,
        forced_church_food_turn_cap: snapshot.obligations.stage_two_placeholder_caps.forced_church_food_turn_cap
      }
    },
    maintenance: {
      entries: [...snapshot.maintenance.entries]
        .sort((left, right) => compareText(left.key, right.key))
        .map((entry) => cloneMaintenanceEntry(entry))
    },
    pricing: {
      fixed_sell_cap_bps: snapshot.pricing.fixed_sell_cap_bps,
      price_keys: [...snapshot.pricing.price_keys],
      price_table: Object.fromEntries(
        [...snapshot.pricing.price_keys]
          .sort(compareText)
          .map((priceKey) => [priceKey, snapshot.pricing.price_table[priceKey]])
      )
    },
    consumption: {
      bushels_per_person_per_year: snapshot.consumption.bushels_per_person_per_year,
      builder_extra_bushels_per_year: snapshot.consumption.builder_extra_bushels_per_year,
      turn_years: snapshot.consumption.turn_years,
      meat_target_bps: {
        peasant: snapshot.consumption.meat_target_bps.peasant,
        court: snapshot.consumption.meat_target_bps.court
      }
    },
    production: {
      turn_years: snapshot.production.turn_years,
      hunting: {
        idle_worker_turn_years_divisor: snapshot.production.hunting.idle_worker_turn_years_divisor,
        martial_bonus_threshold: snapshot.production.hunting.martial_bonus_threshold,
        martial_bonus_divisor: snapshot.production.hunting.martial_bonus_divisor
      }
    }
  });
}
