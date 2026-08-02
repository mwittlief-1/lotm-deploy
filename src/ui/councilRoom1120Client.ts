import React from "react";

import {
  isCourtOsSessionContextV1,
  type CourtOsSessionContextV1,
} from "../courtosSessionContext";
import type { CouncilRoomReadyProjectionV1 } from "../ready/councilRoomReadyProjection";
import {
  courtOsTimeoutError,
  createCourtOsRequestDeadline,
} from "./courtosRequestDeadline";

type CouncilRoom1120ApiResponse =
  | { ok: true; context: CourtOsSessionContextV1; data: CouncilRoomReadyProjectionV1 }
  | { ok: false; error: { code: string; message: string } };

export type CouncilRoom1120LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; context: CourtOsSessionContextV1; data: CouncilRoomReadyProjectionV1; error: null }
  | { status: "blocked"; data: null; error: { code: string; message: string } }
  | { status: "error"; data: null; error: { code: string; message: string } };

export function useCouncilRoom1120Data(
  houseId: string | null,
  reloadKey = 0,
): CouncilRoom1120LoadState {
  const [state, setState] = React.useState<CouncilRoom1120LoadState>({
    status: "loading",
    data: null,
    error: null,
  });

  React.useEffect(() => {
    if (!houseId) {
      setState({
        status: "blocked",
        data: null,
        error: {
          code: "COUNCIL_ROOM_HOUSE_REQUIRED",
          message: "A selected House is required before the Council source can be opened.",
        },
      });
      return;
    }
    const deadline = createCourtOsRequestDeadline();
    const params = new URLSearchParams({ houseId });
    setState({ status: "loading", data: null, error: null });
    void fetch(`/api/council-room/1120?${params}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: deadline.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as CouncilRoom1120ApiResponse;
        if (!response.ok || payload.ok === false) {
          const error = payload.ok === true
            ? {
                code: `HTTP_${response.status}`,
                message: "Council Room source projection request failed.",
              }
            : payload.error;
          throw Object.assign(new Error(error.message), { code: error.code });
        }
        if (
          !isCourtOsSessionContextV1(payload.context) ||
          payload.context.selected_house_id !== houseId
        ) {
          throw new Error("Council Room session context is invalid.");
        }
        setState({ status: "ready", context: payload.context, data: payload.data, error: null });
      })
      .catch((error: unknown) => {
        if (deadline.signal.aborted && !deadline.didTimeOut()) return;
        if (deadline.didTimeOut()) {
          setState({
            status: "error",
            data: null,
            error: courtOsTimeoutError(
              "COUNCIL_ROOM_REQUEST_TIMEOUT",
              "The Council record",
            ),
          });
          return;
        }
        setState({
          status: "error",
          data: null,
          error: {
            code: "COUNCIL_ROOM_SOURCE_UNAVAILABLE",
            message: error instanceof Error ? error.message : String(error),
          },
        });
      })
      .finally(() => deadline.clear());
    return () => deadline.cancel();
  }, [houseId, reloadKey]);

  return state;
}
