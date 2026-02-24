/**
 * v0.2.8 — Demography (Tier0/1 noble fertility only)
 *
 * Lane owner: DevB-E (Sim/Data correctness)
 *
 * Notes:
 * - This module is intentionally self-contained. BE will wire it into the turn loop.
 * - Determinism: no Math.random; stable ordering; pseudo-random draws keyed by (turn,couple).
 * - Schema tolerance: accept canonical field names (id / a_id,b_id / parent_id,child_id)
 *   AND legacy lane-test shapes (person_id / from_person_id,to_person_id).
 * - Write behavior: emit births in the **same style as the existing state**
 *   (canonical-in → canonical-out; legacy-in → legacy-out), so lane tests remain intact.
 */
const FLAG_SEQ = 'demography_next_person_seq';
const FLAG_PREFIX = 'demography_person_id_prefix';
const FLAG_JOINER = 'demography_person_id_joiner';
// Be tolerant to minor schema drift in kinship edge kinds.
const SPOUSE_EDGE_KINDS = new Set([
    'spouse_of',
    'spouse',
    'married_to',
    'married',
    'husband_of',
    'wife_of',
    'partner_of',
]);
const MALE_NAMES = ["Edmund", "Hugh", "Robert", "Walter", "Geoffrey", "Aldric", "Oswin", "Giles", "Roger", "Simon"];
const FEMALE_NAMES = ["Matilda", "Alice", "Joan", "Agnes", "Isolde", "Edith", "Beatrice", "Margery", "Cecily", "Elinor"];
export function processNobleFertility(state, tierSets, rng, turn) {
    const births = [];
    const year = coerceYear(turn);
    const eligible = collectTier01PersonIds(state, tierSets);
    if (eligible.size === 0)
        return { births };
    const couples = findEligibleCouples(state, eligible);
    if (couples.length === 0)
        return { births };
    // Stable ordering of couples.
    couples.sort((x, y) => (x.a === y.a ? (x.b < y.b ? -1 : x.b > y.b ? 1 : 0) : x.a < y.a ? -1 : 1));
    const writeCanonical = detectCanonicalWriteMode(state);
    for (const { a, b } of couples) {
        const pA = state.people[a];
        const pB = state.people[b];
        if (!pA || !pB)
            continue;
        if (!isAlive(pA) || !isAlive(pB))
            continue;
        const { mother, father } = pickMotherFather(pA, pB);
        const motherId = getPersonId(mother);
        const fatherId = getPersonId(father);
        if (!motherId || !fatherId)
            continue;
        const motherAge = coerceAge(mother, year);
        const fatherAge = coerceAge(father, year);
        if (motherAge == null || fatherAge == null)
            continue;
        // Simple age bands.
        if (motherAge < 16 || motherAge > 40)
            continue;
        if (fatherAge < 16 || fatherAge > 70)
            continue;
        const p = birthChancePerTurn(motherAge);
        if (p <= 0)
            continue;
        const draw = rngFloat01(rng, `demography.birth.${year}.${motherId}.${fatherId}`);
        if (draw >= p)
            continue;
        const childId = allocPersonId(state);
        const childSex = rngFloat01(rng, `demography.birth.sex.${childId}`) < 0.5 ? 'M' : 'F';
        const houseId = inferChildHouseId(state, motherId, fatherId, mother, father);
        // Minimal newborn record; downstream code can enrich.
        if (writeCanonical) {
            const name = pickNameDeterministic(rng, childId, childSex);
            const newborn = {
                id: childId,
                name,
                sex: childSex,
                age: 0,
                alive: true,
                married: false,
                traits: {
                    stewardship: 3,
                    martial: 3,
                    diplomacy: 3,
                    discipline: 3,
                    fertility: 3,
                },
                house_id: houseId,
            };
            state.people[childId] = newborn;
            if (!state.kinship_edges)
                state.kinship_edges = [];
            // parent_of edges (both parents). Stable ordering: mother then father.
            state.kinship_edges.push({ kind: 'parent_of', parent_id: motherId, child_id: childId });
            state.kinship_edges.push({ kind: 'parent_of', parent_id: fatherId, child_id: childId });
            // House membership (best-effort; depends on house schema).
            if (houseId && state.houses && state.houses[houseId]) {
                const h = state.houses[houseId];
                if (Array.isArray(h.child_ids))
                    h.child_ids.push(childId);
                else if (Array.isArray(h.member_person_ids))
                    h.member_person_ids.push(childId);
                else if (Array.isArray(h.members))
                    h.members.push(childId);
                else if (Array.isArray(h.people_ids))
                    h.people_ids.push(childId);
            }
            births.push({
                child_person_id: childId,
                mother_person_id: motherId,
                father_person_id: fatherId,
                house_id: houseId,
                year,
            });
        }
        else {
            const newborn = {
                person_id: childId,
                sex: childSex,
                birth_year: year,
                alive: true,
                house_id: houseId,
                death_year: null,
            };
            state.people[childId] = newborn;
            // Ensure arrays exist.
            if (!state.kinship_edges)
                state.kinship_edges = [];
            // parent_of edges (both parents). Stable ordering: mother then father.
            state.kinship_edges.push({ kind: 'parent_of', from_person_id: motherId, to_person_id: childId });
            state.kinship_edges.push({ kind: 'parent_of', from_person_id: fatherId, to_person_id: childId });
            // House membership (best-effort; depends on house schema).
            if (houseId && state.houses && state.houses[houseId]) {
                const h = state.houses[houseId];
                if (Array.isArray(h.member_person_ids))
                    h.member_person_ids.push(childId);
                else if (Array.isArray(h.members))
                    h.members.push(childId);
                else if (Array.isArray(h.people_ids))
                    h.people_ids.push(childId);
            }
            births.push({
                child_person_id: childId,
                mother_person_id: motherId,
                father_person_id: fatherId,
                house_id: houseId,
                year,
            });
        }
    }
    return { births };
}
function detectCanonicalWriteMode(state) {
    // If any existing person record has `id`, prefer canonical output.
    for (const p of Object.values(state.people ?? {})) {
        if (p && typeof p === 'object' && typeof p.id === 'string' && p.id.length > 0)
            return true;
    }
    // If any existing kinship edge uses canonical endpoints.
    for (const e of state.kinship_edges ?? []) {
        if (!e || typeof e !== 'object')
            continue;
        if (e.parent_id != null || e.child_id != null || e.a_id != null || e.b_id != null)
            return true;
    }
    return false;
}
function pickNameDeterministic(rng, childId, sex) {
    const s = sexNorm(sex);
    const pool = s === 'F' ? FEMALE_NAMES : MALE_NAMES;
    const r = rngFloat01(rng, `demography.birth.name.${childId}`);
    const idx = Math.min(pool.length - 1, Math.max(0, Math.trunc(r * pool.length)));
    return pool[idx] ?? (s === 'F' ? 'Matilda' : 'Edmund');
}
function coerceYear(turn) {
    if (typeof turn === 'number')
        return turn;
    return (turn.year ?? turn.current_year ?? turn.absolute_year ?? 0) | 0;
}
function getPersonId(p) {
    const v = p?.id ?? p?.person_id ?? '';
    return typeof v === 'string' ? v : '';
}
function isAlive(p) {
    if (p.is_alive === false || p.alive === false)
        return false;
    if (p.is_dead === true)
        return false;
    if (typeof p.death_year === 'number')
        return false;
    return true;
}
function coerceAge(p, year) {
    if (typeof p.age === 'number')
        return p.age;
    if (typeof p.birth_year === 'number' && year > 0)
        return year - p.birth_year;
    return null;
}
function sexNorm(s) {
    if (!s)
        return null;
    const v = String(s).toLowerCase();
    if (v === 'm' || v === 'male')
        return 'M';
    if (v === 'f' || v === 'female')
        return 'F';
    if (v === 'M')
        return 'M';
    if (v === 'F')
        return 'F';
    // Some codebases may use other encodings; treat as unknown.
    return null;
}
function pickMotherFather(pA, pB) {
    const sA = sexNorm(pA.sex ?? pA.gender);
    const sB = sexNorm(pB.sex ?? pB.gender);
    if (sA === 'F' && sB === 'M')
        return { mother: pA, father: pB };
    if (sA === 'M' && sB === 'F')
        return { mother: pB, father: pA };
    // Fallback deterministic choice if sex is missing/unknown.
    const aId = getPersonId(pA);
    const bId = getPersonId(pB);
    return aId < bId ? { mother: pA, father: pB } : { mother: pB, father: pA };
}
function birthChancePerTurn(motherAge) {
    // v0.2.8 simple curve: peak around mid-20s, taper to 0 by 16 and 40.
    // Scaled for a 3-year turn (chance per turn, not per year).
    const peakAge = 26;
    const halfWidth = 14; // gives 12..40; we clamp at 16..40 anyway.
    const raw = 1 - Math.abs(motherAge - peakAge) / halfWidth;
    const fertility = clamp01(raw);
    const maxPerTurn = 0.35;
    return fertility * maxPerTurn;
}
function clamp01(x) {
    if (x <= 0)
        return 0;
    if (x >= 1)
        return 1;
    return x;
}
function rngFloat01(rng, label) {
    // Prefer direct float calls when present.
    if (typeof rng.float01 === 'function') {
        const v = rng.float01(label);
        return clamp01(Number(v));
    }
    if (typeof rng.f32 === 'function') {
        const v = rng.f32(label);
        return clamp01(Number(v));
    }
    // Fallback: convert a u32 into [0,1).
    const u32 = typeof rng.u32 === 'function' ? rng.u32(label) : typeof rng.nextU32 === 'function' ? rng.nextU32(label) : null;
    if (u32 == null) {
        // We intentionally do NOT fall back to a local hash here:
        // production wiring must pass the sim RNG facade to preserve isolated RNG streams.
        throw new Error(`Demography RNG requires float01/f32 or u32/nextU32 (missing for label: ${label})`);
    }
    return (u32 >>> 0) / 0x1_0000_0000;
}
function collectTier01PersonIds(state, tierSets) {
    const out = new Set();
    const addAll = (it) => {
        if (!it)
            return;
        for (const id of it)
            out.add(String(id));
    };
    addAll(tierSets.tier0_person_ids);
    addAll(tierSets.tier1_person_ids);
    if ((tierSets.tier0_house_ids || tierSets.tier1_house_ids) && state.houses) {
        const houseIds = [];
        if (tierSets.tier0_house_ids)
            for (const id of tierSets.tier0_house_ids)
                houseIds.push(String(id));
        if (tierSets.tier1_house_ids)
            for (const id of tierSets.tier1_house_ids)
                houseIds.push(String(id));
        // Stable.
        houseIds.sort();
        for (const hid of houseIds) {
            const h = state.houses[hid];
            if (!h)
                continue;
            const members = (Array.isArray(h.member_person_ids) && h.member_person_ids) ||
                (Array.isArray(h.members) && h.members) ||
                (Array.isArray(h.people_ids) && h.people_ids) ||
                (Array.isArray(h.child_ids) && h.child_ids) ||
                [];
            for (const pid of members)
                out.add(String(pid));
            const head = h.head_person_id ?? h.head_id;
            const spouse = h.spouse_id;
            if (typeof head === 'string')
                out.add(head);
            if (typeof spouse === 'string')
                out.add(spouse);
        }
    }
    // If tiers are missing, be conservative: return empty set.
    return out;
}
function findEligibleCouples(state, eligible) {
    const edges = state.kinship_edges ?? [];
    const couples = [];
    const seen = new Set();
    for (const e of edges) {
        const kRaw = e.kind ?? e.type;
        const k = String(kRaw ?? '').toLowerCase();
        if (!SPOUSE_EDGE_KINDS.has(k))
            continue;
        const from = edgeFrom(e);
        const to = edgeTo(e);
        if (!from || !to)
            continue;
        if (!eligible.has(from) || !eligible.has(to))
            continue;
        const a = from < to ? from : to;
        const b = from < to ? to : from;
        const key = `${a}|${b}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        couples.push({ a, b });
    }
    return couples;
}
function edgeFrom(e) {
    const v = e.from_person_id ?? e.from ?? e.a_id ?? e.a ?? e.person_id ?? null;
    return typeof v === 'string' ? v : null;
}
function edgeTo(e) {
    const v = e.to_person_id ?? e.to ?? e.b_id ?? e.b ?? e.related_person_id ?? null;
    return typeof v === 'string' ? v : null;
}
function inferChildHouseId(state, motherId, fatherId, mother, father) {
    // Policy: child belongs to HoH’s house. Best-effort inference:
    // 1) if either parent is the head of a house, choose that house.
    // 2) else prefer father's house_id, else mother's house_id.
    if (state.houses) {
        const houseIds = Object.keys(state.houses).sort();
        for (const hid of houseIds) {
            const h = state.houses[hid];
            if (!h)
                continue;
            const head = h.head_person_id ?? h.head_id;
            if (head === fatherId)
                return hid;
            if (head === motherId)
                return hid;
        }
    }
    if (father.house_id)
        return father.house_id;
    if (mother.house_id)
        return mother.house_id;
    // If house_id missing, attempt membership scan.
    if (state.houses) {
        const houseIds = Object.keys(state.houses).sort();
        for (const hid of houseIds) {
            const h = state.houses[hid];
            const members = (Array.isArray(h.member_person_ids) && h.member_person_ids) ||
                (Array.isArray(h.members) && h.members) ||
                (Array.isArray(h.people_ids) && h.people_ids) ||
                (Array.isArray(h.child_ids) && h.child_ids) ||
                [];
            if (members.includes(fatherId))
                return hid;
            if (members.includes(motherId))
                return hid;
            const spouse = h.spouse_id;
            const head = h.head_person_id ?? h.head_id;
            if (spouse === fatherId || spouse === motherId)
                return hid;
            if (head === fatherId || head === motherId)
                return hid;
        }
    }
    return null;
}
function allocPersonId(state) {
    if (!state.flags)
        state.flags = {};
    // Establish prefix/joiner + next seq exactly once.
    let next = state.flags[FLAG_SEQ];
    let prefix = state.flags[FLAG_PREFIX];
    let joiner = state.flags[FLAG_JOINER];
    if (typeof next !== 'number' || typeof prefix !== 'string' || typeof joiner !== 'string') {
        const { inferredPrefix, inferredJoiner, startSeq } = inferIdAllocStrategy(state);
        if (typeof next !== 'number')
            next = startSeq;
        if (typeof prefix !== 'string')
            prefix = inferredPrefix;
        if (typeof joiner !== 'string')
            joiner = inferredJoiner;
        state.flags[FLAG_SEQ] = next;
        state.flags[FLAG_PREFIX] = prefix;
        state.flags[FLAG_JOINER] = joiner;
    }
    const prefixStr = state.flags[FLAG_PREFIX];
    const joinerStr = state.flags[FLAG_JOINER];
    let seq = state.flags[FLAG_SEQ];
    let id = `${prefixStr}${joinerStr}${seq}`;
    // Defensive collision check: advance until free.
    while (Object.prototype.hasOwnProperty.call(state.people, id)) {
        seq += 1;
        id = `${prefixStr}${joinerStr}${seq}`;
    }
    state.flags[FLAG_SEQ] = seq + 1;
    return id;
}
function inferIdAllocStrategy(state) {
    const ids = Object.keys(state.people);
    ids.sort();
    // Find first matching pattern to preserve style.
    let inferredPrefix = 'p';
    let inferredJoiner = '';
    for (const id of ids) {
        const m1 = /^([a-zA-Z]+)(\d+)$/.exec(id);
        if (m1) {
            inferredPrefix = m1[1];
            inferredJoiner = '';
            break;
        }
        const m2 = /^([a-zA-Z]+)_(\d+)$/.exec(id);
        if (m2) {
            inferredPrefix = m2[1];
            inferredJoiner = '_';
            break;
        }
    }
    // Start seq = max numeric suffix + 1 (fallback 1).
    let maxN = 0;
    for (const id of ids) {
        const m = /(\d+)$/.exec(id);
        if (!m)
            continue;
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > maxN)
            maxN = n;
    }
    return { inferredPrefix, inferredJoiner, startSeq: maxN + 1 };
}
