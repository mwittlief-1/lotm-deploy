import type { CouncilRoomReadyProjectionV1 } from "../ready/councilRoomReadyProjection";
import type { CourtOsSessionContextV1 } from "../courtosSessionContext";
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
    principal: CourtOsSessionContextV1["principal"];
    status: "house_record_inspection" | "qa_projection";
    entitlement: "house_controller" | "generalization_qa";
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
  sessionContext: CourtOsSessionContextV1;
}): CourtOsShellRuntimeModel {
  const courtHouseId = input.courtOs.selected_entity.protected_graph_entity_id;
  if (!courtHouseId || courtHouseId !== input.council.house_ref.entity_id) {
    throw new Error("CourtOS shell sources do not resolve to the same House.");
  }
  if (input.sessionContext.selected_house_id !== courtHouseId) {
    throw new Error("CourtOS session context does not match the selected House.");
  }
  if (
    input.sessionContext.acting_actor.status !== "unadmitted" ||
    input.sessionContext.acting_actor.person_id !== null ||
    input.sessionContext.acting_actor.authority_basis !== null
  ) {
    throw new Error("CourtOS acting authority requires an admitted authority basis.");
  }
  const candidateCouncil = input.council.inner_council_seats.some((seat) =>
    seat.source_refs.some((source) =>
      source.authority_status?.toLowerCase().includes("candidate"),
    ),
  );
  const player: CourtOsShellRuntimeModel["player"] = {
    principal: input.sessionContext.principal,
    status:
      input.sessionContext.house_access === "player_house"
        ? "house_record_inspection"
        : "qa_projection",
    entitlement:
      input.sessionContext.house_access === "player_house"
        ? "house_controller"
        : "generalization_qa",
    houseId: input.sessionContext.player_house_id,
    label:
      input.sessionContext.house_access === "player_house"
        ? `Playing ${input.courtOs.selected_entity.display_label ?? input.council.house_ref.display_name} · House records`
        : "Generalization QA · source projection",
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
          label: "acting person not established · regency indicated",
        }
      : {
          status: "unadmitted",
          actor: null,
          label: "acting person not established",
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
