
import { describe, it, expect } from "vitest";
import { createNewRun, proposeTurn, applyDecisions } from "../src/sim";
import { decide } from "../src/sim/policies";
import { BOUNDED_REGISTRY_MANIFEST_SCHEMA_VERSION, RUN_STATE_SCHEMA_VERSION } from "../src/sim/stateSchema";

const ALLOWED_KEYS = new Set([
  "state_schema_version",
  "bounded_registry_manifest",
  "turn_index",
  "manor",
  "house",
  "relationships",
  "flags",
  "game_over",
  "economy",
  "economy_obligations_view",
  "economy_pricing_view",
  "court_delegation_view",
  "portfolio",
  "people",
  "houses",
  "player_house_id",
  "world_topology_view",
  "kinship",
  "kinship_edges",
  "known_houses",
  "house_dossiers"
]);

describe("TurnLogEntry snapshots", () => {
  it("snapshot_before/after are bounded and never include log history", () => {
    let s = createNewRun("snapshots_bounded_v007");
    for (let t = 0; t < 12; t++) {
      const ctx = proposeTurn(s);
      const d = decide("prudent-builder", s, ctx);
      s = applyDecisions(s, d);

      for (const entry of s.log) {
        const before: any = entry.snapshot_before as any;
        const after: any = entry.snapshot_after as any;

        expect(before.log).toBeUndefined();
        expect(after.log).toBeUndefined();
        expect(before.state_schema_version).toBe(RUN_STATE_SCHEMA_VERSION);
        expect(after.state_schema_version).toBe(RUN_STATE_SCHEMA_VERSION);
        expect(before.bounded_registry_manifest?.schema_version).toBe(BOUNDED_REGISTRY_MANIFEST_SCHEMA_VERSION);
        expect(after.bounded_registry_manifest?.schema_version).toBe(BOUNDED_REGISTRY_MANIFEST_SCHEMA_VERSION);
        expect(before.world_topology_view?.schema_version).toBe("world_topology_snapshot_v1");
        expect(after.world_topology_view?.schema_version).toBe("world_topology_snapshot_v1");
        expect(before.world_topology_view?.anchor_manor_id).toBe("manor_hx_26597");
        expect(after.world_topology_view?.anchor_manor_id).toBe("manor_hx_26597");

        for (const k of Object.keys(before)) expect(ALLOWED_KEYS.has(k)).toBe(true);
        for (const k of Object.keys(after)) expect(ALLOWED_KEYS.has(k)).toBe(true);
      }

      if (s.game_over) break;
    }
  });
});
