import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  openSqliteCliReadonlyDriver,
  type World1116ReadonlySqliteDriver,
  type World1116ReadonlySqliteDriverFactory
} from "./sqliteReadonlyDriver";
import {
  WORLD_1116_ACCEPTED_GENERATION,
  WORLD_1116_ACCEPTED_SQLITE_SHA256,
  WORLD_1116_DATABASE_FILENAME,
  WORLD_1116_REQUIRED_GOVERNANCE_TABLES,
  World1116OpenError,
  type World1116Domain,
  type World1116DomainDtoMap,
  type World1116DomainResult,
  type World1116GapDto,
  type World1116GovernanceBadge,
  type World1116GovernanceTable,
  type World1116HouseDto,
  type World1116ManorDto,
  type World1116MapHexDto,
  type World1116MetadataSnapshot,
  type World1116OfficeDto,
  type World1116OpeningResourceDto,
  type World1116PersonDto,
  type World1116ProductionCapacityDto,
  type World1116ProvenanceFields,
  type World1116RawRow,
  type World1116ReadModelSessionContract,
  type World1116ResidenceDto,
  type World1116RoleAvailability,
  type World1116Scalar,
  type World1116SessionDescriptor,
  type World1116UiRecord,
  type World1116UnionDto
} from "./types";

const GENERATION_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const GOVERNANCE_ROW_LIMIT = 100_000;
const TABLE_NAME_FIELDS = [
  "table_name",
  "query_table",
  "query_table_name",
  "source_table",
  "combined_table",
  "sqlite_table",
  "relation_name",
  "table"
] as const;

const AUTHORITY_FIELDS = [
  "authority_status",
  "authorityStatus",
  "status_authority",
  "authority",
  "non_runtime_authority",
  "non_runtime_authority_2"
] as const;
const DISPOSITION_FIELDS = [
  "source_disposition",
  "sourceDisposition",
  "disposition",
  "source_status",
  "status",
  "data_ready_status",
  "temporal_status",
  "opening_1116_status",
  "location_mapping_status"
] as const;
const PROVENANCE_FIELDS = [
  "provenance_ref",
  "provenanceRef",
  "source_row_reconciliation_id",
  "source_file_id",
  "source_id",
  "source_sha256",
  "row_sha256",
  "_row_sha256",
  "check_id",
  "gap_id",
  "evidence_ref"
] as const;
const UNRESOLVED_FIELDS = [
  "unresolved_reason",
  "unresolvedReason",
  "gap_reason",
  "exclusion_reason",
  "reason",
  "readiness_gap",
  "absence_blocker"
] as const;

interface DomainDefinition {
  readonly roleTokens: readonly string[];
  readonly recordIds: readonly string[];
  readonly labels: readonly string[];
}

const DOMAIN_DEFINITIONS: Readonly<Record<World1116Domain, DomainDefinition>> = {
  map: {
    roleTokens: ["map", "hex"],
    recordIds: ["hex_id", "map_hex_id", "id"],
    labels: ["hex_name", "name", "label"]
  },
  manors: {
    roleTokens: ["manor"],
    recordIds: ["manor_id", "id"],
    labels: ["manor_name", "name", "label"]
  },
  people: {
    roleTokens: ["protected_people", "protected_person", "people", "person"],
    recordIds: ["person_id", "people_id", "id"],
    labels: ["display_name", "person_name", "name", "label"]
  },
  houses: {
    roleTokens: ["protected_houses", "house"],
    recordIds: ["house_id", "id"],
    labels: ["house_name", "name", "label"]
  },
  unions: {
    roleTokens: ["protected_unions", "union", "marriage"],
    recordIds: ["union_id", "marriage_id", "id"],
    labels: ["union_name", "name", "label"]
  },
  residence: {
    roleTokens: ["residence_candidates", "residence_candidate", "residence", "crosswalk"],
    recordIds: ["projection_row_id", "residence_id", "candidate_id", "person_id", "id"],
    labels: ["residence_name", "display_name", "name", "label"]
  },
  offices: {
    roleTokens: ["static_offices", "office", "authority_evidence", "authority"],
    recordIds: ["working_truth_row_id", "office_id", "appointment_id", "id"],
    labels: ["office_name", "title", "name", "label"]
  },
  openingResources: {
    roleTokens: ["opening_resources", "opening_resource", "resource_custody", "custody"],
    recordIds: ["id", "opening_resource_id", "inventory_id", "resource_id"],
    labels: ["resource_name", "item_name", "name", "label"]
  },
  productionCapacity: {
    roleTokens: ["production_capacity", "production", "capacity"],
    recordIds: ["capacity_id", "production_id", "id"],
    labels: ["capacity_name", "production_name", "name", "label"]
  },
  gaps: {
    roleTokens: ["cross_shard_identity_gap", "identity_gap", "gaps", "gap"],
    recordIds: ["gap_id", "id"],
    labels: ["gap_kind", "gap_type", "name", "label"]
  }
};

