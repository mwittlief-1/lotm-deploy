function hasPeopleFirstFields(state) {
    return Boolean(state && typeof state === "object" && state.people && state.houses && state.player_house_id);
}
function sortRecord(rec) {
    const out = {};
    for (const k of Object.keys(rec).sort())
        out[k] = rec[k];
    return out;
}
function pad2(n) {
    return String(n).padStart(2, "0");
}
function inferHouseNameFromNobleName(name) {
    const raw = String(name ?? "");
    const idx = raw.lastIndexOf(" of ");
    if (idx >= 0 && idx + 4 < raw.length)
        return raw.slice(idx + 4).trim() || raw.trim();
    return raw.trim() || "Noble";
}
function houseIdForPerson(houses, personId) {
    for (const hid of Object.keys(houses).sort()) {
        const h = houses[hid];
        if (!h || typeof h !== "object")
            continue;
        if (h.head_id === personId)
            return hid;
        if (h.spouse_id === personId)
            return hid;
        const childIds = h.child_ids;
        if (Array.isArray(childIds) && childIds.some((cid) => cid === personId))
            return hid;
    }
    return null;
}
function kinKey(e) {
    if (e.kind === "parent_of")
        return `parent_of|${e.parent_id}|${e.child_id}`;
    // spouse_of is symmetric; normalize order for dedupe/sort.
    const a = String(e.a_id);
    const b = String(e.b_id);
    const x = a < b ? a : b;
    const y = a < b ? b : a;
    return `spouse_of|${x}|${y}`;
}
function kinInvolvesAny(e, ids) {
    if (e.kind === "parent_of")
        return ids.has(String(e.parent_id)) || ids.has(String(e.child_id));
    return ids.has(String(e.a_id)) || ids.has(String(e.b_id));
}
/**
 * v0.2.x People-First migration/sync.
 *
 * - Accepts legacy v0.1.0-shaped state (embedded `house` + `locals`).
 * - Adds minimal registries: people/houses/player_house_id/kinship_edges.
 * - v0.2.1 constraint: does NOT introduce extra Houses beyond the player house.
 * - v0.2.2+ constraint: sync must be NON-DESTRUCTIVE (upsert only) so externally seeded
 *   registry entries are never wiped.
 * - Deterministic: IDs are derived from existing Person IDs.
 */
