import {
  createCourtOs1120ReadModelService,
  type CourtOs1120ReadModelSources,
} from "./readModelService";
import type { CourtOs1120ApiService } from "./contracts";

let productionService: CourtOs1120ApiService | undefined;

function configuredPath(
  environment: NodeJS.ProcessEnv,
  name: "COURTOS_1120_SQLITE_PATH" | "HOUSEHOLD_1120_SQLITE_PATH",
): string | null {
  return environment[name]?.trim() || null;
}

export function productionCourtOs1120Sources(
  environment: NodeJS.ProcessEnv = process.env,
): CourtOs1120ReadModelSources {
  return {
    courtOsSqlitePath: configuredPath(environment, "COURTOS_1120_SQLITE_PATH"),
    householdSqlitePath: configuredPath(
      environment,
      "HOUSEHOLD_1120_SQLITE_PATH",
    ),
  };
}

export function productionCourtOs1120Service(): CourtOs1120ApiService {
  productionService ??= createCourtOs1120ReadModelService(
    productionCourtOs1120Sources(),
  );
  return productionService;
}
