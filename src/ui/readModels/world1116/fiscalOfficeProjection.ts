import type { World1116FiscalOfficePayload } from "../../world1116FiscalOfficeClient";
import { world1116ScreenAvailability } from "./screenMappings";
import type { World1116RawRow, World1116ReadModelSessionContract, World1116Scalar } from "./types";

export const CANDLETON_COURT_HOUSE_ENTITY_REF = "house:house_carvayne_younger_83ea" as const;
export const CANDLETON_COURT_MANOR_ENTITY_REF = "manor:manor_hx_44806" as const;
export const CANDLETON_COURT_MANOR_ID = "manor_hx_44806" as const;

export interface World1116FiscalOfficeScope {
  readonly houseEntityRef: string;
  readonly manorEntityRefs: readonly string[];
  readonly manorIds: readonly string[];
}

export const CANDLETON_COURT_FISCAL_SCOPE: World1116FiscalOfficeScope = {
  houseEntityRef: CANDLETON_COURT_HOUSE_ENTITY_REF,
  manorEntityRefs: [CANDLETON_COURT_MANOR_ENTITY_REF],
  manorIds: [CANDLETON_COURT_MANOR_ID]
};

function scalar(row: World1116RawRow, key: string): World1116Scalar | undefined {
  return Object.prototype.hasOwnProperty.call(row, key) ? row[key] : undefined;
}

function text(row: World1116RawRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = scalar(row, key);
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return null;
}

function matchesScopedResource(row: World1116RawRow, scope: World1116FiscalOfficeScope): boolean {
  return (
    text(row, "candidate_economic_entity_id") === scope.houseEntityRef ||
    text(row, "candidate_custodian_economic_entity_id") === scope.houseEntityRef
  );
}

function matchesScopedOffice(row: World1116RawRow, scope: World1116FiscalOfficeScope): boolean {
  const entity = text(row, "entity_key");
  return entity === scope.houseEntityRef || (entity !== null && scope.manorEntityRefs.includes(entity));
}

function unique(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function metadataValue(rows: readonly World1116RawRow[], ...keys: string[]): string | null {
  const acceptedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const row of rows) {
    const key = text(row, "key", "metadata_key", "name")?.toLowerCase();
    if (key && acceptedKeys.has(key)) return text(row, "value", "metadata_value");
  }
  return null;
}

export async function buildWorld1116FiscalOfficeProjectionForScope(
  session: World1116ReadModelSessionContract,
  scope: World1116FiscalOfficeScope
): Promise<World1116FiscalOfficePayload> {
  const [metadata, roles, resourceResult, capacityResult, officeResult, gapResult, screen] = await Promise.all([
    session.metadata(),
    session.availableRoles(),
    session.openingResources(),
    session.productionCapacity(),
    session.offices(),
    session.gaps(),
    world1116ScreenAvailability(session, "fiscal-office")
  ]);

  const resources = resourceResult.rows
    .filter((row) => matchesScopedResource(row.raw, scope))
    .map((row) => ({
      recordId: row.recordId,
      evidenceKind: row.sourceTable.includes("custody") ? ("custody" as const) : ("balance" as const),
      resourceId: row.resourceId,
      quantity: row.quantity,
      unit: row.unit,
      openingStatus: row.openingStatus,
      ownerLabel: text(row.raw, "beneficial_owner_label"),
      locationLabel: text(row.raw, "location_label"),
      authorityStatus: row.authorityStatus,
      sourceDisposition: row.sourceDisposition,
      provenanceRef: row.provenanceRef,
      unresolvedReason: row.unresolvedReason,
      qualification: text(
        row.raw,
        "opening_activation_eligibility",
        "genesis_identity_eligibility",
        "protected_world_binding",
        "availability_status"
      )
    }));

  const capacity = capacityResult.rows
    .filter((row) => row.manorId !== null && scope.manorIds.includes(row.manorId))
    .map((row) => ({
      recordId: row.recordId,
      manorId: row.manorId,
      quantity: row.quantity,
      unit: row.unit,
      authorityStatus: row.authorityStatus,
      sourceDisposition: row.sourceDisposition,
      provenanceRef: row.provenanceRef,
      unresolvedReason: row.unresolvedReason
    }));

  const offices = officeResult.rows
    .filter((row) => matchesScopedOffice(row.raw, scope))
    .map((row) => ({
      recordId: row.recordId,
      officeId: row.officeId,
      holderId: row.officeHolderId,
      holderLabel: text(row.raw, "effective_display_name", "display_name"),
      officeTitle: text(row.raw, "office_title", "role_key"),
      entityLabel: text(row.raw, "entity"),
      evidenceStatus: row.evidenceStatus,
      authorityStatus: row.authorityStatus,
      sourceDisposition: row.sourceDisposition,
      provenanceRef: row.provenanceRef,
      unresolvedReason: row.unresolvedReason
    }));

  const gaps = gapResult.rows.map((row) => ({
    gapId: row.gapId,
    gapKind: row.gapKind,
    affectedRef: row.affectedRef,
    unresolvedReason: row.unresolvedReason
  }));

  const relevantRoles = roles
    .filter((role) => /resource|storage|treasury|office|production|manor-steward/.test(role.role))
    .map((role) => ({
      role: role.role,
      available: role.available,
      authorityStatus: role.authorityStatus,
      sourceDisposition: role.sourceDisposition,
      unresolvedReason: role.unresolvedReason
    }));

  const manifestIdentity = metadataValue(metadata.rows, "uat_manifest_id", "manifest_id", "manifest_identity");

  return {
    session: {
      generation: session.descriptor.generation,
      sqliteSha256: session.descriptor.sqliteSha256,
      stagingStatus: session.descriptor.stagingStatus,
      runtimeExecutionOccurred: false,
      publicationClass: metadataValue(metadata.rows, "candidate_status", "environment_role", "publication_class"),
      manifest: {
        identity: manifestIdentity,
        sha256: metadataValue(metadata.rows, "uat_manifest_sha256", "manifest_sha256"),
        schemaVersion: metadataValue(metadata.rows, "uat_manifest_schema_version", "manifest_schema_version"),
        status: manifestIdentity ? "published" : "not_published"
      }
    },
    availability: screen.availability,
    warnings: unique([
      ...screen.warnings,
      resourceResult.unresolvedReason,
      capacityResult.unresolvedReason,
      officeResult.unresolvedReason,
      gapResult.unresolvedReason
    ]),
    governance: metadata.requiredGovernanceTables,
    resources,
    capacity,
    offices,
    gaps,
    roleCount: roles.length,
    relevantRoles
  };
}

export async function buildWorld1116FiscalOfficeProjection(
  session: World1116ReadModelSessionContract
): Promise<World1116FiscalOfficePayload> {
  return buildWorld1116FiscalOfficeProjectionForScope(session, CANDLETON_COURT_FISCAL_SCOPE);
}
