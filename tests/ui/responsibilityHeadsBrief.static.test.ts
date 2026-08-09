import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { CourtOsResponsibilityHousePapers } from "../../src/ui/responsibilityHousePapers";

const component = readFileSync(
  new URL("../../src/ui/responsibilityHeadsBrief.tsx", import.meta.url),
  "utf8",
);
const papers = readFileSync(
  new URL("../../src/ui/responsibilityHousePapers.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../src/ui/responsibilityHeadsBrief.css", import.meta.url),
  "utf8",
);

describe("responsibility workbench production presentation", () => {
  it("presents the steward and four decision layers ahead of supporting papers", () => {
    expect(component).toContain("Accountable steward");
    expect(component).toContain("brief.sections.map");
    expect(component).toContain("Review stewardship");
    expect(component).toContain("Open the House papers");
    expect(component).toContain("No steward is recorded for this charge");
    expect(component).not.toContain("#house-papers");
  });

  it("keeps source detail inside the secondary House-papers disclosure", () => {
    expect(papers).toContain("<details");
    expect(papers).toContain("Secondary record");
    expect(papers).toContain("Source custody and provenance remain here");
    expect(papers).not.toContain("fail-closed");
  });

  it("uses the exact eight room identities for responsibility treatment", () => {
    for (const domain of [
      "household",
      "marriage_dynasty",
      "estate_holdings",
      "resources_finance",
      "records_correspondence",
      "security_readiness",
      "court_relations",
      "church",
    ]) {
      expect(styles).toContain(`[data-domain="${domain}"]`);
    }
    expect(styles).not.toContain('[data-domain="manor_operations"]');
    expect(styles).not.toContain('[data-domain="external_relations"]');
    expect(styles).not.toContain('[data-domain="church_observance"]');
  });

  it("shows a recorded scope label instead of an opaque scope id", () => {
    const html = renderToStaticMarkup(
      React.createElement(CourtOsResponsibilityHousePapers, {
        evidence: [],
        records: [{
          source_table: "house_manor_scope",
          subject_id: null,
          subject_label: null,
          scope_id: "manor_hx_44835",
          scope_label: "Roadcote Court",
          state: "read_ready",
          evidence_references: [],
        }],
        loading: false,
        posture: "read_ready",
        onOpenPaper: () => undefined,
      }),
    );
    expect(html).toContain("Roadcote Court");
    expect(html).not.toContain("manor_hx_44835");
  });

  it("does not present an explicitly ineligible source row as a House paper", () => {
    const html = renderToStaticMarkup(
      React.createElement(CourtOsResponsibilityHousePapers, {
        evidence: [],
        records: [
          {
            source_table: "works_project_assignment_context_v1",
            subject_label: "Hidden duplicate",
            scope_id: "project-1",
            player_surface_eligible: false,
            evidence_references: [],
          },
          {
            source_table: "works_project_assignment_context_v1",
            subject_label: "Osmund Cooper",
            scope_id: "project-1",
            player_surface_eligible: true,
            evidence_references: [],
          },
        ],
        loading: false,
        posture: "read_ready",
        onOpenPaper: () => undefined,
      }),
    );
    expect(html).toContain("1 paper");
    expect(html).toContain("Osmund Cooper");
    expect(html).not.toContain("Hidden duplicate");
  });
});
