import type { RunState } from "../sim/types";

export function getAllHouseLogEntries(state: RunState, currentTurnLog: any[] = []): any[] {
  const entries: any[] = [];
  for (const e of currentTurnLog) entries.push(e);
  for (const le of state.log ?? []) {
    const arr = (le as any)?.report?.house_log ?? [];
    if (Array.isArray(arr)) for (const e of arr) entries.push(e);
  }
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ta = typeof a.e?.turn_index === "number" ? a.e.turn_index : -1;
      const tb = typeof b.e?.turn_index === "number" ? b.e.turn_index : -1;
      if (tb !== ta) return tb - ta;
      return b.i - a.i;
    })
    .map((x) => x.e);
}

export function findLastSuccession(state: RunState): { turn_index: number; new_ruler_name: string } | null {
  for (let i = (state.log ?? []).length - 1; i >= 0; i--) {
    const le: any = (state.log ?? [])[i];
    const arr: any[] = le?.report?.house_log ?? [];
    if (!Array.isArray(arr)) continue;
    for (let j = arr.length - 1; j >= 0; j--) {
      const e = arr[j];
      if (e?.kind === "succession" && typeof e?.turn_index === "number" && typeof e?.new_ruler_name === "string") {
        return { turn_index: e.turn_index, new_ruler_name: e.new_ruler_name };
      }
    }
  }
  return null;
}

export function getPlayerHousehold(state: RunState): {
  head: any | null;
  spouse: any | null;
  spouse_status: any;
  children: any[];
  heir_id: string | null;
} {
  const legacy = state.house;
  const s: any = state as any;
  if (s && s.player_house_id && s.houses && s.people) {
    const house = s.houses?.[s.player_house_id];
    const people = s.people;
    const head = house?.head ? house.head : house?.head_id ? people?.[house.head_id] : null;
    const spouse = house?.spouse ? house.spouse : house?.spouse_id ? people?.[house.spouse_id] : null;

    let children: any[] = [];
    if (Array.isArray(house?.children)) children = house.children;
    else if (Array.isArray(house?.child_ids)) children = house.child_ids.map((id: string) => people?.[id]).filter(Boolean);

    const spouse_status = house?.spouse_status ?? null;
    const heir_id = house?.heir_id ?? null;

    return {
      head: head ?? null,
      spouse: spouse ?? null,
      spouse_status,
      children,
      heir_id
    };
  }

  return {
    head: legacy.head,
    spouse: legacy.spouse ?? null,
    spouse_status: legacy.spouse_status ?? null,
    children: legacy.children ?? [],
    heir_id: legacy.heir_id ?? null
  };
}

export function findLastNote(
  state: RunState,
  predicate: (note: string) => boolean
): { turn_index: number; note: string } | null {
  const log = state.log ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    const entry: any = log[i];
    const turnIndex = typeof entry?.processed_turn_index === "number" ? entry.processed_turn_index : null;
    const notes: string[] = entry?.report?.notes ?? [];
    for (let j = notes.length - 1; j >= 0; j--) {
      const n = notes[j];
      if (typeof n === "string" && predicate(n)) {
        return turnIndex !== null ? { turn_index: turnIndex, note: n } : { turn_index: i, note: n };
      }
    }
  }
  return null;
}
