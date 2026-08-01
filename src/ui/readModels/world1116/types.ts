export const WORLD_1116_ACCEPTED_GENERATION =
  "490e6eece6c9a0bc43c159e580b4a797d04a287f10e696633880d393a78de291" as const;

export const WORLD_1116_ACCEPTED_SQLITE_SHA256 =
  "154d1f3ff19aaa1a18d2dcb413b047946ce6d9c039b7245825b2d851b96d7a57" as const;

export const WORLD_1116_DATABASE_FILENAME = "world_1116_opening_candidate.sqlite" as const;

export const WORLD_1116_REQUIRED_GOVERNANCE_TABLES = [
  "metadata",
  "role_registry",
  "shard_query_table_registry",
  "source_files",
  "source_row_reconciliation",
  "opening_reconciliation",
  "cross_shard_identity_gap"
] as const;

export type World1116GovernanceTable = (typeof WORLD_1116_REQUIRED_GOVERNANCE_TABLES)[number];

export type World1116Domain =
  | "map"
  | "manors"
  | "people"
  | "houses"
  | "unions"
  | "residence"
  | "offices"
  | "openingResources"
  | "productionCapacity"
  | "gaps";

export type World1116Scalar = string | number | boolean | null;
export type World1116RawRow = Record<string, World1116Scalar>;

export interface World1116ProvenanceFields {
  /** Exact source status if the staging row exposes one; null is preserved. */
  authorityStatus: string | null;
  /** Exact source disposition if the staging row exposes one; null is preserved. */
  sourceDisposition: string | null;
  /** Stable reference into staging provenance/reconciliation evidence when exposed. */
  provenanceRef: string | null;
  /** Source-supplied reason, or an adapter explanation for an unavailable field/role. */
  unresolvedReason: string | null;
}

export interface World1116UiRecord extends World1116ProvenanceFields {
  recordId: string | null;
  displayLabel: string | null;
  /** Staging rows are never runtime truth, even when accepted and queryable. */
  runtimeTruth: false;
  sourceTable: string;
  raw: World1116RawRow;
}

export interface World1116MapHexDto extends World1116UiRecord {
  hexId: string | null;
  q: number | null;
  r: number | null;
  manorId: string | null;
}

export interface World1116ManorDto extends World1116UiRecord {
  manorId: string | null;
  houseId: string | null;
  ownershipStatus: string | null;
}

export interface World1116PersonDto extends World1116UiRecord {
  personId: string | null;
  houseId: string | null;
  protectedStatus: string | null;
}

export interface World1116HouseDto extends World1116UiRecord {
  houseId: string | null;
  headPersonId: string | null;
}

export interface World1116UnionDto extends World1116UiRecord {
  unionId: string | null;
  personOneId: string | null;
  personTwoId: string | null;
}

export interface World1116ResidenceDto extends World1116UiRecord {
  personId: string | null;
  manorId: string | null;
  candidateStatus: string | null;
}

export interface World1116OfficeDto extends World1116UiRecord {
  officeId: string | null;
  officeHolderId: string | null;
  evidenceStatus: string | null;
}

export interface World1116OpeningResourceDto extends World1116UiRecord {
  resourceId: string | null;
  custodianId: string | null;
  quantity: number | null;
  unit: string | null;
  openingStatus: string | null;
}

export interface World1116ProductionCapacityDto extends World1116UiRecord {
  capacityId: string | null;
  manorId: string | null;
  quantity: number | null;
  unit: string | null;
  evidenceStatus: string | null;
}

export interface World1116GapDto extends World1116UiRecord {
  gapId: string | null;
  gapKind: string | null;
  affectedRef: string | null;
}

export interface World1116DomainDtoMap {
  map: World1116MapHexDto;
  manors: World1116ManorDto;
  people: World1116PersonDto;
  houses: World1116HouseDto;
  unions: World1116UnionDto;
  residence: World1116ResidenceDto;
  offices: World1116OfficeDto;
  openingResources: World1116OpeningResourceDto;
  productionCapacity: World1116ProductionCapacityDto;
  gaps: World1116GapDto;
}

export type World1116AvailabilityState = "available" | "unavailable" | "degraded";

export interface World1116GovernanceBadge extends World1116ProvenanceFields {
  table: World1116GovernanceTable;
  hasRows: boolean;
}

export interface World1116DomainResult<T extends World1116UiRecord> extends World1116ProvenanceFields {
  domain: World1116Domain;
  availability: World1116AvailabilityState;
  rows: readonly T[];
  sourceTables: readonly string[];
  governanceBadges: readonly World1116GovernanceBadge[];
  warnings: readonly string[];
  runtimeTruth: false;
}

export interface World1116RoleAvailability extends World1116ProvenanceFields {
  role: string;
  available: boolean;
  queryTables: readonly string[];
  raw: World1116RawRow;
}

export interface World1116MetadataSnapshot extends World1116ProvenanceFields {
  generation: string;
  sqliteSha256: string;
  databaseFilename: typeof WORLD_1116_DATABASE_FILENAME;
  stagingStatus: "accepted_queryable_non_runtime";
  runtimeExecutionOccurred: false;
  requiredGovernanceTables: Readonly<Record<(typeof WORLD_1116_REQUIRED_GOVERNANCE_TABLES)[number], boolean>>;
  rows: readonly World1116RawRow[];
  governanceRows: Readonly<Record<World1116GovernanceTable, readonly World1116RawRow[]>>;
}

export interface World1116SessionDescriptor {
  generation: string;
  sqliteSha256: string;
  pointerPath: string;
  databasePath: string;
  connectionPolicy: {
    mode: "ro";
    immutable: true;
    queryOnly: true;
    generationPinnedForSession: true;
  };
  stagingStatus: "accepted_queryable_non_runtime";
  runtimeExecutionOccurred: false;
}

export interface World1116ReadModelSessionContract {
  readonly descriptor: World1116SessionDescriptor;
  metadata(): Promise<World1116MetadataSnapshot>;
  availableRoles(): Promise<readonly World1116RoleAvailability[]>;
  map(): Promise<World1116DomainResult<World1116MapHexDto>>;
  manors(): Promise<World1116DomainResult<World1116ManorDto>>;
  people(): Promise<World1116DomainResult<World1116PersonDto>>;
  houses(): Promise<World1116DomainResult<World1116HouseDto>>;
  unions(): Promise<World1116DomainResult<World1116UnionDto>>;
  residence(): Promise<World1116DomainResult<World1116ResidenceDto>>;
  offices(): Promise<World1116DomainResult<World1116OfficeDto>>;
  openingResources(): Promise<World1116DomainResult<World1116OpeningResourceDto>>;
  productionCapacity(): Promise<World1116DomainResult<World1116ProductionCapacityDto>>;
  gaps(): Promise<World1116DomainResult<World1116GapDto>>;
  close(): Promise<void>;
}

export type World1116OpenErrorCode =
  | "POINTER_MISSING"
  | "POINTER_EMPTY"
  | "GENERATION_INVALID"
  | "GENERATION_MISMATCH"
  | "DATABASE_MISSING"
  | "SQLITE_HASH_MISMATCH"
  | "SQLITE_OPEN_FAILED"
  | "SQLITE_READ_POLICY_FAILED";

export class World1116OpenError extends Error {
  readonly code: World1116OpenErrorCode;
  readonly detail: Readonly<Record<string, string>>;

  constructor(code: World1116OpenErrorCode, message: string, detail: Record<string, string> = {}) {
    super(message);
    this.name = "World1116OpenError";
    this.code = code;
    this.detail = Object.freeze({ ...detail });
  }
}
