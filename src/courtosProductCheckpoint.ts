/**
 * The P-1 product checkpoint is an immutable consumer gate, not a CourtOS
 * authority engine.  A UI or planning adapter may only consume a projection
 * when the release identities below are all present and exactly match.
 */
export const COURTOS_P1_PRODUCT_CHECKPOINT_SCHEMA_VERSION =
  "courtos_p1_product_checkpoint_v1" as const;

export interface CourtOsP1ProductCheckpointV1 {
  schema_version: typeof COURTOS_P1_PRODUCT_CHECKPOINT_SCHEMA_VERSION;
  shared_authority_matter_sha256: string;
  generic_commitment_economic_lifecycle_sha256: string;
  responsibility_closure_matrix_sha256: string;
}

export const COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT: Readonly<CourtOsP1ProductCheckpointV1> =
  Object.freeze({
    schema_version: COURTOS_P1_PRODUCT_CHECKPOINT_SCHEMA_VERSION,
    shared_authority_matter_sha256:
      "7725ddcfbda224b949fc9c753e94793761194e3fa95b51c8d1a49ba1346202bc",
    generic_commitment_economic_lifecycle_sha256:
      "80f91cf7408489b03ea0569be2edf0261bfa693f563b12af4e81cf38c9bacca9",
    responsibility_closure_matrix_sha256:
      "063ab80105ea3cfa2c13b2a76db22407f03b98a881a6834f86ee2d922e1048db",
  });

export type CourtOsProductCheckpointGateV1 =
  | { status: "accepted"; checkpoint: Readonly<CourtOsP1ProductCheckpointV1> }
  | {
      status: "withheld";
      reason:
        | "missing_checkpoint"
        | "unsupported_checkpoint_schema"
        | "stale_or_mixed_checkpoint";
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * This deliberately compares every accepted P-1 identity.  It has no
 * fallback generation, partial acceptance, or interpretation of authority,
 * commitment, Matter, or responsibility data.
 */
export function gateCourtOsP1ProductCheckpoint(
  input: unknown,
): CourtOsProductCheckpointGateV1 {
  if (!isRecord(input)) {
    return { status: "withheld", reason: "missing_checkpoint" };
  }
  if (input.schema_version !== COURTOS_P1_PRODUCT_CHECKPOINT_SCHEMA_VERSION) {
    return { status: "withheld", reason: "unsupported_checkpoint_schema" };
  }
  const expected = COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT;
  if (
    input.shared_authority_matter_sha256 !== expected.shared_authority_matter_sha256 ||
    input.generic_commitment_economic_lifecycle_sha256 !==
      expected.generic_commitment_economic_lifecycle_sha256 ||
    input.responsibility_closure_matrix_sha256 !==
      expected.responsibility_closure_matrix_sha256
  ) {
    return { status: "withheld", reason: "stale_or_mixed_checkpoint" };
  }
  return { status: "accepted", checkpoint: expected };
}

/**
 * Common entry gate for the future House Command read projection.  The caller
 * must supply an admitted projection separately; P-1 acceptance alone grants
 * neither an actor nor a control.
 */
export function gateHouseCommandProjectionConsumption(input: {
  checkpoint: unknown;
  has_admitted_house_actor_projection: boolean;
}): CourtOsProductCheckpointGateV1 | {
  status: "withheld";
  reason: "admitted_house_actor_projection_unavailable";
} {
  const checkpointGate = gateCourtOsP1ProductCheckpoint(input.checkpoint);
  if (checkpointGate.status !== "accepted") return checkpointGate;
  if (!input.has_admitted_house_actor_projection) {
    return {
      status: "withheld",
      reason: "admitted_house_actor_projection_unavailable",
    };
  }
  return checkpointGate;
}