export function ensurePeopleFirst(state) {
    const s = state;
    if (!hasPeopleFirstFields(s)) {
        migratePeopleFirstFromLegacy(state);
    }
    // Keep registries in sync with legacy fields (authoritative sim still uses legacy structures).
    return syncPeopleFirstFromLegacyUpsert(state);
}
function migratePeopleFirstFromLegacy(state) {
    const s = state;
    const people = {};
    const addPerson = (p) => {
        if (!p || typeof p !== "object")
            return;
        if (typeof p.id !== "string" || !p.id)
            return;
        people[p.id] = p;
    };
    // Household
    addPerson(state.house?.head);
    addPerson(state.house?.spouse ?? null);
    for (const c of state.house?.children ?? [])
        addPerson(c);
    // Locals (allowed to exist without Houses)
    addPerson(state.locals?.liege);
    addPerson(state.locals?.clergy);
    for (const n of state.locals?.nobles ?? [])
        addPerson(n);
    const playerHouseId = "h_player";
    const headId = state.house?.head?.id;
    const spouseId = state.house?.spouse?.id ?? null;
    const childIds = (state.house?.children ?? []).map((c) => c.id);
    const houses = {
        [playerHouseId]: {
            id: playerHouseId,
            head_id: headId,
            spouse_id: spouseId,
            spouse_status: state.house?.spouse_status ?? null,
            child_ids: childIds,
            heir_id: state.house?.heir_id ?? null
        }
    };
    const kinship_edges = [];
    if (headId && spouseId) {
        kinship_edges.push({ kind: "spouse_of", a_id: headId, b_id: spouseId });
    }
    if (headId) {
        for (const cid of childIds)
            kinship_edges.push({ kind: "parent_of", parent_id: headId, child_id: cid });
    }
    if (spouseId) {
        for (const cid of childIds)
            kinship_edges.push({ kind: "parent_of", parent_id: spouseId, child_id: cid });
    }
    s.people = people;
    s.houses = houses;
    s.player_house_id = playerHouseId;
    s.kinship_edges = kinship_edges;
    return state;
}
function syncPeopleFirstFromLegacyUpsert(state) {
    const s = state;
    const playerHouseId = String(s.player_house_id ?? "h_player");
    if (!s.houses || typeof s.houses !== "object")
        s.houses = {};
    if (!s.people || typeof s.people !== "object")
        s.people = {};
    // v0.2.8: additive graph registries (no behavior; BE wires later)
    if (!s.institutions || typeof s.institutions !== "object" || Array.isArray(s.institutions))
        s.institutions = {};
    if (!Array.isArray(s.service_records))
        s.service_records = [];
    // v0.2.8: marriage candidate reservation locks (canonical facts; must be additive).
    // Ensure flags.marriage_reservations exists and is an object (reject arrays).
    if (!s.flags || typeof s.flags !== "object" || Array.isArray(s.flags))
        s.flags = {};
    {
        const f = s.flags;
        const raw = f.marriage_reservations;
        if (!raw || typeof raw !== "object" || Array.isArray(raw))
            f.marriage_reservations = {};
    }
    // Start from existing registries (superset), then upsert legacy persons.
    const people = { ...s.people };
    const upsert = (p) => {
        if (!p || typeof p !== "object")
            return;
        if (typeof p.id !== "string" || !p.id)
            return;
        people[p.id] = p;
    };
    upsert(state.house?.head);
    upsert(state.house?.spouse ?? null);
    for (const c of state.house?.children ?? [])
        upsert(c);
    upsert(state.locals?.liege);
    upsert(state.locals?.clergy);
    for (const n of state.locals?.nobles ?? [])
        upsert(n);
    const headId = state.house?.head?.id;
    const spouseId = state.house?.spouse?.id ?? null;
    const childIds = (state.house?.children ?? []).map((c) => c.id);
    // Upsert only the player house record; preserve all other Houses.
    const houses = { ...s.houses };
    houses[playerHouseId] = {
        ...(houses[playerHouseId] ?? {}),
        id: playerHouseId,
        head_id: headId,
        spouse_id: spouseId,
        spouse_status: state.house?.spouse_status ?? null,
        child_ids: childIds,
        heir_id: state.house?.heir_id ?? null
    };
    // v0.2.7.2 P0 (phantom spouse fix support): ensure legacy local nobles have a real House membership
    // in the People-First registry. This allows marriage offers to source from registries while
    // preserving deterministic behavior of the prior local-noble pool.
    const nobleIds = Object.keys(people)
        .filter((id) => /^p_noble\d+$/.test(id))
        .sort((a, b) => a.localeCompare(b));
    for (const pid of nobleIds) {
        // If already in a house, do nothing.
        if (houseIdForPerson(houses, pid))
            continue;
        const m = pid.match(/^p_noble(\d+)$/);
        const n = m ? Math.trunc(Number(m[1])) : 0;
        const hid = `h_noble_${pad2(n || 0)}`;
        const p = people[pid];
        const name = p && typeof p.name === "string" ? String(p.name) : pid;
        const inferred = inferHouseNameFromNobleName(name);
        const prior = houses[hid] && typeof houses[hid] === "object" ? houses[hid] : {};
        houses[hid] = {
            ...prior,
            id: hid,
            name: typeof prior.name === "string" && prior.name ? prior.name : inferred,
            tier: prior.tier ?? "Knight",
            holdings_count: typeof prior.holdings_count === "number" ? prior.holdings_count : 1,
            head_id: typeof prior.head_id === "string" && prior.head_id ? prior.head_id : pid,
            spouse_id: prior.spouse_id ?? null,
            child_ids: Array.isArray(prior.child_ids) ? prior.child_ids : []
        };
    }
    // Kinship edges: upsert only (never rewrite).
    // IMPORTANT: legacy `state.house.children` is a lineage/court membership view, NOT a biological parentage truth.
    // Rewriting parent_of facts from that view causes re-parenting bugs after succession.
    const prior = Array.isArray(s.kinship_edges)
        ? s.kinship_edges
        : Array.isArray(s.kinship)
            ? s.kinship
            : [];
    const desired = [];
    // Ensure the current HoH<->Spouse marriage edge exists (but never duplicates).
    if (headId && spouseId) {
        const hasSpouse = prior.some((e) => e.kind === "spouse_of" &&
            ((e.a_id === headId && e.b_id === spouseId) || (e.a_id === spouseId && e.b_id === headId)));
        if (!hasSpouse)
            desired.push({ kind: "spouse_of", a_id: headId, b_id: spouseId });
    }
    // Add parent edges ONLY when a child has no recorded parents yet (typically new births).
    // This avoids re-parenting existing lineage members when the head changes.
    const hasAnyParent = (childId) => prior.some((e) => e.kind === "parent_of" && String(e.child_id) === childId);
    if (headId) {
        for (const cid of childIds) {
            if (!cid)
                continue;
            if (hasAnyParent(cid))
                continue;
            desired.push({ kind: "parent_of", parent_id: headId, child_id: cid });
        }
    }
    if (spouseId) {
        for (const cid of childIds) {
            if (!cid)
                continue;
            if (hasAnyParent(cid))
                continue;
            desired.push({ kind: "parent_of", parent_id: spouseId, child_id: cid });
        }
    }
    const mergedByKey = new Map();
    for (const e of [...prior, ...desired])
        mergedByKey.set(kinKey(e), e);
    const merged = [...mergedByKey.values()].sort((a, b) => kinKey(a).localeCompare(kinKey(b)));
    // Stable enumeration for serialization: re-materialize registries in sorted key order.
    s.people = sortRecord(people);
    s.houses = sortRecord(houses);
    s.player_house_id = playerHouseId;
    s.kinship_edges = merged;
    return state;
}
