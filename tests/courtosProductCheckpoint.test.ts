import { describe, expect, it } from "vitest";

import {
  COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT,
  COURTOS_ACCEPTED_P2_1_RESPONSIBILITY_DEPTH_LINEAGE,
  gateCourtOsP1ProductCheckpoint,
  gateCourtOsP2_1ResponsibilityDepthLineage,
  gateHouseCommandProjectionConsumption,
} from "../src/courtosProductCheckpoint";

describe("CourtOS P-1 product checkpoint consumer gate", () => {
  it("accepts only the exact independent P-1 checkpoint identities", () => {
    expect(
      gateCourtOsP1ProductCheckpoint(COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT),
    ).toMatchObject({ status: "accepted" });
  });

  it("fails closed for a stale or mixed contract identity", () => {
    expect(
      gateCourtOsP1ProductCheckpoint({
        ...COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT,
        generic_commitment_economic_lifecycle_sha256: "0".repeat(64),
      }),
    ).toEqual({ status: "withheld", reason: "stale_or_mixed_checkpoint" });
  });

  it("fails closed when a future House Command projection is absent", () => {
    expect(
      gateHouseCommandProjectionConsumption({
        checkpoint: COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT,
        has_admitted_house_actor_projection: false,
      }),
    ).toEqual({
      status: "withheld",
      reason: "admitted_house_actor_projection_unavailable",
    });
  });

  it("requires the complete P-2.1 responsibility-depth lineage", () => {
    expect(
      gateCourtOsP2_1ResponsibilityDepthLineage(
        COURTOS_ACCEPTED_P2_1_RESPONSIBILITY_DEPTH_LINEAGE,
      ),
    ).toMatchObject({ status: "accepted" });
    expect(
      gateCourtOsP2_1ResponsibilityDepthLineage({
        ...COURTOS_ACCEPTED_P2_1_RESPONSIBILITY_DEPTH_LINEAGE,
        works_doctrine_sha256: "0".repeat(64),
      }),
    ).toEqual({
      status: "withheld",
      reason: "stale_or_mixed_responsibility_depth_lineage",
    });
  });
});
