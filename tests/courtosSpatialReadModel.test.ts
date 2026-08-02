import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const projectionUrl = new URL(
  "../.courtos-generated/courtos_spatial_read_model_v1.json",
  import.meta.url,
);

describe("CourtOS spatial read model", () => {
  it("fails closed when the current manor source has no UI-admitted associations", async () => {
    const projection = JSON.parse(await readFile(projectionUrl, "utf8"));
    expect(projection.schema_version).toBe("courtos_spatial_read_model_v1");
    expect(projection.read_only).toBe(true);
    expect(projection.command_authority).toBe(false);

    expect(projection.portfolio_count).toBe(0);
    expect(projection.manor_count).toBe(0);
    expect(projection.portfolios).toEqual([]);
    expect(JSON.stringify(projection)).not.toContain("provisional_operator_crosswalk");
    expect(JSON.stringify(projection)).not.toContain("principal_operator_person_ids");
  });
});
