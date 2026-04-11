import React from "react";
import type { RunState } from "../../sim/types";
import { findLastSuccession, getPlayerHousehold } from "../stateSelectors";
import { formatPersonName, Tip } from "../viewHelpers";
import { PersonCardTrigger } from "./PersonCardTrigger";

type LocalStatus = { key: string; personId: string | null; role: string; name: string; status: "alive" | "deceased" | "vacant" };

type HouseholdPanelProps = {
  anchorId: string;
  copy: any;
  courtSize: number | null;
  onOpenPersonCard?: (personId: string) => void;
  personCardIds?: Set<string>;
  previewState: RunState;
  state: RunState;
  showDetails: boolean;
  onToggleDetails: () => void;
};

export function HouseholdPanel({
  anchorId,
  copy,
  courtSize,
  onOpenPersonCard,
  personCardIds,
  previewState,
  state,
  showDetails,
  onToggleDetails
}: HouseholdPanelProps) {
  const household = getPlayerHousehold(previewState);
  const lastSuccession = findLastSuccession(state);

  const localStatusRows: LocalStatus[] = (() => {
    const sAny: any = previewState as any;
    const people: any = sAny?.people && typeof sAny.people === "object" ? sAny.people : {};
    const rows: LocalStatus[] = [];

    const pushLocal = (role: string, key: string, p: any) => {
      const id = typeof p?.id === "string" ? p.id : null;
      const reg = id ? people?.[id] : null;
      const nameRaw =
        typeof reg?.name === "string"
          ? reg.name
          : typeof p?.name === "string"
            ? p.name
            : `${role} (Vacant)`;
      const name = String(nameRaw).trim().length > 0 ? String(nameRaw).trim() : `${role} (Vacant)`;
      const alive = typeof reg?.alive === "boolean" ? reg.alive : typeof p?.alive === "boolean" ? p.alive : false;
      const status: LocalStatus["status"] = !id || /\(Vacant\)/i.test(name) ? "vacant" : alive ? "alive" : "deceased";
      rows.push({ key, personId: id, role, name, status });
    };

    pushLocal("Liege", "liege", sAny?.locals?.liege);
    pushLocal("Clergy", "clergy", sAny?.locals?.clergy);

    const nobles: any[] = Array.isArray(sAny?.locals?.nobles) ? sAny.locals.nobles : [];
    nobles.forEach((n, i) => pushLocal(`Local ${i + 1}`, `noble:${i}`, n));

    return rows.sort((a, b) => a.key.localeCompare(b.key));
  })();

  return (
    <>
      <h4 id={anchorId}>{copy.household}</h4>
      <div style={{ padding: 10, border: "1px solid #eee", background: "#fff", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div style={{ fontWeight: 700 }}>
              {household.head?.id && personCardIds?.has(household.head.id) && onOpenPersonCard ? (
                <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={household.head.id}>
                  {formatPersonName(household.head)}
                </PersonCardTrigger>
              ) : (
                formatPersonName(household.head)
              )}
            </div>
          </div>
          <button onClick={onToggleDetails} style={{ fontSize: 12 }}>
            {showDetails ? copy.hideHouseholdDetails : copy.showHouseholdDetails}
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
          <div>
            <b>{copy.heirLabel}</b>{" "}
            {household.heir_id
              ? (() => {
                  const heir = household.children.find((c: any) => c.id === household.heir_id)
                    ?? (previewState as any)?.people?.[household.heir_id]
                    ?? null;
                  return heir ? (
                    personCardIds?.has(household.heir_id) && onOpenPersonCard ? (
                      <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={household.heir_id}>
                        {formatPersonName(heir)}
                      </PersonCardTrigger>
                    ) : (
                      formatPersonName(heir)
                    )
                  ) : copy.none;
                })()
              : copy.none}
          </div>
          <div>
            <b>{copy.spouseLabel}</b>{" "}
            {household.spouse ? (
              household.spouse.id && personCardIds?.has(household.spouse.id) && onOpenPersonCard ? (
                <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={household.spouse.id}>
                  {formatPersonName(household.spouse)}
                </PersonCardTrigger>
              ) : (
                formatPersonName(household.spouse)
              )
            ) : copy.none}
          </div>
          <div>
            <b>{copy.childrenLabel}</b>{" "}
            {household.children.length ? household.children.length : copy.none}
          </div>
          <div>
            <b>{copy.courtSizeLabel}</b> {courtSize !== null ? courtSize : "(Not available in this build)"} <Tip text={copy.tooltipCourtSize} />
          </div>
          <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.9 }}>
            {lastSuccession
              ? `${copy.lastSuccessionLabel} Turn ${lastSuccession.turn_index} — ${copy.logOutcome_succession(lastSuccession.new_ruler_name)}`
              : copy.lastSuccessionNone}
          </div>
        </div>

        <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Locals</div>
          <ul style={{ margin: "0 0 0 18px" }}>
            {localStatusRows.map((r) => (
              <li key={r.key} style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{r.role}:</span>{" "}
                {r.personId && personCardIds?.has(r.personId) && onOpenPersonCard ? (
                  <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={r.personId}>
                    {r.name}
                  </PersonCardTrigger>
                ) : (
                  r.name
                )}
                <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>
                  ({r.status === "alive" ? "Alive" : r.status === "deceased" ? "Deceased" : "Vacant"})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
