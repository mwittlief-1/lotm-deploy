import type { BeliefObservationV0, EvidenceConfidenceV0, RunState, TurnContext } from "../sim/types";

export type IntelEntry = {
  id: string;
  subject_id: string;
  subject_label: string;
  detail: string;
  source_label: string;
  why_it_matters: string;
  confidence: EvidenceConfidenceV0;
  category: string;
  phase: string;
  turn_index: number;
  source: "current" | "memory";
};

function confidenceRank(confidence: EvidenceConfidenceV0): number {
  if (confidence === "known") return 0;
  if (confidence === "likely") return 1;
  return 2;
}

function phaseRank(phase: string): number {
  const order = [
    "obligations",
    "demography",
    "succession",
    "consumption",
    "events",
    "marriage",
    "prospects",
    "labor",
    "sell",
    "construction"
  ];
  const idx = order.indexOf(phase);
  return idx >= 0 ? idx : order.length;
}

function personLabel(state: RunState, subjectId: string): string {
  const people: any = (state as any)?.people;
  const person = people && typeof people === "object" ? people[subjectId] : null;
  const name = typeof person?.name === "string" ? person.name.trim() : "";
  return name || subjectId;
}

function formatToken(value: string | null | undefined): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "Unknown";
  return token
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatManorLabel(manorId: string | null): string {
  if (!manorId) return "Unmapped";
  const match = manorId.match(/hx_(\d+)/);
  return match ? `Hx ${match[1]}` : manorId;
}

function readPersonCardContext(state: RunState, subjectId: string): { currentHouseLabel: string | null; residenceLabel: string | null } {
  const registry: any = (state as any)?.person_card_registry;
  const entry = registry?.entries_by_person_id?.[subjectId];
  if (!entry || typeof entry !== "object") return { currentHouseLabel: null, residenceLabel: null };

  const currentHouseName =
    typeof entry.current_house_name === "string" && entry.current_house_name.trim().length > 0
      ? entry.current_house_name.trim()
      : typeof entry.current_house_id === "string" && entry.current_house_id.trim().length > 0
        ? entry.current_house_id.trim()
        : null;
  const currentHouseLabel = currentHouseName
    ? entry.current_house_id === (state as any)?.player_house_id
      ? "Player house"
      : `House ${currentHouseName}`
    : null;
  const residenceLabel =
    typeof entry?.residence_binding?.residence_manor_id === "string"
      ? formatManorLabel(entry.residence_binding.residence_manor_id)
      : null;

  return { currentHouseLabel, residenceLabel };
}

function sourceLabelForIntel(entry: Pick<IntelEntry, "source" | "phase" | "turn_index">): string {
  if (entry.source === "current") return `${formatToken(entry.phase)} phase · current turn`;
  return `${formatToken(entry.phase)} memory · turn ${entry.turn_index}`;
}

function whyItMatters(state: RunState, subjectId: string, category: string, source: IntelEntry["source"]): string {
  const context = readPersonCardContext(state, subjectId);
  const contextParts = [
    context.currentHouseLabel ? context.currentHouseLabel : null,
    context.residenceLabel ? `Residence ${context.residenceLabel}` : null,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  const base =
    category === "marriage"
      ? "Marriage intel matters because it can change alliance reach, court membership, and who becomes a live tie between houses."
      : category === "prospects"
        ? "Prospect intel matters because it explains why this subject is surfacing in the current decision window."
        : source === "current"
          ? "Current-turn intel matters because it records what just entered the bounded sim surface."
          : "Stored intel matters because it keeps earlier evidence available for later comparison.";

  return contextParts.length > 0 ? `${base} Context: ${contextParts.join(" · ")}.` : base;
}

function sortIntelEntries(a: IntelEntry, b: IntelEntry): number {
  if (a.turn_index !== b.turn_index) return b.turn_index - a.turn_index;
  const conf = confidenceRank(a.confidence) - confidenceRank(b.confidence);
  if (conf !== 0) return conf;
  const phase = phaseRank(a.phase) - phaseRank(b.phase);
  if (phase !== 0) return phase;
  const subject = a.subject_label.localeCompare(b.subject_label);
  if (subject !== 0) return subject;
  const detail = a.detail.localeCompare(b.detail);
  if (detail !== 0) return detail;
  return a.id.localeCompare(b.id);
}

function currentTurnIntelEntries(state: RunState, ctx: TurnContext): IntelEntry[] {
  const phaseResults = Array.isArray(ctx.phase_results_v0) ? ctx.phase_results_v0 : [];
  const entries: IntelEntry[] = [];

  for (const phaseResult of phaseResults) {
    for (const event of phaseResult.evidence_events_v0 ?? []) {
      const subjectIds = Array.isArray(event.subject_ids) ? event.subject_ids : [];
      for (const subjectId of subjectIds) {
        entries.push({
          id: `current|${phaseResult.phase}|${subjectId}|${event.kind}|${event.detail}`,
          subject_id: subjectId,
          subject_label: personLabel(ctx.preview_state, subjectId),
          detail: event.detail,
          source_label: sourceLabelForIntel({
            source: "current",
            phase: phaseResult.phase,
            turn_index: ctx.report.turn_index,
          }),
          why_it_matters: whyItMatters(ctx.preview_state, subjectId, event.category, "current"),
          confidence: event.confidence,
          category: event.category,
          phase: phaseResult.phase,
          turn_index: ctx.report.turn_index,
          source: "current"
        });
      }
    }
  }

  return entries.sort(sortIntelEntries);
}

function memoryIntelEntries(state: RunState): IntelEntry[] {
  const beliefs: any = (state as any)?.beliefs;
  const bySubject: Record<string, BeliefObservationV0[]> =
    beliefs && typeof beliefs === "object" && beliefs.by_subject && typeof beliefs.by_subject === "object" && !Array.isArray(beliefs.by_subject)
      ? beliefs.by_subject
      : {};

  const entries: IntelEntry[] = [];
  for (const subjectId of Object.keys(bySubject).sort((a, b) => a.localeCompare(b))) {
    const observations = Array.isArray(bySubject[subjectId]) ? bySubject[subjectId] : [];
    for (const observation of observations) {
      entries.push({
        id: `memory|${observation.turn_index}|${observation.phase}|${subjectId}|${observation.kind}|${observation.detail}`,
        subject_id: subjectId,
        subject_label: personLabel(state, subjectId),
        detail: observation.detail,
        source_label: sourceLabelForIntel({
          source: "memory",
          phase: observation.phase,
          turn_index: observation.turn_index,
        }),
        why_it_matters: whyItMatters(state, subjectId, observation.category, "memory"),
        confidence: observation.confidence,
        category: observation.category,
        phase: observation.phase,
        turn_index: observation.turn_index,
        source: "memory"
      });
    }
  }

  return entries.sort(sortIntelEntries);
}

export function buildIntelSections(args: {
  state: RunState;
  ctx: TurnContext;
  currentLimit?: number;
  memoryLimit?: number;
}): { current: IntelEntry[]; memory: IntelEntry[] } {
  const currentLimit = typeof args.currentLimit === "number" ? Math.max(0, Math.trunc(args.currentLimit)) : 8;
  const memoryLimit = typeof args.memoryLimit === "number" ? Math.max(0, Math.trunc(args.memoryLimit)) : 8;

  return {
    current: currentTurnIntelEntries(args.state, args.ctx).slice(0, currentLimit),
    memory: memoryIntelEntries(args.state).slice(0, memoryLimit)
  };
}
