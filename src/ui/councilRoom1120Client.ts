import React from "react";

import type { CouncilRoomReadyProjectionV1 } from "../ready/councilRoomReadyProjection";

type CouncilRoom1120ApiResponse =
  | { ok: true; data: CouncilRoomReadyProjectionV1 }
  | { ok: false; error: { code: string; message: string } };

export type CouncilRoom1120LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: CouncilRoomReadyProjectionV1; error: null }
  | { status: "error"; data: null; error: { code: string; message: string } };

export function useCouncilRoom1120Data(
  houseId: string | null,
): CouncilRoom1120LoadState {
  const [state, setState] = React.useState<CouncilRoom1120LoadState>({
    status: "loading",
    data: null,
    error: null,
  });

  React.useEffect(() => {
    if (!houseId) {
      setState({ status: "loading", data: null, error: null });
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ houseId });
    setState({ status: "loading", data: null, error: null });
    void fetch(`/api/council-room/1120?${params}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
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
        setState({ status: "ready", data: payload.data, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          data: null,
          error: {
            code: "COUNCIL_ROOM_SOURCE_UNAVAILABLE",
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => controller.abort();
  }, [houseId]);

  return state;
}
