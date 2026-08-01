import React from "react";

import type { CourtOs1120PasCalibrationProposalV0 } from "./readModels/courtos1120/pasCalibrationTypes";
import type { CourtOs1120ReadOnlyProjection } from "./readModels/courtos1120/types";

type CourtOs1120ApiResponse =
  | { ok: true; data: CourtOs1120ReadOnlyProjection; pas_calibration?: CourtOs1120PasCalibrationProposalV0 | null }
  | { ok: false; error: { code: string; message: string } };

export type CourtOs1120LoadState =
  | { status: "loading"; data: null; pasCalibration: null; error: null }
  | { status: "ready"; data: CourtOs1120ReadOnlyProjection; pasCalibration: CourtOs1120PasCalibrationProposalV0 | null; error: null }
  | { status: "error"; data: null; pasCalibration: null; error: { code: string; message: string } };

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
    pasCalibration: null,
    error: null
  });
  const entityId = input.entityId ?? null;
  const houseId = input.houseId ?? null;
  const entityLabel = input.entityLabel ?? null;
  const reloadKey = input.reloadKey ?? 0;

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (entityId) params.set("entityId", entityId);
    if (houseId) params.set("houseId", houseId);
    if (entityLabel) params.set("entityLabel", entityLabel);
    const query = params.toString();
    setState({ status: "loading", data: null, pasCalibration: null, error: null });

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
        setState({ status: "ready", data: payload.data, pasCalibration: payload.pas_calibration ?? null, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        const code =
          error && typeof error === "object" && "code" in error && typeof error.code === "string"
            ? error.code
            : "COURTOS_READ_MODEL_UNAVAILABLE";
        setState({ status: "error", data: null, pasCalibration: null, error: { code, message } });
      });

    return () => controller.abort();
  }, [entityId, entityLabel, houseId, reloadKey]);

  return state;
}
