import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { coinBalance, foodStoreBalance, meatStoreBalance } from "../../src/sim/domains/economy/ledger";
import {
  MARRIAGE_SETTLEMENT_APPLY_RESULT_SCHEMA_VERSION,
  MARRIAGE_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION,
  applyMarriageSettlementScaffold,
  makeMarriageSettlementScaffold
} from "../../src/sim/domains/economy/marriageSettlement";

describe("marriage settlement economy seam", () => {
  it("builds deterministic dowry scaffolds with canonical asset ordering", () => {
    const scaffold = makeMarriageSettlementScaffold({
      phase: "marriage",
      phase_sequence: 4,
      settlement_kind: "dowry",
      counterparty_id: "house:h_ashford",
      counterparty_label: "House Ashford",
      subject_person_id: "p_subject",
      candidate_person_id: "p_candidate",
      requested_delta_by_asset: {
        meat_stores: -1,
        coin: -3,
        food_stores: -2
      },
      related_actor_ids: ["p_candidate", "p_subject", "p_candidate"]
    });

    expect(scaffold).toEqual({
      schema_version: MARRIAGE_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION,
      scaffold_id: "marriage_settlement:dowry:marriage:p4:house:h_ashford:p_subject:p_candidate",
      phase: "marriage",
      phase_sequence: 4,
      settlement_kind: "dowry",
      category: "marriage.dowry_settlement",
      counterparty_kind: "household",
      counterparty_id: "house:h_ashford",
      counterparty_label: "House Ashford",
      subject_person_id: "p_subject",
      candidate_person_id: "p_candidate",
      asset_order: ["coin", "food_stores", "meat_stores"],
      requested_delta_by_asset: {
        coin: -3,
        food_stores: -2,
        meat_stores: -1
      },
      rule_prefix: "marriage.dowry_settlement",
      related_actor_ids: ["p_candidate", "p_subject"]
    });
  });

  it("applies dowry placeholders through canonical receipt-backed ledger writes for coin, food, and meat", () => {
    const state = createNewRun("marriage_settlement_dowry_v035");
    state.turn_index = 4;
    state.manor.coin = 5;
    state.manor.bushels_stored = 6;
    (state.manor as any).meat_stores = 1;

    const result = applyMarriageSettlementScaffold(
      state,
      makeMarriageSettlementScaffold({
        phase: "marriage",
        phase_sequence: 6,
        settlement_kind: "dowry",
        counterparty_id: "house:h_ashford",
        counterparty_label: "House Ashford",
        subject_person_id: "p_subject",
        candidate_person_id: "p_candidate",
        requested_delta_by_asset: {
          coin: -3,
          food_stores: -2,
          meat_stores: -2
        }
      })
    );

    expect(result.schema_version).toBe(MARRIAGE_SETTLEMENT_APPLY_RESULT_SCHEMA_VERSION);
    expect(result.asset_order).toEqual(["coin", "food_stores", "meat_stores"]);
    expect(result.applied_by_asset).toEqual({
      coin: {
        asset: "coin",
        requested_delta: -3,
        applied_delta: -3,
        shortfall_amount: 0,
        rule_id: "marriage.dowry_settlement.coin"
      },
      food_stores: {
        asset: "food_stores",
        requested_delta: -2,
        applied_delta: -2,
        shortfall_amount: 0,
        rule_id: "marriage.dowry_settlement.food_stores"
      },
      meat_stores: {
        asset: "meat_stores",
        requested_delta: -2,
        applied_delta: -1,
        shortfall_amount: 1,
        rule_id: "marriage.dowry_settlement.meat_stores"
      }
    });
    expect(result.receipt_snapshots.map((receipt) => ({
      category: receipt.category,
      asset: receipt.asset,
      delta: receipt.delta,
      rule_id: receipt.rule_id,
      counterparty_id: receipt.counterparty_id
    }))).toEqual([
      {
        category: "marriage.dowry_settlement",
        asset: "coin",
        delta: -3,
        rule_id: "marriage.dowry_settlement.coin",
        counterparty_id: "house:h_ashford"
      },
      {
        category: "marriage.dowry_settlement",
        asset: "food_stores",
        delta: -2,
        rule_id: "marriage.dowry_settlement.food_stores",
        counterparty_id: "house:h_ashford"
      },
      {
        category: "marriage.dowry_settlement",
        asset: "meat_stores",
        delta: -1,
        rule_id: "marriage.dowry_settlement.meat_stores",
        counterparty_id: "house:h_ashford"
      }
    ]);
    expect(coinBalance(state)).toBe(2);
    expect(foodStoreBalance(state)).toBe(4);
    expect(meatStoreBalance(state)).toBe(0);
  });

  it("records dower placeholders deterministically when assets flow back into the manor", () => {
    const state = createNewRun("marriage_settlement_dower_v035");
    state.turn_index = 4;
    state.manor.coin = 2;
    state.manor.bushels_stored = 3;
    (state.manor as any).meat_stores = 1;

    const result = applyMarriageSettlementScaffold(
      state,
      makeMarriageSettlementScaffold({
        phase: "marriage",
        phase_sequence: 7,
        settlement_kind: "dower",
        counterparty_id: "house:h_marsh",
        counterparty_label: "House Marsh",
        subject_person_id: "p_subject",
        candidate_person_id: "p_candidate",
        requested_delta_by_asset: {
          coin: 2,
          food_stores: 1,
          meat_stores: 1
        }
      })
    );

    expect(result.receipt_snapshots.map((receipt) => ({
      category: receipt.category,
      asset: receipt.asset,
      delta: receipt.delta,
      rule_id: receipt.rule_id
    }))).toEqual([
      {
        category: "marriage.dower_settlement",
        asset: "coin",
        delta: 2,
        rule_id: "marriage.dower_settlement.coin"
      },
      {
        category: "marriage.dower_settlement",
        asset: "food_stores",
        delta: 1,
        rule_id: "marriage.dower_settlement.food_stores"
      },
      {
        category: "marriage.dower_settlement",
        asset: "meat_stores",
        delta: 1,
        rule_id: "marriage.dower_settlement.meat_stores"
      }
    ]);
    expect(coinBalance(state)).toBe(4);
    expect(foodStoreBalance(state)).toBe(4);
    expect(meatStoreBalance(state)).toBe(2);
  });
});
