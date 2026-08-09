import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const panelUrl = new URL("../../src/ui/panels/HouseholdVerticalSlice.tsx", import.meta.url);
const cssUrl = new URL("../../src/ui/panels/householdVerticalSlice.css", import.meta.url);

describe("CourtOS Steam-desktop accessibility contract", () => {
  it("moves focus and announces place changes and assignment outcomes", async () => {
    const source = await readFile(panelUrl, "utf8");
    expect(source).toContain('id="courtos-active-surface"');
    expect(source).toContain('document.getElementById("courtos-active-surface")?.focus({ preventScroll: true })');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('role="status"');
    expect(source).toContain('role={state === "error" ? "alert" : "status"}');
  }, 30_000);

  it("enforces a desktop functional-type floor and forced-colors treatment", async () => {
    const css = await readFile(cssUrl, "utf8");
    expect(css).toContain("Steam-desktop legibility floor");
    expect(css).toContain(".uat-app .uat-route button");
    expect(css).toContain(".uat-app .uat-authority-card button");
    expect(css).toContain(".uat-app .uat-source-records li > button");
    expect(css).toContain(".uat-app .uat-finance-assignment > nav button");
    expect(css).toContain("font-size: max(10px, 0.625rem) !important");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("outline: 3px solid Highlight");
  }, 30_000);
});
