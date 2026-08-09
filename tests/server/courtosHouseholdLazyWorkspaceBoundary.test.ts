import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("CourtOS Household lazy responsibility boundary", () => {
  it("does not open every domain package while loading the Household projection", () => {
    const source = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/server/courtos1120Api/readModelService.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain("ResponsibilityWorkspaceReadModel");
    expect(source).not.toContain("recordsForHouse(");
    expect(source).not.toContain("responsibility_workspace_records:");
    expect(source).toContain("async responsibilityWorkspace(input)");
  });
});
