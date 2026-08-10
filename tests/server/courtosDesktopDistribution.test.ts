import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  loadDistributionConfig,
  renderSteamAppVdf,
  renderSteamDepotVdf,
  validateDistributionConfig,
} from "../../scripts/lib/courtosDesktopDistribution.mjs";

const root = path.resolve(import.meta.dirname, "../..");

describe("CourtOS desktop distribution", () => {
  it("locks the Merecross Steam and platform identities without inventing Windows readiness", async () => {
    const { config } = await loadDistributionConfig(root);
    expect(config.product).toMatchObject({
      name: "Merecross",
      bundle_id: "com.vytis.merecross",
      steam_app_id: 5084580,
      install_folder: "Merecross",
    });
    expect(config.platforms["macos-arm64"].steam).toMatchObject({
      depot_id: 5084581,
      operating_system: "macOS",
    });
    expect(config.platforms["macos-arm64"].executable_relative_path).toBe("Merecross.app");
    expect(config.platforms["windows-x64"].steam.depot_id).toBeNull();
    expect(config.platforms["windows-x64"].blocking_dependencies).toEqual([
      "pinned_windows_x64_llama_runtime_manifest",
      "windows_x64_native_module_build",
      "steam_windows_depot_id",
    ]);
  });

  it("fails closed on stale or mixed Steam identities", async () => {
    const { config } = await loadDistributionConfig(root);
    expect(() => validateDistributionConfig({
      ...config,
      product: { ...config.product, steam_app_id: 5084581 },
    })).toThrow("Steam App ID must be 5084580");
    expect(() => validateDistributionConfig({
      ...config,
      platforms: {
        ...config.platforms,
        "macos-arm64": {
          ...config.platforms["macos-arm64"],
          steam: { ...config.platforms["macos-arm64"].steam, depot_id: 5084580 },
        },
      },
    })).toThrow("macOS Steam depot must be 5084581");
  });

  it("generates reviewable SteamPipe VDF without credentials or automatic branch promotion", () => {
    const depot = renderSteamDepotVdf({
      depotId: 5084581,
      contentRoot: "/tmp/Merecross Steam Content",
    });
    const app = renderSteamAppVdf({
      appId: 5084580,
      description: "Merecross macOS internal",
      buildOutput: "/tmp/Merecross Steam Output",
      depotId: 5084581,
      depotVdfPath: "/tmp/depot_build_5084581.vdf",
      preview: true,
    });
    expect(depot).toContain('"DepotID" "5084581"');
    expect(depot).toContain("Merecross Steam Content");
    expect(app).toContain('"AppID" "5084580"');
    expect(app).toContain('"Preview" "1"');
    expect(app).not.toMatch(/SetLive|password|token|credential/i);
  });

  it("keeps local ad-hoc signing separate from external Developer ID packaging", () => {
    const afterPack = fs.readFileSync(path.join(root, "desktop/afterPack.mjs"), "utf8");
    const builder = fs.readFileSync(path.join(root, "desktop/electron-builder.config.mjs"), "utf8");
    expect(afterPack).toContain('distributionMode !== "local_uat"');
    expect(afterPack).toContain('"--sign",\n    "-"');
    expect(builder).toContain("hardenedRuntime: externalDistribution");
    expect(builder).toContain("identity: externalDistribution ? undefined : null");
    expect(builder).toContain("notarize: externalDistribution");
    expect(builder).toContain("entitlements.mac.plist");
    expect(builder).toContain("External CourtOS packaging requires the branded macOS icon");
    const staging = fs.readFileSync(path.join(root, "desktop/stagePackageWorkspace.mjs"), "utf8");
    expect(staging).toContain('resolve(desktopRoot, "build/icon.icns")');
    expect(staging).toContain('resolve(stageRoot, "build/icon.icns")');
    const preflight = fs.readFileSync(
      path.join(root, "scripts/preflightCourtosDesktopExternalBuild.mjs"),
      "utf8",
    );
    expect(preflight).toContain("portraitBankExpected");
    expect(preflight).toContain("portrait_bank_missing_assets");
  });

  it("honors isolated staging roots instead of silently packaging a stale default workspace", () => {
    const desktopPackage = JSON.parse(fs.readFileSync(path.join(root, "desktop/package.json"), "utf8"));
    const runner = fs.readFileSync(path.join(root, "desktop/runStagedPackage.mjs"), "utf8");
    expect(desktopPackage.scripts["package:dir"]).toContain("runStagedPackage.mjs dir");
    expect(desktopPackage.scripts["package:dir"]).not.toContain("/private/tmp/merecross-courtos-desktop-staging");
    expect(runner).toContain("COURTOS_DESKTOP_STAGING_ROOT");
    expect(runner).toContain("cwd: stageRoot");
  });

  it("keeps local-UAT and clean production postures explicit at the package boundary", () => {
    const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const verifier = fs.readFileSync(path.join(root, "scripts/verifyCourtosDesktopUatPackage.mjs"), "utf8");
    expect(rootPackage.scripts["courtos:desktop:uat-package"]).toBe(
      rootPackage.scripts["courtos:desktop:package:local:mac"],
    );
    expect(rootPackage.scripts["courtos:desktop:package:local:mac"]).toContain(
      "--expected-posture human_uat_workspace_candidate_not_promotable",
    );
    expect(rootPackage.scripts["courtos:desktop:package:external:mac"]).toContain(
      "--expected-posture clean_checkout_production_candidate",
    );
    expect(verifier).toContain('"human_uat_workspace_candidate_not_promotable"');
    expect(verifier).toContain('"clean_checkout_production_candidate"');
  });

  it("never removes a caller-supplied Steam smoke-test library", () => {
    const smoke = fs.readFileSync(path.join(root, "scripts/runCourtosDesktopInstallSmoke.mjs"), "utf8");
    expect(smoke).toContain("if (!keep && cleanupRoot)");
    expect(smoke).toContain("} finally {");
    expect(smoke).toContain('stdio: "inherit"');
    expect(smoke).not.toContain("dirname(dirname(dirname(steamLibrary)))");
  });

  it("keeps one native writer for player planning state across repeated Steam launches", () => {
    const main = fs.readFileSync(path.join(root, "desktop/main.ts"), "utf8");
    expect(main).toContain("app.requestSingleInstanceLock()");
    expect(main).toContain('app.on("second-instance", focusPrimaryWindow)');
    expect(main).toContain('process.env.COURTOS_DESKTOP_UAT_AUTOMATION === "1"');
    expect(main).toContain("desktopUatAutomation || app.requestSingleInstanceLock()");
    expect(main).toContain('join(app.getPath("userData"), "merecross-player-v1.sqlite")');
  });

  it("loads the shared authority projection for every responsibility drill-down", () => {
    const surface = fs.readFileSync(
      path.join(root, "src/ui/panels/HouseholdVerticalSlice.tsx"),
      "utf8",
    );
    expect(surface).toContain(
      'householdRoute || scene === "house_command" || responsibilityPlace !== null',
    );
  });

  it("ships every deterministic fallback portrait referenced by the resolver", () => {
    const bankRoot = path.join(root, "public/assets/portrait-bank/proof");
    const manifest = JSON.parse(
      fs.readFileSync(path.join(bankRoot, "portrait_bank_manifest_v1.json"), "utf8"),
    ) as { assets: Array<{ path: string }> };
    expect(manifest.assets).toHaveLength(24);
    for (const asset of manifest.assets) {
      expect(fs.existsSync(path.join(root, "public", asset.path))).toBe(true);
    }
  });
});
