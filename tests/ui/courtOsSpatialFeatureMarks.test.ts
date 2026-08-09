import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  canInspectEstateParent,
  linearFeatureMark,
  siteFeatureMark,
} from "../../src/ui/spatial/CourtOsSpatialCanvas";

describe("CourtOS spatial feature marks", () => {
  it("uses only feature semantics already present in the renderer export", () => {
    expect(linearFeatureMark(["pearwick_manor_road_001"])).toBe("route");
    expect(linearFeatureMark(["pearwick_seasonal_drainage_grip_001"])).toBe("water");
    expect(siteFeatureMark(["pearwick_manor_gate_001"])).toBe("gate");
    expect(siteFeatureMark(["manor_of_pearwick_seat_001"])).toBe("seat");
    expect(siteFeatureMark(["pearwick_village_lcu_001"])).toBe("settlement");
  });

  it("does not add a mark when the source cell contains no recorded feature", () => {
    expect(linearFeatureMark([])).toBeNull();
    expect(siteFeatureMark([])).toBeNull();
  });

  it("keeps the selectable realm hexes named for keyboard and assistive-technology use", () => {
    expect(readFileSync("src/ui/spatial/CourtOsSpatialCanvas.tsx", "utf8")).toContain("Recorded estate hex");
  });

  it("keeps visual context visible but does not let it masquerade as inspectable manor ground", () => {
    expect(canInspectEstateParent({ same_manor_as_target: true })).toBe(true);
    expect(canInspectEstateParent({ same_manor_as_target: false })).toBe(false);
  });
});
