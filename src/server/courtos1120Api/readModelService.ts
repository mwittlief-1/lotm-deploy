import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

import { CourtOs1120ReadModel } from "../../ui/readModels/courtos1120/service";
import type { CourtOs1120ReadModelSessionContract } from "../../ui/readModels/courtos1120/types";
import { Household1120ReadModel } from "../../ui/readModels/household1120/service";
import type { Household1120ReadModelSessionContract } from "../../ui/readModels/household1120/types";
import { FoundationAStaticStoresProjection } from "../../ui/readModels/householdFoundationA/staticStoresProjection";
import { FoundationAEducationProjection } from "../../ui/readModels/householdFoundationA/educationProjection";
import { FoundationAHouseholdUat1ReleaseProjection } from "../../ui/readModels/householdFoundationA/uat1ReleaseProjection";
import { FoundationAHouseholdEconomicActivityProjection } from "../../ui/readModels/householdFoundationA/economicActivityProjection";
import { FoundationAHouseholdRuntimeReleaseProjection } from "../../ui/readModels/householdFoundationA/runtimeReleaseProjection";
import { FoundationAResponsibilityAuthorityUat1Projection } from "../../ui/readModels/householdFoundationA/responsibilityAuthorityUat1Projection";
import { FoundationAAlternateStewardEligibilityUat1Projection } from "../../ui/readModels/householdFoundationA/alternateStewardEligibilityUat1Projection";
import { FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_SQLITE_SHA256 } from "../../ui/readModels/householdFoundationA/alternateStewardEligibilityContract";
import { COURTOS_1120_SQLITE_SHA256 } from "../../ui/readModels/courtos1120/types";
import type { CourtOs1120ApiService } from "./contracts";
import type { CourtOsActingActorV1 } from "../../courtosSessionContext";
import {
  assertCourtOsHouseAccess,
  type CourtOsAccessMode,
} from "./accessPolicy";
import type {
  CourtOsSpatialHouseProjectionV1,
  CourtOsSpatialPortfolio,
} from "../../ui/spatial/courtosSpatialContract";
import {
  buildCourtOsSpatialVisualProof,
  type CourtOsSpatialVisualProofV1,
} from "./spatialVisualProof";
import { FoundationAResponsibilityWorkspaceProjection } from "./responsibilityWorkspaceProjection";
import {
  COURTOS_FOUNDATION_A_RELEASE_REPOSITORY_MANIFEST_PATH,
  CourtOsFoundationAUnifiedRelease,
} from "../courtosFoundationA/unifiedRelease";

export const COURTOS_1120_SQLITE_REPOSITORY_PATH =
  "data/uat/courtos_read_only_uat_contract_v1/generations/d338fca408a5bfb6bfe65c66a2dc18c0adbad0934d7879f4835806f6492ef2b9/courtos_read_only_uat_contract_1120_01_01_v1.sqlite";
export const HOUSEHOLD_1120_SQLITE_REPOSITORY_PATH =
  "data/uat/household_wave2_read_contract_v1/generations/9e58577246a3a381395f5a03b520d9790e94ab2d12287999c9bae362466014c0/household_wave2_read_contract_1120_01_01_v1.sqlite";
export const FOUNDATION_A_STATIC_STORES_MANIFEST_REPOSITORY_PATH =
  "data/uat/foundation_a_static_1120_uat_stores_projection_v1/MANIFEST.json";
export const FOUNDATION_A_EDUCATION_MANIFEST_REPOSITORY_PATH =
  "data/uat/foundation_a_education_projection_v1/MANIFEST.json";
export const FOUNDATION_A_HOUSEHOLD_UAT1_RELEASE_MANIFEST_REPOSITORY_PATH =
  "data/genrun/foundation_a_household_uat1_release_v1/MANIFEST.json";
export const FOUNDATION_A_HOUSEHOLD_RUNTIME_RELEASE_MANIFEST_REPOSITORY_PATH =
  "data/genrun/foundation_a_household_runtime_release_v1/MANIFEST.json";
export const FOUNDATION_A_HOUSEHOLD_ECONOMIC_ACTIVITY_MANIFEST_REPOSITORY_PATH =
  "data/uat/foundation_a_household_economic_activity_projection_v1/MANIFEST.json";
