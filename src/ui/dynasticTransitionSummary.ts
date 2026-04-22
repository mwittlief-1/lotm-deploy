import type { RunState } from "../sim/types";

type DynasticTransitionKind = "birth" | "death" | "marriage";
type DynasticTransitionSource = "household_demography" | "world_noble_demography";

type DynasticTransitionFactV1 = {
  kind: DynasticTransitionKind;
  person_id: string | null;
  person_name: string;
  house_id: string | null;
  house_label: string | null;
  year: number | null;
  source: DynasticTransitionSource;
  summary: string;
};

type DynasticTransitionFactsRecordV1 = {
  schema_version: "dynastic_transition_facts_v1";
  turn_index: number;
  facts: DynasticTransitionFactV1[];
  omitted_count?: number;
};

type DynasticTransitionSurfaceArgs = {
  currentHouseLog?: any[];
  previewState: RunState;
  report?: any;
};

export type DynasticTransitionSurface = {
  headline: string;
  helperText: string;
  items: string[];
  omittedNote: string | null;
};

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function readDynasticTransitionFacts(previewState: RunState): DynasticTransitionFactsRecordV1 | null {
  const raw = (previewState as any)?.flags?._dynastic_transition_facts_v1;
  if (!raw || typeof raw !== "object") return null;
  if (raw.schema_version !== "dynastic_transition_facts_v1") return null;
  if (!Array.isArray(raw.facts)) return null;
  return raw as DynasticTransitionFactsRecordV1;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function marriageLogSummary(entry: any): string | null {
  if (!entry || typeof entry !== "object") return null;
  const kind = readString(entry.kind);
  if (!kind || !["marriage", "marriage_arranged", "marriage_resolved"].includes(kind)) return null;

  const childName =
    readString(entry.child_name) ??
    readString(entry.person_name) ??
    readString(entry.subject_person_name);
  const spouseName = readString(entry.spouse_name);
  const otherHouseName =
    readString(entry.other_house_name) ??
    readString(entry.otherHouseName);

  if (childName && spouseName) return `${childName} married ${spouseName}.`;
  if (childName && otherHouseName) return `${childName} married into House ${otherHouseName}.`;
  if (childName) return `${childName} married.`;
  return null;
}

function countByKind(items: Array<{ kind: DynasticTransitionKind }>): Record<DynasticTransitionKind, number> {
  return items.reduce<Record<DynasticTransitionKind, number>>(
    (counts, item) => {
      counts[item.kind] += 1;
      return counts;
    },
    { birth: 0, death: 0, marriage: 0 }
  );
}

function buildHeadline(
  counts: Record<DynasticTransitionKind, number>,
  populationDelta: number | null
): string | null {
  if (populationDelta !== null && populationDelta !== 0) {
    const direction = populationDelta > 0 ? "grew" : "fell";
    return `Household size ${direction} by ${Math.abs(populationDelta)} this turn.`;
  }

  const parts = [
    counts.birth > 0 ? pluralize(counts.birth, "birth") : null,
    counts.death > 0 ? pluralize(counts.death, "death") : null,
    counts.marriage > 0 ? pluralize(counts.marriage, "marriage") : null
  ].filter((part): part is string => part !== null);

  if (!parts.length) return null;
  return `Dynastic changes this turn: ${parts.join(", ")}.`;
}

export function buildDynasticTransitionSurface({
  currentHouseLog = [],
  previewState,
  report
}: DynasticTransitionSurfaceArgs): DynasticTransitionSurface | null {
  const factsRecord = readDynasticTransitionFacts(previewState);
  const factItems = (factsRecord?.facts ?? [])
    .filter((fact): fact is DynasticTransitionFactV1 => Boolean(fact && typeof fact === "object" && typeof fact.summary === "string"))
    .map((fact) => ({
      kind: fact.kind,
      summary: fact.summary
    }));
  const marriageItems = currentHouseLog
    .map((entry) => marriageLogSummary(entry))
    .filter((summary): summary is string => summary !== null)
    .map((summary) => ({
      kind: "marriage" as const,
      summary
    }));

  const combinedItems = [...factItems, ...marriageItems];
  if (!combinedItems.length) return null;

  const counts = countByKind(combinedItems);
  const populationDelta =
    typeof report?.household?.population_delta === "number" && Number.isFinite(report.household.population_delta)
      ? Math.trunc(report.household.population_delta)
      : null;
  const headline = buildHeadline(counts, populationDelta);
  if (!headline) return null;

  const visibleItems = combinedItems.slice(0, 4).map((item) => item.summary);
  const hiddenCount = Math.max(0, combinedItems.length - visibleItems.length);
  const omittedCount = Math.max(0, Math.trunc(Number(factsRecord?.omitted_count ?? 0) || 0));
  const moreCount = hiddenCount + omittedCount;

  return {
    headline,
    helperText: "Source-backed household and nearby dynastic changes for the resolved turn.",
    items: visibleItems,
    omittedNote: moreCount > 0 ? `${pluralize(moreCount, "additional dynastic change")} remained off the main list.` : null
  };
}
