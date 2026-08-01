import type { CouncilRoomReadyProjectionV1 } from "../ready/councilRoomReadyProjection";
import type { CourtOs1120ReadOnlyProjection } from "./readModels/courtos1120/types";
import type {
  Household1120ProvenanceRow,
  Household1120ReadOnlyProjection,
} from "./readModels/household1120/types";
import type { CourtOsResponsibilityDesignKey } from "./courtosInformationArchitecture";
import {
  buildCourtOsShellRuntimeModel,
  type CourtOsShellRuntimeModel,
} from "./courtosShellModel";

export type HouseholdResponsibilityKey =
  | "stores"
  | "adult_kin"
  | "education"
  | "service_care";

export interface HouseholdResponsibilityDefinition {
  key: HouseholdResponsibilityKey;
  designKey: CourtOsResponsibilityDesignKey;
  title: string;
  shortTitle: string;
  place: string;
  purpose: string;
  art: string;
  provenanceKeys: readonly string[];
}

export const HOUSEHOLD_RESPONSIBILITIES: readonly HouseholdResponsibilityDefinition[] = [
  {
    key: "stores",
    designKey: "household_stores_provisioning_procurement",
    title: "Household Stores, Provisioning & Procurement",
    shortTitle: "Stores & Provisioning",
    place: "The Household Stores",
    purpose: "Food, goods, custody, procurement, movements, and receipts.",
    art: "/assets/council-command-room/household-vertical-slice/household-stores-focus-v1.png",
    provenanceKeys: [
      "ro_household_responsibility_summary_v1",
      "ro_household_stores_position_v1",
      "ro_household_stores_history_v1",
      "ro_household_supply_counterparty_route_v1",
    ],
  },
  {
    key: "adult_kin",
    designKey: "adult_kin_support",
    title: "Adult Kin Support",
    shortTitle: "Adult Kin",
    place: "The Kinship Solar",
    purpose: "Support arrangements, residence posture, service, and placement.",
    art: "/assets/council-command-room/household-vertical-slice/adult-kin-support-room-v1.png",
    provenanceKeys: [
      "ro_adult_kin_support_roster_v1",
      "ro_adult_kin_support_arrangement_v1",
    ],
  },
  {
    key: "education",
    designKey: "education_formation",
    title: "Education & Formation",
    shortTitle: "Education",
    place: "The Scholarium",
    purpose: "Learner plans, providers, settings, reviews, and formation records.",
    art: "/assets/council-command-room/household-vertical-slice/education-formation-room-v1.png",
    provenanceKeys: [
      "ro_education_learner_plan_v1",
      "ro_education_cycle_report_v1",
    ],
  },
  {
    key: "service_care",
    designKey: "household_service_care",
    title: "Household Service & Care",
    shortTitle: "Service & Care",
    place: "The Care Chamber",
    purpose: "Active conditions, care arrangements, providers, and cycle reports.",
    art: "/assets/council-command-room/household-vertical-slice/health-care-room-v1.png",
    provenanceKeys: [
      "ro_health_roster_v1",
      "ro_health_cycle_report_v1",
      "ro_care_arrangement_v1",
    ],
  },
] as const;

export type HouseholdSurfaceState =
  | "current"
  | "partial"
  | "withheld"
  | "unassigned";

export interface HouseholdResponsibilityRuntime {
  definition: HouseholdResponsibilityDefinition;
  holder: {
    personId: string;
    displayName: string;
    authorityPosture: string;
  } | null;
  state: HouseholdSurfaceState;
  stateLabel: string;
  recordCount: number;
  currentRecordCount: number;
  cycleRecordCount: number;
  provenance: readonly Household1120ProvenanceRow[];
  explanation: string;
}

export interface HouseholdUatRuntimeModel extends CourtOsShellRuntimeModel {
  responsibilities: readonly HouseholdResponsibilityRuntime[];
  protectedPersons: {
    visible: boolean;
    recordCount: number;
    provenance: Household1120ProvenanceRow | null;
  };
  membershipContextCount: number;
}

function provenanceFor(
  projection: Household1120ReadOnlyProjection,
  keys: readonly string[],
): Household1120ProvenanceRow[] {
  const keySet = new Set(keys);
  return projection.provenance.filter((row) => keySet.has(row.record_key));
}

function withheldExplanation(rows: readonly Household1120ProvenanceRow[]): string | null {
  const withheld = rows.find(
    (row) => row.admission_state === "withheld_pending_admission",
  );
  return withheld?.withheld_reason ?? null;
}

