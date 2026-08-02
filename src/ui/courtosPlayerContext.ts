import playerContext from "../../config/courtos-player-context.v1.json";

export interface CourtOsPlayerContextV1 {
  schema_version: "courtos_player_context_v1";
  principal: "local_player";
  entitlement: "house_controller";
  house_id: string;
}

function validatePlayerContext(
  input: typeof playerContext,
): CourtOsPlayerContextV1 {
  if (
    input.schema_version !== "courtos_player_context_v1" ||
    input.principal !== "local_player" ||
    input.entitlement !== "house_controller" ||
    !input.house_id.trim()
  ) {
    throw new Error("CourtOS player context is invalid or incomplete.");
  }
  return {
    schema_version: "courtos_player_context_v1",
    principal: "local_player",
    entitlement: "house_controller",
    house_id: input.house_id,
  };
}

export const COURTOS_PLAYER_CONTEXT = Object.freeze(
  validatePlayerContext(playerContext),
);
