import { describe, expect, it } from "vitest";

import { FISCAL_RECEIPT_RUNTIME_ASSET_PATHS } from "../../src/sim/domains/economy/receipts";
import {
  FISCAL_ACCEPTED_PAYMENT_CONTRACTS,
  FISCAL_LEDGER_ASSET_TYPES,
  FISCAL_LEDGER_RUNTIME_ASSET_PATHS,
  FISCAL_LEDGER_SCHEMA_VERSION,
  acceptedPaymentModesFor,
  buildAcceptedPaymentContractSnapshot,
  isPaymentModeAccepted,
  serializeAcceptedPaymentContractSnapshot,
  toAcceptedPaymentContractSnapshot,
  type FiscalAcceptedPaymentContractV1,
  type FiscalPaymentContractIdV1
} from "../../src/sim/domains/economy/schema";

describe("fiscal ledger schema contract", () => {
  it("locks the multi-asset ledger table and shared runtime asset mapping", () => {
    expect(FISCAL_LEDGER_SCHEMA_VERSION).toBe("fiscal_ledger_v1");
    expect(FISCAL_LEDGER_ASSET_TYPES).toEqual([
      "coin",
      "food_stores",
      "meat_stores",
      "service_placeholder"
    ]);
    expect(FISCAL_LEDGER_RUNTIME_ASSET_PATHS).toEqual({
      coin: "manor.coin",
      food_stores: "manor.bushels_stored",
      meat_stores: "manor.meat_stores",
      service_placeholder: null
    });

    expect(FISCAL_RECEIPT_RUNTIME_ASSET_PATHS.coin).toBe(FISCAL_LEDGER_RUNTIME_ASSET_PATHS.coin);
    expect(FISCAL_RECEIPT_RUNTIME_ASSET_PATHS.food_stores).toBe(FISCAL_LEDGER_RUNTIME_ASSET_PATHS.food_stores);
    expect(FISCAL_RECEIPT_RUNTIME_ASSET_PATHS.meat_stores).toBe(FISCAL_LEDGER_RUNTIME_ASSET_PATHS.meat_stores);
  });

  it("makes accepted payment modes explicit for obligations and offerings", () => {
    expect(acceptedPaymentModesFor("church_due")).toEqual(["coin", "food_stores"]);
    expect(acceptedPaymentModesFor("liege_due")).toEqual(["coin", "food_stores", "meat_stores"]);
    expect(acceptedPaymentModesFor("extraordinary_levy")).toEqual([
      "coin",
      "food_stores",
      "meat_stores",
      "service_placeholder"
    ]);
    expect(acceptedPaymentModesFor("church_offering")).toEqual(["coin", "food_stores", "meat_stores"]);
    expect(acceptedPaymentModesFor("liege_gift")).toEqual(["coin", "food_stores", "meat_stores"]);

    expect(isPaymentModeAccepted("extraordinary_levy", "service_placeholder")).toBe(true);
    expect(isPaymentModeAccepted("church_offering", "service_placeholder")).toBe(false);
  });

  it("canonicalizes payment mode ordering for snapshots", () => {
    const custom: FiscalAcceptedPaymentContractV1 = {
      entry_kind: "obligation",
      counterparty_kind: "liege",
      receipt_category: "obligation.extraordinary_levy",
      accepted_payment_modes: ["meat_stores", "coin", "service_placeholder", "food_stores", "coin"],
      preferred_payment_mode: "coin",
      service_hook: "placeholder_only"
    };

    expect(toAcceptedPaymentContractSnapshot("extraordinary_levy", custom)).toEqual({
      contract_id: "extraordinary_levy",
      entry_kind: "obligation",
      counterparty_kind: "liege",
      receipt_category: "obligation.extraordinary_levy",
      accepted_payment_modes: ["coin", "food_stores", "meat_stores", "service_placeholder"],
      preferred_payment_mode: "coin",
      service_hook: "placeholder_only"
    });
  });

  it("serializes the same contract snapshot regardless of record insertion order", () => {
    const contractsA = {
      liege_gift: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.liege_gift,
      church_due: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.church_due,
      extraordinary_levy: {
        ...FISCAL_ACCEPTED_PAYMENT_CONTRACTS.extraordinary_levy,
        accepted_payment_modes: ["service_placeholder", "coin", "meat_stores", "food_stores"]
      },
      liege_due: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.liege_due,
      church_offering: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.church_offering
    } satisfies Record<FiscalPaymentContractIdV1, FiscalAcceptedPaymentContractV1>;

    const contractsB = {
      church_offering: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.church_offering,
      liege_due: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.liege_due,
      church_due: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.church_due,
      liege_gift: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.liege_gift,
      extraordinary_levy: FISCAL_ACCEPTED_PAYMENT_CONTRACTS.extraordinary_levy
    } satisfies Record<FiscalPaymentContractIdV1, FiscalAcceptedPaymentContractV1>;

    expect(serializeAcceptedPaymentContractSnapshot(contractsA)).toBe(serializeAcceptedPaymentContractSnapshot(contractsB));
    expect(buildAcceptedPaymentContractSnapshot().map((entry) => entry.contract_id)).toEqual([
      "church_due",
      "church_offering",
      "extraordinary_levy",
      "liege_due",
      "liege_gift"
    ]);
  });
});
