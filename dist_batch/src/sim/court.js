import { Rng } from "./rng.js";
import { getChildren, getParents, getSiblings } from "./kinship.js";
// v0.2.4 Court + Household integration.
// Tooling/QA note: Court officer generation must be deterministic and stream-isolated.
const MALE_NAMES = ["Edmund", "Hugh", "Robert", "Walter", "Geoffrey", "Aldric", "Oswin", "Giles", "Roger", "Simon"];
const FEMALE_NAMES = ["Matilda", "Alice", "Joan", "Agnes", "Isolde", "Edith", "Beatrice", "Margery", "Cecily", "Elinor"];
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
function genTraits(rng, id) {
    // Keep trait generation deterministic but stream-isolated.
    const base = rng.fork(`traits:${id}`);
    return {
        stewardship: traitLevel(base.fork("stew")),
        martial: traitLevel(base.fork("mart")),
        diplomacy: traitLevel(base.fork("dip")),
        discipline: traitLevel(base.fork("disc")),
        fertility: traitLevel(base.fork("fert"))
    };
}
function officerTitle(role) {
    if (role === "steward")
        return "Steward";
    if (role === "clerk")
        return "Clerk";
    return "Marshal";
}
function defaultOfficerId(role) {
    return `p_court_${role}`;
}
function mkOfficerPerson(rng, id, role) {
    // Very small flavor, but deterministic and bounded.
    const sex = "M"; // v0.2.5 LOCK: court officers must be male.
    const age = rng.int(28, 55);
    const name = pickName(rng.fork("name"), sex);
    return {
        id,
        name: `${name}`,
        sex,
        age,
        alive: true,
        traits: genTraits(rng, id),
        married: false
    };
}
function getHouseRegistry(state) {
    const anyState = state;
    const playerHouseId = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
    const houses = anyState.houses;
    if (!houses || typeof houses !== "object")
        return null;
    const h = houses[playerHouseId];
    if (!h || typeof h !== "object")
        return null;
    return h;
}
function readCourtVariant(state) {
    const anyFlags = state.flags;
    const v = anyFlags?._tuning?.court_variant;
    if (v === "A" || v === "B" || v === "C")
        return v;
    return null;
}
export function ensureCourtOfficers(state) {
    const anyState = state;
    if (!anyState.people || !anyState.houses)
        return;
    const playerHouseId = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
    const houses = anyState.houses;
    if (!houses[playerHouseId] || typeof houses[playerHouseId] !== "object") {
        houses[playerHouseId] = { id: playerHouseId };
    }
    const houseRec = houses[playerHouseId];
    if (!houseRec.court_officers || typeof houseRec.court_officers !== "object")
        houseRec.court_officers = {};
    if (!Array.isArray(houseRec.court_extra_ids))
        houseRec.court_extra_ids = [];
    if (!Array.isArray(houseRec.court_exclude_ids))
        houseRec.court_exclude_ids = [];
    const people = anyState.people;
    const base = new Rng(state.run_seed, "court", 0, "court_officers/v0.2.5");
    // v0.2.6.1 HARDENING: deterministic court seed variants (A/B/C).
    // - A: no officers
    // - B: steward only
    // - C: steward + clerk
    // Presets only; no RNG. Enforced only when `flags._tuning.court_variant` is set.
    const variant = readCourtVariant(state);
    const enforceVariant = Boolean(variant);
    const desired = enforceVariant
        ? (variant === "A" ? [] : variant === "B" ? ["steward"] : ["steward", "clerk"])
        : [];
    // v0.2.5 affordability LOCK: court starts small by default.
    // Back-compat: if a save already has clerk/marshal IDs, preserve them and ensure their Person records exist.
    const ensureRole = (role, createIfMissing) => {
        const cur = houseRec.court_officers?.[role];
        if (!createIfMissing && !(typeof cur === "string" && cur.length > 0))
            return;
        const id = typeof cur === "string" && cur.length > 0 ? cur : defaultOfficerId(role);
        houseRec.court_officers[role] = id;
        if (!people[id]) {
            const r = base.fork(`role/${role}`);
            people[id] = mkOfficerPerson(r, id, role);
        }
        // v0.2.5 LOCK: officers must be male (enforce even for legacy saves).
        if (people[id] && people[id].sex !== "M")
            people[id].sex = "M";
    };
    if (enforceVariant) {
        // Remove non-desired roles (mapping only; Person records may remain in registry but will not be counted).
        const roles = ["steward", "clerk", "marshal"];
        for (const role of roles) {
            if (!desired.includes(role))
                delete houseRec.court_officers?.[role];
        }
        for (const role of desired)
            ensureRole(role, true);
    }
    else {
        // Default behavior (v0.2.5): steward only.
        ensureRole("steward", true);
        // Legacy: only if explicitly present on the house registry.
        ensureRole("clerk", false);
        ensureRole("marshal", false);
    }
    // v0.2.8.1 HOTFIX: ensure we have minimal ServiceRecords for court officer roles.
    // This is a People-First invariant and unblocks downstream obligations/debug UI.
    syncCourtOfficerServiceRecords(state, playerHouseId, houseRec.court_officers);
}
function syncCourtOfficerServiceRecords(state, playerHouseId, roles) {
    const anyState = state;
    const prior = Array.isArray(anyState.service_records) ? anyState.service_records : [];
    const byId = new Map();
    for (const r of prior) {
        if (!r || typeof r !== "object")
            continue;
        const id = r.id;
        if (typeof id !== "string" || !id)
            continue;
        byId.set(id, r);
    }
    const actor = { kind: "house", id: playerHouseId };
    const nowT = typeof state.turn_index === "number" ? state.turn_index : 0;
    const roleKeys = Object.keys(roles).sort((a, b) => String(a).localeCompare(String(b)));
    for (const role of roleKeys) {
        const personId = roles[role];
        if (typeof personId !== "string" || !personId)
            continue;
        const id = `sr_${playerHouseId}_${role}`;
        const existing = byId.get(id);
        if (existing) {
            if (existing.person_id !== personId) {
                existing.person_id = personId;
                existing.start_turn_index = nowT;
            }
            existing.serving_actor_id = actor;
            existing.role = role;
            existing.end_turn_index = null;
        }
        else {
            byId.set(id, {
                id,
                person_id: personId,
                serving_actor_id: actor,
                role,
                start_turn_index: nowT,
                end_turn_index: null,
            });
        }
    }
    anyState.service_records = [...byId.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
export function getCourtOfficerIds(state) {
    const h = getHouseRegistry(state);
    const out = [];
    const roles = ["steward", "clerk", "marshal"];
    for (const role of roles) {
        const pid = h?.court_officers?.[role];
        if (typeof pid === "string" && pid.length > 0)
            out.push({ role, person_id: pid });
    }
    return out;
}
export function getCourtExtraIds(state) {
    const h = getHouseRegistry(state);
    const raw = Array.isArray(h?.court_extra_ids) ? h.court_extra_ids : [];
    const out = [];
    for (const x of raw) {
        if (typeof x === "string" && x.length > 0)
            out.push(x);
    }
    return out;
}
export function getCourtExcludeIds(state) {
    const h = getHouseRegistry(state);
    const raw = Array.isArray(h?.court_exclude_ids) ? h.court_exclude_ids : [];
    const out = [];
    for (const x of raw) {
        if (typeof x === "string" && x.length > 0)
            out.push(x);
    }
    return out;
}
export function addCourtExtraId(state, personId) {
    if (!personId)
        return;
    const anyState = state;
    const playerHouseId = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
    const houses = anyState.houses;
    if (!houses || typeof houses !== "object")
        return;
    if (!houses[playerHouseId] || typeof houses[playerHouseId] !== "object")
        houses[playerHouseId] = { id: playerHouseId };
    const h = houses[playerHouseId];
    const raw = Array.isArray(h.court_extra_ids) ? h.court_extra_ids : [];
    const ids = raw.filter((x) => typeof x === "string" && x.length > 0);
    if (!ids.includes(personId))
        ids.push(personId);
    h.court_extra_ids = ids;
}
export function addCourtExcludeId(state, personId) {
    if (!personId)
        return;
    const anyState = state;
    const playerHouseId = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
    const houses = anyState.houses;
    if (!houses || typeof houses !== "object")
        return;
    if (!houses[playerHouseId] || typeof houses[playerHouseId] !== "object")
        houses[playerHouseId] = { id: playerHouseId };
    const h = houses[playerHouseId];
    const raw = Array.isArray(h.court_exclude_ids) ? h.court_exclude_ids : [];
    const ids = raw.filter((x) => typeof x === "string" && x.length > 0);
    if (!ids.includes(personId))
        ids.push(personId);
    h.court_exclude_ids = ids;
}
export function removeCourtExcludeId(state, personId) {
    if (!personId)
        return;
    const anyState = state;
    const playerHouseId = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
    const houses = anyState.houses;
    if (!houses || typeof houses !== "object")
        return;
    const h = houses[playerHouseId];
    if (!h || typeof h !== "object")
        return;
    if (!Array.isArray(h.court_exclude_ids))
        return;
    h.court_exclude_ids = h.court_exclude_ids.filter((x) => x !== personId);
    if (Array.isArray(h.court_exclude_ids) && h.court_exclude_ids.length === 0)
        delete h.court_exclude_ids;
}
export function deriveCourtMemberIds(state) {
    // Stable ordering: head, spouse, children (oldest->youngest, id tie-break), officers (fixed role order), extras (id asc).
    const anyState = state;
    const people = (anyState.people ?? {});
    const excluded = new Set(getCourtExcludeIds(state));
    const ids = [];
    const seen = new Set();
    const push = (id) => {
        if (!id || typeof id !== "string")
            return;
        if (seen.has(id))
            return;
        if (!people[id])
            return; // skip unknown IDs
        // Exclusions apply to court membership only (married-out children, etc.).
        // Never exclude the current head/spouse (defensive).
        if (excluded.has(id) && id !== state.house.head?.id && id !== state.house.spouse?.id)
            return;
        seen.add(id);
        ids.push(id);
    };
    push(state.house.head?.id);
    push(state.house.spouse?.id ?? null);
    const kids = [...(state.house.children ?? [])].sort((a, b) => {
        if (b.age !== a.age)
            return b.age - a.age;
        return String(a.id).localeCompare(String(b.id));
    });
    for (const c of kids)
        push(c.id);
    for (const { role, person_id } of getCourtOfficerIds(state)) {
        // ensure stable role ordering by iterating fixed role order in getCourtOfficerIds
        push(person_id);
    }
    const extras = getCourtExtraIds(state).slice().sort((a, b) => a.localeCompare(b));
    for (const id of extras)
        push(id);
    return ids;
}
export function buildCourtRoster_v0_2_4(state, houseLog) {
    const excluded = new Set(getCourtExcludeIds(state));
    const anyState = state;
    const people = (anyState.people ?? {});

    // v0.2.8.2 hotfix: derive relationship labels relative to the *current* HoH.
    // Court membership is still driven by legacy `state.house.children`, which may contain
    // siblings after succession (they remain in household). The label must rebase.
    const headId = state.house?.head?.id ?? null;
    const spouseId = state.house?.spouse?.id ?? null;
    const parentsOfHead = headId ? new Set(getParents(state, headId)) : new Set();
    const childrenOfHead = headId ? new Set(getChildren(state, headId)) : new Set();
    const siblingsOfHead = headId ? new Set(getSiblings(state, headId)) : new Set();
    const relationshipLabel = (personId) => {
        if (!headId)
            return null;
        if (personId === headId)
            return "Head of House";
        if (spouseId && personId === spouseId)
            return "Spouse";
        const p = people[personId];
        const sex = p?.sex;
        if (parentsOfHead.has(personId))
            return sex === "F" ? "Mother" : sex === "M" ? "Father" : "Parent";
        if (siblingsOfHead.has(personId))
            return sex === "F" ? "Sister" : sex === "M" ? "Brother" : "Sibling";
        if (childrenOfHead.has(personId))
            return sex === "F" ? "Daughter" : sex === "M" ? "Son" : "Child";
        return null;
    };
    const heirId = state.house.heir_id ?? null;
    const spouse = state.house.spouse ?? null;
    // Widow semantics: prefer explicit life log (same-turn correctness); fallback to head/spouse alive mismatch.
    let widowedPersonId = null;
    if (houseLog && houseLog.length) {
        const w = [...houseLog].reverse().find((e) => e.kind === "widowed" && e.survivor_id);
        if (w?.survivor_id)
            widowedPersonId = w.survivor_id;
    }
    if (!widowedPersonId && spouse) {
        if (state.house.head.alive && !spouse.alive)
            widowedPersonId = state.house.head.id;
        else if (!state.house.head.alive && spouse.alive)
            widowedPersonId = spouse.id;
    }
    const rows = [];
    const seen = new Set();
    const pushRow = (personId, role, officer_role) => {
        if (!personId || typeof personId !== "string")
            return;
        if (seen.has(personId))
            return;
        const p = people[personId];
        if (!p)
            return;
        // Exclusions apply to court membership only. Never exclude current head/spouse.
        if (excluded.has(personId) && personId !== state.house.head?.id && personId !== state.house.spouse?.id)
            return;
        seen.add(personId);
        const badges = [];
        if (!p.alive)
            badges.push("deceased");
        if (p.alive && widowedPersonId === p.id)
            badges.push(p.sex === "M" ? "widower" : "widow");
        if (heirId && p.id === heirId)
            badges.push("heir");
        rows.push({ person_id: p.id, role, officer_role: officer_role ?? null, badges, relationship_label: relationshipLabel(p.id) });
    };
    // Family
    pushRow(state.house.head.id, "head");
    if (state.house.spouse)
        pushRow(state.house.spouse.id, "spouse");
    const kids = [...(state.house.children ?? [])].sort((a, b) => {
        if (b.age !== a.age)
            return b.age - a.age;
        return String(a.id).localeCompare(String(b.id));
    });
    for (const c of kids)
        pushRow(c.id, "child");
    // Officers
    for (const { role, person_id } of getCourtOfficerIds(state)) {
        pushRow(person_id, "officer", role);
    }
    // Married-in spouses (extras)
    const extras = getCourtExtraIds(state).slice().sort((a, b) => a.localeCompare(b));
    for (const id of extras)
        pushRow(id, "married_in_spouse");
    const headcount_alive = rows.reduce((acc, r) => (r.badges.includes("deceased") ? acc : acc + 1), 0);
    return {
        schema_version: "court_roster_v1",
        turn_index: state.turn_index,
        headcount_alive,
        rows
    };
}
export function courtConsumptionBushels_v0_2_4(state, bushelsPerPersonPerYear, turnYears, houseLog) {
    const roster = buildCourtRoster_v0_2_4(state, houseLog);
    const headcount = roster.headcount_alive;
    const courtConsumption = Math.max(0, Math.floor(headcount * bushelsPerPersonPerYear * turnYears));
    return { court_headcount: headcount, court_consumption_bushels: courtConsumption, court_roster: roster };
}
