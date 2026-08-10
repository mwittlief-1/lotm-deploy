import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { desktopCourtOs1120Sources } from "../../desktop/courtosDesktopService";

describe("CourtOS desktop Foundation A source binding", () => {
  it("binds one immutable unified release and external MapGen assets under the packaged resource root", () => {
    const packagedRoot = process.cwd();
    const sources = desktopCourtOs1120Sources(packagedRoot);

    expect(sources.foundationAUnifiedReleaseManifestPath).toBe(
      path.resolve(packagedRoot, ".courtos-generated/foundation-a/MANIFEST.json"),
    );
    expect(sources.foundationAHouseholdUat1ReleaseManifestPath).toBeNull();
    expect(sources.foundationAHouseholdEconomicActivityManifestPath).toBeNull();
    expect(sources.foundationAResponsibilityAuthorityRootDirectory).toBeNull();
    expect(sources.spatialVisualExportPaths).toEqual({
      manor_hx_38958: path.resolve(packagedRoot, "data/map/mapgen_exports/pearwick_microhex_pilot_v1.json"),
      manor_hx_44835: path.resolve(packagedRoot, "data/map/mapgen_exports/roadcote_microhex_pilot_v1.json"),
    });
    expect(sources.manorFabricReleaseDirectory).toBeNull();
    expect(sources.manorFabricXmapManorsPath).toBeNull();
  });

  it("stages and packages every data-selected room surface and the manifest-driven visual export catalog", () => {
    const staging = fs.readFileSync(
      path.resolve(process.cwd(), "desktop/stagePackageWorkspace.mjs"),
      "utf8",
    );
    const builderConfig = fs.readFileSync(
      path.resolve(process.cwd(), "desktop/electron-builder.config.mjs"),
      "utf8",
    );
    const rootPackage = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    for (const required of [
      "atlas-table.png",
      "council-table.png",
      "family-tree.png",
      "orders-board.png",
      "data/map/mapgen_exports",
      ".courtos-generated/foundation-a",
      "merecross_foundation_a_v1.sqlite",
      "mapgen-manor-v2",
      "mapgen-landscape",
    ]) {
      expect(staging).toContain(required);
    }
    for (const visualExport of [
      "data/map/mapgen_exports",
      ".courtos-generated/foundation-a",
    ]) {
      expect(builderConfig).toContain(visualExport);
    }
    for (const excludedRawRoot of ["data/uat", "data/genrun", "data/ready", "xmap_alpha_v1"]) {
      expect(builderConfig).not.toContain(excludedRawRoot);
    }
    expect(staging).not.toContain("pearwick_microhex_pilot_v1.json");
    expect(staging).not.toContain("roadcote_microhex_pilot_v1.json");
    expect(staging).toContain(
      "await rm(foundationDestinationRoot, { recursive: true, force: true })",
    );
    expect(builderConfig).not.toContain("pearwick_microhex_pilot_v1.json");
    expect(builderConfig).not.toContain("roadcote_microhex_pilot_v1.json");
    expect(rootPackage.scripts["courtos:desktop:uat-package"]).toContain(
      "COURTOS_UAT_WORKSPACE_BUILD=1 node scripts/prepareCourtosPublic.mjs",
    );
    expect(rootPackage.scripts["courtos:desktop:uat-package"]).toContain(
      "node scripts/verifyCourtosRoomAssets.mjs --root .courtos-public",
    );
    expect(rootPackage.scripts["courtos:desktop:uat-package"]).toContain(
      "CSC_IDENTITY_AUTO_DISCOVERY=false",
    );
    expect(rootPackage.scripts["courtos:desktop:uat-package"]).toContain(
      "node scripts/verifyCourtosDesktopUatPackage.mjs",
    );
  });
});
