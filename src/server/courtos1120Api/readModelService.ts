import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

import { buildCouncilRoomReadyProjection } from "../../ready/councilRoomReadyProjection";
import { CourtOs1120ReadModel } from "../../ui/readModels/courtos1120/service";
import type { CourtOs1120ReadModelSessionContract } from "../../ui/readModels/courtos1120/types";
import { Household1120ReadModel } from "../../ui/readModels/household1120/service";
import type { Household1120ReadModelSessionContract } from "../../ui/readModels/household1120/types";
import type { CourtOs1120ApiService } from "./contracts";
import {
  assertCourtOsHouseAccess,
  type CourtOsAccessMode,
} from "./accessPolicy";
import type {
  CourtOsSpatialHouseProjectionV1,
  CourtOsSpatialPortfolio,
} from "../../ui/spatial/courtosSpatialContract";

export const COURTOS_1120_SQLITE_REPOSITORY_PATH =
  "data/uat/courtos_read_only_uat_contract_v1/generations/d338fca408a5bfb6bfe65c66a2dc18c0adbad0934d7879f4835806f6492ef2b9/courtos_read_only_uat_contract_1120_01_01_v1.sqlite";
export const HOUSEHOLD_1120_SQLITE_REPOSITORY_PATH =
  "data/uat/household_wave2_read_contract_v1/generations/9e58577246a3a381395f5a03b520d9790e94ab2d12287999c9bae362466014c0/household_wave2_read_contract_1120_01_01_v1.sqlite";
export const COURTOS_SPATIAL_REPOSITORY_PATH =
  ".courtos-generated/courtos_spatial_read_model_v1.json";

export interface CourtOs1120ReadModelSources {
  courtOsSqlitePath: string | null;
  householdSqlitePath: string | null;
  spatialProjectionPath: string | null;
}

function requiredSourcePath(
  value: string | null,
  name:
    | "COURTOS_1120_SQLITE_PATH"
    | "HOUSEHOLD_1120_SQLITE_PATH"
    | "COURTOS_SPATIAL_PROJECTION_PATH",
): string {
  if (!value) {
    throw new Error(
      `${name} is required for the production CourtOS read-model binding.`,
    );
  }
  return value;
}

export function repositoryCourtOs1120Sources(
  rootDirectory = process.cwd(),
): CourtOs1120ReadModelSources {
  return {
    courtOsSqlitePath: resolve(rootDirectory, COURTOS_1120_SQLITE_REPOSITORY_PATH),
    householdSqlitePath: resolve(
      rootDirectory,
      HOUSEHOLD_1120_SQLITE_REPOSITORY_PATH,
    ),
    spatialProjectionPath: resolve(rootDirectory, COURTOS_SPATIAL_REPOSITORY_PATH),
  };
}

interface CourtOsSpatialRealmProjectionV1 {
  schema_version: "courtos_spatial_read_model_v1";
  effective_date: string;
  read_only: true;
  command_authority: false;
  portfolios: CourtOsSpatialPortfolio[];
}

function houseSpatialDto(
  portfolio: CourtOsSpatialPortfolio,
): CourtOsSpatialPortfolio {
  return {
    house_id: portfolio.house_id,
    house_name: portfolio.house_name,
    association_posture: "ui_admitted",
    manors: portfolio.manors.map((manor) => ({
      manor_id: manor.manor_id,
      display_name: manor.display_name,
      county_id: manor.county_id,
      county_name: manor.county_name,
      seat_hex_id: manor.seat_hex_id,
      seat_q: manor.seat_q,
      seat_r: manor.seat_r,
      hex_count: manor.hex_count,
      estimated_peasant_households: manor.estimated_peasant_households,
      detailed_coverage: {
        coverage_state: manor.detailed_coverage.coverage_state,
        renderer_level: manor.detailed_coverage.renderer_level,
        available_levels: [...manor.detailed_coverage.available_levels],
        ...(manor.detailed_coverage.authored_acre_count === undefined
          ? {}
          : { authored_acre_count: manor.detailed_coverage.authored_acre_count }),
        renderers: { ...manor.detailed_coverage.renderers },
      },
    })),
  };
}

