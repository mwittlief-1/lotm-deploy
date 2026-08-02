import { useEffect, useState } from "react";

import {
  isCourtOsSessionContextV1,
  type CourtOsSessionContextV1,
} from "../../courtosSessionContext";
import {
  courtOsTimeoutError,
  createCourtOsRequestDeadline,
} from "../courtosRequestDeadline";
import {
  isCourtOsSpatialHouseProjection,
  type CourtOsSpatialManor,
  type CourtOsSpatialPortfolio,
} from "./courtosSpatialContract";

export type {
  CourtOsSpatialCoverage,
  CourtOsSpatialManor,
  CourtOsSpatialPortfolio,
} from "./courtosSpatialContract";

export type CourtOsSpatialState =
  | { status: "loading" }
  | { status: "ready"; context: CourtOsSessionContextV1; portfolio: CourtOsSpatialPortfolio | null; effectiveDate: string }
  | { status: "error"; message: string };

export function useCourtOsSpatialPortfolio(houseId: string | null): CourtOsSpatialState {
  const [state, setState] = useState<CourtOsSpatialState>({ status: "loading" });

  useEffect(() => {
    if (!houseId) {
      setState({ status: "loading" });
      return;
    }
    const deadline = createCourtOsRequestDeadline();
    setState({ status: "loading" });
    fetch(`/api/spatial/1120?houseId=${encodeURIComponent(houseId)}`, {
      signal: deadline.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Spatial record returned ${response.status}.`);
        const envelope: unknown = await response.json();
        const value =
          envelope && typeof envelope === "object" && "data" in envelope
            ? (envelope as { data?: unknown }).data
            : null;
        const context =
          envelope && typeof envelope === "object" && "context" in envelope
            ? (envelope as { context?: CourtOsSessionContextV1 }).context
            : null;
        if (!isCourtOsSpatialHouseProjection(value)) {
          throw new Error("Spatial record failed its version or authority gate.");
        }
        if (value.query.house_id !== houseId) {
          throw new Error("Spatial record does not match the selected House.");
        }
        if (!isCourtOsSessionContextV1(context) || context.selected_house_id !== houseId) {
          throw new Error("Spatial session context does not match the selected House.");
        }
        setState({
          status: "ready",
          context,
          portfolio: value.portfolio,
          effectiveDate: value.effective_date,
        });
      })
      .catch((error: unknown) => {
        if (deadline.signal.aborted && !deadline.didTimeOut()) return;
        if (deadline.didTimeOut()) {
          setState({
            status: "error",
            message: courtOsTimeoutError(
              "SPATIAL_REQUEST_TIMEOUT",
              "The land record",
            ).message,
          });
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => deadline.clear());
    return () => deadline.cancel();
  }, [houseId]);

  return state;
}
