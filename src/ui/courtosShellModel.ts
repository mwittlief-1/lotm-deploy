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
  head: CouncilRoomReadyProjectionV1["head_ref"];
  council: readonly CouncilRoomReadyProjectionV1["inner_council_seats"][number][];
  effectiveDate: string;
}

export function buildCourtOsShellRuntimeModel(input: {
  courtOs: CourtOs1120ReadOnlyProjection;
  council: CouncilRoomReadyProjectionV1;
}): CourtOsShellRuntimeModel {
  const courtHouseId = input.courtOs.selected_entity.protected_graph_entity_id;
  if (!courtHouseId || courtHouseId !== input.council.house_ref.entity_id) {
    throw new Error("CourtOS shell sources do not resolve to the same House.");
  }

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
    head: input.council.head_ref,
    council: input.council.inner_council_seats,
    effectiveDate: input.courtOs.contract.effective_date,
  };
}
