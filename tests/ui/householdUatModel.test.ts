import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildCouncilRoomReadyProjection } from "../../src/ready/councilRoomReadyProjection";
import {
  councilRoomArtForHouse,
  houseIdentityAssets,
} from "../../src/ui/houseIdentityAssets";
import { buildCourtOsShellRuntimeModel } from "../../src/ui/courtosShellModel";
import { buildHouseholdUatRuntimeModel } from "../../src/ui/householdUatModel";
import { CourtOs1120ReadModel } from "../../src/ui/readModels/courtos1120/service";
import { Household1120ReadModel } from "../../src/ui/readModels/household1120/service";

const courtOsDatabasePath = resolve(
  process.cwd(),
  "data/uat/courtos_read_only_uat_contract_v1/generations/d338fca408a5bfb6bfe65c66a2dc18c0adbad0934d7879f4835806f6492ef2b9/courtos_read_only_uat_contract_1120_01_01_v1.sqlite",
);
const householdDatabasePath = resolve(
  process.cwd(),
  "data/uat/household_wave2_read_contract_v1/generations/9e58577246a3a381395f5a03b520d9790e94ab2d12287999c9bae362466014c0/household_wave2_read_contract_1120_01_01_v1.sqlite",
);

async function runtimeFor(houseId: string) {
  const courtOs = await CourtOs1120ReadModel.open(courtOsDatabasePath);
  const household = await Household1120ReadModel.open(householdDatabasePath);
  try {
    const courtProjection = await courtOs.projection({ houseId });
    const householdProjection = await household.projection({
      householdEntityId: courtProjection.selected_entity.entity_id,
      houseId,
    });
    const councilProjection = buildCouncilRoomReadyProjection({
      houseId,
      turnYear: 1120,
    });
    return {
      courtProjection,
      householdProjection,
      shell: buildCourtOsShellRuntimeModel({
        courtOs: courtProjection,
        council: councilProjection,
      }),
      runtime: buildHouseholdUatRuntimeModel({
        courtOs: courtProjection,
        household: householdProjection,
        council: councilProjection,
      }),
    };
  } finally {
    await Promise.all([courtOs.close(), household.close()]);
  }
}

async function shellFor(houseId: string) {
  const courtOs = await CourtOs1120ReadModel.open(courtOsDatabasePath);
  try {
    return buildCourtOsShellRuntimeModel({
      courtOs: await courtOs.projection({ houseId }),
      council: buildCouncilRoomReadyProjection({ houseId, turnYear: 1120 }),
    });
  } finally {
    await courtOs.close();
  }
}

describe("Household UAT runtime model", () => {
  it("builds the official four-responsibility Pearwick runtime without a Family Book destination", async () => {
    const result = await runtimeFor("t0h_bcae5bd911ab10f4c7fdfea0");

    expect(result.runtime.house.displayName).toBe("House Pearwick Hall");
    expect(result.runtime.responsibilities.map((row) => row.definition.key)).toEqual([
      "stores",
      "adult_kin",
      "education",
      "service_care",
    ]);
    expect(
      result.runtime.responsibilities.map((row) => row.definition.designKey),
    ).toEqual([
      "household_stores_provisioning_procurement",
      "adult_kin_support",
      "education_formation",
      "household_service_care",
    ]);
    expect(
      result.runtime.responsibilities.some((row) =>
        row.definition.title.toLowerCase().includes("family book"),
      ),
    ).toBe(false);
    expect(result.runtime.membershipContextCount).toBe(14);
    expect(
      result.runtime.responsibilities.find(
        (row) => row.definition.key === "education",
      ),
    ).toMatchObject({
      state: "partial",
      currentRecordCount: 4,
      cycleRecordCount: 0,
    });
    expect(
      result.runtime.responsibilities.find(
        (row) => row.definition.key === "adult_kin",
      )?.state,
    ).toBe("withheld");
    expect(
      result.runtime.responsibilities.find(
        (row) => row.definition.key === "service_care",
      )?.state,
    ).toBe("withheld");
    expect(result.runtime.protectedPersons.visible).toBe(false);
  });

  it("builds the shared CourtOS shell without consuming the Household projection", async () => {
    const shell = await shellFor("t0h_bcae5bd911ab10f4c7fdfea0");

    expect(shell.house.displayName).toBe("House Pearwick Hall");
    expect(shell.council).toHaveLength(4);
    expect(shell.authority).toMatchObject({
      status: "unadmitted",
      actor: null,
      label: "Provisional head reference: Edmund of Pearwick Hall · acting authority not admitted",
    });
    expect(shell.councilSource).toEqual({
      status: "candidate_projection",
      label: "provisional Council membership · candidate source",
    });
    expect(shell.effectiveDate).toBe("1120-01-01");
    expect(shell).not.toHaveProperty("responsibilities");
  });

  it("does not present a minor head as acting authority when the source requires regency", async () => {
    const shell = await shellFor("t0h_8d6243f2356c0d5d5590d96e");

    expect(shell.head.display_name).toBe("Henry of Alderwick");
    expect(shell.authority).toEqual({
      status: "regency_required",
      actor: null,
      label: "Regency indicated · acting authority not admitted",
    });
  });

  it("reconstructs a second House from the same code and source contracts", async () => {
    const pearwick = await runtimeFor("t0h_bcae5bd911ab10f4c7fdfea0");
    const holtcross = await runtimeFor("t0h_1ed8d543f12b387ed751f1a6");

    expect(holtcross.runtime.house.displayName).toBe("House Holtcross");
    expect(holtcross.runtime.house.entityId).not.toBe(
      pearwick.runtime.house.entityId,
    );
    expect(holtcross.runtime.head.display_name).toBe("Gilbert of Holtcross");
    expect(holtcross.runtime.council).toHaveLength(7);
    expect(holtcross.householdProjection.query.house_id).toBe(
      "t0h_1ed8d543f12b387ed751f1a6",
    );
    expect(
      holtcross.householdProjection.membership_context.every(
        (row) =>
          row.endpoint_house_protected_id ===
          "t0h_1ed8d543f12b387ed751f1a6",
      ),
    ).toBe(true);
  });

  it("uses registered integrated art only when it actually exists", () => {
    expect(
      councilRoomArtForHouse("t0h_bcae5bd911ab10f4c7fdfea0"),
    ).toContain("pearwick-hall-integrated");
    expect(
      councilRoomArtForHouse("t0h_1ed8d543f12b387ed751f1a6"),
    ).toContain("council-holtcross-integrated");
    expect(houseIdentityAssets("unregistered-house")).toEqual({
      manifestVersion: "courtos_identity_assets_v1",
      status: "missing",
      heraldry: null,
      integratedCouncilRoom: null,
    });
  });
});
