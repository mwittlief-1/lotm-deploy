import { describe, expect, it } from "vitest";

import {
  JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE,
  JOURNEY_OPENING_PRESENCE_PACKAGE_ID,
  loadJourneyOpeningPresenceSource,
} from "../../src/sim/domains/journey/journeyOpeningPresenceSourceAdapter.node";

describe("Journey opening-presence source adapter", () => {
  it("loads the locked V9 residence state as evidence but fails closed for runtime seeding", async () => {
    const result = await loadJourneyOpeningPresenceSource();

    expect(result.package_id).toBe(JOURNEY_OPENING_PRESENCE_PACKAGE_ID);
    expect(result.effective_date).toBe(JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE);
    expect(result.source_status).toBe("locked_sqlite_readiness_pending_runtime_admission");
    expect(result.runtime_authority).toBe(false);
    expect(result.evidence_rows).toHaveLength(23_548);
    expect(result.pending_admission_count).toBe(23_548);
    expect(result.opening_presence).toEqual([]);
    expect(result.admitted_house_scope).toEqual([]);
    expect(result.withheld_reason_codes).toContain(
      "opening_presence_pending_live_runtime_admission",
    );
    expect(result.evidence_rows.every((row) =>
      row.person_id && row.acting_house_id && row.location_id && !row.runtime_authority
    )).toBe(true);
  }, 30_000);

  it("requires an exact external admission grant before producing a runtime seed", async () => {
    const pending = await loadJourneyOpeningPresenceSource();
    const admissionRef = "admission:journey-opening-presence:test-only";
    const admitted = await loadJourneyOpeningPresenceSource({
      admissionGrant: {
        schema_version: "phase_five_journey_opening_presence_admission_grant_v1",
        package_id: JOURNEY_OPENING_PRESENCE_PACKAGE_ID,
        effective_date: JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE,
        admitted_sqlite_sha256: pending.sqlite_sha256,
        admission_ref: admissionRef,
        runtime_authority: true,
      },
    });

    expect(admitted.source_status).toBe("admitted_runtime_input");
    expect(admitted.runtime_authority).toBe(true);
    expect(admitted.opening_presence).toHaveLength(23_548);
    expect(admitted.admitted_house_scope).toHaveLength(23_548);
    expect(admitted.pending_admission_count).toBe(0);
    expect(admitted.opening_presence[0]?.evidence_refs).toContain(admissionRef);
  }, 30_000);

  it("rejects an admission grant that does not bind the exact source digest", async () => {
    await expect(loadJourneyOpeningPresenceSource({
      admissionGrant: {
        schema_version: "phase_five_journey_opening_presence_admission_grant_v1",
        package_id: JOURNEY_OPENING_PRESENCE_PACKAGE_ID,
        effective_date: JOURNEY_OPENING_PRESENCE_EFFECTIVE_DATE,
        admitted_sqlite_sha256: "wrong-digest",
        admission_ref: "admission:test-only:wrong",
        runtime_authority: true,
      },
    })).rejects.toThrow("invalid_journey_opening_presence_admission_grant");
  }, 30_000);
});
