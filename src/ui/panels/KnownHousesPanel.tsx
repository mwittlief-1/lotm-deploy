import React from "react";
import type { RunState } from "../../sim/types";
import { buildHouseSecondaryIdentifier } from "../identityLabels";
import { Tip, formatNameParts } from "../viewHelpers";
import { PersonCardTrigger } from "./PersonCardTrigger";

type KnownHousesPanelProps = {
  copy: any;
  dossierHouseIds?: Set<string>;
  hasMoreKnownHouses: boolean;
  knownHouses: any[];
  knownHousesMain: any[];
  onOpenHouseDossier?: (houseId: string) => void;
  onOpenPersonCard?: (personId: string) => void;
  onToggleShowAll: () => void;
  personCardIds?: Set<string>;
  previewState?: RunState | null;
  showAllKnownHouses: boolean;
};

export function KnownHousesPanel({
  copy,
  dossierHouseIds,
  hasMoreKnownHouses,
  knownHouses,
  knownHousesMain,
  onOpenHouseDossier,
  onOpenPersonCard,
  onToggleShowAll,
  personCardIds,
  previewState,
  showAllKnownHouses
}: KnownHousesPanelProps) {
  return (
    <>
      <h4 style={{ marginTop: 12 }}>{copy.knownHouses}</h4>
      {knownHouses.length === 0 ? (
        <div style={{ opacity: 0.7 }}>{copy.knownHousesEmpty}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {knownHousesMain.map((h, idx) => {
            const houseId = String(h?.house_id ?? h?.id ?? "").trim();
            const houseName = String(h?.house_name ?? h?.houseName ?? h?.name ?? "").trim();
            const tier = String(h?.tier ?? "").trim();
            const canOpenDossier = Boolean(houseId && dossierHouseIds?.has(houseId) && onOpenHouseDossier);
            const secondaryIdentifier = buildHouseSecondaryIdentifier(previewState, houseId, {
              houseName,
              knownHouse: h
            });

            const headNameRaw = h?.head_name ?? h?.head?.head_name ?? h?.head?.name ?? "";
            const headAgeRaw = h?.head_age ?? h?.head?.head_age ?? h?.head?.age;
            const headStatusRaw =
              h?.head_status ??
              h?.head?.head_status ??
              (typeof h?.head?.alive === "boolean" ? (h.head.alive ? "Alive" : "Deceased") : "");
            const headShortIdRaw = h?.head_short_id ?? h?.head?.short_id;
            const headIdRaw = h?.head_id ?? h?.head?.id;
            const headPersonId = typeof headIdRaw === "string" ? headIdRaw : null;

            const headParts = formatNameParts(headNameRaw, headAgeRaw, headShortIdRaw, headIdRaw);

            const heirRaw = h?.heir_indicator ?? h?.heir_indicator_enum ?? h?.heir_indicator_str;
            const hasMaleHeirRaw = h?.has_male_heir;
            const heiressPossibleRaw = h?.heiress_possible;

            let heirIndicator: string | null = null;
            const heirStr = typeof heirRaw === "string" ? heirRaw.trim() : "";
            if (heirStr === copy.heirIndicator_hasMaleHeir) heirIndicator = copy.heirIndicator_hasMaleHeir;
            else if (heirStr === copy.heirIndicator_noMaleHeir) heirIndicator = copy.heirIndicator_noMaleHeir;
            else if (heirStr === copy.heirIndicator_heiressPossible) heirIndicator = copy.heirIndicator_heiressPossible;
            else {
              const norm = heirStr.toLowerCase().replace(/[^a-z]/g, "");
              if (norm.includes("heiress")) heirIndicator = copy.heirIndicator_heiressPossible;
              else if (norm.includes("hasmale") || norm.includes("maleheir") || norm.includes("hasheir")) heirIndicator = copy.heirIndicator_hasMaleHeir;
              else if (norm.includes("nomale")) heirIndicator = copy.heirIndicator_noMaleHeir;
              else if (typeof heiressPossibleRaw === "boolean" && heiressPossibleRaw) heirIndicator = copy.heirIndicator_heiressPossible;
              else if (typeof hasMaleHeirRaw === "boolean") heirIndicator = hasMaleHeirRaw ? copy.heirIndicator_hasMaleHeir : copy.heirIndicator_noMaleHeir;
            }

            const rel = h?.relationship ?? h?.relation_to_player ?? h?.rel_to_player ?? null;
            const a = typeof (rel?.allegiance ?? h?.allegiance) === "number" ? Number(rel?.allegiance ?? h?.allegiance) : null;
            const r = typeof (rel?.respect ?? h?.respect) === "number" ? Number(rel?.respect ?? h?.respect) : null;
            const t = typeof (rel?.threat ?? h?.threat) === "number" ? Number(rel?.threat ?? h?.threat) : null;
            const showRel = a !== null && r !== null && t !== null;

            return (
              <div key={houseId || idx} style={{ padding: 10, border: "1px solid #eee", background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {houseName ? <div style={{ fontWeight: 700 }}>{copy.housePrefix(houseName)}</div> : <div />}
                  {canOpenDossier ? (
                    <button onClick={() => onOpenHouseDossier?.(houseId)} style={{ fontSize: 12 }} type="button">
                      Open dossier
                    </button>
                  ) : null}
                </div>

                {secondaryIdentifier ? (
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{secondaryIdentifier}</div>
                ) : null}

                {tier ? (
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.95 }}>
                    <b>{copy.tierLabel}</b> {tier} <Tip text={copy.tooltipTier} />
                  </div>
                ) : null}

                {headParts.displayName ? (
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.95 }}>
                    <b>{copy.headLabel}</b>{" "}
                    {headPersonId && personCardIds?.has(headPersonId) && onOpenPersonCard ? (
                      <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={headPersonId}>
                        {headParts.displayName}
                      </PersonCardTrigger>
                    ) : (
                      headParts.displayName
                    )}
                    {headParts.ageText ? ` (${headParts.ageText})` : ""}
                    {headStatusRaw ? ` — ${headStatusRaw}` : ""}
                  </div>
                ) : null}

                {heirIndicator ? (
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.95 }}>
                    {heirIndicator} <Tip text={copy.tooltipHeirIndicator} />
                  </div>
                ) : null}

                {showRel ? (
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.95 }}>
                    <b>Allegiance:</b> {a} <Tip text={copy.tooltipAllegiance} /> · <b>Respect:</b> {r} <Tip text={copy.tooltipRespect} /> · <b>Threat:</b> {t} <Tip text={copy.tooltipThreat} />
                  </div>
                ) : null}
              </div>
            );
          })}

          {hasMoreKnownHouses ? (
            <button onClick={onToggleShowAll} style={{ fontSize: 12, width: "fit-content" }}>
              {showAllKnownHouses ? copy.hideDetails : copy.showDetails}
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}
