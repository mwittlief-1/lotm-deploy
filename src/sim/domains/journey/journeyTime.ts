import type { JourneyCutpointPhaseV1, JourneyCutpointV1 } from "./journeyContracts";

const PHASE_ORDER: Record<JourneyCutpointPhaseV1, number> = {
  opening: 0,
  midmonth: 1,
  closing: 2
};

const PHASE_DAY_OFFSET: Record<JourneyCutpointPhaseV1, number> = {
  opening: 0,
  midmonth: 14,
  closing: 29
};

export function journeyCutpointOrdinal(cutpoint: JourneyCutpointV1): number {
  return (Math.trunc(cutpoint.relative_month) - 1) * 3 + PHASE_ORDER[cutpoint.phase];
}

/**
 * Day ordinal for material-demand accounting under the same 30-day calendar
 * used by the Foundation route resolver.  Cutpoint ordering intentionally
 * remains a compact three-phase ordinal; elapsed demand must not treat every
 * phase transition as an equal ten-day interval.
 */
export function journeyCutpointDayOrdinal(cutpoint: JourneyCutpointV1): number {
  return (Math.trunc(cutpoint.relative_month) - 1) * 30 + PHASE_DAY_OFFSET[cutpoint.phase];
}

export function compareJourneyCutpoints(left: JourneyCutpointV1, right: JourneyCutpointV1): number {
  return journeyCutpointOrdinal(left) - journeyCutpointOrdinal(right);
}

export function validJourneyCutpoint(cutpoint: JourneyCutpointV1): boolean {
  return (
    Number.isInteger(cutpoint.relative_month) &&
    cutpoint.relative_month >= 1 &&
    cutpoint.relative_month <= 36 &&
    Object.prototype.hasOwnProperty.call(PHASE_ORDER, cutpoint.phase)
  );
}

export function journeyCutpointKey(cutpoint: JourneyCutpointV1): string {
  return `m${String(cutpoint.relative_month).padStart(2, "0")}:${cutpoint.phase}`;
}

export function cloneJourneyCutpoint(cutpoint: JourneyCutpointV1): JourneyCutpointV1 {
  return { relative_month: cutpoint.relative_month, phase: cutpoint.phase };
}

export function journeyIntervalsOverlap(
  leftOpening: JourneyCutpointV1,
  leftClosing: JourneyCutpointV1,
  rightOpening: JourneyCutpointV1,
  rightClosing: JourneyCutpointV1
): boolean {
  // Presence commitments are half-open intervals. Arrival from one admitted
  // journey and departure on the next at the same cutpoint is a valid handoff;
  // every other shared cutpoint remains ordered by the lifecycle event
  // priorities (arrival before departure).
  return (
    compareJourneyCutpoints(leftOpening, rightClosing) < 0 &&
    compareJourneyCutpoints(rightOpening, leftClosing) < 0
  );
}
