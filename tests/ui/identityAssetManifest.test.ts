import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  COURTOS_IDENTITY_ASSET_MANIFEST,
  COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
} from "../../src/ui/identityAssetManifest";

describe("CourtOS identity asset manifest", () => {
  it("is versioned, canonical-ID keyed, unique, and backed by runtime assets", () => {
    expect(COURTOS_IDENTITY_ASSET_MANIFEST.schema_version).toBe(
      COURTOS_IDENTITY_ASSET_SCHEMA_VERSION,
    );

    const houseIds = COURTOS_IDENTITY_ASSET_MANIFEST.houses.map(
      (house) => house.house_id,
    );
    const personIds = COURTOS_IDENTITY_ASSET_MANIFEST.people.map(
      (person) => person.person_id,
    );
    expect(new Set(houseIds).size).toBe(houseIds.length);
    expect(new Set(personIds).size).toBe(personIds.length);
    expect(houseIds.every((id) => id.startsWith("t0h_"))).toBe(true);
    expect(personIds.every((id) => id.startsWith("t0p_"))).toBe(true);

    const assetPaths = [
      ...COURTOS_IDENTITY_ASSET_MANIFEST.houses.flatMap((house) =>
        Object.values(house.assets).filter(
          (path): path is string => typeof path === "string",
        ),
      ),
      ...COURTOS_IDENTITY_ASSET_MANIFEST.people.map(
        (person) => person.portrait_path,
      ),
    ];
    expect(
      assetPaths.every((assetPath) =>
        existsSync(join(process.cwd(), "public", assetPath.replace(/^\/assets\//, "assets/"))),
      ),
    ).toBe(true);
  });
});
