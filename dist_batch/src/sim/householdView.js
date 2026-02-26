// src/sim/householdView.ts
// Derived household roster labels relative to current HoH.
// Hard rule: deterministic ordering and no side effects.
import { getLivingSpouse, getParents, getSiblings, getChildren, isAlive } from "./kinship.js";
function getPeopleMap(state) {
    return (state?.people ?? {});
}
function hasPerson(state, person_id) {
    if (!person_id)
        return false;
    const p = getPeopleMap(state)?.[person_id];
    return Boolean(p && typeof p === "object");
}
function getAge(state, person_id) {
    const p = getPeopleMap(state)?.[person_id];
    if (!p)
        return null;
    const v = p.age ?? p.current_age ?? p.years_old ?? null;
    if (typeof v === "number" && Number.isFinite(v))
        return v;
    // Optional derivation if sim state carries a current year
    const year = state?.year ?? state?.current_year ?? null;
    const birthYear = p.birth_year ?? p.born_year ?? null;
    if (typeof year === "number" && typeof birthYear === "number" && Number.isFinite(year) && Number.isFinite(birthYear)) {
        return year - birthYear;
    }
    return null;
}
const ROLE_PRIORITY = {
    head: 0,
    spouse: 1,
    parent: 2,
    sibling: 3,
    child: 4,
};
function sortRoster(state, rows) {
    return rows.slice().sort((r1, r2) => {
        const p1 = ROLE_PRIORITY[r1.role];
        const p2 = ROLE_PRIORITY[r2.role];
        if (p1 !== p2)
            return p1 - p2;
        const a1 = getAge(state, r1.person_id);
        const a2 = getAge(state, r2.person_id);
        // Age desc (older first); unknown ages last
        if (a1 != null || a2 != null) {
            if (a1 == null)
                return 1;
            if (a2 == null)
                return -1;
            if (a1 !== a2)
                return a2 - a1;
        }
        return r1.person_id.localeCompare(r2.person_id);
    });
}
export function deriveHouseholdRoster(state, house_id) {
    const house = state?.houses?.[house_id];
    const headId = house?.head_id ?? house?.headId ?? null;
    if (!headId)
        return [];
    // If the current HoH is missing/deceased, return empty (the caller should have resolved succession).
    if (!hasPerson(state, headId))
        return [];
    if (!isAlive(state, headId))
        return [];
    // Assign roles in priority order; keep first assignment if duplicates.
    const roleById = new Map();
    const add = (person_id, role) => {
        if (!person_id)
            return;
        if (!hasPerson(state, person_id))
            return;
        if (!roleById.has(person_id))
            roleById.set(person_id, role);
    };
    add(headId, "head");
    const spouse = getLivingSpouse(state, headId);
    if (spouse)
        add(spouse, "spouse");
    for (const pid of getParents(state, headId))
        add(pid, "parent");
    for (const sid of getSiblings(state, headId))
        add(sid, "sibling");
    for (const cid of getChildren(state, headId))
        add(cid, "child");
    const rows = Array.from(roleById.entries()).map(([person_id, role]) => ({
        person_id,
        role,
    }));
    return sortRoster(state, rows);
}
