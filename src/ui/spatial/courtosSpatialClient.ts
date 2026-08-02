import { useEffect, useState } from "react";

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
  | { status: "ready"; portfolio: CourtOsSpatialPortfolio | null; effectiveDate: string }
  | { status: "error"; message: string };

export function useCourtOsSpatialPortfolio(houseId: string | null): CourtOsSpatialState {
  const [state, setState] = useState<CourtOsSpatialState>({ status: "loading" });

  useEffect(() => {
    if (!houseId) {
      setState({ status: "loading" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(`/api/spatial/1120?houseId=${encodeURIComponent(houseId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Spatial record returned ${response.status}.`);
        const envelope: unknown = await response.json();
        const value =
          envelope && typeof envelope === "object" && "data" in envelope
            ? (envelope as { data?: unknown }).data
            : null;
        if (!isCourtOsSpatialHouseProjection(value)) {
          throw new Error("Spatial record failed its version or authority gate.");
        }
        if (value.query.house_id !== houseId) {
          throw new Error("Spatial record does not match the selected House.");
        }
        setState({
          status: "ready",
          portfolio: value.portfolio,
          effectiveDate: value.effective_date,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => controller.abort();
  }, [houseId]);

  return state;
}
