import { allHouseMemberIds, playerHouseIdOf, registryPersonFor } from "../../actors";
import { getChildren, getParents } from "../../kinship";
import type { Person, Prospect, RunState } from "../../types";

const SUCCESSION_MIN_AGE = 15;
const DEFAULT_SUCCESSION_LINE_LIMIT = 16;
const DEFAULT_CLAIMANT_REGISTRY_LIMIT = 8;
const DEFAULT_INHERITANCE_CLAIM_PREVIEW_LIMIT = 3;

export const SUCCESSION_LINE_SCHEMA_VERSION = "succession_line_v0" as const;
export const CLAIMANT_REGISTRY_SCHEMA_VERSION = "claimant_registry_v0" as const;
export const INHERITANCE_CLAIM_PROSPECT_METADATA_SCHEMA_VERSION = "inheritance_claim_prospect_meta_v0" as const;

export type SuccessionBasisKind =
  | "direct_descendant"
  | "collateral_male_line"
  | "household_member_fallback";

export type SuccessionRelationGroup =
  | "son_branch"
  | "daughter_branch"
  | "collateral_branch"
  | "fallback_household";

export type SuccessionLineEntry = {
  person_id: string;
  line_position: number;
  basis_kind: SuccessionBasisKind;
  relation_group: SuccessionRelationGroup;
  branch_root_id: string | null;
  ancestor_id: string | null;
  ancestor_depth: number;
  branch_depth: number;
  sex: "M" | "F" | null;
  age: number | null;
  adult_eligible: boolean;
};

export type SuccessionLine = {
  schema_version: typeof SUCCESSION_LINE_SCHEMA_VERSION;
  house_id: string;
  head_id: string | null;
  generated_at_turn_index: number;
  min_age: number;
  entries: SuccessionLineEntry[];
  overflow_count: number;
};

export type ClaimantRegistryEntry = {
  claimant_person_id: string;
  succession_position: number | null;
  adult_succession_position: number | null;
  basis_kind: SuccessionBasisKind;
  relation_group: SuccessionRelationGroup;
  blocked_by_current_heir: boolean;
  adult_eligible: boolean;
};

export type ClaimantRegistry = {
  schema_version: typeof CLAIMANT_REGISTRY_SCHEMA_VERSION;
  house_id: string;
  sponsor_person_id: string | null;
  generated_at_turn_index: number;
  current_heir_id: string | null;
  adult_successor_id: string | null;
  claim_window_open: boolean;
  entries: ClaimantRegistryEntry[];
  overflow_count: number;
};

export type InheritanceClaimProspectPreviewEntry = {
  claimant_person_id: string;
  succession_position: number | null;
  adult_succession_position: number | null;
  basis_kind: SuccessionBasisKind;
  relation_group: SuccessionRelationGroup;
  blocked_by_current_heir: boolean;
  adult_eligible: boolean;
};

export type InheritanceClaimProspect = Prospect & {
  claim_metadata_schema_version: typeof INHERITANCE_CLAIM_PROSPECT_METADATA_SCHEMA_VERSION;
  claimant_person_id: string;
  claimant_succession_position: number | null;
  claimant_adult_succession_position: number | null;
  claimant_basis_kind: SuccessionBasisKind;
  claimant_relation_group: SuccessionRelationGroup;
  target_house_id: string;
  target_head_person_id: string;
  target_current_heir_id: string | null;
  target_adult_successor_id: string | null;
  claim_window_open: boolean;
  target_line_entries: InheritanceClaimProspectPreviewEntry[];
  target_line_overflow_count: number;
};

type SuccessionCandidate = Omit<SuccessionLineEntry, "line_position">;

type BuildSuccessionLineOptions = {
  min_age?: number;
  limit?: number;
};

type BuildClaimantRegistryOptions = {
  limit?: number;
};

type BuildInheritanceClaimProspectOptions = {
  prospect_id: string;
  from_house_id: string;
  to_house_id: string;
  expires_turn: number;
  heir_id: string | null;
  subject_person_id?: string | null;
  preview_limit?: number;
  claimant_registry_limit?: number;
};

function byPrimogeniture(a: Person, b: Person): number {
  if (b.age !== a.age) return b.age - a.age;
  return String(a.id).localeCompare(String(b.id));
}

function sortedChildIdsByPrimogeniture(state: RunState, personId: string): string[] {
  return getChildren(state as any, personId)
    .map((childId) => registryPersonFor(state, childId))
    .filter((person): person is Person => !!person)
    .sort(byPrimogeniture)
    .map((person) => person.id);
}

function childBranchOrder(state: RunState, childIds: string[], sex: "M" | "F"): string[] {
  return childIds
    .map((childId) => registryPersonFor(state, childId))
    .filter((person): person is Person => !!person && person.sex === sex)
    .sort(byPrimogeniture)
    .map((person) => person.id);
}

