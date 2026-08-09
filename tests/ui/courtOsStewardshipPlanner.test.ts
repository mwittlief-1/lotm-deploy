import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { COURTOS_UAT1_STEWARDSHIP_PLAN_HORIZON } from "../../src/ui/courtosStewardshipPlan";
import { CourtOsStewardshipPlanner } from "../../src/ui/panels/CourtOsStewardshipPlanner";

const context = {
  house_id: "t0h_pearwick",
  acting_actor_person_id: "t0p_edmund",
  actor_authority_basis_id: "authority:head:pearwick:1120",
  source_generation_id: "foundation-a:1120:g1",
  effective_date: "1120-01-01",
  planning_horizon: COURTOS_UAT1_STEWARDSHIP_PLAN_HORIZON,
} as const;

describe("CourtOsStewardshipPlanner", () => {
  it("renders the exact responsibility, scope, current steward, and planning boundary", () => {
    const html = renderToStaticMarkup(createElement(CourtOsStewardshipPlanner, {
      candidatesForScope: () => [{
        person_id: "t0p_edmund",
        display_name: "Edmund of Pearwick Hall",
        eligibility: "head_self_assignment" as const,
        eligibility_source_id: "authority:head:pearwick:1120",
      }],
      context,
      responsibilities: [{
        responsibility_id: "stores",
        responsibility_label: "Household Stores",
        room_id: "household",
        room_label: "Household Solar",
        scopes: [{
          responsibility_id: "stores",
          responsibility_label: "Household Stores",
          room_id: "household",
          room_label: "Household Solar",
          scope_id: "manor_hx_44835",
          scope_label: "Roadcote Court",
          source_record_id: "authority:stores:roadcote:g1",
          current_holder: {
            person_id: "t0p_ralph",
            display_name: "Ralph Woolman",
          },
        }],
      }],
      storage: null,
    }));

    expect(html).toContain("Three-year stewardship");
    expect(html).toContain("1120–1122 House plan");
    expect(html).toContain("Household Solar — Household Stores");
    expect(html).toContain("Roadcote Court");
    expect(html).toContain("Ralph Woolman");
    expect(html).toContain("Edmund of Pearwick Hall — Head of House");
    expect(html).toContain("The recorded steward remains");
    expect(html).toContain("it does not change current stewardship");
    expect(html).toContain("disabled");
  });

  it("fails closed when a responsibility has no admitted scope", () => {
    const html = renderToStaticMarkup(createElement(CourtOsStewardshipPlanner, {
      candidatesForScope: () => [],
      context,
      responsibilities: [{
        responsibility_id: "conditional-work",
        responsibility_label: "Conditional Work",
        room_id: "works",
        room_label: "Works Yard",
        scopes: [],
      }],
      storage: null,
    }));

    expect(html).toContain("has no recorded planning charge");
    expect(html).not.toContain("Recorded scope");
    expect(html).not.toContain("This responsibility</option>");
  });

  it("derives a later cycle label from the admitted context", () => {
    const html = renderToStaticMarkup(createElement(CourtOsStewardshipPlanner, {
      candidatesForScope: () => [],
      context: {
        ...context,
        effective_date: "1123-01-01",
        planning_horizon: { starts_at: "1123-01-01", ends_at: "1125-12-31" },
      },
      responsibilities: [],
      storage: null,
    }));

    expect(html).not.toContain("1120–1122");
  });

  it("keeps product-release and admission vocabulary out of House Command and planning copy", () => {
    const playerCopy = [
      "../../src/ui/panels/HouseholdVerticalSlice.tsx",
      "../../src/ui/panels/CourtOsStewardshipPlanner.tsx",
      "../../src/ui/courtosStewardshipPlan.ts",
    ].map((file) => readFileSync(new URL(file, import.meta.url), "utf8")).join("\n");
    for (const phrase of [
      "P-1 product checkpoint",
      "Shared planning boundary verified",
      "pinned as one accepted release",
      "stale or mixed identity",
      "No admitted responsibility scopes",
      "no admitted planning scope",
      "No eligible assignee in the admitted projection",
      "complete admitted House, actor, authority",
      "The admitted source generation changed",
      "exact admitted scope",
    ]) {
      expect(playerCopy).not.toContain(phrase);
    }
  });
});
