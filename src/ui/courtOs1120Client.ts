import React from "react";

import type { CourtOs1120ReadOnlyProjection } from "./readModels/courtos1120/types";

type CourtOs1120ApiResponse =
  | { ok: true; data: CourtOs1120ReadOnlyProjection }
  | { ok: false; error: { code: string; message: string } };

export type CourtOs1120LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: CourtOs1120ReadOnlyProjection; error: null }
  | { status: "error"; data: null; error: { code: string; message: string } };

export function useCourtOs1120Data(
  input: {
    entityId?: string | null;
    houseId?: string | null;
    entityLabel?: string | null;
    reloadKey?: number;
  } = {},
): CourtOs1120LoadState {
  const [state, setState] = React.useState<CourtOs1120LoadState>({
    status: "loading",
    data: null,
    error: null
  });
  const houseId = input.houseId ?? null;
  const reloadKey = input.reloadKey ?? 0;

  React.useEffect(() => {
    if (!houseId) {
      setState({
        status: "error",
        data: null,
        error: {
          code: "COURTOS_HOUSE_REQUIRED",
          message: "A selected House is required before the CourtOS record can be opened.",
        },
      });
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ houseId });
    const query = params.toString();
    setState({ status: "loading", data: null, error: null });

    void fetch(`/api/courtos/1120${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = (await response.json()) as CourtOs1120ApiResponse;
        if (!response.ok || payload.ok === false) {
          const error = payload.ok === true
            ? { code: `HTTP_${response.status}`, message: "CourtOS read-only contract request failed." }
            : payload.error;
          throw Object.assign(new Error(error.message), { code: error.code });
        }
        setState({ status: "ready", data: payload.data, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        const code =
          error && typeof error === "object" && "code" in error && typeof error.code === "string"
            ? error.code
            : "COURTOS_READ_MODEL_UNAVAILABLE";
        setState({ status: "error", data: null, error: { code, message } });
      });

    return () => controller.abort();
  }, [houseId, reloadKey]);

  return state;
}
