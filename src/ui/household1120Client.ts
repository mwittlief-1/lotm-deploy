import React from "react";

import type { Household1120ReadOnlyProjection } from "./readModels/household1120/types";

type Household1120ApiResponse =
  | { ok: true; data: Household1120ReadOnlyProjection }
  | { ok: false; error: { code: string; message: string } };

export type Household1120LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: Household1120ReadOnlyProjection; error: null }
  | { status: "error"; data: null; error: { code: string; message: string } };

export function useHousehold1120Data(input: {
  householdEntityId: string | null;
  houseId: string | null;
}): Household1120LoadState {
  const [state, setState] = React.useState<Household1120LoadState>({
    status: "loading",
    data: null,
    error: null,
  });

  React.useEffect(() => {
    if (!input.householdEntityId || !input.houseId) {
      setState({ status: "loading", data: null, error: null });
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      householdEntityId: input.householdEntityId,
      houseId: input.houseId,
    });
    setState({ status: "loading", data: null, error: null });
    void fetch(`/api/household/1120?${params}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as Household1120ApiResponse;
        if (payload.ok === false) {
          throw Object.assign(new Error(payload.error.message), { code: payload.error.code });
        }
        if (!response.ok) {
          const error = {
            code: `HTTP_${response.status}`,
            message: "Household read-only contract request failed.",
          };
          throw Object.assign(new Error(error.message), { code: error.code });
        }
        setState({ status: "ready", data: payload.data, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setState({
          status: "error",
          data: null,
          error: { code: "HOUSEHOLD_READ_MODEL_UNAVAILABLE", message },
        });
      });
    return () => controller.abort();
  }, [input.householdEntityId, input.houseId]);

  return state;
}
