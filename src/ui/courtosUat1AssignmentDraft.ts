/**
 * UAT-1 assignment drafts are player-authored working material, never an
 * authority mutation. They live separately from admitted House records and
 * are deliberately small enough to be replaced by the Track-2 submitted-plan
 * boundary without migrating any invented execution semantics.
 */
export const COURTOS_UAT1_ASSIGNMENT_DRAFT_SCHEMA_VERSION =
  "courtos_uat1_assignment_draft_v1" as const;
export const COURTOS_UAT1_PLANNING_HORIZON = Object.freeze({
  starts_at: "1120-01-01",
  ends_at: "1122-12-31",
} as const);

export interface CourtOsUat1AssignmentDraftV1 {
  schema_version: typeof COURTOS_UAT1_ASSIGNMENT_DRAFT_SCHEMA_VERSION;
  house_id: string;
  responsibility_id: string;
  acting_actor_person_id: string;
  source_generation_id: string;
  effective_date: "1120-01-01";
  planning_horizon: typeof COURTOS_UAT1_PLANNING_HORIZON;
  current_holder_person_id: string | null;
  proposed_holder_person_id: string;
  proposed_holder_display_name: string;
  version: number;
  saved_at: string;
}

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type AssignmentDraftReadKey = Pick<
  CourtOsUat1AssignmentDraftV1,
  "house_id" | "responsibility_id"
> & {
  source_generation_id?: string;
  effective_date?: CourtOsUat1AssignmentDraftV1["effective_date"];
};

function storageKey(input: Pick<CourtOsUat1AssignmentDraftV1, "house_id" | "responsibility_id">): string {
  return `merecross.courtos.uat1.assignment-draft:${input.house_id}:${input.responsibility_id}`;
}

function isDraft(value: unknown): value is CourtOsUat1AssignmentDraftV1 {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<CourtOsUat1AssignmentDraftV1>;
  return (
    draft.schema_version === COURTOS_UAT1_ASSIGNMENT_DRAFT_SCHEMA_VERSION &&
    typeof draft.house_id === "string" &&
    typeof draft.responsibility_id === "string" &&
    typeof draft.acting_actor_person_id === "string" &&
    typeof draft.source_generation_id === "string" &&
    draft.effective_date === "1120-01-01" &&
    draft.planning_horizon?.starts_at === COURTOS_UAT1_PLANNING_HORIZON.starts_at &&
    draft.planning_horizon.ends_at === COURTOS_UAT1_PLANNING_HORIZON.ends_at &&
    (typeof draft.current_holder_person_id === "string" || draft.current_holder_person_id === null) &&
    typeof draft.proposed_holder_person_id === "string" &&
    typeof draft.proposed_holder_display_name === "string" &&
    Number.isInteger(draft.version) &&
    (draft.version ?? 0) > 0 &&
    typeof draft.saved_at === "string"
  );
}

export function readCourtOsUat1AssignmentDraft(
  storage: BrowserStorage,
  input: AssignmentDraftReadKey,
): CourtOsUat1AssignmentDraftV1 | null {
  try {
    const raw = storage.getItem(storageKey(input));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      !isDraft(value) ||
      value.house_id !== input.house_id ||
      value.responsibility_id !== input.responsibility_id
    ) {
      return null;
    }
    if (
      input.source_generation_id &&
      value.source_generation_id !== input.source_generation_id
    ) {
      return null;
    }
    if (input.effective_date && value.effective_date !== input.effective_date) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function saveCourtOsUat1AssignmentDraft(
  storage: BrowserStorage,
  input: Omit<CourtOsUat1AssignmentDraftV1, "schema_version" | "version" | "saved_at">,
  now: Date = new Date(),
): CourtOsUat1AssignmentDraftV1 {
  const prior = readCourtOsUat1AssignmentDraft(storage, input);
  const draft: CourtOsUat1AssignmentDraftV1 = {
    ...input,
    schema_version: COURTOS_UAT1_ASSIGNMENT_DRAFT_SCHEMA_VERSION,
    version: (prior?.version ?? 0) + 1,
    saved_at: now.toISOString(),
  };
  storage.setItem(storageKey(input), JSON.stringify(draft));
  return draft;
}

export function discardCourtOsUat1AssignmentDraft(
  storage: BrowserStorage,
  input: Pick<CourtOsUat1AssignmentDraftV1, "house_id" | "responsibility_id">,
): void {
  storage.removeItem(storageKey(input));
}