function responsibilityUnavailableExplanation(
  key: HouseholdResponsibilityKey,
): string {
  if (key === "stores") {
    return "No current stock, custody, movement, route, or receipt record is admitted.";
  }
  if (key === "adult_kin") {
    return "No Adult Kin support roster or active support arrangement is admitted.";
  }
  if (key === "education") {
    return "No learner plan or Education cycle report is admitted.";
  }
  return "No active continuing-care case, service arrangement, or responsible-party report is admitted.";
}

function recordsFor(
  key: HouseholdResponsibilityKey,
  projection: Household1120ReadOnlyProjection,
): { current: number; cycle: number; total: number } {
  if (key === "stores") {
    const current = projection.stores_positions.length + projection.supply_routes.length;
    const cycle = projection.stores_history.length;
    return { current, cycle, total: current + cycle };
  }
  if (key === "adult_kin") {
    const current =
      projection.adult_kin_roster.length + projection.adult_kin_arrangements.length;
    return { current, cycle: 0, total: current };
  }
  if (key === "education") {
    const current = projection.education_plans.length;
    const cycle = projection.education_cycle_reports.length;
    return { current, cycle, total: current + cycle };
  }
  const current =
    projection.health_roster.length + projection.care_arrangements.length;
  const cycle = projection.health_cycle_reports.length;
  return { current, cycle, total: current + cycle };
}

function responsibilityFor(
  key: HouseholdResponsibilityKey,
  projection: Household1120ReadOnlyProjection,
) {
  if (key !== "stores") return null;
  return (
    projection.responsibility_summary.find(
      (row) =>
        row.responsibility_id ===
        "sr_household_stores_provisioning_procurement",
    ) ?? null
  );
}

function buildResponsibility(
  definition: HouseholdResponsibilityDefinition,
  projection: Household1120ReadOnlyProjection,
): HouseholdResponsibilityRuntime {
  const provenance = provenanceFor(projection, definition.provenanceKeys);
  const responsibility = responsibilityFor(definition.key, projection);
  const records = recordsFor(definition.key, projection);
  const withheld = withheldExplanation(provenance);
  const holder =
    responsibility?.holder_person_id && responsibility.holder_display_name
      ? {
          personId: responsibility.holder_person_id,
          displayName: responsibility.holder_display_name,
          authorityPosture: responsibility.authority_posture,
        }
      : null;

  if (records.total > 0) {
    const partial = provenance.some(
      (row) => row.admission_state === "withheld_pending_admission",
    );
    return {
      definition,
      holder,
      state: partial ? "partial" : "current",
      stateLabel: partial ? "Partial record" : "Current record",
      recordCount: records.total,
      currentRecordCount: records.current,
      cycleRecordCount: records.cycle,
      provenance,
      explanation: partial
        ? "Current records are readable; one or more cycle or execution surfaces are not yet admitted."
        : "The current and cycle records are readable from the admitted Household contract.",
    };
  }

  if (withheld) {
    return {
      definition,
      holder,
      state: "withheld",
      stateLabel: "Record unavailable",
      recordCount: 0,
      currentRecordCount: 0,
      cycleRecordCount: 0,
      provenance,
      explanation: responsibilityUnavailableExplanation(definition.key),
    };
  }

  return {
    definition,
    holder,
    state: "unassigned",
    stateLabel: holder ? "No current record" : "No admitted assignment",
    recordCount: 0,
    currentRecordCount: 0,
    cycleRecordCount: 0,
    provenance,
    explanation: holder
      ? "An accountable holder is visible, but no current operating record is admitted."
      : "No accountable holder or operating record is admitted for this responsibility.",
  };
}

export function buildHouseholdUatRuntimeModel(input: {
  courtOs: CourtOs1120ReadOnlyProjection;
  household: Household1120ReadOnlyProjection;
  council: CouncilRoomReadyProjectionV1;
}): HouseholdUatRuntimeModel {
  const shell = buildCourtOsShellRuntimeModel(input);
  const courtHouseId = shell.house.houseId;
  if (
    input.household.query.house_id !== courtHouseId ||
    input.household.query.household_entity_id !==
      input.courtOs.selected_entity.entity_id
  ) {
    throw new Error("Household projection scope does not match the CourtOS entity.");
  }

  const protectedProvenance =
    input.household.provenance.find(
      (row) => row.record_key === "ro_protected_person_dossier_v1",
    ) ?? null;

  return {
    ...shell,
    responsibilities: HOUSEHOLD_RESPONSIBILITIES.map((definition) =>
      buildResponsibility(definition, input.household),
    ),
    protectedPersons: {
      visible: input.household.protected_person_dossiers.length > 0,
      recordCount: input.household.protected_person_dossiers.length,
      provenance: protectedProvenance,
    },
    membershipContextCount: input.household.membership_context.length,
  };
}
