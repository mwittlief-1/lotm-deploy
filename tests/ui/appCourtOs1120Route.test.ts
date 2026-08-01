import fs from "node:fs";

import { describe, expect, it } from "vitest";

describe("App CourtOS 1120 route", () => {
  it("wires the CourtOS route through the app shell and route helper", () => {
    const appSource = fs.readFileSync("src/App.tsx", "utf8");
    const routeSource = fs.readFileSync("src/ui/worldMapRoute.ts", "utf8");
    const viteSource = fs.readFileSync("vite.config.ts", "utf8");
    const viteApiSource = fs.readFileSync(
      "src/server/courtos1120Api/vitePlugin.ts",
      "utf8",
    );
    const readServiceSource = fs.readFileSync(
      "src/server/courtos1120Api/readModelService.ts",
      "utf8",
    );
    const productionApiSource = fs.readFileSync(
      "api/courtos/1120.ts",
      "utf8",
    );

    expect(appSource).toContain('screen === "courtos"');
    expect(appSource).toContain("CourtOs1120Screen");
    expect(appSource).toContain("courtOs1120UatEnabled");
    expect(routeSource).toContain('| "courtos"');
    expect(routeSource).toContain("courtos_entity_id");
    expect(routeSource).toContain("courtos_entity_label");
    expect(routeSource).toContain('value === "courtos"');
    expect(routeSource).toContain('screen === "courtos"');
    expect(routeSource).toContain('return "#/courtos"');
    expect(viteSource).toContain("courtOs1120ReadModelApiPlugin");
    expect(viteApiSource).toContain("/api/courtos/1120");
    expect(readServiceSource).toContain("CourtOs1120ReadModel.open");
    expect(productionApiSource).toContain("createCourtOs1120FetchHandler");
    expect(appSource).not.toContain("buildPearwick" + "CourtOS");
    expect(appSource).not.toContain("review" + "_packets");
  });
});
