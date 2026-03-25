import React from "react";

export function fmtSigned(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

export function fmtMult(mult: number): string {
  const m = typeof mult === "number" && Number.isFinite(mult) ? mult : 1;
  return `×${m.toFixed(2)}`;
}

export function buildHouseIndexes(houses: any): {
  houseLabelById: Map<string, string>;
  personHouseById: Map<string, string>;
} {
  const houseLabelById = new Map<string, string>();
  const personHouseById = new Map<string, string>();

  if (!houses || typeof houses !== "object") return { houseLabelById, personHouseById };

  const entries = Object.entries(houses as Record<string, any>).sort(([a], [b]) => a.localeCompare(b));
  for (const [hid, h] of entries) {
    if (!h || typeof h !== "object") continue;
    const name = typeof h.house_name === "string" && h.house_name.trim().length > 0 ? h.house_name.trim() : hid;
    houseLabelById.set(hid, `House ${name}`);

    const head = typeof h.head_id === "string" ? h.head_id : null;
    const spouse = typeof h.spouse_id === "string" ? h.spouse_id : null;
    if (head && !personHouseById.has(head)) personHouseById.set(head, hid);
    if (spouse && !personHouseById.has(spouse)) personHouseById.set(spouse, hid);

    const childIds: any[] = Array.isArray(h.child_ids) ? h.child_ids : [];
    const children = childIds.filter((x) => typeof x === "string" && x.length > 0).sort((a, b) => a.localeCompare(b));
    for (const cid of children) {
      if (!personHouseById.has(cid)) personHouseById.set(cid, hid);
    }
  }

  return { houseLabelById, personHouseById };
}

export function buildParentsIndex(kinshipEdges: any): Map<string, string[]> {
  const parentsByChild = new Map<string, string[]>();
  const edges: any[] = Array.isArray(kinshipEdges) ? kinshipEdges : [];
  for (const e of edges) {
    if (!e || typeof e !== "object") continue;
    if (e.kind !== "parent_of") continue;
    const parentId = typeof e.parent_id === "string" ? e.parent_id : null;
    const childId = typeof e.child_id === "string" ? e.child_id : null;
    if (!parentId || !childId) continue;
    const arr = parentsByChild.get(childId) ?? [];
    if (!arr.includes(parentId)) arr.push(parentId);
    parentsByChild.set(childId, arr);
  }
  for (const [cid, arr] of parentsByChild.entries()) {
    parentsByChild.set(cid, [...arr].sort((a, b) => a.localeCompare(b)));
  }
  return parentsByChild;
}

export function formatPersonWithAgeAndHouse(
  personId: string,
  people: any,
  houseLabelById: Map<string, string>,
  personHouseById: Map<string, string>
): string {
  const p = people && typeof people === "object" ? (people as any)[personId] : null;
  const name = typeof p?.name === "string" && p.name.trim().length > 0 ? p.name.trim() : personId;
  const age = typeof p?.age === "number" && Number.isFinite(p.age) ? Math.trunc(p.age) : null;
  const hid = personHouseById.get(personId) ?? null;
  const hLabel = hid ? houseLabelById.get(hid) ?? hid : null;
  return `${name}${age !== null ? ` (Age ${age})` : ""}${hLabel ? ` — ${hLabel}` : ""}`;
}

export function formatParentsLine(
  personId: string,
  parentsByChild: Map<string, string[]>,
  people: any,
  houseLabelById: Map<string, string>,
  personHouseById: Map<string, string>
): string | null {
  const pids = parentsByChild.get(personId);
  if (!pids || pids.length === 0) return null;
  const parts = pids.map((pid) => formatPersonWithAgeAndHouse(pid, people, houseLabelById, personHouseById));
  return parts.join(" · ");
}

export function Tip({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      style={{
        cursor: "help",
        marginLeft: 6,
        opacity: 0.75,
        userSelect: "none",
        border: "1px solid #bbb",
        borderRadius: 999,
        padding: "0px 6px",
        fontSize: 12
      }}
    >
      ⓘ
    </span>
  );
}

export function splitWhyNotes(notes: string[]): { player: string[]; debug: string[] } {
  const player: string[] = [];
  const debug: string[] = [];
  for (const n of notes) {
    if (n.startsWith("Selected from") || n.startsWith("Weight≈")) debug.push(n);
    else player.push(n);
  }
  return { player, debug };
}

export function formatAge(age: number | undefined): string | null {
  if (typeof age !== "number") return null;
  return `Age ${age}`;
}

export function shortIdFromId(id: string | undefined): string | null {
  if (typeof id !== "string") return null;
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return null;
  if (cleaned.length <= 4) return cleaned;
  return cleaned.slice(-4);
}

export function formatPersonName(p: { name?: string; age?: number; id?: string; short_id?: string } | null | undefined): string {
  const name = typeof p?.name === "string" ? p.name.trim() : "";
  if (!name) return "Unnamed ruler";
  if (typeof p?.age === "number") return `${name} (Age ${p.age})`;
  const sid = typeof (p as any)?.short_id === "string" ? String((p as any).short_id).trim() : "";
  const derived = sid || shortIdFromId(typeof p?.id === "string" ? p.id : undefined);
  if (derived) return `${name} · ${derived}`;
  return name;
}

export function formatNameParts(
  name: unknown,
  age: unknown,
  short_id: unknown,
  fallbackId: unknown
): { displayName: string; ageText: string | null } {
  const nm = typeof name === "string" ? name.trim() : String(name ?? "").trim();
  const ageNum = typeof age === "number" ? age : null;
  const sid = typeof short_id === "string" ? short_id.trim() : "";
  const fid = typeof fallbackId === "string" ? fallbackId : undefined;

  if (!nm) return { displayName: "", ageText: null };
  if (ageNum !== null) return { displayName: nm, ageText: `Age ${ageNum}` };

  const derived = sid || shortIdFromId(fid);
  if (derived) return { displayName: `${nm} · ${derived}`, ageText: null };
  return { displayName: nm, ageText: null };
}

export function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: 8,
        padding: "1px 8px",
        borderRadius: 999,
        border: "1px solid #bbb",
        fontSize: 12,
        opacity: 0.85
      }}
    >
      {text}
    </span>
  );
}
