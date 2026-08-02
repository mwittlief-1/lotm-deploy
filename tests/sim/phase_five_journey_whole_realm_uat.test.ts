import { describe, expect, it } from "vitest";

import { buildJourneyFoundationResolver } from "../../src/sim/domains/journey/journeyFoundationResolver";
import { loadFoundationAJourneySources } from "../../src/sim/domains/journey/journeyFoundationSourceAdapter.node";

describe("Phase Five Journey whole-realm structural UAT", () => {
  it("resolves every exact route-ready Foundation A location without snapping or inventing presence", () => {
    const { bundle, audit } = loadFoundationAJourneySources();
    const resolver = buildJourneyFoundationResolver(bundle);
    const routeReady = bundle.anchors.filter((anchor) => anchor.anchor_status === "resolved_to_manor_graph");
    const origin = routeReady[0];

    expect(origin).toBeDefined();
    expect(routeReady).toHaveLength(audit.route_ready_location_anchors);
    expect(audit.manor_count).toBe(1_250);
    expect(audit.route_graph_component_count).toBe(1);

    for (const destination of routeReady) {
      const input = {
        from_anchor_id: origin!.anchor_id,
        to_anchor_id: destination.anchor_id,
        route_posture: "fastest_viable" as const,
        party_profile: "light_personal" as const,
        condition_posture: "normal" as const,
        departure_cutpoint: { relative_month: 1, phase: "opening" as const },
        source_refs: ["uat:journey:whole-realm-route-readiness"],
      };
      const first = resolver.resolveRoute(input);
      const replay = resolver.resolveRoute(input);

      expect(first.status).toBe("resolved_provisional");
      expect(replay).toEqual(first);
      if (first.status !== "resolved_provisional") continue;
      expect(first.from_anchor.anchor_id).toBe(origin!.anchor_id);
      expect(first.to_anchor.anchor_id).toBe(destination.anchor_id);
      expect(first.routing_manor_path[0]).toBe(origin!.routing_manor_id);
      expect(first.routing_manor_path.at(-1)).toBe(destination.routing_manor_id);
      expect(first.named_person_presence_inferred_from_financial_traffic).toBe(false);
      expect(first.runtime_authority).toBe(false);
    }
  }, 20_000);

  it("withholds every unresolved named location with an exact source reason", () => {
    const { bundle, audit } = loadFoundationAJourneySources();
    const resolver = buildJourneyFoundationResolver(bundle);
    const unresolved = bundle.anchors.filter((anchor) => anchor.anchor_status !== "resolved_to_manor_graph");

    expect(unresolved).toHaveLength(
      audit.unresolved_missing_current_map_hex + audit.unresolved_missing_manor_graph_link,
    );
    expect(unresolved.length).toBeGreaterThan(0);

    for (const anchor of unresolved) {
      const result = resolver.resolveAnchor(anchor.anchor_id);
      expect(result.status).toBe("withheld");
      expect(result.anchor?.anchor_id).toBe(anchor.anchor_id);
      expect(result.reason_codes.length).toBeGreaterThan(0);
      expect(result.reason_codes).toContain(
        anchor.anchor_status === "unresolved_missing_current_map_hex"
          ? "location_hex_missing_from_current_map"
          : "location_missing_manor_graph_link",
      );
    }
  });

  it("keeps all financial traffic aggregate-only across the full source load", () => {
    const { bundle, audit } = loadFoundationAJourneySources();

    expect(bundle.background_traffic_evidence).toHaveLength(audit.background_traffic_directed_pair_count);
    expect(bundle.background_traffic_evidence.every((row) => row.proves_named_person_presence === false)).toBe(true);
    expect(audit.financial_lanes_create_named_person_presence).toBe(false);
  });

  it("keeps a geographically spread multi-origin planning sample within the Round One budget", () => {
    const { bundle } = loadFoundationAJourneySources();
    const resolver = buildJourneyFoundationResolver(bundle);
    const routeReady = bundle.anchors.filter(
      (anchor) => anchor.anchor_status === "resolved_to_manor_graph",
    );
    const spread = (count: number) => Array.from({ length: count }, (_, index) =>
      routeReady[Math.floor(index * (routeReady.length - 1) / (count - 1))]!,
    );
    const origins = spread(12);
    const destinations = spread(24);
    const started = performance.now();
    const routePlanIds: string[] = [];
    for (const origin of origins) {
      for (const destination of destinations) {
        const result = resolver.resolveRoute({
          from_anchor_id: origin.anchor_id,
          to_anchor_id: destination.anchor_id,
          route_posture: "fastest_viable",
          party_profile: "small_noble_retinue",
          condition_posture: "normal",
          departure_cutpoint: { relative_month: 1, phase: "opening" },
          source_refs: ["uat:journey:multi-origin-planning"],
        });
        expect(result.status).toBe("resolved_provisional");
        if ("route_plan_id" in result) routePlanIds.push(result.route_plan_id);
      }
    }
    const elapsedMs = performance.now() - started;
    expect(routePlanIds).toHaveLength(origins.length * destinations.length);
    expect(elapsedMs).toBeLessThan(10_000);
  }, 20_000);
});
