import { Rng } from "./rng.js";
import { ensureEdge } from "./relationships.js";
// --- Versioned flags/subkeys ---
const WORLDGEN_FLAG_V0_2_2 = "_worldgen_external_houses_v0_2_2";
const WORLDGEN_FLAG_V0_2_8 = "_worldgen_external_houses_v0_2_8";
const WORLDGEN_ROOT_SUBKEY_V0_2_2 = "external_houses/v0.2.2";
const WORLDGEN_ROOT_SUBKEY_V0_2_8 = "external_houses/v0.2.8";
const MALE_NAMES = ["Edmund", "Hugh", "Robert", "Walter", "Geoffrey", "Aldric", "Oswin", "Giles", "Roger", "Simon"];
const FEMALE_NAMES = ["Matilda", "Alice", "Joan", "Agnes", "Isolde", "Edith", "Beatrice", "Margery", "Cecily", "Elinor"];
const HOUSE_NAMES = ["Ashford", "Bramwell", "Caldwell", "Dunwick", "Evershaw", "Falkmere", "Glenholt", "Hartwyck", "Ivydale", "Ketterby"];
const HOUSE_TIERS = ["Knight", "Baron", "Count"];
function pad2(n) {
    return String(n).padStart(2, "0");
}
function extHouseId(i) {
    return `h_ext_${pad2(i)}`;
}
function extPersonId(i, role) {
    return `p_ext_${pad2(i)}_${role}`;
}
function pickName(rng, sex) {
    return sex === "M" ? rng.pick(MALE_NAMES) : rng.pick(FEMALE_NAMES);
}
function traitLevel(rng) {
    const r = rng.next();
    if (r < 0.03)
        return 1;
    if (r < 0.17)
        return 2;
    if (r < 0.83)
        return 3;
    if (r < 0.97)
        return 4;
    return 5;
}
function genTraits(rng) {
    return {
        stewardship: traitLevel(rng.fork("stew")),
        martial: traitLevel(rng.fork("mart")),
        diplomacy: traitLevel(rng.fork("dip")),
        discipline: traitLevel(rng.fork("disc")),
        fertility: traitLevel(rng.fork("fert")),
    };
}
function mkPerson(rng, id, sex, age, surname, married) {
    return {
        id,
        name: `${pickName(rng, sex)} ${surname}`,
        sex,
        age,
        alive: true,
        traits: genTraits(rng.fork(`traits:${id}`)),
        married,
    };
}
function holdingsForTier(tier, rng) {
    if (tier === "Knight")
        return rng.int(1, 3);
    if (tier === "Baron")
        return rng.int(3, 7);
    return rng.int(7, 14);
}
function kinKey(e) {
    if (e.kind === "parent_of")
        return `parent_of|${e.parent_id}|${e.child_id}`;
    const a = String(e.a_id);
    const b = String(e.b_id);
    const x = a < b ? a : b;
    const y = a < b ? b : a;
    return `spouse_of|${x}|${y}`;
}
function ensureKinshipEdge(state, e) {
    const s = state;
    if (!Array.isArray(s.kinship_edges))
        s.kinship_edges = [];
    const arr = s.kinship_edges;
    const key = kinKey(e);
    const has = arr.some((x) => kinKey(x) === key);
    if (!has)
        arr.push(e);
}
function listExternalHouseIds(state) {
    const s = state;
    const houses = s.houses && typeof s.houses === "object" ? s.houses : {};
    return Object.keys(houses)
        .filter((id) => id.startsWith("h_ext_"))
        .sort();
}
function ensureRelationshipEdgesToPlayerHead(state, extHouseIds) {
    const s = state;
    const houses = s.houses;
    const playerHeadId = state.house?.head?.id;
    if (!playerHeadId)
        return;
    // Stable iteration by house id.
    for (const hid of [...extHouseIds].sort()) {
        const h = houses?.[hid];
        const headId = h && typeof h === "object" && typeof h.head_id === "string" && h.head_id
            ? h.head_id
            : hid.replace(/^h_ext_/, "p_ext_") + "_head";
        if (!headId)
            continue;
        ensureEdge(state, playerHeadId, headId);
        ensureEdge(state, headId, playerHeadId);
    }
}
function clampAge(n) {
    if (!Number.isFinite(n))
        return 0;
    return Math.max(0, Math.trunc(n));
}
/**
 * Deterministic child age generation with smoothing.
 *
 * Rule:
 * - pick oldest within a feasible band
 * - then subtract spacing (1–3y) iteratively, bounded so the remaining children can still fit
 * - optionally allow one "late child" if mother age supports (explicitly marked)
 */
