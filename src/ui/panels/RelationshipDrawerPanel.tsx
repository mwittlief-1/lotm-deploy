import React from "react";
import type { RunState } from "../../sim/types";

type RelationshipDrawerPanelProps = {
  onQueryChange: (value: string) => void;
  onTabChange: (value: "house" | "person") => void;
  previewState: RunState;
  query: string;
  tab: "house" | "person";
};

export function RelationshipDrawerPanel({
  onQueryChange,
  onTabChange,
  previewState,
  query,
  tab
}: RelationshipDrawerPanelProps) {
  const sAny: any = (previewState as any) ?? {};
  const rels: any[] = Array.isArray(sAny.relationships) ? sAny.relationships : [];
  const people: Record<string, any> = sAny.people && typeof sAny.people === "object" ? sAny.people : {};
  const houses: Record<string, any> = sAny.houses && typeof sAny.houses === "object" ? sAny.houses : {};
  const q = query.trim().toLowerCase();

  const isHouse = (id: string): boolean => Boolean(houses[id]) || id.startsWith("h_");
  const isPerson = (id: string): boolean => Boolean(people[id]) || id.startsWith("p_");

  const label = (id: string): string => {
    if (houses[id]) {
      const n = typeof houses[id]?.name === "string" ? houses[id].name : id;
      return `House ${n}`;
    }
    if (people[id]) {
      const n = typeof people[id]?.name === "string" ? people[id].name : id;
      return `${n} (${id})`;
    }
    return id;
  };

  const rows = rels.filter((e) => {
    const from = typeof e?.from_id === "string" ? e.from_id : "";
    const to = typeof e?.to_id === "string" ? e.to_id : "";
    if (!from || !to) return false;
    const ok = tab === "house" ? isHouse(from) && isHouse(to) : isPerson(from) && isPerson(to);
    if (!ok) return false;
    const hay = `${label(from)} ${label(to)}`.toLowerCase();
    return q ? hay.includes(q) : true;
  }).sort((a, b) => {
    const af = label(String(a.from_id));
    const bf = label(String(b.from_id));
    if (af !== bf) return af.localeCompare(bf);
    const at = label(String(a.to_id));
    const bt = label(String(b.to_id));
    if (at !== bt) return at.localeCompare(bt);
    return `${a.from_id}|${a.to_id}`.localeCompare(`${b.from_id}|${b.to_id}`);
  });

  return (
    <>
      <h4 style={{ marginTop: 12 }}>Relationship Drawer</h4>
      <div style={{ border: "1px solid #eee", padding: 10, background: "#fff", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <button onClick={() => onTabChange("house")} style={{ fontSize: 12, fontWeight: tab === "house" ? 700 : 400 }}>House↔House</button>
          <button onClick={() => onTabChange("person")} style={{ fontSize: 12, fontWeight: tab === "person" ? 700 : 400 }}>Person↔Person</button>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Filter (contains)"
            style={{ padding: 6, minWidth: 220 }}
          />
        </div>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.7, fontSize: 12 }}>No relationship edges match this filter.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {rows.map((e: any, i: number) => (
              <div key={`${e.from_id}|${e.to_id}|${i}`} style={{ fontSize: 12 }}>
                <b>{label(String(e.from_id))}</b> → <b>{label(String(e.to_id))}</b>
                {` · A ${Math.trunc(Number(e.allegiance ?? 0))} · R ${Math.trunc(Number(e.respect ?? 0))} · T ${Math.trunc(Number(e.threat ?? 0))}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