/**
 * Preferred projections in the accepted combined environment. They are still
 * admitted only when present in the pinned schema and declared by a registry,
 * except the explicitly governed frozen residence and identity-gap surfaces.
 */
const DOMAIN_PREFERRED_TABLES: Readonly<Record<World1116Domain, readonly string[]>> = {
  map: ["shard_spatial_transport__map_hex"],
  manors: ["shard_spatial_transport__manor_spatial"],
  people: ["shard_social_residency__person_candidate_1116"],
  houses: ["src_173_house_c"],
  unions: ["shard_social_residency__union_candidate_1116"],
  residence: ["frozen_residence__opening_residence_candidate"],
  offices: ["src_014_office_assignment_effective_working_trut"],
  openingResources: ["src_142_openingresourcebalance_c", "src_143_openingresourcecustody_c"],
  productionCapacity: ["src_140_openingfoodstoragecapacity_c", "src_112_manor_units_v1"],
  gaps: ["cross_shard_identity_gap"]
};

const BASE_GOVERNANCE_TABLES: readonly World1116GovernanceTable[] = [
  "metadata",
  "role_registry",
  "shard_query_table_registry",
  "source_files",
  "source_row_reconciliation"
];

function governanceTablesForDomain(domain: World1116Domain): readonly World1116GovernanceTable[] {
  const tables = [...BASE_GOVERNANCE_TABLES];
  if (domain === "openingResources" || domain === "productionCapacity") {
    tables.push("opening_reconciliation");
  }
  if (["people", "houses", "unions", "residence", "offices", "gaps"].includes(domain)) {
    tables.push("cross_shard_identity_gap");
  }
  return tables;
}

export interface World1116ReadModelOpenOptions {
  /** Test-only override. Production callers should use the accepted constants. */
  expectedGeneration?: string;
  /** Test-only override. Production callers should use the accepted constants. */
  expectedSqliteSha256?: string;
  driverFactory?: World1116ReadonlySqliteDriverFactory;
  rowLimit?: number;
}

interface SchemaColumnRow {
  name: string;
  pk: number;
}

interface SchemaNameRow {
  name: string;
}

function quoteIdentifier(identifier: string): string {
  if (!SAFE_IDENTIFIER.test(identifier)) throw new Error(`Unsafe SQLite identifier: ${identifier}`);
  return `"${identifier}"`;
}

function scalar(row: World1116RawRow, fields: readonly string[]): World1116Scalar | undefined {
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(row, field)) return row[field];
  }
  return undefined;
}

