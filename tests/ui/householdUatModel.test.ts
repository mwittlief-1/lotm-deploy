import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildCouncilRoomReadyProjection } from "../../src/ready/councilRoomReadyProjection";
import {
  councilRoomArtForHouse,
  houseIdentityAssets,
} from "../../src/ui/houseIdentityAssets";
import { buildCourtOsShellRuntimeModel } from "../../src/ui/courtosShellModel";
import { COURTOS_PLAYER_CONTEXT } from "../../src/courtosPlayerContext";
import {
  buildCourtOsSessionContext,
  isCourtOsSessionContextV1,
} from "../../src/courtosSessionContext";
import { buildHouseholdUatRuntimeModel } from "../../src/ui/householdUatModel";
import { CourtOs1120ReadModel } from "../../src/ui/readModels/courtos1120/service";
import { Household1120ReadModel } from "../../src/ui/readModels/household1120/service";
import { FoundationAHouseholdRuntimeReleaseProjection } from "../../src/ui/readModels/householdFoundationA/runtimeReleaseProjection";

const courtOsDatabasePath = resolve(
  process.cwd(),
  "data/uat/courtos_read_only_uat_contract_v1/generations/d338fca408a5bfb6bfe65c66a2dc18c0adbad0934d7879f4835806f6492ef2b9/courtos_read_only_uat_contract_1120_01_01_v1.sqlite",
);
const householdDatabasePath = resolve(
  process.cwd(),
  "data/uat/household_wave2_read_contract_v1/generations/9e58577246a3a381395f5a03b520d9790e94ab2d12287999c9bae362466014c0/household_wave2_read_contract_1120_01_01_v1.sqlite",
);
const foundationAHouseholdReleaseManifestPath = resolve(
  process.cwd(),
  "data/genrun/foundation_a_household_runtime_release_v1/MANIFEST.json",
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
    const sessionContext = buildCourtOsSessionContext(
      houseId === COURTOS_PLAYER_CONTEXT.house_id
        ? "player_runtime"
        : "generalization_qa",
      houseId,
    );
    return {
      courtProjection,
      householdProjection,
      shell: buildCourtOsShellRuntimeModel({
        courtOs: courtProjection,
        council: councilProjection,
        sessionContext,
      }),
      runtime: buildHouseholdUatRuntimeModel({
        courtOs: courtProjection,
        household: householdProjection,
        council: councilProjection,
        sessionContext,
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
      sessionContext: buildCourtOsSessionContext(
        houseId === COURTOS_PLAYER_CONTEXT.house_id
          ? "player_runtime"
          : "generalization_qa",
        houseId,
      ),
    });
  } finally {
    await courtOs.close();
  }
}

async function foundationARuntimeFor(houseId: string) {
  const courtOs = await CourtOs1120ReadModel.open(courtOsDatabasePath);
  const household = await FoundationAHouseholdRuntimeReleaseProjection.open(
    foundationAHouseholdReleaseManifestPath,
  );
  try {
    const courtProjection = await courtOs.projection({ houseId });
    const householdProjection = await household.projection({
      householdEntityId: courtProjection.selected_entity.entity_id,
      houseId,
    });
    const councilProjection = buildCouncilRoomReadyProjection({ houseId, turnYear: 1120 });
    const sessionContext = buildCourtOsSessionContext(
      houseId === COURTOS_PLAYER_CONTEXT.house_id ? "player_runtime" : "generalization_qa",
      houseId,
    );
    return buildHouseholdUatRuntimeModel({
      courtOs: courtProjection,
      household: householdProjection,
      council: councilProjection,
      sessionContext,
    });
  } finally {
    await Promise.all([courtOs.close(), household.close()]);
  }
}

