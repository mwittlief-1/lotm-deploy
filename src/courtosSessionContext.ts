import { COURTOS_PLAYER_CONTEXT } from "./courtosPlayerContext";

export type CourtOsRuntimeMode = "player_runtime" | "generalization_qa";

export interface CourtOsSessionContextV1 {
  schema_version: "courtos_session_context_v1";
  runtime_mode: CourtOsRuntimeMode;
  principal: "local_player" | "qa_agent";
  selected_house_id: string;
  player_house_id: string | null;
  house_access: "player_house" | "generalization_qa";
  acting_actor: {
    status: "unadmitted";
    person_id: null;
    authority_basis: null;
  };
  knowledge: {
    lens: "source_bounded_house_records" | "qa_projection";
    actor_knowledge_status: "unavailable_actor_unadmitted";
    actor_specific_content: "withheld";
  };
  capabilities: {
    inspect_house_records: true;
    issue_commands: false;
    manage_assignments: false;
    access_correspondence: false;
    conduct_actor_dialogue: false;
  };
}

export function isCourtOsSessionContextV1(
  value: unknown,
): value is CourtOsSessionContextV1 {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<CourtOsSessionContextV1>;
  const capabilities = context.capabilities;
  const playerRuntime = context.runtime_mode === "player_runtime";
  return Boolean(
    context.schema_version === "courtos_session_context_v1" &&
      (context.runtime_mode === "player_runtime" ||
        context.runtime_mode === "generalization_qa") &&
      typeof context.selected_house_id === "string" &&
      context.selected_house_id.length > 0 &&
      context.principal === (playerRuntime ? "local_player" : "qa_agent") &&
      context.player_house_id ===
        (playerRuntime ? COURTOS_PLAYER_CONTEXT.house_id : null) &&
      context.house_access ===
        (playerRuntime ? "player_house" : "generalization_qa") &&
      (!playerRuntime ||
        context.selected_house_id === COURTOS_PLAYER_CONTEXT.house_id) &&
      context.acting_actor?.status === "unadmitted" &&
      context.acting_actor.person_id === null &&
      context.acting_actor.authority_basis === null &&
      context.knowledge?.actor_knowledge_status ===
        "unavailable_actor_unadmitted" &&
      context.knowledge.lens ===
        (playerRuntime ? "source_bounded_house_records" : "qa_projection") &&
      context.knowledge.actor_specific_content === "withheld" &&
      capabilities?.inspect_house_records === true &&
      capabilities.issue_commands === false &&
      capabilities.manage_assignments === false &&
      capabilities.access_correspondence === false &&
      capabilities.conduct_actor_dialogue === false
  );
}

export function buildCourtOsSessionContext(
  runtimeMode: CourtOsRuntimeMode,
  selectedHouseId: string,
): CourtOsSessionContextV1 {
  if (!selectedHouseId.trim()) {
    throw new Error("CourtOS session context requires a selected House.");
  }
  const playerRuntime = runtimeMode === "player_runtime";
  if (playerRuntime && selectedHouseId !== COURTOS_PLAYER_CONTEXT.house_id) {
    throw new Error("CourtOS player session does not match the selected House.");
  }
  return {
    schema_version: "courtos_session_context_v1",
    runtime_mode: runtimeMode,
    principal: playerRuntime ? "local_player" : "qa_agent",
    selected_house_id: selectedHouseId,
    player_house_id: playerRuntime ? COURTOS_PLAYER_CONTEXT.house_id : null,
    house_access: playerRuntime ? "player_house" : "generalization_qa",
    acting_actor: {
      status: "unadmitted",
      person_id: null,
      authority_basis: null,
    },
    knowledge: {
      lens: playerRuntime
        ? "source_bounded_house_records"
        : "qa_projection",
      actor_knowledge_status: "unavailable_actor_unadmitted",
      actor_specific_content: "withheld",
    },
    capabilities: {
      inspect_house_records: true,
      issue_commands: false,
      manage_assignments: false,
      access_correspondence: false,
      conduct_actor_dialogue: false,
    },
  };
}
