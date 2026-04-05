import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildPoliticalWeatherContentHooksFromState,
  buildPoliticalWeatherFromState,
  buildRealmPressureRegistryFromState
} from "../../src/sim/domains/realm";
import { createPoliticalWeatherFixtureState } from "../helpers/politicalWeatherFixtureState";

function fixturePath(name: string): string {
  return path.resolve("qa_artifacts/realm_pressure", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

describe("political weather fixtures", () => {
  it("matches the deterministic realm-pressure fixture packet", () => {
    const state = createPoliticalWeatherFixtureState();

    expect(serialize(buildRealmPressureRegistryFromState(state))).toBe(readFixture("realm_pressure_registry_v0.3.3.json"));
    expect(serialize(buildPoliticalWeatherFromState(state))).toBe(readFixture("political_weather_v0.3.3.json"));
    expect(serialize(buildPoliticalWeatherContentHooksFromState(state))).toBe(
      readFixture("political_weather_content_hooks_v0.3.3.json")
    );
  });

  it("keeps the fixture packet bounded and internally consistent for review", () => {
    const registry = JSON.parse(readFixture("realm_pressure_registry_v0.3.3.json")) as Record<string, any>;
    const weather = JSON.parse(readFixture("political_weather_v0.3.3.json")) as Record<string, any>;
    const hooks = JSON.parse(readFixture("political_weather_content_hooks_v0.3.3.json")) as Record<string, any>;

    expect(Object.keys(registry)).toEqual(["schema_version", "turn", "actor_order", "entries_by_key"]);
    expect(Object.keys(weather)).toEqual([
      "schema_version",
      "registry_schema_version",
      "turn",
      "read_mode",
      "activation_status",
      "actor_order",
      "shared_context",
      "summary_lines",
      "registry"
    ]);
    expect(Object.keys(hooks)).toEqual([
      "schema_version",
      "turn",
      "read_mode",
      "activation_status",
      "actor_order",
      "shared_context",
      "highest_pressure_actor_key",
      "highest_pressure_value",
      "any_elevated_pressure",
      "actors_by_key"
    ]);

    expect(weather.registry).toEqual(registry);
    expect(weather.actor_order).toEqual(["crown", "magnates", "church"]);
    expect(weather.summary_lines).toHaveLength(3);
    expect(weather.registry.entries_by_key.magnates.inputs.relevant_house_ids).toEqual(["h_alpha", "h_beta"]);
    expect(hooks.shared_context).toEqual(weather.shared_context);
    expect(hooks.highest_pressure_actor_key).toBe("crown");
    expect(hooks.highest_pressure_value).toBe(58);
    expect(hooks.any_elevated_pressure).toBe(true);
  });
});
