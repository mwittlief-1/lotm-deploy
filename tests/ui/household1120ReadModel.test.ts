import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { Household1120ReadModel } from "../../src/ui/readModels/household1120/service";

const databasePath = resolve(
  process.cwd(),
  "data/uat/household_wave2_read_contract_v1/generations/9e58577246a3a381395f5a03b520d9790e94ab2d12287999c9bae362466014c0/household_wave2_read_contract_1120_01_01_v1.sqlite",
);

describe("Household1120ReadModel", () => {
  it("reports Pearwick Stores and matter absence from the pinned contract", async () => {
    const session = await Household1120ReadModel.open(databasePath);
    try {
      const projection = await session.projection({
        householdEntityId: "uatentity_2feb6d3c5a81604f9bebeb8c",
        houseId: "t0h_bcae5bd911ab10f4c7fdfea0",
      });

      expect(projection.contract.sqlite_integrity).toBe("ok");
      expect(projection.membership_context).toHaveLength(14);
      expect(projection.responsibility_summary).toHaveLength(0);
      expect(projection.stores_positions).toHaveLength(0);
      expect(projection.stores_history).toHaveLength(0);
      expect(projection.supply_routes).toHaveLength(0);
      expect(projection.matters).toHaveLength(0);
      expect(projection.education_plans).toHaveLength(4);
      expect(projection.adult_kin_roster).toHaveLength(0);
      expect(projection.health_roster).toHaveLength(0);
      expect(projection.protected_person_dossiers).toHaveLength(0);
      expect(
        projection.provenance.find(
          (row) => row.record_key === "ro_household_stores_position_v1",
        )?.admission_state,
      ).toBe("withheld_pending_admission");
    } finally {
      await session.close();
    }
  });
});
