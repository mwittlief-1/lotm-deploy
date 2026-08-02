import { COURTOS_PLAYER_CONTEXT } from "../../courtosPlayerContext";

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
): void {
  if (
    mode === "player_runtime" &&
    houseId !== COURTOS_PLAYER_CONTEXT.house_id
  ) {
    throw new CourtOsHouseAccessDenied();
  }
}
