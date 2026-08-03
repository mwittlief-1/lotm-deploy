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

/**
 * P-2.1 closes only the common product-depth lineage.  It supplies the
 * responsibility-workspace grammar; it is not a House instance, an authority
 * grant, or a source of operational facts.
 */
export const COURTOS_P2_1_RESPONSIBILITY_DEPTH_LINEAGE_SCHEMA_VERSION =
  "courtos_p2_1_responsibility_depth_lineage_v1" as const;

export interface CourtOsP2_1ResponsibilityDepthLineageV1
  extends Omit<CourtOsP1ProductCheckpointV1, "schema_version"> {
  schema_version: typeof COURTOS_P2_1_RESPONSIBILITY_DEPTH_LINEAGE_SCHEMA_VERSION;
  responsibility_depth_audit_sha256: string;
  responsibility_registry_sha256: string;
  responsibility_rebase_sha256: string;
  works_doctrine_sha256: string;
}

export const COURTOS_ACCEPTED_P2_1_RESPONSIBILITY_DEPTH_LINEAGE: Readonly<CourtOsP2_1ResponsibilityDepthLineageV1> =
  Object.freeze({
    schema_version: COURTOS_P2_1_RESPONSIBILITY_DEPTH_LINEAGE_SCHEMA_VERSION,
    shared_authority_matter_sha256:
      COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT.shared_authority_matter_sha256,
    generic_commitment_economic_lifecycle_sha256:
      COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT.generic_commitment_economic_lifecycle_sha256,
    responsibility_closure_matrix_sha256:
      COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT.responsibility_closure_matrix_sha256,
    responsibility_depth_audit_sha256:
      "e7fee967f66620cdc18bc1b52e6f9c2c7c176af4723660cbe24ff55dd26ae9a7",
    responsibility_registry_sha256:
      "68e0f7dd7ea13f574f43ddba667d43edcd02e414f701687a3843f603c8b8228a",
    responsibility_rebase_sha256:
      "8c8ebb95427b423773dfd007873e81e3895d89d92909c7110495f4138d203f10",
    works_doctrine_sha256:
      "112538d6b58742eb6127ee4a899ff0343674cf0bea8dde35f10605fa27600595",
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

export type CourtOsResponsibilityDepthLineageGateV1 =
  | {
      status: "accepted";
      lineage: Readonly<CourtOsP2_1ResponsibilityDepthLineageV1>;
    }
  | {
      status: "withheld";
      reason:
        | "missing_responsibility_depth_lineage"
        | "unsupported_responsibility_depth_lineage_schema"
        | "stale_or_mixed_responsibility_depth_lineage";
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

/** A complete lineage is required; a matching P-1 subset is not sufficient. */
export function gateCourtOsP2_1ResponsibilityDepthLineage(
  input: unknown,
): CourtOsResponsibilityDepthLineageGateV1 {
  if (!isRecord(input)) {
    return { status: "withheld", reason: "missing_responsibility_depth_lineage" };
  }
  if (input.schema_version !== COURTOS_P2_1_RESPONSIBILITY_DEPTH_LINEAGE_SCHEMA_VERSION) {
    return {
      status: "withheld",
      reason: "unsupported_responsibility_depth_lineage_schema",
    };
  }
  const expected = COURTOS_ACCEPTED_P2_1_RESPONSIBILITY_DEPTH_LINEAGE;
  const keys: readonly (keyof CourtOsP2_1ResponsibilityDepthLineageV1)[] = [
    "shared_authority_matter_sha256",
    "generic_commitment_economic_lifecycle_sha256",
    "responsibility_closure_matrix_sha256",
    "responsibility_depth_audit_sha256",
    "responsibility_registry_sha256",
    "responsibility_rebase_sha256",
    "works_doctrine_sha256",
  ];
  if (keys.some((key) => input[key] !== expected[key])) {
    return { status: "withheld", reason: "stale_or_mixed_responsibility_depth_lineage" };
  }
  return { status: "accepted", lineage: expected };
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
