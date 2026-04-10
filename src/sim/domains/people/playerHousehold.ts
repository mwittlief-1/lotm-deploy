import { registryPersonFor } from "../../actors";
import { getLivingSpouse } from "../../kinship";
import type { HouseholdRoster, Person, RunState } from "../../types";
import { buildGrantAcquisitionExperienceSurfaces } from "./grantAcquisitionRegistry";
import { buildKnownHouseExperienceSurfaces } from "./knownHouseSummaries";
import { attachPersonCardRegistry, buildPersonCardRegistry } from "./personCardRegistry";
import { ensureResidenceManorBindings } from "./residenceManorRegistry";
import { buildSuccessionExperienceSurfaces } from "./successionSummaries";

function attachHiddenSurface(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

export function buildHouseholdRoster(state: RunState): HouseholdRoster {
  const experienceSurfaces = buildKnownHouseExperienceSurfaces(state);
  const successionSurfaces = buildSuccessionExperienceSurfaces(state);
  const grantAcquisitionSurfaces = buildGrantAcquisitionExperienceSurfaces(state);
  ensureResidenceManorBindings(state);
  const personCardRegistry = buildPersonCardRegistry(state);
  (state as any).known_houses = experienceSurfaces.known_houses;
  (state as any).house_dossiers = experienceSurfaces.house_dossiers;
  (state as any).succession_line_summary = successionSurfaces.succession_line_summary;
  (state as any).claimant_summary = successionSurfaces.claimant_summary;
  (state.house as any).known_houses = experienceSurfaces.known_houses;
  (state.house as any).house_dossiers = experienceSurfaces.house_dossiers;
  (state.house as any).succession_line_summary = successionSurfaces.succession_line_summary;
  (state.house as any).claimant_summary = successionSurfaces.claimant_summary;
  attachHiddenSurface(state as object, "grant_eligibility", grantAcquisitionSurfaces.grant_eligibility);
  attachHiddenSurface(state as object, "grant_source_registry", grantAcquisitionSurfaces.grant_source_registry);
  attachHiddenSurface(state as object, "grant_dossier_summaries", grantAcquisitionSurfaces.grant_dossier_summaries);
  attachHiddenSurface(state as object, "acquisition_prospects_window", grantAcquisitionSurfaces.acquisition_prospects_window);
  attachHiddenSurface(state.house as object, "grant_eligibility", grantAcquisitionSurfaces.grant_eligibility);
  attachHiddenSurface(state.house as object, "grant_source_registry", grantAcquisitionSurfaces.grant_source_registry);
  attachHiddenSurface(state.house as object, "grant_dossier_summaries", grantAcquisitionSurfaces.grant_dossier_summaries);
  attachHiddenSurface(state.house as object, "acquisition_prospects_window", grantAcquisitionSurfaces.acquisition_prospects_window);
  attachPersonCardRegistry(state, personCardRegistry);

  const heirId = state.house.heir_id ?? null;
  const spouse = state.house.spouse ?? null;

  let widowedPersonId: string | null = null;
  if (state.house.spouse_status === "widow" && state.house.head.alive && !getLivingSpouse(state as any, state.house.head.id)) {
    widowedPersonId = state.house.head.id;
  } else if (spouse) {
    if (state.house.head.alive && !spouse.alive) widowedPersonId = state.house.head.id;
    else if (!state.house.head.alive && spouse.alive) widowedPersonId = spouse.id;
  }

  const rows: HouseholdRoster["rows"] = [];
  const seen = new Set<string>();

  const pushRow = (person: Person, role: "head" | "spouse" | "child") => {
    if (!person?.id || seen.has(person.id)) return;
    seen.add(person.id);

    const badges: HouseholdRoster["rows"][number]["badges"] = [];
    if (!person.alive) badges.push("deceased");
    if (person.alive && widowedPersonId === person.id) badges.push(person.sex === "M" ? "widower" : "widow");
    if (person.id === heirId) badges.push("heir");

    rows.push({ person_id: person.id, role, badges });
  };

  pushRow(state.house.head, "head");
  if (spouse) pushRow(spouse, "spouse");

  const sortedKids = [...state.house.children]
    .map((child) => registryPersonFor(state, child.id) ?? child)
    .sort((a, b) => {
      if (b.age !== a.age) return b.age - a.age;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  for (const child of sortedKids) pushRow(child, "child");

  return { schema_version: "household_roster_v1", turn_index: state.turn_index, rows };
}
