import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CourtOs1120ReadModel } from "../../src/ui/readModels/courtos1120/service";
import {
  COURTOS_1120_READ_ONLY_PROJECTION_SCHEMA_VERSION,
  COURTOS_1120_SQLITE_SHA256
} from "../../src/ui/readModels/courtos1120/types";

const databasePath = resolve(
  "data/uat/courtos_read_only_uat_contract_v1/generations/d338fca408a5bfb6bfe65c66a2dc18c0adbad0934d7879f4835806f6492ef2b9/courtos_read_only_uat_contract_1120_01_01_v1.sqlite"
);

describe("CourtOS 1120 read-only projection", () => {
  it("opens the locked SQLite as read-only and projects House Pearwick Hall without runtime authority", async () => {
    const session = await CourtOs1120ReadModel.open(databasePath);
    try {
      expect(session.descriptor.sqliteSha256).toBe(COURTOS_1120_SQLITE_SHA256);
      expect(session.descriptor.connectionPolicy).toMatchObject({
        mode: "ro",
        sqliteImmutableUri: false,
        sourceSnapshotChecksumPinned: true,
        queryOnly: true,
        generationPinnedForSession: true
      });

      const projection = await session.projection({ entityLabel: "House Pearwick Hall" });
      const repeat = await session.projection({ entityLabel: "House Pearwick Hall" });

      expect(repeat).toEqual(projection);
      expect(projection.schema_version).toBe(COURTOS_1120_READ_ONLY_PROJECTION_SCHEMA_VERSION);
      expect(projection.contract.contract_status).toBe(
        "LOCKED_READ_ONLY_UAT_PROJECTION_CONTRACT_NOT_EXECUTABLE_RUNTIME_AUTHORITY"
      );
      expect(projection.selected_entity.display_label).toBe("House Pearwick Hall");
      expect(projection.selected_entity.runtime_authority).toBe(0);
      expect(projection).not.toHaveProperty("global_summary");
      expect(projection).not.toHaveProperty("provenance_readiness");
      expect(projection.totals).toMatchObject({
        office_count: 6,
        occupied_office_count: 6,
        vacancy_or_unresolved_office_count: 0,
        responsibility_count: 31,
        household_people_count: 14,
        standing_order_route_count: 31,
        initialized_standing_order_count: 0,
        review_docket_count: 0
      });
      expect(projection.household_people.map((row) => row.display_name)).toEqual(
        expect.arrayContaining([
          "Edmund of Pearwick Hall",
          "Hugh of Pearwick Hall",
          "Isabel of Ridgestead",
          "Eudes of Pearwick Hall"
        ])
      );
      expect(projection.offices.map((row) => row.holder_display_name)).toEqual(
        expect.arrayContaining([
          "Edmund of Pearwick Hall",
          "Wulfstan Ford",
          "Gerard Scrivener",
          "Ralph Woolman"
        ])
      );
      expect(projection.responsibilities.every((row) => row.runtime_authority === 0)).toBe(true);
      expect(projection.standing_order_tasks.every((row) => row.runtime_task_state === "unavailable_no_runtime_task_model")).toBe(true);
      expect(projection.boundaries).toEqual({
        read_only_contract: true,
        runtime_authority: false,
        executable_command_authority: false,
        source_graph_mutation: false,
        workload_values_available: false,
        capacity_values_available: false,
        initialized_orders_available: false
      });
    } finally {
      await session.close();
    }
  });

  it("fails closed instead of defaulting to a named House", async () => {
    const session = await CourtOs1120ReadModel.open(databasePath);
    try {
      await expect(session.projection({})).rejects.toThrow(
        "A CourtOS entityId, houseId, or entityLabel selector is required.",
      );
    } finally {
      await session.close();
    }
  });
});
