import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

import {
  NativeSqliteReadonlyDriver,
  type World1116ReadonlySqliteDriver,
} from "../world1116/sqliteReadonlyDriver";
import {
  HOUSEHOLD_1120_CONTRACT_GENERATION,
  HOUSEHOLD_1120_SQLITE_SHA256,
  type Household1120AdultKinArrangementRow,
  type Household1120AdultKinRosterRow,
  type Household1120CareArrangementRow,
  type Household1120EducationCycleReportRow,
  type Household1120EducationLearnerPlanRow,
  type Household1120HealthCycleReportRow,
  type Household1120HealthRosterRow,
  type Household1120MatterRow,
  type Household1120MembershipRow,
  type Household1120ProtectedPersonDossierRow,
  type Household1120ProvenanceRow,
  type Household1120ReadBoundary,
  type Household1120ReadModelSessionContract,
  type Household1120ReadOnlyProjection,
  type Household1120ResponsibilityRow,
  type Household1120StoresHistoryRow,
  type Household1120StoresPositionRow,
  type Household1120SupplyRouteRow,
} from "./types";

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
  return unique.length > 0 ? `(${unique.map(sqlString).join(",")})` : "(NULL)";
}

function assertReadBoundary(rows: readonly Household1120ReadBoundary[]): void {
  for (const row of rows) {
    if (Number(row.runtime_authority) !== 0) {
      throw new Error("Household read contract returned a runtime-authorized row.");
    }
    if (!row.effective_date || !row.source_authority_status || !row.disclosure_posture) {
      throw new Error("Household read contract returned a row without its authority boundary.");
    }
  }
}

export class Household1120ReadModel implements Household1120ReadModelSessionContract {
  private constructor(private readonly driver: World1116ReadonlySqliteDriver) {}

  static async open(databasePath: string): Promise<Household1120ReadModel> {
    const actualSha = await sha256File(databasePath);
    if (actualSha !== HOUSEHOLD_1120_SQLITE_SHA256) {
      throw new Error(
        `Household SQLite SHA mismatch: expected ${HOUSEHOLD_1120_SQLITE_SHA256}, got ${actualSha}.`,
      );
    }
    const driver = new NativeSqliteReadonlyDriver(databasePath);
    await driver.assertReadPolicy();
    return new Household1120ReadModel(driver);
  }

