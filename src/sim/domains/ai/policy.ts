import type { EvidenceCategoryV0, RunState } from "../../types";
import { buildBeliefPayloadForSubject } from "./beliefs";

export type PolicyHookV0 = "marriage_offer" | "prospect";

export interface PolicyIntelSummaryV0 {
  subject_id: string;
  known_count: number;
  likely_count: number;
  possible_count: number;
  latest_turn_index: number | null;
  categories: EvidenceCategoryV0[];
}

function sortedUniqueCategories(categories: EvidenceCategoryV0[]): EvidenceCategoryV0[] {
  return [...new Set(categories)].sort((a, b) => a.localeCompare(b));
}

export function summarizeBeliefsForSubject(state: RunState, subjectId: string): PolicyIntelSummaryV0 {
  const payload = buildBeliefPayloadForSubject(state, subjectId);
  const categories: EvidenceCategoryV0[] = [
    ...payload.states.known.categories,
    ...payload.states.likely.categories,
    ...payload.states.possible.categories
  ];

  return {
    subject_id: subjectId,
    known_count: payload.states.known.observation_count,
    likely_count: payload.states.likely.observation_count,
    possible_count: payload.states.possible.observation_count,
    latest_turn_index: payload.latest_turn_index,
    categories: sortedUniqueCategories(categories)
  };
}

export function buildPolicyIntelMap(state: RunState, subjectIds: Array<string | null | undefined>): Record<string, PolicyIntelSummaryV0> {
  const map: Record<string, PolicyIntelSummaryV0> = {};
  const ids = [...new Set(subjectIds.filter((subjectId): subjectId is string => typeof subjectId === "string" && subjectId.length > 0))]
    .sort((a, b) => a.localeCompare(b));

  for (const subjectId of ids) {
    map[subjectId] = summarizeBeliefsForSubject(state, subjectId);
  }

  return map;
}

function readPolicyTuningScale(
  state: RunState | undefined,
  key: "ai_marriage_intel_bonus_scale" | "ai_prospect_intel_bonus_scale",
  fallback = 1
): number {
  const anyFlags: any = state?.flags as any;
  const raw = anyFlags?._tuning?.[key];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(0, raw);
}

function marriageIntelBonus(intel: PolicyIntelSummaryV0): number {
  const confidenceBonus = intel.known_count * 0.25 + intel.likely_count * 0.1 - intel.possible_count * 0.05;
  const categoryBonus =
    (intel.categories.includes("marriage") ? 0.15 : 0) +
    (intel.categories.includes("prospects") ? 0.05 : 0);
  return Math.max(-0.25, Math.min(0.75, confidenceBonus + categoryBonus));
}

function prospectIntelBonus(intel: PolicyIntelSummaryV0): number {
  const confidenceBonus = intel.known_count * 0.12 + intel.likely_count * 0.06 - intel.possible_count * 0.03;
  const categoryBonus =
    (intel.categories.includes("prospects") ? 0.12 : 0) +
    (intel.categories.includes("marriage") ? 0.04 : 0);
  return Math.max(-0.15, Math.min(0.4, confidenceBonus + categoryBonus));
}

export function npcPolicyScore(args: {
  hook: PolicyHookV0;
  base_score: number;
  intel?: PolicyIntelSummaryV0 | null;
  state?: RunState;
  subject_id?: string | null;
}): number {
  const intel =
    args.intel ??
    (args.state && typeof args.subject_id === "string" && args.subject_id.length > 0
      ? summarizeBeliefsForSubject(args.state, args.subject_id)
      : null);

  if (args.hook === "marriage_offer" && intel) {
    // v0.3 activation: beliefs can break close marriage-offer ties, but the cap keeps
    // the hook from overwhelming the existing economic/relationship base score.
    const scale = readPolicyTuningScale(args.state, "ai_marriage_intel_bonus_scale");
    return args.base_score + marriageIntelBonus(intel) * scale;
  }

  if (args.hook === "prospect" && intel) {
    const scale = readPolicyTuningScale(args.state, "ai_prospect_intel_bonus_scale");
    return args.base_score + prospectIntelBonus(intel) * scale;
  }

  return args.base_score;
}
