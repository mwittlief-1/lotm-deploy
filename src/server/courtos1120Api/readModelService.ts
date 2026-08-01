import { resolve } from "node:path";

import { buildCouncilRoomReadyProjection } from "../../ready/councilRoomReadyProjection";
import { loadCourtOs1120PasCalibrationProposalV0 } from "../../ui/readModels/courtos1120/pasCalibrationProposalLoader";
import type { CourtOs1120PasCalibrationProposalV0 } from "../../ui/readModels/courtos1120/pasCalibrationTypes";
import { CourtOs1120ReadModel } from "../../ui/readModels/courtos1120/service";
import type { CourtOs1120ReadModelSessionContract } from "../../ui/readModels/courtos1120/types";
import { Household1120ReadModel } from "../../ui/readModels/household1120/service";
import type { Household1120ReadModelSessionContract } from "../../ui/readModels/household1120/types";
import type { CourtOs1120ApiService } from "./contracts";

export const COURTOS_1120_SQLITE_REPOSITORY_PATH =
  "data/uat/courtos_read_only_uat_contract_v1/generations/d338fca408a5bfb6bfe65c66a2dc18c0adbad0934d7879f4835806f6492ef2b9/courtos_read_only_uat_contract_1120_01_01_v1.sqlite";
export const HOUSEHOLD_1120_SQLITE_REPOSITORY_PATH =
  "data/uat/household_wave2_read_contract_v1/generations/9e58577246a3a381395f5a03b520d9790e94ab2d12287999c9bae362466014c0/household_wave2_read_contract_1120_01_01_v1.sqlite";

export interface CourtOs1120ReadModelSources {
  courtOsSqlitePath: string | null;
  householdSqlitePath: string | null;
}

function requiredSourcePath(
  value: string | null,
  name: "COURTOS_1120_SQLITE_PATH" | "HOUSEHOLD_1120_SQLITE_PATH",
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
  };
}

export function createCourtOs1120ReadModelService(
  sources: CourtOs1120ReadModelSources,
): CourtOs1120ApiService {
  let courtOsSessionPromise:
    | Promise<CourtOs1120ReadModelSessionContract>
    | undefined;
  let householdSessionPromise:
    | Promise<Household1120ReadModelSessionContract>
    | undefined;
  let pasCalibrationPromise:
    | Promise<CourtOs1120PasCalibrationProposalV0>
    | undefined;

  return {
    async courtOs(input) {
      courtOsSessionPromise ??= CourtOs1120ReadModel.open(
        requiredSourcePath(
          sources.courtOsSqlitePath,
          "COURTOS_1120_SQLITE_PATH",
        ),
      );
      pasCalibrationPromise ??= loadCourtOs1120PasCalibrationProposalV0();
      const [session, pasCalibration] = await Promise.all([
        courtOsSessionPromise,
        pasCalibrationPromise,
      ]);
      return {
        data: await session.projection(input),
        pasCalibration,
      };
    },

    async household(input) {
      householdSessionPromise ??= Household1120ReadModel.open(
        requiredSourcePath(
          sources.householdSqlitePath,
          "HOUSEHOLD_1120_SQLITE_PATH",
        ),
      );
      return (await householdSessionPromise).projection(input);
    },

    async councilRoom(input) {
      return buildCouncilRoomReadyProjection({
        houseId: input.houseId,
        turnYear: 1120,
      });
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
