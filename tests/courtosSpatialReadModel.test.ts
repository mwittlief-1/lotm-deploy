import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const projectionUrl = new URL(
  "../public/data/ready/courtos_spatial_read_model_v1.json",
  import.meta.url,
);

describe("CourtOS spatial read model", () => {
  it("preserves source posture while resolving Pearwick's recorded manor geography", async () => {
    const projection = JSON.parse(await readFile(projectionUrl, "utf8"));
    expect(projection.schema_version).toBe("courtos_spatial_read_model_v1");
    expect(projection.read_only).toBe(true);
    expect(projection.command_authority).toBe(false);

    const pearwick = projection.portfolios.find(
      (portfolio: { house_id: string }) => portfolio.house_id === "t0h_bcae5bd911ab10f4c7fdfea0",
    );
    expect(pearwick?.manors.map((manor: { display_name: string }) => manor.display_name)).toEqual([
      "Pearwick Hall",
      "Roadcote Court",
    ]);
    expect(pearwick?.manors.every((manor: { source_posture: string }) => manor.source_posture === "provisional_read_only")).toBe(true);
    expect(pearwick?.manors.every((manor: { ui_authority: boolean; runtime_authority: boolean; command_authority: boolean }) =>
      !manor.ui_authority && !manor.runtime_authority && !manor.command_authority,
    )).toBe(true);

    const detailed = pearwick?.manors.find(
      (manor: { detailed_coverage: { coverage_state: string } }) =>
        manor.detailed_coverage.coverage_state === "authored_one_acre_detail",
    );
    expect(detailed?.display_name).toBe("Pearwick Hall");
    expect(detailed?.detailed_coverage).toMatchObject({
      renderer_level: "estate",
      available_levels: ["realm", "county", "estate"],
      parent_hex_count: 17,
      authored_acre_count: 3689,
    });
  });
});
