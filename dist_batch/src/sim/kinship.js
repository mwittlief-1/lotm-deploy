// src/sim/kinship.ts
// Read-only helpers over state.people/state.houses/state.kinship_edges.
// Hard rule: deterministic iteration (always sort ids). No side effects.
function sortedUnique(ids) {
    return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
}
function getPeopleMap(state) {
    return (state?.people ?? {});
}
function getKinshipEdges(state) {
    const edges = (state?.kinship_edges ?? state?.kinshipEdges ?? state?.kinship ?? []);
    return Array.isArray(edges) ? edges : [];
}
function getEdgeKind(edge) {
    return String(edge?.kind ?? edge?.type ?? edge?.relation ?? edge?.edge_type ?? "").toLowerCase();
}
function edgeIsActive(edge) {
    if (typeof edge?.is_active === "boolean")
        return edge.is_active;
    // Common “ended” fields (treat non-null as ended/inactive)
    // NOTE: v0.2 sim patterns commonly use end_turn_index.
    if (edge?.end_turn_index != null)
        return false;
    if (edge?.ended_turn != null)
        return false;
    if (edge?.end_turn != null)
        return false;
    if (edge?.ended_year != null)
        return false;
    if (edge?.end_year != null)
        return false;
    // Some schemas use *_turn_style variants
    if (edge?.ended_turn_index != null)
        return false;
    return true;
}
function getEdgeFrom(edge) {
    const v = edge?.from_person_id ??
        edge?.fromPersonId ??
        edge?.from ??
        edge?.a_id ??
        edge?.a_person_id ??
        edge?.aPersonId ??
        edge?.a ??
        edge?.parent_id ??
        null;
    return v == null ? null : String(v);
}
function getEdgeTo(edge) {
    const v = edge?.to_person_id ??
        edge?.toPersonId ??
        edge?.to ??
        edge?.b_id ??
        edge?.b_person_id ??
        edge?.bPersonId ??
        edge?.b ??
        edge?.child_id ??
        null;
    return v == null ? null : String(v);
}
function isSpouseEdgeKind(kind) {
    // Flexible matching to avoid schema edits while remaining robust
    return (kind === "spouse" ||
        kind === "spouse_of" ||
        kind === "married_to" ||
        kind === "marriage" ||
        kind === "husband_of" ||
        kind === "wife_of");
}
function isParentEdgeKind(kind) {
    // Canonical expectation is parent_of edges; allow alternates.
    return kind === "parent_of" || kind === "parent" || kind === "is_parent_of";
}
function isChildEdgeKind(kind) {
    return kind === "child_of" || kind === "child" || kind === "is_child_of";
}
export function isAlive(state, person_id) {
    const people = getPeopleMap(state);
    const p = people?.[person_id];
    if (!p)
        return false;
    if (typeof p.alive === "boolean")
        return p.alive;
    if (typeof p.is_alive === "boolean")
        return p.is_alive;
    if (typeof p.is_dead === "boolean")
        return !p.is_dead;
    if (p.death_turn != null)
        return false;
    if (p.death_year != null)
        return false;
    if (p.died_turn != null)
        return false;
    if (p.died_year != null)
        return false;
    return true;
}
export function getLivingSpouse(state, person_id) {
    const edges = getKinshipEdges(state);
    const candidates = [];
    for (const e of edges) {
        const kind = getEdgeKind(e);
        if (!isSpouseEdgeKind(kind))
            continue;
        if (!edgeIsActive(e))
            continue;
        const a = getEdgeFrom(e);
        const b = getEdgeTo(e);
        if (!a || !b)
            continue;
        let other = null;
        if (a === person_id)
            other = b;
        else if (b === person_id)
            other = a;
        if (other && isAlive(state, other))
            candidates.push(other);
    }
    const uniq = sortedUnique(candidates);
    return uniq.length > 0 ? uniq[0] : null;
}
// Structural kinship helpers: return ids even if the relative is deceased.
// Views/rosters can apply badges/filtering as desired.
export function getParents(state, person_id) {
    const edges = getKinshipEdges(state);
    const parents = [];
    for (const e of edges) {
        const kind = getEdgeKind(e);
        if (!edgeIsActive(e))
            continue;
        const a = getEdgeFrom(e);
        const b = getEdgeTo(e);
        if (!a || !b)
            continue;
        if (isParentEdgeKind(kind)) {
            // parent_of: parent -> child
            if (b === person_id)
                parents.push(a);
        }
        else if (isChildEdgeKind(kind)) {
            // child_of: child -> parent
            if (a === person_id)
                parents.push(b);
        }
    }
    return sortedUnique(parents);
}
export function getChildren(state, person_id) {
    const edges = getKinshipEdges(state);
    const kids = [];
    for (const e of edges) {
        const kind = getEdgeKind(e);
        if (!edgeIsActive(e))
            continue;
        const a = getEdgeFrom(e);
        const b = getEdgeTo(e);
        if (!a || !b)
            continue;
        if (isParentEdgeKind(kind)) {
            // parent_of: parent -> child
            if (a === person_id)
                kids.push(b);
        }
        else if (isChildEdgeKind(kind)) {
            // child_of: child -> parent
            if (b === person_id)
                kids.push(a);
        }
    }
    return sortedUnique(kids);
}
export function getSiblings(state, person_id) {
    const parents = getParents(state, person_id);
    const sibs = [];
    for (const pid of parents) {
        const kids = getChildren(state, pid);
        for (const kid of kids) {
            if (kid !== person_id)
                sibs.push(kid);
        }
    }
    return sortedUnique(sibs);
}
/**
 * Invariant: a person may not have >1 *living* spouse via kinship edges.
 * Throws on violation (test harness expects this).
 */
export function assertSpouseExclusivity(state) {
    const people = getPeopleMap(state);
    const personIds = Object.keys(people).sort((a, b) => a.localeCompare(b));
    // Build spouse adjacency deterministically
    const edges = getKinshipEdges(state);
    const spouseMap = new Map();
    for (const id of personIds)
        spouseMap.set(id, new Set());
    for (const e of edges) {
        const kind = getEdgeKind(e);
        if (!isSpouseEdgeKind(kind))
            continue;
        if (!edgeIsActive(e))
            continue;
        const a = getEdgeFrom(e);
        const b = getEdgeTo(e);
        if (!a || !b)
            continue;
        if (!isAlive(state, a) || !isAlive(state, b))
            continue;
        // Only track for known people ids (avoid unsafely expanding universe)
        if (spouseMap.has(a))
            spouseMap.get(a).add(b);
        if (spouseMap.has(b))
            spouseMap.get(b).add(a);
    }
    for (const id of personIds) {
        if (!isAlive(state, id))
            continue;
        const spouses = Array.from(spouseMap.get(id) ?? []).filter((sid) => isAlive(state, sid));
        const uniq = sortedUnique(spouses);
        if (uniq.length > 1) {
            throw new Error(`Spouse exclusivity violated: person ${id} has >1 living spouse: ${uniq.join(",")}`);
        }
    }
}
