import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("CourtOS packaged deployment adapter", () => {
  it("ships all three Web-standard Vercel function entrypoints", () => {
    for (const route of [
      "api/courtos/1120.ts",
      "api/household/1120.ts",
      "api/council-room/1120.ts",
    ]) {
      const path = resolve(root, route);
      expect(existsSync(path)).toBe(true);
      const source = readFileSync(path, "utf8");
      expect(source).toContain("createCourtOs1120FetchHandler");
      expect(source).toContain("export default { fetch }");
    }
  });

  it("keeps Vite as a transport adapter rather than the endpoint implementation", () => {
    const vite = readFileSync(resolve(root, "vite.config.ts"), "utf8");
    expect(vite).toContain("courtOs1120ReadModelApiPlugin");
    expect(vite).not.toContain('middlewares.use("/api/courtos/1120"');
    expect(vite).not.toContain('middlewares.use("/api/household/1120"');
    expect(vite).not.toContain('middlewares.use("/api/council-room/1120"');
  });

  it("declares Vercel project configuration without swallowing filesystem functions", () => {
    const config = JSON.parse(
      readFileSync(resolve(root, "vercel.json"), "utf8"),
    ) as {
      $schema?: string;
      rewrites?: Array<{ source: string; destination: string }>;
    };
    expect(config.$schema).toBe("https://openapi.vercel.sh/vercel.json");
    expect(config.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
  });
});