function genChildAgesSmoothed(rng, motherAge, fatherAge, desiredCount) {
    const mAge = clampAge(motherAge);
    const fAge = clampAge(fatherAge);
    let n = Math.max(0, Math.trunc(desiredCount));
    if (n === 0)
        return { ages_desc: [], late_child: false };
    // Conservative fertility envelope: oldest child must be <= min(mother-16, father-14).
    const maxOldest = Math.max(0, Math.min(mAge - 16, fAge - 14));
    if (maxOldest <= 0)
        return { ages_desc: [], late_child: false };
    // Ensure feasibility with min spacing of 1 year.
    if (maxOldest < n - 1)
        n = maxOldest + 1;
    if (n <= 0)
        return { ages_desc: [], late_child: false };
    const minOldest = Math.max(1, n - 1);
    const oldest = rng.int(minOldest, Math.max(minOldest, maxOldest));
    const ages = [oldest];
    for (let idx = 2; idx <= n; idx++) {
        const prev = ages[ages.length - 1];
        const remainingAfter = n - idx;
        const maxSpacingAllowed = Math.min(3, prev - remainingAfter);
        const spacing = maxSpacingAllowed <= 1 ? 1 : rng.int(1, maxSpacingAllowed);
        ages.push(Math.max(0, prev - spacing));
    }
    // Optional late child: only if mother is older AND youngest isn't already a toddler.
    let late_child = false;
    if (mAge >= 36 && ages.length >= 2) {
        const youngest = ages[ages.length - 1];
        // If the youngest is at least 5, we can add a late child with a small probability.
        if (youngest >= 5 && rng.bool(0.12)) {
            ages.push(rng.int(0, 2));
            late_child = true;
        }
    }
    // Ensure descending-ish ordering (allow twins: equal ages).
    ages.sort((a, b) => b - a);
    return { ages_desc: ages, late_child };
}
function childCountForTier(tier, rng) {
    // Scaffold distribution (v0.2.8): more children for higher tiers.
    if (tier === "Knight")
        return rng.int(1, 3);
    if (tier === "Baron")
        return rng.int(2, 4);
    return rng.int(3, 5);
}
function smoothExistingChildrenAgesInPlace(opts) {
    const { childIds, people, motherAge, mark } = opts;
    const kids = childIds
        .map((id) => people[id])
        .filter((p) => p && typeof p === "object" && typeof p.age === "number");
    if (kids.length < 3)
        return;
    kids.sort((a, b) => b.age - a.age || String(a.id).localeCompare(String(b.id)));
    const ages = kids.map((k) => clampAge(k.age));
    // Detect the specific "two teens + toddler" gap.
    const teenA = ages[0] ?? 0;
    const teenB = ages[1] ?? 0;
    const youngest = ages[ages.length - 1] ?? 0;
    const gap = teenB - youngest;
    const motherSupportsLateChild = motherAge !== null && clampAge(motherAge) >= 35;
    const isTwoTeensPlusToddler = teenA >= 13 && teenB >= 13 && youngest <= 3 && gap >= 8;
    // If mother age supports, treat as explicitly plausible and do not smooth.
    if (isTwoTeensPlusToddler && motherSupportsLateChild) {
        mark?.("late_child_plausible");
        return;
    }
    // General smoothing: clamp any adjacent gap > 6 years (increase younger ages only).
    const MAX_GAP = 6;
    for (let i = 1; i < ages.length; i++) {
        const prev = ages[i - 1];
        const cur = ages[i];
        if (prev - cur > MAX_GAP) {
            ages[i] = Math.max(0, prev - MAX_GAP);
        }
    }
    // Apply back.
    for (let i = 0; i < kids.length; i++) {
        const k = kids[i];
        const newAge = ages[i];
        if (people[k.id])
            people[k.id].age = newAge;
    }
}
function smoothPlayerHouseholdChildren(state) {
    const anyState = state;
    const people = anyState.people;
    if (!people || typeof people !== "object")
        return;
    const kids = state.house?.children ?? [];
    const childIds = kids.map((c) => c.id).filter((x) => typeof x === "string" && x.length > 0);
    const motherAge = state.house?.spouse && state.house.spouse.sex === "F" ? state.house.spouse.age : null;
    const anyFlags = anyState.flags;
    const mark = (flag) => {
        if (!anyFlags || typeof anyFlags !== "object")
            return;
        if (!anyFlags._worldgen_notes || typeof anyFlags._worldgen_notes !== "object")
            anyFlags._worldgen_notes = {};
        anyFlags._worldgen_notes[flag] = true;
    };
    smoothExistingChildrenAgesInPlace({ childIds, people, motherAge, mark });
    // Keep legacy embedded household objects in sync.
    for (const c of kids) {
        const p = people[c.id];
        if (p && typeof p === "object" && typeof p.age === "number")
            c.age = p.age;
    }
}
function isTuningBool(state, key) {
    const anyFlags = state?.flags;
    const v = anyFlags?._tuning?.[key];
    if (v === true)
        return true;
    if (v === false)
        return false;
    // Allow 0/1 as a convenience.
    if (typeof v === "number")
        return v >= 1;
    return false;
}
function ensureFamilySnapshotForHouse(opts) {
    const { state, hid, houseIndex, root, people, houses } = opts;
    const hRng = root.fork(`house:${hid}`);
    const prior = houses[hid] && typeof houses[hid] === "object" ? houses[hid] : {};
    const tier = prior.tier ?? hRng.pick(HOUSE_TIERS);
    const surname = (typeof prior.name === "string" && prior.name) ? prior.name : hRng.pick(HOUSE_NAMES);
    const holdings_count = typeof prior.holdings_count === "number" ? prior.holdings_count : holdingsForTier(tier, hRng.fork("holdings"));
    const headId = typeof prior.head_id === "string" && prior.head_id ? prior.head_id : extPersonId(houseIndex, "head");
    const spouseId = typeof prior.spouse_id === "string" && prior.spouse_id ? prior.spouse_id : extPersonId(houseIndex, "spouse");
    const headAge = typeof people[headId]?.age === "number" ? people[headId].age : hRng.int(24, 60);
    const spousePresent = typeof prior.spouse_id === "string" ? true : hRng.bool(0.85);
    const spouseAge = spousePresent
        ? (typeof people[spouseId]?.age === "number" ? people[spouseId].age : Math.max(18, headAge - hRng.int(0, 12)))
        : 0;
    // Upsert head/spouse persons.
    if (!people[headId])
        people[headId] = mkPerson(hRng.fork(`person:${headId}`), headId, "M", headAge, surname, spousePresent);
    if (spousePresent && !people[spouseId])
        people[spouseId] = mkPerson(hRng.fork(`person:${spouseId}`), spouseId, "F", spouseAge, surname, true);
    // Child count + smoothed ages.
    const desiredChildCount = childCountForTier(tier, hRng.fork("child_count"));
    const motherAge = spousePresent ? spouseAge : Math.max(18, headAge - hRng.int(0, 18));
    const { ages_desc, late_child } = genChildAgesSmoothed(hRng.fork("children"), motherAge, headAge, desiredChildCount);
    // Preserve existing child IDs; append if needed.
    const priorChildIds = Array.isArray(prior.child_ids) ? prior.child_ids.filter((x) => typeof x === "string" && x.length > 0) : [];
    const childIds = [...priorChildIds];
    const needCount = Math.max(0, ages_desc.length - childIds.length);
    for (let j = 0; j < needCount; j++) {
        const idx = childIds.length + 1;
        childIds.push(extPersonId(houseIndex, `child${idx}`));
    }
    // Upsert child people.
    for (let ci = 0; ci < ages_desc.length; ci++) {
        const cid = childIds[ci];
        const age = ages_desc[ci];
        if (!people[cid]) {
            const sex = hRng.fork(`child_sex:${cid}`).bool(0.55) ? "M" : "F";
            people[cid] = mkPerson(hRng.fork(`person:${cid}`), cid, sex, age, surname, false);
        }
        else {
            // If upgrading existing, lightly smooth (no large gaps) without changing plausible late-child cases.
            if (typeof people[cid].age === "number")
                people[cid].age = clampAge(people[cid].age);
        }
    }
    // If we have existing children beyond the generated ages (legacy), run smoothing pass to avoid massive gaps.
    smoothExistingChildrenAgesInPlace({
        childIds,
        people,
        motherAge: spousePresent ? spouseAge : null,
        mark: late_child ? (f) => {
            (houses[hid] ??= {}).family_flags = { ...(houses[hid]?.family_flags ?? {}), [f]: true };
        } : undefined,
    });
    // Upsert house record.
    houses[hid] = {
        ...prior,
        id: hid,
        name: surname,
        tier,
        holdings_count,
        head_id: headId,
        spouse_id: spousePresent ? spouseId : null,
        child_ids: childIds,
        family_flags: {
            ...(prior.family_flags ?? {}),
            ...(late_child ? { late_child: true } : {}),
        },
    };
    // Kinship edges.
    if (spousePresent)
        ensureKinshipEdge(state, { kind: "spouse_of", a_id: headId, b_id: spouseId });
    for (const cid of childIds) {
        ensureKinshipEdge(state, { kind: "parent_of", parent_id: headId, child_id: cid });
        if (spousePresent)
            ensureKinshipEdge(state, { kind: "parent_of", parent_id: spouseId, child_id: cid });
    }
}
/**
 * v0.2.8 external world seed.
 *
 * Determinism contract:
 * - Uses dedicated RNG stream: stream="worldgen", turn_index=0, subkey rooted at WORLDGEN_ROOT_SUBKEY_V0_2_8.
 * - Does NOT introduce any new RNG calls in existing sim streams.
 * - Deterministic IDs (index-based, fixed-width): h_ext_01..h_ext_99 and p_ext_01_*.
 * - Idempotent: guarded by state.flags[WORLDGEN_FLAG_V0_2_8].
 */
