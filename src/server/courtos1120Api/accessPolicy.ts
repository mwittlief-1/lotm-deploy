import { COURTOS_PLAYER_CONTEXT } from "../../courtosPlayerContext";
import {
  buildCourtOsSessionContext,
  type CourtOsActingActorV1,
  type CourtOsSessionContextV1,
} from "../../courtosSessionContext";

export type CourtOsAccessMode = "player_runtime" | "generalization_qa";

export class CourtOsHouseAccessDenied extends Error {
  readonly code = "COURTOS_HOUSE_ACCESS_DENIED";

  constructor() {
    super("The selected House is not available to this player runtime.");
    this.name = "CourtOsHouseAccessDenied";
  }
}

export function assertCourtOsHouseAccess(
  mode: CourtOsAccessMode,
  houseId: string,
  actingActor: CourtOsActingActorV1 = {
    status: "unadmitted",
    person_id: null,
    authority_basis: null,
  },
): CourtOsSessionContextV1 {
  if (
    mode === "player_runtime" &&
    houseId !== COURTOS_PLAYER_CONTEXT.house_id
  ) {
    throw new CourtOsHouseAccessDenied();
  }
  return buildCourtOsSessionContext(
    mode,
    houseId,
    mode === "player_runtime" ? actingActor : {
      status: "unadmitted",
      person_id: null,
      authority_basis: null,
    },
  );
}
