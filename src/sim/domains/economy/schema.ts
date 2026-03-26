export const FISCAL_LEDGER_SCHEMA_VERSION = "fiscal_ledger_v1" as const;

export const FISCAL_LEDGER_ASSET_TYPES = [
  "coin",
  "food_stores",
  "meat_stores",
  "service_placeholder"
] as const;

export const FISCAL_LEDGER_RUNTIME_ASSET_PATHS = {
  coin: "manor.coin",
  food_stores: "manor.bushels_stored",
  meat_stores: "manor.meat_stores",
  service_placeholder: null
} as const;

export const FISCAL_LEDGER_TRACKED_RUNTIME_ASSETS = [
  "coin",
  "food_stores",
  "meat_stores"
] as const;

export type FiscalLedgerSchemaVersionV1 = typeof FISCAL_LEDGER_SCHEMA_VERSION;
export type FiscalLedgerAssetV1 = typeof FISCAL_LEDGER_ASSET_TYPES[number];
export type FiscalLedgerTrackedRuntimeAssetV1 = typeof FISCAL_LEDGER_TRACKED_RUNTIME_ASSETS[number];

export type FiscalPaymentModeV1 = FiscalLedgerAssetV1;
export type FiscalPaymentContractIdV1 =
  | "church_due"
  | "liege_due"
  | "extraordinary_levy"
  | "church_offering"
  | "liege_gift";
export type FiscalPaymentContractEntryKindV1 = "obligation" | "offering";
export type FiscalPaymentContractCounterpartyKindV1 = "church" | "liege";
export type FiscalPaymentContractReceiptCategoryV1 =
  | "obligation.church_settlement"
  | "obligation.liege_settlement"
  | "obligation.extraordinary_levy"
  | "offering.church"
  | "gift.liege";
export type FiscalPaymentContractServiceHookV1 = "none" | "placeholder_only";

export interface FiscalAcceptedPaymentContractV1 {
  entry_kind: FiscalPaymentContractEntryKindV1;
  counterparty_kind: FiscalPaymentContractCounterpartyKindV1;
  receipt_category: FiscalPaymentContractReceiptCategoryV1;
  accepted_payment_modes: readonly FiscalPaymentModeV1[];
  preferred_payment_mode: FiscalPaymentModeV1;
  service_hook: FiscalPaymentContractServiceHookV1;
}

export interface FiscalAcceptedPaymentContractSnapshotV1 {
  contract_id: FiscalPaymentContractIdV1;
  entry_kind: FiscalPaymentContractEntryKindV1;
  counterparty_kind: FiscalPaymentContractCounterpartyKindV1;
  receipt_category: FiscalPaymentContractReceiptCategoryV1;
  accepted_payment_modes: FiscalPaymentModeV1[];
  preferred_payment_mode: FiscalPaymentModeV1;
  service_hook: FiscalPaymentContractServiceHookV1;
}

const FISCAL_PAYMENT_MODE_RANK: Readonly<Record<FiscalPaymentModeV1, number>> = {
  coin: 0,
  food_stores: 1,
  meat_stores: 2,
  service_placeholder: 3
};

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function canonicalPaymentModes(modes: readonly FiscalPaymentModeV1[]): FiscalPaymentModeV1[] {
  const deduped = new Set<FiscalPaymentModeV1>(modes);
  return [...deduped].sort((left, right) => {
    const rankDiff = FISCAL_PAYMENT_MODE_RANK[left] - FISCAL_PAYMENT_MODE_RANK[right];
    if (rankDiff !== 0) return rankDiff;
    return compareText(left, right);
  });
}

export const FISCAL_ACCEPTED_PAYMENT_CONTRACTS: Readonly<Record<FiscalPaymentContractIdV1, FiscalAcceptedPaymentContractV1>> = {
  church_due: {
    entry_kind: "obligation",
    counterparty_kind: "church",
    receipt_category: "obligation.church_settlement",
    accepted_payment_modes: ["coin", "food_stores"],
    preferred_payment_mode: "food_stores",
    service_hook: "none"
  },
  liege_due: {
    entry_kind: "obligation",
    counterparty_kind: "liege",
    receipt_category: "obligation.liege_settlement",
    accepted_payment_modes: ["coin", "food_stores", "meat_stores"],
    preferred_payment_mode: "coin",
    service_hook: "none"
  },
  extraordinary_levy: {
    entry_kind: "obligation",
    counterparty_kind: "liege",
    receipt_category: "obligation.extraordinary_levy",
    accepted_payment_modes: ["coin", "food_stores", "meat_stores", "service_placeholder"],
    preferred_payment_mode: "coin",
    service_hook: "placeholder_only"
  },
  church_offering: {
    entry_kind: "offering",
    counterparty_kind: "church",
    receipt_category: "offering.church",
    accepted_payment_modes: ["coin", "food_stores", "meat_stores"],
    preferred_payment_mode: "food_stores",
    service_hook: "none"
  },
  liege_gift: {
    entry_kind: "offering",
    counterparty_kind: "liege",
    receipt_category: "gift.liege",
    accepted_payment_modes: ["coin", "food_stores", "meat_stores"],
    preferred_payment_mode: "coin",
    service_hook: "none"
  }
} as const;

export function acceptedPaymentModesFor(contractId: FiscalPaymentContractIdV1): FiscalPaymentModeV1[] {
  return canonicalPaymentModes(FISCAL_ACCEPTED_PAYMENT_CONTRACTS[contractId].accepted_payment_modes);
}

export function isPaymentModeAccepted(contractId: FiscalPaymentContractIdV1, paymentMode: FiscalPaymentModeV1): boolean {
  return acceptedPaymentModesFor(contractId).includes(paymentMode);
}

export function toAcceptedPaymentContractSnapshot(
  contractId: FiscalPaymentContractIdV1,
  contract: FiscalAcceptedPaymentContractV1 = FISCAL_ACCEPTED_PAYMENT_CONTRACTS[contractId]
): FiscalAcceptedPaymentContractSnapshotV1 {
  return {
    contract_id: contractId,
    entry_kind: contract.entry_kind,
    counterparty_kind: contract.counterparty_kind,
    receipt_category: contract.receipt_category,
    accepted_payment_modes: canonicalPaymentModes(contract.accepted_payment_modes),
    preferred_payment_mode: contract.preferred_payment_mode,
    service_hook: contract.service_hook
  };
}

export function buildAcceptedPaymentContractSnapshot(
  contracts: Readonly<Record<FiscalPaymentContractIdV1, FiscalAcceptedPaymentContractV1>> = FISCAL_ACCEPTED_PAYMENT_CONTRACTS
): FiscalAcceptedPaymentContractSnapshotV1[] {
  return Object.keys(contracts)
    .sort(compareText)
    .map((contractId) => toAcceptedPaymentContractSnapshot(contractId as FiscalPaymentContractIdV1, contracts[contractId as FiscalPaymentContractIdV1]));
}

export function serializeAcceptedPaymentContractSnapshot(
  contracts: Readonly<Record<FiscalPaymentContractIdV1, FiscalAcceptedPaymentContractV1>> = FISCAL_ACCEPTED_PAYMENT_CONTRACTS
): string {
  return JSON.stringify(buildAcceptedPaymentContractSnapshot(contracts));
}