export function ensureExternalHousesSeed_v0_2_8(state) {
    const s = state;
    if (!s || typeof s !== "object")
        return;
    if (!s.flags || typeof s.flags !== "object")
        s.flags = {};
    // Requires People-First registries to exist.
    if (!s.people || !s.houses || !s.player_house_id)
        return;
    // v0.2.8: ensure a minimal player-local parish institution exists for Tier0 (no RNG).
    const playerHouseId = String(s.player_house_id ?? "h_player");
    if (!s.institutions || typeof s.institutions !== "object" || Array.isArray(s.institutions))
        s.institutions = {};
    const institutions = s.institutions;
    const anyLocals = state.locals;
    const anyManor = state.manor;
    const existingParishId = (anyLocals && anyLocals.parish_institution_id) || (anyManor && anyManor.parish_institution_id) || null;
    const isValidParishId = (pid) => {
        if (typeof pid !== "string" || !pid)
            return false;
        const inst = institutions[pid];
        return Boolean(inst && typeof inst === "object" && inst.type === "parish");
    };
    let parishId = isValidParishId(existingParishId) ? String(existingParishId) : null;
    if (!parishId) {
        parishId = "i_parish_player_local";
        const cur = institutions[parishId];
        if (!cur || typeof cur !== "object" || cur.type !== "parish") {
            institutions[parishId] = {
                id: parishId,
                type: "parish",
                name: "Local Parish",
                patron_actor_id: { kind: "house", id: playerHouseId },
                priest_person_id: null,
            };
        }
    }
    // Stash the id in locals/manor for Tier0 selection. This is additive-only; no mechanics.
    if (anyLocals && !isValidParishId(anyLocals.parish_institution_id))
        anyLocals.parish_institution_id = parishId;
    if (anyManor && !isValidParishId(anyManor.parish_institution_id))
        anyManor.parish_institution_id = parishId;
    const flags = s.flags;
    // Player household smoothing is gated (Dispatch 4 allows, but keep off-by-default to avoid invention risk).
    // No RNG; deterministic transform.
    if (isTuningBool(state, "worldgen_smooth_player_children")) {
        smoothPlayerHouseholdChildren(state);
    }
    const people = s.people;
    const houses = s.houses;
    const alreadyHouseIds = listExternalHouseIds(state);
    // If already seeded for v0.2.8, ensure missing edges and exit.
    if (flags[WORLDGEN_FLAG_V0_2_8]) {
        ensureRelationshipEdgesToPlayerHead(state, alreadyHouseIds);
        return;
    }
    const root = new Rng(state.run_seed, "worldgen", 0, WORLDGEN_ROOT_SUBKEY_V0_2_8);
    // If we already have ext houses (legacy v0.2.2 seeds), upgrade them in-place to full snapshots.
    if (alreadyHouseIds.length > 0) {
        for (const hid of [...alreadyHouseIds].sort()) {
            // Infer index from id suffix.
            const m = hid.match(/h_ext_(\\d+)/);
            const idx = m ? parseInt(m[1], 10) : 0;
            ensureFamilySnapshotForHouse({ state, hid, houseIndex: Number.isFinite(idx) && idx > 0 ? idx : 1, root, people, houses });
        }
        ensureRelationshipEdgesToPlayerHead(state, alreadyHouseIds);
        flags[WORLDGEN_FLAG_V0_2_8] = true;
        // Preserve legacy flag for compatibility.
        flags[WORLDGEN_FLAG_V0_2_2] = true;
        return;
    }
    // Fresh seed: create a larger, Tier1-appropriate pool with deterministic ordering.
    const houseCount = root.int(60, 90); // <= 99 to preserve fixed-width IDs.
    for (let i = 1; i <= houseCount; i++) {
        const hid = extHouseId(i);
        ensureFamilySnapshotForHouse({ state, hid, houseIndex: i, root, people, houses });
    }
    // Ensure relationship edges exist (player head ↔ external heads) in stable house id order.
    const extIds = listExternalHouseIds(state);
    ensureRelationshipEdgesToPlayerHead(state, extIds);
    flags[WORLDGEN_FLAG_V0_2_8] = true;
    // Preserve legacy flag so older callers don't attempt to re-seed.
    flags[WORLDGEN_FLAG_V0_2_2] = true;
}
/**
 * Back-compat export: callers on v0.2.7.2 still import v0_2_2.
 * In v0.2.8, this delegates to the v0.2.8 implementation.
 */
export function ensureExternalHousesSeed_v0_2_2(state) {
    return ensureExternalHousesSeed_v0_2_8(state);
}
