import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("CourtOS room asset packaging guard", () => {
  it("verifies the complete authored room closure in the source public root", () => {
    const output = execFileSync(process.execPath, [
      "scripts/verifyCourtosRoomAssets.mjs",
      "--root",
      "public",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(output).toContain("Verified 32 CourtOS room assets");
  });
});