function stringValue(row: World1116RawRow, fields: readonly string[]): string | null {
  const value = scalar(row, fields);
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function numberValue(row: World1116RawRow, fields: readonly string[]): number | null {
  const value = scalar(row, fields);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function provenance(row: World1116RawRow): World1116ProvenanceFields {
  let sourceDisposition = stringValue(row, DISPOSITION_FIELDS);
  const reconciles = numberValue(row, ["reconciles"]);
  if (sourceDisposition === null && reconciles !== null) {
    sourceDisposition = reconciles === 1 ? "reconciled" : "unreconciled";
  }
  let unresolvedReason = stringValue(row, UNRESOLVED_FIELDS);
  const detail = stringValue(row, ["detail"]);
  const unresolvedCount = numberValue(row, ["unresolved_count"]);
  const blocksJanuary = numberValue(row, ["blocks_january"]);
  const blockingState = `${sourceDisposition ?? ""}`.toLowerCase();
  if (
    unresolvedReason === null &&
    detail !== null &&
    ((unresolvedCount !== null && unresolvedCount > 0) ||
      blocksJanuary === 1 ||
      /unresolved|not_available|not_established|blocking|blocked|no_crosswalk|partial/.test(blockingState))
  ) {
    unresolvedReason = detail;
  }
  return {
    authorityStatus: stringValue(row, AUTHORITY_FIELDS),
    sourceDisposition,
    provenanceRef: stringValue(row, PROVENANCE_FIELDS),
    unresolvedReason
  };
}

function normalizeRawRow(row: World1116RawRow): World1116RawRow {
  const rowJson = row.row_json;
  if (typeof rowJson !== "string") return row;
  try {
    const parsed: unknown = JSON.parse(rowJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return row;
    const scalars = Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, World1116Scalar] =>
          entry[1] === null || ["string", "number", "boolean"].includes(typeof entry[1])
      )
    );
    return { ...row, ...scalars };
  } catch {
    return row;
  }
}

function baseRecord(
  row: World1116RawRow,
  sourceTable: string,
  definition: DomainDefinition
): World1116UiRecord {
  return {
    recordId: stringValue(row, definition.recordIds),
    displayLabel: stringValue(row, definition.labels),
    runtimeTruth: false,
    sourceTable,
    raw: Object.freeze({ ...row }),
    ...provenance(row)
  };
}