export const COURTOS_SPATIAL_REPOSITORY_PATH =
  ".courtos-generated/courtos_spatial_read_model_v1.json";
export const COURTOS_SPATIAL_VISUAL_EXPORT_PATH =
  "data/map/mapgen_exports/pearwick_microhex_pilot_v1.json";
export const COURTOS_ROADCOTE_SPATIAL_VISUAL_EXPORT_PATH =
  "data/map/mapgen_exports/roadcote_microhex_pilot_v1.json";
export const COURTOS_SPATIAL_VISUAL_EXPORT_MANIFEST_PATH =
  "data/map/mapgen_exports/courtos_mapgen_export_manifest_v1.json";
export const COURTOS_MANOR_FABRIC_RELEASE_DIRECTORY =
  "data/genrun/phase_five_manor_operations_uat1_admission_v1";
export const COURTOS_MANOR_FABRIC_XMAP_MANORS_PATH =
  "data/map/xmap_alpha_v1/manor_units_v1.json";
export const COURTOS_RESPONSIBILITY_PACKAGES_REPOSITORY_PATH = "data/genrun";

function spatialVisualExportPathsFromManifest(rootDirectory: string): Readonly<Record<string, string>> {
  const manifestPath = resolve(rootDirectory, COURTOS_SPATIAL_VISUAL_EXPORT_MANIFEST_PATH);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    schema_version?: string;
    exports?: Array<{ path?: string; target_manor_id?: string; sha256?: string }>;
  };
  if (manifest.schema_version !== "courtos_mapgen_export_manifest_v1" || !Array.isArray(manifest.exports)) {
    throw new Error("CourtOS spatial export manifest failed its contract.");
  }
  const paths: Record<string, string> = {};
  for (const entry of manifest.exports) {
    if (!entry.path || !entry.target_manor_id || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? "")) {
      throw new Error("CourtOS spatial export manifest has an incomplete manor binding.");
    }
    if (paths[entry.target_manor_id]) {
      throw new Error(`CourtOS spatial export manifest duplicates ${entry.target_manor_id}.`);
    }
    const exportPath = resolve(rootDirectory, entry.path);
    const actual = createHash("sha256").update(readFileSync(exportPath)).digest("hex");
    if (actual !== entry.sha256) {
      throw new Error(`CourtOS spatial export ${entry.target_manor_id} failed its checksum.`);
    }
    paths[entry.target_manor_id] = exportPath;
  }
  return Object.freeze(paths);
}

export interface CourtOs1120ReadModelSources {
  courtOsSqlitePath: string | null;
  householdSqlitePath: string | null;
  foundationAStaticStoresManifestPath?: string | null;
  foundationAEducationManifestPath?: string | null;
  foundationAHouseholdUat1ReleaseManifestPath?: string | null;
  foundationAHouseholdRuntimeReleaseManifestPath?: string | null;
  foundationAUnifiedReleaseManifestPath?: string | null;
  foundationAHouseholdEconomicActivityManifestPath?: string | null;
  foundationAResponsibilityAuthorityRootDirectory?: string | null;
  foundationAAlternateStewardEligibilityRootDirectory?: string | null;
  spatialProjectionPath: string | null;
  spatialVisualExportPath: string | null;
  spatialVisualExportPaths?: Readonly<Record<string, string>>;
  manorFabricReleaseDirectory?: string | null;
  manorFabricXmapManorsPath?: string | null;
  responsibilityPackagesRootDirectory?: string | null;
}

