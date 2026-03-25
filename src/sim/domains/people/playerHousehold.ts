import { registryPersonFor } from "../../actors";
import type { HouseholdRoster, Person, RunState } from "../../types";

export function buildHouseholdRoster(state: RunState): HouseholdRoster {
  const heirId = state.house.heir_id ?? null;
  const spouse = state.house.spouse ?? null;

  let widowedPersonId: string | null = null;
  if (spouse) {
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
