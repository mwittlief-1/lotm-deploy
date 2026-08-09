import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { CourtOsPlayerSqliteStoreV1 } from "../../src/server/courtosPlayerStore";

const directories: string[] = [];

afterEach(() => {
  while (directories.length > 0) {
    const directory = directories.pop();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

describe("CourtOsPlayerSqliteStoreV1", () => {
  it("persists only bounded player-authored stewardship documents", () => {
    const directory = mkdtempSync(join(tmpdir(), "courtos-player-store-"));
    directories.push(directory);
    const databasePath = join(directory, "player.sqlite");
    const key =
      "merecross.courtos.uat1.stewardship-plan:house:responsibility:scope:cycle:journal-v1";
    const document = JSON.stringify({
      schema_version: "courtos_stewardship_plan_journal_v1",
      house_id: "house",
      records: [],
    });
    const store = new CourtOsPlayerSqliteStoreV1(databasePath);
    expect(store.getItem(key)).toBeNull();
    store.setItem(key, document);
    expect(store.getItem(key)).toBe(document);
    store.close();

    const reopened = new CourtOsPlayerSqliteStoreV1(databasePath);
    expect(reopened.getItem(key)).toBe(document);
    reopened.removeItem(key);
    expect(reopened.getItem(key)).toBeNull();
    reopened.close();

    const database = new Database(databasePath, { readonly: true });
    expect(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all()
        .map((row) => (row as { name: string }).name),
    ).toEqual(["courtos_player_document_v1"]);
    database.close();
    expect(readFileSync(databasePath).subarray(0, 15).toString("utf8")).toBe(
      "SQLite format 3",
    );
  });

  it("rejects unrelated keys and authoritative-looking payloads", () => {
    const directory = mkdtempSync(join(tmpdir(), "courtos-player-store-"));
    directories.push(directory);
    const store = new CourtOsPlayerSqliteStoreV1(join(directory, "player.sqlite"));
    expect(() =>
      store.setItem(
        "merecross.world.authority",
        JSON.stringify({ schema_version: "courtos_stewardship_plan_v1" }),
      ),
    ).toThrow(/unsupported document key/i);
    expect(() =>
      store.setItem(
        "merecross.courtos.uat1.stewardship-plan:test",
        JSON.stringify({ schema_version: "source_truth_mutation_v1" }),
      ),
    ).toThrow(/unsupported planning schema/i);
    store.close();
  });
});