describe("Household UAT runtime model", () => {
  it("loads the player House from the versioned runtime contract", () => {
    expect(COURTOS_PLAYER_CONTEXT).toEqual({
      schema_version: "courtos_player_context_v1",
      principal: "local_player",
      entitlement: "house_controller",
      house_id: "t0h_bcae5bd911ab10f4c7fdfea0",
    });
  });

  it("permits a source-resolved Head to save UAT-1 assignment drafts, never execute", () => {
    const context = buildCourtOsSessionContext(
      "player_runtime",
      COURTOS_PLAYER_CONTEXT.house_id,
      {
        status: "house_head",
        person_id: "t0p_56033e4ecf3e86ff0dd615c4",
        authority_basis: "foundation_a_uat1_succession_head_identity_plus_player_session",
      },
    );
    expect(isCourtOsSessionContextV1(context)).toBe(true);
    expect(context).toMatchObject({
      principal: "local_player",
      house_access: "player_house",
      acting_actor: {
        status: "house_head",
        person_id: "t0p_56033e4ecf3e86ff0dd615c4",
        authority_basis: "foundation_a_uat1_succession_head_identity_plus_player_session",
      },
      knowledge: {
        lens: "source_bounded_house_records",
        actor_knowledge_status: "source_resolved_controller",
        actor_specific_content: "withheld",
      },
      capabilities: {
        inspect_house_records: true,
        issue_commands: false,
        manage_assignments: true,
        access_correspondence: false,
        conduct_actor_dialogue: false,
      },
    });
    expect(
      isCourtOsSessionContextV1({
        ...context,
        principal: "qa_agent",
      }),
    ).toBe(false);
    expect(
      isCourtOsSessionContextV1({
        ...context,
        selected_house_id: "another-house",
      }),
    ).toBe(false);
    expect(
      isCourtOsSessionContextV1({
        ...context,
        acting_actor: {
          status: "house_head",
          person_id: context.acting_actor.person_id,
          authority_basis: null,
        },
      }),
    ).toBe(false);
  });

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
      state: "current",
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

  it("uses the frozen Foundation A release for all four Household responsibility rooms", async () => {
    const runtime = await foundationARuntimeFor("t0h_bcae5bd911ab10f4c7fdfea0");

    expect(runtime.membershipContextCount).toBe(14);
    expect(runtime.responsibilities.map((row) => row.holder?.displayName ?? null)).not.toContain(null);
    expect(runtime.responsibilities.find((row) => row.definition.key === "stores")).toMatchObject({
      state: "current",
      currentRecordCount: 9,
      cycleRecordCount: 276,
    });
    expect(runtime.responsibilities.find((row) => row.definition.key === "adult_kin")).toMatchObject({
      state: "current",
      currentRecordCount: 12,
    });
    expect(runtime.responsibilities.find((row) => row.definition.key === "education")).toMatchObject({
      state: "current",
      currentRecordCount: 4,
      cycleRecordCount: 0,
    });
    expect(runtime.responsibilities.find((row) => row.definition.key === "service_care")).toMatchObject({
      state: "current",
      currentRecordCount: 2,
      cycleRecordCount: 0,
    });
  }, 60_000);

  it("exposes the founder-approved 1117–1119 economic harness as House-scoped evidence", async () => {
    const release = await FoundationAHouseholdRuntimeReleaseProjection.open(
      foundationAHouseholdReleaseManifestPath,
    );
    try {
      const projection = await release.projection({
        householdEntityId: "uatentity_2feb6d3c5a81604f9bebeb8c",
        houseId: "t0h_bcae5bd911ab10f4c7fdfea0",
      });
      expect(projection.economic_activity_lookback).toHaveLength(276);
      expect(
        [...new Set(projection.economic_activity_lookback.map((row) => row.activity_year))],
      ).toEqual([1119, 1118, 1117]);
      expect(projection.economic_activity_lookback[0]).toMatchObject({
        evidence_status: "founder_approved_provisional_economic_lookback",
        runtime_authority: 0,
      });
    } finally {
      await release.close();
    }
  });

  it("builds the shared CourtOS shell without consuming the Household projection", async () => {
    const shell = await shellFor("t0h_bcae5bd911ab10f4c7fdfea0");

    expect(shell.house.displayName).toBe("House Pearwick Hall");
    expect(shell.council).toHaveLength(4);
    expect(shell.authority).toMatchObject({
      status: "unadmitted",
      actor: null,
      label: "acting person not established",
    });
    expect(shell.councilSource).toEqual({
      status: "candidate_projection",
      label: "provisional Council membership · opening record",
    });
    expect(shell.player).toEqual({
      principal: "local_player",
      status: "house_record_inspection",
      entitlement: "house_controller",
      houseId: "t0h_bcae5bd911ab10f4c7fdfea0",
      label: "Playing House Pearwick Hall · House records",
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
      label: "acting person not established · regency indicated",
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
    expect(holtcross.shell.player).toEqual({
      principal: "qa_agent",
      status: "qa_projection",
      entitlement: "generalization_qa",
      houseId: null,
      label: "Generalization QA · recorded source",
    });
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
