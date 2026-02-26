/**
 * Lords of the Manor — v0.2.8 Marriage Market (DevB-C)
 *
 * PURPOSE
 * - Provide a deterministic query for eligible spouse candidates.
 * - Provide a reservation mechanism so one candidate cannot be offered/reserved by
 *   multiple simultaneously-generated prospects.
 *
 * NOTE FOR BUILD ENGINEER (integration)
 * This module assumes the following state-local storage exists (or will be added) on RunState:
 *   state.flags.marriage_reservations?: Record<PersonId, { prospect_id: string; expires_turn: number }>
 *
 * - Reservations are evaluated against the provided `turn` argument (or `state.turn_index` for
 *   listEligibleCandidates).
 * - A reservation is considered ACTIVE when `turn <= expires_turn`.
 * - `gcExpiredReservations` removes entries where `current_turn > expires_turn`.
 *
 * IMPORTANT LANE NOTE
 * - `listEligibleCandidates` is intentionally READ-ONLY (no GC, no flag initialization).
 *   Call `gcExpiredReservations(state, turn_index)` once per turn in the turn loop.
 */
const DEFAULT_AGE_BANDS = [{ min: 15, max: 45 }];
// --- Reservations ---
function readReservations(state) {
    const raw = state?.flags?.marriage_reservations;
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return {};
    return raw;
}
function ensureReservations(state) {
    const s = state;
    if (!s.flags || typeof s.flags !== "object" || Array.isArray(s.flags))
        s.flags = {};
    const f = s.flags;
    const raw = f.marriage_reservations;
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        f.marriage_reservations = {};
    return f.marriage_reservations;
}
export function isReserved(state, person_id, turn) {
    if (!person_id)
        return false;
    const m = readReservations(state);
    const e = m[person_id];
    if (!e || typeof e !== "object")
        return false;
    const ex = e.expires_turn;
    if (typeof ex !== "number" || !Number.isFinite(ex))
        return false;
    // Active through its expires_turn (inclusive).
    return Math.trunc(turn) <= Math.trunc(ex);
}
export function reserveCandidate(state, person_id, prospect_id, expires_turn) {
    if (!person_id)
        return;
    const m = ensureReservations(state);
    m[person_id] = {
        prospect_id: String(prospect_id ?? ""),
        expires_turn: Math.trunc(expires_turn),
    };
}
export function clearReservation(state, person_id) {
    if (!person_id)
        return;
    const m = ensureReservations(state);
    delete m[person_id];
}
export function gcExpiredReservations(state, current_turn) {
    const m = ensureReservations(state);
    const t = Math.trunc(current_turn);
    // Stable iteration for determinism.
    for (const pid of Object.keys(m).sort((a, b) => a.localeCompare(b))) {
        const e = m[pid];
        const ex = e?.expires_turn;
        if (typeof ex !== "number" || !Number.isFinite(ex)) {
            delete m[pid];
            continue;
        }
        if (t > Math.trunc(ex))
            delete m[pid];
    }
}
// --- Candidate query ---
function readRegistries(state) {
    const s = state;
    const people = s.people && typeof s.people === "object" ? s.people : {};
    const houses = s.houses && typeof s.houses === "object" ? s.houses : {};
    const player_house_id = typeof s.player_house_id === "string" ? s.player_house_id : "h_player";
    const kinship_edges = Array.isArray(s.kinship_edges)
        ? s.kinship_edges
        : Array.isArray(s.kinship)
            ? s.kinship
            : [];
    return { people, houses, player_house_id, kinship_edges };
}
function ageInBands(age, bands) {
    const a = Math.trunc(age);
    for (const b of bands) {
        const lo = Math.trunc(b.min);
        const hi = Math.trunc(b.max);
        if (a >= lo && a <= hi)
            return true;
    }
    return false;
}
function desiredSpouseSex(subject) {
    if (!subject)
        return null;
    return subject.sex === "M" ? "F" : subject.sex === "F" ? "M" : null;
}
function getSubjectPerson(state, people, subjectId) {
    const p = people[subjectId];
    if (p && typeof p === "object")
        return p;
    // Legacy fallback: subject may only exist in embedded state.house/locals.
    if (state.house?.head?.id === subjectId)
        return state.house.head;
    if (state.house?.spouse?.id === subjectId)
        return state.house.spouse;
    for (const c of state.house?.children ?? []) {
        if (c?.id === subjectId)
            return c;
    }
    if (state.locals?.liege?.id === subjectId)
        return state.locals.liege;
    if (state.locals?.clergy?.id === subjectId)
        return state.locals.clergy;
    for (const n of state.locals?.nobles ?? []) {
        if (n?.id === subjectId)
            return n;
    }
    return null;
}
function personToHouseMap(houses) {
    const map = new Map();
    for (const hid of Object.keys(houses).sort((a, b) => a.localeCompare(b))) {
        const h = houses[hid];
        if (!h || typeof h !== "object")
            continue;
        const add = (pid) => {
            if (typeof pid !== "string" || !pid)
                return;
            // Prefer earliest house_id in stable order.
            if (!map.has(pid))
                map.set(pid, hid);
        };
        add(h.head_id);
        add(h.spouse_id);
        const childIds = h.child_ids;
        if (Array.isArray(childIds)) {
            for (const cid of childIds)
                add(cid);
        }
    }
    return map;
}
function tierRankFromHouseTier(tier) {
    const t = typeof tier === "string" ? tier : "";
    // Lower = earlier in sort.
    if (t === "King")
        return 0;
    if (t === "Count")
        return 1;
    if (t === "Baron")
        return 2;
    if (t === "Knight")
        return 3;
    if (t === "Bishop")
        return 4;
    if (t === "Abbot")
        return 5;
    return 9;
}
function numOrNull(v) {
    if (typeof v !== "number" || !Number.isFinite(v))
        return null;
    return Math.trunc(v);
}
function tierProximityKey(h) {
    const tierNum = numOrNull(h?.instantiation_tier) ??
        numOrNull(h?.instantiationTier) ??
        numOrNull(h?.tier_bucket) ??
        numOrNull(h?.tierBucket) ??
        numOrNull(h?.tier_index) ??
        numOrNull(h?.tierIndex) ??
        null;
    const proxNum = numOrNull(h?.proximity_bucket) ??
        numOrNull(h?.proximityBucket) ??
        numOrNull(h?.proximity) ??
        null;
    const tier = tierNum !== null ? tierNum : tierRankFromHouseTier(h?.tier);
    const prox = proxNum !== null ? proxNum : 9;
    return { tier, prox };
}
const SPOUSE_A_KEYS = ["a_id", "from_person_id", "from", "a"];
const SPOUSE_B_KEYS = ["b_id", "to_person_id", "to", "b"];
function readIdByKeys(obj, keys) {
    if (!obj || typeof obj !== "object")
        return null;
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === "string" && v)
            return v;
    }
    return null;
}
function spouseEndpoints(e) {
    if (!e || typeof e !== "object" || e.kind !== "spouse_of")
        return { a: null, b: null };
    return {
        a: readIdByKeys(e, SPOUSE_A_KEYS),
        b: readIdByKeys(e, SPOUSE_B_KEYS),
    };
}
function buildSpouseIndex(kinship_edges) {
    const spouseIds = new Map();
    const hasSpouseEdge = new Set();
    for (const e of kinship_edges) {
        const { a, b } = spouseEndpoints(e);
        if (!a && !b)
            continue;
        if (a)
            hasSpouseEdge.add(a);
        if (b)
            hasSpouseEdge.add(b);
        if (a && b) {
            if (!spouseIds.has(a))
                spouseIds.set(a, new Set());
            if (!spouseIds.has(b))
                spouseIds.set(b, new Set());
            spouseIds.get(a).add(b);
            spouseIds.get(b).add(a);
        }
    }
    return { spouseIds, hasSpouseEdge };
}
function livingSpouseIdFromIndex(person_id, idx, people) {
    if (!person_id)
        return null;
    const set = idx.spouseIds.get(person_id);
    if (!set || set.size === 0)
        return null;
    const spouses = [...set].sort((x, y) => x.localeCompare(y));
    for (const sid of spouses) {
        const sp = people[sid];
        if (sp && typeof sp === "object" && sp.alive === true)
            return sid;
    }
    return null;
}
function resolveScopeHouseIds(houses, player_house_id, subject_house_id, scope) {
    const all = Object.keys(houses)
        .filter((hid) => hid !== player_house_id)
        .filter((hid) => !subject_house_id || hid !== subject_house_id)
        .sort((a, b) => a.localeCompare(b));
    const s = scope ?? { kind: "default" };
    if (s.kind === "house_ids") {
        const set = new Set((s.house_ids ?? []).filter((x) => typeof x === "string" && x));
        return all.filter((hid) => set.has(hid));
    }
    if (s.kind === "prefer_prefix") {
        const prefix = String(s.prefix ?? "");
        const pref = all.filter((hid) => hid.startsWith(prefix));
        const fallback = s.fallback_to_all !== false;
        return pref.length > 0 ? pref : fallback ? all : [];
    }
    if (s.kind === "all")
        return all;
    // default: preserve existing offer behavior — prefer "local noble" houses if present.
    const noble = all.filter((hid) => hid.startsWith("h_noble_"));
    return noble.length > 0 ? noble : all;
}
export function listEligibleCandidates(state, params) {
    const { people, houses, player_house_id, kinship_edges } = readRegistries(state);
    const subjectId = String(params?.subject_person_id ?? "");
    if (!subjectId)
        return [];
    // NOTE: No reservation GC here (read-only). BE should call gcExpiredReservations in turn loop.
    const subject = getSubjectPerson(state, people, subjectId);
    if (!subject || typeof subject !== "object")
        return [];
    const desiredSex = desiredSpouseSex(subject);
    if (!desiredSex)
        return [];
    const bands = (params.ageBands && params.ageBands.length > 0 ? params.ageBands : DEFAULT_AGE_BANDS).map((b) => ({
        min: Math.trunc(b.min),
        max: Math.trunc(b.max),
    }));
    const p2h = personToHouseMap(houses);
    const subjectHouseId = p2h.get(subjectId) ?? null;
    const houseIds = resolveScopeHouseIds(houses, player_house_id, subjectHouseId, params.scope);
    const spouseIdx = buildSpouseIndex(kinship_edges);
    const bestByPid = new Map();
    for (const hid of houseIds) {
        const h = houses[hid];
        if (!h || typeof h !== "object")
            continue;
        const ids = [];
        const headId = typeof h.head_id === "string" ? h.head_id : "";
        if (headId)
            ids.push(headId);
        const spouseId = typeof h.spouse_id === "string" ? h.spouse_id : "";
        if (spouseId)
            ids.push(spouseId);
        const childIds = h.child_ids;
        if (Array.isArray(childIds)) {
            for (const cid of childIds)
                if (typeof cid === "string" && cid)
                    ids.push(cid);
        }
        const { tier, prox } = tierProximityKey(h);
        // Stable iteration by person_id within house
        for (const pid of [...ids].sort((a, b) => a.localeCompare(b))) {
            if (!pid || pid === subjectId)
                continue;
            const person = people[pid];
            if (!person || typeof person !== "object")
                continue;
            if (person.alive !== true)
                continue;
            if (person.sex !== desiredSex)
                continue;
            if (!ageInBands(person.age ?? 0, bands))
                continue;
            // Must NOT be married to a living spouse.
            const livingSpouse = livingSpouseIdFromIndex(pid, spouseIdx, people);
            if (livingSpouse)
                continue;
            // Widows: allow `married=true` if spouse edges exist but no living spouse remains.
            // Conservative fallback: if `married=true` AND there are NO spouse edges at all, exclude.
            if (person.married === true && !spouseIdx.hasSpouseEdge.has(pid))
                continue;
            if (isReserved(state, pid, state.turn_index))
                continue;
            const cur = bestByPid.get(pid);
            const next = { pid, hid, tier, prox };
            if (!cur) {
                bestByPid.set(pid, next);
            }
            else {
                // Keep the deterministic "best" (lowest tier, then prox, then house_id).
                if (next.tier < cur.tier ||
                    (next.tier === cur.tier && next.prox < cur.prox) ||
                    (next.tier === cur.tier && next.prox === cur.prox && next.hid.localeCompare(cur.hid) < 0)) {
                    bestByPid.set(pid, next);
                }
            }
        }
    }
    // Deterministic ordering: tier/proximity bucket (if available) then house_id then person_id.
    const out = [...bestByPid.values()];
    out.sort((a, b) => {
        if (a.tier !== b.tier)
            return a.tier - b.tier;
        if (a.prox !== b.prox)
            return a.prox - b.prox;
        const h = a.hid.localeCompare(b.hid);
        if (h !== 0)
            return h;
        return a.pid.localeCompare(b.pid);
    });
    return out.map((x) => x.pid);
}
