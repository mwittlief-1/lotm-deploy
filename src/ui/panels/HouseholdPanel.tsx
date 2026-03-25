import React from "react";
import type { RunState } from "../../sim/types";
import { findLastSuccession, getAllHouseLogEntries, getPlayerHousehold } from "../stateSelectors";
import { Badge, formatNameParts, formatPersonName, Tip } from "../viewHelpers";

type LocalStatus = { key: string; role: string; name: string; status: "alive" | "deceased" | "vacant" };

type HouseholdPanelProps = {
  anchorId: string;
  copy: any;
  currentHouseLog: any[];
  courtRosterEntries: any[];
  courtSize: number | null;
  previewState: RunState;
  state: RunState;
  showDetails: boolean;
  onToggleDetails: () => void;
};

export function HouseholdPanel({
  anchorId,
  copy,
  currentHouseLog,
  courtRosterEntries,
  courtSize,
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
      rows.push({ key, role, name, status });
    };

    pushLocal("Liege", "liege", sAny?.locals?.liege);
    pushLocal("Clergy", "clergy", sAny?.locals?.clergy);

    const nobles: any[] = Array.isArray(sAny?.locals?.nobles) ? sAny.locals.nobles : [];
    nobles.forEach((n, i) => pushLocal(`Local ${i + 1}`, `noble:${i}`, n));

    return rows.sort((a, b) => a.key.localeCompare(b.key));
  })();

  function houseNameFromRegistry(house_id: string | null | undefined): string | null {
    const hid = typeof house_id === "string" ? house_id : null;
    if (!hid) return null;
    const houses: any = (previewState as any).houses;
    const h = houses && typeof houses === "object" ? houses[hid] : null;
    const name =
      (h && typeof h === "object" && (
        typeof h.name === "string" ? h.name : typeof h.house_name === "string" ? h.house_name : typeof h.houseName === "string" ? h.houseName : null
      )) || null;
    return name ? String(name) : null;
  }

  function personNameFromRegistry(person_id: string | null | undefined): string | null {
    const pid = typeof person_id === "string" ? person_id : null;
    if (!pid) return null;
    const people: any = (previewState as any).people;
    const p = people && typeof people === "object" ? people[pid] : null;
    if (p && typeof p === "object" && typeof p.name === "string") {
      return formatPersonName(p as any);
    }
    return null;
  }

  const spouseIdByPersonId: Map<string, string> = (() => {
    const m = new Map<string, string>();
    const s: any = previewState as any;
    const edges: any[] = Array.isArray(s?.kinship_edges) ? s.kinship_edges : Array.isArray(s?.kinship) ? s.kinship : [];
    for (const e of edges) {
      if (!e || typeof e !== "object") continue;
      if ((e as any).kind !== "spouse_of") continue;
      const a = (e as any).a_id;
      const b = (e as any).b_id;
      if (typeof a !== "string" || typeof b !== "string" || !a || !b || a === b) continue;
      const setMin = (k: string, v: string) => {
        const cur = m.get(k);
        if (!cur || v.localeCompare(cur) < 0) m.set(k, v);
      };
      setMin(a, b);
      setMin(b, a);
    }
    return m;
  })();

  function spouseNameForPersonId(person_id: string): string | null {
    const sid = spouseIdByPersonId.get(person_id);
    if (!sid || sid === person_id) return null;
    return personNameFromRegistry(sid) ?? null;
  }

  return (
    <>
      <h4 id={anchorId}>{copy.household}</h4>
      <div style={{ padding: 10, border: "1px solid #eee", background: "#fff", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{formatPersonName(household.head)}</div>
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
                  return heir ? formatPersonName(heir) : copy.none;
                })()
              : copy.none}
          </div>
          <div>
            <b>{copy.spouseLabel}</b>{" "}
            {household.spouse ? formatPersonName(household.spouse) : copy.none}
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
                <span style={{ fontWeight: 600 }}>{r.role}:</span> {r.name}
                <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>
                  ({r.status === "alive" ? "Alive" : r.status === "deceased" ? "Deceased" : "Vacant"})
                </span>
              </li>
            ))}
          </ul>
        </div>

        {showDetails ? (
          <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 6 }}>
              {copy.courtSizeLabel}: {courtSize !== null ? courtSize : "(Not available in this build)"} <Tip text={copy.tooltipCourtSize} />
            </div>

            <ul style={{ margin: "0 0 10px 18px" }}>
              {courtRosterEntries.length === 0 ? (
                <li style={{ opacity: 0.7 }}>(Not available in this build)</li>
              ) : (
                courtRosterEntries.map((r) => {
                  const spouseName = spouseNameForPersonId(r.person.id);
                  return (
                    <li key={r.person.id} style={{ marginBottom: 6 }}>
                      <div>
                        <span>{formatPersonName(r.person)}</span>
                        {r.badges.map((b: string) => (
                          <Badge key={`${r.person.id}:${b}`} text={b} />
                        ))}
                      </div>

                      {spouseName ? (
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                          Spouse: {spouseName}
                        </div>
                      ) : null}

                      {r.parents_line ? (
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                          Parents: {r.parents_line}
                        </div>
                      ) : null}

                      {r.role_label || r.officer_role_label ? (
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: spouseName ? 2 : 0 }}>
                          {r.role_label ? r.role_label : null}
                          {r.officer_role_label ? ` — ${r.officer_role_label}` : null}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, opacity: 0.6, marginTop: spouseName ? 2 : 0 }}>(Not available in this build)</div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            <div style={{ fontWeight: 700, marginBottom: 6 }}>{copy.houseLog}</div>

            {(() => {
              const all = getAllHouseLogEntries(state, currentHouseLog);
              if (!all.length) {
                return <div style={{ fontSize: 12, opacity: 0.85 }}>{copy.noHouseLogYet}</div>;
              }
              const header = !currentHouseLog.length ? (
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>{copy.noNewHouseLogThisTurn}</div>
              ) : null;
              return (
                <div style={{ display: "grid", gap: 8 }}>
                  {header}
                  {all.map((e, idx) => {
                    const kind = e?.kind;
                    let title = "";
                    let outcome = "";
                    let details: string | null = null;
                    if (kind === "widowed") {
                      title = copy.logTitle_widowed;
                      const spouseParts = formatNameParts(e?.spouse_name, e?.spouse_age, e?.spouse_short_id, e?.spouse_id);
                      const spouseName = spouseParts.displayName
                        ? spouseParts.ageText
                          ? `${spouseParts.displayName} (${spouseParts.ageText})`
                          : spouseParts.displayName
                        : "";
                      outcome = copy.logOutcome_widowed(spouseName);
                      details = copy.logDetails_widowed;
                    } else if (kind === "heir_selected") {
                      title = copy.logTitle_heir_selected;
                      const heirParts = formatNameParts(e?.heir_name, e?.heir_age, e?.heir_short_id, e?.heir_id);
                      const heirName = heirParts.displayName
                        ? heirParts.ageText
                          ? `${heirParts.displayName} (${heirParts.ageText})`
                          : heirParts.displayName
                        : "";
                      outcome = copy.logOutcome_heir_selected(heirName);
                    } else if (kind === "succession") {
                      title = copy.logTitle_succession;
                      const rulerParts = formatNameParts(e?.new_ruler_name, e?.new_ruler_age, e?.new_ruler_short_id, e?.new_ruler_id);
                      const newRulerName = rulerParts.displayName
                        ? rulerParts.ageText
                          ? `${rulerParts.displayName} (${rulerParts.ageText})`
                          : rulerParts.displayName
                        : "";
                      outcome = copy.logOutcome_succession(newRulerName);

                      const heirParts = formatNameParts(e?.heir_name, e?.heir_age, e?.heir_short_id, e?.heir_id);
                      const heirName = heirParts.displayName
                        ? heirParts.ageText
                          ? `${heirParts.displayName} (${heirParts.ageText})`
                          : heirParts.displayName
                        : "";
                      if (heirName) details = copy.logDetails_succession_heir(heirName);
                    } else if (kind === "marriage" || kind === "marriage_arranged" || kind === "marriage_resolved") {
                      title = copy.prospectType_marriage;

                      const childId: string | null =
                        typeof e?.child_id === "string"
                          ? e.child_id
                          : typeof e?.subject_person_id === "string"
                            ? e.subject_person_id
                            : typeof e?.person_id === "string"
                              ? e.person_id
                              : null;

                      const childNameFromReg = personNameFromRegistry(childId);
                      const childParts = formatNameParts(
                        e?.child_name ?? e?.person_name ?? e?.subject_person_name,
                        e?.child_age ?? e?.person_age ?? e?.subject_person_age,
                        e?.child_short_id ?? e?.person_short_id ?? e?.subject_person_short_id,
                        e?.child_id ?? e?.person_id ?? e?.subject_person_id
                      );
                      const childName = childNameFromReg ?? (childParts.displayName
                        ? childParts.ageText
                          ? `${childParts.displayName} (${childParts.ageText})`
                          : childParts.displayName
                        : "");

                      const spouseId: string | null =
                        typeof e?.spouse_id === "string"
                          ? e.spouse_id
                          : typeof e?.spouse_person_id === "string"
                            ? e.spouse_person_id
                            : null;
                      const spouseNameFromReg = personNameFromRegistry(spouseId);
                      const spouseParts = formatNameParts(e?.spouse_name, e?.spouse_age, e?.spouse_short_id, e?.spouse_id);
                      const spouseName = spouseNameFromReg ?? (spouseParts.displayName
                        ? spouseParts.ageText
                          ? `${spouseParts.displayName} (${spouseParts.ageText})`
                          : spouseParts.displayName
                        : "");

                      const otherHouseName: string | null =
                        typeof e?.other_house_name === "string"
                          ? e.other_house_name
                          : typeof e?.otherHouseName === "string"
                            ? e.otherHouseName
                            : typeof e?.other_house_id === "string"
                              ? houseNameFromRegistry(e.other_house_id)
                              : typeof e?.from_house_id === "string"
                                ? houseNameFromRegistry(e.from_house_id)
                                : null;

                      if (childName && spouseName) outcome = `${childName} married ${spouseName}.`;
                      else if (childName && otherHouseName) outcome = `${childName} married into House ${otherHouseName}.`;
                      else if (childName) outcome = `${childName} married.`;

                      const detailsParts: string[] = [];
                      const dowrySigned = typeof e?.dowry_signed_coin === "string" ? e.dowry_signed_coin : null;
                      if (dowrySigned) {
                        detailsParts.push(`Dowry: ${dowrySigned}.`);
                      } else {
                        const amt = typeof e?.dowry_amount === "number" && Number.isFinite(e.dowry_amount) ? Math.trunc(e.dowry_amount) : null;
                        const dir = typeof e?.dowry_direction === "string" ? e.dowry_direction : null;
                        if (amt !== null && amt !== 0) {
                          const signed = amt > 0 ? `+${amt}` : String(amt);
                          if (dir === "paid" || dir === "received") detailsParts.push(`Dowry: ${signed} coin (${dir}).`);
                          else detailsParts.push(`Dowry: ${signed} coin.`);
                        }
                      }

                      function inferResidenceChange(): "spouse_joins" | "child_leaves" | null {
                        if (e?.spouse_joins_court === true || e?.spouse_joined_court === true) return "spouse_joins";
                        if (e?.child_leaves_court === true || e?.child_left_court === true) return "child_leaves";

                        const r = typeof e?.residence === "string" ? e.residence.toLowerCase() : null;
                        if (r) {
                          if (r.includes("join") || r.includes("in") || r.includes("court")) return "spouse_joins";
                          if (r.includes("leave") || r.includes("out")) return "child_leaves";
                        }

                        const courtDelta = typeof e?.court_delta === "number" && Number.isFinite(e.court_delta) ? Math.trunc(e.court_delta) : null;
                        if (courtDelta !== null) {
                          if (courtDelta > 0) return "spouse_joins";
                          if (courtDelta < 0) return "child_leaves";
                        }

                        const people: any = (previewState as any).people;
                        const childRec: any = childId && people && typeof people === "object" ? people[childId] : null;
                        const sex = childRec && typeof childRec === "object" ? childRec.sex : null;
                        if (sex === "F") return "child_leaves";
                        if (sex === "M") return "spouse_joins";
                        return null;
                      }

                      const residenceChange = inferResidenceChange();
                      if (residenceChange === "spouse_joins") {
                        if (spouseName) detailsParts.push(`${copy.marriageToast_spouseJoinsCourt(spouseName)} ${copy.marriageToast_courtSizeIncreased}`);
                        else detailsParts.push(copy.marriageToast_courtSizeIncreased);
                      } else if (residenceChange === "child_leaves") {
                        if (childName) detailsParts.push(`${copy.marriageToast_childLeavesCourt(childName)} ${copy.marriageToast_courtSizeDecreased}`);
                        else detailsParts.push(copy.marriageToast_courtSizeDecreased);
                      }

                      details = detailsParts.length ? detailsParts.join(" ") : null;
                    }
                    const turnIndex = typeof e?.turn_index === "number" ? e.turn_index : null;
                    if (!title || !outcome || turnIndex === null) return null;
                    return (
                      <div key={idx} style={{ border: "1px solid #eee", padding: 8, background: "#fafafa" }}>
                        <div style={{ fontWeight: 700 }}>{title}</div>
                        <div style={{ fontSize: 12, opacity: 0.95, marginTop: 2 }}>{outcome}</div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Turn: {turnIndex}</div>
                        {details ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{details}</div> : null}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : null}
      </div>
    </>
  );
}