function isEligibleForLine(person: Person | null, minAge: number): person is Person {
  return Boolean(person && person.alive && typeof person.age === "number" && person.age >= minAge);
}

function makeCandidate(
  state: RunState,
  personId: string,
  meta: Omit<SuccessionCandidate, "person_id" | "sex" | "age" | "adult_eligible">
): SuccessionCandidate | null {
  const person = registryPersonFor(state, personId);
  if (!person || !person.alive) return null;
  return {
    person_id: person.id,
    sex: person.sex ?? null,
    age: typeof person.age === "number" ? person.age : null,
    adult_eligible: typeof person.age === "number" && person.age >= SUCCESSION_MIN_AGE,
    ...meta,
  };
}

function enumerateBranchCandidates(
  state: RunState,
  rootId: string,
  branchRootId: string,
  relationGroup: "son_branch" | "daughter_branch",
  minAge: number,
  visited: Set<string>,
  out: SuccessionCandidate[],
  branchDepth = 0
): void {
  if (visited.has(rootId)) return;
  visited.add(rootId);

  const root = registryPersonFor(state, rootId);
  if (isEligibleForLine(root, minAge)) {
    const candidate = makeCandidate(state, rootId, {
      basis_kind: "direct_descendant",
      relation_group: relationGroup,
      branch_root_id: branchRootId,
      ancestor_id: null,
      ancestor_depth: 0,
      branch_depth: branchDepth,
    });
    if (candidate) out.push(candidate);
  }

  const childIds = sortedChildIdsByPrimogeniture(state, rootId);
  for (const childId of childIds) {
    enumerateBranchCandidates(
      state,
      childId,
      branchRootId,
      relationGroup,
      minAge,
      visited,
      out,
      branchDepth + 1
    );
  }
}

function enumerateDirectDescendantCandidates(state: RunState, minAge: number): SuccessionCandidate[] {
  const headId = state.house.head?.id ?? null;
  if (!headId) return [];

  const childIds = getChildren(state as any, headId);
  const sonBranches = childBranchOrder(state, childIds, "M");
  const daughterBranches = childBranchOrder(state, childIds, "F");
  const out: SuccessionCandidate[] = [];
  const visited = new Set<string>([headId]);

  for (const branchId of sonBranches) {
    enumerateBranchCandidates(state, branchId, branchId, "son_branch", minAge, visited, out);
  }
  for (const branchId of daughterBranches) {
    enumerateBranchCandidates(state, branchId, branchId, "daughter_branch", minAge, visited, out);
  }

  return out;
}

function enumerateCollateralMaleLineCandidates(state: RunState, minAge: number): SuccessionCandidate[] {
  const headId = state.house.head?.id ?? null;
  if (!headId) return [];

  const out: SuccessionCandidate[] = [];
  const branchSeen = new Set<string>([headId]);
  let maleAncestors = getParents(state as any, headId)
    .filter((parentId) => registryPersonFor(state, parentId)?.sex === "M")
    .sort((a, b) => a.localeCompare(b));

  for (let ancestorDepth = 1; ancestorDepth <= 4 && maleAncestors.length > 0; ancestorDepth += 1) {
    const nextAncestors: string[] = [];

    for (const ancestorId of maleAncestors) {
      branchSeen.add(ancestorId);

      let layer = getChildren(state as any, ancestorId)
        .filter((childId) => !branchSeen.has(childId))
        .sort((a, b) => a.localeCompare(b));

      for (let branchDepth = 1; branchDepth <= 4 && layer.length > 0; branchDepth += 1) {
        const males = layer
          .map((personId) => registryPersonFor(state, personId))
          .filter((person): person is Person => !!person && person.sex === "M" && person.id !== headId)
          .sort(byPrimogeniture);

        for (const person of males) {
          if (!isEligibleForLine(person, minAge)) continue;
          const candidate = makeCandidate(state, person.id, {
            basis_kind: "collateral_male_line",
            relation_group: "collateral_branch",
            branch_root_id: person.id,
            ancestor_id: ancestorId,
            ancestor_depth: ancestorDepth,
            branch_depth: branchDepth,
          });
          if (candidate) out.push(candidate);
        }

        const nextLayer: string[] = [];
        for (const personId of layer) {
          branchSeen.add(personId);
          const person = registryPersonFor(state, personId);
          if (!person || person.sex !== "M") continue;
          for (const childId of getChildren(state as any, personId)) {
            if (!branchSeen.has(childId)) nextLayer.push(childId);
          }
        }
        layer = Array.from(new Set(nextLayer)).sort((a, b) => a.localeCompare(b));
      }

      for (const parentId of getParents(state as any, ancestorId)) {
        const parent = registryPersonFor(state, parentId);
        if (parent && parent.sex === "M") nextAncestors.push(parentId);
      }
    }

    maleAncestors = Array.from(new Set(nextAncestors)).sort((a, b) => a.localeCompare(b));
  }

  return out;
}

