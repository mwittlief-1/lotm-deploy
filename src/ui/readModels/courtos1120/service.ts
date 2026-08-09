import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver
} from "../world1116/sqliteReadonlyDriver";
import {
  COURTOS_1120_CONTRACT_GENERATION,
  COURTOS_1120_READ_ONLY_PROJECTION_SCHEMA_VERSION,
  COURTOS_1120_SQLITE_SHA256,
  type CourtOs1120EntitySummaryRow,
  type CourtOs1120JsonObject,
  type CourtOs1120OfficeRow,
  type CourtOs1120OfficeViewRow,
  type CourtOs1120PersonAssignmentRow,
  type CourtOs1120ReadModelSessionContract,
  type CourtOs1120ReadOnlyProjection,
  type CourtOs1120ResidencePresenceRow,
  type CourtOs1120ResponsibilityRow,
  type CourtOs1120ReviewDocketRow,
  type CourtOs1120StandingOrderTaskRow
} from "./types";

const MAX_ENTITY_ROWS = 1;
const MAX_OFFICE_ROWS = 240;
const MAX_RESPONSIBILITY_ROWS = 360;
const MAX_STANDING_ORDER_ROWS = 360;
const MAX_PERSON_ROWS = 120;
const MAX_HOUSEHOLD_PERSON_ROWS = 240;
const MAX_RESIDENCE_ROWS = 140;
const MAX_DOCKET_ROWS = 160;

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlIn(values: readonly string[]): string {
  const unique = [...new Set(values.filter((value) => value.trim().length > 0))].sort();
  if (unique.length === 0) return "(NULL)";
  return `(${unique.map(sqlString).join(",")})`;
}

function parseJsonObjects(value: string): CourtOs1120JsonObject[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CourtOs1120JsonObject => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry));
  } catch {
    return [];
  }
}

function withOfficeJson(rows: readonly CourtOs1120OfficeRow[]): CourtOs1120OfficeViewRow[] {
  return rows.map((row) => ({
    ...row,
    functional_roles: parseJsonObjects(row.functional_roles_json),
    standing_responsibilities: parseJsonObjects(row.standing_responsibilities_json)
  }));
}

function runtimeAuthorityRows(rows: readonly { runtime_authority: number }[]): number {
  return rows.filter((row) => Number(row.runtime_authority) !== 0).length;
}

function firstState<Row extends object, Key extends keyof Row>(
  rows: readonly Row[],
  key: Key,
  fallback: string
): string {
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return fallback;
}

function personIdsFrom(
  offices: readonly CourtOs1120OfficeRow[],
  responsibilities: readonly CourtOs1120ResponsibilityRow[],
  standingOrderTasks: readonly CourtOs1120StandingOrderTaskRow[]
): string[] {
  return [
    ...offices.map((row) => row.holder_person_id),
    ...responsibilities.map((row) => row.protected_person_id),
    ...standingOrderTasks.map((row) => row.protected_person_id)
  ].filter((value): value is string => Boolean(value));
}

function subjectIdsForDocket(
  entity: CourtOs1120EntitySummaryRow,
  offices: readonly CourtOs1120OfficeRow[],
  responsibilities: readonly CourtOs1120ResponsibilityRow[],
  standingOrderTasks: readonly CourtOs1120StandingOrderTaskRow[]
): string[] {
  return [
    entity.entity_id,
    ...offices.map((row) => row.office_id),
    ...responsibilities.map((row) => row.responsibility_demand_id),
    ...standingOrderTasks.map((row) => row.standing_order_task_state_id)
  ];
}

