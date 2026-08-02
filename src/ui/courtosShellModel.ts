import type { CouncilRoomReadyProjectionV1 } from "../ready/councilRoomReadyProjection";
import type { CourtOs1120ReadOnlyProjection } from "./readModels/courtos1120/types";

export interface CourtOsShellRuntimeModel {
  house: {
    houseId: string;
    entityId: string;
    displayName: string;
  };
  turn: {
    year: number;
    label: string;
  };
  player: {
    principal: "local_player";
    status: "house_controller" | "read_only_view" | "unconfigured";
    entitlement: "house_controller" | null;
    houseId: string | null;
    label: string;
  };
  head: CouncilRoomReadyProjectionV1["head_ref"];
  authority: {
    status: "unadmitted" | "regency_required";
    actor: CouncilRoomReadyProjectionV1["head_ref"] | null;
    label: string;
  };
  councilSource: {
    status: "candidate_projection" | "non_authoritative_projection";
    label: string;
  };
  council: readonly CouncilRoomReadyProjectionV1["inner_council_seats"][number][];
  effectiveDate: string;
}

export function buildCourtOsShellRuntimeModel(input: {
  courtOs: CourtOs1120ReadOnlyProjection;
  council: CouncilRoomReadyProjectionV1;
  playerHouseId?: string | null;
}): CourtOsShellRuntimeModel {
  const courtHouseId = input.courtOs.selected_entity.protected_graph_entity_id;
  if (!courtHouseId || courtHouseId !== input.council.house_ref.entity_id) {
    throw new Error("CourtOS shell sources do not resolve to the same House.");
  }
  const candidateCouncil = input.council.inner_council_seats.some((seat) =>
    seat.source_refs.some((source) =>
      source.authority_status?.toLowerCase().includes("candidate"),
    ),
  );
  const playerHouseId = input.playerHouseId?.trim() || null;
  const player: CourtOsShellRuntimeModel["player"] = !playerHouseId
    ? {
        principal: "local_player",
        status: "unconfigured",
        entitlement: null,
        houseId: null,
        label: "House record view · player House not configured",
      }
    : playerHouseId === courtHouseId
      ? {
          principal: "local_player",
          status: "house_controller",
          entitlement: "house_controller",
          houseId: playerHouseId,
          label: `Player House · ${input.courtOs.selected_entity.display_label ?? input.council.house_ref.display_name}`,
        }
      : {
          principal: "local_player",
          status: "read_only_view",
          entitlement: null,
          houseId: playerHouseId,
          label: "Read-only House inspection · no player entitlement",
        };

  return {
    house: {
      houseId: courtHouseId,
      entityId: input.courtOs.selected_entity.entity_id,
      displayName:
        input.courtOs.selected_entity.display_label ??
        input.council.house_ref.display_name,
    },
    turn: {
      year: input.council.turn.year,
      label: input.council.turn.label,
    },
    player,
    head: input.council.head_ref,
    authority: input.council.council_body.regency_required
      ? {
          status: "regency_required",
          actor: null,
          label: "Regency indicated · acting authority not admitted",
        }
      : {
          status: "unadmitted",
          actor: null,
          label: `Provisional head reference: ${input.council.head_ref.display_name} · acting authority not admitted`,
        },
    councilSource: candidateCouncil
      ? {
          status: "candidate_projection",
          label: "provisional Council membership · candidate source",
        }
      : {
          status: "non_authoritative_projection",
          label: "Council projection · non-authoritative source",
        },
    council: input.council.inner_council_seats,
    effectiveDate: input.courtOs.contract.effective_date,
  };
}