function mapRow<D extends World1116Domain>(
  domain: D,
  row: World1116RawRow,
  sourceTable: string
): World1116DomainDtoMap[D] {
  row = normalizeRawRow(row);
  const base = baseRecord(row, sourceTable, DOMAIN_DEFINITIONS[domain]);
  switch (domain) {
    case "map":
      return {
        ...base,
        hexId: stringValue(row, ["hex_id", "map_hex_id", "id"]),
        q: numberValue(row, ["q", "hex_q", "x"]),
        r: numberValue(row, ["r", "hex_r", "y"]),
        manorId: stringValue(row, ["manor_id"])
      } as World1116DomainDtoMap[D];
    case "manors":
      return {
        ...base,
        manorId: stringValue(row, ["manor_id", "id"]),
        houseId: stringValue(row, ["house_id", "owner_house_id"]),
        ownershipStatus: stringValue(row, ["ownership_status", "tenure_status", "claim_status"])
      } as World1116DomainDtoMap[D];
    case "people":
      return {
        ...base,
        personId: stringValue(row, ["person_id", "people_id", "id"]),
        houseId: stringValue(row, ["house_id", "birth_house_id", "endpoint_current_house_id_1120"]),
        protectedStatus: stringValue(row, [
          "protected_status",
          "protection_status",
          "opening_1116_status",
          "record_status"
        ])
      } as World1116DomainDtoMap[D];
    case "houses":
      return {
        ...base,
        houseId: stringValue(row, ["house_id", "id"]),
        headPersonId: stringValue(row, ["head_person_id", "house_head_id"])
      } as World1116DomainDtoMap[D];
    case "unions":
      return {
        ...base,
        unionId: stringValue(row, ["union_id", "marriage_id", "id"]),
        personOneId: stringValue(row, [
          "person_one_id",
          "person_1_id",
          "spouse_one_id",
          "spouse_a_person_id"
        ]),
        personTwoId: stringValue(row, [
          "person_two_id",
          "person_2_id",
          "spouse_two_id",
          "spouse_b_person_id"
        ])
      } as World1116DomainDtoMap[D];
    case "residence":
      return {
        ...base,
        personId: stringValue(row, ["person_id", "protected_person_id", "source_person_id"]),
        manorId: stringValue(row, ["manor_id", "residence_manor_id", "residence_entity_id"]),
        candidateStatus: stringValue(row, [
          "candidate_status",
          "residence_status",
          "match_status",
          "location_mapping_status",
          "authority_status"
        ])
      } as World1116DomainDtoMap[D];
    case "offices":
      return {
        ...base,
        officeId: stringValue(row, ["office_id", "office_key", "appointment_id", "working_truth_row_id", "id"]),
        officeHolderId: stringValue(row, [
          "office_holder_id",
          "holder_person_id",
          "effective_person_id",
          "person_id"
        ]),
        evidenceStatus: stringValue(row, [
          "evidence_status",
          "effective_assignment_state",
          "working_truth_status",
          "assignment_state",
          "office_status",
          "appointment_status"
        ])
      } as World1116DomainDtoMap[D];
    case "openingResources":
      return {
        ...base,
        resourceId: stringValue(row, ["resource_id", "opening_resource_id", "inventory_id", "id"]),
        custodianId: stringValue(row, [
          "custodian_id",
          "candidate_custodian_economic_entity_id",
          "custody_person_id",
          "holder_id"
        ]),
        quantity: numberValue(row, ["quantity", "quantity_units", "opening_quantity", "amount"]),
        unit: stringValue(row, ["unit", "quantity_unit", "unit_policy"]),
        openingStatus: stringValue(row, [
          "opening_status",
          "opening_activation_eligibility",
          "availability_status",
          "balance_status",
          "source_status",
          "record_status"
        ])
      } as World1116DomainDtoMap[D];
    case "productionCapacity":
      return {
        ...base,
        capacityId: stringValue(row, ["capacity_id", "production_id", "id"]),
        manorId: stringValue(row, ["manor_id"]),
        quantity: numberValue(row, [
          "quantity",
          "food_capacity_units",
          "total_net_productive_capacity",
          "capacity_quantity",
          "annual_capacity"
        ]),
        unit: stringValue(row, ["unit", "quantity_unit", "capacity_unit", "capacity_definition"]),
        evidenceStatus: stringValue(row, [
          "evidence_status",
          "admission_scope",
          "source_status",
          "capacity_status",
          "record_status"
        ])
      } as World1116DomainDtoMap[D];
    case "gaps":
      return {
        ...base,
        gapId: stringValue(row, ["gap_id", "id"]),
        gapKind: stringValue(row, ["gap_kind", "gap_type", "kind", "status"]),
        affectedRef: stringValue(row, ["affected_ref", "entity_ref", "source_ref", "left_domain"])
      } as World1116DomainDtoMap[D];
  }
}