async function readSpatialProjection(
  sourcePath: string,
): Promise<CourtOsSpatialRealmProjectionV1> {
  const value: unknown = JSON.parse(await readFile(sourcePath, "utf8"));
  if (!value || typeof value !== "object") {
    throw new Error("CourtOS spatial projection is not an object.");
  }
  const projection = value as Partial<CourtOsSpatialRealmProjectionV1>;
  if (
    projection.schema_version !== "courtos_spatial_read_model_v1" ||
    projection.read_only !== true ||
    projection.command_authority !== false ||
    !Array.isArray(projection.portfolios)
  ) {
    throw new Error("CourtOS spatial projection failed its source contract.");
  }
  return projection as CourtOsSpatialRealmProjectionV1;
}

export function createCourtOs1120ReadModelService(
  sources: CourtOs1120ReadModelSources,
  options: { accessMode?: CourtOsAccessMode } = {},
): CourtOs1120ApiService {
  const accessMode = options.accessMode ?? "generalization_qa";
  let courtOsSessionPromise:
    | Promise<CourtOs1120ReadModelSessionContract>
    | undefined;
  let householdSessionPromise:
    | Promise<Household1120ReadModelSessionContract>
    | undefined;
  let spatialProjectionPromise:
    | Promise<CourtOsSpatialRealmProjectionV1>
    | undefined;
  return {
    async courtOs(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      courtOsSessionPromise ??= CourtOs1120ReadModel.open(
        requiredSourcePath(
          sources.courtOsSqlitePath,
          "COURTOS_1120_SQLITE_PATH",
        ),
      );
      const session = await courtOsSessionPromise;
      return session.projection(input);
    },

    async household(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      courtOsSessionPromise ??= CourtOs1120ReadModel.open(
        requiredSourcePath(
          sources.courtOsSqlitePath,
          "COURTOS_1120_SQLITE_PATH",
        ),
      );
      const courtOsProjection = await (await courtOsSessionPromise).projection({
        houseId: input.houseId,
      });
      if (
        courtOsProjection.selected_entity.entity_id !== input.householdEntityId
      ) {
        throw new Error("Household selector does not belong to the selected House.");
      }
      householdSessionPromise ??= Household1120ReadModel.open(
        requiredSourcePath(
          sources.householdSqlitePath,
          "HOUSEHOLD_1120_SQLITE_PATH",
        ),
      );
      return (await householdSessionPromise).projection(input);
    },

    async councilRoom(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      return buildCouncilRoomReadyProjection({
        houseId: input.houseId,
        turnYear: 1120,
      });
    },

    async spatial(input): Promise<CourtOsSpatialHouseProjectionV1> {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      spatialProjectionPromise ??= readSpatialProjection(
        requiredSourcePath(
          sources.spatialProjectionPath,
          "COURTOS_SPATIAL_PROJECTION_PATH",
        ),
      );
      const projection = await spatialProjectionPromise;
      const portfolio =
        projection.portfolios.find((item) => item.house_id === input.houseId) ??
        null;
      if (portfolio && portfolio.association_posture !== "ui_admitted") {
        throw new Error("Spatial portfolio is not UI-admitted.");
      }
      return {
        schema_version: "courtos_spatial_house_projection_v1",
        effective_date: projection.effective_date,
        read_only: true,
        command_authority: false,
        query: { house_id: input.houseId },
        availability: portfolio ? "admitted" : "not_admitted",
        portfolio: portfolio ? houseSpatialDto(portfolio) : null,
      };
    },

    async close() {
      await Promise.all([
        courtOsSessionPromise
          ?.then((session) => session.close())
          .catch(() => undefined),
        householdSessionPromise
          ?.then((session) => session.close())
          .catch(() => undefined),
      ]);
    },
  };
}
