import type { RunState } from "../../sim/types";
import { buildHouseIndexes, buildParentsIndex, formatParentsLine } from "../viewHelpers";

type AllPeopleRegistryPanelProps = {
  filter: string;
  onFilterChange: (value: string) => void;
  state: RunState;
};

export function AllPeopleRegistryPanel({ filter, onFilterChange, state }: AllPeopleRegistryPanelProps) {
  return (
    <details style={{ marginTop: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>
        All People Registry (debug)
        {(() => {
          const ppl: any = (state as any)?.people;
          const n = ppl && typeof ppl === "object" ? Object.keys(ppl).length : 0;
          return ` — ${n} people`;
        })()}
      </summary>

      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, opacity: 0.85 }}>Filter:</label>
        <input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="id or name"
          style={{ padding: 6, minWidth: 220 }}
        />
        <div style={{ fontSize: 12, opacity: 0.75 }}>Tip: expand a person to see raw JSON.</div>
      </div>

      {(() => {
        const sAny: any = state as any;
        const peopleRec: any = sAny?.people && typeof sAny.people === "object" ? sAny.people : {};
        const housesRec: any = sAny?.houses && typeof sAny.houses === "object" ? sAny.houses : {};
        const kinEdges: any[] = Array.isArray(sAny?.kinship_edges) ? sAny.kinship_edges : Array.isArray(sAny?.kinship) ? sAny.kinship : [];
        const parentsByChild = buildParentsIndex(kinEdges);
        const { houseLabelById, personHouseById } = buildHouseIndexes(housesRec);

        const normalizedFilter = String(filter ?? "").trim().toLowerCase();
        const ids = Object.keys(peopleRec).sort((a, b) => a.localeCompare(b));
        const filtered = normalizedFilter
          ? ids.filter((pid) => {
              const nm = typeof peopleRec?.[pid]?.name === "string" ? String(peopleRec[pid].name) : "";
              return pid.toLowerCase().includes(normalizedFilter) || nm.toLowerCase().includes(normalizedFilter);
            })
          : ids;

        const LIMIT = 250;
        const show = filtered.slice(0, LIMIT);
        const playerHeadId: string | null = typeof sAny?.house?.head?.id === "string" ? String(sAny.house.head.id) : null;

        function relToPlayer(pid: string): string | null {
          if (!playerHeadId) return null;
          const rels: any[] = Array.isArray(sAny?.relationships) ? sAny.relationships : [];
          const e = rels.find((x) => x && x.from_id === pid && x.to_id === playerHeadId);
          if (!e) return null;
          const a = typeof e.allegiance === "number" ? Math.trunc(e.allegiance) : null;
          const r = typeof e.respect === "number" ? Math.trunc(e.respect) : null;
          const t = typeof e.threat === "number" ? Math.trunc(e.threat) : null;
          if (a === null && r === null && t === null) return null;
          return `A ${a ?? "?"} · R ${r ?? "?"} · T ${t ?? "?"}`;
        }

        return (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
              Showing {show.length} of {filtered.length} matches.
              {filtered.length > LIMIT ? ` (limit ${LIMIT})` : ""}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {show.map((pid) => {
                const p: any = peopleRec?.[pid] && typeof peopleRec[pid] === "object" ? peopleRec[pid] : { id: pid };
                const name = typeof p.name === "string" && p.name.trim().length > 0 ? p.name.trim() : pid;
                const age = typeof p.age === "number" && Number.isFinite(p.age) ? Math.trunc(p.age) : null;
                const sex = typeof p.sex === "string" ? p.sex : null;
                const alive = typeof p.alive === "boolean" ? p.alive : null;
                const married = typeof p.married === "boolean" ? p.married : null;
                const hid = personHouseById.get(pid) ?? null;
                const hLabel = hid ? houseLabelById.get(hid) ?? hid : null;
                const parentsLine = formatParentsLine(pid, parentsByChild, peopleRec, houseLabelById, personHouseById);
                const relLine = relToPlayer(pid);

                return (
                  <details key={pid} style={{ border: "1px solid #2a2a2a", padding: 10, borderRadius: 8 }}>
                    <summary style={{ cursor: "pointer" }}>
                      <span style={{ fontWeight: 650 }}>{name}</span>
                      <span style={{ opacity: 0.8 }}>
                        {age !== null ? ` — Age ${age}` : ""}
                        {sex ? ` — ${sex}` : ""}
                        {alive === false ? " — deceased" : ""}
                        {married === true ? " — married" : ""}
                        {hLabel ? ` — ${hLabel}` : ""}
                      </span>
                    </summary>

                    {parentsLine ? (
                      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>Parents: {parentsLine}</div>
                    ) : null}
                    {relLine ? (
                      <div style={{ fontSize: 12, opacity: 0.85, marginTop: parentsLine ? 2 : 6 }}>To player head: {relLine}</div>
                    ) : null}

                    <pre style={{ marginTop: 8, background: "#111", color: "#eee", padding: 10, overflow: "auto" }}>
                      {JSON.stringify(p, null, 2)}
                    </pre>
                  </details>
                );
              })}
            </div>
          </div>
        );
      })()}
    </details>
  );
}
