import {
  createCourtOs1120ReadModelService,
  repositoryCourtOs1120Sources,
  type CourtOs1120ReadModelSources,
} from "./readModelService";
import type { CourtOs1120ApiService } from "./contracts";

let productionService: CourtOs1120ApiService | undefined;

function configuredPath(
  environment: NodeJS.ProcessEnv,
  name:
    | "COURTOS_1120_SQLITE_PATH"
    | "HOUSEHOLD_1120_SQLITE_PATH",
): string | null {
  return environment[name]?.trim() || null;
}

export function productionCourtOs1120Sources(
  environment: NodeJS.ProcessEnv = process.env,
  rootDirectory = process.cwd(),
): CourtOs1120ReadModelSources {
  const repositorySources = repositoryCourtOs1120Sources(rootDirectory);
  return {
    courtOsSqlitePath:
      configuredPath(environment, "COURTOS_1120_SQLITE_PATH") ??
      repositorySources.courtOsSqlitePath,
    householdSqlitePath:
      configuredPath(environment, "HOUSEHOLD_1120_SQLITE_PATH") ??
      repositorySources.householdSqlitePath,
    foundationAStaticStoresManifestPath:
      repositorySources.foundationAStaticStoresManifestPath,
    foundationAEducationManifestPath:
      repositorySources.foundationAEducationManifestPath,
    foundationAHouseholdUat1ReleaseManifestPath:
      repositorySources.foundationAHouseholdUat1ReleaseManifestPath,
    foundationAHouseholdRuntimeReleaseManifestPath:
      repositorySources.foundationAHouseholdRuntimeReleaseManifestPath,
    foundationAUnifiedReleaseManifestPath:
      repositorySources.foundationAUnifiedReleaseManifestPath,
    foundationAHouseholdEconomicActivityManifestPath:
      repositorySources.foundationAHouseholdEconomicActivityManifestPath,
    foundationAResponsibilityAuthorityRootDirectory:
      repositorySources.foundationAResponsibilityAuthorityRootDirectory,
    spatialProjectionPath: repositorySources.spatialProjectionPath,
    spatialVisualExportPath: repositorySources.spatialVisualExportPath,
    spatialVisualExportPaths: repositorySources.spatialVisualExportPaths,
    manorFabricReleaseDirectory: repositorySources.manorFabricReleaseDirectory,
    manorFabricXmapManorsPath: repositorySources.manorFabricXmapManorsPath,
    responsibilityPackagesRootDirectory:
      repositorySources.responsibilityPackagesRootDirectory,
  };
}

export function productionCourtOs1120Service(): CourtOs1120ApiService {
  productionService ??= createCourtOs1120ReadModelService(
    productionCourtOs1120Sources(),
    { accessMode: "player_runtime" },
  );
  return productionService;
}
