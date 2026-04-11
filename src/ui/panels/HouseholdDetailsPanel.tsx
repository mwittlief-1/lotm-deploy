import React from "react";
import type { RunState } from "../../sim/types";
import { findLastSuccession, getAllHouseLogEntries, getPlayerHousehold } from "../stateSelectors";
import { Badge, formatNameParts, formatPersonName, Tip } from "../viewHelpers";
import { PersonCardTrigger } from "./PersonCardTrigger";

type HouseholdDetailsPanelProps = {
  copy: any;
  currentHouseLog: any[];
  courtRosterEntries: any[];
  courtSize: number | null;
  onOpenPersonCard?: (personId: string) => void;
  personCardIds?: Set<string>;
  previewState: RunState;
  state: RunState;
};

export function HouseholdDetailsPanel({
  copy,
  currentHouseLog,
  courtRosterEntries,
  courtSize,
  onOpenPersonCard,
  personCardIds,
  previewState,
  state
}: HouseholdDetailsPanelProps) {
  const household = getPlayerHousehold(previewState);
  const lastSuccession = findLastSuccession(state);

  function houseNameFromRegistry(house_id: string | null | undefined): string | null {
    const hid = typeof house_id === "string" ? house_id : null;
    if (!hid) return null;
    const houses: any = (previewState as any).houses;
    const h = houses && typeof houses === "object" ? houses[hid] : null;
    const name =
      (h &&
        typeof h === "object" &&
        (typeof h.name === "string" ? h.name : typeof h.house_name === "string" ? h.house_name : typeof h.houseName === "string" ? h.houseName : null)) ||
      null;
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
    const map = new Map<string, string>();
    const snapshot: any = previewState as any;
    const edges: any[] = Array.isArray(snapshot?.kinship_edges)
      ? snapshot.kinship_edges
      : Array.isArray(snapshot?.kinship)
        ? snapshot.kinship
        : [];

    for (const edge of edges) {
      if (!edge || typeof edge !== "object") continue;
      if ((edge as any).kind !== "spouse_of") continue;
      const a = (edge as any).a_id;
      const b = (edge as any).b_id;
      if (typeof a !== "string" || typeof b !== "string" || !a || !b || a === b) continue;

      const setMin = (key: string, value: string) => {
        const current = map.get(key);
        if (!current || value.localeCompare(current) < 0) map.set(key, value);
      };

      setMin(a, b);
      setMin(b, a);
    }

    return map;
  })();

  function spouseNameForPersonId(person_id: string): string | null {
    const spouseId = spouseIdByPersonId.get(person_id);
    if (!spouseId || spouseId === person_id) return null;
    return personNameFromRegistry(spouseId) ?? null;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ padding: 12, border: "1px solid #ddd7cb", background: "#fffdf8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>
            {household.head?.id && personCardIds?.has(household.head.id) && onOpenPersonCard ? (
              <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={household.head.id}>
                {formatPersonName(household.head)}
              </PersonCardTrigger>
            ) : (
              formatPersonName(household.head)
            )}
          </div>
          <div style={{ fontSize: 12, opacity: 0.78 }}>
            {lastSuccession
              ? `${copy.lastSuccessionLabel} Turn ${lastSuccession.turn_index} — ${copy.logOutcome_succession(lastSuccession.new_ruler_name)}`
              : copy.lastSuccessionNone}
          </div>
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
          <div>
            <b>{copy.heirLabel}</b>{" "}
            {household.heir_id
              ? (() => {
                  const heir = household.children.find((child: any) => child.id === household.heir_id)
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
            <b>{copy.childrenLabel}</b> {household.children.length ? household.children.length : copy.none}
          </div>
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd7cb", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 6 }}>
          {copy.courtSizeLabel}: {courtSize !== null ? courtSize : "(Not available in this build)"} <Tip text={copy.tooltipCourtSize} />
        </div>

        <ul style={{ margin: "0 0 10px 18px" }}>
          {courtRosterEntries.length === 0 ? (
            <li style={{ opacity: 0.7 }}>(Not available in this build)</li>
          ) : (
            courtRosterEntries.map((entry) => {
              const spouseName = spouseNameForPersonId(entry.person.id);
              return (
                <li key={entry.person.id} style={{ marginBottom: 6 }}>
                  <div>
                    {personCardIds?.has(entry.person.id) && onOpenPersonCard ? (
                      <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={entry.person.id}>
                        {formatPersonName(entry.person)}
                      </PersonCardTrigger>
                    ) : (
                      <span>{formatPersonName(entry.person)}</span>
                    )}
                    {entry.badges.map((badge: string) => (
                      <Badge key={`${entry.person.id}:${badge}`} text={badge} />
                    ))}
                  </div>

                  {spouseName ? (
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                      Spouse: {spouseName}
                    </div>
                  ) : null}

                  {entry.parents_line ? (
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                      Parents: {entry.parents_line}
                    </div>
                  ) : null}

                  {entry.role_label || entry.officer_role_label ? (
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: spouseName ? 2 : 0 }}>
                      {entry.role_label ? entry.role_label : null}
                      {entry.officer_role_label ? ` — ${entry.officer_role_label}` : null}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: spouseName ? 2 : 0 }}>(Not available in this build)</div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd7cb", background: "#fff" }}>
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
              {all.map((entry, index) => {
                const kind = entry?.kind;
                let title = "";
                let outcome = "";
                let details: string | null = null;

                if (kind === "widowed") {
                  title = copy.logTitle_widowed;
                  const spouseParts = formatNameParts(entry?.spouse_name, entry?.spouse_age, entry?.spouse_short_id, entry?.spouse_id);
                  const spouseName = spouseParts.displayName
                    ? spouseParts.ageText
                      ? `${spouseParts.displayName} (${spouseParts.ageText})`
                      : spouseParts.displayName
                    : "";
                  outcome = copy.logOutcome_widowed(spouseName);
                  details = copy.logDetails_widowed;
                } else if (kind === "heir_selected") {
                  title = copy.logTitle_heir_selected;
                  const heirParts = formatNameParts(entry?.heir_name, entry?.heir_age, entry?.heir_short_id, entry?.heir_id);
                  const heirName = heirParts.displayName
                    ? heirParts.ageText
                      ? `${heirParts.displayName} (${heirParts.ageText})`
                      : heirParts.displayName
                    : "";
                  outcome = copy.logOutcome_heir_selected(heirName);
                } else if (kind === "succession") {
                  title = copy.logTitle_succession;
                  const rulerParts = formatNameParts(entry?.new_ruler_name, entry?.new_ruler_age, entry?.new_ruler_short_id, entry?.new_ruler_id);
                  const newRulerName = rulerParts.displayName
                    ? rulerParts.ageText
                      ? `${rulerParts.displayName} (${rulerParts.ageText})`
                      : rulerParts.displayName
                    : "";
                  outcome = copy.logOutcome_succession(newRulerName);

                  const heirParts = formatNameParts(entry?.heir_name, entry?.heir_age, entry?.heir_short_id, entry?.heir_id);
                  const heirName = heirParts.displayName
                    ? heirParts.ageText
                      ? `${heirParts.displayName} (${heirParts.ageText})`
                      : heirParts.displayName
                    : "";
                  if (heirName) details = copy.logDetails_succession_heir(heirName);
                } else if (kind === "marriage" || kind === "marriage_arranged" || kind === "marriage_resolved") {
                  title = copy.prospectType_marriage;

                  const childId: string | null =
                    typeof entry?.child_id === "string"
                      ? entry.child_id
                      : typeof entry?.subject_person_id === "string"
                        ? entry.subject_person_id
                        : typeof entry?.person_id === "string"
                          ? entry.person_id
                          : null;

                  const childNameFromReg = personNameFromRegistry(childId);
                  const childParts = formatNameParts(
                    entry?.child_name ?? entry?.person_name ?? entry?.subject_person_name,
                    entry?.child_age ?? entry?.person_age ?? entry?.subject_person_age,
                    entry?.child_short_id ?? entry?.person_short_id ?? entry?.subject_person_short_id,
                    entry?.child_id ?? entry?.person_id ?? entry?.subject_person_id
                  );
                  const childName = childNameFromReg
                    ?? (childParts.displayName
                      ? childParts.ageText
                        ? `${childParts.displayName} (${childParts.ageText})`
                        : childParts.displayName
                      : "");

                  const spouseId: string | null =
                    typeof entry?.spouse_id === "string"
                      ? entry.spouse_id
                      : typeof entry?.spouse_person_id === "string"
                        ? entry.spouse_person_id
                        : null;
                  const spouseNameFromReg = personNameFromRegistry(spouseId);
                  const spouseParts = formatNameParts(entry?.spouse_name, entry?.spouse_age, entry?.spouse_short_id, entry?.spouse_id);
                  const spouseName = spouseNameFromReg
                    ?? (spouseParts.displayName
                      ? spouseParts.ageText
                        ? `${spouseParts.displayName} (${spouseParts.ageText})`
                        : spouseParts.displayName
                      : "");

                  const otherHouseName: string | null =
                    typeof entry?.other_house_name === "string"
                      ? entry.other_house_name
                      : typeof entry?.otherHouseName === "string"
                        ? entry.otherHouseName
                        : typeof entry?.other_house_id === "string"
                          ? houseNameFromRegistry(entry.other_house_id)
                          : typeof entry?.from_house_id === "string"
                            ? houseNameFromRegistry(entry.from_house_id)
                            : null;

                  if (childName && spouseName) outcome = `${childName} married ${spouseName}.`;
                  else if (childName && otherHouseName) outcome = `${childName} married into House ${otherHouseName}.`;
                  else if (childName) outcome = `${childName} married.`;

                  const detailsParts: string[] = [];
                  const dowrySigned = typeof entry?.dowry_signed_coin === "string" ? entry.dowry_signed_coin : null;
                  if (dowrySigned) {
                    detailsParts.push(`Dowry: ${dowrySigned}.`);
                  } else {
                    const amount = typeof entry?.dowry_amount === "number" && Number.isFinite(entry.dowry_amount) ? Math.trunc(entry.dowry_amount) : null;
                    const direction = typeof entry?.dowry_direction === "string" ? entry.dowry_direction : null;
                    if (amount !== null && amount !== 0) {
                      const signed = amount > 0 ? `+${amount}` : String(amount);
                      if (direction === "paid" || direction === "received") detailsParts.push(`Dowry: ${signed} coin (${direction}).`);
                      else detailsParts.push(`Dowry: ${signed} coin.`);
                    }
                  }

                  function inferResidenceChange(): "spouse_joins" | "child_leaves" | null {
                    if (entry?.spouse_joins_court === true || entry?.spouse_joined_court === true) return "spouse_joins";
                    if (entry?.child_leaves_court === true || entry?.child_left_court === true) return "child_leaves";

                    const residence = typeof entry?.residence === "string" ? entry.residence.toLowerCase() : null;
                    if (residence) {
                      if (residence.includes("join") || residence.includes("in") || residence.includes("court")) return "spouse_joins";
                      if (residence.includes("leave") || residence.includes("out")) return "child_leaves";
                    }

                    const courtDelta = typeof entry?.court_delta === "number" && Number.isFinite(entry.court_delta) ? Math.trunc(entry.court_delta) : null;
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

                const turnIndex = typeof entry?.turn_index === "number" ? entry.turn_index : null;
                if (!title || !outcome || turnIndex === null) return null;

                return (
                  <div key={index} style={{ border: "1px solid #eee", padding: 8, background: "#fafafa" }}>
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
    </div>
  );
}