function requiredSourcePath(
  value: string | null,
  name:
    | "COURTOS_1120_SQLITE_PATH"
    | "HOUSEHOLD_1120_SQLITE_PATH"
    | "COURTOS_SPATIAL_PROJECTION_PATH"
    | "COURTOS_SPATIAL_VISUAL_EXPORT_PATH",
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
    // Production consumes one compiled immutable release. The individual
    // package paths below are compiler inputs, never runtime fallbacks.
    courtOsSqlitePath: null,
    householdSqlitePath: null,
    foundationAStaticStoresManifestPath: null,
    foundationAEducationManifestPath: null,
    foundationAHouseholdUat1ReleaseManifestPath: null,
    foundationAHouseholdRuntimeReleaseManifestPath: null,
    foundationAUnifiedReleaseManifestPath: resolve(
      rootDirectory,
      COURTOS_FOUNDATION_A_RELEASE_REPOSITORY_MANIFEST_PATH,
    ),
    foundationAHouseholdEconomicActivityManifestPath: null,
    foundationAResponsibilityAuthorityRootDirectory: null,
    foundationAAlternateStewardEligibilityRootDirectory: null,
    spatialProjectionPath: null,
    spatialVisualExportPath: resolve(rootDirectory, COURTOS_SPATIAL_VISUAL_EXPORT_PATH),
    spatialVisualExportPaths: spatialVisualExportPathsFromManifest(rootDirectory),
    manorFabricReleaseDirectory: null,
    manorFabricXmapManorsPath: null,
    responsibilityPackagesRootDirectory: null,
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
      is_principal_seat: manor.is_principal_seat,
      detailed_coverage: {
        coverage_state: manor.detailed_coverage.coverage_state,
        renderer_level: manor.detailed_coverage.renderer_level,
        available_levels: [...manor.detailed_coverage.available_levels],
        ...(manor.detailed_coverage.authored_acre_count === undefined
          ? {}
          : { authored_acre_count: manor.detailed_coverage.authored_acre_count }),
        renderers: { ...manor.detailed_coverage.renderers },
      },
      // This is a renderer-owned, explicitly interpretive derivation. Keep it
      // intact at the API boundary so the client can distinguish available
      // visual detail from operational or historical facts. The projection
      // contract rejects anything presented as source truth.
      ...(manor.visual_derivation === undefined
        ? {}
        : {
          visual_derivation: {
            disposition: manor.visual_derivation.disposition,
            source_status: manor.visual_derivation.source_status,
            parent_xmap_hex_count: manor.visual_derivation.parent_xmap_hex_count,
            parcel_cluster_count: manor.visual_derivation.parcel_cluster_count,
            acre_cell_count: manor.visual_derivation.acre_cell_count,
            acre_cells_per_parent: manor.visual_derivation.acre_cells_per_parent,
            available_lods: [...manor.visual_derivation.available_lods],
            feature_families: [...manor.visual_derivation.feature_families],
            source_sha256: manor.visual_derivation.source_sha256,
          },
        }),
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
  let foundationAStaticStoresPromise:
    | Promise<FoundationAStaticStoresProjection>
    | undefined;
  let foundationAEducationPromise:
    | Promise<FoundationAEducationProjection>
    | undefined;
  let foundationAHouseholdUat1ReleasePromise:
    | Promise<FoundationAHouseholdUat1ReleaseProjection>
    | undefined;
  let foundationAHouseholdRuntimeReleasePromise:
    | Promise<FoundationAHouseholdRuntimeReleaseProjection>
    | undefined;
  let foundationAHouseholdEconomicActivityPromise:
    | Promise<FoundationAHouseholdEconomicActivityProjection>
    | undefined;
  let foundationAResponsibilityAuthorityUat1Promise:
    | Promise<FoundationAResponsibilityAuthorityUat1Projection>
    | undefined;
  let foundationAAlternateStewardEligibilityUat1Promise:
    | Promise<FoundationAAlternateStewardEligibilityUat1Projection | null>
    | undefined;
  let foundationAUnifiedReleasePromise:
    | Promise<CourtOsFoundationAUnifiedRelease>
    | undefined;
  let spatialProjectionPromise:
    | Promise<CourtOsSpatialRealmProjectionV1>
    | undefined;
  let responsibilityPackageProjection:
    | FoundationAResponsibilityWorkspaceProjection
    | undefined;
  let responsibilityPackageProjectionPromise:
    | Promise<FoundationAResponsibilityWorkspaceProjection>
    | undefined;
  function unifiedRelease(): Promise<CourtOsFoundationAUnifiedRelease> | null {
    const manifestPath = sources.foundationAUnifiedReleaseManifestPath;
    if (!manifestPath) return null;
    foundationAUnifiedReleasePromise ??=
      CourtOsFoundationAUnifiedRelease.open(manifestPath);
    return foundationAUnifiedReleasePromise;
  }
  async function responsibilityProjection(): Promise<FoundationAResponsibilityWorkspaceProjection> {
    if (responsibilityPackageProjection) return responsibilityPackageProjection;
    const releasePromise = unifiedRelease();
    if (releasePromise) {
      responsibilityPackageProjectionPromise ??= (async () => {
        const release = await releasePromise;
        return FoundationAResponsibilityWorkspaceProjection.fromUnifiedRelease(
          release.databasePath,
          await release.responsibilityBindings(),
        );
      })();
      responsibilityPackageProjection = await responsibilityPackageProjectionPromise;
      return responsibilityPackageProjection;
    }
    const sourceRoot = sources.responsibilityPackagesRootDirectory;
    if (!sourceRoot) {
      throw new Error("The admitted responsibility package binding is unavailable.");
    }
    responsibilityPackageProjection ??=
      new FoundationAResponsibilityWorkspaceProjection(sourceRoot);
    return responsibilityPackageProjection;
  }
  async function spatialPortfolioForHouse(
    houseId: string,
  ): Promise<CourtOsSpatialPortfolio | null> {
    const releasePromise = unifiedRelease();
    if (releasePromise) return (await releasePromise).spatialPortfolio(houseId);
    spatialProjectionPromise ??= readSpatialProjection(
      requiredSourcePath(
        sources.spatialProjectionPath,
        "COURTOS_SPATIAL_PROJECTION_PATH",
      ),
    );
    const projection = await spatialProjectionPromise;
    return projection.portfolios.find((item) => item.house_id === houseId) ?? null;
  }
  async function sourceResolvedActingActor(houseId: string): Promise<CourtOsActingActorV1> {
    if (accessMode !== "player_runtime") {
      return { status: "unadmitted", person_id: null, authority_basis: null };
    }
    const succession = await (await responsibilityProjection()).openingSuccessionIdentity(houseId);
    if (!succession) {
      throw new Error("The selected House has no admitted opening succession identity.");
    }
    const text = (value: unknown): string => String(value ?? "").trim();
    if (
      text(succession.authority_status) !== "accepted_compatibility_proof_pending_next_full_sidecar_refresh" ||
      text(succession.source_truth_layer) !== "succession_sidecar"
    ) {
      throw new Error("The opening succession identity failed its admitted source boundary.");
    }
    if (text(succession.regency_required).toLowerCase() === "true") {
      return { status: "unadmitted", person_id: null, authority_basis: null };
    }
    const personId = text(succession.source_truth_head_person_id);
    if (!personId || !/^adult_.+_head$/.test(text(succession.source_truth_head_status))) {
      throw new Error("The selected House has no source-resolved adult Head for UAT-1 planning.");
    }
    return {
      status: "house_head",
      person_id: personId,
      authority_basis: "foundation_a_uat1_succession_head_identity_plus_player_session",
    };
  }
  const service: CourtOs1120ApiService = {
    async sessionContext(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      return assertCourtOsHouseAccess(
        accessMode,
        input.houseId,
        await sourceResolvedActingActor(input.houseId),
      );
    },

    async courtOs(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      const releasePromise = unifiedRelease();
      if (releasePromise) {
        const release = await releasePromise;
        await release.assertSource({
          sourceId: "courtos_opening",
          packageId: "january_1120_courtos_read_only_uat_contract_v1",
          sqliteSha256: COURTOS_1120_SQLITE_SHA256,
        });
        courtOsSessionPromise ??= CourtOs1120ReadModel.openVerifiedEmbeddedCopy(
          release.databasePath,
        );
      } else {
        courtOsSessionPromise ??= CourtOs1120ReadModel.open(
          requiredSourcePath(
            sources.courtOsSqlitePath,
            "COURTOS_1120_SQLITE_PATH",
          ),
        );
      }
      const session = await courtOsSessionPromise;
      return session.projection(input);
    },

    async household(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      const courtOsProjection = (await service.courtOs({
        houseId: input.houseId,
      })) as Awaited<ReturnType<CourtOs1120ReadModel["projection"]>>;
      if (
        courtOsProjection.selected_entity.entity_id !== input.householdEntityId
      ) {
        throw new Error("Household selector does not belong to the selected House.");
      }
      const unifiedReleasePromise = unifiedRelease();
      if (unifiedReleasePromise) {
        const release = await unifiedReleasePromise;
        const householdSource = await release.source("household");
        const householdManifest = JSON.parse(householdSource.manifest_json) as {
          package_id?: string;
          artifact?: { sha256?: string };
        };
        if (
          householdManifest.package_id !== "foundation_a_household_runtime_release_v1" ||
          householdManifest.artifact?.sha256 !== householdSource.sqlite_sha256
        ) {
          throw new Error("The embedded Household source is stale or mixed.");
        }
        foundationAHouseholdRuntimeReleasePromise ??=
          FoundationAHouseholdRuntimeReleaseProjection.openVerifiedEmbeddedManifest(
            householdSource.manifest_json,
            release.databasePath,
          );
        const household = await (
          await foundationAHouseholdRuntimeReleasePromise
        ).projection(input);
        const eligibilitySource = await release.assertSource({
          sourceId: "steward_eligibility",
          packageId: "phase_five_courtos_alternate_steward_eligibility_admission_v1",
          sqliteSha256:
            FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_SQLITE_SHA256,
        });
        const eligibilityProjectionPromise =
          foundationAAlternateStewardEligibilityUat1Promise ??=
          FoundationAAlternateStewardEligibilityUat1Projection.openVerifiedEmbeddedManifest(
            eligibilitySource.manifest_json,
            release.databasePath,
          );
        const eligibilityProjection = await eligibilityProjectionPromise;
        if (!eligibilityProjection) {
          throw new Error("The embedded alternate-steward projection is unavailable.");
        }
        const assignmentCandidates = await eligibilityProjection.candidatesForHouse(
          input.houseId,
        );
        return {
          ...household,
          responsibility_assignment_candidates: assignmentCandidates,
          responsibility_assignment_candidate_generation_id:
            assignmentCandidates[0]?.generation_id ?? null,
        };
      }
      const runtimeReleaseManifestPath =
        sources.foundationAHouseholdRuntimeReleaseManifestPath;
      if (runtimeReleaseManifestPath) {
        foundationAHouseholdRuntimeReleasePromise ??=
          FoundationAHouseholdRuntimeReleaseProjection.open(
            runtimeReleaseManifestPath,
          );
        const household = await (
          await foundationAHouseholdRuntimeReleasePromise
        ).projection(input);
        foundationAAlternateStewardEligibilityUat1Promise ??=
          FoundationAAlternateStewardEligibilityUat1Projection.open(
            sources.foundationAAlternateStewardEligibilityRootDirectory ??
              process.cwd(),
          ).catch(() => null);
        const alternateStewardEligibility =
          await foundationAAlternateStewardEligibilityUat1Promise;
        const assignmentCandidates = alternateStewardEligibility
          ? await alternateStewardEligibility.candidatesForHouse(input.houseId)
          : [];
        return {
          ...household,
          responsibility_assignment_candidates: assignmentCandidates,
          responsibility_assignment_candidate_generation_id:
            assignmentCandidates[0]?.generation_id ?? null,
        };
      }
      const uat1ReleaseManifestPath =
        sources.foundationAHouseholdUat1ReleaseManifestPath;
      if (uat1ReleaseManifestPath) {
        foundationAHouseholdUat1ReleasePromise ??=
          FoundationAHouseholdUat1ReleaseProjection.open(
            uat1ReleaseManifestPath,
          );
        const household = await (await foundationAHouseholdUat1ReleasePromise).projection(input);
        foundationAResponsibilityAuthorityUat1Promise ??=
          FoundationAResponsibilityAuthorityUat1Projection.open(
            sources.foundationAResponsibilityAuthorityRootDirectory ?? process.cwd(),
          );
        const responsibilitySummary = await (
          await foundationAResponsibilityAuthorityUat1Promise
        ).responsibilitiesForHouse(input.houseId, input.householdEntityId);
        foundationAAlternateStewardEligibilityUat1Promise ??=
          FoundationAAlternateStewardEligibilityUat1Projection.open(
            sources.foundationAAlternateStewardEligibilityRootDirectory ?? process.cwd(),
          ).catch(() => null);
        const alternateStewardEligibility =
          await foundationAAlternateStewardEligibilityUat1Promise;
        const assignmentCandidates = alternateStewardEligibility
          ? await alternateStewardEligibility.candidatesForHouse(input.houseId)
          : [];
        const economicActivityManifestPath =
          sources.foundationAHouseholdEconomicActivityManifestPath;
        const economicActivity = economicActivityManifestPath
          ? await (async () => {
              foundationAHouseholdEconomicActivityPromise ??=
                FoundationAHouseholdEconomicActivityProjection.open(
                  economicActivityManifestPath,
                );
              const reader = await foundationAHouseholdEconomicActivityPromise;
              const rows = await reader.activityForHouse(input.houseId);
              return { rows, provenance: reader.provenance(rows.length) };
            })()
          : null;
        return {
          ...household,
          responsibility_summary: responsibilitySummary,
          responsibility_assignment_candidates: assignmentCandidates,
          responsibility_assignment_candidate_generation_id:
            assignmentCandidates[0]?.generation_id ?? null,
          economic_activity_lookback: economicActivity?.rows ?? [],
          provenance: economicActivity
            ? [...household.provenance, economicActivity.provenance]
            : household.provenance,
        };
      }
      householdSessionPromise ??= Household1120ReadModel.open(
        requiredSourcePath(
          sources.householdSqlitePath,
          "HOUSEHOLD_1120_SQLITE_PATH",
        ),
      );
      const projection = await (await householdSessionPromise).projection(input);
      let storesPositions = projection.stores_positions;
      let educationPlans = projection.education_plans;
      let educationCycleReports = projection.education_cycle_reports;
      let provenance = [...projection.provenance];
      const staticStoresManifestPath = sources.foundationAStaticStoresManifestPath;
      if (staticStoresManifestPath) {
        foundationAStaticStoresPromise ??= FoundationAStaticStoresProjection.open(
          staticStoresManifestPath,
        );
        const staticStores = await foundationAStaticStoresPromise;
        storesPositions = await staticStores.positions(input);
        provenance = [
          ...provenance.filter(
            (row) => row.record_key !== "ro_household_stores_position_v1",
          ),
          staticStores.provenance(storesPositions.length),
        ];
      }
      const educationManifestPath = sources.foundationAEducationManifestPath;
      if (educationManifestPath) {
        foundationAEducationPromise ??= FoundationAEducationProjection.open(
          educationManifestPath,
        );
        const education = await foundationAEducationPromise;
        educationPlans = await education.plans(input.houseId);
        educationCycleReports = await education.priorProgress(input.houseId);
        provenance = [
          ...provenance.filter(
            (row) =>
              row.record_key !== "ro_education_learner_plan_v1" &&
              row.record_key !== "ro_education_cycle_report_v1",
          ),
          ...education.provenance(educationPlans.length, educationCycleReports.length),
        ];
      }
      return {
        ...projection,
        stores_positions: storesPositions,
        education_plans: educationPlans,
        education_cycle_reports: educationCycleReports,
        provenance,
      };
    },

    async councilRoom(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      const releasePromise = unifiedRelease();
      if (releasePromise) return (await releasePromise).councilRoom(input.houseId);
      // The legacy ready projection parses a realm-scale JSON index at module
      // evaluation time. Keep it off the Household and responsibility launch
      // path until the projection is compiled into the Foundation A SQLite
      // release below.
      const { buildCouncilRoomReadyProjection } = await import(
        "../../ready/councilRoomReadyProjection"
      );
      return buildCouncilRoomReadyProjection({
        houseId: input.houseId,
        turnYear: 1120,
      });
    },

    async responsibilityWorkspace(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      return (await responsibilityProjection()).projection(input);
    },

    async spatial(input): Promise<CourtOsSpatialHouseProjectionV1> {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      const portfolio = await spatialPortfolioForHouse(input.houseId);
      if (portfolio && portfolio.association_posture !== "ui_admitted") {
        throw new Error("Spatial portfolio is not UI-admitted.");
      }
      return {
        schema_version: "courtos_spatial_house_projection_v1",
        effective_date: "1120-01-01",
        read_only: true,
        command_authority: false,
        query: { house_id: input.houseId },
        availability: portfolio ? "admitted" : "not_admitted",
        portfolio: portfolio ? houseSpatialDto(portfolio) : null,
      };
    },

    async spatialVisual(input) {
      assertCourtOsHouseAccess(accessMode, input.houseId);
      const portfolio = await spatialPortfolioForHouse(input.houseId);
      if (!portfolio || portfolio.association_posture !== "ui_admitted") {
        throw new Error("No UI-admitted House-to-manor association is available.");
      }
      const manor = portfolio.manors.find((item) => item.manor_id === input.manorId);
      const derivation = manor?.visual_derivation;
      if (!manor || !derivation) {
        throw new Error("No admitted visual ground derivation is available for this manor.");
      }
      const exportPath = sources.spatialVisualExportPaths?.[input.manorId] ?? null;
      if (!exportPath) {
        throw new Error("No manifest-bound visual export is available for the selected manor.");
      }
      const visual = await buildCourtOsSpatialVisualProof({
          exportPath,
          request: {
            houseId: input.houseId,
            manorId: input.manorId,
            lod: input.lod,
            parentHexId: input.parentHexId,
            expectedSourceSha256: derivation.source_sha256,
          },
        });
      // Manor fabric is invariant across renderer LOD chunks. Emit it on the
      // macro envelope once, then let the client retain it while composing
      // parent-bounded mid/fine geometry. Re-reading and re-hashing the full
      // admitted manor package for every one of Roadcote's 23 chunks made the
      // desktop descent needlessly slow without adding a truth check.
      if (input.lod !== "macro") return visual;
      const release = await unifiedRelease();
      if (!release) {
        throw new Error("The compiled Foundation A Manor Fabric release is unavailable.");
      }
      const manorFabric = await release.manorFabric({
        manorId: input.manorId,
        houseId: input.houseId,
      });
      return { ...visual, manor_fabric: manorFabric };
    },

    async spatialVisualComposition(input) {
      // County and Manor scenes always need the same immutable macro envelope
      // plus a bounded set of parent chunks. Serve that composition in one
      // request: it removes the visible 17/23-request waterfall without
      // weakening the per-parent source/hash checks in spatialVisual.
      const macro = await service.spatialVisual({
        houseId: input.houseId,
        manorId: input.manorId,
        lod: "macro",
      }) as CourtOsSpatialVisualProofV1 & { manor_fabric?: unknown };
      const parents = input.lod === "fine_cell"
        ? macro.macro.parents.filter((parent) => parent.same_manor_as_target)
        : macro.macro.parents;
      const chunks = await Promise.all(parents.map((parent) => service.spatialVisual({
        houseId: input.houseId,
        manorId: input.manorId,
        lod: input.lod,
        parentHexId: parent.hex_id,
      })));
      return {
        schema_version: "courtos_spatial_visual_composition_v1",
        source_sha256: macro.source_sha256,
        house_id: input.houseId,
        manor_id: input.manorId,
        lod: input.lod,
        macro,
        chunks,
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
        foundationAStaticStoresPromise
          ?.then((session) => session.close())
          .catch(() => undefined),
        foundationAEducationPromise
          ?.then((session) => session.close())
          .catch(() => undefined),
        foundationAHouseholdUat1ReleasePromise
          ?.then((session) => session.close())
          .catch(() => undefined),
        foundationAHouseholdRuntimeReleasePromise
          ?.then((session) => session.close())
          .catch(() => undefined),
        foundationAHouseholdEconomicActivityPromise
          ?.then((session) => session.close())
          .catch(() => undefined),
        foundationAResponsibilityAuthorityUat1Promise
          ?.then((session) => session.close())
          .catch(() => undefined),
        foundationAAlternateStewardEligibilityUat1Promise
          ?.then((session) => session?.close())
          .catch(() => undefined),
        responsibilityPackageProjection?.close().catch(() => undefined),
        foundationAUnifiedReleasePromise
          ?.then((release) => release.close())
          .catch(() => undefined),
      ]);
    },
  };
  return service;
}