function sumRuntimeTaskCounts(rows: readonly CourtOs1120StandingOrderTaskRow[]): number | null {
  const values = rows
    .map((row) => row.runtime_task_count)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function assertNoRuntimeAuthority(input: {
  entityRows: readonly CourtOs1120EntitySummaryRow[];
  offices: readonly CourtOs1120OfficeRow[];
  responsibilities: readonly CourtOs1120ResponsibilityRow[];
  standingOrderTasks: readonly CourtOs1120StandingOrderTaskRow[];
  people: readonly CourtOs1120PersonAssignmentRow[];
  residences: readonly CourtOs1120ResidencePresenceRow[];
  docket: readonly CourtOs1120ReviewDocketRow[];
}): void {
  const rowCount =
    runtimeAuthorityRows(input.entityRows) +
    runtimeAuthorityRows(input.offices) +
    runtimeAuthorityRows(input.responsibilities) +
    runtimeAuthorityRows(input.standingOrderTasks) +
    runtimeAuthorityRows(input.people) +
    runtimeAuthorityRows(input.residences) +
    runtimeAuthorityRows(input.docket);
  if (rowCount !== 0) {
    throw new Error(`CourtOS read-only contract query returned ${rowCount} runtime-authorized row(s).`);
  }
}

export class CourtOs1120ReadModel implements CourtOs1120ReadModelSessionContract {
  readonly descriptor: CourtOs1120ReadModelSessionContract["descriptor"];

  private readonly driver: World1116ReadonlySqliteDriver;

  private constructor(databasePath: string, driver: World1116ReadonlySqliteDriver) {
    this.driver = driver;
    this.descriptor = {
      generation: COURTOS_1120_CONTRACT_GENERATION,
      sqliteSha256: COURTOS_1120_SQLITE_SHA256,
      databasePath,
      connectionPolicy: {
        mode: "ro",
        sqliteImmutableUri: false,
        sourceSnapshotChecksumPinned: true,
        queryOnly: true,
        generationPinnedForSession: true
      }
    };
  }

  static async open(databasePath: string): Promise<CourtOs1120ReadModel> {
    const actualSha = await sha256File(databasePath);
    if (actualSha !== COURTOS_1120_SQLITE_SHA256) {
      throw new Error(`CourtOS SQLite SHA mismatch: expected ${COURTOS_1120_SQLITE_SHA256}, got ${actualSha}.`);
    }
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new CourtOs1120ReadModel(databasePath, driver);
  }

  /**
   * Opens the exact CourtOS tables copied into an already verified immutable
   * Foundation A release. The outer release reader owns artifact hashing and
   * exact source-identity validation before this method may be called.
   */
  static async openVerifiedEmbeddedCopy(
    databasePath: string,
  ): Promise<CourtOs1120ReadModel> {
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new CourtOs1120ReadModel(databasePath, driver);
  }

  async projection(
    input: {
      entityId?: string | null;
      houseId?: string | null;
      entityLabel?: string | null;
    },
  ): Promise<CourtOs1120ReadOnlyProjection> {
    const requestedEntityId = input.entityId?.trim() || null;
    const requestedHouseId = input.houseId?.trim() || null;
    const requestedEntityLabel = input.entityLabel?.trim() || null;
    if (!requestedEntityId && !requestedHouseId && !requestedEntityLabel) {
      throw new Error("A CourtOS entityId, houseId, or entityLabel selector is required.");
    }
    const entityFilter = requestedEntityId
      ? `entity_id = ${sqlString(requestedEntityId)}`
      : requestedHouseId
        ? `protected_graph_entity_id = ${sqlString(requestedHouseId)}`
        : `display_label = ${sqlString(requestedEntityLabel as string)}`;
    const entityRows = await this.driver.all<CourtOs1120EntitySummaryRow>(
      `SELECT * FROM ro_entity_courtos_summary_v1 WHERE ${entityFilter} ` +
        "ORDER BY CASE identity_state WHEN 'accepted_uat_identity_crosswalk' THEN 0 ELSE 1 END, " +
        `responsibility_demand_count DESC, entity_id LIMIT ${MAX_ENTITY_ROWS}`,
    );
    const selectedEntity = entityRows[0];
    if (!selectedEntity) {
      throw new Error(`CourtOS entity not found for ${requestedEntityId ?? requestedHouseId ?? requestedEntityLabel}.`);
    }

    const [officesRaw, responsibilities, standingOrderTasks] = await Promise.all([
      this.driver.all<CourtOs1120OfficeRow>(
        `SELECT * FROM ro_office_detail_v1 WHERE authority_entity_id = ${sqlString(selectedEntity.entity_id)} ` +
          `ORDER BY review_required DESC, office_title, office_id LIMIT ${MAX_OFFICE_ROWS}`
      ),
      this.driver.all<CourtOs1120ResponsibilityRow>(
        `SELECT * FROM ro_responsibility_coverage_detail_v1 WHERE demand_entity_id = ${sqlString(selectedEntity.entity_id)} ` +
          `ORDER BY review_required DESC, responsibility_label, holder_display_name, responsibility_demand_id LIMIT ${MAX_RESPONSIBILITY_ROWS}`
      ),
      this.driver.all<CourtOs1120StandingOrderTaskRow>(
        `SELECT * FROM ro_standing_order_task_state_v1 WHERE demand_entity_id = ${sqlString(selectedEntity.entity_id)} ` +
          `ORDER BY review_required DESC, standing_responsibility_id, protected_person_id, standing_order_task_state_id LIMIT ${MAX_STANDING_ORDER_ROWS}`
      )
    ]);

    const householdPeople = await this.driver.all<CourtOs1120PersonAssignmentRow>(
      `SELECT * FROM ro_person_assignment_capacity_summary_v1 WHERE endpoint_house_entity_id = ${sqlString(selectedEntity.entity_id)} ` +
        `ORDER BY review_required DESC, birth_year, display_name, protected_person_id LIMIT ${MAX_HOUSEHOLD_PERSON_ROWS}`
    );

    const peopleIds = personIdsFrom(officesRaw, responsibilities, standingOrderTasks);
    const [people, residences] =
      peopleIds.length > 0
        ? await Promise.all([
            this.driver.all<CourtOs1120PersonAssignmentRow>(
              `SELECT * FROM ro_person_assignment_capacity_summary_v1 WHERE protected_person_id IN ${sqlIn(peopleIds)} ` +
                `ORDER BY review_required DESC, display_name, protected_person_id LIMIT ${MAX_PERSON_ROWS}`
            ),
            this.driver.all<CourtOs1120ResidencePresenceRow>(
              `SELECT * FROM ro_residence_presence_v1 WHERE protected_person_id IN ${sqlIn(peopleIds)} ` +
                `ORDER BY review_required DESC, display_name, residence_presence_id LIMIT ${MAX_RESIDENCE_ROWS}`
            )
          ])
        : [[], []];

    const docketSubjectIds = subjectIdsForDocket(selectedEntity, officesRaw, responsibilities, standingOrderTasks);
    const docket =
      docketSubjectIds.length > 0
        ? await this.driver.all<CourtOs1120ReviewDocketRow>(
            `SELECT * FROM ro_review_docket_v1 WHERE subject_record_id IN ${sqlIn(docketSubjectIds)} ` +
              `ORDER BY severity, docket_class, review_docket_id LIMIT ${MAX_DOCKET_ROWS}`
          )
        : [];

    assertNoRuntimeAuthority({
      entityRows,
      offices: officesRaw,
      responsibilities,
      standingOrderTasks,
      people: [...people, ...householdPeople],
      residences,
      docket
    });

    const offices = withOfficeJson(officesRaw);
    return {
      schema_version: COURTOS_1120_READ_ONLY_PROJECTION_SCHEMA_VERSION,
      contract: {
        package_id: "january_1120_courtos_read_only_uat_contract_v1",
        contract_status: "LOCKED_READ_ONLY_UAT_PROJECTION_CONTRACT_NOT_EXECUTABLE_RUNTIME_AUTHORITY",
        generation_id: COURTOS_1120_CONTRACT_GENERATION,
        effective_date: "1120-01-01",
        sqlite_sha256: COURTOS_1120_SQLITE_SHA256,
        sqlite_integrity: "ok"
      },
      query: {
        entity_id: requestedEntityId,
        house_id: requestedHouseId ?? selectedEntity.protected_graph_entity_id ?? null,
        entity_label: requestedEntityLabel ?? selectedEntity.display_label ?? selectedEntity.entity_id
      },
      selected_entity: selectedEntity,
      offices,
      responsibilities,
      standing_order_tasks: standingOrderTasks,
      people,
      household_people: householdPeople,
      residence_presence: residences,
      review_docket: docket,
      totals: {
        office_count: offices.length,
        occupied_office_count: offices.filter((row) => row.assignment_state === "occupied").length,
        vacancy_or_unresolved_office_count: offices.filter((row) => row.assignment_state !== "occupied").length,
        responsibility_count: responsibilities.length,
        structural_carrier_present_count: responsibilities.filter((row) => row.coverage_state.includes("carrier")).length,
        review_required_responsibility_count: responsibilities.filter((row) => row.review_required === 1).length,
        standing_order_route_count: standingOrderTasks.length,
        initialized_standing_order_count: standingOrderTasks.filter((row) => row.standing_order_id).length,
        runtime_task_count: sumRuntimeTaskCounts(standingOrderTasks),
        people_count: people.length,
        household_people_count: householdPeople.length,
        residence_presence_count: residences.length,
        review_docket_count: docket.length
      },
      unavailable_states: {
        workload_state: selectedEntity.workload_state,
        capacity_state: selectedEntity.capacity_state,
        occupancy_state: selectedEntity.occupancy_state,
        standing_order_state: firstState(standingOrderTasks, "standing_order_state", "unavailable_not_initialized_in_read_only_contract"),
        runtime_task_state: firstState(standingOrderTasks, "runtime_task_state", "unavailable_no_runtime_task_model"),
        runtime_receipt_state: firstState(standingOrderTasks, "runtime_receipt_state", "unavailable_no_runtime_receipt_model"),
        event_commitment_state: firstState(standingOrderTasks, "event_commitment_state", "unavailable_no_event_commitment_model")
      },
      boundaries: {
        read_only_contract: true,
        runtime_authority: false,
        executable_command_authority: false,
        source_graph_mutation: false,
        workload_values_available: false,
        capacity_values_available: false,
        initialized_orders_available: false
      }
    };
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
