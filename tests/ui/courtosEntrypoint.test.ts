import fs from "node:fs";

import { describe, expect, it } from "vitest";

describe("CourtOS production entrypoint", () => {
  it("builds the official standalone CourtOS runtime instead of the prototype app shell", () => {
    const htmlSource = fs.readFileSync("courtos-home.html", "utf8");
    const entrySource = fs.readFileSync("src/courtos-home.tsx", "utf8");
    const viteSource = fs.readFileSync("vite.config.ts", "utf8");

    expect(htmlSource).toContain('id="courtos-home-root"');
    expect(htmlSource).toContain('src="/src/courtos-home.tsx"');
    expect(entrySource).toContain('getElementById("courtos-home-root")');
    expect(entrySource).toContain("HouseholdVerticalSlice");
    expect(viteSource).toContain('process.env.COURTOS_ONLY_BUILD === "1"');
    expect(viteSource).toContain('courtosHome: resolve(process.cwd(), "courtos-home.html")');
    expect(htmlSource).not.toContain("src/App.tsx");
  });
});
