import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  buildAcquisitionProspectsWindow,
  buildGrantSourceRegistry,
  serializeAcquisitionProspectsWindow,
  serializeGrantSourceRegistry,
} from "../../src/sim/domains/people/grantAcquisitionRegistry";

function openInheritanceClaimWindow(state: any) {
  const spouseId = state.house.spouse?.id ?? null;
  const childIds = (state.house.children ?? []).map((child: any) => child.id);
  state.house.children = [];
  state.house.heir_id = null;
  state.house.spouse = undefined;
  state.house.spouse_status = undefined;
  state.house.head.married = false;
  if (spouseId && state.people?.[spouseId]) state.people[spouseId].married = false;
  if (state.people?.[state.house.head.id]) state.people[state.house.head.id].married = false;
  state.kinship_edges = (state.kinship_edges ?? []).filter(
    (edge: any) =>
      !(
        edge?.kind === "parent_of" &&
        (edge?.parent_id === state.house.head.id || edge?.parent_id === spouseId) &&
        childIds.includes(edge?.child_id)
      )
  );
}

function readFixture(relativePath: string): string {
  return readFileSync(new URL(`../fixtures/${relativePath}`, import.meta.url), "utf8").trim();
}

describe("grant acquisition fixtures", () => {
  it("keeps the bounded grant source registry fixture stable", () => {
    const state = createNewRun("grant_registry_contract_v032");
    expect(JSON.parse(serializeGrantSourceRegistry(buildGrantSourceRegistry(state)))).toEqual(
      JSON.parse(readFixture("grant_source_registry_v0.3.2.json"))
    );
  });

  it("keeps the claim-open acquisition prospect window fixture stable", () => {
    const state = createNewRun("acquisition_window_contract_v032");
    openInheritanceClaimWindow(state as any);
    expect(JSON.parse(serializeAcquisitionProspectsWindow(buildAcquisitionProspectsWindow(state)))).toEqual(
      JSON.parse(readFixture("acquisition_window_claim_open_v0.3.2.json"))
    );
  });
});