function enumerateHouseholdFallbackCandidates(state: RunState): SuccessionCandidate[] {
  const houseId = playerHouseIdOf(state);
  const headId = state.house.head?.id ?? null;
  const houseMemberIds = allHouseMemberIds(state, houseId);

  return houseMemberIds
    .map((personId) => registryPersonFor(state, personId))
    .filter((person): person is Person => !!person && person.alive && person.id !== headId)
    .filter((person) => typeof person.age === "number" && person.age >= SUCCESSION_MIN_AGE)
    .sort(byPrimogeniture)
    .map((person) => ({
      person_id: person.id,
      basis_kind: "household_member_fallback" as const,
      relation_group: "fallback_household" as const,
      branch_root_id: person.id,
      ancestor_id: null,
      ancestor_depth: 0,
      branch_depth: 0,
      sex: person.sex ?? null,
      age: typeof person.age === "number" ? person.age : null,
      adult_eligible: true,
    }));
}

function uniqueCandidates(candidates: SuccessionCandidate[]): SuccessionCandidate[] {
  const seen = new Set<string>();
  const out: SuccessionCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.person_id)) continue;
    seen.add(candidate.person_id);
    out.push(candidate);
  }
  return out;
}

export function buildSuccessionLine(
  state: RunState,
  options: BuildSuccessionLineOptions = {}
): SuccessionLine {
  const minAge = typeof options.min_age === "number" ? Math.max(0, Math.trunc(options.min_age)) : 0;
  const limit = typeof options.limit === "number" ? Math.max(1, Math.trunc(options.limit)) : DEFAULT_SUCCESSION_LINE_LIMIT;
  const houseId = playerHouseIdOf(state);
  const direct = enumerateDirectDescendantCandidates(state, minAge);
  const collateral = enumerateCollateralMaleLineCandidates(state, minAge);
  const allCandidates = uniqueCandidates([...direct, ...collateral]);
  const bounded = allCandidates.slice(0, limit).map((candidate, index) => ({
    ...candidate,
    line_position: index + 1,
  }));

  return {
    schema_version: SUCCESSION_LINE_SCHEMA_VERSION,
    house_id: houseId,
    head_id: state.house.head?.id ?? null,
    generated_at_turn_index: state.turn_index,
    min_age: minAge,
    entries: bounded,
    overflow_count: Math.max(0, allCandidates.length - bounded.length),
  };
}

export function buildClaimantRegistry(
  state: RunState,
  options: BuildClaimantRegistryOptions = {}
): ClaimantRegistry {
  const limit = typeof options.limit === "number" ? Math.max(1, Math.trunc(options.limit)) : DEFAULT_CLAIMANT_REGISTRY_LIMIT;
  const fullLine = buildSuccessionLine(state, { min_age: 0, limit: Math.max(limit, DEFAULT_SUCCESSION_LINE_LIMIT) });
  const adultLine = buildSuccessionLine(state, { min_age: SUCCESSION_MIN_AGE, limit: Math.max(limit, DEFAULT_SUCCESSION_LINE_LIMIT) });
  const fallbackCandidates = enumerateHouseholdFallbackCandidates(state);
  const currentHeirId = state.house.heir_id ?? fullLine.entries[0]?.person_id ?? null;
  const adultSuccessorId = adultLine.entries[0]?.person_id ?? fallbackCandidates[0]?.person_id ?? null;
  const adultLinePositions = new Map(adultLine.entries.map((entry) => [entry.person_id, entry.line_position]));

  const entries: ClaimantRegistryEntry[] = fullLine.entries.map((entry) => ({
    claimant_person_id: entry.person_id,
    succession_position: entry.line_position,
    adult_succession_position: adultLinePositions.get(entry.person_id) ?? null,
    basis_kind: entry.basis_kind,
    relation_group: entry.relation_group,
    blocked_by_current_heir: currentHeirId !== null && entry.person_id !== currentHeirId,
    adult_eligible: entry.adult_eligible,
  }));

  if (entries.length === 0) {
    for (const fallback of fallbackCandidates) {
      entries.push({
        claimant_person_id: fallback.person_id,
        succession_position: null,
        adult_succession_position: null,
        basis_kind: fallback.basis_kind,
        relation_group: fallback.relation_group,
        blocked_by_current_heir: currentHeirId !== null,
        adult_eligible: fallback.adult_eligible,
      });
      if (entries.length >= limit) break;
    }
  }

  const bounded = entries.slice(0, limit);
  const overflowBase = entries.length > 0 ? Math.max(0, entries.length - bounded.length) : Math.max(0, fallbackCandidates.length - bounded.length);

  return {
    schema_version: CLAIMANT_REGISTRY_SCHEMA_VERSION,
    house_id: playerHouseIdOf(state),
    sponsor_person_id: state.house.head?.id ?? null,
    generated_at_turn_index: state.turn_index,
    current_heir_id: currentHeirId,
    adult_successor_id: adultSuccessorId,
    claim_window_open: currentHeirId === null,
    entries: bounded,
    overflow_count: overflowBase,
  };
}

