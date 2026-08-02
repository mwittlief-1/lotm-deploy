import React from "react";

import {
  isCourtOsSessionContextV1,
  type CourtOsSessionContextV1,
} from "../courtosSessionContext";
import type { Household1120ReadOnlyProjection } from "./readModels/household1120/types";
import {
  courtOsTimeoutError,
  createCourtOsRequestDeadline,
} from "./courtosRequestDeadline";

type Household1120ApiResponse =
  | { ok: true; context: CourtOsSessionContextV1; data: Household1120ReadOnlyProjection }
  | { ok: false; error: { code: string; message: string } };

export type Household1120LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; context: CourtOsSessionContextV1; data: Household1120ReadOnlyProjection; error: null }
  | { status: "blocked"; data: null; error: { code: string; message: string } }
  | { status: "error"; data: null; error: { code: string; message: string } };

export function useHousehold1120Data(input: {
  householdEntityId: string | null;
  houseId: string | null;
  reloadKey?: number;
}): Household1120LoadState {
  const [state, setState] = React.useState<Household1120LoadState>({
    status: "loading",
    data: null,
    error: null,
  });

  React.useEffect(() => {
    if (!input.householdEntityId || !input.houseId) {
      setState({
        status: "blocked",
        data: null,
        error: {
          code: "HOUSEHOLD_CONTEXT_REQUIRED",
          message: "A resolved House and Household are required before this record can be opened.",
        },
      });
      return;
    }
    const deadline = createCourtOsRequestDeadline();
    const params = new URLSearchParams({
      householdEntityId: input.householdEntityId,
      houseId: input.houseId,
    });
    setState({ status: "loading", data: null, error: null });
    void fetch(`/api/household/1120?${params}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: deadline.signal,
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
        if (
          !isCourtOsSessionContextV1(payload.context) ||
          payload.context.selected_house_id !== input.houseId
        ) {
          throw new Error("Household session context is invalid.");
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
              "HOUSEHOLD_REQUEST_TIMEOUT",
              "The Household record",
            ),
          });
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setState({
          status: "error",
          data: null,
          error: { code: "HOUSEHOLD_READ_MODEL_UNAVAILABLE", message },
        });
      })
      .finally(() => deadline.clear());
    return () => deadline.cancel();
  }, [input.householdEntityId, input.houseId, input.reloadKey]);

  return state;
}
