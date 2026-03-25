import type { EvidenceEventV0, PhaseLogEventV0, PhaseNameV0, PhaseReceiptV0, PhaseResultV0 } from "../types";

export function makePhaseReceipt(line: string, kind: PhaseReceiptV0["kind"] = "summary"): PhaseReceiptV0 {
  return { kind, line };
}

export function makePhaseLogEvent(kind: string, detail: string): PhaseLogEventV0 {
  return { kind, detail };
}

export function makePhaseResult(args: {
  phase: PhaseNameV0;
  receipts?: PhaseReceiptV0[];
  log_events?: PhaseLogEventV0[];
  evidence_events_v0?: EvidenceEventV0[];
  rng_keys_used?: string[];
  patch?: null;
}): PhaseResultV0 {
  return {
    phase: args.phase,
    receipts: args.receipts ?? [],
    log_events: args.log_events ?? [],
    evidence_events_v0: args.evidence_events_v0 ?? [],
    rng_keys_used: args.rng_keys_used ?? [],
    patch: args.patch
  };
}