  async projection(input: {
    householdEntityId: string;
    houseId: string;
  }): Promise<Household1120ReadOnlyProjection> {
    const householdEntityId = input.householdEntityId.trim();
    const houseId = input.houseId.trim();
    if (!householdEntityId) throw new Error("householdEntityId is required.");
    if (!houseId) throw new Error("houseId is required.");

    const householdEntity = sqlString(householdEntityId);
    const protectedHouse = sqlString(houseId);

    const [membershipContext, responsibilitySummary, storesPositions, storesHistory, supplyRoutes, adultKinRoster, educationPlans, matters, provenance] =
      await Promise.all([
        this.driver.all<Household1120MembershipRow>(
          `SELECT * FROM ro_household_family_book_v1 WHERE endpoint_house_protected_id = ${protectedHouse} ORDER BY display_name, protected_person_id`,
        ),
        this.driver.all<Household1120ResponsibilityRow>(
          `SELECT * FROM ro_household_responsibility_summary_v1 WHERE demand_entity_id = ${householdEntity} ORDER BY responsibility_summary_id`,
        ),
        this.driver.all<Household1120StoresPositionRow>(
          `SELECT * FROM ro_household_stores_position_v1 WHERE household_entity_id = ${householdEntity} ORDER BY resource_id, stores_position_id`,
        ),
        this.driver.all<Household1120StoresHistoryRow>(
          `SELECT * FROM ro_household_stores_history_v1 WHERE household_entity_id = ${householdEntity} ORDER BY event_effective_date, stores_history_id`,
        ),
        this.driver.all<Household1120SupplyRouteRow>(
          `SELECT * FROM ro_household_supply_counterparty_route_v1 WHERE household_entity_id = ${householdEntity} ORDER BY supply_route_id`,
        ),
        this.driver.all<Household1120AdultKinRosterRow>(
          `SELECT * FROM ro_adult_kin_support_roster_v1 WHERE household_entity_id = ${householdEntity} ORDER BY person_id, support_roster_id`,
        ),
        this.driver.all<Household1120EducationLearnerPlanRow>(
          `SELECT * FROM ro_education_learner_plan_v1 WHERE learner_house_id = ${protectedHouse} ORDER BY learner_name, learner_person_id`,
        ),
        this.driver.all<Household1120MatterRow>(
          `SELECT * FROM ro_household_matter_v1 WHERE household_entity_id = ${householdEntity} ORDER BY household_matter_id`,
        ),
        this.driver.all<Household1120ProvenanceRow>(
          "SELECT * FROM ro_household_provenance_v1 ORDER BY record_kind, record_key",
        ),
      ]);

    const membershipPersonIds = membershipContext.map((row) => row.protected_person_id);
    const adultKinPersonIds = adultKinRoster.map((row) => row.person_id);
    const learnerPersonIds = educationPlans.map((row) => row.learner_person_id);

    const [adultKinArrangements, educationCycleReports, healthRoster] = await Promise.all([
      this.driver.all<Household1120AdultKinArrangementRow>(
        `SELECT * FROM ro_adult_kin_support_arrangement_v1 WHERE person_id IN ${sqlIn(adultKinPersonIds)} ORDER BY person_id, support_arrangement_id`,
      ),
      this.driver.all<Household1120EducationCycleReportRow>(
        `SELECT * FROM ro_education_cycle_report_v1 WHERE learner_person_id IN ${sqlIn(learnerPersonIds)} ORDER BY cycle_year DESC, learner_person_id, cycle_report_id`,
      ),
      this.driver.all<Household1120HealthRosterRow>(
        `SELECT * FROM ro_health_roster_v1 WHERE person_id IN ${sqlIn(membershipPersonIds)} ORDER BY person_id, health_roster_id`,
      ),
    ]);

    const healthPersonIds = healthRoster.map((row) => row.person_id);
    const [healthCycleReports, careArrangements, protectedPersonDossiers] = await Promise.all([
      this.driver.all<Household1120HealthCycleReportRow>(
        `SELECT * FROM ro_health_cycle_report_v1 WHERE person_id IN ${sqlIn(healthPersonIds)} ORDER BY cycle_year DESC, person_id, health_cycle_report_id`,
      ),
      this.driver.all<Household1120CareArrangementRow>(
        `SELECT * FROM ro_care_arrangement_v1 WHERE person_id IN ${sqlIn(healthPersonIds)} ORDER BY person_id, care_arrangement_id`,
      ),
      /*
       * V1 has no household key on a protection dossier. Restricting the query
       * to admitted House membership is the only non-leaking read available.
       * The currently pinned surface is withheld and empty; a future admitted
       * external ward requires a keyed V2 projection before it can render.
       */
      this.driver.all<Household1120ProtectedPersonDossierRow>(
        `SELECT * FROM ro_protected_person_dossier_v1 WHERE person_id IN ${sqlIn(membershipPersonIds)} ORDER BY person_id, protected_person_dossier_id`,
      ),
    ]);

    for (const rows of [
      membershipContext,
      responsibilitySummary,
      storesPositions,
      storesHistory,
      supplyRoutes,
      adultKinRoster,
      adultKinArrangements,
      educationPlans,
      educationCycleReports,
      healthRoster,
      healthCycleReports,
      careArrangements,
      protectedPersonDossiers,
      matters,
      provenance,
    ]) {
      assertReadBoundary(rows);
    }

    return {
      schema_version: "household_1120_read_only_projection_v2",
      contract: {
        generation_id: HOUSEHOLD_1120_CONTRACT_GENERATION,
        effective_date: "1120-01-01",
        sqlite_sha256: HOUSEHOLD_1120_SQLITE_SHA256,
        sqlite_integrity: "ok",
        runtime_authority: false,
      },
      query: {
        household_entity_id: householdEntityId,
        house_id: houseId,
      },
      membership_context: membershipContext,
      responsibility_summary: responsibilitySummary,
      stores_positions: storesPositions,
      stores_history: storesHistory,
      supply_routes: supplyRoutes,
      adult_kin_roster: adultKinRoster,
      adult_kin_arrangements: adultKinArrangements,
      education_plans: educationPlans,
      education_cycle_reports: educationCycleReports,
      health_roster: healthRoster,
      health_cycle_reports: healthCycleReports,
      care_arrangements: careArrangements,
      protected_person_dossiers: protectedPersonDossiers,
      matters,
      provenance,
    };
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
