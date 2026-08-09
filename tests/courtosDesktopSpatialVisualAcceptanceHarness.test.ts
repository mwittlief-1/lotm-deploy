import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const runnerPath = path.resolve(process.cwd(), "scripts/runCourtosDesktopSpatialVisualAcceptance.mjs");
const runner = fs.readFileSync(runnerPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));

describe("CourtOS packaged spatial visual acceptance harness", () => {
  it("runs against the packaged Electron player instead of a browser preview", () => {
    expect(packageJson.scripts["uat:desktop:spatial"]).toBe("node scripts/runCourtosDesktopSpatialVisualAcceptance.mjs");
    expect(runner).toContain("electron.launch");
    expect(runner).toContain("merecross://app/courtos-home.html?place=domain&domain=estate_holdings");
    expect(runner).not.toContain("vite preview");
    expect(runner).not.toContain("http://127.0.0.1");
  });

  it("rejects the flat SVG/hex diagnostic and requires a live WebGL scene", () => {
    expect(runner).toContain(".uat-spatial-native-canvas");
    expect(runner).toContain("svg polygon");
    expect(runner).toContain('getContext("webgl2")');
    expect(runner).toContain("isContextLost");
    expect(runner).toContain("data-courtos-spatial-scene");
  });

  it("requires realm, county, and manor continuity with perspective and relief", () => {
    for (const level of ["realm", "county", "manor"]) {
      expect(runner).toContain(`assertThreeDimensionalScene(page, "${level}")`);
    }
    expect(runner).toContain("data-camera-projection");
    expect(runner).toContain("data-camera-perspective-deg");
    expect(runner).toContain("data-terrain-relief");
    expect(runner).toContain("perspective > 0");
    expect(runner).toContain("relief > 0");
  });

  it("requires the canonical Roadcote manor fabric to be visibly represented", () => {
    expect(runner).toContain("Roadcote Court");
    for (const marker of [
      "estate-core",
      "working-yard",
      "storage",
      "livestock-yard",
      "stables",
      "field-system",
      "commons",
      "pasture",
      "woodland",
      "fortification-works",
    ]) {
      expect(runner).toContain(`"${marker}"`);
    }
  });

  it("distinguishes Roadcote's whole admitted estate from export context", () => {
    expect(runner).toContain("data-estate-parent-count");
    expect(runner).toContain("estateParentCount === 9");
    expect(runner).toContain("not a single 217-cell seat island");
    expect(runner).toContain("data-context-parent-count");
    expect(runner).toContain("contextParentCount === 23");
    expect(runner).toContain("data-total-export-cell-count");
    expect(runner).toContain("totalExportCellCount === 4_991");
  });
});
