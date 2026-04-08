import type { RunState } from "../../types";
import { type BeliefPayloadRegistryV1, buildBeliefPayloadRegistryView } from "./beliefs";
import { type DomainEvidenceLogV1, readRuntimeDomainEvidence } from "./evidence";
import { type PolicyHookDebugV1, buildPolicyHookDebugView } from "./policy";

export const AI_RAIL_DEBUG_PACKET_SCHEMA_VERSION = "ai_rail_debug_packet_v1" as const;
export const AI_RAIL_DEBUG_READ_MODE = "read_only" as const;

export interface AIRailDebugPacketV1 {
  schema_version: typeof AI_RAIL_DEBUG_PACKET_SCHEMA_VERSION;
  turn_index: number;
  read_mode: typeof AI_RAIL_DEBUG_READ_MODE;
  beliefs: BeliefPayloadRegistryV1;
  current_evidence: DomainEvidenceLogV1;
  policy_hooks: PolicyHookDebugV1;
}

export function buildAiRailDebugPacket(state: RunState): AIRailDebugPacketV1 {
  return {
    schema_version: AI_RAIL_DEBUG_PACKET_SCHEMA_VERSION,
    turn_index: state.turn_index,
    read_mode: AI_RAIL_DEBUG_READ_MODE,
    beliefs: buildBeliefPayloadRegistryView(state),
    current_evidence: readRuntimeDomainEvidence(state),
    policy_hooks: buildPolicyHookDebugView(state)
  };
}