export function inheritanceClaimProspectSignatureForSubject(subjectPersonId: string): string {
  return `inheritance_claim:${subjectPersonId}`;
}

export function inheritanceClaimProspectSignature(state: RunState): string {
  return inheritanceClaimProspectSignatureForSubject(state.house.head.id);
}

function toInheritanceClaimPreviewEntry(entry: ClaimantRegistryEntry): InheritanceClaimProspectPreviewEntry {
  return {
    claimant_person_id: entry.claimant_person_id,
    succession_position: entry.succession_position,
    adult_succession_position: entry.adult_succession_position,
    basis_kind: entry.basis_kind,
    relation_group: entry.relation_group,
    blocked_by_current_heir: entry.blocked_by_current_heir,
    adult_eligible: entry.adult_eligible,
  };
}

function withInheritanceClaimMetadata(
  prospect: Prospect,
  metadata: Omit<InheritanceClaimProspect, keyof Prospect>
): InheritanceClaimProspect {
  const typedProspect = prospect as InheritanceClaimProspect;
  for (const [key, value] of Object.entries(metadata)) {
    Object.defineProperty(typedProspect, key, {
      value,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return typedProspect;
}

export function buildInheritanceClaimProspect(
  state: RunState,
  options: BuildInheritanceClaimProspectOptions
): InheritanceClaimProspect | null {
  const subjectPersonId = options.subject_person_id ?? state.house.head?.id ?? null;
  if (options.heir_id !== null || typeof subjectPersonId !== "string" || subjectPersonId.length === 0) {
    return null;
  }

  const previewLimit =
    typeof options.preview_limit === "number"
      ? Math.max(1, Math.trunc(options.preview_limit))
      : DEFAULT_INHERITANCE_CLAIM_PREVIEW_LIMIT;
  const claimantRegistryLimit =
    typeof options.claimant_registry_limit === "number"
      ? Math.max(previewLimit, Math.trunc(options.claimant_registry_limit))
      : DEFAULT_CLAIMANT_REGISTRY_LIMIT;
  const registry = buildClaimantRegistry(state, { limit: claimantRegistryLimit });
  const claimant: ClaimantRegistryEntry =
    registry.entries[0] ?? {
      claimant_person_id: subjectPersonId,
      succession_position: null,
      adult_succession_position: null,
      basis_kind: "household_member_fallback",
      relation_group: "fallback_household",
      blocked_by_current_heir: false,
      adult_eligible: false,
    };

  const targetLineEntries = registry.entries.slice(0, previewLimit).map(toInheritanceClaimPreviewEntry);
  const targetLineOverflowCount = Math.max(0, registry.entries.length - targetLineEntries.length) + registry.overflow_count;
  const prospect: Prospect = {
    id: options.prospect_id,
    type: "inheritance_claim",
    from_house_id: options.from_house_id,
    to_house_id: options.to_house_id,
    subject_person_id: subjectPersonId,
    summary: "Inheritance claim",
    requirements: [],
    costs: {},
    predicted_effects: { flags_set: ["inheritance_claim_active"] },
    uncertainty: "possible",
    expires_turn: options.expires_turn,
    actions: ["accept", "reject"],
  };

  return withInheritanceClaimMetadata(prospect, {
    claim_metadata_schema_version: INHERITANCE_CLAIM_PROSPECT_METADATA_SCHEMA_VERSION,
    claimant_person_id: claimant.claimant_person_id,
    claimant_succession_position: claimant.succession_position,
    claimant_adult_succession_position: claimant.adult_succession_position,
    claimant_basis_kind: claimant.basis_kind,
    claimant_relation_group: claimant.relation_group,
    target_house_id: registry.house_id,
    target_head_person_id: subjectPersonId,
    target_current_heir_id: registry.current_heir_id,
    target_adult_successor_id: registry.adult_successor_id,
    claim_window_open: registry.claim_window_open,
    target_line_entries: targetLineEntries,
    target_line_overflow_count: targetLineOverflowCount,
  });
}
