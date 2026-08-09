import React from "react";

import type { CourtOsSessionContextV1 } from "../courtosSessionContext";
import type { CourtOsResponsibilityDesignKey } from "./courtosInformationArchitecture";
import type { CourtOsResponsibilityWorkspaceProjectionV1 } from "../server/courtos1120Api/responsibilityWorkspaceProjection";
import { COURTOS_LARGE_READ_TIMEOUT_MS, courtOsTimeoutError, createCourtOsRequestDeadline } from "./courtosRequestDeadline";

type ApiResponse =
  | { ok: true; context: CourtOsSessionContextV1; data: CourtOsResponsibilityWorkspaceProjectionV1 }
  | { ok: false; error: { code: string; message: string } };

export type ResponsibilityWorkspaceLoadState =
  | { status: "idle" | "loading"; data: null; error: null }
  | { status: "ready"; data: CourtOsResponsibilityWorkspaceProjectionV1; error: null }
  | { status: "error"; data: null; error: { code: string; message: string } };

export function useResponsibilityWorkspace(input: {
  houseId: string | null;
  responsibility: CourtOsResponsibilityDesignKey | null;
  reloadKey?: number;
}): ResponsibilityWorkspaceLoadState {
  const [state, setState] = React.useState<ResponsibilityWorkspaceLoadState>({ status: "idle", data: null, error: null });
  React.useEffect(() => {
    if (!input.houseId || !input.responsibility) {
      setState({ status: "idle", data: null, error: null });
      return;
    }
    const deadline = createCourtOsRequestDeadline(COURTOS_LARGE_READ_TIMEOUT_MS);
    const query = new URLSearchParams({ houseId: input.houseId, responsibility: input.responsibility });
    setState({ status: "loading", data: null, error: null });
    void fetch(`/api/responsibilities/1120?${query}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: deadline.signal,
    }).then(async (response) => {
      const payload = await response.json() as ApiResponse;
      if (!response.ok || payload.ok === false) {
        const error = payload.ok === false ? payload.error : { code: `HTTP_${response.status}`, message: "Responsibility workspace request failed." };
        throw Object.assign(new Error(error.message), { code: error.code });
      }
      if (payload.context.selected_house_id !== input.houseId || payload.data.query.responsibility !== input.responsibility) {
        throw new Error("Responsibility workspace response crossed its House or responsibility scope.");
      }
      setState({ status: "ready", data: payload.data, error: null });
    }).catch((error: unknown) => {
      if (deadline.signal.aborted && !deadline.didTimeOut()) return;
      setState({
        status: "error",
        data: null,
        error: deadline.didTimeOut()
          ? courtOsTimeoutError("RESPONSIBILITY_WORKSPACE_TIMEOUT", "The responsibility workspace")
          : { code: "RESPONSIBILITY_WORKSPACE_UNAVAILABLE", message: error instanceof Error ? error.message : String(error) },
      });
    }).finally(() => deadline.clear());
    return () => deadline.cancel();
  }, [input.houseId, input.responsibility, input.reloadKey]);
  return state;
}