function distinct(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

function aggregateStatus(values: readonly (string | null)[]): string | null {
  const present = distinct(values);
  if (present.length === 0) return null;
  return present.length === 1 ? present[0] ?? null : "mixed";
}

function registrySearchText(row: World1116RawRow): string {
  const semanticFields = [
    "role",
    "role_key",
    "role_name",
    "domain",
    "shard",
    "purpose",
    "semantic_role",
    "query_role",
    "description",
    "role_id",
    "roles_json",
    "source_id",
    ...TABLE_NAME_FIELDS
  ];
  return semanticFields
    .map((field) => row[field])
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function parseStringArray(value: World1116Scalar | undefined): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function extractRegistryTables(row: World1116RawRow, schemaTables: ReadonlySet<string>): string[] {
  const named = TABLE_NAME_FIELDS.flatMap((field) => {
    const value = row[field];
    return typeof value === "string" ? [value] : [];
  });
  const exactValues = Object.values(row).filter(
    (value): value is string => typeof value === "string" && schemaTables.has(value)
  );
  return [...new Set([...named, ...exactValues])].filter(
    (table) => schemaTables.has(table) && SAFE_IDENTIFIER.test(table)
  );
}

async function sha256File(path: string): Promise<string> {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

function asOpenError(error: unknown, code: "SQLITE_OPEN_FAILED" | "SQLITE_READ_POLICY_FAILED", path: string) {
  if (error instanceof World1116OpenError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new World1116OpenError(code, `World 1116 SQLite could not be opened safely: ${message}`, {
    databasePath: path
  });
}

class World1116ReadModelSession implements World1116ReadModelSessionContract {
  readonly descriptor: World1116SessionDescriptor;

  private readonly driver: World1116ReadonlySqliteDriver;
  private readonly schemaTables: ReadonlySet<string>;
  private readonly rowLimit: number;
  private readonly governanceRows = new Map<string, Promise<readonly World1116RawRow[]>>();
  private readonly domainRows = new Map<World1116Domain, Promise<World1116DomainResult<World1116UiRecord>>>();
  private registryRowsPromise?: Promise<readonly World1116RawRow[]>;
  private metadataPromise?: Promise<World1116MetadataSnapshot>;
  private rolesPromise?: Promise<readonly World1116RoleAvailability[]>;

  constructor(
    descriptor: World1116SessionDescriptor,
    driver: World1116ReadonlySqliteDriver,
    schemaTables: ReadonlySet<string>,
    rowLimit: number
  ) {
    this.descriptor = Object.freeze(descriptor);
    this.driver = driver;
    this.schemaTables = schemaTables;
    this.rowLimit = rowLimit;
  }

  private governance(table: string): Promise<readonly World1116RawRow[]> {
    if (!this.schemaTables.has(table)) return Promise.resolve([]);
    const cached = this.governanceRows.get(table);
    if (cached) return cached;
    const query = this.selectTable(table, GOVERNANCE_ROW_LIMIT);
    this.governanceRows.set(table, query);
    return query;
  }

  private registryRows(): Promise<readonly World1116RawRow[]> {
    this.registryRowsPromise ??= Promise.all([
      this.governance("role_registry"),
      this.governance("shard_query_table_registry"),
      this.governance("source_files")
    ]).then(([roles, shards, sources]) => [...roles, ...shards, ...sources]);
    return this.registryRowsPromise;
  }

  private async selectTable(
    table: string,
    limit: number = this.rowLimit
  ): Promise<readonly World1116RawRow[]> {
    const tableIdentifier = quoteIdentifier(table);
    const columns = await this.driver.all<SchemaColumnRow>(`PRAGMA table_info(${tableIdentifier})`);
    if (columns.length === 0) return [];
    const primaryKeys = [...columns]
      .filter((column) => Number(column.pk) > 0)
      .sort((left, right) => Number(left.pk) - Number(right.pk));
    const ordinal = columns.find((column) => column.name === "_row_ordinal");
    const semanticId = columns.find(
      (column) => column.name === "id" || column.name.endsWith("_id")
    );
    const orderColumns =
      primaryKeys.length > 0 ? primaryKeys : ordinal ? [ordinal] : semanticId ? [semanticId] : [];
    const orderBy =
      orderColumns.length > 0
        ? orderColumns.map((column) => quoteIdentifier(column.name)).join(", ")
        : "rowid";
    const whereClause =
      table === "src_112_manor_units_v1" && columns.some((column) => column.name === "section")
        ? " WHERE \"section\" = 'manors'"
        : "";
    return this.driver.all<World1116RawRow>(
      `SELECT * FROM ${tableIdentifier}${whereClause} ORDER BY ${orderBy} LIMIT ${limit}`
    );
  }

  private async sourceTables(domain: World1116Domain): Promise<string[]> {
    const registryRows = await this.registryRows();
    const tokens = DOMAIN_DEFINITIONS[domain].roleTokens;
    const tables = registryRows
      .filter((row) => {
        const text = registrySearchText(row);
        return tokens.some((token) => text.includes(token));
      })
      .flatMap((row) => extractRegistryTables(row, this.schemaTables));

    if (domain === "gaps" && this.schemaTables.has("cross_shard_identity_gap")) {
      tables.push("cross_shard_identity_gap");
    }
    if (domain === "residence" && this.schemaTables.has("frozen_residence__opening_residence_candidate")) {
      tables.push("frozen_residence__opening_residence_candidate");
    }
    const declared = [...new Set(tables)];
    const preferred = DOMAIN_PREFERRED_TABLES[domain].filter(
      (table) => this.schemaTables.has(table) && declared.includes(table)
    );
    return preferred.length > 0 ? preferred : declared;
  }

  private async governanceBadges(domain: World1116Domain): Promise<World1116GovernanceBadge[]> {
    return Promise.all(
      governanceTablesForDomain(domain).map(async (table) => {
        const rows = await this.governance(table);
        const statuses = rows.map(provenance);
        return {
          table,
          hasRows: rows.length > 0,
          authorityStatus: aggregateStatus(statuses.map((row) => row.authorityStatus)),
          sourceDisposition: aggregateStatus(statuses.map((row) => row.sourceDisposition)),
          provenanceRef: aggregateStatus(statuses.map((row) => row.provenanceRef)),
          unresolvedReason: aggregateStatus(statuses.map((row) => row.unresolvedReason))
        };
      })
    );
  }

  private domain<D extends World1116Domain>(domain: D): Promise<World1116DomainResult<World1116DomainDtoMap[D]>> {
    const cached = this.domainRows.get(domain);
    if (cached) return cached as Promise<World1116DomainResult<World1116DomainDtoMap[D]>>;

    const query = this.loadDomain(domain);
    this.domainRows.set(domain, query as Promise<World1116DomainResult<World1116UiRecord>>);
    return query;
  }

  private async loadDomain<D extends World1116Domain>(
    domain: D
  ): Promise<World1116DomainResult<World1116DomainDtoMap[D]>> {
    const sourceTables = await this.sourceTables(domain);
    const governanceBadges = await this.governanceBadges(domain);
    if (sourceTables.length === 0) {
      const reason = `No ${domain} query table is declared by the staging registries.`;
      return {
        domain,
        availability: "unavailable",
        rows: [],
        sourceTables: [],
        governanceBadges,
        warnings: [reason],
        runtimeTruth: false,
        authorityStatus: null,
        sourceDisposition: null,
        provenanceRef: null,
        unresolvedReason: reason
      };
    }

    const tableRows = await Promise.all(
      sourceTables.map(async (sourceTable) => ({ sourceTable, rows: await this.selectTable(sourceTable) }))
    );
    const rows = tableRows.flatMap(({ sourceTable, rows: sourceRows }) =>
      sourceRows.map((row) => mapRow(domain, row, sourceTable))
    );
    const missingGovernance = WORLD_1116_REQUIRED_GOVERNANCE_TABLES.filter(
      (table) => !this.schemaTables.has(table)
    );
    const incompleteProvenance = rows.some(
      (row) => row.authorityStatus === null || row.sourceDisposition === null || row.provenanceRef === null
    );
    const warnings: string[] = [];
    if (missingGovernance.length > 0) {
      warnings.push(`Missing governance tables: ${missingGovernance.join(", ")}.`);
    }
    if (incompleteProvenance) warnings.push("One or more rows have incomplete staging provenance.");
    const governanceBlockers = governanceBadges.filter((badge) => {
      const state = `${badge.authorityStatus ?? ""} ${badge.sourceDisposition ?? ""}`.toLowerCase();
      return badge.unresolvedReason !== null || /\b(unresolved|unknown|excluded|missing|rejected)\b/.test(state);
    });
    if (governanceBlockers.length > 0) {
      warnings.push(
        `Governance evidence requires qualification: ${governanceBlockers
          .map((badge) => badge.table)
          .join(", ")}.`
      );
    }

    return {
      domain,
      availability: warnings.length > 0 ? "degraded" : "available",
      rows,
      sourceTables,
      governanceBadges,
      warnings,
      runtimeTruth: false,
      authorityStatus: aggregateStatus(rows.map((row) => row.authorityStatus)),
      sourceDisposition: aggregateStatus(rows.map((row) => row.sourceDisposition)),
      provenanceRef: sourceTables.map((table) => `table:${table}`).join(","),
      unresolvedReason: aggregateStatus(rows.map((row) => row.unresolvedReason))
    };
  }

  metadata(): Promise<World1116MetadataSnapshot> {
    this.metadataPromise ??= Promise.all(
      WORLD_1116_REQUIRED_GOVERNANCE_TABLES.map(async (table) => [table, await this.governance(table)] as const)
    ).then((entries) => {
      const governanceRows = Object.fromEntries(entries) as Record<
        World1116GovernanceTable,
        readonly World1116RawRow[]
      >;
      const rows = governanceRows.metadata;
      const governancePresence = Object.fromEntries(
        WORLD_1116_REQUIRED_GOVERNANCE_TABLES.map((table) => [table, this.schemaTables.has(table)])
      ) as World1116MetadataSnapshot["requiredGovernanceTables"];
      const statusRows = rows.map(provenance);
      return {
        generation: this.descriptor.generation,
        sqliteSha256: this.descriptor.sqliteSha256,
        databaseFilename: WORLD_1116_DATABASE_FILENAME,
        stagingStatus: "accepted_queryable_non_runtime",
        runtimeExecutionOccurred: false,
        requiredGovernanceTables: Object.freeze(governancePresence),
        rows,
        governanceRows: Object.freeze(governanceRows),
        authorityStatus: aggregateStatus(statusRows.map((row) => row.authorityStatus)),
        sourceDisposition: aggregateStatus(statusRows.map((row) => row.sourceDisposition)),
        provenanceRef: aggregateStatus(statusRows.map((row) => row.provenanceRef)),
        unresolvedReason: aggregateStatus(statusRows.map((row) => row.unresolvedReason))
      };
    });
    return this.metadataPromise;
  }

  availableRoles(): Promise<readonly World1116RoleAvailability[]> {
    this.rolesPromise ??= Promise.all([
      this.governance("role_registry"),
      this.governance("source_files")
    ]).then(([rows, sources]) =>
      rows.map((row) => {
        const role = stringValue(row, ["role", "role_id", "role_key", "role_name", "name"]) ?? "unknown";
        const sourceIds = parseStringArray(row.source_ids_json);
        const matchingSources = sources.filter((source) => {
          const roles = parseStringArray(source.roles_json);
          const sourceId = stringValue(source, ["source_id"]);
          return roles.includes(role) || (sourceId !== null && sourceIds.includes(sourceId));
        });
        const queryTables = [
          ...extractRegistryTables(row, this.schemaTables),
          ...matchingSources.flatMap((source) => extractRegistryTables(source, this.schemaTables))
        ].filter((table, index, all) => all.indexOf(table) === index);
        const roleStatus = stringValue(row, ["status"]);
        return {
          role,
          available:
            queryTables.length > 0 &&
            (roleStatus === null || !/^(NOT_AVAILABLE|BLOCKING_)/.test(roleStatus)),
          queryTables,
          raw: row,
          ...provenance(row)
        };
      })
    );
    return this.rolesPromise;
  }

  map(): Promise<World1116DomainResult<World1116MapHexDto>> {
    return this.domain("map");
  }

  manors(): Promise<World1116DomainResult<World1116ManorDto>> {
    return this.domain("manors");
  }

  people(): Promise<World1116DomainResult<World1116PersonDto>> {
    return this.domain("people");
  }

  houses(): Promise<World1116DomainResult<World1116HouseDto>> {
    return this.domain("houses");
  }

  unions(): Promise<World1116DomainResult<World1116UnionDto>> {
    return this.domain("unions");
  }

  residence(): Promise<World1116DomainResult<World1116ResidenceDto>> {
    return this.domain("residence");
  }

  offices(): Promise<World1116DomainResult<World1116OfficeDto>> {
    return this.domain("offices");
  }

  openingResources(): Promise<World1116DomainResult<World1116OpeningResourceDto>> {
    return this.domain("openingResources");
  }

  productionCapacity(): Promise<World1116DomainResult<World1116ProductionCapacityDto>> {
    return this.domain("productionCapacity");
  }

  gaps(): Promise<World1116DomainResult<World1116GapDto>> {
    return this.domain("gaps");
  }

  close(): Promise<void> {
    return this.driver.close();
  }
}

export class World1116ReadModel {
  static async openFromPointer(
    pointerPath: string,
    options: World1116ReadModelOpenOptions = {}
  ): Promise<World1116ReadModelSessionContract> {
    const pinnedPointerPath = resolve(pointerPath);
    const expectedGeneration = options.expectedGeneration ?? WORLD_1116_ACCEPTED_GENERATION;
    const expectedSqliteSha256 = options.expectedSqliteSha256 ?? WORLD_1116_ACCEPTED_SQLITE_SHA256;
    let generation: string;

    try {
      generation = (await readFile(pinnedPointerPath, "utf8")).trim();
    } catch (error) {
      throw new World1116OpenError(
        "POINTER_MISSING",
        "Accepted world 1116 CURRENT pointer is missing; no fallback is permitted.",
        { pointerPath: pinnedPointerPath }
      );
    }
    if (!generation) {
      throw new World1116OpenError("POINTER_EMPTY", "Accepted world 1116 CURRENT pointer is empty.", {
        pointerPath: pinnedPointerPath
      });
    }
    if (!GENERATION_PATTERN.test(generation)) {
      throw new World1116OpenError("GENERATION_INVALID", "World 1116 CURRENT is not a SHA-256 generation identity.", {
        pointerPath: pinnedPointerPath,
        generation
      });
    }
    if (generation !== expectedGeneration) {
      throw new World1116OpenError(
        "GENERATION_MISMATCH",
        "World 1116 CURRENT does not identify the accepted generation; no fallback is permitted.",
        { pointerPath: pinnedPointerPath, expectedGeneration, actualGeneration: generation }
      );
    }

    const databasePath = join(
      dirname(pinnedPointerPath),
      "generations",
      generation,
      WORLD_1116_DATABASE_FILENAME
    );
    try {
      const databaseStat = await stat(databasePath);
      if (!databaseStat.isFile()) throw new Error("not a regular file");
    } catch (error) {
      throw new World1116OpenError(
        "DATABASE_MISSING",
        "Accepted world 1116 SQLite is missing; no fallback is permitted.",
        { databasePath, generation }
      );
    }

    const actualSqliteSha256 = await sha256File(databasePath);
    if (actualSqliteSha256 !== expectedSqliteSha256) {
      throw new World1116OpenError(
        "SQLITE_HASH_MISMATCH",
        "World 1116 SQLite SHA-256 differs from the accepted identity; opening was refused.",
        { databasePath, expectedSqliteSha256, actualSqliteSha256 }
      );
    }

    const driverFactory = options.driverFactory ?? openSqliteCliReadonlyDriver;
    let driver: World1116ReadonlySqliteDriver;
    try {
      driver = await driverFactory(databasePath);
    } catch (error) {
      throw asOpenError(error, "SQLITE_OPEN_FAILED", databasePath);
    }
    try {
      await driver.assertReadPolicy();
    } catch (error) {
      await driver.close().catch(() => undefined);
      throw asOpenError(error, "SQLITE_READ_POLICY_FAILED", databasePath);
    }

    let tableRows: readonly SchemaNameRow[];
    try {
      tableRows = await driver.all<SchemaNameRow>(
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      );
    } catch (error) {
      await driver.close().catch(() => undefined);
      throw asOpenError(error, "SQLITE_OPEN_FAILED", databasePath);
    }

    const rowLimit = options.rowLimit ?? 10_000;
    if (!Number.isSafeInteger(rowLimit) || rowLimit < 1 || rowLimit > 100_000) {
      await driver.close();
      throw new RangeError("World 1116 rowLimit must be an integer between 1 and 100000.");
    }

    return new World1116ReadModelSession(
      {
        generation,
        sqliteSha256: actualSqliteSha256,
        pointerPath: pinnedPointerPath,
        databasePath,
        connectionPolicy: {
          mode: "ro",
          immutable: true,
          queryOnly: true,
          generationPinnedForSession: true
        },
        stagingStatus: "accepted_queryable_non_runtime",
        runtimeExecutionOccurred: false
      },
      driver,
      new Set(tableRows.map((row) => row.name)),
      rowLimit
    );
  }
}
